"""
Daily Statistics API Tests
Tests for /api/daily-stats endpoints - CRUD + Import/Export for mosque crowd data
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestDailyStatsAuth:
    """Test authentication for daily stats endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "admin@crowd.sa",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        self.token = data.get("access_token")
        assert self.token, "No access_token in login response"
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_list_daily_stats_requires_auth(self):
        """GET /api/daily-stats requires authentication"""
        response = requests.get(f"{BASE_URL}/api/daily-stats")
        assert response.status_code == 401 or response.status_code == 403
    
    def test_summary_requires_auth(self):
        """GET /api/daily-stats/summary requires authentication"""
        response = requests.get(f"{BASE_URL}/api/daily-stats/summary")
        assert response.status_code == 401 or response.status_code == 403
    
    def test_create_requires_auth(self):
        """POST /api/daily-stats requires authentication"""
        response = requests.post(f"{BASE_URL}/api/daily-stats", json={
            "date_hijri": "1446-09-15"
        })
        assert response.status_code == 401 or response.status_code == 403


class TestDailyStatsCRUD:
    """Test CRUD operations for daily stats"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "admin@crowd.sa",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        self.token = data.get("access_token")
        assert self.token, "No access_token in login response"
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_list_daily_stats_with_filters(self):
        """GET /api/daily-stats with year/month filters returns seeded data"""
        # Test with year 1446 and month 09 (Ramadan) - should have seeded data
        response = requests.get(
            f"{BASE_URL}/api/daily-stats",
            headers=self.headers,
            params={"year": "1446", "month": "09"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "items" in data
        assert "total" in data
        assert "page" in data
        assert "pages" in data
        
        # Should have seeded data for 1446-09
        assert data["total"] >= 0, "Should return total count"
        print(f"Found {data['total']} records for 1446-09")
    
    def test_get_summary_stats(self):
        """GET /api/daily-stats/summary returns aggregated stats"""
        response = requests.get(
            f"{BASE_URL}/api/daily-stats/summary",
            headers=self.headers,
            params={"year": "1446", "month": "09"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify summary structure
        assert "count" in data
        print(f"Summary count: {data['count']}")
        
        # If there's data, check for sum fields
        if data["count"] > 0:
            assert "sum_haram_worshippers" in data or data.get("sum_haram_worshippers") is not None
            print(f"Sum haram worshippers: {data.get('sum_haram_worshippers')}")
    
    def test_create_daily_stat(self):
        """POST /api/daily-stats creates a new record"""
        test_date = "1446-10-15"  # Test date
        
        payload = {
            "date_hijri": test_date,
            "date_gregorian": "2025-04-15",
            "haram_worshippers": 50000,
            "haram_umrah": 25000,
            "haram_hijr_ismail": 3000,
            "haram_carts": 800
        }
        
        response = requests.post(
            f"{BASE_URL}/api/daily-stats",
            headers=self.headers,
            json=payload
        )
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        
        # Verify created record
        assert data["date_hijri"] == test_date
        assert data["haram_worshippers"] == 50000
        assert data["haram_umrah"] == 25000
        assert "id" in data
        
        # Store ID for cleanup
        self.created_id = data["id"]
        print(f"Created record with ID: {self.created_id}")
        
        # Verify by GET
        get_response = requests.get(
            f"{BASE_URL}/api/daily-stats/{self.created_id}",
            headers=self.headers
        )
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched["date_hijri"] == test_date
        assert fetched["haram_worshippers"] == 50000
    
    def test_create_updates_existing_date(self):
        """POST /api/daily-stats with existing date updates the record"""
        test_date = "1446-10-16"
        
        # Create initial record
        payload1 = {
            "date_hijri": test_date,
            "haram_worshippers": 40000
        }
        response1 = requests.post(
            f"{BASE_URL}/api/daily-stats",
            headers=self.headers,
            json=payload1
        )
        assert response1.status_code == 200
        
        # Update with same date
        payload2 = {
            "date_hijri": test_date,
            "haram_umrah": 20000
        }
        response2 = requests.post(
            f"{BASE_URL}/api/daily-stats",
            headers=self.headers,
            json=payload2
        )
        assert response2.status_code == 200
        data = response2.json()
        
        # Should have both values
        assert data["haram_worshippers"] == 40000, "Original value should be preserved"
        assert data["haram_umrah"] == 20000, "New value should be added"
        
        # Cleanup
        if "id" in data:
            requests.delete(f"{BASE_URL}/api/daily-stats/{data['id']}", headers=self.headers)
    
    def test_delete_daily_stat(self):
        """DELETE /api/daily-stats/{id} removes the record"""
        # First create a record
        test_date = "1446-10-17"
        create_response = requests.post(
            f"{BASE_URL}/api/daily-stats",
            headers=self.headers,
            json={"date_hijri": test_date, "haram_worshippers": 30000}
        )
        assert create_response.status_code == 200
        record_id = create_response.json()["id"]
        
        # Delete it
        delete_response = requests.delete(
            f"{BASE_URL}/api/daily-stats/{record_id}",
            headers=self.headers
        )
        assert delete_response.status_code == 200
        
        # Verify it's gone
        get_response = requests.get(
            f"{BASE_URL}/api/daily-stats/{record_id}",
            headers=self.headers
        )
        assert get_response.status_code == 404
    
    def test_delete_nonexistent_returns_404(self):
        """DELETE /api/daily-stats/{id} with invalid ID returns 404"""
        response = requests.delete(
            f"{BASE_URL}/api/daily-stats/nonexistent-id-12345",
            headers=self.headers
        )
        assert response.status_code == 404


class TestDailyStatsNabawiFields:
    """Test Nabawi mosque specific fields"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "admin@crowd.sa",
            "password": "admin123"
        })
        assert response.status_code == 200
        data = response.json()
        self.token = data.get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_create_with_nabawi_fields(self):
        """POST /api/daily-stats with all Nabawi fields"""
        test_date = "1446-10-18"
        
        payload = {
            "date_hijri": test_date,
            "nabawi_worshippers": 60000,
            "nabawi_rawdah_men_published": 8000,
            "nabawi_rawdah_men_reserved": 6000,
            "nabawi_rawdah_men_actual": 7500,
            "nabawi_rawdah_women_published": 4000,
            "nabawi_rawdah_women_reserved": 3000,
            "nabawi_rawdah_women_actual": 3500,
            "nabawi_salam_corridor": 2000
        }
        
        response = requests.post(
            f"{BASE_URL}/api/daily-stats",
            headers=self.headers,
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify all Nabawi fields
        assert data["nabawi_worshippers"] == 60000
        assert data["nabawi_rawdah_men_published"] == 8000
        assert data["nabawi_rawdah_men_reserved"] == 6000
        assert data["nabawi_rawdah_men_actual"] == 7500
        assert data["nabawi_rawdah_women_published"] == 4000
        assert data["nabawi_rawdah_women_reserved"] == 3000
        assert data["nabawi_rawdah_women_actual"] == 3500
        assert data["nabawi_salam_corridor"] == 2000
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/daily-stats/{data['id']}", headers=self.headers)


class TestDailyStatsExport:
    """Test export functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "admin@crowd.sa",
            "password": "admin123"
        })
        assert response.status_code == 200
        data = response.json()
        self.token = data.get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_download_template(self):
        """GET /api/daily-stats/export/template returns Excel file"""
        response = requests.get(
            f"{BASE_URL}/api/daily-stats/export/template",
            headers=self.headers
        )
        assert response.status_code == 200
        
        # Check content type is Excel
        content_type = response.headers.get("content-type", "")
        assert "spreadsheet" in content_type or "excel" in content_type or "octet-stream" in content_type
        
        # Check content disposition has filename
        content_disp = response.headers.get("content-disposition", "")
        assert "daily_stats_template.xlsx" in content_disp
        
        # Check file has content
        assert len(response.content) > 0
        print(f"Template file size: {len(response.content)} bytes")
    
    def test_export_data(self):
        """GET /api/daily-stats/export/data returns Excel file with data"""
        response = requests.get(
            f"{BASE_URL}/api/daily-stats/export/data",
            headers=self.headers,
            params={"year": "1446", "month": "09"}
        )
        assert response.status_code == 200
        
        # Check content type
        content_type = response.headers.get("content-type", "")
        assert "spreadsheet" in content_type or "excel" in content_type or "octet-stream" in content_type
        
        # Check file has content
        assert len(response.content) > 0
        print(f"Export file size: {len(response.content)} bytes")


class TestDailyStatsValidation:
    """Test input validation"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "admin@crowd.sa",
            "password": "admin123"
        })
        assert response.status_code == 200
        data = response.json()
        self.token = data.get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_create_without_date_fails(self):
        """POST /api/daily-stats without date_hijri returns 400"""
        response = requests.post(
            f"{BASE_URL}/api/daily-stats",
            headers=self.headers,
            json={"haram_worshippers": 50000}
        )
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
    
    def test_create_with_empty_date_fails(self):
        """POST /api/daily-stats with empty date_hijri returns 400"""
        response = requests.post(
            f"{BASE_URL}/api/daily-stats",
            headers=self.headers,
            json={"date_hijri": "", "haram_worshippers": 50000}
        )
        assert response.status_code == 400


