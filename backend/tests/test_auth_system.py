"""
Backend tests for the new authentication system (iteration 52):
- National ID login (10 digits starting with 1 or 2)
- Admin email login
- Auto-create user account when employee added with national_id
- Account states: pending/active/frozen/terminated
- Brute force protection (5 attempts lock)
- Must change PIN on first login
- Manager: activate/freeze/terminate/reset-pin for employees
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# ── Fixtures ───────────────────────────────────────────────────────
@pytest.fixture(scope="module")
def admin_token():
    """Get admin token via email login"""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "identifier": "admin@crowd.sa",
        "password": "admin123"
    })
    assert resp.status_code == 200, f"Admin login failed: {resp.text}"
    return resp.json()["access_token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


# ── Tests: Login ───────────────────────────────────────────────────

class TestLogin:
    """Test the flexible login endpoint /api/auth/login"""

    def test_admin_email_login_success(self):
        """Admin can login with email"""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "admin@crowd.sa",
            "password": "admin123"
        })
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "access_token" in data
        assert data["user"]["email"] == "admin@crowd.sa"
        assert data["user"]["role"] == "system_admin"
        print("✅ Admin email login OK")

    def test_login_returns_token_and_user(self):
        """Login response contains access_token, user, must_change_pin"""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "admin@crowd.sa",
            "password": "admin123"
        })
        data = resp.json()
        assert "access_token" in data
        assert "user" in data
        assert "must_change_pin" in data
        assert isinstance(data["access_token"], str) and len(data["access_token"]) > 20
        print("✅ Login response structure OK")

    def test_invalid_email_password(self):
        """Wrong password for admin returns 401"""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "admin@crowd.sa",
            "password": "wrongpassword"
        })
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"
        print("✅ Wrong password returns 401")

    def test_invalid_identifier_format(self):
        """Identifier that is neither email nor valid national_id returns 401"""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "not_valid_identifier",
            "password": "test123"
        })
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"
        print("✅ Invalid identifier format returns 401")

    def test_national_id_format_validation_too_short(self):
        """9-digit national ID (not 10) is invalid"""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "123456789",  # 9 digits
            "password": "test123"
        })
        assert resp.status_code == 401
        print("✅ 9-digit national ID rejected")

    def test_national_id_format_validation_wrong_start(self):
        """National ID starting with 3 is invalid"""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "3123456789",  # starts with 3
            "password": "test123"
        })
        assert resp.status_code == 401
        print("✅ National ID starting with 3 rejected")

    def test_nonexistent_national_id(self):
        """Valid national_id format but no user with that ID"""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "1999999999",  # valid format but likely not in DB
            "password": "test123"
        })
        assert resp.status_code == 401
        print("✅ Unknown national ID returns 401")


# ── Tests: Employee Create → Account Auto-Create ──────────────────

class TestEmployeeAccountAutoCreate:
    """Test that adding an employee with national_id auto-creates a user account"""

    emp_id = None
    user_id = None
    national_id = "1" + str(uuid.uuid4().int)[:9]  # Valid national ID starting with 1

    @pytest.fixture(autouse=True)
    def setup_headers(self, admin_headers):
        self.headers = admin_headers

    def test_create_employee_with_national_id(self):
        """Creating employee with national_id returns account_created=true"""
        emp_num = "TEST-AUTH-001"
        resp = requests.post(f"{BASE_URL}/api/employees", json={
            "name": "TEST موظف هوية",
            "job_title": "موظف ميداني",
            "department": "plazas",
            "employee_number": emp_num,
            "national_id": TestEmployeeAccountAutoCreate.national_id,
            "work_type": "field",
            "employment_type": "permanent"
        }, headers=self.headers)
        assert resp.status_code == 200, f"Employee creation failed: {resp.text}"
        data = resp.json()
        assert data.get("account_created") == True, f"account_created should be True: {data}"
        assert "user_id" in data and data["user_id"], f"user_id should be present: {data}"
        TestEmployeeAccountAutoCreate.emp_id = data["id"]
        TestEmployeeAccountAutoCreate.user_id = data["user_id"]
        print(f"✅ Employee created with account: emp_id={data['id']}, user_id={data['user_id']}")

    def test_new_account_status_is_pending(self):
        """New employee account starts as 'pending' status"""
        assert TestEmployeeAccountAutoCreate.emp_id, "Employee must be created first"
        # Get employees list to check account_status
        resp = requests.get(f"{BASE_URL}/api/employees?department=plazas", headers=self.headers)
        assert resp.status_code == 200
        employees = resp.json()
        emp = next((e for e in employees if e["id"] == TestEmployeeAccountAutoCreate.emp_id), None)
        assert emp is not None, "Employee not found in list"
        assert emp.get("account_status") == "pending", f"Expected pending, got: {emp.get('account_status')}"
        print("✅ New account starts as 'pending'")

    def test_pending_account_cannot_login(self):
        """Pending account cannot login (status check before auth)"""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": TestEmployeeAccountAutoCreate.national_id,
            "password": "TEST-AUTH-001"
        })
        assert resp.status_code == 403, f"Expected 403 for pending account, got {resp.status_code}"
        detail = resp.json().get("detail", "")
        assert "معلق" in detail or "pending" in detail.lower() or "لم يُفعَّل" in detail, f"Expected pending message: {detail}"
        print(f"✅ Pending account cannot login: {detail}")

    def test_activate_employee_account(self):
        """Manager can activate pending account"""
        assert TestEmployeeAccountAutoCreate.emp_id, "Employee must be created first"
        resp = requests.post(
            f"{BASE_URL}/api/employees/{TestEmployeeAccountAutoCreate.emp_id}/activate-account",
            json={}, headers=self.headers
        )
        assert resp.status_code == 200, f"Activate failed: {resp.text}"
        data = resp.json()
        assert "message" in data
        print(f"✅ Account activated: {data['message']}")

    def test_active_account_can_login(self):
        """After activation, employee can login with national_id + employee_number"""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": TestEmployeeAccountAutoCreate.national_id,
            "password": "TEST-AUTH-001"
        })
        assert resp.status_code == 200, f"Login after activation failed: {resp.text}"
        data = resp.json()
        assert "access_token" in data
        print("✅ Employee can login after activation")

    def test_must_change_pin_after_first_login(self):
        """must_change_pin=True after login (first login)"""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": TestEmployeeAccountAutoCreate.national_id,
            "password": "TEST-AUTH-001"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("must_change_pin") == True, f"must_change_pin should be True: {data.get('must_change_pin')}"
        print("✅ must_change_pin=True after first login")

    def test_create_employee_without_national_id_no_account(self):
        """Creating employee without national_id does NOT create account"""
        resp = requests.post(f"{BASE_URL}/api/employees", json={
            "name": "TEST بدون هوية",
            "job_title": "موظف",
            "department": "plazas",
            "employee_number": "TEST-AUTH-NOID",
            "work_type": "field",
            "employment_type": "permanent"
        }, headers=self.headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("account_created") == False, f"account_created should be False (no national_id): {data}"
        # Cleanup
        if data.get("id"):
            requests.delete(f"{BASE_URL}/api/employees/{data['id']}", headers=self.headers)
        print("✅ Employee without national_id has no account created")


# ── Tests: Brute Force Protection ─────────────────────────────────

class TestBruteForceProtection:
    """Test that 5 wrong password attempts lock the account"""

    national_id = "2" + str(uuid.uuid4().int)[:9]
    emp_id = None

    @pytest.fixture(autouse=True)
    def setup_headers(self, admin_headers):
        self.headers = admin_headers

    def test_setup_brute_force_test_employee(self):
        """Create and activate employee for brute force test"""
        resp = requests.post(f"{BASE_URL}/api/employees", json={
            "name": "TEST موظف قفل",
            "job_title": "موظف ميداني",
            "department": "plazas",
            "employee_number": "TEST-LOCK-001",
            "national_id": TestBruteForceProtection.national_id,
            "work_type": "field",
            "employment_type": "permanent"
        }, headers=self.headers)
        assert resp.status_code == 200
        TestBruteForceProtection.emp_id = resp.json()["id"]
        # Activate
        requests.post(
            f"{BASE_URL}/api/employees/{TestBruteForceProtection.emp_id}/activate-account",
            json={}, headers=self.headers
        )
        print(f"✅ Brute force test employee created and activated")

    def test_5_wrong_attempts_lock_account(self):
        """5 wrong password attempts should lock the account"""
        assert TestBruteForceProtection.national_id
        
        # Make 5 wrong attempts
        for i in range(5):
            resp = requests.post(f"{BASE_URL}/api/auth/login", json={
                "identifier": TestBruteForceProtection.national_id,
                "password": "WRONG_PASSWORD"
            })
            print(f"  Attempt {i+1}: {resp.status_code} - {resp.json().get('detail', '')[:60]}")
        
        # 5th attempt should return 429 (locked)
        assert resp.status_code == 429, f"Expected 429 after 5 attempts, got {resp.status_code}"
        print("✅ Account locked after 5 wrong attempts")

    def test_locked_account_has_arabic_message(self):
        """Locked account shows friendly Arabic error message"""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": TestBruteForceProtection.national_id,
            "password": "WRONG_PASSWORD"
        })
        detail = resp.json().get("detail", "")
        # Should contain Arabic text about lock
        assert any(c in detail for c in ["قفل", "محاولات", "مدير", "تواصل"]), f"Expected Arabic lock message: {detail}"
        print(f"✅ Arabic lock message: {detail}")

    def test_manager_can_reset_pin(self):
        """Manager can reset PIN and unfreeze account via reset-pin endpoint"""
        assert TestBruteForceProtection.emp_id
        resp = requests.post(
            f"{BASE_URL}/api/employees/{TestBruteForceProtection.emp_id}/reset-pin",
            json={}, headers=self.headers
        )
        assert resp.status_code == 200, f"Reset PIN failed: {resp.text}"
        data = resp.json()
        assert "message" in data
        print(f"✅ Manager can reset PIN: {data['message']}")

    def test_after_reset_pin_can_login_again(self):
        """After reset-pin, employee can login with employee_number as PIN"""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": TestBruteForceProtection.national_id,
            "password": "TEST-LOCK-001"  # employee_number is the new PIN
        })
        assert resp.status_code == 200, f"Login after pin reset failed: {resp.text}"
        print("✅ Can login again after PIN reset")


# ── Tests: Account Management ──────────────────────────────────────

class TestAccountManagement:
    """Test freeze, terminate account actions"""

    emp_id = None
    national_id = "1" + str(uuid.uuid4().int)[:9]

    @pytest.fixture(autouse=True)
    def setup_headers(self, admin_headers):
        self.headers = admin_headers

    def test_setup_account_management_employee(self):
        """Create and activate an employee for account management tests"""
        resp = requests.post(f"{BASE_URL}/api/employees", json={
            "name": "TEST موظف حالة",
            "job_title": "موظف ميداني",
            "department": "plazas",
            "employee_number": "TEST-STATUS-001",
            "national_id": TestAccountManagement.national_id,
            "work_type": "field",
            "employment_type": "permanent"
        }, headers=self.headers)
        assert resp.status_code == 200
        TestAccountManagement.emp_id = resp.json()["id"]
        # Activate
        act_resp = requests.post(
            f"{BASE_URL}/api/employees/{TestAccountManagement.emp_id}/activate-account",
            json={}, headers=self.headers
        )
        assert act_resp.status_code == 200
        print("✅ Account management employee created and activated")

    def test_freeze_account(self):
        """Manager can freeze an active account"""
        resp = requests.post(
            f"{BASE_URL}/api/employees/{TestAccountManagement.emp_id}/freeze-account",
            json={}, headers=self.headers
        )
        assert resp.status_code == 200, f"Freeze failed: {resp.text}"
        print(f"✅ Account frozen: {resp.json()['message']}")

    def test_frozen_account_cannot_login(self):
        """Frozen account cannot login"""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": TestAccountManagement.national_id,
            "password": "TEST-STATUS-001"
        })
        assert resp.status_code == 403
        detail = resp.json().get("detail", "")
        assert "مجمَّد" in detail or "frozen" in detail.lower() or "مجمد" in detail, f"Expected frozen message: {detail}"
        print(f"✅ Frozen account cannot login: {detail}")

    def test_terminate_account(self):
        """Manager can terminate an account"""
        resp = requests.post(
            f"{BASE_URL}/api/employees/{TestAccountManagement.emp_id}/terminate-account",
            json={}, headers=self.headers
        )
        assert resp.status_code == 200
        print(f"✅ Account terminated: {resp.json()['message']}")

    def test_terminated_account_cannot_login(self):
        """Terminated account cannot login"""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": TestAccountManagement.national_id,
            "password": "TEST-STATUS-001"
        })
        assert resp.status_code == 403
        detail = resp.json().get("detail", "")
        assert "إنهاء" in detail or "terminated" in detail.lower() or "خدمتك" in detail, f"Expected terminated message: {detail}"
        print(f"✅ Terminated account cannot login: {detail}")


# ── Tests: Change PIN ──────────────────────────────────────────────

class TestChangePin:
    """Test the change-pin endpoint"""

    national_id = "2" + str(uuid.uuid4().int)[:9]
    emp_id = None
    user_token = None

    @pytest.fixture(autouse=True)
    def setup_headers(self, admin_headers):
        self.headers = admin_headers

    def test_setup_change_pin_employee(self):
        """Create and activate employee for PIN change test"""
        resp = requests.post(f"{BASE_URL}/api/employees", json={
            "name": "TEST موظف PIN",
            "job_title": "موظف ميداني",
            "department": "plazas",
            "employee_number": "TEST-PIN-001",
            "national_id": TestChangePin.national_id,
            "work_type": "field",
            "employment_type": "permanent"
        }, headers=self.headers)
        assert resp.status_code == 200
        TestChangePin.emp_id = resp.json()["id"]
        requests.post(
            f"{BASE_URL}/api/employees/{TestChangePin.emp_id}/activate-account",
            json={}, headers=self.headers
        )
        # Login to get token
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": TestChangePin.national_id,
            "password": "TEST-PIN-001"
        })
        assert login_resp.status_code == 200
        TestChangePin.user_token = login_resp.json()["access_token"]
        print("✅ PIN change test employee set up")

    def test_change_pin_invalid_format(self):
        """PIN shorter than 4 digits rejected"""
        headers = {"Authorization": f"Bearer {TestChangePin.user_token}"}
        resp = requests.post(f"{BASE_URL}/api/auth/change-pin", json={"new_pin": "123"}, headers=headers)
        assert resp.status_code == 400, f"Expected 400 for short PIN: {resp.status_code}"
        print("✅ Short PIN rejected")

    def test_change_pin_non_numeric_rejected(self):
        """Non-numeric PIN rejected"""
        headers = {"Authorization": f"Bearer {TestChangePin.user_token}"}
        resp = requests.post(f"{BASE_URL}/api/auth/change-pin", json={"new_pin": "abcd"}, headers=headers)
        assert resp.status_code == 400
        print("✅ Non-numeric PIN rejected")

    def test_change_pin_success(self):
        """Valid PIN change succeeds"""
        headers = {"Authorization": f"Bearer {TestChangePin.user_token}"}
        resp = requests.post(f"{BASE_URL}/api/auth/change-pin", json={"new_pin": "1234"}, headers=headers)
        assert resp.status_code == 200
        print("✅ PIN changed successfully")

    def test_login_with_new_pin(self):
        """After PIN change, can login with new PIN"""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": TestChangePin.national_id,
            "password": "1234"
        })
        assert resp.status_code == 200, f"Login with new PIN failed: {resp.text}"
        data = resp.json()
        # must_change_pin should now be False
        assert data.get("must_change_pin") == False
        print("✅ Login with new PIN works, must_change_pin=False")


# ── Cleanup ────────────────────────────────────────────────────────

class TestCleanup:
    """Cleanup test data created during tests"""

    @pytest.fixture(autouse=True)
    def setup_headers(self, admin_headers):
        self.headers = admin_headers

    def test_cleanup_test_employees(self):
        """Delete all TEST-prefixed employees created during tests"""
        resp = requests.get(f"{BASE_URL}/api/employees?department=plazas", headers=self.headers)
        if resp.status_code == 200:
            employees = resp.json()
            deleted = 0
            for emp in employees:
                name = emp.get("name", "")
                emp_number = emp.get("employee_number", "")
                if name.startswith("TEST ") or emp_number.startswith("TEST-"):
                    del_resp = requests.delete(f"{BASE_URL}/api/employees/{emp['id']}", headers=self.headers)
                    if del_resp.status_code == 200:
                        deleted += 1
            print(f"✅ Cleanup: deleted {deleted} test employees")
        else:
            print(f"⚠️ Could not fetch employees for cleanup: {resp.status_code}")
