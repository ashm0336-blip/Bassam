"""
Test cases for Capacity Calculator feature in Daily Map Sessions
Tests the area_sqm, per_person_sqm, and max_capacity fields in zone updates
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestCapacityCalculatorBackend:
    """Test capacity calculator related backend APIs"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup auth and get session/zone IDs"""
        # Login
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@crowd.sa",
            "password": "admin123"
        })
        assert login_res.status_code == 200, "Login failed"
        self.token = login_res.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        # Get basement floor ID
        floors_res = requests.get(f"{BASE_URL}/api/floors")
        assert floors_res.status_code == 200, "Failed to get floors"
        floors = floors_res.json()
        self.basement_floor = next((f for f in floors if "بدروم" in f.get("name_ar", "")), None)
        assert self.basement_floor, "Basement floor not found"
        
        # Get session with TEST-ZONE-1
        sessions_res = requests.get(f"{BASE_URL}/api/map-sessions?floor_id={self.basement_floor['id']}")
        assert sessions_res.status_code == 200, "Failed to get sessions"
        sessions = sessions_res.json()
        
        # Find session with TEST-ZONE-1
        for session in sessions:
            for zone in session.get("zones", []):
                if zone.get("zone_code") == "TEST-ZONE-1":
                    self.session_id = session["id"]
                    self.zone_id = zone["id"]
                    return
        
        pytest.skip("TEST-ZONE-1 not found - create it first")
    
    def test_zone_has_area_sqm_field(self):
        """Test that zone has area_sqm field"""
        session_res = requests.get(f"{BASE_URL}/api/map-sessions/{self.session_id}")
        assert session_res.status_code == 200
        
        session = session_res.json()
        zone = next((z for z in session.get("zones", []) if z["id"] == self.zone_id), None)
        assert zone is not None, "Zone not found"
        assert "area_sqm" in zone, "area_sqm field missing from zone"
    
    def test_zone_has_per_person_sqm_field(self):
        """Test that zone has per_person_sqm field"""
        session_res = requests.get(f"{BASE_URL}/api/map-sessions/{self.session_id}")
        assert session_res.status_code == 200
        
        session = session_res.json()
        zone = next((z for z in session.get("zones", []) if z["id"] == self.zone_id), None)
        assert zone is not None, "Zone not found"
        assert "per_person_sqm" in zone, "per_person_sqm field missing from zone"
    
    def test_zone_has_max_capacity_field(self):
        """Test that zone has max_capacity field"""
        session_res = requests.get(f"{BASE_URL}/api/map-sessions/{self.session_id}")
        assert session_res.status_code == 200
        
        session = session_res.json()
        zone = next((z for z in session.get("zones", []) if z["id"] == self.zone_id), None)
        assert zone is not None, "Zone not found"
        assert "max_capacity" in zone, "max_capacity field missing from zone"
    
    def test_update_zone_area_sqm(self):
        """Test updating zone area_sqm via API"""
        update_data = {"area_sqm": 1500}
        res = requests.put(
            f"{BASE_URL}/api/admin/map-sessions/{self.session_id}/zones/{self.zone_id}",
            json=update_data,
            headers=self.headers
        )
        assert res.status_code == 200, f"Update failed: {res.text}"
        
        # Verify update persisted
        session_res = requests.get(f"{BASE_URL}/api/map-sessions/{self.session_id}")
        session = session_res.json()
        zone = next((z for z in session.get("zones", []) if z["id"] == self.zone_id), None)
        assert zone["area_sqm"] == 1500, f"area_sqm not updated, got {zone.get('area_sqm')}"
    
    def test_update_zone_per_person_sqm(self):
        """Test updating zone per_person_sqm via API"""
        update_data = {"per_person_sqm": 1.2}
        res = requests.put(
            f"{BASE_URL}/api/admin/map-sessions/{self.session_id}/zones/{self.zone_id}",
            json=update_data,
            headers=self.headers
        )
        assert res.status_code == 200, f"Update failed: {res.text}"
        
        # Verify update persisted
        session_res = requests.get(f"{BASE_URL}/api/map-sessions/{self.session_id}")
        session = session_res.json()
        zone = next((z for z in session.get("zones", []) if z["id"] == self.zone_id), None)
        assert zone["per_person_sqm"] == 1.2, f"per_person_sqm not updated, got {zone.get('per_person_sqm')}"
    
    def test_update_zone_max_capacity(self):
        """Test updating zone max_capacity via API"""
        update_data = {"max_capacity": 1250}
        res = requests.put(
            f"{BASE_URL}/api/admin/map-sessions/{self.session_id}/zones/{self.zone_id}",
            json=update_data,
            headers=self.headers
        )
        assert res.status_code == 200, f"Update failed: {res.text}"
        
        # Verify update persisted
        session_res = requests.get(f"{BASE_URL}/api/map-sessions/{self.session_id}")
        session = session_res.json()
        zone = next((z for z in session.get("zones", []) if z["id"] == self.zone_id), None)
        assert zone["max_capacity"] == 1250, f"max_capacity not updated, got {zone.get('max_capacity')}"
    
    def test_update_zone_all_capacity_fields_together(self):
        """Test updating area_sqm, per_person_sqm, and max_capacity together"""
        # Test with: area=1000, per_person=0.9, capacity should be ~1111
        update_data = {
            "area_sqm": 1000,
            "per_person_sqm": 0.9,
            "max_capacity": 1111
        }
        res = requests.put(
            f"{BASE_URL}/api/admin/map-sessions/{self.session_id}/zones/{self.zone_id}",
            json=update_data,
            headers=self.headers
        )
        assert res.status_code == 200, f"Update failed: {res.text}"
        
        # Verify all fields updated
        session_res = requests.get(f"{BASE_URL}/api/map-sessions/{self.session_id}")
        session = session_res.json()
        zone = next((z for z in session.get("zones", []) if z["id"] == self.zone_id), None)
        
        assert zone["area_sqm"] == 1000, f"area_sqm mismatch: {zone.get('area_sqm')}"
        assert zone["per_person_sqm"] == 0.9, f"per_person_sqm mismatch: {zone.get('per_person_sqm')}"
        assert zone["max_capacity"] == 1111, f"max_capacity mismatch: {zone.get('max_capacity')}"
    
    def test_update_zone_current_count(self):
        """Test updating zone current_count via API"""
        update_data = {"current_count": 500}
        res = requests.put(
            f"{BASE_URL}/api/admin/map-sessions/{self.session_id}/zones/{self.zone_id}",
            json=update_data,
            headers=self.headers
        )
        assert res.status_code == 200, f"Update failed: {res.text}"
        
        # Verify update persisted
        session_res = requests.get(f"{BASE_URL}/api/map-sessions/{self.session_id}")
        session = session_res.json()
        zone = next((z for z in session.get("zones", []) if z["id"] == self.zone_id), None)
        assert zone["current_count"] == 500, f"current_count not updated, got {zone.get('current_count')}"
    
    def test_density_batch_update_with_current_count(self):
        """Test batch update of density (current_count) via API"""
        update_data = {
            "updates": [
                {"zone_id": self.zone_id, "current_count": 750}
            ]
        }
        res = requests.put(
            f"{BASE_URL}/api/admin/map-sessions/{self.session_id}/density-batch",
            json=update_data,
            headers=self.headers
        )
        assert res.status_code == 200, f"Batch update failed: {res.text}"
        
        # Verify update persisted
        session_res = requests.get(f"{BASE_URL}/api/map-sessions/{self.session_id}")
        session = session_res.json()
        zone = next((z for z in session.get("zones", []) if z["id"] == self.zone_id), None)
        assert zone["current_count"] == 750, f"current_count not updated in batch, got {zone.get('current_count')}"


