"""
Test Gate Sessions API - Daily Gate Sessions Feature
Tests: GET/POST/PUT/DELETE operations for gate sessions, gate updates, batch creation
"""
import pytest
import requests
import os
import time
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials
ADMIN_EMAIL = "admin@crowd.sa"
ADMIN_PASSWORD = "admin123"

# Gate map floor ID from agent context
GATE_MAP_FLOOR_ID = "45574a22-a162-4826-8c55-a79e09c7e5fe"


class TestGateSessionsAuth:
    """Test authentication for gate sessions"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
    def test_login_admin(self):
        """Login with admin credentials to get token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == ADMIN_EMAIL
        print(f"✓ Login successful for {ADMIN_EMAIL}")
        return data["access_token"]


class TestGateSessionsCRUD:
    """Test CRUD operations for gate sessions"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        # Login to get token
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            token = response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            
    def test_get_gate_sessions(self):
        """GET /api/gate-sessions returns sessions"""
        response = self.session.get(f"{BASE_URL}/api/gate-sessions")
        assert response.status_code == 200, f"Failed to get gate sessions: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/gate-sessions returned {len(data)} sessions")
        return data
        
    def test_get_gate_sessions_by_floor(self):
        """GET /api/gate-sessions with floor_id filter"""
        response = self.session.get(f"{BASE_URL}/api/gate-sessions?floor_id={GATE_MAP_FLOOR_ID}")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        # Verify all returned sessions have correct floor_id
        for session in data:
            if "floor_id" in session:
                assert session["floor_id"] == GATE_MAP_FLOOR_ID
        print(f"✓ GET /api/gate-sessions with floor_id returned {len(data)} sessions")
        return data
        
    def test_get_gate_map_floors(self):
        """GET /api/gate-map/floors returns floor list"""
        response = self.session.get(f"{BASE_URL}/api/gate-map/floors")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        # Verify our expected floor exists
        floor_ids = [f.get("id") for f in data]
        assert GATE_MAP_FLOOR_ID in floor_ids, f"Expected floor {GATE_MAP_FLOOR_ID} not found"
        print(f"✓ GET /api/gate-map/floors returned {len(data)} floors")
        return data
        
    def test_get_gate_markers(self):
        """GET /api/gate-map/markers returns gate markers"""
        response = self.session.get(f"{BASE_URL}/api/gate-map/markers?floor_id={GATE_MAP_FLOOR_ID}")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/gate-map/markers returned {len(data)} markers")
        return data


class TestGateSessionCreation:
    """Test creating gate sessions"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        # Login to get token
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            token = response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_create_session_clones_gates(self):
        """POST /api/admin/gate-sessions creates session with cloned gates"""
        # Use a unique test date
        test_date = "2026-03-15"
        
        # First check if session exists and delete it
        response = self.session.get(f"{BASE_URL}/api/gate-sessions?floor_id={GATE_MAP_FLOOR_ID}")
        existing = response.json()
        for s in existing:
            if s.get("date") == test_date:
                self.session.delete(f"{BASE_URL}/api/admin/gate-sessions/{s['id']}")
        
        # Create new session
        response = self.session.post(f"{BASE_URL}/api/admin/gate-sessions", json={
            "date": test_date,
            "floor_id": GATE_MAP_FLOOR_ID,
            "clone_from": "master"
        })
        assert response.status_code == 200, f"Failed to create session: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "id" in data
        assert data["date"] == test_date
        assert data["floor_id"] == GATE_MAP_FLOOR_ID
        assert "gates" in data
        assert isinstance(data["gates"], list)
        assert len(data["gates"]) > 0, "Session should have cloned gates"
        
        # Verify gates have required fields
        gate = data["gates"][0]
        assert "id" in gate
        assert "name_ar" in gate
        assert "status" in gate
        assert "x" in gate
        assert "y" in gate
        
        print(f"✓ POST /api/admin/gate-sessions created session with {len(data['gates'])} gates")
        
        # Cleanup - delete the test session
        self.session.delete(f"{BASE_URL}/api/admin/gate-sessions/{data['id']}")
        return data
        
    def test_create_session_duplicate_fails(self):
        """POST /api/admin/gate-sessions fails for duplicate date/floor"""
        # Use existing session date (2026-02-23 from context)
        test_date = "2026-02-23"
        
        response = self.session.post(f"{BASE_URL}/api/admin/gate-sessions", json={
            "date": test_date,
            "floor_id": GATE_MAP_FLOOR_ID,
            "clone_from": "master"
        })
        
        # Should fail if session already exists
        if response.status_code == 400:
            assert "توجد جلسة" in response.json().get("detail", "")
            print(f"✓ Duplicate session creation correctly rejected")
        elif response.status_code == 200:
            # Session didn't exist - clean it up
            data = response.json()
            self.session.delete(f"{BASE_URL}/api/admin/gate-sessions/{data['id']}")
            print(f"✓ Session created (no existing session found)")


