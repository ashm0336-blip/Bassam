"""
RBAC Permissions System Tests — Iteration 54
Tests:
- Permission format verification (dict format: {perm: 'read'|'write'})
- All 5 roles: general_manager, department_manager, shift_supervisor, field_staff, admin_staff
- /auth/my-permissions returns correct format
- Role hierarchy and permission enforcement
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

ADMIN_CREDENTIALS = {"identifier": "admin@crowd.sa", "password": "admin123"}

# Expected default permissions per role
EXPECTED_DEFAULTS = {
    "general_manager": {
        "view_daily_sessions": "read",
        "create_session": "read",
        "approve_session": "read",
        "start_prayer_round": "read",
        "complete_prayer_round": "read",
        "distribute_employees": "read",
        "view_coverage_map": "read",
        "view_density_reports": "read",
        "view_reports": "read",
        "export_reports": "read",
        "compare_sessions": "read",
        "receive_alerts": "read",
        "add_employees": "read",
        "edit_employees": "read",
    },
    "department_manager": {
        "create_session": "write",
        "approve_session": "write",
        "delete_session": "write",
        "start_prayer_round": "write",
        "distribute_employees": "write",
        "enter_density": "write",
    },
    "shift_supervisor": {
        "view_daily_sessions": "read",
        "start_prayer_round": "write",
        "distribute_employees": "write",
        "enter_density": "write",
        "send_alert": "write",
    },
    "field_staff": {
        "enter_density": "write",
        "send_alert": "write",
        "view_coverage_map": "read",
    },
    "admin_staff": {
        "view_reports": "read",
        "view_density_reports": "read",
        "receive_alerts": "read",
    },
}


@pytest.fixture(scope="module")
def admin_token():
    """Login as system_admin and return token"""
    res = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDENTIALS)
    assert res.status_code == 200, f"Admin login failed: {res.text}"
    return res.json()["access_token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


# ── Permission Format Tests ───────────────────────────────────

class TestPermissionFormat:
    """Verify permission format is dict {perm: 'read'|'write'} not array"""

    def test_my_permissions_returns_dict_not_array(self, admin_headers):
        """System admin permissions should be dict format"""
        res = requests.get(f"{BASE_URL}/api/auth/my-permissions", headers=admin_headers)
        assert res.status_code == 200
        data = res.json()
        perms = data.get("permissions", {})
        assert isinstance(perms, dict), f"Expected dict, got {type(perms)}: {perms}"

    def test_permission_values_are_read_or_write(self, admin_headers):
        """All permission values should be 'read' or 'write'"""
        res = requests.get(f"{BASE_URL}/api/auth/my-permissions", headers=admin_headers)
        data = res.json()
        perms = data.get("permissions", {})
        for perm, level in perms.items():
            assert level in ("read", "write"), f"Permission {perm} has invalid level: {level}"

    def test_system_admin_has_all_write_permissions(self, admin_headers):
        """system_admin should have all 26 permissions as 'write'"""
        res = requests.get(f"{BASE_URL}/api/auth/my-permissions", headers=admin_headers)
        data = res.json()
        perms = data.get("permissions", {})
        assert len(perms) == 26, f"system_admin should have 26 permissions, got {len(perms)}"
        for perm, level in perms.items():
            assert level == "write", f"system_admin should have write for {perm}, got {level}"


# ── General Manager (Read-Only) Tests ─────────────────────────

class TestGeneralManagerPermissions:
    """general_manager should have READ-only permissions for viewing"""

    def test_general_manager_has_view_daily_sessions_read(self, admin_headers):
        res = requests.get(f"{BASE_URL}/api/admin/role-permissions/general_manager", headers=admin_headers)
        assert res.status_code == 200
        perms = res.json().get("permissions", {})
        assert perms.get("view_daily_sessions") == "read", f"Expected read, got {perms.get('view_daily_sessions')}"

    def test_general_manager_no_create_session_write(self, admin_headers):
        """general_manager should NOT have create_session:write"""
        res = requests.get(f"{BASE_URL}/api/admin/role-permissions/general_manager", headers=admin_headers)
        perms = res.json().get("permissions", {})
        # Should be read or not present - NOT write
        level = perms.get("create_session")
        assert level != "write", f"general_manager should not have create_session:write, got {level}"

    def test_general_manager_no_approve_session_write(self, admin_headers):
        """general_manager should NOT have approve_session:write"""
        res = requests.get(f"{BASE_URL}/api/admin/role-permissions/general_manager", headers=admin_headers)
        perms = res.json().get("permissions", {})
        level = perms.get("approve_session")
        assert level != "write", f"general_manager should not have approve_session:write, got {level}"

    def test_general_manager_no_delete_session_write(self, admin_headers):
        """general_manager should NOT have delete_session:write"""
        res = requests.get(f"{BASE_URL}/api/admin/role-permissions/general_manager", headers=admin_headers)
        perms = res.json().get("permissions", {})
        level = perms.get("delete_session")
        assert level != "write", f"general_manager should not have delete_session:write, got {level}"

    def test_general_manager_no_start_prayer_round_write(self, admin_headers):
        """general_manager should NOT have start_prayer_round:write"""
        res = requests.get(f"{BASE_URL}/api/admin/role-permissions/general_manager", headers=admin_headers)
        perms = res.json().get("permissions", {})
        level = perms.get("start_prayer_round")
        assert level != "write", f"general_manager should not have start_prayer_round:write, got {level}"


# ── Department Manager (Full Write) Tests ─────────────────────

class TestDepartmentManagerPermissions:
    """department_manager should have WRITE for most permissions"""

    def test_department_manager_has_create_session_write(self, admin_headers):
        res = requests.get(f"{BASE_URL}/api/admin/role-permissions/department_manager", headers=admin_headers)
        perms = res.json().get("permissions", {})
        assert perms.get("create_session") == "write", f"Expected write, got {perms.get('create_session')}"

    def test_department_manager_has_approve_session_write(self, admin_headers):
        res = requests.get(f"{BASE_URL}/api/admin/role-permissions/department_manager", headers=admin_headers)
        perms = res.json().get("permissions", {})
        assert perms.get("approve_session") == "write", f"Expected write, got {perms.get('approve_session')}"

    def test_department_manager_has_delete_session_write(self, admin_headers):
        res = requests.get(f"{BASE_URL}/api/admin/role-permissions/department_manager", headers=admin_headers)
        perms = res.json().get("permissions", {})
        assert perms.get("delete_session") == "write", f"Expected write, got {perms.get('delete_session')}"

    def test_department_manager_has_start_prayer_round_write(self, admin_headers):
        res = requests.get(f"{BASE_URL}/api/admin/role-permissions/department_manager", headers=admin_headers)
        perms = res.json().get("permissions", {})
        assert perms.get("start_prayer_round") == "write", f"Expected write, got {perms.get('start_prayer_round')}"

    def test_department_manager_has_distribute_employees_write(self, admin_headers):
        res = requests.get(f"{BASE_URL}/api/admin/role-permissions/department_manager", headers=admin_headers)
        perms = res.json().get("permissions", {})
        assert perms.get("distribute_employees") == "write", f"Expected write, got {perms.get('distribute_employees')}"

    def test_department_manager_has_enter_density_write(self, admin_headers):
        res = requests.get(f"{BASE_URL}/api/admin/role-permissions/department_manager", headers=admin_headers)
        perms = res.json().get("permissions", {})
        assert perms.get("enter_density") == "write", f"Expected write, got {perms.get('enter_density')}"


# ── Shift Supervisor (Mixed) Tests ────────────────────────────

class TestShiftSupervisorPermissions:
    """shift_supervisor should have mixed read/write permissions"""

    def test_shift_supervisor_has_start_prayer_round_write(self, admin_headers):
        res = requests.get(f"{BASE_URL}/api/admin/role-permissions/shift_supervisor", headers=admin_headers)
        perms = res.json().get("permissions", {})
        assert perms.get("start_prayer_round") == "write", f"Expected write, got {perms.get('start_prayer_round')}"

    def test_shift_supervisor_has_distribute_employees_write(self, admin_headers):
        res = requests.get(f"{BASE_URL}/api/admin/role-permissions/shift_supervisor", headers=admin_headers)
        perms = res.json().get("permissions", {})
        assert perms.get("distribute_employees") == "write", f"Expected write, got {perms.get('distribute_employees')}"

    def test_shift_supervisor_has_enter_density_write(self, admin_headers):
        res = requests.get(f"{BASE_URL}/api/admin/role-permissions/shift_supervisor", headers=admin_headers)
        perms = res.json().get("permissions", {})
        assert perms.get("enter_density") == "write", f"Expected write, got {perms.get('enter_density')}"

    def test_shift_supervisor_no_create_session_write(self, admin_headers):
        """shift_supervisor should NOT have create_session:write"""
        res = requests.get(f"{BASE_URL}/api/admin/role-permissions/shift_supervisor", headers=admin_headers)
        perms = res.json().get("permissions", {})
        level = perms.get("create_session")
        assert level != "write", f"shift_supervisor should not have create_session:write, got {level}"

    def test_shift_supervisor_no_delete_session_write(self, admin_headers):
        """shift_supervisor should NOT have delete_session:write"""
        res = requests.get(f"{BASE_URL}/api/admin/role-permissions/shift_supervisor", headers=admin_headers)
        perms = res.json().get("permissions", {})
        level = perms.get("delete_session")
        assert level != "write", f"shift_supervisor should not have delete_session:write, got {level}"


# ── Field Staff (Minimal) Tests ───────────────────────────────

class TestFieldStaffPermissions:
    """field_staff should have minimal permissions"""

    def test_field_staff_has_enter_density_write(self, admin_headers):
        res = requests.get(f"{BASE_URL}/api/admin/role-permissions/field_staff", headers=admin_headers)
        perms = res.json().get("permissions", {})
        assert perms.get("enter_density") == "write", f"Expected write, got {perms.get('enter_density')}"

    def test_field_staff_has_send_alert_write(self, admin_headers):
        res = requests.get(f"{BASE_URL}/api/admin/role-permissions/field_staff", headers=admin_headers)
        perms = res.json().get("permissions", {})
        assert perms.get("send_alert") == "write", f"Expected write, got {perms.get('send_alert')}"

    def test_field_staff_no_create_session(self, admin_headers):
        """field_staff should NOT have create_session permission"""
        res = requests.get(f"{BASE_URL}/api/admin/role-permissions/field_staff", headers=admin_headers)
        perms = res.json().get("permissions", {})
        assert "create_session" not in perms or perms.get("create_session") not in ("read", "write"), \
            f"field_staff should not have create_session, got {perms.get('create_session')}"

    def test_field_staff_permission_count(self, admin_headers):
        """field_staff should have only ~3 permissions"""
        res = requests.get(f"{BASE_URL}/api/admin/role-permissions/field_staff", headers=admin_headers)
        perms = res.json().get("permissions", {})
        assert len(perms) <= 5, f"field_staff has too many permissions: {len(perms)} - {list(perms.keys())}"


# ── Admin Staff (Reports Only) Tests ──────────────────────────

class TestAdminStaffPermissions:
    """admin_staff should have report viewing permissions only"""

    def test_admin_staff_has_view_reports(self, admin_headers):
        res = requests.get(f"{BASE_URL}/api/admin/role-permissions/admin_staff", headers=admin_headers)
        perms = res.json().get("permissions", {})
        assert "view_reports" in perms, f"admin_staff should have view_reports: {perms}"

    def test_admin_staff_has_view_density_reports(self, admin_headers):
        res = requests.get(f"{BASE_URL}/api/admin/role-permissions/admin_staff", headers=admin_headers)
        perms = res.json().get("permissions", {})
        assert "view_density_reports" in perms, f"admin_staff should have view_density_reports: {perms}"

    def test_admin_staff_no_field_permissions(self, admin_headers):
        """admin_staff should NOT have field operations permissions"""
        res = requests.get(f"{BASE_URL}/api/admin/role-permissions/admin_staff", headers=admin_headers)
        perms = res.json().get("permissions", {})
        field_perms = ["create_session", "start_prayer_round", "distribute_employees", "enter_density"]
        for perm in field_perms:
            assert perm not in perms, f"admin_staff should not have {perm}"


# ── Permission Update Tests ───────────────────────────────────

class TestPermissionUpdates:
    """Test updating role permissions"""

    ROLE = "field_staff"
    ORIGINAL = {"enter_density": "write", "send_alert": "write", "view_coverage_map": "read"}

    def test_update_permission_to_read_level(self, admin_headers):
        """Can update a permission from write to read"""
        # Update field_staff enter_density to read
        res = requests.put(
            f"{BASE_URL}/api/admin/role-permissions/{self.ROLE}",
            json={"permissions": {"enter_density": "read", "send_alert": "write", "view_coverage_map": "read"}},
            headers=admin_headers
        )
        assert res.status_code == 200, f"Update failed: {res.text}"
        
        # Verify it was saved
        verify = requests.get(f"{BASE_URL}/api/admin/role-permissions/{self.ROLE}", headers=admin_headers)
        perms = verify.json().get("permissions", {})
        assert perms.get("enter_density") == "read", f"Expected read, got {perms.get('enter_density')}"

    def test_restore_original_permissions(self, admin_headers):
        """Restore original permissions"""
        res = requests.put(
            f"{BASE_URL}/api/admin/role-permissions/{self.ROLE}",
            json={"permissions": self.ORIGINAL},
            headers=admin_headers
        )
        assert res.status_code == 200, f"Restore failed: {res.text}"


# ── All Permissions Metadata Tests ────────────────────────────

class TestAllPermissionsMetadata:
    """Test the /admin/role-permissions endpoint metadata"""

    def test_26_permissions_total(self, admin_headers):
        """The system has 26 total permissions"""
        res = requests.get(f"{BASE_URL}/api/admin/role-permissions", headers=admin_headers)
        data = res.json()
        all_perms = data.get("all_permissions", {})
        assert len(all_perms) == 26, f"Expected 26 permissions, got {len(all_perms)}"

    def test_7_permission_groups(self, admin_headers):
        """System has 7 permission groups"""
        res = requests.get(f"{BASE_URL}/api/admin/role-permissions", headers=admin_headers)
        data = res.json()
        groups = set(v["group"] for v in data.get("all_permissions", {}).values())
        assert len(groups) == 7, f"Expected 7 groups, got {len(groups)}: {groups}"

    def test_danger_permissions_flagged(self, admin_headers):
        """delete_employees, change_roles, delete_session should have danger=True"""
        res = requests.get(f"{BASE_URL}/api/admin/role-permissions", headers=admin_headers)
        data = res.json()
        all_perms = data.get("all_permissions", {})
        danger_perms = [k for k, v in all_perms.items() if v.get("danger")]
        assert "delete_employees" in danger_perms
        assert "change_roles" in danger_perms
        assert "delete_session" in danger_perms

    def test_arabic_labels_present(self, admin_headers):
        """Each permission should have an Arabic label"""
        res = requests.get(f"{BASE_URL}/api/admin/role-permissions", headers=admin_headers)
        data = res.json()
        all_perms = data.get("all_permissions", {})
        for perm, info in all_perms.items():
            assert "ar" in info, f"Permission {perm} missing Arabic label"
            assert info["ar"], f"Permission {perm} has empty Arabic label"