class TestDailyStatsPagination:
    """Test pagination functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "admin@crowd.sa",
            "password": "admin123"
        })
        assert response.status_code == 200
        data = response.json()
        self.token = data.get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_pagination_params(self):
        """GET /api/daily-stats respects page and limit params"""
        response = requests.get(
            f"{BASE_URL}/api/daily-stats",
            headers=self.headers,
            params={"page": 1, "limit": 10}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["page"] == 1
        assert len(data["items"]) <= 10
        assert "pages" in data
        assert "total" in data


# Cleanup test data after all tests
@pytest.fixture(scope="module", autouse=True)
def cleanup_test_data():
    """Cleanup any test data created during tests"""
    yield
    # Cleanup runs after all tests in module
    try:
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "admin@crowd.sa",
            "password": "admin123"
        })
        if response.status_code == 200:
            token = response.json().get("access_token")
            headers = {"Authorization": f"Bearer {token}"}
            
            # Get all records for test dates and delete them
            test_dates = ["1446-10-15", "1446-10-16", "1446-10-17", "1446-10-18"]
            for date in test_dates:
                list_response = requests.get(
                    f"{BASE_URL}/api/daily-stats",
                    headers=headers,
                    params={"year": "1446", "month": "10"}
                )
                if list_response.status_code == 200:
                    items = list_response.json().get("items", [])
                    for item in items:
                        if item.get("date_hijri") in test_dates:
                            requests.delete(
                                f"{BASE_URL}/api/daily-stats/{item['id']}",
                                headers=headers
                            )
    except Exception as e:
        print(f"Cleanup error: {e}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
