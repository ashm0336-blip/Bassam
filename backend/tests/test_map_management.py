"""
Test Map Management API endpoints:
- Floor CRUD operations
- Zone CRUD operations
- Map image upload
- Crowd density updates
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://stats-hub-20.preview.emergentagent.com"

# Test credentials
ADMIN_EMAIL = "admin@crowd.sa"
ADMIN_PASSWORD = "admin123"


class TestMapManagementAPI:
    """Test Map Management (Floors, Zones, Crowd) endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for tests"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.token = login_response.json()["access_token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        
    # ============= FLOORS TESTS =============
    
    def test_01_get_floors(self):
        """Test GET /api/floors - List all floors"""
        response = requests.get(f"{BASE_URL}/api/floors")
        assert response.status_code == 200
        floors = response.json()
        assert isinstance(floors, list)
        print(f"✓ GET /api/floors: Found {len(floors)} floors")
        
    def test_02_create_floor(self):
        """Test POST /api/admin/floors - Create new floor"""
        floor_data = {
            "name_ar": "طابق اختباري",
            "name_en": "Test Floor",
            "floor_number": 99,
            "image_url": "https://via.placeholder.com/800x600",
            "order": 99
        }
        response = requests.post(
            f"{BASE_URL}/api/admin/floors",
            json=floor_data,
            headers=self.headers
        )
        assert response.status_code == 200, f"Create floor failed: {response.text}"
        created = response.json()
        assert "id" in created
        assert created["name_ar"] == floor_data["name_ar"]
        print(f"✓ POST /api/admin/floors: Created floor id={created['id']}")
        # Save for cleanup
        self.test_floor_id = created["id"]
        return created["id"]
        
    def test_03_get_floor_by_id(self):
        """Test GET /api/floors/{id} - Get single floor"""
        # First create a floor
        floor_id = self.test_02_create_floor()
        
        response = requests.get(f"{BASE_URL}/api/floors/{floor_id}")
        assert response.status_code == 200
        floor = response.json()
        assert floor["id"] == floor_id
        print(f"✓ GET /api/floors/{floor_id}: Retrieved floor")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/floors/{floor_id}", headers=self.headers)
        
    def test_04_update_floor(self):
        """Test PUT /api/admin/floors/{id} - Update floor"""
        # Create floor
        floor_id = self.test_02_create_floor()
        
        update_data = {"name_ar": "طابق محدث", "order": 50}
        response = requests.put(
            f"{BASE_URL}/api/admin/floors/{floor_id}",
            json=update_data,
            headers=self.headers
        )
        assert response.status_code == 200
        updated = response.json()
        assert updated["name_ar"] == "طابق محدث"
        print(f"✓ PUT /api/admin/floors/{floor_id}: Updated floor name")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/floors/{floor_id}", headers=self.headers)
        
    def test_05_delete_floor(self):
        """Test DELETE /api/admin/floors/{id} - Delete floor"""
        # Create floor
        floor_id = self.test_02_create_floor()
        
        response = requests.delete(
            f"{BASE_URL}/api/admin/floors/{floor_id}",
            headers=self.headers
        )
        assert response.status_code == 200
        print(f"✓ DELETE /api/admin/floors/{floor_id}: Floor deleted")
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/floors/{floor_id}")
        assert get_response.status_code == 404
        print(f"✓ GET /api/floors/{floor_id} after delete: 404 Not Found")
        
    # ============= ZONES TESTS =============
    
    def test_06_get_all_zones(self):
        """Test GET /api/zones - List all zones"""
        response = requests.get(f"{BASE_URL}/api/zones")
        assert response.status_code == 200
        zones = response.json()
        assert isinstance(zones, list)
        print(f"✓ GET /api/zones: Found {len(zones)} zones")
        
    def test_07_create_zone(self):
        """Test POST /api/admin/zones - Create new zone"""
        # Get existing floor
        floors_response = requests.get(f"{BASE_URL}/api/floors")
        floors = floors_response.json()
        if not floors:
            pytest.skip("No floors available for zone creation")
            
        floor_id = floors[0]["id"]
        zone_data = {
            "floor_id": floor_id,
            "zone_code": f"TEST-{uuid.uuid4().hex[:6].upper()}",
            "name_ar": "منطقة اختبارية",
            "name_en": "Test Zone",
            "zone_type": "men_prayer",
            "polygon_points": [
                {"x": 30, "y": 30},
                {"x": 50, "y": 30},
                {"x": 50, "y": 50},
                {"x": 30, "y": 50}
            ],
            "fill_color": "#22c55e",
            "max_capacity": 500
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/zones",
            json=zone_data,
            headers=self.headers
        )
        assert response.status_code == 200, f"Create zone failed: {response.text}"
        created = response.json()
        assert "id" in created
        assert created["zone_code"] == zone_data["zone_code"]
        assert len(created["polygon_points"]) == 4
        print(f"✓ POST /api/admin/zones: Created zone id={created['id']}")
        return created["id"]
        
    def test_08_get_floor_zones(self):
        """Test GET /api/floors/{floor_id}/zones - Get zones for floor"""
        floors_response = requests.get(f"{BASE_URL}/api/floors")
        floors = floors_response.json()
        if not floors:
            pytest.skip("No floors available")
            
        floor_id = floors[0]["id"]
        response = requests.get(f"{BASE_URL}/api/floors/{floor_id}/zones")
        assert response.status_code == 200
        zones = response.json()
        assert isinstance(zones, list)
        print(f"✓ GET /api/floors/{floor_id}/zones: Found {len(zones)} zones")
        
    def test_09_update_zone(self):
        """Test PUT /api/admin/zones/{id} - Update zone (polygon, crowd)"""
        # Create a zone first
        zone_id = self.test_07_create_zone()
        
        update_data = {
            "polygon_points": [
                {"x": 35, "y": 35},
                {"x": 55, "y": 35},
                {"x": 55, "y": 55},
                {"x": 35, "y": 55}
            ],
            "current_crowd": 250
        }
        
        response = requests.put(
            f"{BASE_URL}/api/admin/zones/{zone_id}",
            json=update_data,
            headers=self.headers
        )
        assert response.status_code == 200
        updated = response.json()
        assert len(updated["polygon_points"]) == 4
        assert updated["current_crowd"] == 250
        print(f"✓ PUT /api/admin/zones/{zone_id}: Updated zone polygon and crowd")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/zones/{zone_id}", headers=self.headers)
        
    def test_10_delete_zone(self):
        """Test DELETE /api/admin/zones/{id} - Delete zone"""
        zone_id = self.test_07_create_zone()
        
        response = requests.delete(
            f"{BASE_URL}/api/admin/zones/{zone_id}",
            headers=self.headers
        )
        assert response.status_code == 200
        print(f"✓ DELETE /api/admin/zones/{zone_id}: Zone deleted")
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/zones/{zone_id}")
        assert get_response.status_code == 404
        print(f"✓ GET /api/zones/{zone_id} after delete: 404 Not Found")
        
    # ============= CROWD UPDATE TESTS =============
    
    def test_11_update_zone_crowd(self):
        """Test updating zone crowd density via PUT"""
        zone_id = self.test_07_create_zone()
        
        # Update crowd value
        update_data = {"current_crowd": 300}
        response = requests.put(
            f"{BASE_URL}/api/admin/zones/{zone_id}",
            json=update_data,
            headers=self.headers
        )
        assert response.status_code == 200
        updated = response.json()
        assert updated["current_crowd"] == 300
        
        # Verify persistence
        get_response = requests.get(f"{BASE_URL}/api/zones/{zone_id}")
        assert get_response.status_code == 200
        zone = get_response.json()
        assert zone["current_crowd"] == 300
        print(f"✓ Crowd update persisted: {zone['current_crowd']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/zones/{zone_id}", headers=self.headers)
        
    def test_12_zone_stats_summary(self):
        """Test GET /api/zones/stats/summary - Zone statistics"""
        response = requests.get(f"{BASE_URL}/api/zones/stats/summary")
        assert response.status_code == 200
        stats = response.json()
        assert "total_zones" in stats
        assert "overall_percentage" in stats
        assert "by_status" in stats  # API uses 'by_status' not 'status_distribution'
        print(f"✓ GET /api/zones/stats/summary: total_zones={stats['total_zones']}, overall_percentage={stats['overall_percentage']}%")
        
    # ============= IMAGE UPLOAD TEST =============
    
    def test_13_upload_map_image(self):
        """Test POST /api/admin/upload/map-image - Image upload"""
        # Create a simple test image
        from PIL import Image
        import io
        
        img = Image.new('RGB', (800, 600), color='lightblue')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='PNG')
        img_bytes.seek(0)
        
        files = {'file': ('test_floor.png', img_bytes, 'image/png')}
        headers = {"Authorization": f"Bearer {self.token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/admin/upload/map-image",
            files=files,
            headers=headers
        )
        assert response.status_code == 200, f"Upload failed: {response.text}"
        result = response.json()
        assert "url" in result
        assert result["url"].endswith(".png")
        print(f"✓ POST /api/admin/upload/map-image: Uploaded, url={result['url']}")
        
    # ============= CLEANUP =============
        
    def test_99_cleanup_test_zones(self):
        """Cleanup any leftover test zones"""
        zones_response = requests.get(f"{BASE_URL}/api/zones")
        zones = zones_response.json()
        test_zones = [z for z in zones if z["zone_code"].startswith("TEST-")]
        
        for zone in test_zones:
            requests.delete(f"{BASE_URL}/api/admin/zones/{zone['id']}", headers=self.headers)
            print(f"✓ Cleaned up test zone: {zone['zone_code']}")
            
        print(f"✓ Cleanup complete: removed {len(test_zones)} test zones")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
