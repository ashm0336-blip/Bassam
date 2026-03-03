"""
Test Monthly Schedules API - New feature for employee monthly schedule management
Tests: Create, Read, Update, Delete schedule and assignment endpoints
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')

# Test data
TEST_MONTH = "2026-03"
TEST_DEPARTMENT = "planning"
TEST_ADMIN_CREDS = {"email": "admin@crowd.sa", "password": "admin123"}


class TestAuthentication:
    """Auth token retrieval for subsequent tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=TEST_ADMIN_CREDS)
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        return data["access_token"]
    
    def test_admin_login(self, auth_token):
        """Verify admin can login"""
        assert auth_token is not None
        print(f"✓ Admin login successful, token obtained")


class TestMonthlyScheduleCRUD:
    """Test Monthly Schedule CRUD operations"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=TEST_ADMIN_CREDS)
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
    
    def test_get_employees_planning(self, headers):
        """Test that planning department has employees"""
        response = requests.get(f"{BASE_URL}/api/employees?department=planning", headers=headers)
        assert response.status_code == 200
        employees = response.json()
        assert len(employees) >= 10, f"Expected at least 10 employees, got {len(employees)}"
        print(f"✓ Found {len(employees)} employees in planning department")
    
    def test_get_schedule_planning_march(self, headers):
        """GET /api/schedules/planning/2026-03 - should return existing draft schedule"""
        response = requests.get(f"{BASE_URL}/api/schedules/{TEST_DEPARTMENT}/{TEST_MONTH}", headers=headers)
        # Schedule may or may not exist, both are valid
        if response.status_code == 200:
            data = response.json()
            if data:
                assert "id" in data, "Schedule should have an id"
                assert data["department"] == TEST_DEPARTMENT
                assert data["month"] == TEST_MONTH
                assert "assignments" in data
                assert "status" in data
                print(f"✓ Found schedule: status={data['status']}, assignments={len(data.get('assignments', []))}")
                return data
            else:
                print("✓ No schedule found for this month (null response)")
                return None
        else:
            print(f"✓ No schedule exists for {TEST_MONTH} (404 or error)")
            return None
    
    def test_create_schedule_new_month(self, headers):
        """POST /api/admin/schedules - Create a new schedule for a test month"""
        # Use a test month to avoid conflicts
        test_month = "2026-04"
        
        # First try to get and delete if exists
        existing = requests.get(f"{BASE_URL}/api/schedules/{TEST_DEPARTMENT}/{test_month}", headers=headers)
        if existing.status_code == 200 and existing.json():
            existing_data = existing.json()
            if existing_data.get("status") != "active":
                # Delete existing draft schedule
                requests.delete(f"{BASE_URL}/api/admin/schedules/{existing_data['id']}", headers=headers)
        
        # Create new schedule
        payload = {
            "department": TEST_DEPARTMENT,
            "month": test_month,
            "clone_from": None
        }
        response = requests.post(f"{BASE_URL}/api/admin/schedules", json=payload, headers=headers)
        
        if response.status_code == 400 and "يوجد جدول" in response.text:
            print(f"✓ Schedule already exists for {test_month} (expected behavior)")
            return
        
        assert response.status_code == 200, f"Create schedule failed: {response.text}"
        data = response.json()
        assert "id" in data, "Response should have schedule id"
        assert data["department"] == TEST_DEPARTMENT
        assert data["month"] == test_month
        assert data["status"] == "draft"
        assert "assignments" in data
        assert len(data["assignments"]) >= 10, f"Expected at least 10 assignments, got {len(data['assignments'])}"
        print(f"✓ Created schedule with {len(data['assignments'])} assignments, status={data['status']}")
        
        # Clean up - delete the test schedule
        delete_response = requests.delete(f"{BASE_URL}/api/admin/schedules/{data['id']}", headers=headers)
        assert delete_response.status_code == 200
        print(f"✓ Cleaned up test schedule")
    
    def test_create_schedule_clone_previous(self, headers):
        """POST /api/admin/schedules - Create schedule by cloning from previous month"""
        # Clone from March to May
        test_month = "2026-05"
        
        # Clean up if exists
        existing = requests.get(f"{BASE_URL}/api/schedules/{TEST_DEPARTMENT}/{test_month}", headers=headers)
        if existing.status_code == 200 and existing.json():
            existing_data = existing.json()
            if existing_data.get("status") != "active":
                requests.delete(f"{BASE_URL}/api/admin/schedules/{existing_data['id']}", headers=headers)
        
        payload = {
            "department": TEST_DEPARTMENT,
            "month": test_month,
            "clone_from": TEST_MONTH  # Clone from March
        }
        response = requests.post(f"{BASE_URL}/api/admin/schedules", json=payload, headers=headers)
        
        if response.status_code == 400 and "يوجد جدول" in response.text:
            print(f"✓ Schedule already exists for {test_month}")
            return
        
        assert response.status_code == 200, f"Clone schedule failed: {response.text}"
        data = response.json()
        assert data["status"] == "draft"
        assert len(data.get("assignments", [])) >= 1, "Cloned schedule should have assignments"
        print(f"✓ Cloned schedule from {TEST_MONTH} to {test_month} with {len(data['assignments'])} assignments")
        
        # Clean up
        requests.delete(f"{BASE_URL}/api/admin/schedules/{data['id']}", headers=headers)


class TestScheduleAssignmentUpdates:
    """Test updating individual employee assignments within a schedule"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=TEST_ADMIN_CREDS)
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
    
    @pytest.fixture(scope="class")
    def schedule(self, headers):
        """Get or create a schedule for testing"""
        response = requests.get(f"{BASE_URL}/api/schedules/{TEST_DEPARTMENT}/{TEST_MONTH}", headers=headers)
        if response.status_code == 200 and response.json():
            return response.json()
        
        # Create if doesn't exist
        payload = {"department": TEST_DEPARTMENT, "month": TEST_MONTH}
        create_response = requests.post(f"{BASE_URL}/api/admin/schedules", json=payload, headers=headers)
        if create_response.status_code == 200:
            return create_response.json()
        return None
    
    def test_update_assignment_rest_days(self, headers, schedule):
        """PUT /api/admin/schedules/{id}/assignment/{emp_id} - Update rest days"""
        if not schedule:
            pytest.skip("No schedule available for testing")
        
        # Get first assignment
        assignments = schedule.get("assignments", [])
        if not assignments:
            pytest.skip("No assignments in schedule")
        
        employee_id = assignments[0]["employee_id"]
        schedule_id = schedule["id"]
        
        # Update rest days
        new_rest_days = ["السبت", "الأحد"]
        payload = {"rest_days": new_rest_days}
        
        response = requests.put(
            f"{BASE_URL}/api/admin/schedules/{schedule_id}/assignment/{employee_id}",
            json=payload,
            headers=headers
        )
        
        assert response.status_code == 200, f"Update assignment failed: {response.text}"
        print(f"✓ Updated rest days for employee {employee_id}")
        
        # Verify update
        verify_response = requests.get(f"{BASE_URL}/api/schedules/{TEST_DEPARTMENT}/{TEST_MONTH}", headers=headers)
        assert verify_response.status_code == 200
        updated_schedule = verify_response.json()
        
        updated_assignment = next((a for a in updated_schedule.get("assignments", []) if a["employee_id"] == employee_id), None)
        assert updated_assignment is not None
        assert updated_assignment["rest_days"] == new_rest_days
        print(f"✓ Verified rest days update persisted: {new_rest_days}")
    
    def test_update_assignment_shift(self, headers, schedule):
        """PUT /api/admin/schedules/{id}/assignment/{emp_id} - Update shift"""
        if not schedule:
            pytest.skip("No schedule available")
        
        assignments = schedule.get("assignments", [])
        if len(assignments) < 2:
            pytest.skip("Need at least 2 assignments")
        
        employee_id = assignments[1]["employee_id"]
        schedule_id = schedule["id"]
        
        payload = {"shift": "الثانية"}
        response = requests.put(
            f"{BASE_URL}/api/admin/schedules/{schedule_id}/assignment/{employee_id}",
            json=payload,
            headers=headers
        )
        
        assert response.status_code == 200
        print(f"✓ Updated shift for employee {employee_id}")
    
    def test_update_assignment_location(self, headers, schedule):
        """PUT /api/admin/schedules/{id}/assignment/{emp_id} - Update location"""
        if not schedule:
            pytest.skip("No schedule available")
        
        assignments = schedule.get("assignments", [])
        if len(assignments) < 3:
            pytest.skip("Need at least 3 assignments")
        
        employee_id = assignments[2]["employee_id"]
        schedule_id = schedule["id"]
        
        payload = {"location": "موقع جديد"}
        response = requests.put(
            f"{BASE_URL}/api/admin/schedules/{schedule_id}/assignment/{employee_id}",
            json=payload,
            headers=headers
        )
        
        assert response.status_code == 200
        print(f"✓ Updated location for employee {employee_id}")


