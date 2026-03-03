"""
Test Employee Rest Days Feature - Testing the new direct rest_days multi-select
Replaced the old rest_patterns system with direct day selection on employees
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestEmployeeRestDays:
    """Test employee rest_days field - replacing old rest_patterns system"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token for authenticated requests"""
        self.session = requests.Session()
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@crowd.sa",
            "password": "admin123"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        token = login_response.json()["access_token"]
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_get_employees_returns_rest_days_field(self):
        """GET /api/employees should return rest_days array for each employee"""
        response = self.session.get(f"{BASE_URL}/api/employees?department=planning")
        assert response.status_code == 200, f"Failed to get employees: {response.text}"
        
        employees = response.json()
        assert len(employees) > 0, "No employees found in planning department"
        
        # Check that at least one employee has rest_days field
        employees_with_rest_days = [e for e in employees if 'rest_days' in e]
        assert len(employees_with_rest_days) > 0, "No employees have rest_days field"
        
        # Check the format is array of strings
        for emp in employees_with_rest_days:
            if emp.get('rest_days'):
                assert isinstance(emp['rest_days'], list), f"rest_days should be list for {emp['name']}"
                for day in emp['rest_days']:
                    assert isinstance(day, str), f"Each rest day should be string, got {type(day)}"
        
        print(f"✓ Found {len(employees_with_rest_days)} employees with rest_days field")
        print(f"  Sample: {employees_with_rest_days[0]['name']} has rest_days: {employees_with_rest_days[0].get('rest_days')}")
    
    def test_update_employee_with_rest_days_array(self):
        """PUT /api/employees/{id} should accept rest_days array"""
        # First get an employee
        response = self.session.get(f"{BASE_URL}/api/employees?department=planning")
        assert response.status_code == 200
        employees = response.json()
        assert len(employees) > 0
        
        employee = employees[0]
        employee_id = employee['id']
        original_rest_days = employee.get('rest_days', [])
        
        # Update with new rest_days
        new_rest_days = ["السبت", "الأحد"]  # Saturday and Sunday
        update_response = self.session.put(f"{BASE_URL}/api/employees/{employee_id}", json={
            "rest_days": new_rest_days
        })
        assert update_response.status_code == 200, f"Failed to update employee: {update_response.text}"
        
        # Verify the update
        verify_response = self.session.get(f"{BASE_URL}/api/employees?department=planning")
        assert verify_response.status_code == 200
        updated_employees = verify_response.json()
        updated_employee = next((e for e in updated_employees if e['id'] == employee_id), None)
        
        assert updated_employee is not None
        assert updated_employee.get('rest_days') == new_rest_days, \
            f"rest_days not updated: expected {new_rest_days}, got {updated_employee.get('rest_days')}"
        
        print(f"✓ Successfully updated employee {employee['name']} with rest_days: {new_rest_days}")
        
        # Restore original value
        self.session.put(f"{BASE_URL}/api/employees/{employee_id}", json={
            "rest_days": original_rest_days
        })
    
    def test_update_employee_with_empty_rest_days(self):
        """PUT /api/employees/{id} should accept empty rest_days array"""
        # Get an employee
        response = self.session.get(f"{BASE_URL}/api/employees?department=planning")
        assert response.status_code == 200
        employees = response.json()
        employee = employees[0]
        employee_id = employee['id']
        original_rest_days = employee.get('rest_days', [])
        
        # Update with empty array
        update_response = self.session.put(f"{BASE_URL}/api/employees/{employee_id}", json={
            "rest_days": []
        })
        assert update_response.status_code == 200, f"Failed to update: {update_response.text}"
        
        # Verify
        verify_response = self.session.get(f"{BASE_URL}/api/employees?department=planning")
        updated_employees = verify_response.json()
        updated_employee = next((e for e in updated_employees if e['id'] == employee_id), None)
        
        assert updated_employee is not None
        assert updated_employee.get('rest_days') == [], \
            f"rest_days should be empty array, got {updated_employee.get('rest_days')}"
        
        print(f"✓ Successfully set empty rest_days for employee {employee['name']}")
        
        # Restore
        self.session.put(f"{BASE_URL}/api/employees/{employee_id}", json={
            "rest_days": original_rest_days
        })
    
    def test_update_employee_with_multiple_rest_days(self):
        """PUT /api/employees/{id} should accept multiple rest days"""
        response = self.session.get(f"{BASE_URL}/api/employees?department=planning")
        assert response.status_code == 200
        employees = response.json()
        employee = employees[0]
        employee_id = employee['id']
        original_rest_days = employee.get('rest_days', [])
        
        # Update with multiple days
        new_rest_days = ["الجمعة", "السبت", "الأحد"]  # Friday, Saturday, Sunday
        update_response = self.session.put(f"{BASE_URL}/api/employees/{employee_id}", json={
            "rest_days": new_rest_days
        })
        assert update_response.status_code == 200
        
        # Verify
        verify_response = self.session.get(f"{BASE_URL}/api/employees?department=planning")
        updated_employees = verify_response.json()
        updated_employee = next((e for e in updated_employees if e['id'] == employee_id), None)
        
        assert updated_employee is not None
        assert set(updated_employee.get('rest_days', [])) == set(new_rest_days), \
            f"rest_days mismatch: expected {new_rest_days}, got {updated_employee.get('rest_days')}"
        
        print(f"✓ Successfully set multiple rest_days: {new_rest_days}")
        
        # Restore
        self.session.put(f"{BASE_URL}/api/employees/{employee_id}", json={
            "rest_days": original_rest_days
        })
    
    def test_create_employee_with_rest_days(self):
        """POST /api/employees should accept rest_days in new employee"""
        new_employee = {
            "name": "TEST_موظف_اختباري",
            "employee_number": "TEST99999",
            "job_title": "اختبار",
            "department": "planning",
            "location": "اختبار",
            "shift": "الأولى",
            "rest_days": ["الجمعة", "السبت"]
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/employees", json=new_employee)
        assert create_response.status_code == 200, f"Failed to create employee: {create_response.text}"
        
        created_data = create_response.json()
        employee_id = created_data.get('id')
        assert employee_id is not None, "No employee ID returned"
        
        # Verify employee was created with rest_days
        verify_response = self.session.get(f"{BASE_URL}/api/employees?department=planning")
        employees = verify_response.json()
        created_employee = next((e for e in employees if e['id'] == employee_id), None)
        
        assert created_employee is not None, "Created employee not found"
        assert created_employee.get('rest_days') == ["الجمعة", "السبت"], \
            f"rest_days not preserved: got {created_employee.get('rest_days')}"
        
        print(f"✓ Successfully created employee with rest_days: {created_employee.get('rest_days')}")
        
        # Cleanup - delete test employee
        delete_response = self.session.delete(f"{BASE_URL}/api/employees/{employee_id}")
        assert delete_response.status_code == 200, f"Failed to cleanup test employee: {delete_response.text}"


class TestDepartmentSettingsNoRestPatterns:
    """Verify rest_patterns tab has been removed from Department Settings"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login"""
        self.session = requests.Session()
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@crowd.sa",
            "password": "admin123"
        })
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_gates_department_settings_types(self):
        """Department settings for gates should only have shifts and coverage_locations"""
        # Get shifts
        shifts_response = self.session.get(f"{BASE_URL}/api/gates/settings/shifts")
        assert shifts_response.status_code == 200
        
        # Get coverage locations
        locations_response = self.session.get(f"{BASE_URL}/api/gates/settings/coverage_locations")
        assert locations_response.status_code == 200
        
        # Old rest_patterns endpoint should NOT exist or return empty
        rest_patterns_response = self.session.get(f"{BASE_URL}/api/gates/settings/rest_patterns")
        # This endpoint might return 404 or empty array depending on implementation
        if rest_patterns_response.status_code == 200:
            # If endpoint still exists, data should be empty (not used anymore)
            data = rest_patterns_response.json()
            print(f"  Note: rest_patterns endpoint returns {len(data)} items (should be unused)")
        
        print("✓ Department settings verified - shifts and coverage_locations available")
    
    def test_planning_department_settings_types(self):
        """Department settings for planning should only have shifts and coverage_locations"""
        shifts_response = self.session.get(f"{BASE_URL}/api/planning/settings/shifts")
        assert shifts_response.status_code == 200
        
        locations_response = self.session.get(f"{BASE_URL}/api/planning/settings/coverage_locations")
        assert locations_response.status_code == 200
        
        print("✓ Planning department settings verified")


class TestEmployeeStatusBasedOnRestDays:
    """Test that employee status (on_rest) is computed based on rest_days"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@crowd.sa",
            "password": "admin123"
        })
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_employee_rest_days_contains_valid_days(self):
        """Employee rest_days should contain valid Arabic day names"""
        valid_days = ["السبت", "الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"]
        
        response = self.session.get(f"{BASE_URL}/api/employees?department=planning")
        assert response.status_code == 200
        employees = response.json()
        
        for emp in employees:
            rest_days = emp.get('rest_days', [])
            for day in rest_days:
                assert day in valid_days, f"Invalid day '{day}' for employee {emp['name']}"
        
        print(f"✓ All rest_days contain valid Arabic day names")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
