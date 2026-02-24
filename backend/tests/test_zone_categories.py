"""
Test Zone Categories API - CRUD operations for dynamic zone category management
Iteration 21 - Zone Category Manager feature testing
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@crowd.sa"
ADMIN_PASSWORD = "admin123"

@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture(scope="module")
def auth_token(api_client):
    """Get authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Authentication failed - skipping authenticated tests")

@pytest.fixture(scope="module")
def authenticated_client(api_client, auth_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client


class TestZoneCategoriesPublicAPI:
    """Test public zone categories endpoint"""
    
    def test_get_zone_categories_public(self, api_client):
        """GET /api/zone-categories - returns active categories (public)"""
        response = api_client.get(f"{BASE_URL}/api/zone-categories")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) >= 1, "Should have at least 1 category"
        
        # Verify category structure
        first_cat = data[0]
        assert "id" in first_cat, "Category should have id"
        assert "value" in first_cat, "Category should have value"
        assert "label_ar" in first_cat, "Category should have label_ar"
        assert "label_en" in first_cat, "Category should have label_en"
        assert "color" in first_cat, "Category should have color"
        assert "icon" in first_cat, "Category should have icon"
        assert "order" in first_cat, "Category should have order"
        assert first_cat.get("is_active", True) == True, "Public API should only return active categories"
        
        print(f"✓ Public API returned {len(data)} active categories")
    
    def test_zone_categories_sorted_by_order(self, api_client):
        """Verify categories are sorted by order field"""
        response = api_client.get(f"{BASE_URL}/api/zone-categories")
        assert response.status_code == 200
        
        data = response.json()
        if len(data) > 1:
            orders = [cat.get("order", 0) for cat in data]
            assert orders == sorted(orders), "Categories should be sorted by order"
            print(f"✓ Categories are properly sorted by order: {orders[:5]}...")
    
    def test_zone_categories_contains_expected_types(self, api_client):
        """Verify some expected zone types exist (men_prayer, women_prayer)"""
        response = api_client.get(f"{BASE_URL}/api/zone-categories")
        assert response.status_code == 200
        
        data = response.json()
        values = [cat["value"] for cat in data]
        
        # Check for key zone types that should exist
        assert "men_prayer" in values or any("prayer" in v for v in values), "Should have men prayer type"
        print(f"✓ Found expected zone types: {values[:5]}...")


class TestZoneCategoriesAdminAPI:
    """Test admin zone categories endpoints (requires auth)"""
    
    def test_get_all_zone_categories_admin(self, authenticated_client):
        """GET /api/admin/zone-categories - returns all categories including inactive"""
        response = authenticated_client.get(f"{BASE_URL}/api/admin/zone-categories")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Admin API returned {len(data)} total categories")
    
    def test_admin_endpoint_requires_auth(self, api_client):
        """Admin endpoint should require authentication"""
        # Create a fresh client without auth
        no_auth_session = requests.Session()
        no_auth_session.headers.update({"Content-Type": "application/json"})
        
        response = no_auth_session.get(f"{BASE_URL}/api/admin/zone-categories")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("✓ Admin endpoint properly requires authentication")