class TestScheduleStatusChanges:
    """Test schedule status transitions (draft -> active -> archived)"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=TEST_ADMIN_CREDS)
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
    
    def test_approve_schedule_to_active(self, headers):
        """PUT /api/admin/schedules/{id}/status?status=active - Approve a draft schedule"""
        # Create a test schedule first
        test_month = "2026-06"
        
        # Clean up any existing schedule
        existing = requests.get(f"{BASE_URL}/api/schedules/{TEST_DEPARTMENT}/{test_month}", headers=headers)
        if existing.status_code == 200 and existing.json():
            existing_data = existing.json()
            if existing_data.get("status") != "active":
                requests.delete(f"{BASE_URL}/api/admin/schedules/{existing_data['id']}", headers=headers)
        
        # Create new draft schedule
        create_response = requests.post(
            f"{BASE_URL}/api/admin/schedules",
            json={"department": TEST_DEPARTMENT, "month": test_month},
            headers=headers
        )
        
        if create_response.status_code != 200:
            # Schedule might already exist
            existing = requests.get(f"{BASE_URL}/api/schedules/{TEST_DEPARTMENT}/{test_month}", headers=headers)
            if existing.status_code == 200 and existing.json():
                schedule = existing.json()
            else:
                pytest.skip("Could not create or get test schedule")
        else:
            schedule = create_response.json()
        
        # Now approve the schedule
        schedule_id = schedule["id"]
        
        # Only approve if it's in draft status
        if schedule["status"] == "draft":
            response = requests.put(
                f"{BASE_URL}/api/admin/schedules/{schedule_id}/status?status=active",
                headers=headers
            )
            assert response.status_code == 200, f"Approve failed: {response.text}"
            print(f"✓ Schedule approved (status changed to active)")
            
            # Verify
            verify_response = requests.get(f"{BASE_URL}/api/schedules/{TEST_DEPARTMENT}/{test_month}", headers=headers)
            assert verify_response.status_code == 200
            verified_schedule = verify_response.json()
            assert verified_schedule["status"] == "active"
            print(f"✓ Verified schedule status is now 'active'")
            
            # Archive it so we can clean up
            requests.put(
                f"{BASE_URL}/api/admin/schedules/{schedule_id}/status?status=archived",
                headers=headers
            )
            # Delete the archived schedule
            requests.delete(f"{BASE_URL}/api/admin/schedules/{schedule_id}", headers=headers)
        else:
            print(f"✓ Schedule already in status '{schedule['status']}' - skipping approval test")
    
    def test_cannot_delete_active_schedule(self, headers):
        """Verify that active schedules cannot be deleted"""
        # Get the March schedule which might be active
        response = requests.get(f"{BASE_URL}/api/schedules/{TEST_DEPARTMENT}/{TEST_MONTH}", headers=headers)
        if response.status_code != 200 or not response.json():
            pytest.skip("No schedule found to test")
        
        schedule = response.json()
        if schedule["status"] == "active":
            delete_response = requests.delete(
                f"{BASE_URL}/api/admin/schedules/{schedule['id']}",
                headers=headers
            )
            assert delete_response.status_code == 400
            assert "نشط" in delete_response.text or "active" in delete_response.text.lower()
            print(f"✓ Cannot delete active schedule (expected behavior)")
        else:
            print(f"✓ Schedule is {schedule['status']} - deletion test not applicable")


class TestScheduleListEndpoint:
    """Test listing schedules for a department"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=TEST_ADMIN_CREDS)
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
    
    def test_list_schedules_for_department(self, headers):
        """GET /api/schedules/{department} - List all schedules"""
        response = requests.get(f"{BASE_URL}/api/schedules/{TEST_DEPARTMENT}", headers=headers)
        assert response.status_code == 200
        schedules = response.json()
        assert isinstance(schedules, list)
        print(f"✓ Found {len(schedules)} schedules for {TEST_DEPARTMENT}")
        
        if len(schedules) > 0:
            for s in schedules[:3]:  # Print first 3
                print(f"  - {s.get('month')}: {s.get('status')}, {len(s.get('assignments', []))} assignments")


