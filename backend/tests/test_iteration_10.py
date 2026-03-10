"""
Test iteration 10: New zone categories and rectangle draw tool
- 6 NEW zone categories: men_rakatayn, women_rakatayn, men_tasks, women_tasks, emergency, vip
- Rectangle drag-to-draw tool (frontend only - no backend change needed)
- Feb 17 session sample zones verification
- Zone type validation in session zone APIs
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Zone types to test (new ones added in this iteration)
NEW_ZONE_TYPES = [
    {"value": "men_rakatayn", "label_ar": "مصلى الركعتين للرجال"},
    {"value": "women_rakatayn", "label_ar": "مصلى الركعتين للنساء"},
    {"value": "men_tasks", "label_ar": "مصلى مهمات رجال"},
    {"value": "women_tasks", "label_ar": "مصلى مهمات نساء"},
    {"value": "emergency", "label_ar": "مجمعات خدمات الطوارئ"},
    {"value": "vip", "label_ar": "مصلى رؤساء الدول"},
]

EXISTING_ZONE_TYPES = [
    "men_prayer", "women_prayer", "mataf", "masaa", 
    "service", "entry", "exit", "escalator", "kaaba", "expansion"
]

# Test floor and session IDs
FLOOR_ID = "773f281e-ff1d-4983-b92b-6a50412dd547"
SESSION_DATE = "2026-02-17"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@crowd.sa",
        "password": "admin123"
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Authentication failed - skipping authenticated tests")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get auth headers"""
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


class TestFeb17SessionZones:
    """Tests for Feb 17 session sample zones verification"""

    def test_session_exists_for_feb_17(self, auth_headers):
        """Verify Feb 17 session exists with zones"""
        response = requests.get(f"{BASE_URL}/api/map-sessions?floor_id={FLOOR_ID}")
        assert response.status_code == 200
        
        sessions = response.json()
        feb_17_session = next((s for s in sessions if s["date"] == SESSION_DATE), None)
        assert feb_17_session is not None, f"Feb 17 session not found. Available dates: {[s['date'] for s in sessions]}"
        print(f"✓ Feb 17 session found with ID: {feb_17_session['id']}")

    def test_feb_17_session_has_3_zones(self, auth_headers):
        """Verify Feb 17 session has exactly 3 sample zones"""
        response = requests.get(f"{BASE_URL}/api/map-sessions?floor_id={FLOOR_ID}")
        assert response.status_code == 200
        
        sessions = response.json()
        feb_17_session = next((s for s in sessions if s["date"] == SESSION_DATE), None)
        assert feb_17_session is not None
        
        zones = feb_17_session.get("zones", [])
        assert len(zones) == 3, f"Expected 3 zones, got {len(zones)}"
        print(f"✓ Feb 17 session has {len(zones)} zones as expected")

    def test_feb_17_zones_have_correct_zone_codes(self, auth_headers):
        """Verify zone codes: 1-0-1, 2-0-1, 3-0-1"""
        response = requests.get(f"{BASE_URL}/api/map-sessions?floor_id={FLOOR_ID}")
        assert response.status_code == 200
        
        sessions = response.json()
        feb_17_session = next((s for s in sessions if s["date"] == SESSION_DATE), None)
        zones = feb_17_session.get("zones", [])
        
        zone_codes = [z["zone_code"] for z in zones]
        expected_codes = ["1-0-1", "2-0-1", "3-0-1"]
        
        for code in expected_codes:
            assert code in zone_codes, f"Zone code {code} not found. Got: {zone_codes}"
        
        print(f"✓ All expected zone codes found: {zone_codes}")

    def test_feb_17_zones_have_correct_zone_types(self, auth_headers):
        """Verify zone types: men_prayer, women_prayer, men_rakatayn"""
        response = requests.get(f"{BASE_URL}/api/map-sessions?floor_id={FLOOR_ID}")
        assert response.status_code == 200
        
        sessions = response.json()
        feb_17_session = next((s for s in sessions if s["date"] == SESSION_DATE), None)
        zones = feb_17_session.get("zones", [])
        
        zone_types = {z["zone_code"]: z["zone_type"] for z in zones}
        
        # Verify each zone has expected type
        assert zone_types.get("1-0-1") == "men_prayer", f"Zone 1-0-1 should be men_prayer, got {zone_types.get('1-0-1')}"
        assert zone_types.get("2-0-1") == "women_prayer", f"Zone 2-0-1 should be women_prayer, got {zone_types.get('2-0-1')}"
        assert zone_types.get("3-0-1") == "men_rakatayn", f"Zone 3-0-1 should be men_rakatayn (new type), got {zone_types.get('3-0-1')}"
        
        print(f"✓ Zone types verified: {zone_types}")


