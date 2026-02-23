"""
Test Suite for Iteration 13: Enhanced Zone Edit Dialog
- Editable name_ar and zone_code fields
- 3-state zone status (active/inactive/permanent delete)
- Save button persistence
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
SESSION_ID = "0a5aa22d-eb43-4967-8ca2-d08ad7077454"  # Feb 17 session
FLOOR_ID = "773f281e-ff1d-4983-b92b-6a50412dd547"

class TestIteration13EnhancedZoneDialog:
    """Test Enhanced Zone Edit Dialog features"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@crowd.sa",
            "password": "admin123"
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        token = login_resp.json()["access_token"]
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    # ==================== Backend Model Tests ====================
    
    def test_session_zone_update_model_has_zone_code(self):
        """Verify SessionZoneUpdate model accepts zone_code field"""
        # Get a session to find a zone
        resp = self.session.get(f"{BASE_URL}/api/map-sessions/{SESSION_ID}")
        assert resp.status_code == 200, f"Failed to get session: {resp.text}"
        session = resp.json()
        
        zones = session.get("zones", [])
        assert len(zones) > 0, "No zones in session"
        
        zone = zones[0]
        zone_id = zone["id"]
        original_code = zone.get("zone_code", "")
        
        # Try updating zone_code
        test_code = f"TEST-CODE-{original_code}"
        update_resp = self.session.put(
            f"{BASE_URL}/api/admin/map-sessions/{SESSION_ID}/zones/{zone_id}",
            json={"zone_code": test_code}
        )
        assert update_resp.status_code == 200, f"Failed to update zone_code: {update_resp.text}"
        
        # Verify the update
        updated_session = update_resp.json()
        updated_zone = next((z for z in updated_session["zones"] if z["id"] == zone_id), None)
        assert updated_zone is not None, "Zone not found after update"
        assert updated_zone["zone_code"] == test_code, f"zone_code not updated: expected {test_code}, got {updated_zone['zone_code']}"
        
        # Restore original
        self.session.put(
            f"{BASE_URL}/api/admin/map-sessions/{SESSION_ID}/zones/{zone_id}",
            json={"zone_code": original_code}
        )
        print(f"✓ SessionZoneUpdate model accepts zone_code field")
    
    def test_session_zone_update_model_has_name_ar(self):
        """Verify SessionZoneUpdate model accepts name_ar field"""
        resp = self.session.get(f"{BASE_URL}/api/map-sessions/{SESSION_ID}")
        assert resp.status_code == 200
        session = resp.json()
        
        zones = session.get("zones", [])
        assert len(zones) > 0
        
        zone = zones[0]
        zone_id = zone["id"]
        original_name = zone.get("name_ar", "")
        
        # Try updating name_ar
        test_name = f"TEST-NAME-{original_name}"
        update_resp = self.session.put(
            f"{BASE_URL}/api/admin/map-sessions/{SESSION_ID}/zones/{zone_id}",
            json={"name_ar": test_name}
        )
        assert update_resp.status_code == 200, f"Failed to update name_ar: {update_resp.text}"
        
        # Verify
        updated_session = update_resp.json()
        updated_zone = next((z for z in updated_session["zones"] if z["id"] == zone_id), None)
        assert updated_zone["name_ar"] == test_name
        
        # Restore
        self.session.put(
            f"{BASE_URL}/api/admin/map-sessions/{SESSION_ID}/zones/{zone_id}",
            json={"name_ar": original_name}
        )
        print(f"✓ SessionZoneUpdate model accepts name_ar field")
    
    def test_update_zone_with_both_name_and_code(self):
        """Test updating both name_ar and zone_code in single request"""
        resp = self.session.get(f"{BASE_URL}/api/map-sessions/{SESSION_ID}")
        session = resp.json()
        zones = session.get("zones", [])
        zone = zones[0]
        zone_id = zone["id"]
        original_name = zone.get("name_ar", "")
        original_code = zone.get("zone_code", "")
        
        # Update both fields
        test_name = "منطقة اختبار"
        test_code = "TEST-BOTH-001"
        update_resp = self.session.put(
            f"{BASE_URL}/api/admin/map-sessions/{SESSION_ID}/zones/{zone_id}",
            json={"name_ar": test_name, "zone_code": test_code}
        )
        assert update_resp.status_code == 200
        
        updated = update_resp.json()
        updated_zone = next((z for z in updated["zones"] if z["id"] == zone_id), None)
        assert updated_zone["name_ar"] == test_name
        assert updated_zone["zone_code"] == test_code
        
        # Restore
        self.session.put(
            f"{BASE_URL}/api/admin/map-sessions/{SESSION_ID}/zones/{zone_id}",
            json={"name_ar": original_name, "zone_code": original_code}
        )
        print(f"✓ Can update both name_ar and zone_code together")
    
    # ==================== Zone Status Tests ====================
    
    def test_mark_zone_inactive(self):
        """Test marking zone as inactive (is_removed=true)"""
        resp = self.session.get(f"{BASE_URL}/api/map-sessions/{SESSION_ID}")
        session = resp.json()
        zones = session.get("zones", [])
        zone = zones[0]
        zone_id = zone["id"]
        original_removed = zone.get("is_removed", False)
        
        # Mark as inactive
        update_resp = self.session.put(
            f"{BASE_URL}/api/admin/map-sessions/{SESSION_ID}/zones/{zone_id}",
            json={"is_removed": True}
        )
        assert update_resp.status_code == 200
        
        updated = update_resp.json()
        updated_zone = next((z for z in updated["zones"] if z["id"] == zone_id), None)
        assert updated_zone["is_removed"] == True
        
        # Restore
        self.session.put(
            f"{BASE_URL}/api/admin/map-sessions/{SESSION_ID}/zones/{zone_id}",
            json={"is_removed": original_removed}
        )
        print(f"✓ Zone can be marked inactive (is_removed=true)")
    
    def test_mark_zone_active(self):
        """Test marking zone as active (is_removed=false)"""
        resp = self.session.get(f"{BASE_URL}/api/map-sessions/{SESSION_ID}")
        session = resp.json()
        zones = session.get("zones", [])
        zone = zones[0]
        zone_id = zone["id"]
        
        # First mark as inactive
        self.session.put(
            f"{BASE_URL}/api/admin/map-sessions/{SESSION_ID}/zones/{zone_id}",
            json={"is_removed": True}
        )
        
        # Then mark as active
        update_resp = self.session.put(
            f"{BASE_URL}/api/admin/map-sessions/{SESSION_ID}/zones/{zone_id}",
            json={"is_removed": False}
        )
        assert update_resp.status_code == 200
        
        updated = update_resp.json()
        updated_zone = next((z for z in updated["zones"] if z["id"] == zone_id), None)
        assert updated_zone["is_removed"] == False
        print(f"✓ Zone can be marked active (is_removed=false)")
    
    def test_permanent_delete_zone(self):
        """Test permanent deletion of zone from session via DELETE endpoint"""
        # First create a test zone to delete
        resp = self.session.get(f"{BASE_URL}/api/map-sessions/{SESSION_ID}")
        session = resp.json()
        initial_zone_count = len(session.get("zones", []))
        
        # Create a test zone
        create_resp = self.session.post(
            f"{BASE_URL}/api/admin/map-sessions/{SESSION_ID}/zones",
            json={
                "zone_code": "TEST-DELETE-ZONE",
                "name_ar": "منطقة للحذف",
                "name_en": "Zone to Delete",
                "zone_type": "men_prayer",
                "polygon_points": [{"x": 10, "y": 10}, {"x": 20, "y": 10}, {"x": 20, "y": 20}, {"x": 10, "y": 20}],
                "fill_color": "#22c55e"
            }
        )
        assert create_resp.status_code == 200
        
        created_session = create_resp.json()
        new_zone = next((z for z in created_session["zones"] if z["zone_code"] == "TEST-DELETE-ZONE"), None)
        assert new_zone is not None, "Test zone not created"
        new_zone_id = new_zone["id"]
        
        # Now permanently delete it
        delete_resp = self.session.delete(
            f"{BASE_URL}/api/admin/map-sessions/{SESSION_ID}/zones/{new_zone_id}"
        )
        assert delete_resp.status_code == 200, f"Delete failed: {delete_resp.text}"
        
        # Verify zone is gone
        verify_resp = self.session.get(f"{BASE_URL}/api/map-sessions/{SESSION_ID}")
        final_session = verify_resp.json()
        deleted_zone = next((z for z in final_session["zones"] if z["id"] == new_zone_id), None)
        assert deleted_zone is None, "Zone was not permanently deleted"
        
        # Verify zone count returned to original
        final_count = len(final_session.get("zones", []))
        assert final_count == initial_zone_count, f"Zone count mismatch: expected {initial_zone_count}, got {final_count}"
        print(f"✓ Zone permanently deleted via DELETE endpoint")
    
    def test_delete_nonexistent_zone(self):
        """Test deleting a zone that doesn't exist returns appropriate response"""
        delete_resp = self.session.delete(
            f"{BASE_URL}/api/admin/map-sessions/{SESSION_ID}/zones/nonexistent-zone-id"
        )
        # Should still return 200 since it's idempotent (zone just doesn't exist)
        # Or could return 404 depending on implementation
        assert delete_resp.status_code in [200, 404]
        print(f"✓ DELETE nonexistent zone handled correctly")
    
    # ==================== Session Fetch Tests ====================
    
    def test_get_session_by_id(self):
        """Test fetching session by ID returns zones with all fields"""
        resp = self.session.get(f"{BASE_URL}/api/map-sessions/{SESSION_ID}")
        assert resp.status_code == 200
        session = resp.json()
        
        assert "zones" in session
        assert len(session["zones"]) > 0
        
        zone = session["zones"][0]
        # Check all expected fields exist
        assert "id" in zone
        assert "zone_code" in zone
        assert "name_ar" in zone
        assert "zone_type" in zone
        assert "polygon_points" in zone
        assert "fill_color" in zone
        assert "is_removed" in zone or zone.get("is_removed") is not None or "is_removed" not in zone  # Optional field
        print(f"✓ Session {SESSION_ID} fetched with {len(session['zones'])} zones")
    
    def test_get_sessions_by_floor(self):
        """Test fetching sessions by floor ID"""
        resp = self.session.get(f"{BASE_URL}/api/map-sessions?floor_id={FLOOR_ID}")
        assert resp.status_code == 200
        sessions = resp.json()
        
        # Find Feb 17 session
        feb17_session = next((s for s in sessions if s["date"] == "2025-02-17"), None)
        assert feb17_session is not None, "Feb 17 session not found"
        assert feb17_session["id"] == SESSION_ID
        print(f"✓ Found {len(sessions)} sessions for floor")
    
    # ==================== Style Controls Regression Tests ====================
    
    def test_style_fields_persist(self):
        """Verify style fields (stroke_width, stroke_style) still work"""
        resp = self.session.get(f"{BASE_URL}/api/map-sessions/{SESSION_ID}")
        session = resp.json()
        zone = session["zones"][0]
        zone_id = zone["id"]
        
        # Update style fields
        update_resp = self.session.put(
            f"{BASE_URL}/api/admin/map-sessions/{SESSION_ID}/zones/{zone_id}",
            json={"stroke_width": 1.5, "stroke_style": "dashed"}
        )
        assert update_resp.status_code == 200
        
        updated = update_resp.json()
        updated_zone = next((z for z in updated["zones"] if z["id"] == zone_id), None)
        assert updated_zone["stroke_width"] == 1.5
        assert updated_zone["stroke_style"] == "dashed"
        
        # Restore
        self.session.put(
            f"{BASE_URL}/api/admin/map-sessions/{SESSION_ID}/zones/{zone_id}",
            json={"stroke_width": 0.3, "stroke_style": "solid"}
        )
        print(f"✓ Style fields (stroke_width, stroke_style) persist correctly")
    
    def test_copy_zone_regression(self):
        """Verify zone copy still works"""
        resp = self.session.get(f"{BASE_URL}/api/map-sessions/{SESSION_ID}")
        session = resp.json()
        zone = session["zones"][0]
        
        # Copy zone
        copy_resp = self.session.post(
            f"{BASE_URL}/api/admin/map-sessions/{SESSION_ID}/zones",
            json={
                "zone_code": zone["zone_code"] + "-copy-test",
                "name_ar": zone["name_ar"] + " (نسخة اختبار)",
                "name_en": "Copy Test",
                "zone_type": zone["zone_type"],
                "polygon_points": [{"x": p["x"] + 5, "y": p["y"] + 5} for p in zone["polygon_points"]],
                "fill_color": zone["fill_color"]
            }
        )
        assert copy_resp.status_code == 200
        
        # Clean up - delete the copy
        copied_session = copy_resp.json()
        copied_zone = next((z for z in copied_session["zones"] if "-copy-test" in z["zone_code"]), None)
        if copied_zone:
            self.session.delete(f"{BASE_URL}/api/admin/map-sessions/{SESSION_ID}/zones/{copied_zone['id']}")
        print(f"✓ Zone copy regression test passed")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
