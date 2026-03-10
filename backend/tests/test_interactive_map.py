"""
Interactive Map API Tests
Testing floors, zones, and stats endpoints for the Haram interactive map
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestFloorsAPI:
    """Test floor endpoints"""
    
    def test_get_floors_returns_list(self):
        """GET /api/floors should return list of floors"""
        response = requests.get(f"{BASE_URL}/api/floors")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Got {len(data)} floors")
    
    def test_basement_floor_exists(self):
        """Verify basement floor is present"""
        response = requests.get(f"{BASE_URL}/api/floors")
        assert response.status_code == 200
        data = response.json()
        
        # Find basement floor
        basement = next((f for f in data if f.get('floor_number') == -1), None)
        assert basement is not None, "Basement floor not found"
        assert basement['name_ar'] == "دور البدروم"
        assert basement['name_en'] == "Basement Floor"
        assert 'image_url' in basement
        print(f"SUCCESS: Basement floor found with image URL")
    
    def test_floor_has_required_fields(self):
        """Verify floor structure"""
        response = requests.get(f"{BASE_URL}/api/floors")
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            floor = data[0]
            required_fields = ['id', 'name_ar', 'name_en', 'floor_number', 'image_url']
            for field in required_fields:
                assert field in floor, f"Missing required field: {field}"
            print(f"SUCCESS: Floor has all required fields")


class TestZonesAPI:
    """Test zone endpoints"""
    
    def test_get_all_zones(self):
        """GET /api/zones should return list of zones"""
        response = requests.get(f"{BASE_URL}/api/zones")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 6, f"Expected at least 6 zones, got {len(data)}"
        print(f"SUCCESS: Got {len(data)} zones")
    
    def test_get_floor_zones(self):
        """GET /api/floors/{floor_id}/zones returns zones for floor"""
        # First get a floor
        floors_response = requests.get(f"{BASE_URL}/api/floors")
        assert floors_response.status_code == 200
        floors = floors_response.json()
        
        if len(floors) > 0:
            floor_id = floors[0]['id']
            response = requests.get(f"{BASE_URL}/api/floors/{floor_id}/zones")
            assert response.status_code == 200
            zones = response.json()
            assert isinstance(zones, list)
            print(f"SUCCESS: Got {len(zones)} zones for floor {floor_id}")
    
    def test_zone_has_required_fields(self):
        """Verify zone structure"""
        response = requests.get(f"{BASE_URL}/api/zones")
        assert response.status_code == 200
        data = response.json()
        
        required_fields = [
            'id', 'floor_id', 'zone_code', 'name_ar', 'name_en',
            'zone_type', 'polygon_points', 'fill_color', 'stroke_color',
            'opacity', 'current_crowd', 'max_capacity', 'crowd_status'
        ]
        
        if len(data) > 0:
            zone = data[0]
            for field in required_fields:
                assert field in zone, f"Missing required field: {field}"
            print(f"SUCCESS: Zone has all required fields")
    
    def test_zone_percentage_calculated(self):
        """Verify percentage is calculated for zones"""
        response = requests.get(f"{BASE_URL}/api/zones")
        assert response.status_code == 200
        data = response.json()
        
        for zone in data:
            assert 'percentage' in zone, f"Zone {zone['zone_code']} missing percentage"
            # Verify percentage is within valid range
            pct = zone['percentage']
            assert 0 <= pct <= 100, f"Invalid percentage {pct} for zone {zone['zone_code']}"
        print(f"SUCCESS: All zones have valid percentage values")
    
    def test_all_six_zones_present(self):
        """Verify all 6 expected zones are present"""
        response = requests.get(f"{BASE_URL}/api/zones")
        assert response.status_code == 200
        zones = response.json()
        
        expected_zone_codes = ['1-0-2', 'MATAF-1', 'MEN-1', 'WOMEN-1', 'MASAA', 'FAHD-EXP']
        zone_codes = [z['zone_code'] for z in zones]
        
        for expected_code in expected_zone_codes:
            assert expected_code in zone_codes, f"Missing zone: {expected_code}"
        print(f"SUCCESS: All 6 zones present: {zone_codes}")
    
    def test_kaaba_zone_exists(self):
        """Verify Kaaba zone exists with correct properties"""
        response = requests.get(f"{BASE_URL}/api/zones")
        assert response.status_code == 200
        zones = response.json()
        
        kaaba = next((z for z in zones if z['zone_type'] == 'kaaba'), None)
        assert kaaba is not None, "Kaaba zone not found"
        assert kaaba['name_ar'] == "الكعبة المشرفة"
        assert kaaba['fill_color'] == "#1a1a1a"
        print(f"SUCCESS: Kaaba zone found with correct properties")


class TestZoneStatsAPI:
    """Test zone statistics endpoint"""
    
    def test_get_stats_summary(self):
        """GET /api/zones/stats/summary returns correct summary"""
        response = requests.get(f"{BASE_URL}/api/zones/stats/summary")
        assert response.status_code == 200
        stats = response.json()
        
        required_fields = [
            'total_zones', 'total_current_crowd', 'total_max_capacity',
            'overall_percentage', 'by_zone_type', 'by_status'
        ]
        for field in required_fields:
            assert field in stats, f"Missing stats field: {field}"
        print(f"SUCCESS: Stats summary has all required fields")
    
    def test_stats_totals_are_correct(self):
        """Verify stats totals match zone data"""
        # Get zones
        zones_response = requests.get(f"{BASE_URL}/api/zones")
        assert zones_response.status_code == 200
        zones = zones_response.json()
        
        # Get stats
        stats_response = requests.get(f"{BASE_URL}/api/zones/stats/summary")
        assert stats_response.status_code == 200
        stats = stats_response.json()
        
        # Verify counts
        assert stats['total_zones'] == len(zones), "Zone count mismatch"
        
        # Calculate totals manually
        total_crowd = sum(z.get('current_crowd', 0) for z in zones)
        total_max = sum(z.get('max_capacity', 0) for z in zones)
        
        assert stats['total_current_crowd'] == total_crowd, f"Crowd total mismatch: {stats['total_current_crowd']} vs {total_crowd}"
        assert stats['total_max_capacity'] == total_max, f"Max capacity mismatch"
        print(f"SUCCESS: Stats totals match zone data")
    
    def test_stats_by_status_distribution(self):
        """Verify by_status contains correct categories"""
        response = requests.get(f"{BASE_URL}/api/zones/stats/summary")
        assert response.status_code == 200
        stats = response.json()
        
        expected_statuses = ['normal', 'moderate', 'crowded', 'critical']
        by_status = stats['by_status']
        
        for status in expected_statuses:
            assert status in by_status, f"Missing status category: {status}"
        
        # Verify total count matches
        total_in_status = sum(by_status.values())
        assert total_in_status == stats['total_zones'], "Status distribution doesn't match total zones"
        print(f"SUCCESS: Status distribution: {by_status}")
    
    def test_stats_by_zone_type(self):
        """Verify by_zone_type contains zone type counts"""
        response = requests.get(f"{BASE_URL}/api/zones/stats/summary")
        assert response.status_code == 200
        stats = response.json()
        
        by_zone_type = stats['by_zone_type']
        assert isinstance(by_zone_type, dict)
        
        # Verify some expected zone types
        expected_types = ['kaaba', 'mataf', 'men_prayer', 'women_prayer', 'masaa', 'expansion']
        for zone_type in expected_types:
            assert zone_type in by_zone_type, f"Missing zone type: {zone_type}"
        print(f"SUCCESS: Zone type distribution: {list(by_zone_type.keys())}")


class TestZoneCrowdColors:
    """Test zone color logic based on crowd percentage"""
    
    def test_zone_crowd_status_values(self):
        """Verify crowd_status values are valid"""
        response = requests.get(f"{BASE_URL}/api/zones")
        assert response.status_code == 200
        zones = response.json()
        
        valid_statuses = ['normal', 'moderate', 'crowded', 'critical']
        
        for zone in zones:
            assert zone['crowd_status'] in valid_statuses, \
                f"Invalid crowd_status '{zone['crowd_status']}' for zone {zone['zone_code']}"
        print(f"SUCCESS: All zones have valid crowd_status values")
    
    def test_zone_polygon_points_structure(self):
        """Verify polygon points have correct structure"""
        response = requests.get(f"{BASE_URL}/api/zones")
        assert response.status_code == 200
        zones = response.json()
        
        for zone in zones:
            points = zone.get('polygon_points', [])
            assert len(points) >= 3, f"Zone {zone['zone_code']} has less than 3 polygon points"
            
            for point in points:
                assert 'x' in point and 'y' in point, \
                    f"Zone {zone['zone_code']} has invalid polygon point"
                assert 0 <= point['x'] <= 100 and 0 <= point['y'] <= 100, \
                    f"Zone {zone['zone_code']} has out-of-range polygon point"
        print(f"SUCCESS: All zones have valid polygon points")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
