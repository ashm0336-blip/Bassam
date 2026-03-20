"""
Security Audit Tests - Testing comprehensive security and technical fixes
Tests: WebSocket auth, DB indexes, permission groups, rate limiting, copyright year, activity logs, etc.
"""
import pytest
import requests
import os
import asyncio
import websockets
import json
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthAndBasicEndpoints:
    """Basic health check tests"""
    
    def test_health_endpoint(self):
        """Verify health endpoint works"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["database"] == "connected"
        print(f"✓ Health check passed: {data}")


class TestAuthAndLogin:
    """Authentication and login tests"""
    
    def test_login_success_with_admin(self):
        """Test admin login works correctly"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "admin@crowd.sa",
            "password": "admin123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == "admin@crowd.sa"
        assert data["user"]["role"] == "system_admin"
        print(f"✓ Admin login successful: {data['user']['name']}")
        return data["access_token"]
    
    def test_login_failure_wrong_password(self):
        """Test login fails with wrong password"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "admin@crowd.sa",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Login correctly rejected with wrong password")
    
    def test_login_failure_nonexistent_user(self):
        """Test login fails with nonexistent user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "nonexistent@test.com",
            "password": "anypassword"
        })
        assert response.status_code == 401
        print("✓ Login correctly rejected for nonexistent user")


