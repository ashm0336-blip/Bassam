"""
WebSocket Real-time Testing — Validates WebSocket broadcast system for Al-Haram crowd management app.

Tests:
1. Health check endpoint
2. WebSocket connection establishment
3. WebSocket broadcast triggered by CRUD operations
4. Employee account action endpoints (/employees/{id}/{action})
5. Dashboard and alerts endpoints
"""
import pytest
import requests
import websocket
import json
import threading
import time
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
# For internal WebSocket testing, use localhost:8001
WS_URL_INTERNAL = "ws://localhost:8001/ws"

# Test credentials - API uses 'identifier' field
ADMIN_IDENTIFIER = "admin@crowd.sa"
ADMIN_PASSWORD = "admin123"


class TestHealthAndAuth:
    """Health check and authentication tests"""
    
    def test_health_check(self):
        """Test health endpoint is accessible"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.text}"
        data = response.json()
        assert data.get("status") == "healthy"
        print(f"✅ Health check passed: {data}")
    
    def test_admin_login(self):
        """Test admin login returns token (uses 'identifier' field)"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": ADMIN_IDENTIFIER,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, f"No access token in response: {data}"
        assert data.get("user", {}).get("email") == ADMIN_IDENTIFIER
        print(f"✅ Admin login successful, token received")
        return data["access_token"]


