"""
Test Daily Map Sessions API endpoints
Tests for the Al-Haram OS Daily Sessions feature
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials
ADMIN_EMAIL = "admin@crowd.sa"
ADMIN_PASSWORD = "admin123"

# Test floor ID (Basement floor with zones)
TEST_FLOOR_ID = "89139223-68c6-4686-b2cc-18a2d26bfe31"


@pytest.fixture(scope="module")
def auth_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get authorization headers"""
    return {"Authorization": f"Bearer {auth_token}"}


@pytest.fixture(scope="module")
def test_session_date():
    """Generate unique date for test session"""
    # Use future date to avoid conflicts
    future_date = datetime.now() + timedelta(days=365)
    return future_date.strftime("%Y-%m-%d")


class TestMapSessionsEndpoints:
    """Test map sessions CRUD operations"""
    
    created_session_id = None
    
    # --------------------------------------------------
    # GET /api/map-sessions - List sessions
    # --------------------------------------------------
    def test_get_sessions_list(self, auth_headers):
        """Test: GET /api/map-sessions returns sessions list"""
        response = requests.get(f"{BASE_URL}/api/map-sessions")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET /api/map-sessions - Found {len(data)} sessions")
    
    def test_get_sessions_filtered_by_floor(self, auth_headers):
        """Test: GET /api/map-sessions with floor_id filter"""
        response = requests.get(f"{BASE_URL}/api/map-sessions?floor_id={TEST_FLOOR_ID}")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        for session in data:
            assert session.get("floor_id") == TEST_FLOOR_ID, f"Session floor_id mismatch"
        print(f"✓ GET /api/map-sessions?floor_id=... - Found {len(data)} sessions for floor")
    
    # --------------------------------------------------
    # POST /api/admin/map-sessions - Create session
    # --------------------------------------------------
    def test_create_session(self, auth_headers, test_session_date):
        """Test: POST /api/admin/map-sessions creates a new session"""
        payload = {
            "date": test_session_date,
            "floor_id": TEST_FLOOR_ID,
            "clone_from": "master"
        }
        response = requests.post(
            f"{BASE_URL}/api/admin/map-sessions",
            json=payload,
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to create session: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should have id"
        assert data.get("date") == test_session_date, "Date mismatch"
        assert data.get("floor_id") == TEST_FLOOR_ID, "Floor ID mismatch"
        assert data.get("status") == "draft", "Initial status should be draft"
        assert "zones" in data, "Session should have zones array"
        assert isinstance(data.get("zones"), list), "Zones should be a list"
        assert "changes_summary" in data, "Session should have changes_summary"
        
        TestMapSessionsEndpoints.created_session_id = data["id"]
        print(f"✓ POST /api/admin/map-sessions - Created session {data['id']} with {len(data['zones'])} zones")
    
    def test_create_duplicate_session_fails(self, auth_headers, test_session_date):
        """Test: Creating duplicate session for same date+floor fails"""
        payload = {
            "date": test_session_date,
            "floor_id": TEST_FLOOR_ID,
            "clone_from": "master"
        }
        response = requests.post(
            f"{BASE_URL}/api/admin/map-sessions",
            json=payload,
            headers=auth_headers
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ POST /api/admin/map-sessions - Duplicate session correctly rejected")
    
    # --------------------------------------------------
    # GET /api/map-sessions/{id} - Get single session
    # --------------------------------------------------
    def test_get_single_session(self, auth_headers):
        """Test: GET /api/map-sessions/{id} returns session details"""
        assert TestMapSessionsEndpoints.created_session_id, "No session created"
        
        response = requests.get(
            f"{BASE_URL}/api/map-sessions/{TestMapSessionsEndpoints.created_session_id}"
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data.get("id") == TestMapSessionsEndpoints.created_session_id
        assert "zones" in data
        assert "changes_summary" in data
        print(f"✓ GET /api/map-sessions/{data['id']} - Retrieved session with {len(data.get('zones', []))} zones")
    
    def test_get_nonexistent_session(self):
        """Test: GET /api/map-sessions/{invalid_id} returns 404"""
        response = requests.get(f"{BASE_URL}/api/map-sessions/invalid-id-12345")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ GET /api/map-sessions/{invalid_id} - Correctly returns 404")
    
    # --------------------------------------------------
    # PUT /api/admin/map-sessions/{id} - Update session
    # --------------------------------------------------
    def test_update_session_status(self, auth_headers):
        """Test: PUT /api/admin/map-sessions/{id} updates session status"""
        assert TestMapSessionsEndpoints.created_session_id, "No session created"
        
        # Complete the session
        payload = {"status": "completed"}
        response = requests.put(
            f"{BASE_URL}/api/admin/map-sessions/{TestMapSessionsEndpoints.created_session_id}",
            json=payload,
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data.get("status") == "completed", "Status should be updated to completed"
        print("✓ PUT /api/admin/map-sessions/{id} - Status updated to completed")
    
    def test_update_session_notes(self, auth_headers):
        """Test: PUT /api/admin/map-sessions/{id} updates supervisor notes"""
        assert TestMapSessionsEndpoints.created_session_id, "No session created"
        
        test_note = "ملاحظة اختبار من المشرف"
        payload = {"supervisor_notes": test_note}
        response = requests.put(
            f"{BASE_URL}/api/admin/map-sessions/{TestMapSessionsEndpoints.created_session_id}",
            json=payload,
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data.get("supervisor_notes") == test_note, "Notes not updated"
        print("✓ PUT /api/admin/map-sessions/{id} - Supervisor notes updated")
    
    def test_reopen_completed_session(self, auth_headers):
        """Test: PUT /api/admin/map-sessions/{id} can reopen session"""
        assert TestMapSessionsEndpoints.created_session_id, "No session created"
        
        payload = {"status": "draft"}
        response = requests.put(
            f"{BASE_URL}/api/admin/map-sessions/{TestMapSessionsEndpoints.created_session_id}",
            json=payload,
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data.get("status") == "draft", "Status should be updated to draft"
        print("✓ PUT /api/admin/map-sessions/{id} - Session reopened to draft")


class TestSessionZoneOperations:
    """Test zone operations within sessions"""
    
    test_zone_id = None
    
    def test_update_zone_category(self, auth_headers):
        """Test: PUT /api/admin/map-sessions/{id}/zones/{zone_id} updates zone category"""
        session_id = TestMapSessionsEndpoints.created_session_id
        assert session_id, "No session created"
        
        # Get session to find a zone
        response = requests.get(f"{BASE_URL}/api/map-sessions/{session_id}")
        assert response.status_code == 200
        
        session = response.json()
        zones = session.get("zones", [])
        if not zones:
            pytest.skip("No zones in session to test")
        
        test_zone = zones[0]
        TestSessionZoneOperations.test_zone_id = test_zone["id"]
        
        # Update zone category
        payload = {"zone_type": "women_prayer"}
        response = requests.put(
            f"{BASE_URL}/api/admin/map-sessions/{session_id}/zones/{test_zone['id']}",
            json=payload,
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        # Find the updated zone
        updated_zone = next((z for z in data.get("zones", []) if z["id"] == test_zone["id"]), None)
        assert updated_zone, "Zone not found in response"
        assert updated_zone.get("zone_type") == "women_prayer", "Zone type not updated"
        assert updated_zone.get("change_type") == "category_changed", "Change type should be category_changed"
        print("✓ PUT /api/admin/map-sessions/{id}/zones/{zone_id} - Zone category updated")
    
    def test_update_zone_daily_note(self, auth_headers):
        """Test: PUT /api/admin/map-sessions/{id}/zones/{zone_id} adds daily note"""
        session_id = TestMapSessionsEndpoints.created_session_id
        zone_id = TestSessionZoneOperations.test_zone_id
        assert session_id and zone_id, "No session/zone to test"
        
        test_note = "ملاحظة يومية للمنطقة - اختبار"
        payload = {"daily_note": test_note}
        response = requests.put(
            f"{BASE_URL}/api/admin/map-sessions/{session_id}/zones/{zone_id}",
            json=payload,
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        updated_zone = next((z for z in data.get("zones", []) if z["id"] == zone_id), None)
        assert updated_zone, "Zone not found"
        assert updated_zone.get("daily_note") == test_note, "Daily note not updated"
        print("✓ PUT /api/admin/map-sessions/{id}/zones/{zone_id} - Daily note added")
    
    def test_remove_zone(self, auth_headers):
        """Test: PUT /api/admin/map-sessions/{id}/zones/{zone_id} marks zone as removed"""
        session_id = TestMapSessionsEndpoints.created_session_id
        zone_id = TestSessionZoneOperations.test_zone_id
        assert session_id and zone_id, "No session/zone to test"
        
        payload = {"is_removed": True}
        response = requests.put(
            f"{BASE_URL}/api/admin/map-sessions/{session_id}/zones/{zone_id}",
            json=payload,
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        removed_zone = next((z for z in data.get("zones", []) if z["id"] == zone_id), None)
        assert removed_zone, "Zone not found"
        assert removed_zone.get("is_removed") == True, "Zone should be marked as removed"
        assert removed_zone.get("change_type") == "removed", "Change type should be removed"
        
        # Verify changes_summary updated
        summary = data.get("changes_summary", {})
        assert summary.get("removed", 0) >= 1, "Removed count should be at least 1"
        print("✓ PUT /api/admin/map-sessions/{id}/zones/{zone_id} - Zone marked as removed")
    
    def test_restore_zone(self, auth_headers):
        """Test: PUT /api/admin/map-sessions/{id}/zones/{zone_id} restores removed zone"""
        session_id = TestMapSessionsEndpoints.created_session_id
        zone_id = TestSessionZoneOperations.test_zone_id
        assert session_id and zone_id, "No session/zone to test"
        
        payload = {"is_removed": False}
        response = requests.put(
            f"{BASE_URL}/api/admin/map-sessions/{session_id}/zones/{zone_id}",
            json=payload,
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        restored_zone = next((z for z in data.get("zones", []) if z["id"] == zone_id), None)
        assert restored_zone, "Zone not found"
        assert restored_zone.get("is_removed") == False, "Zone should be restored"
        print("✓ PUT /api/admin/map-sessions/{id}/zones/{zone_id} - Zone restored")


class TestSessionComparison:
    """Test session comparison functionality"""
    
    second_session_id = None
    
    def test_create_second_session(self, auth_headers):
        """Create a second session for comparison"""
        # Use a different date
        second_date = (datetime.now() + timedelta(days=366)).strftime("%Y-%m-%d")
        
        payload = {
            "date": second_date,
            "floor_id": TEST_FLOOR_ID,
            "clone_from": TestMapSessionsEndpoints.created_session_id
        }
        response = requests.post(
            f"{BASE_URL}/api/admin/map-sessions",
            json=payload,
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        TestSessionComparison.second_session_id = data["id"]
        print(f"✓ Created second session {data['id']} for comparison test")
    
    def test_compare_sessions(self, auth_headers):
        """Test: GET /api/map-sessions/compare/{id1}/{id2} compares two sessions"""
        session1 = TestMapSessionsEndpoints.created_session_id
        session2 = TestSessionComparison.second_session_id
        assert session1 and session2, "Need two sessions to compare"
        
        response = requests.get(
            f"{BASE_URL}/api/map-sessions/compare/{session1}/{session2}"
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "added" in data, "Response should have 'added' field"
        assert "removed" in data, "Response should have 'removed' field"
        assert "modified" in data, "Response should have 'modified' field"
        assert "unchanged_count" in data, "Response should have 'unchanged_count' field"
        assert isinstance(data["added"], list), "'added' should be a list"
        assert isinstance(data["removed"], list), "'removed' should be a list"
        assert "session_1" in data, "Response should have session_1 info"
        assert "session_2" in data, "Response should have session_2 info"
        print(f"✓ GET /api/map-sessions/compare - Added: {len(data['added'])}, Removed: {len(data['removed'])}, Modified: {len(data['modified'])}, Unchanged: {data['unchanged_count']}")


class TestSessionCleanup:
    """Cleanup test sessions"""
    
    def test_delete_second_session(self, auth_headers):
        """Test: DELETE /api/admin/map-sessions/{id} deletes second session"""
        session_id = TestSessionComparison.second_session_id
        if not session_id:
            pytest.skip("No second session to delete")
        
        response = requests.delete(
            f"{BASE_URL}/api/admin/map-sessions/{session_id}",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        # Verify deletion
        verify = requests.get(f"{BASE_URL}/api/map-sessions/{session_id}")
        assert verify.status_code == 404, "Session should be deleted"
        print("✓ DELETE /api/admin/map-sessions/{id} - Second session deleted")
    
    def test_delete_first_session(self, auth_headers):
        """Test: DELETE /api/admin/map-sessions/{id} deletes first session"""
        session_id = TestMapSessionsEndpoints.created_session_id
        if not session_id:
            pytest.skip("No session to delete")
        
        response = requests.delete(
            f"{BASE_URL}/api/admin/map-sessions/{session_id}",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        # Verify deletion
        verify = requests.get(f"{BASE_URL}/api/map-sessions/{session_id}")
        assert verify.status_code == 404, "Session should be deleted"
        print("✓ DELETE /api/admin/map-sessions/{id} - First session deleted")


class TestFloorsEndpoint:
    """Test floors endpoint for dropdown"""
    
    def test_get_floors(self):
        """Test: GET /api/floors returns floors list"""
        response = requests.get(f"{BASE_URL}/api/floors")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) > 0, "Should have at least one floor"
        
        # Verify floor structure
        floor = data[0]
        assert "id" in floor, "Floor should have id"
        assert "name_ar" in floor, "Floor should have name_ar"
        print(f"✓ GET /api/floors - Found {len(data)} floors")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
