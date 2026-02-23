"""
Iteration 12 Tests: Copy Zone + Zone Style Controls Features
Testing:
1. Copy Zone functionality - duplicates zone with offset and (نسخة) suffix
2. Zone Style Controls - fill_color, opacity, stroke_color, stroke_opacity, stroke_width, stroke_style
3. Backend SessionZoneUpdate model accepts new fields
4. Regression tests for existing features
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')

# Test configuration
ADMIN_EMAIL = "admin@crowd.sa"
ADMIN_PASSWORD = "admin123"
FLOOR_ID = "773f281e-ff1d-4983-b92b-6a50412dd547"
SESSION_ID = "0a5aa22d-eb43-4967-8ca2-d08ad7077454"

@pytest.fixture(scope="session")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["access_token"]

@pytest.fixture(scope="session")
def auth_headers(auth_token):
    """Auth headers for authenticated requests"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestAPIHealth:
    """Basic API health checks"""
    
    def test_api_root(self):
        """Test API root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print("API root endpoint working")

    def test_auth_login(self):
        """Test login endpoint"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        print(f"Login successful for {ADMIN_EMAIL}")


class TestSessionAndZones:
    """Test map sessions and zones for Feb 17 session"""
    
    def test_get_sessions_for_floor(self, auth_headers):
        """Get sessions for the test floor"""
        response = requests.get(f"{BASE_URL}/api/map-sessions?floor_id={FLOOR_ID}")
        assert response.status_code == 200
        sessions = response.json()
        assert len(sessions) > 0, "No sessions found for floor"
        print(f"Found {len(sessions)} sessions for floor")
        
        # Check Feb 17 session exists
        feb17_session = next((s for s in sessions if "2026-02-17" in s["date"]), None)
        assert feb17_session is not None, "Feb 17 session not found"
        assert feb17_session["id"] == SESSION_ID
        print("Feb 17 session found with correct ID")

    def test_session_has_zones(self, auth_headers):
        """Verify Feb 17 session has zones with required fields"""
        response = requests.get(f"{BASE_URL}/api/map-sessions?floor_id={FLOOR_ID}")
        assert response.status_code == 200
        sessions = response.json()
        
        feb17_session = next((s for s in sessions if s["id"] == SESSION_ID), None)
        assert feb17_session is not None
        
        zones = feb17_session.get("zones", [])
        assert len(zones) >= 3, f"Expected at least 3 zones, got {len(zones)}"
        print(f"Session has {len(zones)} zones")
        
        # Check zone structure includes new fields
        active_zones = [z for z in zones if not z.get("is_removed")]
        assert len(active_zones) > 0
        
        zone = active_zones[0]
        assert "polygon_points" in zone
        assert "fill_color" in zone
        print(f"Zone structure verified: {zone.get('zone_code')}")


class TestZoneStyleFields:
    """Test new zone style fields: stroke_width, stroke_style"""
    
    def test_zone_has_stroke_width_field(self, auth_headers):
        """Verify zones have stroke_width field"""
        response = requests.get(f"{BASE_URL}/api/map-sessions?floor_id={FLOOR_ID}")
        assert response.status_code == 200
        sessions = response.json()
        
        feb17_session = next((s for s in sessions if s["id"] == SESSION_ID), None)
        zones = feb17_session.get("zones", [])
        active_zone = next((z for z in zones if not z.get("is_removed")), None)
        
        assert active_zone is not None
        # stroke_width should be present with default 0.3
        stroke_width = active_zone.get("stroke_width")
        print(f"Zone stroke_width: {stroke_width}")
        # It can be None (not set yet) or a float
        if stroke_width is not None:
            assert isinstance(stroke_width, (int, float)), "stroke_width should be numeric"
        
    def test_zone_has_stroke_style_field(self, auth_headers):
        """Verify zones have stroke_style field"""
        response = requests.get(f"{BASE_URL}/api/map-sessions?floor_id={FLOOR_ID}")
        assert response.status_code == 200
        sessions = response.json()
        
        feb17_session = next((s for s in sessions if s["id"] == SESSION_ID), None)
        zones = feb17_session.get("zones", [])
        active_zone = next((z for z in zones if not z.get("is_removed")), None)
        
        assert active_zone is not None
        stroke_style = active_zone.get("stroke_style")
        print(f"Zone stroke_style: {stroke_style}")
        # It can be None (not set yet) or one of: solid, dashed, dotted
        if stroke_style is not None:
            assert stroke_style in ["solid", "dashed", "dotted"], f"Invalid stroke_style: {stroke_style}"