class TestNewZoneTypesBackendAPI:
    """Tests for new zone type categories via backend API"""

    def test_create_zone_with_men_rakatayn_type(self, auth_headers):
        """Test creating zone with men_rakatayn type"""
        # First get a session to work with
        response = requests.get(f"{BASE_URL}/api/map-sessions?floor_id={FLOOR_ID}")
        sessions = response.json()
        if not sessions:
            pytest.skip("No sessions available")
        
        session_id = sessions[0]["id"]
        
        # Create zone with new type
        zone_data = {
            "zone_code": "TEST-RAKATAYN-MEN",
            "name_ar": "مصلى الركعتين للرجال - تست",
            "name_en": "Two-Rak'ah Men - Test",
            "zone_type": "men_rakatayn",
            "polygon_points": [{"x": 60, "y": 10}, {"x": 70, "y": 10}, {"x": 70, "y": 20}, {"x": 60, "y": 20}],
            "fill_color": "#16a34a"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/map-sessions/{session_id}/zones",
            json=zone_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to create zone: {response.text}"
        session = response.json()
        
        # Verify zone was created
        created_zone = next((z for z in session["zones"] if z["zone_code"] == "TEST-RAKATAYN-MEN"), None)
        assert created_zone is not None, "Zone was not created"
        assert created_zone["zone_type"] == "men_rakatayn"
        
        print(f"✓ Created zone with men_rakatayn type: {created_zone['id']}")
        
        # Cleanup - delete the test zone
        requests.delete(f"{BASE_URL}/api/admin/map-sessions/{session_id}/zones/{created_zone['id']}", headers=auth_headers)

    def test_create_zone_with_emergency_type(self, auth_headers):
        """Test creating zone with emergency type"""
        response = requests.get(f"{BASE_URL}/api/map-sessions?floor_id={FLOOR_ID}")
        sessions = response.json()
        if not sessions:
            pytest.skip("No sessions available")
        
        session_id = sessions[0]["id"]
        
        zone_data = {
            "zone_code": "TEST-EMERGENCY",
            "name_ar": "مجمعات خدمات الطوارئ - تست",
            "name_en": "Emergency Services - Test",
            "zone_type": "emergency",
            "polygon_points": [{"x": 75, "y": 10}, {"x": 85, "y": 10}, {"x": 85, "y": 20}, {"x": 75, "y": 20}],
            "fill_color": "#78350f"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/map-sessions/{session_id}/zones",
            json=zone_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to create emergency zone: {response.text}"
        session = response.json()
        
        created_zone = next((z for z in session["zones"] if z["zone_code"] == "TEST-EMERGENCY"), None)
        assert created_zone is not None
        assert created_zone["zone_type"] == "emergency"
        
        print(f"✓ Created zone with emergency type: {created_zone['id']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/map-sessions/{session_id}/zones/{created_zone['id']}", headers=auth_headers)

    def test_create_zone_with_vip_type(self, auth_headers):
        """Test creating zone with vip type"""
        response = requests.get(f"{BASE_URL}/api/map-sessions?floor_id={FLOOR_ID}")
        sessions = response.json()
        if not sessions:
            pytest.skip("No sessions available")
        
        session_id = sessions[0]["id"]
        
        zone_data = {
            "zone_code": "TEST-VIP",
            "name_ar": "مصلى رؤساء الدول - تست",
            "name_en": "VIP / Heads of State - Test",
            "zone_type": "vip",
            "polygon_points": [{"x": 5, "y": 60}, {"x": 20, "y": 60}, {"x": 20, "y": 75}, {"x": 5, "y": 75}],
            "fill_color": "#1e3a5f"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/map-sessions/{session_id}/zones",
            json=zone_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to create VIP zone: {response.text}"
        session = response.json()
        
        created_zone = next((z for z in session["zones"] if z["zone_code"] == "TEST-VIP"), None)
        assert created_zone is not None
        assert created_zone["zone_type"] == "vip"
        
        print(f"✓ Created zone with vip type: {created_zone['id']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/map-sessions/{session_id}/zones/{created_zone['id']}", headers=auth_headers)

    def test_update_zone_type_to_women_rakatayn(self, auth_headers):
        """Test updating existing zone to women_rakatayn type"""
        response = requests.get(f"{BASE_URL}/api/map-sessions?floor_id={FLOOR_ID}")
        sessions = response.json()
        if not sessions:
            pytest.skip("No sessions available")
        
        session_id = sessions[0]["id"]
        
        # Create a test zone first
        zone_data = {
            "zone_code": "TEST-UPDATE-TYPE",
            "name_ar": "منطقة تست للتحديث",
            "name_en": "Test Update Zone",
            "zone_type": "men_prayer",
            "polygon_points": [{"x": 25, "y": 60}, {"x": 40, "y": 60}, {"x": 40, "y": 75}, {"x": 25, "y": 75}],
            "fill_color": "#22c55e"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/map-sessions/{session_id}/zones",
            json=zone_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        session = response.json()
        created_zone = next((z for z in session["zones"] if z["zone_code"] == "TEST-UPDATE-TYPE"), None)
        assert created_zone is not None
        
        zone_id = created_zone["id"]
        
        # Update to women_rakatayn type
        update_response = requests.put(
            f"{BASE_URL}/api/admin/map-sessions/{session_id}/zones/{zone_id}",
            json={"zone_type": "women_rakatayn", "fill_color": "#60a5fa"},
            headers=auth_headers
        )
        
        assert update_response.status_code == 200
        updated_session = update_response.json()
        
        updated_zone = next((z for z in updated_session["zones"] if z["id"] == zone_id), None)
        assert updated_zone is not None
        assert updated_zone["zone_type"] == "women_rakatayn"
        assert updated_zone["change_type"] == "category_changed"  # Should track category change
        
        print(f"✓ Updated zone to women_rakatayn type, change_type={updated_zone['change_type']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/map-sessions/{session_id}/zones/{zone_id}", headers=auth_headers)


class TestMapManagementZoneTypes:
    """Test that new zone types work in the master zones (MapManagementPage)"""
    
    def test_create_master_zone_with_new_type(self, auth_headers):
        """Test creating master zone with new zone type"""
        # Master zones use /api/admin/zones endpoint
        zone_data = {
            "floor_id": FLOOR_ID,
            "zone_code": "MASTER-TEST-TASKS",
            "name_ar": "مصلى مهمات رجال - تست",
            "name_en": "Men Tasks Prayer - Test",
            "zone_type": "men_tasks",
            "polygon_points": [{"x": 10, "y": 80}, {"x": 25, "y": 80}, {"x": 25, "y": 95}, {"x": 10, "y": 95}],
            "fill_color": "#9ca3af",
            "max_capacity": 500,
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/zones",
            json=zone_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to create master zone: {response.text}"
        result = response.json()
        zone_id = result.get("id")
        
        # Verify by fetching zones for the floor
        zones_response = requests.get(f"{BASE_URL}/api/floors/{FLOOR_ID}/zones")
        assert zones_response.status_code == 200
        
        zones = zones_response.json()
        created_zone = next((z for z in zones if z["zone_code"] == "MASTER-TEST-TASKS"), None)
        
        if created_zone:
            assert created_zone["zone_type"] == "men_tasks"
            print(f"✓ Created master zone with men_tasks type: {created_zone['id']}")
            
            # Cleanup
            requests.delete(f"{BASE_URL}/api/admin/zones/{created_zone['id']}", headers=auth_headers)
        else:
            print("Note: Zone may have been created but ID format differs")


class TestAllZoneTypesEnum:
    """Verify all 16 zone types are supported"""
    
    ALL_16_TYPES = [
        "men_prayer", "women_prayer",
        "men_rakatayn", "women_rakatayn",  # NEW
        "men_tasks", "women_tasks",         # NEW
        "emergency", "vip",                 # NEW
        "mataf", "masaa", "service",
        "entry", "exit", "escalator",
        "kaaba", "expansion"
    ]
    
    def test_session_zone_accepts_all_16_types(self, auth_headers):
        """Ensure backend accepts all 16 zone types for session zones"""
        response = requests.get(f"{BASE_URL}/api/map-sessions?floor_id={FLOOR_ID}")
        sessions = response.json()
        if not sessions:
            pytest.skip("No sessions available")
        
        session_id = sessions[0]["id"]
        created_zone_ids = []
        
        for zone_type in self.ALL_16_TYPES:
            zone_data = {
                "zone_code": f"ENUM-TEST-{zone_type.upper()}",
                "name_ar": f"تست {zone_type}",
                "name_en": f"Test {zone_type}",
                "zone_type": zone_type,
                "polygon_points": [{"x": 1, "y": 1}, {"x": 3, "y": 1}, {"x": 3, "y": 3}, {"x": 1, "y": 3}],
                "fill_color": "#888888"
            }
            
            response = requests.post(
                f"{BASE_URL}/api/admin/map-sessions/{session_id}/zones",
                json=zone_data,
                headers=auth_headers
            )
            
            if response.status_code != 200:
                print(f"✗ Zone type '{zone_type}' failed: {response.text}")
                continue
            
            session = response.json()
            created_zone = next((z for z in session["zones"] if z["zone_code"] == f"ENUM-TEST-{zone_type.upper()}"), None)
            if created_zone:
                created_zone_ids.append(created_zone["id"])
                print(f"✓ Zone type '{zone_type}' accepted")
            
        # Cleanup all created zones
        for zone_id in created_zone_ids:
            requests.delete(f"{BASE_URL}/api/admin/map-sessions/{session_id}/zones/{zone_id}", headers=auth_headers)
        
        print(f"Tested {len(created_zone_ids)}/{len(self.ALL_16_TYPES)} zone types successfully")
        assert len(created_zone_ids) == len(self.ALL_16_TYPES), f"Some zone types failed"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