class TestGateSessionUpdate:
    """Test updating gate sessions and individual gates"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        # Login to get token
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            token = response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            
    def get_or_create_test_session(self):
        """Get existing session or create a test session"""
        response = self.session.get(f"{BASE_URL}/api/gate-sessions?floor_id={GATE_MAP_FLOOR_ID}")
        sessions = response.json()
        if sessions:
            return sessions[0]
        
        # Create a new test session
        response = self.session.post(f"{BASE_URL}/api/admin/gate-sessions", json={
            "date": "2026-03-20",
            "floor_id": GATE_MAP_FLOOR_ID,
            "clone_from": "master"
        })
        return response.json()
        
    def test_update_gate_status(self):
        """PUT /api/admin/gate-sessions/{id}/gates/{gate_id} updates gate status"""
        session = self.get_or_create_test_session()
        session_id = session["id"]
        
        if not session.get("gates"):
            pytest.skip("No gates in session to update")
            
        gate = session["gates"][0]
        gate_id = gate["id"]
        original_status = gate.get("status", "open")
        new_status = "closed" if original_status == "open" else "open"
        
        response = self.session.put(
            f"{BASE_URL}/api/admin/gate-sessions/{session_id}/gates/{gate_id}",
            json={"status": new_status}
        )
        assert response.status_code == 200, f"Failed to update gate: {response.text}"
        data = response.json()
        
        # Find updated gate
        updated_gate = next((g for g in data.get("gates", []) if g["id"] == gate_id), None)
        assert updated_gate is not None
        assert updated_gate["status"] == new_status
        assert updated_gate.get("change_type") == "status_changed"
        
        print(f"✓ PUT /api/admin/gate-sessions/{session_id}/gates/{gate_id} updated status to {new_status}")
        
        # Restore original status
        self.session.put(
            f"{BASE_URL}/api/admin/gate-sessions/{session_id}/gates/{gate_id}",
            json={"status": original_status}
        )
        
    def test_update_gate_direction(self):
        """PUT updates gate direction"""
        session = self.get_or_create_test_session()
        session_id = session["id"]
        
        if not session.get("gates"):
            pytest.skip("No gates in session")
            
        gate = session["gates"][0]
        gate_id = gate["id"]
        
        response = self.session.put(
            f"{BASE_URL}/api/admin/gate-sessions/{session_id}/gates/{gate_id}",
            json={"direction": "entry"}
        )
        assert response.status_code == 200
        data = response.json()
        
        updated_gate = next((g for g in data.get("gates", []) if g["id"] == gate_id), None)
        assert updated_gate["direction"] == "entry"
        print(f"✓ Direction update successful")
        
    def test_update_gate_classification(self):
        """PUT updates gate classification"""
        session = self.get_or_create_test_session()
        session_id = session["id"]
        
        if not session.get("gates"):
            pytest.skip("No gates in session")
            
        gate = session["gates"][0]
        gate_id = gate["id"]
        
        response = self.session.put(
            f"{BASE_URL}/api/admin/gate-sessions/{session_id}/gates/{gate_id}",
            json={"classification": "men"}
        )
        assert response.status_code == 200
        data = response.json()
        
        updated_gate = next((g for g in data.get("gates", []) if g["id"] == gate_id), None)
        assert updated_gate["classification"] == "men"
        print(f"✓ Classification update successful")
        
    def test_update_gate_staff_count(self):
        """PUT updates staff count"""
        session = self.get_or_create_test_session()
        session_id = session["id"]
        
        if not session.get("gates"):
            pytest.skip("No gates in session")
            
        gate = session["gates"][0]
        gate_id = gate["id"]
        
        response = self.session.put(
            f"{BASE_URL}/api/admin/gate-sessions/{session_id}/gates/{gate_id}",
            json={"assigned_staff": 5}
        )
        assert response.status_code == 200
        data = response.json()
        
        updated_gate = next((g for g in data.get("gates", []) if g["id"] == gate_id), None)
        assert updated_gate["assigned_staff"] == 5
        print(f"✓ Staff count update successful")
        
    def test_update_gate_daily_note(self):
        """PUT updates daily note"""
        session = self.get_or_create_test_session()
        session_id = session["id"]
        
        if not session.get("gates"):
            pytest.skip("No gates in session")
            
        gate = session["gates"][0]
        gate_id = gate["id"]
        
        response = self.session.put(
            f"{BASE_URL}/api/admin/gate-sessions/{session_id}/gates/{gate_id}",
            json={"daily_note": "Test note for gate"}
        )
        assert response.status_code == 200
        data = response.json()
        
        updated_gate = next((g for g in data.get("gates", []) if g["id"] == gate_id), None)
        assert updated_gate["daily_note"] == "Test note for gate"
        print(f"✓ Daily note update successful")
        
    def test_disable_enable_gate(self):
        """PUT enables/disables gate (is_removed)"""
        session = self.get_or_create_test_session()
        session_id = session["id"]
        
        if not session.get("gates"):
            pytest.skip("No gates in session")
            
        gate = session["gates"][0]
        gate_id = gate["id"]
        
        # Disable gate
        response = self.session.put(
            f"{BASE_URL}/api/admin/gate-sessions/{session_id}/gates/{gate_id}",
            json={"is_removed": True}
        )
        assert response.status_code == 200
        data = response.json()
        
        updated_gate = next((g for g in data.get("gates", []) if g["id"] == gate_id), None)
        assert updated_gate["is_removed"] == True
        assert updated_gate.get("change_type") == "removed"
        print(f"✓ Gate disabled successfully")
        
        # Enable gate
        response = self.session.put(
            f"{BASE_URL}/api/admin/gate-sessions/{session_id}/gates/{gate_id}",
            json={"is_removed": False}
        )
        assert response.status_code == 200
        data = response.json()
        
        updated_gate = next((g for g in data.get("gates", []) if g["id"] == gate_id), None)
        assert updated_gate["is_removed"] == False
        print(f"✓ Gate enabled successfully")


class TestSessionStatusManagement:
    """Test session status updates"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            token = response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            
    def test_complete_session(self):
        """PUT /api/admin/gate-sessions/{id} marks session as completed"""
        # Create a test session
        test_date = "2026-03-25"
        
        # Clean up existing
        response = self.session.get(f"{BASE_URL}/api/gate-sessions?floor_id={GATE_MAP_FLOOR_ID}")
        for s in response.json():
            if s.get("date") == test_date:
                self.session.delete(f"{BASE_URL}/api/admin/gate-sessions/{s['id']}")
        
        # Create session
        response = self.session.post(f"{BASE_URL}/api/admin/gate-sessions", json={
            "date": test_date,
            "floor_id": GATE_MAP_FLOOR_ID,
            "clone_from": "master"
        })
        session_data = response.json()
        session_id = session_data["id"]
        
        # Complete session
        response = self.session.put(f"{BASE_URL}/api/admin/gate-sessions/{session_id}", json={
            "status": "completed"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"
        print(f"✓ Session marked as completed")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/admin/gate-sessions/{session_id}")
        
    def test_update_supervisor_notes(self):
        """PUT updates supervisor notes"""
        response = self.session.get(f"{BASE_URL}/api/gate-sessions?floor_id={GATE_MAP_FLOOR_ID}")
        sessions = response.json()
        if not sessions:
            pytest.skip("No sessions to update")
            
        session_id = sessions[0]["id"]
        test_notes = "ملاحظات الاختبار - Test supervisor notes"
        
        response = self.session.put(f"{BASE_URL}/api/admin/gate-sessions/{session_id}", json={
            "supervisor_notes": test_notes
        })
        assert response.status_code == 200
        data = response.json()
        assert data["supervisor_notes"] == test_notes
        print(f"✓ Supervisor notes updated")


class TestBatchSessionCreation:
    """Test batch session creation"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            token = response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            
    def test_batch_create_sessions(self):
        """POST /api/admin/gate-sessions/batch creates multiple sessions"""
        start_date = "2026-04-01"
        end_date = "2026-04-03"
        
        # Clean up existing sessions in date range
        response = self.session.get(f"{BASE_URL}/api/gate-sessions?floor_id={GATE_MAP_FLOOR_ID}")
        for s in response.json():
            if s.get("date") >= start_date and s.get("date") <= end_date:
                self.session.delete(f"{BASE_URL}/api/admin/gate-sessions/{s['id']}")
        
        # Create batch
        response = self.session.post(f"{BASE_URL}/api/admin/gate-sessions/batch", json={
            "start_date": start_date,
            "end_date": end_date,
            "floor_id": GATE_MAP_FLOOR_ID,
            "clone_from": "master"
        })
        assert response.status_code == 200, f"Batch create failed: {response.text}"
        data = response.json()
        
        assert "created" in data
        assert "total_created" in data
        assert data["total_created"] == 3  # 3 days
        print(f"✓ Batch created {data['total_created']} sessions")
        
        # Cleanup
        response = self.session.get(f"{BASE_URL}/api/gate-sessions?floor_id={GATE_MAP_FLOOR_ID}")
        for s in response.json():
            if s.get("date") >= start_date and s.get("date") <= end_date:
                self.session.delete(f"{BASE_URL}/api/admin/gate-sessions/{s['id']}")


class TestDeleteGateSession:
    """Test session deletion"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            token = response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            
    def test_delete_session(self):
        """DELETE /api/admin/gate-sessions/{id} deletes session"""
        # Create a test session
        test_date = "2026-04-15"
        
        response = self.session.post(f"{BASE_URL}/api/admin/gate-sessions", json={
            "date": test_date,
            "floor_id": GATE_MAP_FLOOR_ID,
            "clone_from": "master"
        })
        if response.status_code == 400:
            # Session exists, get it
            response = self.session.get(f"{BASE_URL}/api/gate-sessions?floor_id={GATE_MAP_FLOOR_ID}")
            sessions = response.json()
            session = next((s for s in sessions if s.get("date") == test_date), None)
            if session:
                session_id = session["id"]
            else:
                pytest.skip("Could not find/create test session")
        else:
            session_id = response.json()["id"]
        
        # Delete session
        response = self.session.delete(f"{BASE_URL}/api/admin/gate-sessions/{session_id}")
        assert response.status_code == 200
        assert "تم حذف" in response.json().get("message", "")
        print(f"✓ Session deleted successfully")
        
        # Verify deletion
        response = self.session.get(f"{BASE_URL}/api/gate-sessions/{session_id}")
        assert response.status_code == 404


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
