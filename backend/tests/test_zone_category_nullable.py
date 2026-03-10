"""
Test suite for zone category PUT endpoint with nullable pattern fields.
Tests: NULLABLE_FIELDS (pattern_type, pattern_fg_color, pattern_bg_color) can be set to null via PUT.
Also verifies fresh fetch behavior for onSelectSession.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# ======== Auth helpers ========
ADMIN_EMAIL = "admin@crowd.sa"
ADMIN_PASSWORD = "admin123"

@pytest.fixture(scope="module")
def auth_token():
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    data = resp.json()
    return data["access_token"]

@pytest.fixture(scope="module")
def auth_headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}

# ======== Helper: get first zone category ========
def get_first_category(auth_headers):
    resp = requests.get(f"{BASE_URL}/api/admin/zone-categories", headers=auth_headers)
    assert resp.status_code == 200
    cats = resp.json()
    assert len(cats) > 0, "No zone categories found"
    return cats[0]


class TestZoneCategoryNullableFields:
    """Tests for PUT /api/admin/zone-categories/{id} with nullable pattern fields"""

    def test_put_zone_category_with_pattern_type_null(self, auth_headers):
        """PUT with fill_type='solid' and explicit pattern_type=null should save null in DB"""
        cat = get_first_category(auth_headers)
        cat_id = cat["id"]
        
        # First set a pattern on the category
        set_pattern_resp = requests.put(
            f"{BASE_URL}/api/admin/zone-categories/{cat_id}",
            json={
                "fill_type": "pattern",
                "pattern_type": "diagonal_lines",
                "pattern_fg_color": "#ff0000",
                "pattern_bg_color": "#0000ff"
            },
            headers=auth_headers
        )
        assert set_pattern_resp.status_code == 200, f"Failed to set pattern: {set_pattern_resp.text}"
        
        # Verify pattern was set
        after_set = set_pattern_resp.json()
        assert after_set.get("fill_type") == "pattern", "fill_type should be pattern"
        assert after_set.get("pattern_type") == "diagonal_lines", "pattern_type should be set"
        
        # Now clear pattern by sending fill_type='solid' with pattern_type=null
        clear_resp = requests.put(
            f"{BASE_URL}/api/admin/zone-categories/{cat_id}",
            json={
                "fill_type": "solid",
                "pattern_type": None,
                "pattern_fg_color": None,
                "pattern_bg_color": None
            },
            headers=auth_headers
        )
        assert clear_resp.status_code == 200, f"Failed to clear pattern: {clear_resp.text}"
        
        after_clear = clear_resp.json()
        assert after_clear.get("fill_type") == "solid", "fill_type should be solid"
        assert after_clear.get("pattern_type") is None, f"pattern_type should be null, got: {after_clear.get('pattern_type')}"
        print(f"PASS: pattern_type correctly saved as null: {after_clear.get('pattern_type')}")

    def test_put_zone_category_pattern_null_persists_in_db(self, auth_headers):
        """After PUT with pattern_type=null, GET should return pattern_type=null"""
        cat = get_first_category(auth_headers)
        cat_id = cat["id"]
        
        # Set pattern first
        requests.put(
            f"{BASE_URL}/api/admin/zone-categories/{cat_id}",
            json={
                "fill_type": "pattern",
                "pattern_type": "dots",
                "pattern_fg_color": "#000000",
                "pattern_bg_color": "#ffffff"
            },
            headers=auth_headers
        )
        
        # Clear pattern
        requests.put(
            f"{BASE_URL}/api/admin/zone-categories/{cat_id}",
            json={
                "fill_type": "solid",
                "pattern_type": None,
                "pattern_fg_color": None,
                "pattern_bg_color": None
            },
            headers=auth_headers
        )
        
        # GET to verify DB persistence
        get_resp = requests.get(f"{BASE_URL}/api/admin/zone-categories", headers=auth_headers)
        assert get_resp.status_code == 200
        cats = get_resp.json()
        found = next((c for c in cats if c["id"] == cat_id), None)
        assert found is not None
        assert found.get("fill_type") == "solid", f"Expected solid fill_type, got: {found.get('fill_type')}"
        assert found.get("pattern_type") is None, f"Expected null pattern_type, got: {found.get('pattern_type')}"
        print(f"PASS: DB persistence verified - pattern_type={found.get('pattern_type')}, fill_type={found.get('fill_type')}")

    def test_put_zone_category_with_only_color_update(self, auth_headers):
        """PUT with only color update should return 200 and maintain other fields"""
        cat = get_first_category(auth_headers)
        cat_id = cat["id"]
        
        original_color = cat.get("color", "#22c55e")
        new_color = "#ff5733"
        
        resp = requests.put(
            f"{BASE_URL}/api/admin/zone-categories/{cat_id}",
            json={"color": new_color},
            headers=auth_headers
        )
        assert resp.status_code == 200, f"Failed to update color: {resp.text}"
        
        data = resp.json()
        assert data.get("color") == new_color, f"Expected {new_color}, got: {data.get('color')}"
        assert "id" in data
        
        # Restore original color
        requests.put(f"{BASE_URL}/api/admin/zone-categories/{cat_id}", json={"color": original_color}, headers=auth_headers)
        print(f"PASS: Color update returned 200 with correct value: {data.get('color')}")

    def test_put_zone_category_not_found_returns_404(self, auth_headers):
        """PUT with invalid category ID should return 404"""
        resp = requests.put(
            f"{BASE_URL}/api/admin/zone-categories/nonexistent-id-12345",
            json={"color": "#ff0000"},
            headers=auth_headers
        )
        assert resp.status_code == 404, f"Expected 404 for invalid ID, got: {resp.status_code}"
        print(f"PASS: 404 returned for invalid category ID")

    def test_get_zone_categories_public(self):
        """GET /api/zone-categories should return active categories without auth"""
        resp = requests.get(f"{BASE_URL}/api/zone-categories")
        assert resp.status_code == 200
        cats = resp.json()
        assert isinstance(cats, list)
        assert len(cats) > 0
        # Verify no _id field in response
        for cat in cats:
            assert "_id" not in cat, "MongoDB _id should not be in response"
        print(f"PASS: GET zone-categories returned {len(cats)} categories")


class TestMapSessionFreshFetch:
    """Tests for verifying fresh fetch from API when selecting session"""

    def test_get_map_session_by_id(self, auth_headers):
        """GET /api/map-sessions/{id} should return session data"""
        # First get list of sessions
        resp = requests.get(f"{BASE_URL}/api/map-sessions?limit=5", headers=auth_headers)
        assert resp.status_code == 200, f"Failed to get sessions: {resp.text}"
        sessions = resp.json()
        
        if not sessions:
            pytest.skip("No sessions available for testing")
        
        # Test fresh fetch of a specific session
        session_id = sessions[0]["id"]
        get_resp = requests.get(f"{BASE_URL}/api/map-sessions/{session_id}", headers=auth_headers)
        assert get_resp.status_code == 200, f"Failed to get session by ID: {get_resp.text}"
        
        data = get_resp.json()
        assert data["id"] == session_id, "Session ID should match"
        assert "zones" in data, "Session should have zones"
        assert "_id" not in data, "MongoDB _id should not be in response"
        print(f"PASS: Fresh fetch of session {session_id} returned {len(data.get('zones', []))} zones")

    def test_zone_style_propagation_on_category_update(self, auth_headers):
        """After PUT category, zones in sessions should have updated style"""
        # Get a category
        cats_resp = requests.get(f"{BASE_URL}/api/admin/zone-categories", headers=auth_headers)
        assert cats_resp.status_code == 200
        cats = cats_resp.json()
        
        if not cats:
            pytest.skip("No categories available")
        
        cat = cats[0]
        cat_id = cat["id"]
        cat_value = cat["value"]
        original_color = cat.get("color", "#22c55e")
        
        # Update category color
        test_color = "#123456"
        update_resp = requests.put(
            f"{BASE_URL}/api/admin/zone-categories/{cat_id}",
            json={"color": test_color},
            headers=auth_headers
        )
        assert update_resp.status_code == 200
        
        # Now check if sessions with this zone_type have updated style
        sessions_resp = requests.get(f"{BASE_URL}/api/map-sessions?limit=5", headers=auth_headers)
        if sessions_resp.status_code == 200 and sessions_resp.json():
            session_id = sessions_resp.json()[0]["id"]
            session_resp = requests.get(f"{BASE_URL}/api/map-sessions/{session_id}", headers=auth_headers)
            if session_resp.status_code == 200:
                session = session_resp.json()
                for zone in session.get("zones", []):
                    if zone.get("zone_type") == cat_value:
                        assert zone.get("fill_color") == test_color, f"Zone fill_color should be {test_color}, got: {zone.get('fill_color')}"
                        print(f"PASS: Zone {zone.get('zone_code')} fill_color updated to {test_color}")
                        break
        
        # Restore original color
        requests.put(
            f"{BASE_URL}/api/admin/zone-categories/{cat_id}",
            json={"color": original_color},
            headers=auth_headers
        )
        print(f"PASS: Zone style propagation test completed")