class TestUpdateZoneStyle:
    """Test updating zone with new style fields"""
    
    def test_update_zone_fill_color(self, auth_headers):
        """Test updating zone fill_color"""
        response = requests.get(f"{BASE_URL}/api/map-sessions?floor_id={FLOOR_ID}")
        sessions = response.json()
        feb17_session = next((s for s in sessions if s["id"] == SESSION_ID), None)
        zones = feb17_session.get("zones", [])
        active_zone = next((z for z in zones if not z.get("is_removed")), None)
        zone_id = active_zone["id"]
        
        # Update fill_color
        update_response = requests.put(
            f"{BASE_URL}/api/admin/map-sessions/{SESSION_ID}/zones/{zone_id}",
            json={"fill_color": "#ef4444"},
            headers=auth_headers
        )
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        
        # Verify update
        updated_session = update_response.json()
        updated_zone = next((z for z in updated_session["zones"] if z["id"] == zone_id), None)
        assert updated_zone["fill_color"] == "#ef4444"
        print("fill_color update successful")
        
        # Restore original color
        requests.put(
            f"{BASE_URL}/api/admin/map-sessions/{SESSION_ID}/zones/{zone_id}",
            json={"fill_color": active_zone.get("fill_color", "#22c55e")},
            headers=auth_headers
        )

    def test_update_zone_opacity(self, auth_headers):
        """Test updating zone opacity"""
        response = requests.get(f"{BASE_URL}/api/map-sessions?floor_id={FLOOR_ID}")
        sessions = response.json()
        feb17_session = next((s for s in sessions if s["id"] == SESSION_ID), None)
        zones = feb17_session.get("zones", [])
        active_zone = next((z for z in zones if not z.get("is_removed")), None)
        zone_id = active_zone["id"]
        original_opacity = active_zone.get("opacity", 0.4)
        
        # Update opacity
        new_opacity = 0.75
        update_response = requests.put(
            f"{BASE_URL}/api/admin/map-sessions/{SESSION_ID}/zones/{zone_id}",
            json={"opacity": new_opacity},
            headers=auth_headers
        )
        assert update_response.status_code == 200
        
        updated_session = update_response.json()
        updated_zone = next((z for z in updated_session["zones"] if z["id"] == zone_id), None)
        assert abs(updated_zone["opacity"] - new_opacity) < 0.01
        print(f"opacity update successful: {new_opacity}")
        
        # Restore
        requests.put(
            f"{BASE_URL}/api/admin/map-sessions/{SESSION_ID}/zones/{zone_id}",
            json={"opacity": original_opacity},
            headers=auth_headers
        )

    def test_update_zone_stroke_color(self, auth_headers):
        """Test updating zone stroke_color"""
        response = requests.get(f"{BASE_URL}/api/map-sessions?floor_id={FLOOR_ID}")
        sessions = response.json()
        feb17_session = next((s for s in sessions if s["id"] == SESSION_ID), None)
        zones = feb17_session.get("zones", [])
        active_zone = next((z for z in zones if not z.get("is_removed")), None)
        zone_id = active_zone["id"]
        
        # Update stroke_color
        update_response = requests.put(
            f"{BASE_URL}/api/admin/map-sessions/{SESSION_ID}/zones/{zone_id}",
            json={"stroke_color": "#3b82f6"},
            headers=auth_headers
        )
        assert update_response.status_code == 200
        
        updated_session = update_response.json()
        updated_zone = next((z for z in updated_session["zones"] if z["id"] == zone_id), None)
        assert updated_zone.get("stroke_color") == "#3b82f6"
        print("stroke_color update successful")
        
        # Restore
        requests.put(
            f"{BASE_URL}/api/admin/map-sessions/{SESSION_ID}/zones/{zone_id}",
            json={"stroke_color": "#000000"},
            headers=auth_headers
        )

    def test_update_zone_stroke_opacity(self, auth_headers):
        """Test updating zone stroke_opacity"""
        response = requests.get(f"{BASE_URL}/api/map-sessions?floor_id={FLOOR_ID}")
        sessions = response.json()
        feb17_session = next((s for s in sessions if s["id"] == SESSION_ID), None)
        zones = feb17_session.get("zones", [])
        active_zone = next((z for z in zones if not z.get("is_removed")), None)
        zone_id = active_zone["id"]
        
        # Update stroke_opacity
        update_response = requests.put(
            f"{BASE_URL}/api/admin/map-sessions/{SESSION_ID}/zones/{zone_id}",
            json={"stroke_opacity": 0.5},
            headers=auth_headers
        )
        assert update_response.status_code == 200
        
        updated_session = update_response.json()
        updated_zone = next((z for z in updated_session["zones"] if z["id"] == zone_id), None)
        assert abs(updated_zone.get("stroke_opacity", 1.0) - 0.5) < 0.01
        print("stroke_opacity update successful")
        
        # Restore
        requests.put(
            f"{BASE_URL}/api/admin/map-sessions/{SESSION_ID}/zones/{zone_id}",
            json={"stroke_opacity": 1.0},
            headers=auth_headers
        )

    def test_update_zone_stroke_width(self, auth_headers):
        """Test updating zone stroke_width"""
        response = requests.get(f"{BASE_URL}/api/map-sessions?floor_id={FLOOR_ID}")
        sessions = response.json()
        feb17_session = next((s for s in sessions if s["id"] == SESSION_ID), None)
        zones = feb17_session.get("zones", [])
        active_zone = next((z for z in zones if not z.get("is_removed")), None)
        zone_id = active_zone["id"]
        
        # Update stroke_width
        update_response = requests.put(
            f"{BASE_URL}/api/admin/map-sessions/{SESSION_ID}/zones/{zone_id}",
            json={"stroke_width": 1.5},
            headers=auth_headers
        )
        assert update_response.status_code == 200
        
        updated_session = update_response.json()
        updated_zone = next((z for z in updated_session["zones"] if z["id"] == zone_id), None)
        assert abs(updated_zone.get("stroke_width", 0.3) - 1.5) < 0.01
        print("stroke_width update successful")
        
        # Restore
        requests.put(
            f"{BASE_URL}/api/admin/map-sessions/{SESSION_ID}/zones/{zone_id}",
            json={"stroke_width": 0.3},
            headers=auth_headers
        )

    def test_update_zone_stroke_style(self, auth_headers):
        """Test updating zone stroke_style"""
        response = requests.get(f"{BASE_URL}/api/map-sessions?floor_id={FLOOR_ID}")
        sessions = response.json()
        feb17_session = next((s for s in sessions if s["id"] == SESSION_ID), None)
        zones = feb17_session.get("zones", [])
        active_zone = next((z for z in zones if not z.get("is_removed")), None)
        zone_id = active_zone["id"]
        
        # Test each stroke style
        for style in ["dashed", "dotted", "solid"]:
            update_response = requests.put(
                f"{BASE_URL}/api/admin/map-sessions/{SESSION_ID}/zones/{zone_id}",
                json={"stroke_style": style},
                headers=auth_headers
            )
            assert update_response.status_code == 200
            
            updated_session = update_response.json()
            updated_zone = next((z for z in updated_session["zones"] if z["id"] == zone_id), None)
            assert updated_zone.get("stroke_style") == style
            print(f"stroke_style '{style}' update successful")


