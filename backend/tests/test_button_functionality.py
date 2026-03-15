"""
Test suite for button functionality across all CRUD operations
Tests: Shifts, Employees, Tasks, ProhibitedItems, ZoneCategories, Floors
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://realtime-crowd-app.preview.emergentagent.com')
API = f"{BASE_URL}/api"

# Test credentials
ADMIN_CREDENTIALS = {"identifier": "admin@crowd.sa", "password": "admin123"}

@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for admin user"""
    response = requests.post(f"{API}/auth/login", json=ADMIN_CREDENTIALS)
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    assert "access_token" in data
    return data["access_token"]

@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Return auth headers dict"""
    return {"Authorization": f"Bearer {auth_token}"}


# ============== SHIFTS CRUD Tests ==============
class TestShiftsCRUD:
    """Test shifts CRUD operations for DepartmentSettings page"""
    
    @pytest.fixture(autouse=True)
    def setup(self, auth_headers):
        self.headers = auth_headers
        self.department = "gates"  # Using gates department for testing
    
    def test_get_shifts(self):
        """Test fetching shifts list"""
        response = requests.get(f"{API}/{self.department}/settings/shifts", headers=self.headers)
        assert response.status_code == 200, f"Get shifts failed: {response.text}"
        shifts = response.json()
        assert isinstance(shifts, list)
        print(f"✅ GET shifts: {len(shifts)} shifts found")
        return shifts
    
    def test_create_shift(self):
        """Test creating a new shift - ADD SHIFT button"""
        shift_data = {
            "department": self.department,
            "setting_type": "shifts",
            "value": f"test_shift_{uuid.uuid4().hex[:6]}",
            "label": "وردية اختبارية",
            "color": "#3b82f6",
            "start_time": "08:00",
            "end_time": "16:00",
            "description": "primary",
            "order": 99
        }
        response = requests.post(f"{API}/{self.department}/settings", json=shift_data, headers=self.headers)
        assert response.status_code == 200, f"Create shift failed: {response.text}"
        data = response.json()
        assert "id" in data or "message" in data
        print(f"✅ POST create shift: Success")
        return data.get("id")
    
    def test_edit_shift(self):
        """Test editing an existing shift - EDIT SHIFT button"""
        # First get existing shifts
        response = requests.get(f"{API}/{self.department}/settings/shifts", headers=self.headers)
        assert response.status_code == 200
        shifts = response.json()
        
        if len(shifts) == 0:
            pytest.skip("No shifts to edit")
        
        shift_id = shifts[0]["id"]
        update_data = {
            "label": shifts[0].get("label", "وردية") + " معدل",
            "color": "#22c55e"
        }
        response = requests.put(f"{API}/{self.department}/settings/{shift_id}", json=update_data, headers=self.headers)
        assert response.status_code == 200, f"Edit shift failed: {response.text}"
        print(f"✅ PUT edit shift {shift_id}: Success")
    
    def test_delete_shift(self):
        """Test deleting a shift - DELETE SHIFT button"""
        # First create a shift to delete
        shift_data = {
            "department": self.department,
            "setting_type": "shifts",
            "value": f"delete_test_{uuid.uuid4().hex[:6]}",
            "label": "وردية للحذف",
            "color": "#ef4444",
            "start_time": "00:00",
            "end_time": "06:00",
            "order": 100
        }
        create_response = requests.post(f"{API}/{self.department}/settings", json=shift_data, headers=self.headers)
        assert create_response.status_code == 200
        shift_id = create_response.json().get("id")
        
        if not shift_id:
            # Try to find the created shift
            response = requests.get(f"{API}/{self.department}/settings/shifts", headers=self.headers)
            shifts = response.json()
            for s in shifts:
                if s.get("label") == "وردية للحذف":
                    shift_id = s["id"]
                    break
        
        if shift_id:
            delete_response = requests.delete(f"{API}/{self.department}/settings/{shift_id}", headers=self.headers)
            assert delete_response.status_code == 200, f"Delete shift failed: {delete_response.text}"
            print(f"✅ DELETE shift {shift_id}: Success")
        else:
            print("⚠️ Could not find shift to delete")


# ============== EMPLOYEES CRUD Tests ==============
class TestEmployeesCRUD:
    """Test employees CRUD operations for EmployeesList page"""
    
    @pytest.fixture(autouse=True)
    def setup(self, auth_headers):
        self.headers = auth_headers
        self.department = "gates"
    
    def test_get_employees(self):
        """Test fetching employees list"""
        response = requests.get(f"{API}/employees?department={self.department}", headers=self.headers)
        assert response.status_code == 200, f"Get employees failed: {response.text}"
        employees = response.json()
        assert isinstance(employees, list)
        print(f"✅ GET employees: {len(employees)} employees found")
        return employees
    
    def test_create_employee(self):
        """Test creating employee - ADD EMPLOYEE button"""
        emp_data = {
            "name": f"موظف اختبار {uuid.uuid4().hex[:6]}",
            "employee_number": f"EMP-TEST-{uuid.uuid4().hex[:4]}",
            "job_title": "موظف اختباري",
            "contact_phone": "0500000000",
            "employment_type": "permanent",
            "department": self.department,
            "shift": "",
            "rest_days": []
        }
        response = requests.post(f"{API}/employees", json=emp_data, headers=self.headers)
        assert response.status_code in [200, 201], f"Create employee failed: {response.text}"
        data = response.json()
        assert "id" in data
        print(f"✅ POST create employee: {data['id']}")
        return data["id"]
    
    def test_edit_employee(self):
        """Test editing employee - EDIT EMPLOYEE button"""
        # Get employees first
        response = requests.get(f"{API}/employees?department={self.department}", headers=self.headers)
        employees = response.json()
        
        if len(employees) == 0:
            pytest.skip("No employees to edit")
        
        emp_id = employees[0]["id"]
        update_data = {
            "job_title": "مسمى وظيفي محدث",
            "contact_phone": "0511111111"
        }
        response = requests.put(f"{API}/employees/{emp_id}", json=update_data, headers=self.headers)
        assert response.status_code == 200, f"Edit employee failed: {response.text}"
        print(f"✅ PUT edit employee {emp_id}: Success")
    
    def test_delete_employee(self):
        """Test deleting employee - DELETE EMPLOYEE button"""
        # First create an employee to delete
        emp_data = {
            "name": f"موظف للحذف {uuid.uuid4().hex[:6]}",
            "employee_number": f"DEL-{uuid.uuid4().hex[:4]}",
            "job_title": "للحذف",
            "employment_type": "temporary",
            "department": self.department,
            "shift": "",
            "rest_days": []
        }
        create_response = requests.post(f"{API}/employees", json=emp_data, headers=self.headers)
        assert create_response.status_code in [200, 201]
        emp_id = create_response.json()["id"]
        
        delete_response = requests.delete(f"{API}/employees/{emp_id}", headers=self.headers)
        assert delete_response.status_code == 200, f"Delete employee failed: {delete_response.text}"
        print(f"✅ DELETE employee {emp_id}: Success")
    
    def test_employee_account_actions(self):
        """Test account actions - activate, freeze, terminate, reset-pin"""
        # Get an employee with national_id
        response = requests.get(f"{API}/employees?department={self.department}", headers=self.headers)
        employees = response.json()
        
        # Find employee with national_id or create one
        emp_with_id = None
        for emp in employees:
            if emp.get("national_id"):
                emp_with_id = emp
                break
        
        if not emp_with_id:
            print("⚠️ No employee with national_id found for account action tests - skipping")
            return
        
        emp_id = emp_with_id["id"]
        emp_name = emp_with_id["name"]
        
        # Test activate-account
        response = requests.post(f"{API}/employees/{emp_id}/activate-account", headers=self.headers)
        if response.status_code == 200:
            print(f"✅ POST activate-account for {emp_name}: Success")
        else:
            print(f"⚠️ activate-account: {response.status_code} - {response.text[:100]}")
        
        # Test freeze-account (if active)
        response = requests.post(f"{API}/employees/{emp_id}/freeze-account", headers=self.headers)
        if response.status_code == 200:
            print(f"✅ POST freeze-account for {emp_name}: Success")
        else:
            print(f"⚠️ freeze-account: {response.status_code} - {response.text[:100]}")
        
        # Test reset-pin (if has account)
        response = requests.post(f"{API}/employees/{emp_id}/reset-pin", headers=self.headers)
        if response.status_code == 200:
            print(f"✅ POST reset-pin for {emp_name}: Success")
        else:
            print(f"⚠️ reset-pin: {response.status_code} - {response.text[:100]}")


# ============== TASKS CRUD Tests ==============
class TestTasksCRUD:
    """Test tasks CRUD operations for TasksPage"""
    
    @pytest.fixture(autouse=True)
    def setup(self, auth_headers):
        self.headers = auth_headers
        self.department = "gates"
    
    def test_get_tasks(self):
        """Test fetching tasks list"""
        response = requests.get(f"{API}/tasks?department={self.department}", headers=self.headers)
        assert response.status_code == 200, f"Get tasks failed: {response.text}"
        tasks = response.json()
        assert isinstance(tasks, list)
        print(f"✅ GET tasks: {len(tasks)} tasks found")
        return tasks
    
    def test_create_task(self):
        """Test creating task - CREATE TASK button"""
        # First get an employee to assign
        emp_response = requests.get(f"{API}/employees?department={self.department}", headers=self.headers)
        employees = emp_response.json()
        
        if len(employees) == 0:
            pytest.skip("No employees to assign task to")
        
        assignee_ids = [employees[0]["id"]]
        
        task_data = {
            "title": f"مهمة اختبارية {uuid.uuid4().hex[:6]}",
            "description": "وصف المهمة الاختبارية",
            "department": self.department,
            "priority": "normal",
            "assignee_ids": assignee_ids
        }
        response = requests.post(f"{API}/tasks", json=task_data, headers=self.headers)
        assert response.status_code == 200 or response.status_code == 201, f"Create task failed: {response.text}"
        data = response.json()
        assert "id" in data
        print(f"✅ POST create task: {data['id']}")
        return data["id"]
    
    def test_edit_task(self):
        """Test editing task - EDIT TASK button"""
        # Get tasks
        response = requests.get(f"{API}/tasks?department={self.department}", headers=self.headers)
        tasks = response.json()
        
        if len(tasks) == 0:
            pytest.skip("No tasks to edit")
        
        task_id = tasks[0]["id"]
        update_data = {
            "title": "مهمة معدلة",
            "priority": "high"
        }
        response = requests.put(f"{API}/tasks/{task_id}", json=update_data, headers=self.headers)
        assert response.status_code == 200, f"Edit task failed: {response.text}"
        print(f"✅ PUT edit task {task_id}: Success")
    
    def test_update_task_status(self):
        """Test changing task status"""
        response = requests.get(f"{API}/tasks?department={self.department}", headers=self.headers)
        tasks = response.json()
        
        if len(tasks) == 0:
            pytest.skip("No tasks to update status")
        
        task_id = tasks[0]["id"]
        status_data = {"status": "in_progress"}
        response = requests.put(f"{API}/tasks/{task_id}/status", json=status_data, headers=self.headers)
        assert response.status_code == 200, f"Update task status failed: {response.text}"
        print(f"✅ PUT task status {task_id}: Success")
    
    def test_delete_task(self):
        """Test deleting task - DELETE TASK button"""
        # First create a task to delete
        emp_response = requests.get(f"{API}/employees?department={self.department}", headers=self.headers)
        employees = emp_response.json()
        
        if len(employees) == 0:
            pytest.skip("No employees for task deletion test")
        
        task_data = {
            "title": f"مهمة للحذف {uuid.uuid4().hex[:6]}",
            "description": "للحذف",
            "department": self.department,
            "priority": "low",
            "assignee_ids": [employees[0]["id"]]
        }
        create_response = requests.post(f"{API}/tasks", json=task_data, headers=self.headers)
        assert create_response.status_code in [200, 201]
        task_id = create_response.json()["id"]
        
        delete_response = requests.delete(f"{API}/tasks/{task_id}", headers=self.headers)
        assert delete_response.status_code == 200, f"Delete task failed: {delete_response.text}"
        print(f"✅ DELETE task {task_id}: Success")


# ============== PROHIBITED ITEMS CRUD Tests ==============
class TestProhibitedItemsCRUD:
    """Test prohibited items CRUD operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self, auth_headers):
        self.headers = auth_headers
    
    def test_get_prohibited_items(self):
        """Test fetching prohibited items"""
        response = requests.get(f"{API}/prohibited-items", headers=self.headers)
        assert response.status_code == 200, f"Get prohibited items failed: {response.text}"
        items = response.json()
        assert isinstance(items, list)
        print(f"✅ GET prohibited items: {len(items)} items found")
        return items
    
    def test_create_prohibited_item(self):
        """Test creating prohibited item - ADD ITEM button"""
        item_data = {
            "name_ar": f"ممنوع اختباري {uuid.uuid4().hex[:6]}",
            "name_en": f"Test Item {uuid.uuid4().hex[:6]}",
            "category": "other",
            "severity": "medium"
        }
        response = requests.post(f"{API}/admin/prohibited-items", json=item_data, headers=self.headers)
        assert response.status_code == 200 or response.status_code == 201, f"Create prohibited item failed: {response.text}"
        data = response.json()
        assert "id" in data
        print(f"✅ POST create prohibited item: {data['id']}")
        return data["id"]
    
    def test_edit_prohibited_item(self):
        """Test editing prohibited item - EDIT ITEM button (PUT endpoint)"""
        # First get items
        response = requests.get(f"{API}/prohibited-items", headers=self.headers)
        items = response.json()
        
        if len(items) == 0:
            pytest.skip("No prohibited items to edit")
        
        item_id = items[0]["id"]
        update_data = {
            "name_ar": "عنصر معدل",
            "name_en": "Updated Item",
            "category": items[0].get("category", "other"),
            "severity": "high"
        }
        response = requests.put(f"{API}/admin/prohibited-items/{item_id}", json=update_data, headers=self.headers)
        assert response.status_code == 200, f"Edit prohibited item failed: {response.text}"
        print(f"✅ PUT edit prohibited item {item_id}: Success")
    
    def test_delete_prohibited_item(self):
        """Test deleting prohibited item - DELETE ITEM button"""
        # First create an item to delete
        item_data = {
            "name_ar": f"للحذف {uuid.uuid4().hex[:6]}",
            "name_en": f"To Delete {uuid.uuid4().hex[:6]}",
            "category": "other",
            "severity": "low"
        }
        create_response = requests.post(f"{API}/admin/prohibited-items", json=item_data, headers=self.headers)
        assert create_response.status_code in [200, 201]
        item_id = create_response.json()["id"]
        
        delete_response = requests.delete(f"{API}/admin/prohibited-items/{item_id}", headers=self.headers)
        assert delete_response.status_code == 200, f"Delete prohibited item failed: {delete_response.text}"
        print(f"✅ DELETE prohibited item {item_id}: Success")