class TestZoneCategoryCRUD:
    """Test full CRUD operations for zone categories"""
    
    def test_create_zone_category(self, authenticated_client):
        """POST /api/admin/zone-categories - create new category"""
        unique_key = f"test_cat_{int(time.time())}"
        payload = {
            "value": unique_key,
            "label_ar": "فئة اختبار",
            "label_en": "Test Category",
            "color": "#ff5733",
            "icon": "T",
            "order": 100
        }
        
        response = authenticated_client.post(f"{BASE_URL}/api/admin/zone-categories", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("value") == unique_key, "Created category should have correct value"
        assert data.get("label_ar") == "فئة اختبار", "Created category should have correct Arabic label"
        assert data.get("label_en") == "Test Category", "Created category should have correct English label"
        assert data.get("color") == "#ff5733", "Created category should have correct color"
        assert data.get("icon") == "T", "Created category should have correct icon"
        assert data.get("id") is not None, "Created category should have an id"
        
        # Store for cleanup
        TestZoneCategoryCRUD.created_category_id = data.get("id")
        TestZoneCategoryCRUD.created_category_value = unique_key
        
        print(f"✓ Created category: {unique_key} with id: {data.get('id')}")
        return data.get("id")
    
    def test_verify_created_category_exists(self, authenticated_client):
        """Verify newly created category appears in GET request"""
        response = authenticated_client.get(f"{BASE_URL}/api/admin/zone-categories")
        assert response.status_code == 200
        
        data = response.json()
        cat_values = [cat["value"] for cat in data]
        
        assert hasattr(TestZoneCategoryCRUD, 'created_category_value'), "Category should have been created in previous test"
        assert TestZoneCategoryCRUD.created_category_value in cat_values, "Created category should appear in list"
        print(f"✓ Created category {TestZoneCategoryCRUD.created_category_value} found in list")
    
    def test_create_duplicate_category_fails(self, authenticated_client):
        """Creating a category with duplicate value should fail"""
        # Try to create a category with existing value (men_prayer should exist from seed)
        payload = {
            "value": "men_prayer",
            "label_ar": "تكرار",
            "label_en": "Duplicate",
            "color": "#000000",
            "icon": "X",
            "order": 999
        }
        
        response = authenticated_client.post(f"{BASE_URL}/api/admin/zone-categories", json=payload)
        assert response.status_code == 400, f"Expected 400 for duplicate, got {response.status_code}"
        print("✓ Duplicate category creation properly rejected with 400")
    
    def test_update_zone_category(self, authenticated_client):
        """PUT /api/admin/zone-categories/{id} - update category"""
        assert hasattr(TestZoneCategoryCRUD, 'created_category_id'), "Need created category from previous test"
        cat_id = TestZoneCategoryCRUD.created_category_id
        
        update_payload = {
            "label_ar": "فئة اختبار معدلة",
            "label_en": "Updated Test Category",
            "color": "#33ff57",
            "icon": "U",
            "order": 101
        }
        
        response = authenticated_client.put(f"{BASE_URL}/api/admin/zone-categories/{cat_id}", json=update_payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("label_ar") == "فئة اختبار معدلة", "Arabic label should be updated"
        assert data.get("label_en") == "Updated Test Category", "English label should be updated"
        assert data.get("color") == "#33ff57", "Color should be updated"
        assert data.get("icon") == "U", "Icon should be updated"
        
        print(f"✓ Updated category {cat_id} successfully")
    
    def test_verify_update_persisted(self, authenticated_client):
        """Verify update was persisted via GET"""
        assert hasattr(TestZoneCategoryCRUD, 'created_category_id'), "Need created category from previous test"
        cat_id = TestZoneCategoryCRUD.created_category_id
        
        response = authenticated_client.get(f"{BASE_URL}/api/admin/zone-categories")
        assert response.status_code == 200
        
        data = response.json()
        found_cat = next((cat for cat in data if cat.get("id") == cat_id), None)
        
        assert found_cat is not None, f"Updated category {cat_id} should exist"
        assert found_cat.get("label_ar") == "فئة اختبار معدلة", "Arabic label update should persist"
        assert found_cat.get("color") == "#33ff57", "Color update should persist"
        
        print(f"✓ Update persisted correctly for category {cat_id}")
    
    def test_update_nonexistent_category_fails(self, authenticated_client):
        """Updating non-existent category should return 404"""
        fake_id = "nonexistent-category-id-12345"
        response = authenticated_client.put(f"{BASE_URL}/api/admin/zone-categories/{fake_id}", json={
            "label_ar": "test"
        })
        assert response.status_code == 404, f"Expected 404 for nonexistent, got {response.status_code}"
        print("✓ Update of non-existent category properly returns 404")
    
    def test_delete_zone_category(self, authenticated_client):
        """DELETE /api/admin/zone-categories/{id} - delete category"""
        assert hasattr(TestZoneCategoryCRUD, 'created_category_id'), "Need created category from previous test"
        cat_id = TestZoneCategoryCRUD.created_category_id
        
        response = authenticated_client.delete(f"{BASE_URL}/api/admin/zone-categories/{cat_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data or "تم" in str(data), "Should return success message"
        
        print(f"✓ Deleted category {cat_id} successfully")
    
    def test_verify_delete_persisted(self, authenticated_client):
        """Verify delete was persisted via GET"""
        assert hasattr(TestZoneCategoryCRUD, 'created_category_id'), "Need created category from previous test"
        cat_id = TestZoneCategoryCRUD.created_category_id
        
        response = authenticated_client.get(f"{BASE_URL}/api/admin/zone-categories")
        assert response.status_code == 200
        
        data = response.json()
        found_cat = next((cat for cat in data if cat.get("id") == cat_id), None)
        
        assert found_cat is None, f"Deleted category {cat_id} should not exist"
        print(f"✓ Delete persisted correctly - category {cat_id} no longer exists")
    
    def test_delete_nonexistent_category_fails(self, authenticated_client):
        """Deleting non-existent category should return 404"""
        fake_id = "nonexistent-category-id-12345"
        response = authenticated_client.delete(f"{BASE_URL}/api/admin/zone-categories/{fake_id}")
        assert response.status_code == 404, f"Expected 404 for nonexistent, got {response.status_code}"
        print("✓ Delete of non-existent category properly returns 404")


class TestDailySessionsIntegration:
    """Test that Daily Sessions page can fetch categories from API"""
    
    def test_zone_categories_accessible_without_auth(self, api_client):
        """The public endpoint should be accessible without authentication"""
        # Create fresh client with no auth
        no_auth_client = requests.Session()
        response = no_auth_client.get(f"{BASE_URL}/api/zone-categories")
        
        assert response.status_code == 200, f"Public endpoint should work without auth, got {response.status_code}"
        
        data = response.json()
        assert len(data) > 0, "Should return at least one category for Daily Sessions to use"
        print(f"✓ Public zone-categories endpoint accessible - returns {len(data)} categories")
    
    def test_category_data_has_required_fields_for_frontend(self, api_client):
        """Verify categories have all fields needed by DailySessionsPage"""
        response = api_client.get(f"{BASE_URL}/api/zone-categories")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) > 0, "Should have categories"
        
        # Check that all categories have the fields that DailySessionsPage ZONE_TYPES needs:
        # { value, label_ar, label_en, color, icon }
        for cat in data:
            assert "value" in cat, f"Category missing 'value': {cat}"
            assert "label_ar" in cat, f"Category missing 'label_ar': {cat}"
            assert "label_en" in cat, f"Category missing 'label_en': {cat}"
            assert "color" in cat, f"Category missing 'color': {cat}"
            assert "icon" in cat, f"Category missing 'icon': {cat}"
            
            # Verify types
            assert isinstance(cat["value"], str), "value should be string"
            assert isinstance(cat["color"], str), "color should be string"
            assert cat["color"].startswith("#"), f"color should be hex: {cat['color']}"
        
        print(f"✓ All {len(data)} categories have required fields for frontend")


class TestSeededCategories:
    """Test that default categories are seeded correctly"""
    
    def test_has_expected_number_of_categories(self, api_client):
        """Should have 15 seeded categories"""
        response = api_client.get(f"{BASE_URL}/api/zone-categories")
        assert response.status_code == 200
        
        data = response.json()
        # Based on seed data, we expect 15 categories
        assert len(data) >= 15, f"Expected at least 15 seeded categories, got {len(data)}"
        print(f"✓ Found {len(data)} categories (expected 15+)")
    
    def test_contains_core_zone_types(self, api_client):
        """Verify core zone types exist"""
        response = api_client.get(f"{BASE_URL}/api/zone-categories")
        assert response.status_code == 200
        
        data = response.json()
        values = {cat["value"] for cat in data}
        
        # Core types that should exist
        expected_core = {"men_prayer", "women_prayer", "service"}
        found_core = expected_core & values
        
        assert len(found_core) >= 2, f"Should have at least 2 core types. Found: {found_core}"
        print(f"✓ Found core zone types: {found_core}")
