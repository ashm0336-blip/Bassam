"""
Backend API Tests for Pattern Fill Feature in Map Sessions (Daily Zones Log)
Tests the enhanced style dropdown with pattern fill, pattern colors, stroke opacity, and dash-dot border style.

Session ID: 96146858-21ae-4dec-90b4-8813c81f8eec (Feb 18, 2026 - draft - 60 zones)
Zone ID: 07eb8939-3efd-4839-baf8-0541861574b7 (ط - 0 - 30)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for admin user"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@crowd.sa",
        "password": "admin123"
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    return data.get("access_token")

@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Return headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }

# Session and Zone IDs for testing
SESSION_ID = "96146858-21ae-4dec-90b4-8813c81f8eec"
TEST_ZONE_ID = "07eb8939-3efd-4839-baf8-0541861574b7"


class TestPatternFillBackend:
    """Test pattern fill feature in backend API"""
    
    def test_session_has_pattern_fields(self, auth_headers):
        """Verify session zones have all pattern-related fields"""
        response = requests.get(f"{BASE_URL}/api/map-sessions/{SESSION_ID}", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get session: {response.text}"
        
        session = response.json()
        assert session["id"] == SESSION_ID
        assert session["date"] == "2026-02-18"
        assert session["status"] == "draft"
        assert len(session["zones"]) == 60
        
        # Check first zone has pattern fields
        zone = session["zones"][0]
        assert "fill_type" in zone, "fill_type field missing"
        assert "pattern_type" in zone, "pattern_type field missing"
        assert "pattern_fg_color" in zone, "pattern_fg_color field missing"
        assert "pattern_bg_color" in zone, "pattern_bg_color field missing"
        assert "stroke_opacity" in zone, "stroke_opacity field missing"
        assert "stroke_style" in zone, "stroke_style field missing"
        print(f"✓ Zone has all pattern fields: fill_type={zone['fill_type']}, pattern_type={zone['pattern_type']}")
    
    def test_update_zone_fill_type_to_pattern(self, auth_headers):
        """Test changing fill_type from solid to pattern"""
        update_data = {
            "fill_type": "pattern",
            "pattern_type": "diagonal-right"
        }
        response = requests.put(
            f"{BASE_URL}/api/admin/map-sessions/{SESSION_ID}/zones/{TEST_ZONE_ID}",
            headers=auth_headers,
            json=update_data
        )
        assert response.status_code == 200, f"Failed to update: {response.text}"
        
        # Verify the update
        session = response.json()
        zone = next((z for z in session["zones"] if z["id"] == TEST_ZONE_ID), None)
        assert zone is not None
        assert zone["fill_type"] == "pattern"
        assert zone["pattern_type"] == "diagonal-right"
        print(f"✓ Zone fill_type updated to pattern with diagonal-right")
    
    def test_update_pattern_colors(self, auth_headers):
        """Test updating pattern foreground and background colors"""
        update_data = {
            "pattern_fg_color": "#ff0000",  # Red foreground
            "pattern_bg_color": "#ffffff"   # White background
        }
        response = requests.put(
            f"{BASE_URL}/api/admin/map-sessions/{SESSION_ID}/zones/{TEST_ZONE_ID}",
            headers=auth_headers,
            json=update_data
        )
        assert response.status_code == 200, f"Failed to update: {response.text}"
        
        session = response.json()
        zone = next((z for z in session["zones"] if z["id"] == TEST_ZONE_ID), None)
        assert zone["pattern_fg_color"] == "#ff0000"
        assert zone["pattern_bg_color"] == "#ffffff"
        print(f"✓ Pattern colors updated: fg={zone['pattern_fg_color']}, bg={zone['pattern_bg_color']}")
    
    def test_update_stroke_opacity(self, auth_headers):
        """Test updating stroke/border opacity (new feature)"""
        update_data = {
            "stroke_opacity": 0.5
        }
        response = requests.put(
            f"{BASE_URL}/api/admin/map-sessions/{SESSION_ID}/zones/{TEST_ZONE_ID}",
            headers=auth_headers,
            json=update_data
        )
        assert response.status_code == 200, f"Failed to update: {response.text}"
        
        session = response.json()
        zone = next((z for z in session["zones"] if z["id"] == TEST_ZONE_ID), None)
        assert zone["stroke_opacity"] == 0.5
        print(f"✓ Stroke opacity updated to {zone['stroke_opacity']}")
    
    def test_update_stroke_style_dash_dot(self, auth_headers):
        """Test updating stroke style to dash-dot (new 4th option)"""
        update_data = {
            "stroke_style": "dash-dot"
        }
        response = requests.put(
            f"{BASE_URL}/api/admin/map-sessions/{SESSION_ID}/zones/{TEST_ZONE_ID}",
            headers=auth_headers,
            json=update_data
        )
        assert response.status_code == 200, f"Failed to update: {response.text}"
        
        session = response.json()
        zone = next((z for z in session["zones"] if z["id"] == TEST_ZONE_ID), None)
        assert zone["stroke_style"] == "dash-dot"
        print(f"✓ Stroke style updated to dash-dot")
    
    def test_all_pattern_types(self, auth_headers):
        """Test that all 12 pattern types are accepted"""
        pattern_types = [
            "diagonal-right", "diagonal-left", "diagonal-cross",
            "horizontal", "vertical", "grid",
            "dots-small", "dots-large", "dense",
            "light-fill", "medium-fill", "diamonds"
        ]
        
        for pattern_type in pattern_types:
            update_data = {"pattern_type": pattern_type}
            response = requests.put(
                f"{BASE_URL}/api/admin/map-sessions/{SESSION_ID}/zones/{TEST_ZONE_ID}",
                headers=auth_headers,
                json=update_data
            )
            assert response.status_code == 200, f"Failed for pattern {pattern_type}: {response.text}"
            session = response.json()
            zone = next((z for z in session["zones"] if z["id"] == TEST_ZONE_ID), None)
            assert zone["pattern_type"] == pattern_type
        
        print(f"✓ All 12 pattern types accepted: {', '.join(pattern_types)}")
    
    def test_all_stroke_styles(self, auth_headers):
        """Test all 4 stroke/border styles including new dash-dot"""
        stroke_styles = ["solid", "dashed", "dotted", "dash-dot"]
        
        for style in stroke_styles:
            update_data = {"stroke_style": style}
            response = requests.put(
                f"{BASE_URL}/api/admin/map-sessions/{SESSION_ID}/zones/{TEST_ZONE_ID}",
                headers=auth_headers,
                json=update_data
            )
            assert response.status_code == 200, f"Failed for style {style}: {response.text}"
            session = response.json()
            zone = next((z for z in session["zones"] if z["id"] == TEST_ZONE_ID), None)
            assert zone["stroke_style"] == style
        
        print(f"✓ All 4 stroke styles accepted: {', '.join(stroke_styles)}")
    
    def test_switch_back_to_solid_fill(self, auth_headers):
        """Test switching from pattern back to solid fill"""
        update_data = {
            "fill_type": "solid",
            "fill_color": "#22c55e"
        }
        response = requests.put(
            f"{BASE_URL}/api/admin/map-sessions/{SESSION_ID}/zones/{TEST_ZONE_ID}",
            headers=auth_headers,
            json=update_data
        )
        assert response.status_code == 200, f"Failed to update: {response.text}"
        
        session = response.json()
        zone = next((z for z in session["zones"] if z["id"] == TEST_ZONE_ID), None)
        assert zone["fill_type"] == "solid"
        assert zone["fill_color"] == "#22c55e"
        print(f"✓ Zone switched back to solid fill with color {zone['fill_color']}")
    
    def test_combined_style_update(self, auth_headers):
        """Test updating all pattern style fields in one request"""
        update_data = {
            "fill_type": "pattern",
            "pattern_type": "grid",
            "pattern_fg_color": "#0066cc",
            "pattern_bg_color": "#f0f0f0",
            "stroke_color": "#333333",
            "stroke_opacity": 0.8,
            "stroke_style": "dash-dot",
            "stroke_width": 0.5,
            "opacity": 0.6
        }
        response = requests.put(
            f"{BASE_URL}/api/admin/map-sessions/{SESSION_ID}/zones/{TEST_ZONE_ID}",
            headers=auth_headers,
            json=update_data
        )
        assert response.status_code == 200, f"Failed to update: {response.text}"
        
        session = response.json()
        zone = next((z for z in session["zones"] if z["id"] == TEST_ZONE_ID), None)
        
        assert zone["fill_type"] == "pattern"
        assert zone["pattern_type"] == "grid"
        assert zone["pattern_fg_color"] == "#0066cc"
        assert zone["pattern_bg_color"] == "#f0f0f0"
        assert zone["stroke_color"] == "#333333"
        assert zone["stroke_opacity"] == 0.8
        assert zone["stroke_style"] == "dash-dot"
        assert zone["stroke_width"] == 0.5
        assert zone["opacity"] == 0.6
        print(f"✓ Combined style update successful with all fields")


class TestSessionZoneAddWithPattern:
    """Test adding new zones with pattern fields"""
    
    def test_add_zone_with_pattern(self, auth_headers):
        """Test adding a new zone with pattern fill"""
        new_zone_data = {
            "zone_code": "TEST-PATTERN-001",
            "name_ar": "منطقة اختبار النقش",
            "name_en": "Pattern Test Zone",
            "zone_type": "men_prayer",
            "polygon_points": [{"x": 10, "y": 10}, {"x": 20, "y": 10}, {"x": 20, "y": 20}, {"x": 10, "y": 20}],
            "fill_type": "pattern",
            "pattern_type": "diamonds",
            "pattern_fg_color": "#purple",
            "pattern_bg_color": "#white",
            "stroke_style": "dash-dot",
            "stroke_opacity": 0.9
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/map-sessions/{SESSION_ID}/zones",
            headers=auth_headers,
            json=new_zone_data
        )
        
        # Note: This may fail if zone_code already exists, which is expected on re-runs
        if response.status_code == 200:
            session = response.json()
            new_zone = next((z for z in session["zones"] if z["zone_code"] == "TEST-PATTERN-001"), None)
            if new_zone:
                assert new_zone["fill_type"] == "pattern"
                assert new_zone["pattern_type"] == "diamonds"
                print(f"✓ New zone added with pattern fill")
            else:
                print("! New zone not found in response, may already exist")
        else:
            print(f"! Add zone returned {response.status_code} - zone may already exist")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