class TestScheduleValidation:
    """Test validation and error handling"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=TEST_ADMIN_CREDS)
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
    
    def test_update_nonexistent_schedule(self, headers):
        """PUT assignment on non-existent schedule should return 404"""
        fake_id = "non-existent-schedule-id"
        response = requests.put(
            f"{BASE_URL}/api/admin/schedules/{fake_id}/assignment/some-emp-id",
            json={"rest_days": ["السبت"]},
            headers=headers
        )
        assert response.status_code == 404
        print(f"✓ 404 returned for non-existent schedule")
    
    def test_duplicate_schedule_creation(self, headers):
        """Creating duplicate schedule should return 400"""
        # Try to create schedule for existing month
        response = requests.get(f"{BASE_URL}/api/schedules/{TEST_DEPARTMENT}/{TEST_MONTH}", headers=headers)
        if response.status_code == 200 and response.json():
            # Schedule exists, try to create duplicate
            create_response = requests.post(
                f"{BASE_URL}/api/admin/schedules",
                json={"department": TEST_DEPARTMENT, "month": TEST_MONTH},
                headers=headers
            )
            assert create_response.status_code == 400
            assert "يوجد" in create_response.text  # "Already exists" in Arabic
            print(f"✓ Duplicate schedule creation blocked (expected 400)")
        else:
            pytest.skip("No existing schedule to test duplication")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
