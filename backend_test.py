#!/usr/bin/env python3
"""
Al-Haram OS (Crowd Services Platform) Backend API Testing
Tests all API endpoints for the Arabic RTL crowd management platform
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, List, Any

class AlHaramAPITester:
    def __init__(self, base_url="https://mecca-crowd.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.results = {}
        self.auth_token = None
        self.admin_user = None

    def log_result(self, test_name: str, success: bool, details: str = ""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {test_name} - PASSED")
        else:
            self.failed_tests.append({"test": test_name, "details": details})
            print(f"❌ {test_name} - FAILED: {details}")
        
        self.results[test_name] = {
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }

    def test_endpoint(self, name: str, endpoint: str, expected_status: int = 200, 
                     method: str = "GET", data: dict = None, 
                     required_fields: List[str] = None, auth_required: bool = False) -> tuple:
        """Test a single API endpoint"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        # Add auth header if required and available
        if auth_required and self.auth_token:
            headers['Authorization'] = f'Bearer {self.auth_token}'
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)
            else:
                raise ValueError(f"Unsupported method: {method}")

            # Check status code
            if response.status_code != expected_status:
                self.log_result(name, False, f"Expected {expected_status}, got {response.status_code}")
                return False, {}

            # Try to parse JSON
            try:
                response_data = response.json()
            except json.JSONDecodeError:
                self.log_result(name, False, "Invalid JSON response")
                return False, {}

            # Check required fields if specified
            if required_fields:
                if isinstance(response_data, list):
                    if len(response_data) > 0 and isinstance(response_data[0], dict):
                        missing_fields = [field for field in required_fields if field not in response_data[0]]
                        if missing_fields:
                            self.log_result(name, False, f"Missing fields: {missing_fields}")
                            return False, response_data
                elif isinstance(response_data, dict):
                    missing_fields = [field for field in required_fields if field not in response_data]
                    if missing_fields:
                        self.log_result(name, False, f"Missing fields: {missing_fields}")
                        return False, response_data

            self.log_result(name, True, f"Status: {response.status_code}, Data length: {len(str(response_data))}")
            return True, response_data

        except requests.exceptions.RequestException as e:
            self.log_result(name, False, f"Request error: {str(e)}")
            return False, {}
        except Exception as e:
            self.log_result(name, False, f"Unexpected error: {str(e)}")
            return False, {}

    def test_dashboard_endpoints(self):
        """Test dashboard related endpoints"""
        print("\n🏠 Testing Dashboard Endpoints...")
        
        # Test dashboard stats
        success, data = self.test_endpoint(
            "Dashboard Stats",
            "dashboard/stats",
            required_fields=["total_visitors_today", "current_crowd", "max_capacity", "active_staff", "open_gates", "total_gates", "incidents_today", "alerts_count"]
        )
        
        # Test departments
        success, data = self.test_endpoint(
            "Dashboard Departments",
            "dashboard/departments",
            required_fields=["id", "name", "name_en", "icon", "current_crowd", "max_capacity", "percentage", "status", "active_staff", "incidents_today"]
        )
        
        # Test hourly crowd data
        success, data = self.test_endpoint(
            "Hourly Crowd Data",
            "dashboard/crowd-hourly"
        )

    def test_gates_endpoints(self):
        """Test gates management endpoints"""
        print("\n🚪 Testing Gates Endpoints...")
        
        # Test gates list
        success, data = self.test_endpoint(
            "Gates List",
            "gates",
            required_fields=["id", "name", "number", "status", "direction", "current_flow", "max_flow", "location"]
        )
        
        # Test gates with status filter
        success, data = self.test_endpoint(
            "Gates Filtered by Status",
            "gates?status=open"
        )
        
        # Test gates stats
        success, data = self.test_endpoint(
            "Gates Statistics",
            "gates/stats",
            required_fields=["total", "open", "closed", "maintenance", "total_flow", "entry_gates", "exit_gates"]
        )

    def test_plazas_endpoints(self):
        """Test plazas management endpoints"""
        print("\n🏛️ Testing Plazas Endpoints...")
        
        # Test plazas list
        success, data = self.test_endpoint(
            "Plazas List",
            "plazas",
            required_fields=["id", "name", "current_crowd", "max_capacity", "percentage", "status", "zone"]
        )
        
        # Test plazas stats
        success, data = self.test_endpoint(
            "Plazas Statistics",
            "plazas/stats",
            required_fields=["total_plazas", "current_crowd", "max_capacity", "overall_percentage", "normal", "warning", "critical"]
        )

    def test_mataf_endpoints(self):
        """Test Mataf (circumambulation area) endpoints"""
        print("\n⭕ Testing Mataf Endpoints...")
        
        # Test mataf levels
        success, data = self.test_endpoint(
            "Mataf Levels",
            "mataf",
            required_fields=["id", "level", "current_crowd", "max_capacity", "percentage", "average_tawaf_time", "status"]
        )
        
        # Test mataf stats
        success, data = self.test_endpoint(
            "Mataf Statistics",
            "mataf/stats",
            required_fields=["total_levels", "current_crowd", "max_capacity", "overall_percentage", "average_tawaf_time", "status_summary"]
        )

    def test_alerts_endpoints(self):
        """Test alerts endpoints"""
        print("\n⚠️ Testing Alerts Endpoints...")
        
        # Test alerts list
        success, data = self.test_endpoint(
            "Alerts List",
            "alerts",
            required_fields=["id", "type", "title", "message", "department", "timestamp", "is_read"]
        )
        
        # Test alerts with filters
        success, data = self.test_endpoint(
            "Alerts Filtered by Department",
            "alerts?department=gates"
        )
        
        success, data = self.test_endpoint(
            "Alerts Filtered by Type",
            "alerts?type=warning"
        )

    def test_notifications_endpoints(self):
        """Test notifications endpoints"""
        print("\n🔔 Testing Notifications Endpoints...")
        
        # Test notifications list
        success, data = self.test_endpoint(
            "Notifications List",
            "notifications",
            required_fields=["id", "type", "title", "message", "timestamp", "is_read", "priority"]
        )
        
        # Test unread notifications
        success, data = self.test_endpoint(
            "Unread Notifications",
            "notifications?unread_only=true"
        )

    def test_reports_endpoints(self):
        """Test reports endpoints"""
        print("\n📊 Testing Reports Endpoints...")
        
        # Test reports list
        success, data = self.test_endpoint(
            "Reports List",
            "reports"
        )
        
        # Test reports with filters
        success, data = self.test_endpoint(
            "Reports Filtered by Type",
            "reports?type=daily"
        )
        
        success, data = self.test_endpoint(
            "Reports Filtered by Department",
            "reports?department=gates"
        )

    def test_planning_endpoints(self):
        """Test planning department endpoints"""
        print("\n📋 Testing Planning Endpoints...")
        
        # Test planning stats
        success, data = self.test_endpoint(
            "Planning Statistics",
            "planning/stats",
            required_fields=["active_plans", "pending_approvals", "completed_today", "scheduled_events", "resource_utilization", "staff_deployed"]
        )

    def test_crowd_services_endpoints(self):
        """Test crowd services endpoints"""
        print("\n👥 Testing Crowd Services Endpoints...")
        
        # Test crowd services stats
        success, data = self.test_endpoint(
            "Crowd Services Statistics",
            "crowd-services/stats",
            required_fields=["service_requests_today", "resolved_requests", "pending_requests", "average_response_time", "satisfaction_rate", "active_teams"]
        )

    def test_authentication_endpoints(self):
        """Test JWT authentication endpoints"""
        print("\n🔐 Testing Authentication Endpoints...")
        
        # Test admin login with correct credentials from frontend
        admin_login_data = {
            "email": "admin@crowd.sa",
            "password": "admin123"
        }
        
        success, data = self.test_endpoint(
            "Admin Login",
            "auth/login",
            method="POST",
            data=admin_login_data,
            expected_status=200,
            required_fields=["access_token", "token_type", "user"]
        )
        
        if success and "access_token" in data:
            self.auth_token = data["access_token"]
            self.admin_user = data["user"]
            print(f"🔑 Admin token acquired for user: {self.admin_user.get('name', 'Unknown')}")
        
        # Test /auth/me endpoint with token
        if self.auth_token:
            success, data = self.test_endpoint(
                "Get Current User",
                "auth/me",
                auth_required=True,
                required_fields=["id", "email", "name", "role", "created_at"]
            )
        
        # Test invalid login
        invalid_login_data = {
            "email": "invalid@test.com",
            "password": "wrongpassword"
        }
        
        success, data = self.test_endpoint(
            "Invalid Login (Should Fail)",
            "auth/login",
            method="POST",
            data=invalid_login_data,
            expected_status=401
        )

    def test_user_management_endpoints(self):
        """Test comprehensive user management and permissions"""
        print("\n👥 Testing User Management & Permissions...")
        
        if not self.auth_token:
            print("⚠️ No auth token available, skipping user management tests")
            return
        
        # Test 1: GET /api/users - List all users (super_admin only)
        success, users_data = self.test_endpoint(
            "GET /api/users - List All Users (super_admin)",
            "users",
            auth_required=True,
            required_fields=["id", "email", "name", "role", "created_at"]
        )
        
        initial_user_count = len(users_data) if success and isinstance(users_data, list) else 0
        print(f"  📊 Initial user count: {initial_user_count}")
        
        # Test 2: POST /api/users - Create user with field_staff role (requires department)
        test_user_field_staff = {
            "name": "Ahmed Al-Mataf",
            "email": "ahmed.test@crowd.sa",
            "password": "test123456",
            "role": "field_staff",
            "department": "mataf"
        }
        
        success, created_user = self.test_endpoint(
            "POST /api/users - Create Field Staff with Department",
            "users",
            method="POST",
            data=test_user_field_staff,
            auth_required=True,
            expected_status=200,
            required_fields=["id", "email", "name", "role", "department"]
        )
        
        field_staff_user_id = None
        if success and "id" in created_user:
            field_staff_user_id = created_user["id"]
            if created_user.get("department") != "mataf":
                self.log_result("Verify Field Staff Department", False, f"Expected department 'mataf', got '{created_user.get('department')}'")
            else:
                self.log_result("Verify Field Staff Department", True, "Department correctly set to 'mataf'")
        
        # Test 3: POST /api/users - Create dept_manager (requires department)
        test_user_dept_manager = {
            "name": "Fatima Al-Plazas",
            "email": "fatima.test@crowd.sa",
            "password": "test123456",
            "role": "department_manager",
            "department": "plazas"
        }
        
        success, created_manager = self.test_endpoint(
            "POST /api/users - Create Dept Manager with Department",
            "users",
            method="POST",
            data=test_user_dept_manager,
            auth_required=True,
            expected_status=200,
            required_fields=["id", "email", "name", "role", "department"]
        )
        
        dept_manager_user_id = None
        if success and "id" in created_manager:
            dept_manager_user_id = created_manager["id"]
            if created_manager.get("department") != "plazas":
                self.log_result("Verify Dept Manager Department", False, f"Expected department 'plazas', got '{created_manager.get('department')}'")
            else:
                self.log_result("Verify Dept Manager Department", True, "Department correctly set to 'plazas'")
        
        # Test 4: POST /api/users - Create monitoring_team (no department required)
        test_user_monitoring = {
            "name": "Omar Monitoring",
            "email": "omar.test@crowd.sa",
            "password": "test123456",
            "role": "monitoring_team"
        }
        
        success, created_monitoring = self.test_endpoint(
            "POST /api/users - Create Monitoring Team (no department)",
            "users",
            method="POST",
            data=test_user_monitoring,
            auth_required=True,
            expected_status=200,
            required_fields=["id", "email", "name", "role"]
        )
        
        monitoring_user_id = None
        if success and "id" in created_monitoring:
            monitoring_user_id = created_monitoring["id"]
        
        # Test 5: POST /api/users - Try to create field_staff WITHOUT department (should fail)
        test_user_no_dept = {
            "name": "Invalid User",
            "email": "invalid.test@crowd.sa",
            "password": "test123456",
            "role": "field_staff"
            # Missing department
        }
        
        success, error_response = self.test_endpoint(
            "POST /api/users - Field Staff without Department (should fail)",
            "users",
            method="POST",
            data=test_user_no_dept,
            auth_required=True,
            expected_status=400
        )
        
        # Test 6: POST /api/users - Try to create dept_manager WITHOUT department (should fail)
        test_manager_no_dept = {
            "name": "Invalid Manager",
            "email": "invalid.manager@crowd.sa",
            "password": "test123456",
            "role": "department_manager"
            # Missing department
        }
        
        success, error_response = self.test_endpoint(
            "POST /api/users - Dept Manager without Department (should fail)",
            "users",
            method="POST",
            data=test_manager_no_dept,
            auth_required=True,
            expected_status=400
        )
        
        # Test 7: PUT /api/users/{user_id} - Update user
        if field_staff_user_id:
            update_data = {
                "name": "Ahmed Al-Mataf Updated",
                "department": "gates"
            }
            
            success, updated_user = self.test_endpoint(
                "PUT /api/users/{user_id} - Update User Name and Department",
                f"users/{field_staff_user_id}",
                method="PUT",
                data=update_data,
                auth_required=True,
                expected_status=200,
                required_fields=["id", "email", "name", "role", "department"]
            )
            
            if success and updated_user.get("name") == "Ahmed Al-Mataf Updated" and updated_user.get("department") == "gates":
                self.log_result("Verify User Update", True, "User name and department updated correctly")
            elif success:
                self.log_result("Verify User Update", False, f"Update failed: name={updated_user.get('name')}, dept={updated_user.get('department')}")
        
        # Test 8: PUT /api/users/{user_id} - Update password
        if dept_manager_user_id:
            update_password = {
                "password": "newpassword123"
            }
            
            success, updated_user = self.test_endpoint(
                "PUT /api/users/{user_id} - Update User Password",
                f"users/{dept_manager_user_id}",
                method="PUT",
                data=update_password,
                auth_required=True,
                expected_status=200
            )
        
        # Test 9: DELETE /api/users/{user_id} - Try to delete self (should fail)
        if self.admin_user and "id" in self.admin_user:
            success, error_response = self.test_endpoint(
                "DELETE /api/users/{user_id} - Delete Self (should fail)",
                f"users/{self.admin_user['id']}",
                method="DELETE",
                auth_required=True,
                expected_status=400
            )
        
        # Test 10: DELETE /api/users/{user_id} - Delete created test users
        if field_staff_user_id:
            success, delete_response = self.test_endpoint(
                "DELETE /api/users/{user_id} - Delete Field Staff User",
                f"users/{field_staff_user_id}",
                method="DELETE",
                auth_required=True,
                expected_status=200
            )
        
        if dept_manager_user_id:
            success, delete_response = self.test_endpoint(
                "DELETE /api/users/{user_id} - Delete Dept Manager User",
                f"users/{dept_manager_user_id}",
                method="DELETE",
                auth_required=True,
                expected_status=200
            )
        
        if monitoring_user_id:
            success, delete_response = self.test_endpoint(
                "DELETE /api/users/{user_id} - Delete Monitoring User",
                f"users/{monitoring_user_id}",
                method="DELETE",
                auth_required=True,
                expected_status=200
            )
        
        # Test 11: Verify user count is back to initial
        success, final_users_data = self.test_endpoint(
            "GET /api/users - Verify User Count After Cleanup",
            "users",
            auth_required=True
        )
        
        final_user_count = len(final_users_data) if success and isinstance(final_users_data, list) else 0
        if final_user_count == initial_user_count:
            self.log_result("Verify User Cleanup", True, f"User count back to {initial_user_count}")
        else:
            self.log_result("Verify User Cleanup", False, f"Expected {initial_user_count} users, got {final_user_count}")
    
    def test_permission_validation(self):
        """Test permission validation with non-admin users"""
        print("\n🔒 Testing Permission Validation...")
        
        # Test with dept_manager credentials
        dept_manager_login = {
            "email": "manager.plazas@crowd.sa",
            "password": "manager123"
        }
        
        success, manager_data = self.test_endpoint(
            "Login as Dept Manager",
            "auth/login",
            method="POST",
            data=dept_manager_login,
            expected_status=200,
            required_fields=["access_token", "token_type", "user"]
        )
        
        manager_token = None
        if success and "access_token" in manager_data:
            manager_token = manager_data["access_token"]
            manager_user = manager_data.get("user", {})
            
            # Verify department field in login response
            if "department" in manager_user:
                self.log_result("Verify Department in Login Response (Dept Manager)", True, f"Department: {manager_user['department']}")
            else:
                self.log_result("Verify Department in Login Response (Dept Manager)", False, "Department field missing in user object")
            
            # Test /auth/me includes department
            temp_token = self.auth_token
            self.auth_token = manager_token
            
            success, me_data = self.test_endpoint(
                "GET /api/auth/me - Verify Department Field (Dept Manager)",
                "auth/me",
                auth_required=True,
                required_fields=["id", "email", "name", "role", "department"]
            )
            
            if success and me_data.get("department") == "plazas":
                self.log_result("Verify Department in /auth/me", True, f"Department: {me_data.get('department')}")
            elif success:
                self.log_result("Verify Department in /auth/me", False, f"Expected 'plazas', got '{me_data.get('department')}'")
            
            # Test that dept_manager CANNOT access /api/users (should get 403)
            success, error_response = self.test_endpoint(
                "GET /api/users - Dept Manager Access (should fail with 403)",
                "users",
                auth_required=True,
                expected_status=403
            )
            
            # Test that dept_manager CANNOT create users (should get 403)
            test_user = {
                "name": "Unauthorized User",
                "email": "unauthorized@crowd.sa",
                "password": "test123",
                "role": "field_staff",
                "department": "gates"
            }
            
            success, error_response = self.test_endpoint(
                "POST /api/users - Dept Manager Create User (should fail with 403)",
                "users",
                method="POST",
                data=test_user,
                auth_required=True,
                expected_status=403
            )
            
            self.auth_token = temp_token
        
        # Test with field_staff credentials
        field_staff_login = {
            "email": "staff.mataf@crowd.sa",
            "password": "staff123"
        }
        
        success, staff_data = self.test_endpoint(
            "Login as Field Staff",
            "auth/login",
            method="POST",
            data=field_staff_login,
            expected_status=200,
            required_fields=["access_token", "token_type", "user"]
        )
        
        if success and "access_token" in staff_data:
            staff_token = staff_data["access_token"]
            staff_user = staff_data.get("user", {})
            
            # Verify department field in login response
            if "department" in staff_user:
                self.log_result("Verify Department in Login Response (Field Staff)", True, f"Department: {staff_user['department']}")
            else:
                self.log_result("Verify Department in Login Response (Field Staff)", False, "Department field missing in user object")
            
            # Test /auth/me includes department
            temp_token = self.auth_token
            self.auth_token = staff_token
            
            success, me_data = self.test_endpoint(
                "GET /api/auth/me - Verify Department Field (Field Staff)",
                "auth/me",
                auth_required=True,
                required_fields=["id", "email", "name", "role", "department"]
            )
            
            if success and me_data.get("department") == "mataf":
                self.log_result("Verify Department in /auth/me (Field Staff)", True, f"Department: {me_data.get('department')}")
            elif success:
                self.log_result("Verify Department in /auth/me (Field Staff)", False, f"Expected 'mataf', got '{me_data.get('department')}'")
            
            # Test that field_staff CANNOT access /api/users (should get 403)
            success, error_response = self.test_endpoint(
                "GET /api/users - Field Staff Access (should fail with 403)",
                "users",
                auth_required=True,
                expected_status=403
            )
            
            # Test that field_staff CANNOT delete users (should get 403)
            success, error_response = self.test_endpoint(
                "DELETE /api/users/{user_id} - Field Staff Delete (should fail with 403)",
                "users/dummy-id",
                method="DELETE",
                auth_required=True,
                expected_status=403
            )
            
            self.auth_token = temp_token
    
    def test_admin_endpoints(self):
        """Test admin-only endpoints"""
        print("\n👑 Testing Admin Endpoints...")
        
        if not self.auth_token:
            print("⚠️ No auth token available, skipping admin tests")
            return
        
        # Test admin gates endpoints
        test_gate_data = {
            "name": "Test Gate",
            "number": 999,
            "status": "open",
            "direction": "both",
            "current_flow": 100,
            "max_flow": 5000,
            "location": "الجهة الشمالية"
        }
        
        success, data = self.test_endpoint(
            "Create Gate (Admin)",
            "admin/gates",
            method="POST",
            data=test_gate_data,
            auth_required=True,
            expected_status=200
        )
        
        gate_id = None
        if success and "id" in data:
            gate_id = data["id"]
        
        # Test admin plazas endpoints
        test_plaza_data = {
            "name": "Test Plaza",
            "zone": "north",
            "current_crowd": 1000,
            "max_capacity": 40000
        }
        
        success, data = self.test_endpoint(
            "Create Plaza (Admin)",
            "admin/plazas",
            method="POST",
            data=test_plaza_data,
            auth_required=True,
            expected_status=200
        )
        
        plaza_id = None
        if success and "id" in data:
            plaza_id = data["id"]
        
        # Test admin alerts endpoints
        test_alert_data = {
            "type": "warning",
            "title": "Test Alert",
            "message": "This is a test alert",
            "department": "gates",
            "priority": "medium"
        }
        
        success, data = self.test_endpoint(
            "Create Alert (Admin)",
            "admin/alerts",
            method="POST",
            data=test_alert_data,
            auth_required=True,
            expected_status=200
        )
        
        # Test admin users endpoint
        success, data = self.test_endpoint(
            "Get Users (Admin)",
            "admin/users",
            auth_required=True,
            required_fields=["id", "email", "name", "role", "created_at"]
        )
        
        # Test update operations if we created items
        if gate_id:
            update_gate_data = {"current_flow": 200}
            success, data = self.test_endpoint(
                "Update Gate (Admin)",
                f"admin/gates/{gate_id}",
                method="PUT",
                data=update_gate_data,
                auth_required=True,
                expected_status=200
            )
            
            # Clean up - delete test gate
            success, data = self.test_endpoint(
                "Delete Gate (Admin)",
                f"admin/gates/{gate_id}",
                method="DELETE",
                auth_required=True,
                expected_status=200
            )
        
        if plaza_id:
            update_plaza_data = {"current_crowd": 1500}
            success, data = self.test_endpoint(
                "Update Plaza (Admin)",
                f"admin/plazas/{plaza_id}",
                method="PUT",
                data=update_plaza_data,
                auth_required=True,
                expected_status=200
            )
            
            # Clean up - delete test plaza
            success, data = self.test_endpoint(
                "Delete Plaza (Admin)",
                f"admin/plazas/{plaza_id}",
                method="DELETE",
                auth_required=True,
                expected_status=200
            )

    def test_unauthorized_access(self):
        """Test that admin endpoints reject unauthorized access"""
        print("\n🚫 Testing Unauthorized Access...")
        
        # Temporarily clear token
        temp_token = self.auth_token
        self.auth_token = None
        
        # Test admin endpoints without auth (should fail)
        success, data = self.test_endpoint(
            "Unauthorized Gate Creation",
            "admin/gates",
            method="POST",
            data={"name": "Test"},
            expected_status=403  # Changed from 401 to 403
        )
        
        success, data = self.test_endpoint(
            "Unauthorized Users Access",
            "admin/users",
            expected_status=403  # Changed from 401 to 403
        )
        
        # Restore token
        self.auth_token = temp_token

    def test_root_endpoint(self):
        """Test root API endpoint"""
        print("\n🌐 Testing Root Endpoint...")
        
        success, data = self.test_endpoint(
            "API Root",
            "",
            required_fields=["message", "version"]
        )

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Al-Haram OS API Testing...")
        print(f"📡 Testing API at: {self.api_url}")
        print("=" * 60)
        
        # Test authentication first
        self.test_authentication_endpoints()
        
        # Test user management and permissions (NEW - comprehensive tests)
        self.test_user_management_endpoints()
        self.test_permission_validation()
        
        # Test admin endpoints (requires auth)
        self.test_admin_endpoints()
        
        # Test unauthorized access
        self.test_unauthorized_access()
        
        # Test all public endpoints
        self.test_root_endpoint()
        self.test_dashboard_endpoints()
        self.test_gates_endpoints()
        self.test_plazas_endpoints()
        self.test_mataf_endpoints()
        self.test_alerts_endpoints()
        self.test_notifications_endpoints()
        self.test_reports_endpoints()
        self.test_planning_endpoints()
        self.test_crowd_services_endpoints()
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"✅ Tests Passed: {self.tests_passed}")
        print(f"❌ Tests Failed: {len(self.failed_tests)}")
        print(f"📈 Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.failed_tests:
            print("\n❌ FAILED TESTS:")
            for failure in self.failed_tests:
                print(f"  • {failure['test']}: {failure['details']}")
        
        return self.tests_passed == self.tests_run

def main():
    """Main test execution"""
    tester = AlHaramAPITester()
    success = tester.run_all_tests()
    
    # Save detailed results
    with open('/app/backend_test_results.json', 'w', encoding='utf-8') as f:
        json.dump({
            "summary": {
                "total_tests": tester.tests_run,
                "passed_tests": tester.tests_passed,
                "failed_tests": len(tester.failed_tests),
                "success_rate": (tester.tests_passed/tester.tests_run)*100 if tester.tests_run > 0 else 0,
                "timestamp": datetime.now().isoformat()
            },
            "results": tester.results,
            "failures": tester.failed_tests
        }, f, ensure_ascii=False, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())