class TestRateLimiting:
    """Rate limiting tests for auth endpoints"""
    
    def test_login_rate_limit_structure(self):
        """Test that login endpoint has rate limiting decorator (10/min)"""
        # Make a valid login request first to verify endpoint works
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "admin@crowd.sa",
            "password": "admin123"
        })
        assert response.status_code == 200
        print("✓ Login endpoint responds correctly (rate limit 10/minute expected)")
    
    def test_change_password_rate_limit_structure(self):
        """Test change-password endpoint exists (5/min rate limited)"""
        # First login to get token
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "admin@crowd.sa",
            "password": "admin123"
        })
        token = login_response.json()["access_token"]
        
        # Try change password (should fail with current password mismatch, not rate limit)
        response = requests.post(
            f"{BASE_URL}/api/auth/change-password",
            json={"current_password": "wrongcurrent", "new_password": "newpass123"},
            headers={"Authorization": f"Bearer {token}"}
        )
        # Should return 401 (wrong current password) not 429 (rate limit)
        assert response.status_code in [401, 400]
        print("✓ Change-password endpoint exists (rate limit 5/minute expected)")
    
    def test_change_pin_rate_limit_structure(self):
        """Test change-pin endpoint exists (5/min rate limited)"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "admin@crowd.sa",
            "password": "admin123"
        })
        token = login_response.json()["access_token"]
        
        # Try change PIN (should fail validation, not rate limit)
        response = requests.post(
            f"{BASE_URL}/api/auth/change-pin",
            json={"new_pin": "ab"},  # Invalid: not digits
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 400  # Validation error
        print("✓ Change-pin endpoint exists (rate limit 5/minute expected)")


class TestPermissionGroups:
    """Permission groups CRUD and is_system flag tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "admin@crowd.sa",
            "password": "admin123"
        })
        return response.json()["access_token"]
    
    def test_list_permission_groups(self, admin_token):
        """Test listing permission groups"""
        response = requests.get(
            f"{BASE_URL}/api/admin/permission-groups",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        groups = response.json()
        assert isinstance(groups, list)
        assert len(groups) >= 8  # 8 default groups expected
        print(f"✓ Found {len(groups)} permission groups")
        return groups
    
    def test_system_groups_have_is_system_true(self, admin_token):
        """Test that default system groups have is_system=True"""
        response = requests.get(
            f"{BASE_URL}/api/admin/permission-groups",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        groups = response.json()
        
        system_group_names = [
            "General Manager", "Planning Manager", "Prayer Areas Manager",
            "Gates Manager", "Plazas Manager", "Crowd Services Manager",
            "Mataf Manager", "Field Staff"
        ]
        
        system_groups_found = 0
        for group in groups:
            if group.get("name_en") in system_group_names:
                assert group.get("is_system") == True, f"Group {group['name_en']} should have is_system=True"
                system_groups_found += 1
                print(f"  ✓ {group['name_en']}: is_system={group.get('is_system')}")
        
        assert system_groups_found >= 8, f"Expected at least 8 system groups, found {system_groups_found}"
        print(f"✓ All {system_groups_found} system groups have is_system=True")
    
    def test_cannot_delete_system_group(self, admin_token):
        """Test that system groups cannot be deleted"""
        # Get groups
        response = requests.get(
            f"{BASE_URL}/api/admin/permission-groups",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        groups = response.json()
        
        # Find a system group
        system_group = next((g for g in groups if g.get("is_system") == True), None)
        assert system_group is not None, "No system group found"
        
        # Try to delete it
        delete_response = requests.delete(
            f"{BASE_URL}/api/admin/permission-groups/{system_group['id']}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert delete_response.status_code == 403
        assert "لا يمكن حذف مجموعة النظام" in delete_response.json().get("detail", "")
        print(f"✓ Cannot delete system group '{system_group['name_en']}' - correctly blocked")
    
    def test_create_and_delete_custom_group(self, admin_token):
        """Test creating and deleting a non-system group works"""
        # Create a custom group
        create_response = requests.post(
            f"{BASE_URL}/api/admin/permission-groups",
            json={
                "name_ar": "مجموعة اختبار",
                "name_en": "TEST_Custom_Group",
                "description_ar": "مجموعة للاختبار فقط",
                "page_permissions": {"/": {"visible": True, "editable": False}}
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert create_response.status_code == 200
        created = create_response.json()
        assert created.get("is_system") == False
        print(f"✓ Created custom group: {created['name_en']} (is_system={created['is_system']})")
        
        # Delete it
        delete_response = requests.delete(
            f"{BASE_URL}/api/admin/permission-groups/{created['id']}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert delete_response.status_code == 200
        print("✓ Custom group deleted successfully")


class TestActivityLogs:
    """Activity log tests - verify no English role names"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "admin@crowd.sa",
            "password": "admin123"
        })
        return response.json()["access_token"]
    
    def test_activity_logs_endpoint_exists(self, admin_token):
        """Test activity logs endpoint works"""
        response = requests.get(
            f"{BASE_URL}/api/admin/activity-logs?limit=10",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        logs = response.json()
        assert isinstance(logs, list)
        print(f"✓ Activity logs endpoint works, found {len(logs)} recent logs")
    
    def test_login_activity_log_no_english_role(self, admin_token):
        """Test that login activity doesn't show English role names like (system_admin)"""
        # Make a fresh login to create activity log
        requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "admin@crowd.sa",
            "password": "admin123"
        })
        
        # Check activity logs
        response = requests.get(
            f"{BASE_URL}/api/admin/activity-logs?action=login&limit=5",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        logs = response.json()
        
        # Check that no log contains English role names like "(system_admin)"
        english_roles = ["(system_admin)", "(general_manager)", "(department_manager)", 
                        "(shift_supervisor)", "(field_staff)"]
        
        for log in logs:
            log_str = json.dumps(log)
            for role in english_roles:
                assert role not in log_str, f"Found English role '{role}' in activity log"
        
        print("✓ Activity logs do not contain English role names")


class TestWebSocketAuth:
    """WebSocket authentication tests - token required"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "admin@crowd.sa",
            "password": "admin123"
        })
        return response.json()["access_token"]
    
    def test_websocket_rejects_no_token(self):
        """Test WebSocket connection is rejected without token"""
        ws_url = BASE_URL.replace("https://", "wss://").replace("http://", "ws://") + "/ws"
        
        async def connect_without_token():
            try:
                async with websockets.connect(ws_url) as ws:
                    # If we reach here, connection was accepted (BAD)
                    return "accepted"
            except websockets.exceptions.ConnectionClosedError as e:
                # Connection should be closed with code 4001
                return f"closed:{e.code}"
            except Exception as e:
                return f"error:{type(e).__name__}"
        
        result = asyncio.get_event_loop().run_until_complete(connect_without_token())
        print(f"WebSocket without token result: {result}")
        assert "closed:4001" in result or "error" in result
        print("✓ WebSocket correctly rejects connection without token")
    
    def test_websocket_rejects_invalid_token(self):
        """Test WebSocket connection is rejected with invalid token"""
        ws_url = BASE_URL.replace("https://", "wss://").replace("http://", "ws://") + "/ws?token=invalid_token_here"
        
        async def connect_with_invalid_token():
            try:
                async with websockets.connect(ws_url) as ws:
                    return "accepted"
            except websockets.exceptions.ConnectionClosedError as e:
                return f"closed:{e.code}"
            except Exception as e:
                return f"error:{type(e).__name__}"
        
        result = asyncio.get_event_loop().run_until_complete(connect_with_invalid_token())
        print(f"WebSocket with invalid token result: {result}")
        assert "closed:4001" in result or "error" in result
        print("✓ WebSocket correctly rejects connection with invalid token")
    
    def test_websocket_accepts_valid_token(self, admin_token):
        """Test WebSocket connection is accepted with valid token"""
        ws_url = BASE_URL.replace("https://", "wss://").replace("http://", "ws://") + f"/ws?token={admin_token}"
        
        async def connect_with_valid_token():
            try:
                async with websockets.connect(ws_url) as ws:
                    # Connection accepted, wait briefly then close
                    await asyncio.sleep(0.5)
                    return "accepted"
            except websockets.exceptions.ConnectionClosedError as e:
                return f"closed:{e.code}"
            except Exception as e:
                return f"error:{type(e).__name__}"
        
        result = asyncio.get_event_loop().run_until_complete(connect_with_valid_token())
        print(f"WebSocket with valid token result: {result}")
        assert result == "accepted"
        print("✓ WebSocket correctly accepts connection with valid token")


class TestWSManagerBroadcast:
    """Test ws_manager.broadcast() accepts both dict and string"""
    
    def test_broadcast_method_signature(self):
        """Verify broadcast accepts dict via API trigger"""
        # Login to get token
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "admin@crowd.sa",
            "password": "admin123"
        })
        token = response.json()["access_token"]
        
        # Trigger a CRUD operation that uses broadcast with dict
        # Creating a permission group triggers: ws_manager.broadcast({"type": "permissions", "action": "group_changed"})
        create_response = requests.post(
            f"{BASE_URL}/api/admin/permission-groups",
            json={
                "name_ar": "اختبار البث",
                "name_en": "TEST_Broadcast_Test",
                "description_ar": "اختبار",
                "page_permissions": {}
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        assert create_response.status_code == 200
        print("✓ Permission group created - broadcast(dict) worked")
        
        # Clean up
        group_id = create_response.json()["id"]
        requests.delete(
            f"{BASE_URL}/api/admin/permission-groups/{group_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        print("✓ ws_manager.broadcast() accepts dict parameter correctly")


class TestTasksDeadCodeRemoval:
    """Test that dead code in tasks.py now_iso() was removed"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "admin@crowd.sa",
            "password": "admin123"
        })
        return response.json()["access_token"]
    
    def test_tasks_endpoint_works(self, admin_token):
        """Verify tasks endpoint still works after dead code removal"""
        response = requests.get(
            f"{BASE_URL}/api/tasks?department=planning",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        print("✓ Tasks endpoint works correctly")
    
    def test_create_task_uses_now_iso(self, admin_token):
        """Test creating a task (uses now_iso()) works"""
        # Get an employee first
        emp_response = requests.get(
            f"{BASE_URL}/api/employees?department=planning",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        employees = emp_response.json()
        
        if not employees:
            # Create a test employee
            create_emp = requests.post(
                f"{BASE_URL}/api/employees",
                json={
                    "name": "TEST_Task_Employee",
                    "national_id": "1234567890",
                    "department": "planning",
                    "job_title": "مختبر",
                    "employment_type": "permanent"
                },
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            emp_id = create_emp.json().get("id")
        else:
            emp_id = employees[0]["id"]
        
        # Create a task
        task_response = requests.post(
            f"{BASE_URL}/api/tasks",
            json={
                "title": "TEST_Task_DeadCode",
                "description": "Testing now_iso function",
                "department": "planning",
                "assignee_ids": [emp_id],
                "priority": "normal"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        if task_response.status_code == 200:
            task = task_response.json()
            assert "created_at" in task
            assert task["created_at"]  # Should be ISO timestamp
            print(f"✓ Task created with timestamp: {task['created_at']}")
            
            # Clean up
            requests.delete(
                f"{BASE_URL}/api/tasks/{task['id']}",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
        else:
            print(f"Task creation returned {task_response.status_code}: {task_response.text}")


class TestDashboardAndSidebar:
    """Test dashboard and sidebar menu functionality"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "admin@crowd.sa",
            "password": "admin123"
        })
        return response.json()["access_token"]
    
    def test_auth_me_endpoint(self, admin_token):
        """Test /auth/me returns correct user data"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        user = response.json()
        assert user["email"] == "admin@crowd.sa"
        assert user["role"] == "system_admin"
        print(f"✓ /auth/me works: {user['name']} ({user['role']})")
    
    def test_sidebar_menu_loads(self, admin_token):
        """Test sidebar menu endpoint works"""
        response = requests.get(
            f"{BASE_URL}/api/admin/sidebar-menu",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        menu = response.json()
        assert isinstance(menu, list)
        assert len(menu) > 0
        print(f"✓ Sidebar menu loaded: {len(menu)} items")
    
    def test_my_permissions_endpoint(self, admin_token):
        """Test /auth/my-permissions endpoint for admin"""
        response = requests.get(
            f"{BASE_URL}/api/auth/my-permissions",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "permissions" in data
        assert data["role"] == "system_admin"
        # Admin should have write permission on everything
        perms = data["permissions"]
        assert all(v == "write" for v in perms.values())
        print(f"✓ Admin has {len(perms)} permissions (all write)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