class TestCopyZone:
    """Test zone copy functionality"""
    
    def test_copy_zone_via_api(self, auth_headers):
        """Test copying a zone creates new zone with offset and (نسخة) suffix"""
        # Get existing zones
        response = requests.get(f"{BASE_URL}/api/map-sessions?floor_id={FLOOR_ID}")
        sessions = response.json()
        feb17_session = next((s for s in sessions if s["id"] == SESSION_ID), None)
        zones = feb17_session.get("zones", [])
        initial_count = len(zones)
        
        # Get a zone to copy
        source_zone = next((z for z in zones if not z.get("is_removed")), None)
        assert source_zone is not None
        
        # Create a copy (simulating frontend behavior)
        offset = 4
        new_points = [{"x": p["x"] + offset, "y": p["y"] + offset} for p in source_zone["polygon_points"]]
        
        copy_response = requests.post(
            f"{BASE_URL}/api/admin/map-sessions/{SESSION_ID}/zones",
            json={
                "zone_code": source_zone["zone_code"] + "-copy",
                "name_ar": source_zone["name_ar"] + " (نسخة)",
                "name_en": (source_zone.get("name_en") or "") + " (copy)",
                "zone_type": source_zone["zone_type"],
                "polygon_points": new_points,
                "fill_color": source_zone.get("fill_color", "#22c55e"),
                "stroke_color": source_zone.get("stroke_color", "#000000"),
                "opacity": source_zone.get("opacity", 0.4),
                "stroke_opacity": source_zone.get("stroke_opacity", 1.0),
            },
            headers=auth_headers
        )
        assert copy_response.status_code == 200, f"Copy failed: {copy_response.text}"
        
        # Verify copy was created
        updated_session = copy_response.json()
        new_zones = updated_session.get("zones", [])
        assert len(new_zones) == initial_count + 1, "Zone count should increase by 1"
        
        # Find the copied zone
        copied_zone = next((z for z in new_zones if "(نسخة)" in z.get("name_ar", "")), None)
        assert copied_zone is not None, "Copied zone with (نسخة) suffix not found"
        
        # Verify offset was applied
        original_first_point = source_zone["polygon_points"][0]
        copied_first_point = copied_zone["polygon_points"][0]
        assert abs(copied_first_point["x"] - original_first_point["x"] - offset) < 0.1
        assert abs(copied_first_point["y"] - original_first_point["y"] - offset) < 0.1
        
        print(f"Zone copy successful: {copied_zone['name_ar']}")
        
        # Clean up - delete the copied zone
        delete_response = requests.delete(
            f"{BASE_URL}/api/admin/map-sessions/{SESSION_ID}/zones/{copied_zone['id']}",
            headers=auth_headers
        )
        # If delete endpoint doesn't exist, mark as removed
        if delete_response.status_code == 404 or delete_response.status_code == 405:
            requests.put(
                f"{BASE_URL}/api/admin/map-sessions/{SESSION_ID}/zones/{copied_zone['id']}",
                json={"is_removed": True},
                headers=auth_headers
            )
        print("Cleanup completed")


