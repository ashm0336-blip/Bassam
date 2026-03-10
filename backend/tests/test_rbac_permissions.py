"""
RBAC Permissions System Tests — iteration 54
Tests: GET/PUT/POST /admin/role-permissions, /auth/my-permissions, /users/{id}/role, /employees user_role
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

ADMIN_EMAIL = "admin@crowd.sa"
ADMIN_PASSWORD = "admin123"

# ── Fixtures ─────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def admin_token():
    """Login as system_admin and return token"""
    res = requests.post(f"{BASE_URL}/api/auth/login", json={
        "identifier": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    assert res.status_code == 200, f"Admin login failed: {res.text}"
    return res.json()["access_token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


# ── GET /admin/role-permissions ───────────────────────────────────

class TestGetAllRolePermissions:
    """GET /admin/role-permissions returns all roles + metadata"""

    def test_get_all_role_permissions_status(self, admin_headers):
        res = requests.get(f"{BASE_URL}/api/admin/role-permissions", headers=admin_headers)
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"

    def test_response_contains_roles_key(self, admin_headers):
        res = requests.get(f"{BASE_URL}/api/admin/role-permissions", headers=admin_headers)
        data = res.json()
        assert "roles" in data, "Response missing 'roles' key"

    def test_response_contains_all_permissions(self, admin_headers):
        res = requests.get(f"{BASE_URL}/api/admin/role-permissions", headers=admin_headers)
        data = res.json()
        assert "all_permissions" in data, "Response missing 'all_permissions' key"

    def test_response_contains_group_labels(self, admin_headers):
        res = requests.get(f"{BASE_URL}/api/admin/role-permissions", headers=admin_headers)
        data = res.json()
        assert "group_labels" in data, "Response missing 'group_labels'"

    def test_response_contains_defaults(self, admin_headers):
        res = requests.get(f"{BASE_URL}/api/admin/role-permissions", headers=admin_headers)
        data = res.json()
        assert "defaults" in data, "Response missing 'defaults'"

    def test_all_5_roles_present(self, admin_headers):
        """5 roles: general_manager, department_manager, shift_supervisor, field_staff, admin_staff"""
        res = requests.get(f"{BASE_URL}/api/admin/role-permissions", headers=admin_headers)
        data = res.json()
        roles = data.get("roles", {})
        for role in ["general_manager", "department_manager", "shift_supervisor", "field_staff", "admin_staff"]:
            assert role in roles, f"Missing role: {role}"

    def test_25_permissions_returned(self, admin_headers):
        """Should have 25 permissions total"""
        res = requests.get(f"{BASE_URL}/api/admin/role-permissions", headers=admin_headers)
        data = res.json()
        all_perms = data.get("all_permissions", {})
        assert len(all_perms) == 25, f"Expected 25 permissions, got {len(all_perms)}"

    def test_7_permission_groups(self, admin_headers):
        """Should have 7 groups: employees, sessions, field, density, reports, alerts, settings"""
        res = requests.get(f"{BASE_URL}/api/admin/role-permissions", headers=admin_headers)
        data = res.json()
        groups = set(v["group"] for v in data.get("all_permissions", {}).values())
        assert len(groups) == 7, f"Expected 7 groups, got {len(groups)}: {groups}"

    def test_requires_auth(self):
        """Returns 401/403 without auth"""
        res = requests.get(f"{BASE_URL}/api/admin/role-permissions")
        assert res.status_code in [401, 403], f"Expected 401/403 without auth, got {res.status_code}"

    def test_danger_permissions_flagged(self, admin_headers):
        """delete_employees, change_roles, delete_session should have danger=True"""
        res = requests.get(f"{BASE_URL}/api/admin/role-permissions", headers=admin_headers)
        data = res.json()
        all_perms = data.get("all_permissions", {})
        danger_perms = [k for k, v in all_perms.items() if v.get("danger")]
        assert "delete_employees" in danger_perms, "delete_employees should be danger"
        assert "change_roles" in danger_perms, "change_roles should be danger"
        assert "delete_session" in danger_perms, "delete_session should be danger"


# ── GET /auth/my-permissions ──────────────────────────────────────

class TestGetMyPermissions:
    """GET /auth/my-permissions returns correct permissions for current user's role"""

    def test_my_permissions_status(self, admin_headers):
        res = requests.get(f"{BASE_URL}/api/auth/my-permissions", headers=admin_headers)
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"

    def test_system_admin_gets_all_25_permissions(self, admin_headers):
        """system_admin always gets all 25 permissions"""
        res = requests.get(f"{BASE_URL}/api/auth/my-permissions", headers=admin_headers)
        data = res.json()
        assert "permissions" in data, "Response missing 'permissions'"
        assert "role" in data, "Response missing 'role'"
        assert data["role"] == "system_admin", f"Expected system_admin, got {data['role']}"
        assert len(data["permissions"]) == 25, f"system_admin should get 25 permissions, got {len(data['permissions'])}"

    def test_my_permissions_requires_auth(self):
        """Returns 401/403 without auth"""
        res = requests.get(f"{BASE_URL}/api/auth/my-permissions")
        assert res.status_code in [401, 403], f"Expected 401/403 without auth, got {res.status_code}"


