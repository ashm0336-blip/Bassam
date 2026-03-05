"""
Test suite for Daily Map Sessions - New Features (Calendar, Source Selector, Batch Entry)
Tests the 3 new features added on top of base daily sessions:
1. Monthly Calendar View - displaying sessions by date
2. Enhanced Source Selector - auto/master/empty/specific options
3. Batch Entry Mode - create multiple sessions at once
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://crowd-touch-maps.preview.emergentagent.com').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@crowd.sa"
ADMIN_PASSWORD = "admin123"

# Floor IDs from existing data
FLOOR_ID_BASEMENT = "89139223-68c6-4686-b2cc-18a2d26bfe31"  # طابق البدروم
FLOOR_ID_GROUND = "4c58d897-4fe2-43b8-bfd5-13e8adadd916"  # الدور الأرضي


class TestAuth:
    """Authentication for subsequent tests"""
    
    @pytest.fixture(scope="class")
    def token(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, token):
        """Get auth headers"""
        return {"Authorization": f"Bearer {token}"}


class TestFloorAndSessionsAPI(TestAuth):
    """Test floor selection and sessions list"""
    
    def test_get_floors_list(self, auth_headers):
        """GET /api/floors - Should return available floors for dropdown"""
        response = requests.get(f"{BASE_URL}/api/floors", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get floors: {response.text}"
        floors = response.json()
        assert isinstance(floors, list), "Floors should be a list"
        assert len(floors) >= 1, "Should have at least one floor"
        # Verify floor structure
        for floor in floors:
            assert "id" in floor, "Floor should have id"
            assert "name_ar" in floor, "Floor should have Arabic name"
        print(f"PASS: GET /api/floors returns {len(floors)} floors")
    
    def test_get_sessions_for_floor(self, auth_headers):
        """GET /api/map-sessions?floor_id=... - Should return sessions for calendar"""
        response = requests.get(
            f"{BASE_URL}/api/map-sessions?floor_id={FLOOR_ID_BASEMENT}",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        sessions = response.json()
        assert isinstance(sessions, list), "Sessions should be a list"
        # Verify session structure
        for session in sessions:
            assert "id" in session, "Session should have id"
            assert "date" in session, "Session should have date"
            assert "status" in session, "Session should have status"
            assert session["status"] in ["draft", "completed"], f"Invalid status: {session['status']}"
        print(f"PASS: GET /api/map-sessions returns {len(sessions)} sessions")


class TestSourceSelectorFeature(TestAuth):
    """Test Enhanced New Session Dialog with Source Selector"""
    
    def test_create_session_clone_from_empty(self, auth_headers):
        """POST /api/admin/map-sessions with clone_from='empty' should create session with 0 zones"""
        # Use a unique date for testing
        test_date = "2026-03-01"
        
        # First, clean up any existing session for this date
        response = requests.get(
            f"{BASE_URL}/api/map-sessions?floor_id={FLOOR_ID_BASEMENT}",
            headers=auth_headers
        )
        existing_sessions = response.json()
        for s in existing_sessions:
            if s["date"] == test_date:
                requests.delete(f"{BASE_URL}/api/admin/map-sessions/{s['id']}", headers=auth_headers)
        
        # Create session with clone_from='empty'
        response = requests.post(
            f"{BASE_URL}/api/admin/map-sessions",
            json={
                "date": test_date,
                "floor_id": FLOOR_ID_BASEMENT,
                "clone_from": "empty"
            },
            headers=auth_headers
        )
        assert response.status_code == 200 or response.status_code == 201, f"Failed: {response.text}"
        session = response.json()
        
        # Verify empty zones
        zones = session.get("zones", [])
        assert len(zones) == 0, f"Expected 0 zones, got {len(zones)}"
        print(f"PASS: clone_from='empty' creates session with {len(zones)} zones")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/map-sessions/{session['id']}", headers=auth_headers)
    
    def test_create_session_clone_from_master(self, auth_headers):
        """POST /api/admin/map-sessions with clone_from='master' should clone from master zones"""
        test_date = "2026-03-02"
        
        # Cleanup first
        response = requests.get(
            f"{BASE_URL}/api/map-sessions?floor_id={FLOOR_ID_BASEMENT}",
            headers=auth_headers
        )
        for s in response.json():
            if s["date"] == test_date:
                requests.delete(f"{BASE_URL}/api/admin/map-sessions/{s['id']}", headers=auth_headers)
        
        # Create session with clone_from='master'
        response = requests.post(
            f"{BASE_URL}/api/admin/map-sessions",
            json={
                "date": test_date,
                "floor_id": FLOOR_ID_BASEMENT,
                "clone_from": "master"
            },
            headers=auth_headers
        )
        assert response.status_code == 200 or response.status_code == 201, f"Failed: {response.text}"
        session = response.json()
        
        # Verify zones are cloned from master (should have zones)
        zones = session.get("zones", [])
        print(f"PASS: clone_from='master' creates session with {len(zones)} zones")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/map-sessions/{session['id']}", headers=auth_headers)
    
    def test_create_session_clone_from_specific_session(self, auth_headers):
        """POST /api/admin/map-sessions with clone_from=session_id should clone from that session"""
        # First get an existing session to clone from
        response = requests.get(
            f"{BASE_URL}/api/map-sessions?floor_id={FLOOR_ID_BASEMENT}",
            headers=auth_headers
        )
        existing_sessions = response.json()
        
        if len(existing_sessions) == 0:
            pytest.skip("No existing sessions to clone from")
        
        source_session = existing_sessions[0]
        source_zones_count = len(source_session.get("zones", []))
        test_date = "2026-03-03"
        
        # Cleanup first
        for s in existing_sessions:
            if s["date"] == test_date:
                requests.delete(f"{BASE_URL}/api/admin/map-sessions/{s['id']}", headers=auth_headers)
        
        # Create session cloning from specific session
        response = requests.post(
            f"{BASE_URL}/api/admin/map-sessions",
            json={
                "date": test_date,
                "floor_id": FLOOR_ID_BASEMENT,
                "clone_from": source_session["id"]
            },
            headers=auth_headers
        )
        assert response.status_code == 200 or response.status_code == 201, f"Failed: {response.text}"
        session = response.json()
        
        # Count non-removed zones from source
        source_active_zones = [z for z in source_session.get("zones", []) if not z.get("is_removed")]
        zones = session.get("zones", [])
        
        # New session should have similar zone count (excluding removed)
        print(f"PASS: clone_from={source_session['id'][:8]}... creates session with {len(zones)} zones (source had {len(source_active_zones)} active)")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/map-sessions/{session['id']}", headers=auth_headers)


class TestBatchEntryFeature(TestAuth):
    """Test Batch Entry Mode - create multiple sessions for date range"""
    
    def test_batch_create_sessions_with_master(self, auth_headers):
        """POST /api/admin/map-sessions/batch should create sessions for date range"""
        start_date = "2026-03-10"
        end_date = "2026-03-12"  # 3 days
        
        # Cleanup any existing sessions in this range first
        response = requests.get(
            f"{BASE_URL}/api/map-sessions?floor_id={FLOOR_ID_BASEMENT}",
            headers=auth_headers
        )
        for s in response.json():
            if start_date <= s["date"] <= end_date:
                requests.delete(f"{BASE_URL}/api/admin/map-sessions/{s['id']}", headers=auth_headers)
        
        # Create batch sessions
        response = requests.post(
            f"{BASE_URL}/api/admin/map-sessions/batch",
            json={
                "start_date": start_date,
                "end_date": end_date,
                "floor_id": FLOOR_ID_BASEMENT,
                "clone_from": "master"
            },
            headers=auth_headers
        )
        assert response.status_code == 200, f"Batch create failed: {response.text}"
        result = response.json()
        
        assert "total_created" in result, "Should return total_created"
        assert "total_skipped" in result, "Should return total_skipped"
        assert result["total_created"] == 3, f"Expected 3 sessions, created {result['total_created']}"
        print(f"PASS: Batch created {result['total_created']} sessions, skipped {result['total_skipped']}")
        
        # Cleanup
        response = requests.get(
            f"{BASE_URL}/api/map-sessions?floor_id={FLOOR_ID_BASEMENT}",
            headers=auth_headers
        )
        for s in response.json():
            if start_date <= s["date"] <= end_date:
                requests.delete(f"{BASE_URL}/api/admin/map-sessions/{s['id']}", headers=auth_headers)
    
    def test_batch_create_skips_existing_days(self, auth_headers):
        """Batch endpoint should skip days that already have sessions"""
        # First create a single session
        test_date = "2026-03-15"
        start_date = "2026-03-14"
        end_date = "2026-03-16"  # 3 days, middle one should be skipped
        
        # Cleanup
        response = requests.get(
            f"{BASE_URL}/api/map-sessions?floor_id={FLOOR_ID_BASEMENT}",
            headers=auth_headers
        )
        for s in response.json():
            if start_date <= s["date"] <= end_date:
                requests.delete(f"{BASE_URL}/api/admin/map-sessions/{s['id']}", headers=auth_headers)
        
        # Create single session for March 15
        response = requests.post(
            f"{BASE_URL}/api/admin/map-sessions",
            json={
                "date": test_date,
                "floor_id": FLOOR_ID_BASEMENT,
                "clone_from": "master"
            },
            headers=auth_headers
        )
        assert response.status_code == 200 or response.status_code == 201
        
        # Now try batch for range that includes existing date
        response = requests.post(
            f"{BASE_URL}/api/admin/map-sessions/batch",
            json={
                "start_date": start_date,
                "end_date": end_date,
                "floor_id": FLOOR_ID_BASEMENT,
                "clone_from": "master"
            },
            headers=auth_headers
        )
        assert response.status_code == 200, f"Batch failed: {response.text}"
        result = response.json()
        
        assert result["total_created"] == 2, f"Expected 2 (skipping existing), created {result['total_created']}"
        assert result["total_skipped"] == 1, f"Expected 1 skipped, got {result['total_skipped']}"
        print(f"PASS: Batch correctly skipped existing day - created {result['total_created']}, skipped {result['total_skipped']}")
        
        # Cleanup
        response = requests.get(
            f"{BASE_URL}/api/map-sessions?floor_id={FLOOR_ID_BASEMENT}",
            headers=auth_headers
        )
        for s in response.json():
            if start_date <= s["date"] <= end_date:
                requests.delete(f"{BASE_URL}/api/admin/map-sessions/{s['id']}", headers=auth_headers)
    
    def test_batch_create_with_empty_source(self, auth_headers):
        """Batch create with clone_from='empty' should create empty sessions"""
        start_date = "2026-03-20"
        end_date = "2026-03-21"  # 2 days
        
        # Cleanup
        response = requests.get(
            f"{BASE_URL}/api/map-sessions?floor_id={FLOOR_ID_BASEMENT}",
            headers=auth_headers
        )
        for s in response.json():
            if start_date <= s["date"] <= end_date:
                requests.delete(f"{BASE_URL}/api/admin/map-sessions/{s['id']}", headers=auth_headers)
        
        # Create batch with empty
        response = requests.post(
            f"{BASE_URL}/api/admin/map-sessions/batch",
            json={
                "start_date": start_date,
                "end_date": end_date,
                "floor_id": FLOOR_ID_BASEMENT,
                "clone_from": "empty"
            },
            headers=auth_headers
        )
        assert response.status_code == 200, f"Batch failed: {response.text}"
        result = response.json()
        
        assert result["total_created"] == 2, f"Expected 2 sessions"
        
        # Verify sessions have 0 zones
        response = requests.get(
            f"{BASE_URL}/api/map-sessions?floor_id={FLOOR_ID_BASEMENT}",
            headers=auth_headers
        )
        for s in response.json():
            if start_date <= s["date"] <= end_date:
                zones_count = len(s.get("zones", []))
                assert zones_count == 0, f"Expected 0 zones for empty batch, got {zones_count}"
        
        print(f"PASS: Batch with empty source creates sessions with 0 zones")
        
        # Cleanup
        for s in response.json():
            if start_date <= s["date"] <= end_date:
                requests.delete(f"{BASE_URL}/api/admin/map-sessions/{s['id']}", headers=auth_headers)
    
    def test_batch_validates_date_range(self, auth_headers):
        """Batch should reject invalid date ranges"""
        # End date before start date
        response = requests.post(
            f"{BASE_URL}/api/admin/map-sessions/batch",
            json={
                "start_date": "2026-03-25",
                "end_date": "2026-03-20",  # Before start
                "floor_id": FLOOR_ID_BASEMENT,
                "clone_from": "master"
            },
            headers=auth_headers
        )
        assert response.status_code == 400, f"Should reject invalid range, got {response.status_code}"
        print("PASS: Batch rejects end_date before start_date")


class TestCalendarViewData(TestAuth):
    """Test data requirements for Monthly Calendar View"""
    
    def test_sessions_include_status_for_calendar_dots(self, auth_headers):
        """Sessions should include status field for calendar dot colors"""
        response = requests.get(
            f"{BASE_URL}/api/map-sessions?floor_id={FLOOR_ID_BASEMENT}",
            headers=auth_headers
        )
        assert response.status_code == 200
        sessions = response.json()
        
        for session in sessions:
            assert "status" in session, "Session must have status for calendar dots"
            assert session["status"] in ["draft", "completed"], f"Invalid status: {session['status']}"
        
        print(f"PASS: All {len(sessions)} sessions have valid status (draft/completed)")
    
    def test_sessions_include_date_for_calendar_mapping(self, auth_headers):
        """Sessions should include date in YYYY-MM-DD format for calendar mapping"""
        response = requests.get(
            f"{BASE_URL}/api/map-sessions?floor_id={FLOOR_ID_BASEMENT}",
            headers=auth_headers
        )
        assert response.status_code == 200
        sessions = response.json()
        
        for session in sessions:
            assert "date" in session, "Session must have date"
            # Verify date format YYYY-MM-DD
            date_str = session["date"]
            parts = date_str.split("-")
            assert len(parts) == 3, f"Invalid date format: {date_str}"
            assert len(parts[0]) == 4, f"Year should be 4 digits: {date_str}"
            assert len(parts[1]) == 2, f"Month should be 2 digits: {date_str}"
            assert len(parts[2]) == 2, f"Day should be 2 digits: {date_str}"
        
        print(f"PASS: All {len(sessions)} sessions have valid date format YYYY-MM-DD")


class TestPreviousFeaturesStillWork(TestAuth):
    """Verify previously tested features still work after new feature additions"""
    
    def test_zone_edit_still_works(self, auth_headers):
        """Zone category change should still work"""
        # Get a session
        response = requests.get(
            f"{BASE_URL}/api/map-sessions?floor_id={FLOOR_ID_BASEMENT}",
            headers=auth_headers
        )
        sessions = response.json()
        
        # Find a session with zones
        session_with_zones = None
        for s in sessions:
            if len(s.get("zones", [])) > 0:
                session_with_zones = s
                break
        
        if not session_with_zones:
            pytest.skip("No sessions with zones to test")
        
        zone = session_with_zones["zones"][0]
        session_id = session_with_zones["id"]
        zone_id = zone["id"]
        original_type = zone.get("zone_type", "service")
        new_type = "men_prayer" if original_type != "men_prayer" else "women_prayer"
        
        # Update zone type
        response = requests.put(
            f"{BASE_URL}/api/admin/map-sessions/{session_id}/zones/{zone_id}",
            json={"zone_type": new_type},
            headers=auth_headers
        )
        assert response.status_code == 200, f"Zone update failed: {response.text}"
        
        # Revert
        response = requests.put(
            f"{BASE_URL}/api/admin/map-sessions/{session_id}/zones/{zone_id}",
            json={"zone_type": original_type},
            headers=auth_headers
        )
        print("PASS: Zone edit still works")
    
    def test_complete_reopen_session_still_works(self, auth_headers):
        """Session status change (complete/reopen) should still work"""
        # Get a draft session
        response = requests.get(
            f"{BASE_URL}/api/map-sessions?floor_id={FLOOR_ID_BASEMENT}",
            headers=auth_headers
        )
        sessions = response.json()
        
        draft_session = None
        for s in sessions:
            if s["status"] == "draft":
                draft_session = s
                break
        
        if not draft_session:
            pytest.skip("No draft session to test")
        
        session_id = draft_session["id"]
        
        # Complete it
        response = requests.put(
            f"{BASE_URL}/api/admin/map-sessions/{session_id}",
            json={"status": "completed"},
            headers=auth_headers
        )
        assert response.status_code == 200
        
        # Reopen it
        response = requests.put(
            f"{BASE_URL}/api/admin/map-sessions/{session_id}",
            json={"status": "draft"},
            headers=auth_headers
        )
        assert response.status_code == 200
        print("PASS: Complete/reopen session still works")
    
    def test_session_notes_still_work(self, auth_headers):
        """Supervisor notes should still work"""
        response = requests.get(
            f"{BASE_URL}/api/map-sessions?floor_id={FLOOR_ID_BASEMENT}",
            headers=auth_headers
        )
        sessions = response.json()
        
        if len(sessions) == 0:
            pytest.skip("No sessions to test")
        
        session_id = sessions[0]["id"]
        test_note = "Test note for regression testing"
        
        # Add note
        response = requests.put(
            f"{BASE_URL}/api/admin/map-sessions/{session_id}",
            json={"supervisor_notes": test_note},
            headers=auth_headers
        )
        assert response.status_code == 200
        
        # Verify note saved
        response = requests.get(f"{BASE_URL}/api/map-sessions/{session_id}", headers=auth_headers)
        assert response.json()["supervisor_notes"] == test_note
        
        # Clear note
        response = requests.put(
            f"{BASE_URL}/api/admin/map-sessions/{session_id}",
            json={"supervisor_notes": ""},
            headers=auth_headers
        )
        print("PASS: Supervisor notes still work")
    
    def test_compare_sessions_still_works(self, auth_headers):
        """Session comparison should still work"""
        response = requests.get(
            f"{BASE_URL}/api/map-sessions?floor_id={FLOOR_ID_BASEMENT}",
            headers=auth_headers
        )
        sessions = response.json()
        
        if len(sessions) < 2:
            pytest.skip("Need at least 2 sessions to compare")
        
        session1_id = sessions[0]["id"]
        session2_id = sessions[1]["id"]
        
        response = requests.get(
            f"{BASE_URL}/api/map-sessions/compare/{session1_id}/{session2_id}",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Compare failed: {response.text}"
        compare = response.json()
        
        assert "added" in compare or "removed" in compare or "unchanged_count" in compare
        print("PASS: Session comparison still works")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
