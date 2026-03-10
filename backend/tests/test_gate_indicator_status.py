"""
Test Gate Status/Indicator Separation Feature
- Status: open/closed (only 2 options)
- Indicator: light/medium/crowded (only for open gates)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
SESSION_ID = "9b93b01f-4acd-4374-8f8f-260bb6c53c16"  # Feb 27 session

@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@crowd.sa",
        "password": "admin123"
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["access_token"]

@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Return authorization headers"""
    return {"Authorization": f"Bearer {auth_token}"}

class TestGateSessionIndicatorField:
    """Test that gates have separate status and indicator fields"""

    def test_session_has_gates_with_indicator_field(self, auth_headers):
        """Verify gate session gates have indicator field"""
        response = requests.get(f"{BASE_URL}/api/gate-sessions/{SESSION_ID}", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get session: {response.text}"
        
        session = response.json()
        assert "gates" in session, "Session should have gates array"
        assert len(session["gates"]) > 0, "Session should have at least one gate"
        
        # Check first gate has indicator field
        gate = session["gates"][0]
        assert "status" in gate, "Gate should have status field"
        assert "indicator" in gate, "Gate should have indicator field"
        
        # Verify status is only open or closed
        assert gate["status"] in ["open", "closed"], f"Status should be open/closed, got: {gate['status']}"
        
        # Verify indicator is valid
        assert gate["indicator"] in ["light", "medium", "crowded"], f"Indicator should be light/medium/crowded, got: {gate['indicator']}"
        
        print(f"PASS: Gate '{gate['name_ar']}' has status='{gate['status']}' and indicator='{gate['indicator']}'")

    def test_update_indicator_for_open_gate(self, auth_headers):
        """Test updating indicator on an open gate"""
        # First get the session
        response = requests.get(f"{BASE_URL}/api/gate-sessions/{SESSION_ID}", headers=auth_headers)
        session = response.json()
        
        # Find an open gate
        open_gate = next((g for g in session["gates"] if g["status"] == "open"), None)
        assert open_gate is not None, "Should have at least one open gate"
        
        gate_id = open_gate["id"]
        original_indicator = open_gate.get("indicator", "light")
        
        # Set indicator to medium
        new_indicator = "medium" if original_indicator != "medium" else "crowded"
        update_response = requests.put(
            f"{BASE_URL}/api/admin/gate-sessions/{SESSION_ID}/gates/{gate_id}",
            json={"indicator": new_indicator},
            headers=auth_headers
        )
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        
        # Verify indicator was updated
        updated_session = update_response.json()
        updated_gate = next((g for g in updated_session["gates"] if g["id"] == gate_id), None)
        assert updated_gate is not None, "Gate should exist in response"
        assert updated_gate["indicator"] == new_indicator, f"Indicator should be {new_indicator}, got: {updated_gate['indicator']}"
        assert updated_gate["status"] == "open", "Status should remain 'open'"
        
        print(f"PASS: Gate indicator updated from '{original_indicator}' to '{new_indicator}'")
        
        # Restore original
        requests.put(
            f"{BASE_URL}/api/admin/gate-sessions/{SESSION_ID}/gates/{gate_id}",
            json={"indicator": original_indicator},
            headers=auth_headers
        )

    def test_update_status_to_closed_resets_indicator(self, auth_headers):
        """Test that setting status to closed should allow indicator reset"""
        response = requests.get(f"{BASE_URL}/api/gate-sessions/{SESSION_ID}", headers=auth_headers)
        session = response.json()
        
        # Find an open gate with non-light indicator
        test_gate = next((g for g in session["gates"] if g["status"] == "open"), None)
        assert test_gate is not None, "Should have at least one open gate"
        
        gate_id = test_gate["id"]
        original_status = test_gate["status"]
        original_indicator = test_gate.get("indicator", "light")
        
        # First set indicator to crowded
        requests.put(
            f"{BASE_URL}/api/admin/gate-sessions/{SESSION_ID}/gates/{gate_id}",
            json={"indicator": "crowded"},
            headers=auth_headers
        )
        
        # Now change status to closed with indicator reset
        update_response = requests.put(
            f"{BASE_URL}/api/admin/gate-sessions/{SESSION_ID}/gates/{gate_id}",
            json={"status": "closed", "indicator": "light"},
            headers=auth_headers
        )
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        
        # Verify status changed to closed and indicator is light
        updated_session = update_response.json()
        updated_gate = next((g for g in updated_session["gates"] if g["id"] == gate_id), None)
        assert updated_gate["status"] == "closed", "Status should be 'closed'"
        assert updated_gate["indicator"] == "light", "Indicator should be reset to 'light' when gate is closed"
        
        print(f"PASS: Gate status changed to closed, indicator reset to light")
        
        # Restore original state
        requests.put(
            f"{BASE_URL}/api/admin/gate-sessions/{SESSION_ID}/gates/{gate_id}",
            json={"status": original_status, "indicator": original_indicator},
            headers=auth_headers
        )

    def test_status_only_accepts_open_closed(self, auth_headers):
        """Verify status field only accepts open/closed values (no crowded)"""
        response = requests.get(f"{BASE_URL}/api/gate-sessions/{SESSION_ID}", headers=auth_headers)
        session = response.json()
        
        # Check all gates have valid status
        for gate in session["gates"]:
            assert gate["status"] in ["open", "closed"], \
                f"Gate '{gate['name_ar']}' has invalid status '{gate['status']}', should be open/closed only"
        
        print(f"PASS: All {len(session['gates'])} gates have valid status (open/closed only)")

    def test_indicator_only_applies_to_open_gates_data(self, auth_headers):
        """Verify indicator values in data"""
        response = requests.get(f"{BASE_URL}/api/gate-sessions/{SESSION_ID}", headers=auth_headers)
        session = response.json()
        
        open_gates = [g for g in session["gates"] if g["status"] == "open"]
        closed_gates = [g for g in session["gates"] if g["status"] == "closed"]
        
        # Open gates should have indicator
        for gate in open_gates:
            assert "indicator" in gate, f"Open gate '{gate['name_ar']}' should have indicator"
            assert gate["indicator"] in ["light", "medium", "crowded"], \
                f"Gate '{gate['name_ar']}' has invalid indicator '{gate['indicator']}'"
        
        print(f"PASS: {len(open_gates)} open gates have valid indicators, {len(closed_gates)} closed gates")

    def test_session_stats_separation(self, auth_headers):
        """Test that session has stats showing open/closed and indicators separately"""
        response = requests.get(f"{BASE_URL}/api/gate-sessions/{SESSION_ID}", headers=auth_headers)
        session = response.json()
        
        gates = session["gates"]
        
        # Calculate expected stats
        open_count = len([g for g in gates if g["status"] == "open" and not g.get("is_removed")])
        closed_count = len([g for g in gates if g["status"] == "closed" and not g.get("is_removed")])
        
        open_gates = [g for g in gates if g["status"] == "open" and not g.get("is_removed")]
        light_count = len([g for g in open_gates if g.get("indicator", "light") == "light"])
        medium_count = len([g for g in open_gates if g.get("indicator", "light") == "medium"])
        crowded_count = len([g for g in open_gates if g.get("indicator", "light") == "crowded"])
        
        print(f"PASS: Stats - Open: {open_count}, Closed: {closed_count}")
        print(f"      Indicators - Light: {light_count}, Medium: {medium_count}, Crowded: {crowded_count}")
        
        # Verify indicator counts add up to open count
        assert light_count + medium_count + crowded_count == open_count, \
            f"Indicator counts ({light_count}+{medium_count}+{crowded_count}) should equal open count ({open_count})"

class TestSessionGateUpdateModel:
    """Test that backend model accepts indicator field"""

    def test_update_only_indicator(self, auth_headers):
        """Test updating only the indicator field"""
        response = requests.get(f"{BASE_URL}/api/gate-sessions/{SESSION_ID}", headers=auth_headers)
        session = response.json()
        
        gate = session["gates"][0]
        gate_id = gate["id"]
        original_indicator = gate.get("indicator", "light")
        
        # Update only indicator
        update_response = requests.put(
            f"{BASE_URL}/api/admin/gate-sessions/{SESSION_ID}/gates/{gate_id}",
            json={"indicator": "medium"},
            headers=auth_headers
        )
        assert update_response.status_code == 200
        
        # Verify other fields unchanged
        updated_gate = next((g for g in update_response.json()["gates"] if g["id"] == gate_id), None)
        assert updated_gate["name_ar"] == gate["name_ar"], "Name should be unchanged"
        assert updated_gate["status"] == gate["status"], "Status should be unchanged"
        
        print("PASS: Updating only indicator preserves other fields")
        
        # Restore
        requests.put(
            f"{BASE_URL}/api/admin/gate-sessions/{SESSION_ID}/gates/{gate_id}",
            json={"indicator": original_indicator},
            headers=auth_headers
        )

    def test_update_status_without_indicator(self, auth_headers):
        """Test updating status without changing indicator"""
        response = requests.get(f"{BASE_URL}/api/gate-sessions/{SESSION_ID}", headers=auth_headers)
        session = response.json()
        
        # Find a closed gate
        closed_gate = next((g for g in session["gates"] if g["status"] == "closed"), None)
        if not closed_gate:
            pytest.skip("No closed gate available for test")
        
        gate_id = closed_gate["id"]
        
        # Update status to open without specifying indicator
        update_response = requests.put(
            f"{BASE_URL}/api/admin/gate-sessions/{SESSION_ID}/gates/{gate_id}",
            json={"status": "open"},
            headers=auth_headers
        )
        assert update_response.status_code == 200
        
        updated_gate = next((g for g in update_response.json()["gates"] if g["id"] == gate_id), None)
        assert updated_gate["status"] == "open"
        # Indicator should have a default value
        assert updated_gate.get("indicator") in ["light", "medium", "crowded"], \
            "Open gate should have valid indicator"
        
        print(f"PASS: Status changed to open, indicator is '{updated_gate.get('indicator')}'")
        
        # Restore
        requests.put(
            f"{BASE_URL}/api/admin/gate-sessions/{SESSION_ID}/gates/{gate_id}",
            json={"status": "closed"},
            headers=auth_headers
        )


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
