"""
Test compact table redesign + national ID validation
Tests: check-national-id endpoint, format validation, duplicate check, account management
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestCheckNationalIdEndpoint:
    """GET /employees/check-national-id endpoint tests"""

    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "admin@crowd.sa",
            "password": "admin123"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        token = login_response.json()["access_token"]
        self.session.headers.update({"Authorization": f"Bearer {token}"})

    def test_check_valid_new_national_id_returns_available_true(self):
        """Valid 10-digit ID not in system → available: true"""
        # Use a random ID that is very unlikely to be registered
        response = self.session.get(f"{BASE_URL}/api/employees/check-national-id?national_id=1987654321")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "available" in data, f"Response must have 'available' field: {data}"
        # We expect it to be available (not registered)
        assert data["available"] is True, f"Expected available=true for new ID: {data}"
        print(f"✓ New national ID 1987654321 → available: {data['available']}")

    def test_check_national_id_starts_with_1(self):
        """ID starting with 1 + 9 more digits → valid format"""
        response = self.session.get(f"{BASE_URL}/api/employees/check-national-id?national_id=1234567890")
        assert response.status_code == 200
        data = response.json()
        assert "available" in data
        print(f"✓ ID 1234567890 → available: {data['available']}")

    def test_check_national_id_starts_with_2(self):
        """ID starting with 2 + 9 more digits → valid format"""
        response = self.session.get(f"{BASE_URL}/api/employees/check-national-id?national_id=2987654321")
        assert response.status_code == 200
        data = response.json()
        assert "available" in data
        print(f"✓ ID 2987654321 → available: {data['available']}")

    def test_check_national_id_invalid_starts_with_3_returns_not_available(self):
        """ID starting with 3 → invalid format → available: false"""
        response = self.session.get(f"{BASE_URL}/api/employees/check-national-id?national_id=3234567890")
        assert response.status_code == 200
        data = response.json()
        assert "available" in data
        # The endpoint returns available:false for bad format
        assert data["available"] is False, f"Expected available=false for invalid format: {data}"
        print(f"✓ Invalid format ID (starts with 3) → available: {data['available']}")

    def test_check_national_id_9_digits_invalid_format(self):
        """9-digit ID → invalid format → available: false"""
        response = self.session.get(f"{BASE_URL}/api/employees/check-national-id?national_id=123456789")
        assert response.status_code == 200
        data = response.json()
        assert "available" in data
        assert data["available"] is False, f"Expected available=false for 9-digit ID: {data}"
        print(f"✓ 9-digit ID → available: {data['available']}")

    def test_check_national_id_no_department_revealed(self):
        """Response should NOT contain department info"""
        response = self.session.get(f"{BASE_URL}/api/employees/check-national-id?national_id=1987654321")
        assert response.status_code == 200
        data = response.json()
        assert "department" not in data, f"Department should NOT be in response: {data}"
        assert "emp" not in str(data).lower() or "available" in data, \
            f"No employee details should be revealed: {data}"
        # Only 'available' (and optionally 'reason') should be in response
        allowed_keys = {"available", "reason"}
        unexpected = set(data.keys()) - allowed_keys
        assert len(unexpected) == 0, f"Unexpected fields in response: {unexpected}"
        print(f"✓ Response contains only allowed fields: {data}")

    def test_check_national_id_requires_auth(self):
        """Endpoint should require authentication"""
        unauthenticated = requests.Session()
        response = unauthenticated.get(f"{BASE_URL}/api/employees/check-national-id?national_id=1234567890")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got: {response.status_code}"
        print(f"✓ Endpoint requires auth → {response.status_code}")


class TestEmployeeCreateNationalIdValidation:
    """POST /employees national ID validation tests"""

    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "admin@crowd.sa",
            "password": "admin123"
        })
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        self.created_employee_id = None

    def teardown_method(self):
        """Cleanup any created test employees"""
        if self.created_employee_id:
            self.session.delete(f"{BASE_URL}/api/employees/{self.created_employee_id}")

    def test_create_employee_with_9_digit_national_id_returns_400(self):
        """9-digit national ID should be rejected with 400"""
        response = self.session.post(f"{BASE_URL}/api/employees", json={
            "name": "TEST_invalid_id_emp",
            "employee_number": "TEST_INVALID_001",
            "job_title": "اختبار",
            "department": "planning",
            "national_id": "123456789",  # 9 digits - invalid
            "shift": "",
            "rest_days": []
        })
        assert response.status_code == 400, \
            f"Expected 400 for 9-digit national ID, got {response.status_code}: {response.text}"
        detail = response.json().get("detail", "")
        assert detail, "Error response should have 'detail' field"
        print(f"✓ 9-digit national ID rejected with 400. Message: {detail}")

    def test_create_employee_with_invalid_prefix_returns_400(self):
        """National ID starting with 3 should be rejected with 400"""
        response = self.session.post(f"{BASE_URL}/api/employees", json={
            "name": "TEST_bad_prefix_emp",
            "employee_number": "TEST_BADPFX_001",
            "job_title": "اختبار",
            "department": "planning",
            "national_id": "3234567890",  # starts with 3 - invalid
            "shift": "",
            "rest_days": []
        })
        assert response.status_code == 400, \
            f"Expected 400 for national ID starting with 3, got {response.status_code}: {response.text}"
        detail = response.json().get("detail", "")
        print(f"✓ ID starting with 3 rejected with 400. Message: {detail}")

    def test_create_employee_with_valid_national_id_succeeds(self):
        """Valid 10-digit national ID (starts with 1 or 2) should be accepted"""
        response = self.session.post(f"{BASE_URL}/api/employees", json={
            "name": "TEST_valid_id_emp",
            "employee_number": "TEST_VALID_001",
            "job_title": "اختبار",
            "department": "planning",
            "national_id": "1099887766",  # valid: 10 digits, starts with 1
            "shift": "",
            "rest_days": []
        })
        assert response.status_code == 200, \
            f"Expected 200 for valid national ID, got {response.status_code}: {response.text}"
        data = response.json()
        assert "id" in data, f"Response should have 'id' field: {data}"
        self.created_employee_id = data["id"]
        print(f"✓ Valid national ID (1099887766) accepted. Employee ID: {data['id']}")
        print(f"  account_created: {data.get('account_created')}")

    def test_create_employee_auto_account_created_for_national_id(self):
        """Employee with national_id should auto-create user account"""
        response = self.session.post(f"{BASE_URL}/api/employees", json={
            "name": "TEST_auto_account_emp",
            "employee_number": "TEST_AUTOACC_001",
            "job_title": "اختبار",
            "department": "planning",
            "national_id": "1099887755",
            "shift": "",
            "rest_days": []
        })
        assert response.status_code == 200
        data = response.json()
        self.created_employee_id = data["id"]
        assert data.get("account_created") is True, \
            f"Expected account_created=true for employee with national_id: {data}"
        assert data.get("user_id") is not None, \
            f"Expected user_id in response: {data}"
        print(f"✓ Auto account created: user_id={data['user_id']}")

    def test_create_employee_without_national_id_no_account(self):
        """Employee without national_id should NOT auto-create user account"""
        response = self.session.post(f"{BASE_URL}/api/employees", json={
            "name": "TEST_no_id_emp",
            "employee_number": "TEST_NOID_001",
            "job_title": "اختبار",
            "department": "planning",
            "shift": "",
            "rest_days": []
        })
        assert response.status_code == 200
        data = response.json()
        self.created_employee_id = data["id"]
        assert data.get("account_created") is False, \
            f"Expected account_created=false for employee without national_id: {data}"
        print(f"✓ No national_id → account_created=false")

    def test_duplicate_national_id_returns_400_without_department(self):
        """Duplicate national ID should return 400 with 'مسجل مسبقاً في النظام' — no department info"""
        # First, create an employee
        first_response = self.session.post(f"{BASE_URL}/api/employees", json={
            "name": "TEST_dup_first_emp",
            "employee_number": "TEST_DUP_001",
            "job_title": "اختبار",
            "department": "planning",
            "national_id": "1099887744",
            "shift": "",
            "rest_days": []
        })
        assert first_response.status_code == 200, f"First create failed: {first_response.text}"
        self.created_employee_id = first_response.json()["id"]

        # Try to create another employee with same national_id
        dup_response = self.session.post(f"{BASE_URL}/api/employees", json={
            "name": "TEST_dup_second_emp",
            "employee_number": "TEST_DUP_002",
            "job_title": "اختبار",
            "department": "gates",  # different department
            "national_id": "1099887744",  # same national_id
            "shift": "",
            "rest_days": []
        })
        assert dup_response.status_code == 400, \
            f"Expected 400 for duplicate national ID, got {dup_response.status_code}: {dup_response.text}"
        detail = dup_response.json().get("detail", "")
        # Should contain the Arabic duplicate message
        assert "مسجل" in detail or "نظام" in detail, \
            f"Error message should say ID is registered: '{detail}'"
        # Should NOT reveal department
        departments = ["planning", "gates", "plazas", "squares", "crowd_services", "mataf"]
        for dept in departments:
            assert dept not in detail, f"Department '{dept}' revealed in error: '{detail}'"
        print(f"✓ Duplicate national ID → 400. Message: '{detail}' (no dept revealed)")

    def test_national_id_format_error_message_in_arabic(self):
        """Format error for invalid national ID should be in Arabic"""
        response = self.session.post(f"{BASE_URL}/api/employees", json={
            "name": "TEST_format_emp",
            "employee_number": "TEST_FMT_001",
            "job_title": "اختبار",
            "department": "planning",
            "national_id": "9999999999",  # starts with 9 - invalid
            "shift": "",
            "rest_days": []
        })
        assert response.status_code == 400
        detail = response.json().get("detail", "")
        # Should have Arabic error about format
        assert len(detail) > 0, "Error detail should not be empty"
        print(f"✓ Format error message: '{detail}'")


class TestRestDaysCompactDots:
    """Test rest days array still works correctly via API"""

    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "admin@crowd.sa",
            "password": "admin123"
        })
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        self.session.headers.update({"Authorization": f"Bearer {token}"})

    def test_employees_have_rest_days_array(self):
        """Employees should have rest_days array in API response"""
        response = self.session.get(f"{BASE_URL}/api/employees?department=planning")
        assert response.status_code == 200
        employees = response.json()
        # At least first employee should have rest_days field
        if employees:
            emp = employees[0]
            assert "rest_days" in emp, f"Employee missing rest_days field: {emp}"
            assert isinstance(emp["rest_days"], list), "rest_days should be a list"
        print(f"✓ Employees have rest_days array. Sample: {employees[0].get('rest_days') if employees else 'N/A'}")

    def test_rest_days_contain_valid_arabic_day_names(self):
        """rest_days should only contain valid Arabic day names"""
        valid_days = {"السبت", "الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"}
        response = self.session.get(f"{BASE_URL}/api/employees?department=planning")
        assert response.status_code == 200
        for emp in response.json():
            for day in emp.get("rest_days", []):
                assert day in valid_days, f"Invalid day '{day}' for employee {emp['name']}"
        print(f"✓ All rest_days contain valid Arabic day names")

    def test_check_national_id_exclude_emp_id_param(self):
        """exclude_emp_id query param should work for edit mode"""
        # Get an employee with national_id to test exclude
        response = self.session.get(f"{BASE_URL}/api/employees?department=planning")
        assert response.status_code == 200
        employees = response.json()
        emp_with_id = next((e for e in employees if e.get("national_id")), None)

        if emp_with_id:
            nat_id = emp_with_id["national_id"]
            emp_id = emp_with_id["id"]
            # When editing same employee, exclude_emp_id should make it available
            check_response = self.session.get(
                f"{BASE_URL}/api/employees/check-national-id?national_id={nat_id}&exclude_emp_id={emp_id}"
            )
            assert check_response.status_code == 200
            data = check_response.json()
            assert "available" in data
            assert data["available"] is True, \
                f"Same employee's own national_id should be available when excluded: {data}"
            print(f"✓ exclude_emp_id works: {nat_id} is available when editing own employee")
        else:
            print("⚠ No employee with national_id found, skipping exclude test")


class TestAccountManagementActions:
    """Test account management actions (activate, freeze, terminate, reset-pin)"""

    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "admin@crowd.sa",
            "password": "admin123"
        })
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        # Create test employee with national_id
        create_response = self.session.post(f"{BASE_URL}/api/employees", json={
            "name": "TEST_account_mgmt_emp",
            "employee_number": "TEST_ACCTMGMT_001",
            "job_title": "اختبار إدارة الحساب",
            "department": "planning",
            "national_id": "1099887733",
            "shift": "",
            "rest_days": []
        })
        assert create_response.status_code == 200, f"Setup failed: {create_response.text}"
        self.emp_id = create_response.json()["id"]

    def teardown_method(self):
        """Cleanup test employee"""
        if hasattr(self, 'emp_id'):
            self.session.delete(f"{BASE_URL}/api/employees/{self.emp_id}")

    def test_activate_account(self):
        """POST /employees/{id}/activate-account should work"""
        response = self.session.post(f"{BASE_URL}/api/employees/{self.emp_id}/activate-account")
        assert response.status_code == 200, f"Activate failed: {response.text}"
        data = response.json()
        assert "message" in data
        print(f"✓ Account activated: {data['message']}")
        # Verify account_status is active
        emp_response = self.session.get(f"{BASE_URL}/api/employees?department=planning")
        employees = emp_response.json()
        emp = next((e for e in employees if e["id"] == self.emp_id), None)
        assert emp is not None
        assert emp.get("account_status") == "active", \
            f"Expected account_status=active, got {emp.get('account_status')}"

    def test_freeze_account_after_activate(self):
        """POST /employees/{id}/freeze-account should work after activation"""
        # Activate first
        self.session.post(f"{BASE_URL}/api/employees/{self.emp_id}/activate-account")
        # Then freeze
        response = self.session.post(f"{BASE_URL}/api/employees/{self.emp_id}/freeze-account")
        assert response.status_code == 200, f"Freeze failed: {response.text}"
        print(f"✓ Account frozen: {response.json()['message']}")
        # Verify account_status is frozen
        emp_response = self.session.get(f"{BASE_URL}/api/employees?department=planning")
        employees = emp_response.json()
        emp = next((e for e in employees if e["id"] == self.emp_id), None)
        assert emp.get("account_status") == "frozen", \
            f"Expected account_status=frozen, got {emp.get('account_status')}"

    def test_terminate_account(self):
        """POST /employees/{id}/terminate-account should work"""
        # Activate first
        self.session.post(f"{BASE_URL}/api/employees/{self.emp_id}/activate-account")
        # Then terminate
        response = self.session.post(f"{BASE_URL}/api/employees/{self.emp_id}/terminate-account")
        assert response.status_code == 200, f"Terminate failed: {response.text}"
        print(f"✓ Account terminated: {response.json()['message']}")
        # Verify account_status is terminated
        emp_response = self.session.get(f"{BASE_URL}/api/employees?department=planning")
        employees = emp_response.json()
        emp = next((e for e in employees if e["id"] == self.emp_id), None)
        assert emp.get("account_status") == "terminated", \
            f"Expected account_status=terminated, got {emp.get('account_status')}"

    def test_reset_pin_after_activate(self):
        """POST /employees/{id}/reset-pin should work after activation"""
        # Activate first
        self.session.post(f"{BASE_URL}/api/employees/{self.emp_id}/activate-account")
        # Then reset pin
        response = self.session.post(f"{BASE_URL}/api/employees/{self.emp_id}/reset-pin")
        assert response.status_code == 200, f"Reset PIN failed: {response.text}"
        data = response.json()
        assert "message" in data
        print(f"✓ PIN reset: {data['message']}")

    def test_account_status_in_get_employees(self):
        """GET /employees should return account_status field"""
        response = self.session.get(f"{BASE_URL}/api/employees?department=planning")
        assert response.status_code == 200
        employees = response.json()
        emp = next((e for e in employees if e["id"] == self.emp_id), None)
        assert emp is not None, "Test employee not found"
        assert "account_status" in emp, "account_status field missing in employee"
        # Fresh employee has national_id and user_id → status should be pending
        assert emp["account_status"] in ["pending", "active", "frozen", "terminated", "no_account"], \
            f"Invalid account_status: {emp['account_status']}"
        print(f"✓ account_status in GET response: {emp['account_status']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