# ── PUT /admin/role-permissions/{role} ───────────────────────────

class TestUpdateRolePermissions:
    """PUT /admin/role-permissions/{role} — saves permissions"""

    ROLE = "admin_staff"
    ORIGINAL = ["view_reports", "view_density_reports", "receive_alerts"]
    TEST_PERMS = ["view_reports", "receive_alerts"]  # remove one

    def test_update_role_permissions_success(self, admin_headers):
        res = requests.put(
            f"{BASE_URL}/api/admin/role-permissions/{self.ROLE}",
            json={"permissions": self.TEST_PERMS},
            headers=admin_headers
        )
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"

    def test_update_returns_message_and_permissions(self, admin_headers):
        res = requests.put(
            f"{BASE_URL}/api/admin/role-permissions/{self.ROLE}",
            json={"permissions": self.TEST_PERMS},
            headers=admin_headers
        )
        data = res.json()
        assert "message" in data, "Response missing 'message'"
        assert "permissions" in data, "Response missing 'permissions'"
        assert sorted(data["permissions"]) == sorted(self.TEST_PERMS), \
            f"Returned permissions don't match: {data['permissions']}"

    def test_update_persists_via_get(self, admin_headers):
        """After PUT, GET should return updated permissions"""
        # Save test permissions
        requests.put(
            f"{BASE_URL}/api/admin/role-permissions/{self.ROLE}",
            json={"permissions": self.TEST_PERMS},
            headers=admin_headers
        )
        # Verify via GET
        res = requests.get(f"{BASE_URL}/api/admin/role-permissions", headers=admin_headers)
        data = res.json()
        saved_perms = data["roles"][self.ROLE]["permissions"]
        assert sorted(saved_perms) == sorted(self.TEST_PERMS), \
            f"Persisted permissions don't match: {saved_perms}"

    def test_update_invalid_permission_returns_400(self, admin_headers):
        """Invalid permission keys should return 400"""
        res = requests.put(
            f"{BASE_URL}/api/admin/role-permissions/{self.ROLE}",
            json={"permissions": ["fake_permission_xyz"]},
            headers=admin_headers
        )
        assert res.status_code == 400, f"Expected 400 for invalid permission, got {res.status_code}"

    def test_update_system_admin_returns_403(self, admin_headers):
        """Updating system_admin role should be forbidden"""
        res = requests.put(
            f"{BASE_URL}/api/admin/role-permissions/system_admin",
            json={"permissions": ["view_reports"]},
            headers=admin_headers
        )
        assert res.status_code == 403, f"Expected 403 for system_admin, got {res.status_code}"

    def test_restore_original_permissions(self, admin_headers):
        """Cleanup: restore admin_staff original permissions"""
        res = requests.put(
            f"{BASE_URL}/api/admin/role-permissions/{self.ROLE}",
            json={"permissions": self.ORIGINAL},
            headers=admin_headers
        )
        assert res.status_code == 200, f"Restore failed: {res.text}"


# ── POST /admin/role-permissions/{role}/reset ────────────────────

class TestResetRolePermissions:
    """POST /admin/role-permissions/{role}/reset — restores defaults"""

    ROLE = "field_staff"
    DEFAULTS = ["enter_density", "send_alert", "view_coverage_map"]

    def test_reset_role_status(self, admin_headers):
        res = requests.post(
            f"{BASE_URL}/api/admin/role-permissions/{self.ROLE}/reset",
            json={},
            headers=admin_headers
        )
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"

    def test_reset_returns_message_and_permissions(self, admin_headers):
        res = requests.post(
            f"{BASE_URL}/api/admin/role-permissions/{self.ROLE}/reset",
            json={},
            headers=admin_headers
        )
        data = res.json()
        assert "message" in data, "Response missing 'message'"
        assert "permissions" in data, "Response missing 'permissions'"

    def test_reset_restores_defaults(self, admin_headers):
        """After reset, permissions should match defaults"""
        # First modify the role
        requests.put(
            f"{BASE_URL}/api/admin/role-permissions/{self.ROLE}",
            json={"permissions": ["view_reports"]},  # different from default
            headers=admin_headers
        )
        # Then reset
        requests.post(
            f"{BASE_URL}/api/admin/role-permissions/{self.ROLE}/reset",
            json={},
            headers=admin_headers
        )
        # Verify via GET
        res = requests.get(f"{BASE_URL}/api/admin/role-permissions", headers=admin_headers)
        data = res.json()
        restored = data["roles"][self.ROLE]["permissions"]
        assert sorted(restored) == sorted(self.DEFAULTS), \
            f"After reset, expected {self.DEFAULTS}, got {restored}"

    def test_reset_system_admin_returns_403(self, admin_headers):
        """Resetting system_admin should be forbidden"""
        res = requests.post(
            f"{BASE_URL}/api/admin/role-permissions/system_admin/reset",
            json={},
            headers=admin_headers
        )
        assert res.status_code == 403, f"Expected 403 for system_admin reset, got {res.status_code}"