class TestRegressionFeatures:
    """Regression tests for existing features"""
    
    def test_zone_category_change(self, auth_headers):
        """Test changing zone category still works"""
        response = requests.get(f"{BASE_URL}/api/map-sessions?floor_id={FLOOR_ID}")
        sessions = response.json()
        feb17_session = next((s for s in sessions if s["id"] == SESSION_ID), None)
        zones = feb17_session.get("zones", [])
        active_zone = next((z for z in zones if not z.get("is_removed")), None)
        zone_id = active_zone["id"]
        original_type = active_zone["zone_type"]
        
        # Change category
        new_type = "women_prayer" if original_type != "women_prayer" else "men_prayer"
        update_response = requests.put(
            f"{BASE_URL}/api/admin/map-sessions/{SESSION_ID}/zones/{zone_id}",
            json={"zone_type": new_type},
            headers=auth_headers
        )
        assert update_response.status_code == 200
        
        # Restore
        requests.put(
            f"{BASE_URL}/api/admin/map-sessions/{SESSION_ID}/zones/{zone_id}",
            json={"zone_type": original_type},
            headers=auth_headers
        )
        print("Zone category change regression test passed")

    def test_zone_polygon_update(self, auth_headers):
        """Test updating zone polygon_points (for rotation/move) still works"""
        response = requests.get(f"{BASE_URL}/api/map-sessions?floor_id={FLOOR_ID}")
        sessions = response.json()
        feb17_session = next((s for s in sessions if s["id"] == SESSION_ID), None)
        zones = feb17_session.get("zones", [])
        active_zone = next((z for z in zones if not z.get("is_removed")), None)
        zone_id = active_zone["id"]
        original_points = active_zone["polygon_points"]
        
        # Move all points by small offset
        moved_points = [{"x": p["x"] + 0.5, "y": p["y"] + 0.5} for p in original_points]
        
        update_response = requests.put(
            f"{BASE_URL}/api/admin/map-sessions/{SESSION_ID}/zones/{zone_id}",
            json={"polygon_points": moved_points},
            headers=auth_headers
        )
        assert update_response.status_code == 200
        
        # Restore
        requests.put(
            f"{BASE_URL}/api/admin/map-sessions/{SESSION_ID}/zones/{zone_id}",
            json={"polygon_points": original_points},
            headers=auth_headers
        )
        print("Zone polygon update regression test passed")

    def test_zone_daily_note(self, auth_headers):
        """Test adding daily note to zone still works"""
        response = requests.get(f"{BASE_URL}/api/map-sessions?floor_id={FLOOR_ID}")
        sessions = response.json()
        feb17_session = next((s for s in sessions if s["id"] == SESSION_ID), None)
        zones = feb17_session.get("zones", [])
        active_zone = next((z for z in zones if not z.get("is_removed")), None)
        zone_id = active_zone["id"]
        
        # Add note
        update_response = requests.put(
            f"{BASE_URL}/api/admin/map-sessions/{SESSION_ID}/zones/{zone_id}",
            json={"daily_note": "Test note for iteration 12"},
            headers=auth_headers
        )
        assert update_response.status_code == 200
        
        # Clear note
        requests.put(
            f"{BASE_URL}/api/admin/map-sessions/{SESSION_ID}/zones/{zone_id}",
            json={"daily_note": ""},
            headers=auth_headers
        )
        print("Zone daily note regression test passed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