class TestSessionZoneUpdateModel:
    """Test SessionZoneUpdate model accepts all required fields"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup auth"""
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@crowd.sa",
            "password": "admin123"
        })
        assert login_res.status_code == 200
        self.token = login_res.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        # Get any session with zones
        floors_res = requests.get(f"{BASE_URL}/api/floors")
        floors = floors_res.json()
        
        for floor in floors:
            sessions_res = requests.get(f"{BASE_URL}/api/map-sessions?floor_id={floor['id']}")
            sessions = sessions_res.json()
            for session in sessions:
                if session.get("zones"):
                    self.session_id = session["id"]
                    self.zone_id = session["zones"][0]["id"]
                    return
        
        pytest.skip("No sessions with zones found")
    
    def test_model_accepts_area_sqm(self):
        """Verify SessionZoneUpdate model accepts area_sqm field"""
        res = requests.put(
            f"{BASE_URL}/api/admin/map-sessions/{self.session_id}/zones/{self.zone_id}",
            json={"area_sqm": 500.5},
            headers=self.headers
        )
        # Should not return 422 validation error
        assert res.status_code != 422, "area_sqm field rejected by API model"
        assert res.status_code == 200
    
    def test_model_accepts_per_person_sqm(self):
        """Verify SessionZoneUpdate model accepts per_person_sqm field"""
        res = requests.put(
            f"{BASE_URL}/api/admin/map-sessions/{self.session_id}/zones/{self.zone_id}",
            json={"per_person_sqm": 0.75},
            headers=self.headers
        )
        # Should not return 422 validation error
        assert res.status_code != 422, "per_person_sqm field rejected by API model"
        assert res.status_code == 200