# ── PUT /users/{user_id}/role ─────────────────────────────────────

class TestUpdateUserRole:
    """PUT /users/{user_id}/role — role hierarchy enforcement"""

    created_user_id = None

    @pytest.fixture(scope="class", autouse=True)
    def create_test_user(self, admin_headers):
        """Create a test user to change role"""
        # Create via /employees (which creates linked account)
        import uuid
        nid = f"1{str(int.from_bytes(uuid.uuid4().bytes[:4], 'big') % 100000000).zfill(9)}"
        res = requests.post(
            f"{BASE_URL}/api/planning/employees",
            json={
                "name": "TEST_RoleChange User",
                "national_id": nid,
                "employee_number": "TEST-RC-001",
                "job_title": "Test Staff",
                "department": "planning",
                "employment_type": "temporary",
                "work_type": "admin",
                "rest_days": [],
            },
            headers=admin_headers
        )
        if res.status_code == 201:
            data = res.json()
            TestUpdateUserRole.created_user_id = data.get("user_id")
        yield
        # Teardown: delete employee
        if res.status_code == 201:
            emp_id = res.json().get("id")
            if emp_id:
                requests.delete(f"{BASE_URL}/api/planning/employees/{emp_id}", headers=admin_headers)

    def test_update_role_requires_auth(self):
        """Returns 401/403 without auth"""
        res = requests.put(
            f"{BASE_URL}/api/users/some-fake-id/role",
            json={"role": "field_staff"}
        )
        assert res.status_code in [401, 403], f"Expected 401/403 without auth, got {res.status_code}"

    def test_update_role_invalid_role_returns_400(self, admin_headers):
        """Invalid role name should return 400"""
        if not self.created_user_id:
            pytest.skip("No test user available")
        res = requests.put(
            f"{BASE_URL}/api/users/{self.created_user_id}/role",
            json={"role": "super_boss"},
            headers=admin_headers
        )
        assert res.status_code == 400, f"Expected 400 for invalid role, got {res.status_code}"

    def test_update_role_nonexistent_user_returns_404(self, admin_headers):
        """Non-existent user should return 404"""
        res = requests.put(
            f"{BASE_URL}/api/users/nonexistent-id-12345/role",
            json={"role": "field_staff"},
            headers=admin_headers
        )
        assert res.status_code == 404, f"Expected 404 for nonexistent user, got {res.status_code}"

    def test_system_admin_can_change_any_role(self, admin_headers):
        """system_admin can assign any valid role"""
        if not self.created_user_id:
            pytest.skip("No test user available")
        res = requests.put(
            f"{BASE_URL}/api/users/{self.created_user_id}/role",
            json={"role": "shift_supervisor"},
            headers=admin_headers
        )
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        assert "message" in data


# ── GET /employees returns user_role ─────────────────────────────

class TestEmployeesUserRole:
    """GET /employees should return user_role field for employees with accounts"""

    def test_employees_endpoint_accessible(self, admin_headers):
        res = requests.get(f"{BASE_URL}/api/planning/employees", headers=admin_headers)
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"

    def test_employees_have_user_role_field(self, admin_headers):
        """Each employee in response should have user_role key (may be None if no account)"""
        res = requests.get(f"{BASE_URL}/api/planning/employees", headers=admin_headers)
        data = res.json()
        if len(data) > 0:
            # At least one employee should have the field (even if None)
            first = data[0]
            assert "user_role" in first, f"user_role key missing from employee response: {first.keys()}"

    def test_general_manager_role_permissions_defaults(self, admin_headers):
        """general_manager default permissions should include view_reports"""
        res = requests.get(f"{BASE_URL}/api/admin/role-permissions", headers=admin_headers)
        data = res.json()
        gm_perms = data["roles"].get("general_manager", {}).get("permissions", [])
        assert "view_reports" in gm_perms, f"general_manager should have view_reports by default. Got: {gm_perms}"

    def test_department_manager_has_most_permissions(self, admin_headers):
        """department_manager should have the most non-admin permissions"""
        res = requests.get(f"{BASE_URL}/api/admin/role-permissions", headers=admin_headers)
        data = res.json()
        dm_perms = data["roles"].get("department_manager", {}).get("permissions", [])
        # dept manager should have > 10 permissions (it has 25 by default)
        assert len(dm_perms) >= 10, f"department_manager has too few permissions: {len(dm_perms)}"

    def test_field_staff_minimal_permissions(self, admin_headers):
        """field_staff should have minimal permissions (only 3 by default)"""
        res = requests.get(f"{BASE_URL}/api/admin/role-permissions", headers=admin_headers)
        data = res.json()
        fs_perms = data["roles"].get("field_staff", {}).get("permissions", [])
        assert len(fs_perms) <= 5, f"field_staff has too many permissions: {len(fs_perms)}"
        assert "enter_density" in fs_perms, "field_staff should have enter_density"
