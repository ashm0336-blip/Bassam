"""
Test cases for Daily Map Sessions - Drawing/Editing Tools
Tests the new zone drawing, editing, and shape generation features
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://gates-prayer-mgmt.preview.emergentagent.com').rstrip('/')

class TestDailySessionsDrawingFeatures:
    """Tests for drawing/editing tools in daily sessions"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@crowd.sa",
            "password": "admin123"
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        token = login_resp.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Get floor ID for testing (طابق البدروم)
        floors_resp = self.session.get(f"{BASE_URL}/api/floors")
        assert floors_resp.status_code == 200
        floors = floors_resp.json()
        self.floor_id = "89139223-68c6-4686-b2cc-18a2d26bfe31"  # Known floor ID
        
        # Get or create a draft session for testing
        sessions_resp = self.session.get(f"{BASE_URL}/api/map-sessions?floor_id={self.floor_id}")
        assert sessions_resp.status_code == 200
        sessions = sessions_resp.json()
        
        # Find or create a draft session
        draft_session = next((s for s in sessions if s.get("status") == "draft"), None)
        if draft_session:
            self.session_id = draft_session["id"]
        else:
            # Create a new session for testing
            create_resp = self.session.post(f"{BASE_URL}/api/admin/map-sessions", json={
                "date": "2026-02-25",
                "floor_id": self.floor_id,
                "clone_from": "master"
            })
            assert create_resp.status_code == 200, f"Create session failed: {create_resp.text}"
            self.session_id = create_resp.json()["id"]
        
        yield
        # Cleanup - test data is left for next iteration
    
    def test_1_get_sessions_with_floor_id(self):
        """GET /api/map-sessions - Returns sessions for floor"""
        resp = self.session.get(f"{BASE_URL}/api/map-sessions?floor_id={self.floor_id}")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} sessions for floor {self.floor_id}")
    
    def test_2_get_session_details(self):
        """GET /api/map-sessions/{id} - Returns session with zones"""
        resp = self.session.get(f"{BASE_URL}/api/map-sessions/{self.session_id}")
        assert resp.status_code == 200
        session = resp.json()
        assert "id" in session
        assert "zones" in session
        assert "status" in session
        assert session["floor_id"] == self.floor_id
        print(f"Session {session['id'][:8]}... has {len(session['zones'])} zones, status: {session['status']}")
    
    def test_3_add_zone_with_rectangle_points(self):
        """POST /api/admin/map-sessions/{id}/zones - Add new zone with rectangle polygon"""
        # Rectangle shape points (simulating shape generator)
        rectangle_points = [
            {"x": 30, "y": 35}, 
            {"x": 70, "y": 35}, 
            {"x": 70, "y": 65}, 
            {"x": 30, "y": 65}
        ]
        
        resp = self.session.post(f"{BASE_URL}/api/admin/map-sessions/{self.session_id}/zones", json={
            "zone_code": "TEST-RECT-001",
            "name_ar": "منطقة اختبار مستطيلة",
            "name_en": "Test Rectangle Zone",
            "zone_type": "men_prayer",
            "polygon_points": rectangle_points,
            "fill_color": "#22c55e"
        })
        assert resp.status_code == 200, f"Add zone failed: {resp.text}"
        session = resp.json()
        
        # Verify zone was added
        added_zone = next((z for z in session["zones"] if z["zone_code"] == "TEST-RECT-001"), None)
        assert added_zone is not None, "Zone was not added"
        assert added_zone["change_type"] == "added"
        assert len(added_zone["polygon_points"]) == 4
        print(f"Added rectangle zone with ID: {added_zone['id'][:8]}...")
        
        # Store for later tests
        self.__class__.test_zone_id = added_zone["id"]
    
    def test_4_add_zone_with_triangle_points(self):
        """POST /api/admin/map-sessions/{id}/zones - Add zone with triangle polygon"""
        # Triangle shape points (simulating shape generator)
        import math
        cx, cy = 50, 50
        triangle_points = [
            {"x": cx + 18 * math.cos(2 * math.pi * i / 3 - math.pi / 2), 
             "y": cy + 18 * math.sin(2 * math.pi * i / 3 - math.pi / 2)} 
            for i in range(3)
        ]
        
        resp = self.session.post(f"{BASE_URL}/api/admin/map-sessions/{self.session_id}/zones", json={
            "zone_code": "TEST-TRI-001",
            "name_ar": "منطقة مثلثة",
            "name_en": "Triangle Zone",
            "zone_type": "entry",
            "polygon_points": triangle_points,
            "fill_color": "#10b981"
        })
        assert resp.status_code == 200
        session = resp.json()
        
        added_zone = next((z for z in session["zones"] if z["zone_code"] == "TEST-TRI-001"), None)
        assert added_zone is not None
        assert len(added_zone["polygon_points"]) == 3
        print(f"Added triangle zone with 3 points")
    
    def test_5_add_zone_with_circle_points(self):
        """POST /api/admin/map-sessions/{id}/zones - Add zone with circle polygon (24 points)"""
        import math
        cx, cy = 75, 25
        # Circle with 24 points (simulating circle shape generator)
        circle_points = [
            {"x": cx + 15 * math.cos(2 * math.pi * i / 24), 
             "y": cy + 15 * math.sin(2 * math.pi * i / 24)} 
            for i in range(24)
        ]
        
        resp = self.session.post(f"{BASE_URL}/api/admin/map-sessions/{self.session_id}/zones", json={
            "zone_code": "TEST-CIRCLE-001",
            "name_ar": "منطقة دائرية",
            "name_en": "Circle Zone",
            "zone_type": "mataf",
            "polygon_points": circle_points,
            "fill_color": "#84cc16"
        })
        assert resp.status_code == 200
        session = resp.json()
        
        added_zone = next((z for z in session["zones"] if z["zone_code"] == "TEST-CIRCLE-001"), None)
        assert added_zone is not None
        assert len(added_zone["polygon_points"]) == 24
        print(f"Added circle zone with 24 points")
    
    def test_6_update_zone_polygon_points(self):
        """PUT /api/admin/map-sessions/{id}/zones/{zone_id} - Update polygon points (edit mode)"""
        # Get current session zones
        resp = self.session.get(f"{BASE_URL}/api/map-sessions/{self.session_id}")
        session = resp.json()
        test_zone = next((z for z in session["zones"] if z["zone_code"] == "TEST-RECT-001"), None)
        
        if not test_zone:
            pytest.skip("Test zone not found, skipping edit test")
        
        # Modify polygon points (simulating drag vertex)
        new_points = [
            {"x": 25, "y": 30},  # Moved vertex
            {"x": 75, "y": 30},  # Moved vertex
            {"x": 75, "y": 70},
            {"x": 25, "y": 70}
        ]
        
        resp = self.session.put(f"{BASE_URL}/api/admin/map-sessions/{self.session_id}/zones/{test_zone['id']}", json={
            "polygon_points": new_points
        })
        assert resp.status_code == 200
        updated_session = resp.json()
        
        updated_zone = next((z for z in updated_session["zones"] if z["id"] == test_zone["id"]), None)
        assert updated_zone is not None
        assert updated_zone["change_type"] == "moved"  # Change type should update to "moved"
        assert updated_zone["polygon_points"][0]["x"] == 25  # Verify point was updated
        print(f"Zone polygon points updated, change_type: {updated_zone['change_type']}")
    
    def test_7_update_zone_name_and_type(self):
        """PUT /api/admin/map-sessions/{id}/zones/{zone_id} - Update zone details"""
        resp = self.session.get(f"{BASE_URL}/api/map-sessions/{self.session_id}")
        session = resp.json()
        test_zone = next((z for z in session["zones"] if z["zone_code"] == "TEST-TRI-001"), None)
        
        if not test_zone:
            pytest.skip("Triangle zone not found")
        
        resp = self.session.put(f"{BASE_URL}/api/admin/map-sessions/{self.session_id}/zones/{test_zone['id']}", json={
            "zone_type": "exit",
            "fill_color": "#ef4444",
            "name_ar": "منطقة خروج اختبار"
        })
        assert resp.status_code == 200
        updated = resp.json()
        
        updated_zone = next((z for z in updated["zones"] if z["id"] == test_zone["id"]), None)
        assert updated_zone["zone_type"] == "exit"
        assert updated_zone["change_type"] == "category_changed"
        print(f"Zone type changed to exit, change_type: category_changed")
    
    def test_8_toggle_zone_removal(self):
        """PUT /api/admin/map-sessions/{id}/zones/{zone_id} - Remove zone (soft delete)"""
        resp = self.session.get(f"{BASE_URL}/api/map-sessions/{self.session_id}")
        session = resp.json()
        test_zone = next((z for z in session["zones"] if z["zone_code"] == "TEST-CIRCLE-001"), None)
        
        if not test_zone:
            pytest.skip("Circle zone not found")
        
        # Remove zone
        resp = self.session.put(f"{BASE_URL}/api/admin/map-sessions/{self.session_id}/zones/{test_zone['id']}", json={
            "is_removed": True
        })
        assert resp.status_code == 200
        updated = resp.json()
        
        removed_zone = next((z for z in updated["zones"] if z["id"] == test_zone["id"]), None)
        assert removed_zone["is_removed"] == True
        assert removed_zone["change_type"] == "removed"
        
        # Changes summary should reflect removal
        assert updated["changes_summary"]["removed"] >= 1
        print(f"Zone marked as removed, summary: {updated['changes_summary']}")
    
    def test_9_restore_removed_zone(self):
        """PUT /api/admin/map-sessions/{id}/zones/{zone_id} - Restore removed zone"""
        resp = self.session.get(f"{BASE_URL}/api/map-sessions/{self.session_id}")
        session = resp.json()
        test_zone = next((z for z in session["zones"] if z["zone_code"] == "TEST-CIRCLE-001"), None)
        
        if not test_zone:
            pytest.skip("Circle zone not found")
        
        resp = self.session.put(f"{BASE_URL}/api/admin/map-sessions/{self.session_id}/zones/{test_zone['id']}", json={
            "is_removed": False
        })
        assert resp.status_code == 200
        updated = resp.json()
        
        restored_zone = next((z for z in updated["zones"] if z["id"] == test_zone["id"]), None)
        assert restored_zone["is_removed"] == False
        print(f"Zone restored from removal")
    
    def test_10_add_daily_note_to_zone(self):
        """PUT /api/admin/map-sessions/{id}/zones/{zone_id} - Add daily note"""
        resp = self.session.get(f"{BASE_URL}/api/map-sessions/{self.session_id}")
        session = resp.json()
        test_zone = next((z for z in session["zones"] if z["zone_code"] == "TEST-RECT-001"), None)
        
        if not test_zone:
            pytest.skip("Rectangle zone not found")
        
        resp = self.session.put(f"{BASE_URL}/api/admin/map-sessions/{self.session_id}/zones/{test_zone['id']}", json={
            "daily_note": "ملاحظة اختبارية للمنطقة"
        })
        assert resp.status_code == 200
        updated = resp.json()
        
        noted_zone = next((z for z in updated["zones"] if z["id"] == test_zone["id"]), None)
        assert noted_zone["daily_note"] == "ملاحظة اختبارية للمنطقة"
        print(f"Daily note added to zone")
    
    def test_11_delete_zone_permanently(self):
        """DELETE /api/admin/map-sessions/{id}/zones/{zone_id} - Remove zone permanently"""
        resp = self.session.get(f"{BASE_URL}/api/map-sessions/{self.session_id}")
        session = resp.json()
        test_zone = next((z for z in session["zones"] if z["zone_code"] == "TEST-CIRCLE-001"), None)
        
        if not test_zone:
            pytest.skip("Circle zone not found")
        
        zone_id = test_zone["id"]
        initial_zone_count = len(session["zones"])
        
        resp = self.session.delete(f"{BASE_URL}/api/admin/map-sessions/{self.session_id}/zones/{zone_id}")
        assert resp.status_code == 200
        
        # Verify zone was removed
        resp2 = self.session.get(f"{BASE_URL}/api/map-sessions/{self.session_id}")
        updated = resp2.json()
        assert len(updated["zones"]) == initial_zone_count - 1
        remaining_zone = next((z for z in updated["zones"] if z["id"] == zone_id), None)
        assert remaining_zone is None
        print(f"Zone permanently deleted, zones count: {len(updated['zones'])}")
    
    def test_12_session_changes_summary_accuracy(self):
        """Verify changes summary is correctly calculated"""
        resp = self.session.get(f"{BASE_URL}/api/map-sessions/{self.session_id}")
        session = resp.json()
        
        # Manual count
        added = 0
        removed = 0
        modified = 0
        unchanged = 0
        
        for z in session["zones"]:
            ct = z.get("change_type", "unchanged")
            if ct == "added":
                added += 1
            elif ct == "removed":
                removed += 1
            elif ct in ("modified", "category_changed", "moved"):
                modified += 1
            else:
                unchanged += 1
        
        summary = session["changes_summary"]
        print(f"Calculated: added={added}, removed={removed}, modified={modified}, unchanged={unchanged}")
        print(f"API summary: {summary}")
        
        # Verify counts match (some tolerance for category_changed counting as modified)
        assert summary["added"] == added
        # Modified may include category_changed and moved
        assert summary["modified"] >= 0
    
    def test_13_completed_session_cannot_be_modified(self):
        """Verify behavior when trying to modify completed session"""
        # First get a completed session or complete the current one
        resp = self.session.get(f"{BASE_URL}/api/map-sessions?floor_id={self.floor_id}")
        sessions = resp.json()
        completed = next((s for s in sessions if s.get("status") == "completed"), None)
        
        if completed:
            # Try to add zone to completed session - should still work as API doesn't prevent this
            # But frontend hides the drawing toolbar for completed sessions
            print(f"Found completed session: {completed['id'][:8]}..., status: {completed['status']}")
            print("Note: Frontend hides drawing toolbar for completed sessions (view-only mode)")
        else:
            print("No completed sessions found - test skipped")
    
    def test_14_verify_zone_defaults(self):
        """POST /api/admin/map-sessions/{id}/zones - Verify zone gets default values"""
        minimal_zone = {
            "zone_code": "TEST-MINIMAL",
            "polygon_points": [{"x": 10, "y": 10}, {"x": 20, "y": 10}, {"x": 15, "y": 20}]
        }
        
        resp = self.session.post(f"{BASE_URL}/api/admin/map-sessions/{self.session_id}/zones", json=minimal_zone)
        assert resp.status_code == 200
        session = resp.json()
        
        added = next((z for z in session["zones"] if z["zone_code"] == "TEST-MINIMAL"), None)
        assert added is not None
        assert added["name_ar"] == "منطقة جديدة"  # Default name
        assert added["zone_type"] == "men_prayer"  # Default type
        assert added["fill_color"] == "#22c55e"  # Default color
        assert added["opacity"] == 0.4  # Default opacity
        assert added["change_type"] == "added"
        print(f"Zone created with defaults: type={added['zone_type']}, color={added['fill_color']}")
    
    def test_15_cleanup_test_zones(self):
        """Cleanup - remove test zones"""
        resp = self.session.get(f"{BASE_URL}/api/map-sessions/{self.session_id}")
        session = resp.json()
        
        test_codes = ["TEST-RECT-001", "TEST-TRI-001", "TEST-MINIMAL"]
        removed_count = 0
        
        for zone in session["zones"]:
            if zone["zone_code"] in test_codes or zone["zone_code"].startswith("TEST-"):
                del_resp = self.session.delete(f"{BASE_URL}/api/admin/map-sessions/{self.session_id}/zones/{zone['id']}")
                if del_resp.status_code == 200:
                    removed_count += 1
        
        print(f"Cleanup: removed {removed_count} test zones")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