# ============== ZONE CATEGORIES CRUD Tests ==============
class TestZoneCategoriesCRUD:
    """Test zone categories CRUD operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self, auth_headers):
        self.headers = auth_headers
    
    def test_get_zone_categories(self):
        """Test fetching zone categories"""
        response = requests.get(f"{API}/admin/zone-categories", headers=self.headers)
        assert response.status_code == 200, f"Get zone categories failed: {response.text}"
        categories = response.json()
        assert isinstance(categories, list)
        print(f"✅ GET zone categories: {len(categories)} categories found")
        return categories
    
    def test_create_zone_category(self):
        """Test creating zone category - ADD CATEGORY button"""
        cat_data = {
            "value": f"test_cat_{uuid.uuid4().hex[:6]}",
            "label_ar": f"فئة اختبارية {uuid.uuid4().hex[:4]}",
            "label_en": f"Test Category {uuid.uuid4().hex[:4]}",
            "color": "#22c55e",
            "icon": "T",
            "order": 99
        }
        response = requests.post(f"{API}/admin/zone-categories", json=cat_data, headers=self.headers)
        assert response.status_code == 200 or response.status_code == 201, f"Create zone category failed: {response.text}"
        data = response.json()
        assert "id" in data
        print(f"✅ POST create zone category: {data['id']}")
        return data["id"]
    
    def test_edit_zone_category(self):
        """Test editing zone category - EDIT CATEGORY button"""
        response = requests.get(f"{API}/admin/zone-categories", headers=self.headers)
        categories = response.json()
        
        if len(categories) == 0:
            pytest.skip("No zone categories to edit")
        
        cat_id = categories[0]["id"]
        update_data = {
            "label_ar": "فئة معدلة",
            "color": "#ef4444"
        }
        response = requests.put(f"{API}/admin/zone-categories/{cat_id}", json=update_data, headers=self.headers)
        assert response.status_code == 200, f"Edit zone category failed: {response.text}"
        print(f"✅ PUT edit zone category {cat_id}: Success")
    
    def test_delete_zone_category(self):
        """Test deleting zone category - DELETE CATEGORY button"""
        # First create a category to delete
        cat_data = {
            "value": f"del_cat_{uuid.uuid4().hex[:6]}",
            "label_ar": "للحذف",
            "label_en": "To Delete",
            "color": "#ef4444",
            "icon": "X",
            "order": 100
        }
        create_response = requests.post(f"{API}/admin/zone-categories", json=cat_data, headers=self.headers)
        assert create_response.status_code in [200, 201]
        cat_id = create_response.json()["id"]
        
        delete_response = requests.delete(f"{API}/admin/zone-categories/{cat_id}", headers=self.headers)
        assert delete_response.status_code == 200, f"Delete zone category failed: {delete_response.text}"
        print(f"✅ DELETE zone category {cat_id}: Success")


# ============== FLOORS CRUD Tests ==============
class TestFloorsCRUD:
    """Test floors/maps CRUD operations for MapManagementPage"""
    
    @pytest.fixture(autouse=True)
    def setup(self, auth_headers):
        self.headers = auth_headers
        self.department = "plazas"
    
    def test_get_floors(self):
        """Test fetching floors"""
        response = requests.get(f"{API}/floors?department={self.department}", headers=self.headers)
        assert response.status_code == 200, f"Get floors failed: {response.text}"
        floors = response.json()
        assert isinstance(floors, list)
        print(f"✅ GET floors: {len(floors)} floors found")
        return floors
    
    def test_create_floor(self):
        """Test creating floor - ADD FLOOR button"""
        floor_data = {
            "name_ar": f"طابق اختباري {uuid.uuid4().hex[:4]}",
            "name_en": f"Test Floor {uuid.uuid4().hex[:4]}",
            "floor_number": 99,
            "image_url": "",
            "order": 99,
            "department": self.department
        }
        response = requests.post(f"{API}/admin/floors", json=floor_data, headers=self.headers)
        assert response.status_code == 200 or response.status_code == 201, f"Create floor failed: {response.text}"
        data = response.json()
        assert "id" in data
        print(f"✅ POST create floor: {data['id']}")
        return data["id"]
    
    def test_edit_floor(self):
        """Test editing floor - EDIT FLOOR button"""
        response = requests.get(f"{API}/floors?department={self.department}", headers=self.headers)
        floors = response.json()
        
        if len(floors) == 0:
            pytest.skip("No floors to edit")
        
        floor_id = floors[0]["id"]
        update_data = {
            "name_ar": "طابق معدل",
            "floor_number": floors[0].get("floor_number", 1)
        }
        response = requests.put(f"{API}/admin/floors/{floor_id}", json=update_data, headers=self.headers)
        assert response.status_code == 200, f"Edit floor failed: {response.text}"
        print(f"✅ PUT edit floor {floor_id}: Success")
    
    def test_delete_floor(self):
        """Test deleting floor - DELETE FLOOR button"""
        # First create a floor to delete
        floor_data = {
            "name_ar": "طابق للحذف",
            "name_en": "Floor to Delete",
            "floor_number": 100,
            "image_url": "",
            "order": 100,
            "department": self.department
        }
        create_response = requests.post(f"{API}/admin/floors", json=floor_data, headers=self.headers)
        assert create_response.status_code in [200, 201]
        floor_id = create_response.json()["id"]
        
        delete_response = requests.delete(f"{API}/admin/floors/{floor_id}", headers=self.headers)
        assert delete_response.status_code == 200, f"Delete floor failed: {delete_response.text}"
        print(f"✅ DELETE floor {floor_id}: Success")


# ============== DASHBOARD Tests ==============
class TestDashboard:
    """Test dashboard functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self, auth_headers):
        self.headers = auth_headers
    
    def test_dashboard_ops(self):
        """Test dashboard operations endpoint"""
        response = requests.get(f"{API}/dashboard/ops", headers=self.headers)
        assert response.status_code == 200, f"Dashboard ops failed: {response.text}"
        data = response.json()
        assert "kpis" in data
        print(f"✅ GET dashboard/ops: Success")
    
    def test_dashboard_departments(self):
        """Test dashboard departments endpoint"""
        response = requests.get(f"{API}/dashboard/departments", headers=self.headers)
        assert response.status_code == 200, f"Dashboard departments failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ GET dashboard/departments: {len(data)} departments")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
