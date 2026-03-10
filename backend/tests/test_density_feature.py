"""
Test: Density Tab Feature - Iteration 16
Tests the density batch update API and related functionality
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
TEST_EMAIL = "admin@crowd.sa"
TEST_PASSWORD = "admin123"

# Session and zone IDs from existing data
SESSION_ID_FEB17 = "0a5aa22d-eb43-4967-8ca2-d08ad7077454"
ZONE_ID = "c384d6ba-dc68-4cdb-935a-6dfcdbe4b3ca"

class TestAuth:
    """Authentication tests"""
    
    def test_login_success(self):
        """Test admin login works"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        assert data["user"]["role"] == "system_admin", "Not admin role"


@pytest.fixture
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Authentication failed")


@pytest.fixture
def authenticated_client(auth_token):
    """Session with auth header"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


class TestMapSessionsAPI:
    """Map Sessions API tests"""
    
    def test_get_sessions_list(self, authenticated_client):
        """Test fetching all sessions"""
        response = authenticated_client.get(f"{BASE_URL}/api/map-sessions")
        assert response.status_code == 200, f"Failed: {response.text}"
        sessions = response.json()
        assert isinstance(sessions, list), "Response should be a list"
        assert len(sessions) > 0, "Should have at least one session"
    
    def test_get_session_feb17(self, authenticated_client):
        """Test fetching Feb 17 session"""
        response = authenticated_client.get(f"{BASE_URL}/api/map-sessions/{SESSION_ID_FEB17}")
        assert response.status_code == 200, f"Failed: {response.text}"
        session = response.json()
        assert session["id"] == SESSION_ID_FEB17, "Session ID mismatch"
        assert session["date"] == "2026-02-17", "Date should be Feb 17"
        assert len(session["zones"]) >= 1, "Should have at least 1 zone"


class TestDensityBatchAPI:
    """Density Batch Update API tests (PUT /api/admin/map-sessions/{id}/density-batch)"""
    
    def test_update_zone_current_count(self, authenticated_client):
        """Test updating current_count for a zone"""
        # Test with current_count = 600
        response = authenticated_client.put(
            f"{BASE_URL}/api/admin/map-sessions/{SESSION_ID_FEB17}/density-batch",
            json={
                "updates": [
                    {"zone_id": ZONE_ID, "current_count": 600}
                ]
            }
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify the zone's current_count was updated
        zone = next((z for z in data["zones"] if z["id"] == ZONE_ID), None)
        assert zone is not None, "Zone not found in response"
        assert zone["current_count"] == 600, f"current_count not updated: {zone.get('current_count')}"
    
    def test_update_zone_max_capacity(self, authenticated_client):
        """Test updating max_capacity for a zone"""
        response = authenticated_client.put(
            f"{BASE_URL}/api/admin/map-sessions/{SESSION_ID_FEB17}/density-batch",
            json={
                "updates": [
                    {"zone_id": ZONE_ID, "max_capacity": 1500}
                ]
            }
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        zone = next((z for z in data["zones"] if z["id"] == ZONE_ID), None)
        assert zone is not None, "Zone not found"
        assert zone["max_capacity"] == 1500, f"max_capacity not updated: {zone.get('max_capacity')}"
    
    def test_update_both_current_and_capacity(self, authenticated_client):
        """Test updating both current_count and max_capacity together"""
        response = authenticated_client.put(
            f"{BASE_URL}/api/admin/map-sessions/{SESSION_ID_FEB17}/density-batch",
            json={
                "updates": [
                    {"zone_id": ZONE_ID, "current_count": 450, "max_capacity": 1200}
                ]
            }
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        zone = next((z for z in data["zones"] if z["id"] == ZONE_ID), None)
        assert zone["current_count"] == 450, "current_count mismatch"
        assert zone["max_capacity"] == 1200, "max_capacity mismatch"
    
    def test_update_zero_current_count(self, authenticated_client):
        """Test setting current_count to 0 (low density scenario)"""
        response = authenticated_client.put(
            f"{BASE_URL}/api/admin/map-sessions/{SESSION_ID_FEB17}/density-batch",
            json={
                "updates": [
                    {"zone_id": ZONE_ID, "current_count": 0}
                ]
            }
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        zone = next((z for z in response.json()["zones"] if z["id"] == ZONE_ID), None)
        assert zone["current_count"] == 0, "Should allow 0 current_count"
    
    def test_update_high_density_critical(self, authenticated_client):
        """Test setting density to critical level (>90%)"""
        # First set max_capacity
        authenticated_client.put(
            f"{BASE_URL}/api/admin/map-sessions/{SESSION_ID_FEB17}/density-batch",
            json={"updates": [{"zone_id": ZONE_ID, "max_capacity": 1000}]}
        )
        # Then set high current_count
        response = authenticated_client.put(
            f"{BASE_URL}/api/admin/map-sessions/{SESSION_ID_FEB17}/density-batch",
            json={"updates": [{"zone_id": ZONE_ID, "current_count": 950}]}
        )
        assert response.status_code == 200
        zone = next((z for z in response.json()["zones"] if z["id"] == ZONE_ID), None)
        assert zone["current_count"] == 950
        # Utilization = 950/1000 = 95% -> Critical
    
    def test_update_empty_updates_array(self, authenticated_client):
        """Test with empty updates array - should not fail"""
        response = authenticated_client.put(
            f"{BASE_URL}/api/admin/map-sessions/{SESSION_ID_FEB17}/density-batch",
            json={"updates": []}
        )
        # Should still return 200 with unchanged data
        assert response.status_code == 200
    
    def test_update_invalid_zone_id(self, authenticated_client):
        """Test with non-existent zone_id - should not fail, just ignore"""
        response = authenticated_client.put(
            f"{BASE_URL}/api/admin/map-sessions/{SESSION_ID_FEB17}/density-batch",
            json={
                "updates": [
                    {"zone_id": "non-existent-zone-id", "current_count": 500}
                ]
            }
        )
        # Should return 200, just ignores the invalid zone
        assert response.status_code == 200
    
    def test_update_negative_current_count_coerced_to_zero(self, authenticated_client):
        """Test negative current_count is coerced to 0"""
        response = authenticated_client.put(
            f"{BASE_URL}/api/admin/map-sessions/{SESSION_ID_FEB17}/density-batch",
            json={
                "updates": [
                    {"zone_id": ZONE_ID, "current_count": -100}
                ]
            }
        )
        assert response.status_code == 200
        zone = next((z for z in response.json()["zones"] if z["id"] == ZONE_ID), None)
        assert zone["current_count"] == 0, "Negative should be coerced to 0"
    
    def test_update_invalid_session_id(self, authenticated_client):
        """Test with non-existent session_id"""
        response = authenticated_client.put(
            f"{BASE_URL}/api/admin/map-sessions/invalid-session-id/density-batch",
            json={"updates": [{"zone_id": ZONE_ID, "current_count": 500}]}
        )
        assert response.status_code == 404, "Should return 404 for invalid session"
    
    def test_data_persistence_after_update(self, authenticated_client):
        """Verify data persists after update (Create -> GET verification)"""
        # Update density
        authenticated_client.put(
            f"{BASE_URL}/api/admin/map-sessions/{SESSION_ID_FEB17}/density-batch",
            json={"updates": [{"zone_id": ZONE_ID, "current_count": 777, "max_capacity": 1111}]}
        )
        
        # GET to verify persistence
        response = authenticated_client.get(f"{BASE_URL}/api/map-sessions/{SESSION_ID_FEB17}")
        assert response.status_code == 200
        
        session = response.json()
        zone = next((z for z in session["zones"] if z["id"] == ZONE_ID), None)
        assert zone["current_count"] == 777, "current_count not persisted"
        assert zone["max_capacity"] == 1111, "max_capacity not persisted"


class TestCleanup:
    """Reset test data to clean state"""
    
    def test_reset_zone_to_default(self, authenticated_client):
        """Reset zone values for clean state"""
        response = authenticated_client.put(
            f"{BASE_URL}/api/admin/map-sessions/{SESSION_ID_FEB17}/density-batch",
            json={
                "updates": [
                    {"zone_id": ZONE_ID, "current_count": 0, "max_capacity": 1000}
                ]
            }
        )
        assert response.status_code == 200
        print("Reset zone to default values: current_count=0, max_capacity=1000")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
