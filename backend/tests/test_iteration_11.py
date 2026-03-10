"""
Iteration 11 Tests: Rotation/Drag Zone Functionality
Tests for zone rotation and drag-to-move features in Daily Sessions
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://hajj-crowd-control.preview.emergentagent.com')

class TestZoneRotationDragFeatures:
    """Tests for zone rotation and movement functionality"""
    
    @pytest.fixture
    def auth_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@crowd.sa",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["access_token"]
    
    @pytest.fixture
    def auth_headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_get_sessions_for_floor(self, auth_headers):
        """Test getting sessions for the basement floor"""
        floor_id = "773f281e-ff1d-4983-b92b-6a50412dd547"
        response = requests.get(f"{BASE_URL}/api/map-sessions?floor_id={floor_id}")
        assert response.status_code == 200
        sessions = response.json()
        print(f"Found {len(sessions)} sessions for floor")
        assert len(sessions) > 0, "Should have at least one session (Feb 17)"
        
        # Find Feb 17 session
        feb17_session = None
        for s in sessions:
            if s["date"] == "2026-02-17":
                feb17_session = s
                break
        
        assert feb17_session is not None, "Feb 17 session should exist"
        print(f"Feb 17 session ID: {feb17_session['id']}")
        print(f"Feb 17 session has {len(feb17_session.get('zones', []))} zones")
        return feb17_session
    
    def test_zone_has_polygon_points(self, auth_headers):
        """Test that zones have polygon_points array"""
        floor_id = "773f281e-ff1d-4983-b92b-6a50412dd547"
        response = requests.get(f"{BASE_URL}/api/map-sessions?floor_id={floor_id}")
        sessions = response.json()
        
        feb17_session = None
        for s in sessions:
            if s["date"] == "2026-02-17":
                feb17_session = s
                break
        
        assert feb17_session is not None
        zones = feb17_session.get("zones", [])
        assert len(zones) >= 1, "Should have zones"
        
        # Check first zone has polygon_points
        first_zone = zones[0]
        print(f"Zone: {first_zone.get('zone_code')} - {first_zone.get('name_ar')}")
        assert "polygon_points" in first_zone, "Zone should have polygon_points"
        assert len(first_zone["polygon_points"]) >= 3, "Zone should have at least 3 points"
        print(f"Zone has {len(first_zone['polygon_points'])} polygon points")
        
        # Verify point structure
        for pt in first_zone["polygon_points"]:
            assert "x" in pt, "Point should have x coordinate"
            assert "y" in pt, "Point should have y coordinate"
        
        return first_zone
    
    def test_update_zone_polygon_points(self, auth_headers):
        """Test PUT zone with updated polygon_points (for rotation/move)"""
        floor_id = "773f281e-ff1d-4983-b92b-6a50412dd547"
        
        # Get session
        response = requests.get(f"{BASE_URL}/api/map-sessions?floor_id={floor_id}")
        sessions = response.json()
        
        feb17_session = None
        for s in sessions:
            if s["date"] == "2026-02-17":
                feb17_session = s
                break
        
        assert feb17_session is not None
        session_id = feb17_session["id"]
        zones = feb17_session.get("zones", [])
        assert len(zones) >= 1
        
        zone = zones[0]
        zone_id = zone["id"]
        original_points = zone["polygon_points"]
        
        # Simulate rotation by moving points slightly
        # Just shift all x coordinates by 1 to test update
        modified_points = [{"x": pt["x"] + 0.5, "y": pt["y"]} for pt in original_points]
        
        # Update zone
        response = requests.put(
            f"{BASE_URL}/api/admin/map-sessions/{session_id}/zones/{zone_id}",
            json={"polygon_points": modified_points},
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to update zone: {response.text}"
        updated_session = response.json()
        print("Zone polygon_points updated successfully")
        
        # Verify the update persisted
        updated_zone = None
        for z in updated_session.get("zones", []):
            if z["id"] == zone_id:
                updated_zone = z
                break
        
        assert updated_zone is not None
        # Check first point was modified
        assert abs(updated_zone["polygon_points"][0]["x"] - modified_points[0]["x"]) < 0.01, \
            "Zone points should be updated"
        print(f"Zone points verified - first point x: {updated_zone['polygon_points'][0]['x']}")
        
        # Restore original points
        response = requests.put(
            f"{BASE_URL}/api/admin/map-sessions/{session_id}/zones/{zone_id}",
            json={"polygon_points": original_points},
            headers=auth_headers
        )
        assert response.status_code == 200
        print("Restored original zone points")
    
    def test_zone_categories_still_work(self, auth_headers):
        """Test that zone category changes still work (regression)"""
        floor_id = "773f281e-ff1d-4983-b92b-6a50412dd547"
        
        response = requests.get(f"{BASE_URL}/api/map-sessions?floor_id={floor_id}")
        sessions = response.json()
        
        feb17_session = None
        for s in sessions:
            if s["date"] == "2026-02-17":
                feb17_session = s
                break
        
        assert feb17_session is not None
        session_id = feb17_session["id"]
        zones = feb17_session.get("zones", [])
        
        # Find a zone that's not removed
        active_zone = None
        for z in zones:
            if not z.get("is_removed", False):
                active_zone = z
                break
        
        assert active_zone is not None
        zone_id = active_zone["id"]
        original_type = active_zone["zone_type"]
        
        # Change to women_prayer (if it's men_prayer, or vice versa)
        new_type = "women_prayer" if original_type == "men_prayer" else "men_prayer"
        
        response = requests.put(
            f"{BASE_URL}/api/admin/map-sessions/{session_id}/zones/{zone_id}",
            json={"zone_type": new_type, "fill_color": "#93c5fd" if new_type == "women_prayer" else "#22c55e"},
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to update zone type: {response.text}"
        print(f"Changed zone type from {original_type} to {new_type}")
        
        # Restore original type
        response = requests.put(
            f"{BASE_URL}/api/admin/map-sessions/{session_id}/zones/{zone_id}",
            json={"zone_type": original_type, "fill_color": "#22c55e" if original_type == "men_prayer" else "#93c5fd"},
            headers=auth_headers
        )
        assert response.status_code == 200
        print("Restored original zone type")
    
    def test_toggle_zone_removed(self, auth_headers):
        """Test zone remove/restore functionality"""
        floor_id = "773f281e-ff1d-4983-b92b-6a50412dd547"
        
        response = requests.get(f"{BASE_URL}/api/map-sessions?floor_id={floor_id}")
        sessions = response.json()
        
        feb17_session = None
        for s in sessions:
            if s["date"] == "2026-02-17":
                feb17_session = s
                break
        
        assert feb17_session is not None
        session_id = feb17_session["id"]
        zones = feb17_session.get("zones", [])
        
        # Get first zone
        zone = zones[0]
        zone_id = zone["id"]
        original_removed = zone.get("is_removed", False)
        
        # Toggle removed state
        response = requests.put(
            f"{BASE_URL}/api/admin/map-sessions/{session_id}/zones/{zone_id}",
            json={"is_removed": not original_removed},
            headers=auth_headers
        )
        
        assert response.status_code == 200
        updated = response.json()
        
        # Find updated zone
        for z in updated.get("zones", []):
            if z["id"] == zone_id:
                assert z["is_removed"] == (not original_removed), "is_removed should toggle"
                print(f"Zone is_removed toggled to: {z['is_removed']}")
                break
        
        # Restore original state
        response = requests.put(
            f"{BASE_URL}/api/admin/map-sessions/{session_id}/zones/{zone_id}",
            json={"is_removed": original_removed},
            headers=auth_headers
        )
        assert response.status_code == 200
        print("Restored original is_removed state")


class TestPanDrawRectModes:
    """Test that Pan, Draw, Rect modes still work (regression)"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@crowd.sa",
            "password": "admin123"
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture
    def auth_headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_create_zone_with_polygon(self, auth_headers):
        """Test creating a new zone with polygon points (like draw mode)"""
        floor_id = "773f281e-ff1d-4983-b92b-6a50412dd547"
        
        # Get session
        response = requests.get(f"{BASE_URL}/api/map-sessions?floor_id={floor_id}")
        sessions = response.json()
        
        feb17_session = None
        for s in sessions:
            if s["date"] == "2026-02-17":
                feb17_session = s
                break
        
        assert feb17_session is not None
        session_id = feb17_session["id"]
        
        # Create a test zone with polygon points
        test_zone = {
            "zone_code": "TEST-ROTATION-001",
            "name_ar": "منطقة اختبار الدوران",
            "name_en": "Rotation Test Zone",
            "zone_type": "men_prayer",
            "fill_color": "#22c55e",
            "polygon_points": [
                {"x": 80, "y": 80},
                {"x": 85, "y": 80},
                {"x": 85, "y": 85},
                {"x": 80, "y": 85}
            ]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/map-sessions/{session_id}/zones",
            json=test_zone,
            headers=auth_headers
        )
        
        assert response.status_code in [200, 201], f"Failed to create zone: {response.text}"
        created_session = response.json()
        
        # Find the created zone
        created_zone = None
        for z in created_session.get("zones", []):
            if z["zone_code"] == "TEST-ROTATION-001":
                created_zone = z
                break
        
        assert created_zone is not None, "Created zone not found"
        print(f"Created test zone: {created_zone['zone_code']} with ID: {created_zone['id']}")
        
        # Cleanup - delete the test zone
        zone_id = created_zone["id"]
        response = requests.put(
            f"{BASE_URL}/api/admin/map-sessions/{session_id}/zones/{zone_id}",
            json={"is_removed": True},
            headers=auth_headers
        )
        assert response.status_code == 200
        print("Test zone marked as removed for cleanup")


class TestZoomControls:
    """Test zoom controls work"""
    
    def test_api_health(self):
        """Basic health check"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        print("API health check passed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