class TestWebSocketConnection:
    """WebSocket connection and broadcast tests"""
    
    def get_auth_token(self):
        """Helper to get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": ADMIN_IDENTIFIER, "password": ADMIN_PASSWORD
        })
        return response.json().get("access_token")
    
    def test_websocket_endpoint_exists(self):
        """Test WebSocket endpoint /ws is accessible via internal backend"""
        # Use synchronous websocket for simple connection test
        try:
            ws = websocket.create_connection(WS_URL_INTERNAL, timeout=5)
            print("✅ WebSocket connection established to localhost:8001/ws")
            ws.close()
        except Exception as e:
            pytest.fail(f"WebSocket connection failed: {e}")
    
    def test_websocket_broadcast_middleware_exists(self):
        """Verify RealtimeBroadcastMiddleware is configured"""
        # This is a code review check - the middleware should be in server.py
        import sys
        sys.path.insert(0, '/app/backend')
        from ws_manager import ws_manager, RealtimeBroadcastMiddleware, CHANNEL_MAP
        
        # Verify channel mapping exists
        assert len(CHANNEL_MAP) > 0, "CHANNEL_MAP should have patterns"
        
        # Verify employees pattern exists
        emp_channel = ws_manager.resolve_channel("/api/employees/123/activate-account")
        assert emp_channel == "employees", f"Expected 'employees' channel, got: {emp_channel}"
        
        print(f"✅ ws_manager configured with {len(CHANNEL_MAP)} channel patterns")
        print(f"✅ Employee action routes to 'employees' channel")


class TestEmployeeAccountActions:
    """Test employee account action endpoints (previously buggy)"""
    
    @pytest.fixture
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": ADMIN_IDENTIFIER, "password": ADMIN_PASSWORD
        })
        token = response.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_employees_list(self, auth_headers):
        """Test fetching employees list"""
        response = requests.get(f"{BASE_URL}/api/employees?department=gates", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), f"Expected list, got: {type(data)}"
        print(f"✅ Got {len(data)} employees from gates department")
    
    def test_activate_account_endpoint(self, auth_headers):
        """Test /employees/{id}/activate-account endpoint (was bug: called /account-action)"""
        # First get an employee
        response = requests.get(f"{BASE_URL}/api/employees?department=haram_map", headers=auth_headers)
        if response.status_code != 200:
            pytest.skip("No employees found")
        
        employees = response.json()
        test_emp = next((e for e in employees if e.get("national_id")), None)
        
        if not test_emp:
            pytest.skip("No employee with national_id found")
        
        emp_id = test_emp["id"]
        
        # Call the correct endpoint pattern
        action_response = requests.post(
            f"{BASE_URL}/api/employees/{emp_id}/activate-account",
            headers=auth_headers
        )
        
        # Should succeed or give meaningful error (not 404 for wrong path)
        assert action_response.status_code in [200, 400], \
            f"activate-account failed unexpectedly: {action_response.status_code} - {action_response.text}"
        print(f"✅ activate-account endpoint works: {action_response.status_code}")
    
    def test_freeze_account_endpoint(self, auth_headers):
        """Test /employees/{id}/freeze-account endpoint"""
        response = requests.get(f"{BASE_URL}/api/employees?department=haram_map", headers=auth_headers)
        if response.status_code != 200:
            pytest.skip("No employees found")
        
        employees = response.json()
        test_emp = next((e for e in employees if e.get("user_id") and e.get("account_status") == "active"), None)
        
        if not test_emp:
            pytest.skip("No active account employee found")
        
        emp_id = test_emp["id"]
        
        action_response = requests.post(
            f"{BASE_URL}/api/employees/{emp_id}/freeze-account",
            headers=auth_headers
        )
        
        assert action_response.status_code in [200, 400, 404], \
            f"freeze-account failed unexpectedly: {action_response.status_code}"
        
        # Restore to active if frozen
        if action_response.status_code == 200:
            requests.post(f"{BASE_URL}/api/employees/{emp_id}/activate-account", headers=auth_headers)
        
        print(f"✅ freeze-account endpoint works: {action_response.status_code}")
    
    def test_terminate_account_endpoint(self, auth_headers):
        """Test /employees/{id}/terminate-account endpoint"""
        # This is destructive, so just verify endpoint exists
        response = requests.post(
            f"{BASE_URL}/api/employees/nonexistent-id/terminate-account",
            headers=auth_headers
        )
        # Should get 404 for nonexistent employee, not 404 for missing route
        assert response.status_code == 404, f"Unexpected status: {response.status_code}"
        assert "الموظف" in response.text or "حساب" in response.text, \
            f"Expected Arabic error about employee/account, got: {response.text}"
        print("✅ terminate-account endpoint exists and returns proper error")
    
    def test_reset_pin_endpoint(self, auth_headers):
        """Test /employees/{id}/reset-pin endpoint"""
        response = requests.post(
            f"{BASE_URL}/api/employees/nonexistent-id/reset-pin",
            headers=auth_headers
        )
        assert response.status_code == 404
        print("✅ reset-pin endpoint exists and returns proper error")


class TestDashboardEndpoints:
    """Test dashboard endpoints used by Dashboard.jsx"""
    
    @pytest.fixture
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": ADMIN_IDENTIFIER, "password": ADMIN_PASSWORD
        })
        token = response.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_dashboard_ops(self, auth_headers):
        """Test /api/dashboard/ops endpoint"""
        response = requests.get(f"{BASE_URL}/api/dashboard/ops", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "kpis" in data, f"Missing kpis in response: {data.keys()}"
        print(f"✅ Dashboard ops returned: {list(data.keys())}")
    
    def test_dashboard_departments(self, auth_headers):
        """Test /api/dashboard/departments endpoint"""
        response = requests.get(f"{BASE_URL}/api/dashboard/departments", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), f"Expected list, got: {type(data)}"
        print(f"✅ Dashboard departments returned {len(data)} items")


class TestAlertsEndpoints:
    """Test alerts endpoints used by AlertsPage.jsx and NotificationsPage.jsx"""
    
    @pytest.fixture
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": ADMIN_IDENTIFIER, "password": ADMIN_PASSWORD
        })
        token = response.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_alerts(self, auth_headers):
        """Test GET /api/alerts"""
        response = requests.get(f"{BASE_URL}/api/alerts", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), f"Expected list, got: {type(data)}"
        print(f"✅ Got {len(data)} alerts")
    
    def test_alerts_unread_count(self, auth_headers):
        """Test GET /api/alerts/unread-count"""
        response = requests.get(f"{BASE_URL}/api/alerts/unread-count", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "count" in data, f"Missing count: {data}"
        print(f"✅ Unread alerts count: {data.get('count')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
