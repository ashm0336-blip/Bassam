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
    def __init__(self, base_url="https://crowd-platform.preview.emergentagent.com"):
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
        
        if not self.auth_token:
            print("⚠️ No auth token available, skipping reports tests")
            return
        
        # Test reports list
        success, data = self.test_endpoint(
            "Reports List",
            "reports",
            auth_required=True
        )
        
        # Test reports with filters
        success, data = self.test_endpoint(
            "Reports Filtered by Type",
            "reports?type=daily",
            auth_required=True
        )
        
        success, data = self.test_endpoint(
            "Reports Filtered by Department",
            "reports?department=gates",
            auth_required=True
        )
    
    def test_rbac_report_filtering(self):
        """Test department-based report filtering with RBAC"""
        print("\n🔐 Testing RBAC Report Filtering Feature...")
        
        # Test 1: Unauthorized Access - No authentication token
        temp_token = self.auth_token
        self.auth_token = None
        
        success, data = self.test_endpoint(
            "GET /api/reports - Unauthorized Access (should fail with 403)",
            "reports",
            auth_required=False,
            expected_status=403
        )
        
        self.auth_token = temp_token
        
        # Test 2: System Admin - Should see ALL 9 reports
        admin_login = {
            "email": "admin@crowd.sa",
            "password": "admin123"
        }
        
        success, admin_data = self.test_endpoint(
            "Login as System Admin",
            "auth/login",
            method="POST",
            data=admin_login,
            expected_status=200
        )
        
        if success and "access_token" in admin_data:
            admin_token = admin_data["access_token"]
            temp_token = self.auth_token
            self.auth_token = admin_token
            
            success, reports = self.test_endpoint(
                "GET /api/reports - System Admin (should see all 9 reports)",
                "reports",
                auth_required=True,
                expected_status=200
            )
            
            if success and isinstance(reports, list):
                if len(reports) == 9:
                    self.log_result("System Admin - Report Count", True, f"Correctly sees all 9 reports")
                else:
                    self.log_result("System Admin - Report Count", False, f"Expected 9 reports, got {len(reports)}")
            
            self.auth_token = temp_token
        
        # Test 3: General Manager - Should see ALL 9 reports
        general_manager_login = {
            "email": "test.general@crowd.sa",
            "password": "test123"
        }
        
        success, gm_data = self.test_endpoint(
            "Login as General Manager (test.general@crowd.sa)",
            "auth/login",
            method="POST",
            data=general_manager_login,
            expected_status=200
        )
        
        if success and "access_token" in gm_data:
            gm_token = gm_data["access_token"]
            temp_token = self.auth_token
            self.auth_token = gm_token
            
            success, reports = self.test_endpoint(
                "GET /api/reports - General Manager (should see all 9 reports)",
                "reports",
                auth_required=True,
                expected_status=200
            )
            
            if success and isinstance(reports, list):
                if len(reports) == 9:
                    self.log_result("General Manager - Report Count", True, f"Correctly sees all 9 reports")
                else:
                    self.log_result("General Manager - Report Count", False, f"Expected 9 reports, got {len(reports)}")
            
            self.auth_token = temp_token
        
        # Test 4: Department Manager (Gates) - Should see only gates + all reports (4 total)
        gates_manager_login = {
            "email": "test.gates@crowd.sa",
            "password": "test123"
        }
        
        success, gates_data = self.test_endpoint(
            "Login as Gates Manager (test.gates@crowd.sa)",
            "auth/login",
            method="POST",
            data=gates_manager_login,
            expected_status=200
        )
        
        if success and "access_token" in gates_data:
            gates_token = gates_data["access_token"]
            temp_token = self.auth_token
            self.auth_token = gates_token
            
            success, reports = self.test_endpoint(
                "GET /api/reports - Gates Manager (should see 4 reports: gates + all)",
                "reports",
                auth_required=True,
                expected_status=200
            )
            
            if success and isinstance(reports, list):
                # Count reports by department
                departments = [r.get("department") for r in reports]
                gates_count = departments.count("gates")
                all_count = departments.count("all")
                other_depts = [d for d in departments if d not in ["gates", "all"]]
                
                # Should have 2 "gates" reports and 2 "all" reports = 4 total
                if len(reports) == 4 and gates_count == 2 and all_count == 2 and len(other_depts) == 0:
                    self.log_result("Gates Manager - Report Filtering", True, f"Correctly sees 4 reports (2 gates + 2 all)")
                else:
                    self.log_result("Gates Manager - Report Filtering", False, 
                                  f"Expected 4 reports (2 gates + 2 all), got {len(reports)} reports: {departments}")
                
                # Verify NO reports from other departments
                forbidden_depts = ["plazas", "mataf", "planning", "crowd_services"]
                has_forbidden = any(d in forbidden_depts for d in departments)
                if not has_forbidden:
                    self.log_result("Gates Manager - No Other Departments", True, "Correctly filtered out other departments")
                else:
                    self.log_result("Gates Manager - No Other Departments", False, f"Should not see: {other_depts}")
            
            self.auth_token = temp_token
        
        # Test 5: Department Manager (Mataf) - Should see only mataf + all reports (4 total)
        mataf_manager_login = {
            "email": "test.mataf@crowd.sa",
            "password": "test123"
        }
        
        success, mataf_data = self.test_endpoint(
            "Login as Mataf Manager (test.mataf@crowd.sa)",
            "auth/login",
            method="POST",
            data=mataf_manager_login,
            expected_status=200
        )
        
        if success and "access_token" in mataf_data:
            mataf_token = mataf_data["access_token"]
            temp_token = self.auth_token
            self.auth_token = mataf_token
            
            success, reports = self.test_endpoint(
                "GET /api/reports - Mataf Manager (should see 4 reports: mataf + all)",
                "reports",
                auth_required=True,
                expected_status=200
            )
            
            if success and isinstance(reports, list):
                # Count reports by department
                departments = [r.get("department") for r in reports]
                mataf_count = departments.count("mataf")
                all_count = departments.count("all")
                other_depts = [d for d in departments if d not in ["mataf", "all"]]
                
                # Should have 2 "mataf" reports and 2 "all" reports = 4 total
                if len(reports) == 4 and mataf_count == 2 and all_count == 2 and len(other_depts) == 0:
                    self.log_result("Mataf Manager - Report Filtering", True, f"Correctly sees 4 reports (2 mataf + 2 all)")
                else:
                    self.log_result("Mataf Manager - Report Filtering", False, 
                                  f"Expected 4 reports (2 mataf + 2 all), got {len(reports)} reports: {departments}")
                
                # Verify NO reports from other departments
                forbidden_depts = ["plazas", "gates", "planning", "crowd_services"]
                has_forbidden = any(d in forbidden_depts for d in departments)
                if not has_forbidden:
                    self.log_result("Mataf Manager - No Other Departments", True, "Correctly filtered out other departments")
                else:
                    self.log_result("Mataf Manager - No Other Departments", False, f"Should not see: {other_depts}")
            
            self.auth_token = temp_token

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
        """Test JWT authentication endpoints with all user roles"""
        print("\n🔐 Testing Authentication & Authorization...")
        
        # Test 1: System Admin Login
        system_admin_login = {
            "email": "admin@crowd.sa",
            "password": "admin123"
        }
        
        success, data = self.test_endpoint(
            "Login - System Admin (admin@crowd.sa)",
            "auth/login",
            method="POST",
            data=system_admin_login,
            expected_status=200,
            required_fields=["access_token", "token_type", "user"]
        )
        
        if success and "access_token" in data:
            self.auth_token = data["access_token"]
            self.admin_user = data["user"]
            print(f"🔑 System Admin token acquired for user: {self.admin_user.get('name', 'Unknown')}")
            
            # Verify token includes department field (should be None for system_admin)
            if "user" in data and "role" in data["user"]:
                self.log_result("Verify System Admin Role", True, f"Role: {data['user']['role']}")
        
        # Test 2: General Manager Login
        general_manager_login = {
            "email": "general.manager@crowd.sa",
            "password": "manager123"
        }
        
        success, gm_data = self.test_endpoint(
            "Login - General Manager (general.manager@crowd.sa)",
            "auth/login",
            method="POST",
            data=general_manager_login,
            expected_status=200,
            required_fields=["access_token", "token_type", "user"]
        )
        
        if success and "user" in gm_data:
            self.log_result("Verify General Manager Role", True, f"Role: {gm_data['user'].get('role')}")
        
        # Test 3: Department Manager Login (Gates)
        gates_manager_login = {
            "email": "manager.gates@crowd.sa",
            "password": "manager123"
        }
        
        success, gates_data = self.test_endpoint(
            "Login - Gates Manager (manager.gates@crowd.sa)",
            "auth/login",
            method="POST",
            data=gates_manager_login,
            expected_status=200,
            required_fields=["access_token", "token_type", "user"]
        )
        
        if success and "user" in gates_data:
            user = gates_data["user"]
            if "department" in user and user["department"] == "gates":
                self.log_result("Verify Department Manager Department Field", True, f"Department: {user['department']}")
            else:
                self.log_result("Verify Department Manager Department Field", False, f"Expected 'gates', got: {user.get('department')}")
        
        # Test 4: /auth/me endpoint with token
        if self.auth_token:
            success, me_data = self.test_endpoint(
                "GET /api/auth/me - Get Current User",
                "auth/me",
                auth_required=True,
                required_fields=["id", "email", "name", "role", "created_at"]
            )
        
        # Test 5: Invalid login
        invalid_login_data = {
            "email": "invalid@test.com",
            "password": "wrongpassword"
        }
        
        success, data = self.test_endpoint(
            "Invalid Login (Should Fail with 401)",
            "auth/login",
            method="POST",
            data=invalid_login_data,
            expected_status=401
        )
        
        # Test 6: Permission checks - Verify system_admin can access admin endpoints
        if self.auth_token:
            success, users_data = self.test_endpoint(
                "Permission Check - System Admin Access to /api/users",
                "users",
                auth_required=True,
                expected_status=200
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
    
    def test_employee_management(self):
        """Test employee management endpoints with location and shift"""
        print("\n👷 Testing Employee Management...")
        
        if not self.auth_token:
            print("⚠️ No auth token available, skipping employee tests")
            return
        
        # Test 1: GET /api/employees - List all employees
        success, employees_data = self.test_endpoint(
            "GET /api/employees - List All Employees",
            "employees",
            auth_required=True
        )
        
        initial_employee_count = len(employees_data) if success and isinstance(employees_data, list) else 0
        print(f"  📊 Initial employee count: {initial_employee_count}")
        
        # Test 2: GET /api/employees?department=gates - Filter by department
        success, gates_employees = self.test_endpoint(
            "GET /api/employees?department=gates - Filter by Department",
            "employees?department=gates",
            auth_required=True
        )
        
        # Test 3: POST /api/employees - Create employee with location and shift
        test_employee = {
            "name": "محمد أحمد السعيد",
            "job_title": "مشرف أبواب",
            "department": "gates",
            "location": "الباب الرئيسي - الساحة الشرقية",
            "shift": "الأولى",
            "is_active": True
        }
        
        success, created_employee = self.test_endpoint(
            "POST /api/employees - Create Employee with Location and Shift",
            "employees",
            method="POST",
            data=test_employee,
            auth_required=True,
            expected_status=200
        )
        
        employee_id = None
        if success and "id" in created_employee:
            employee_id = created_employee["id"]
            self.log_result("Verify Employee Creation", True, f"Employee created with ID: {employee_id}")
        
        # Test 4: PUT /api/employees/{id} - Update employee
        if employee_id:
            update_data = {
                "location": "الباب الفرعي - الساحة الغربية",
                "shift": "الثانية"
            }
            
            success, updated_employee = self.test_endpoint(
                "PUT /api/employees/{id} - Update Employee Location and Shift",
                f"employees/{employee_id}",
                method="PUT",
                data=update_data,
                auth_required=True,
                expected_status=200
            )
        
        # Test 5: GET /api/employees/stats/{department} - Get stats with shifts and locations
        success, stats_data = self.test_endpoint(
            "GET /api/employees/stats/gates - Get Employee Stats",
            "employees/stats/gates",
            auth_required=True,
            required_fields=["total_employees", "active_employees", "shifts", "locations_count"]
        )
        
        if success and "shifts" in stats_data:
            shifts = stats_data["shifts"]
            if all(key in shifts for key in ["shift_1", "shift_2", "shift_3", "shift_4"]):
                self.log_result("Verify Shift Distribution in Stats", True, f"All shifts present: {shifts}")
            else:
                self.log_result("Verify Shift Distribution in Stats", False, f"Missing shift data: {shifts}")
        
        if success and "locations_count" in stats_data:
            self.log_result("Verify Locations Count in Stats", True, f"Locations count: {stats_data['locations_count']}")
        
        # Test 6: DELETE /api/employees/{id} - Delete employee
        if employee_id:
            success, delete_response = self.test_endpoint(
                "DELETE /api/employees/{id} - Delete Employee",
                f"employees/{employee_id}",
                method="DELETE",
                auth_required=True,
                expected_status=200
            )
    
    def test_gates_management_comprehensive(self):
        """Test gates management with all 9 fields including plaza_color and multi-category"""
        print("\n🚪 Testing Gates Management (All 9 Fields)...")
        
        if not self.auth_token:
            print("⚠️ No auth token available, skipping gates tests")
            return
        
        # Test 1: GET /api/gates - List all gates
        success, gates_data = self.test_endpoint(
            "GET /api/gates - List All Gates",
            "gates",
            auth_required=False
        )
        
        # Test 2: POST /api/admin/gates - Create gate with all 9 fields
        test_gate_comprehensive = {
            "name": "باب الملك عبدالعزيز",
            "number": 101,
            "plaza": "الساحة الشرقية",
            "plaza_color": "#FF5733",
            "gate_type": "رئيسي",
            "direction": "دخول وخروج",
            "category": ["محرمين", "مصلين", "عربات"],  # Multi-category support
            "classification": "عام",
            "status": "متاح",
            "current_indicator": "متوسط",
            "current_flow": 2500,
            "max_flow": 5000
        }
        
        success, created_gate = self.test_endpoint(
            "POST /api/admin/gates - Create Gate with All 9 Fields",
            "admin/gates",
            method="POST",
            data=test_gate_comprehensive,
            auth_required=True,
            expected_status=200
        )
        
        gate_id = None
        if success and "id" in created_gate:
            gate_id = created_gate["id"]
            self.log_result("Verify Gate Creation with All Fields", True, f"Gate created with ID: {gate_id}")
        
        # Test 3: Verify plaza_color is stored
        if gate_id:
            success, gate_details = self.test_endpoint(
                "GET /api/gates - Verify Plaza Color",
                "gates",
                auth_required=False
            )
            
            if success and isinstance(gate_details, list):
                created_gate_data = next((g for g in gate_details if g.get("id") == gate_id), None)
                if created_gate_data and "plaza_color" in created_gate_data:
                    self.log_result("Verify Plaza Color Field", True, f"Plaza color: {created_gate_data['plaza_color']}")
                else:
                    self.log_result("Verify Plaza Color Field", False, "Plaza color field missing")
                
                # Verify multi-category support
                if created_gate_data and "category" in created_gate_data:
                    categories = created_gate_data["category"]
                    if isinstance(categories, list) and len(categories) == 3:
                        self.log_result("Verify Multi-Category Support", True, f"Categories: {categories}")
                    else:
                        self.log_result("Verify Multi-Category Support", False, f"Expected list of 3 categories, got: {categories}")
        
        # Test 4: PUT /api/admin/gates/{id} - Update gate
        if gate_id:
            update_gate_data = {
                "current_flow": 3500,
                "current_indicator": "مزدحم",
                "plaza_color": "#00FF00"
            }
            
            success, updated_gate = self.test_endpoint(
                "PUT /api/admin/gates/{id} - Update Gate",
                f"admin/gates/{gate_id}",
                method="PUT",
                data=update_gate_data,
                auth_required=True,
                expected_status=200
            )
        
        # Test 5: DELETE /api/admin/gates/{id} - Delete gate
        if gate_id:
            success, delete_response = self.test_endpoint(
                "DELETE /api/admin/gates/{id} - Delete Gate",
                f"admin/gates/{gate_id}",
                method="DELETE",
                auth_required=True,
                expected_status=200
            )
    
    def test_activity_logs(self):
        """Test activity logs with filters"""
        print("\n📋 Testing Activity Logs...")
        
        if not self.auth_token:
            print("⚠️ No auth token available, skipping activity logs tests")
            return
        
        # Test 1: GET /api/admin/activity-logs - Get all activity logs
        success, logs_data = self.test_endpoint(
            "GET /api/admin/activity-logs - Get All Activity Logs",
            "admin/activity-logs",
            auth_required=True
        )
        
        if success and isinstance(logs_data, list) and len(logs_data) > 0:
            # Verify log structure
            first_log = logs_data[0]
            required_fields = ["id", "action", "user_id", "user_name", "user_email", "timestamp"]
            missing_fields = [field for field in required_fields if field not in first_log]
            if not missing_fields:
                self.log_result("Verify Activity Log Structure", True, f"All required fields present")
            else:
                self.log_result("Verify Activity Log Structure", False, f"Missing fields: {missing_fields}")
            
            # Check for specific action types
            actions = set(log.get("action") for log in logs_data)
            expected_actions = ["login", "user_created", "employee_created"]
            found_actions = [action for action in expected_actions if action in actions]
            if found_actions:
                self.log_result("Verify Activity Log Actions", True, f"Found actions: {found_actions}")
            else:
                self.log_result("Verify Activity Log Actions", False, f"Expected actions not found. Available: {actions}")
        
        # Test 2: GET /api/admin/activity-logs?action=login - Filter by action
        success, login_logs = self.test_endpoint(
            "GET /api/admin/activity-logs?action=login - Filter by Action",
            "admin/activity-logs?action=login",
            auth_required=True
        )
        
        if success and isinstance(login_logs, list):
            if all(log.get("action") == "login" for log in login_logs):
                self.log_result("Verify Action Filter", True, f"All logs have action='login' ({len(login_logs)} logs)")
            else:
                self.log_result("Verify Action Filter", False, "Some logs have different actions")
        
        # Test 3: GET /api/admin/activity-logs?user_email=admin@crowd.sa - Filter by user email
        success, user_logs = self.test_endpoint(
            "GET /api/admin/activity-logs?user_email=admin@crowd.sa - Filter by User Email",
            "admin/activity-logs?user_email=admin@crowd.sa",
            auth_required=True
        )
        
        if success and isinstance(user_logs, list):
            if all("admin@crowd.sa" in log.get("user_email", "") for log in user_logs):
                self.log_result("Verify User Email Filter", True, f"All logs from admin@crowd.sa ({len(user_logs)} logs)")
            else:
                self.log_result("Verify User Email Filter", False, "Some logs from different users")
        
        # Test 4: GET /api/admin/activity-logs?date=YYYY-MM-DD - Filter by date
        from datetime import datetime
        today = datetime.now().strftime("%Y-%m-%d")
        success, date_logs = self.test_endpoint(
            f"GET /api/admin/activity-logs?date={today} - Filter by Date",
            f"admin/activity-logs?date={today}",
            auth_required=True
        )
    
    def test_dashboard_with_employee_stats(self):
        """Test dashboard departments endpoint includes employee_stats with shifts and locations"""
        print("\n📊 Testing Dashboard with Employee Stats...")
        
        # Test GET /api/dashboard/departments - Verify employee_stats
        success, departments_data = self.test_endpoint(
            "GET /api/dashboard/departments - Verify Employee Stats",
            "dashboard/departments",
            auth_required=False
        )
        
        if success and isinstance(departments_data, list) and len(departments_data) > 0:
            first_dept = departments_data[0]
            
            # Check for employee_stats field
            if "employee_stats" in first_dept:
                employee_stats = first_dept["employee_stats"]
                
                # Verify employee_stats structure
                required_fields = ["total", "shifts", "locations_count", "employees_with_location"]
                missing_fields = [field for field in required_fields if field not in employee_stats]
                
                if not missing_fields:
                    self.log_result("Verify Employee Stats in Dashboard", True, f"All fields present: {list(employee_stats.keys())}")
                    
                    # Verify shifts structure
                    if "shifts" in employee_stats and isinstance(employee_stats["shifts"], dict):
                        shifts = employee_stats["shifts"]
                        expected_shifts = ["الأولى", "الثانية", "الثالثة", "الرابعة"]
                        if all(shift in shifts for shift in expected_shifts):
                            self.log_result("Verify Shifts in Employee Stats", True, f"All shifts present: {shifts}")
                        else:
                            self.log_result("Verify Shifts in Employee Stats", False, f"Missing shifts. Found: {list(shifts.keys())}")
                    
                    # Verify locations_count
                    if "locations_count" in employee_stats:
                        self.log_result("Verify Locations Count", True, f"Locations count: {employee_stats['locations_count']}")
                else:
                    self.log_result("Verify Employee Stats in Dashboard", False, f"Missing fields: {missing_fields}")
            else:
                self.log_result("Verify Employee Stats in Dashboard", False, "employee_stats field missing")
    
    def test_alerts_comprehensive(self):
        """Test alerts/notifications endpoints"""
        print("\n🔔 Testing Alerts/Notifications...")
        
        if not self.auth_token:
            print("⚠️ No auth token available, skipping alerts tests")
            return
        
        # Test 1: GET /api/alerts - List alerts
        success, alerts_data = self.test_endpoint(
            "GET /api/alerts - List All Alerts",
            "alerts",
            auth_required=False
        )
        
        # Test 2: POST /api/admin/alerts - Create alert
        test_alert = {
            "type": "emergency",
            "title": "تنبيه طوارئ - اختبار",
            "message": "هذا تنبيه اختباري للطوارئ",
            "department": "gates",
            "priority": "critical"
        }
        
        success, created_alert = self.test_endpoint(
            "POST /api/admin/alerts - Create Alert",
            "admin/alerts",
            method="POST",
            data=test_alert,
            auth_required=True,
            expected_status=200
        )
        
        alert_id = None
        if success and "id" in created_alert:
            alert_id = created_alert["id"]
            self.log_result("Verify Alert Creation", True, f"Alert created with ID: {alert_id}")
        
        # Test 3: DELETE /api/admin/alerts/{id} - Delete alert
        if alert_id:
            success, delete_response = self.test_endpoint(
                "DELETE /api/admin/alerts/{id} - Delete Alert",
                f"admin/alerts/{alert_id}",
                method="DELETE",
                auth_required=True,
                expected_status=200
            )
    
    def test_transaction_data_isolation_admin(self):
        """Test transaction data isolation for Admin across all departments"""
        print("\n🔒 Testing Transaction Data Isolation (Admin User)...")
        
        # Login as Admin
        admin_login = {
            "email": "admin@crowd.sa",
            "password": "admin123"
        }
        
        success, admin_data = self.test_endpoint(
            "Login as Admin (admin@crowd.sa)",
            "auth/login",
            method="POST",
            data=admin_login,
            expected_status=200
        )
        
        if not success or "access_token" not in admin_data:
            print("❌ Failed to login as admin, skipping transaction isolation tests")
            return
        
        admin_token = admin_data["access_token"]
        temp_token = self.auth_token
        self.auth_token = admin_token
        
        # Test 1: Admin → Planning Transactions
        success, planning_transactions = self.test_endpoint(
            "GET /api/transactions?department=planning - Planning Transactions",
            "transactions?department=planning",
            auth_required=True,
            expected_status=200
        )
        
        if success and isinstance(planning_transactions, list):
            if len(planning_transactions) == 1:
                transaction = planning_transactions[0]
                if transaction.get("transaction_number") == "T-PLANNING-001" and transaction.get("department") == "planning":
                    self.log_result("Admin - Planning Transactions Isolation", True, 
                                  f"Correctly returns 1 planning transaction: {transaction.get('transaction_number')}")
                else:
                    self.log_result("Admin - Planning Transactions Isolation", False, 
                                  f"Transaction mismatch: {transaction.get('transaction_number')}, dept: {transaction.get('department')}")
            else:
                self.log_result("Admin - Planning Transactions Isolation", False, 
                              f"Expected 1 transaction, got {len(planning_transactions)}")
        
        # Test 2: Admin → Gates Transactions
        success, gates_transactions = self.test_endpoint(
            "GET /api/transactions?department=gates - Gates Transactions",
            "transactions?department=gates",
            auth_required=True,
            expected_status=200
        )
        
        if success and isinstance(gates_transactions, list):
            if len(gates_transactions) == 1:
                transaction = gates_transactions[0]
                if transaction.get("transaction_number") == "T-GATES-001" and transaction.get("department") == "gates":
                    self.log_result("Admin - Gates Transactions Isolation", True, 
                                  f"Correctly returns 1 gates transaction: {transaction.get('transaction_number')}")
                else:
                    self.log_result("Admin - Gates Transactions Isolation", False, 
                                  f"Transaction mismatch: {transaction.get('transaction_number')}, dept: {transaction.get('department')}")
            else:
                self.log_result("Admin - Gates Transactions Isolation", False, 
                              f"Expected 1 transaction, got {len(gates_transactions)}")
        
        # Test 3: Admin → Plazas Transactions
        success, plazas_transactions = self.test_endpoint(
            "GET /api/transactions?department=plazas - Plazas Transactions",
            "transactions?department=plazas",
            auth_required=True,
            expected_status=200
        )
        
        if success and isinstance(plazas_transactions, list):
            if len(plazas_transactions) == 1:
                transaction = plazas_transactions[0]
                if transaction.get("transaction_number") == "T-PLAZAS-002" and transaction.get("department") == "plazas":
                    self.log_result("Admin - Plazas Transactions Isolation", True, 
                                  f"Correctly returns 1 plazas transaction: {transaction.get('transaction_number')}")
                else:
                    self.log_result("Admin - Plazas Transactions Isolation", False, 
                                  f"Transaction mismatch: {transaction.get('transaction_number')}, dept: {transaction.get('department')}")
            else:
                self.log_result("Admin - Plazas Transactions Isolation", False, 
                              f"Expected 1 transaction, got {len(plazas_transactions)}")
        
        # Test 4: Admin → Mataf Transactions
        success, mataf_transactions = self.test_endpoint(
            "GET /api/transactions?department=mataf - Mataf Transactions",
            "transactions?department=mataf",
            auth_required=True,
            expected_status=200
        )
        
        if success and isinstance(mataf_transactions, list):
            if len(mataf_transactions) == 1:
                transaction = mataf_transactions[0]
                if transaction.get("transaction_number") == "T-MATAF-004" and transaction.get("department") == "mataf":
                    self.log_result("Admin - Mataf Transactions Isolation", True, 
                                  f"Correctly returns 1 mataf transaction: {transaction.get('transaction_number')}")
                else:
                    self.log_result("Admin - Mataf Transactions Isolation", False, 
                                  f"Transaction mismatch: {transaction.get('transaction_number')}, dept: {transaction.get('department')}")
            else:
                self.log_result("Admin - Mataf Transactions Isolation", False, 
                              f"Expected 1 transaction, got {len(mataf_transactions)}")
        
        # Test 5: Admin → Crowd Services Transactions
        success, crowd_services_transactions = self.test_endpoint(
            "GET /api/transactions?department=crowd_services - Crowd Services Transactions",
            "transactions?department=crowd_services",
            auth_required=True,
            expected_status=200
        )
        
        if success and isinstance(crowd_services_transactions, list):
            if len(crowd_services_transactions) == 1:
                transaction = crowd_services_transactions[0]
                if transaction.get("transaction_number") == "T-CROWD_SERVICES-005" and transaction.get("department") == "crowd_services":
                    self.log_result("Admin - Crowd Services Transactions Isolation", True, 
                                  f"Correctly returns 1 crowd_services transaction: {transaction.get('transaction_number')}")
                else:
                    self.log_result("Admin - Crowd Services Transactions Isolation", False, 
                                  f"Transaction mismatch: {transaction.get('transaction_number')}, dept: {transaction.get('department')}")
            else:
                self.log_result("Admin - Crowd Services Transactions Isolation", False, 
                              f"Expected 1 transaction, got {len(crowd_services_transactions)}")
        
        # Test 6: Admin WITHOUT department filter - Should see ALL transactions
        success, all_transactions = self.test_endpoint(
            "GET /api/transactions - Admin Without Filter (should see all 5 transactions)",
            "transactions",
            auth_required=True,
            expected_status=200
        )
        
        if success and isinstance(all_transactions, list):
            if len(all_transactions) == 5:
                # Verify all departments are present
                departments = set(t.get("department") for t in all_transactions)
                expected_depts = {"planning", "gates", "plazas", "mataf", "crowd_services"}
                
                if departments == expected_depts:
                    self.log_result("Admin - All Transactions Without Filter", True, 
                                  f"Correctly returns all 5 transactions from all departments")
                else:
                    self.log_result("Admin - All Transactions Without Filter", False, 
                                  f"Expected departments {expected_depts}, got {departments}")
            else:
                self.log_result("Admin - All Transactions Without Filter", False, 
                              f"Expected 5 transactions, got {len(all_transactions)}")
        
        # Restore original token
        self.auth_token = temp_token
    
    def test_sidebar_submenu_functionality(self):
        """Test sidebar menu with expandable submenus"""
        print("\n📋 Testing Sidebar Submenu Functionality...")
        
        if not self.auth_token:
            print("⚠️ No auth token available, skipping sidebar menu tests")
            return
        
        # Test 1: GET /api/sidebar-menu - Get sidebar menu for authenticated user
        success, menu_items = self.test_endpoint(
            "GET /api/sidebar-menu - Get User Sidebar Menu",
            "sidebar-menu",
            auth_required=True,
            expected_status=200
        )
        
        if success and isinstance(menu_items, list):
            self.log_result("Sidebar Menu Returns List", True, f"Returned {len(menu_items)} menu items")
            
            # Verify menu items have required fields
            if len(menu_items) > 0:
                first_item = menu_items[0]
                required_fields = ["id", "name_ar", "name_en", "href", "icon", "order"]
                missing_fields = [field for field in required_fields if field not in first_item]
                if not missing_fields:
                    self.log_result("Sidebar Menu Item Structure", True, "All required fields present")
                else:
                    self.log_result("Sidebar Menu Item Structure", False, f"Missing fields: {missing_fields}")
            
            # Check for items with parent_id (submenus)
            submenu_items = [item for item in menu_items if item.get("parent_id")]
            parent_items = [item for item in menu_items if not item.get("parent_id")]
            
            if submenu_items:
                self.log_result("Submenu Items Present", True, f"Found {len(submenu_items)} submenu items")
            else:
                self.log_result("Submenu Items Present", False, "No submenu items found with parent_id")
            
            # Verify parent items don't have parent_id set
            invalid_parents = [item for item in parent_items if "parent_id" in item and item["parent_id"] is not None]
            if not invalid_parents:
                self.log_result("Parent Items Validation", True, f"{len(parent_items)} parent items have no parent_id")
            else:
                self.log_result("Parent Items Validation", False, f"{len(invalid_parents)} parent items have invalid parent_id")
            
            # Verify submenu items have valid parent_id
            if submenu_items:
                parent_ids = set(item["id"] for item in parent_items)
                orphaned_submenus = [item for item in submenu_items if item.get("parent_id") not in parent_ids]
                
                if not orphaned_submenus:
                    self.log_result("Submenu Parent Validation", True, "All submenus have valid parent_id")
                else:
                    self.log_result("Submenu Parent Validation", False, f"{len(orphaned_submenus)} orphaned submenus found")
            
            # Check for Gates menu and its children
            gates_menu_id = "53a3e0d3-b096-48e3-aa5a-1eccfe8b4a19"
            gates_menu = next((item for item in menu_items if item.get("id") == gates_menu_id), None)
            
            if gates_menu:
                self.log_result("Gates Menu Found", True, f"Gates menu: {gates_menu.get('name_ar', 'N/A')}")
                
                # Count children of Gates menu
                gates_children = [item for item in submenu_items if item.get("parent_id") == gates_menu_id]
                if len(gates_children) == 3:
                    self.log_result("Gates Menu Children Count", True, f"Gates menu has exactly 3 children")
                    # List the children
                    child_names = [child.get("name_ar", "N/A") for child in gates_children]
                    print(f"  📌 Gates submenu items: {', '.join(child_names)}")
                else:
                    self.log_result("Gates Menu Children Count", False, f"Expected 3 children, found {len(gates_children)}")
            else:
                self.log_result("Gates Menu Found", False, f"Gates menu with ID {gates_menu_id} not found")
            
            # Verify total count (should be ~16 items: 13 parents + 3 children)
            total_items = len(menu_items)
            if 15 <= total_items <= 17:  # Allow some flexibility
                self.log_result("Total Menu Items Count", True, f"Total items: {total_items} (expected ~16)")
            else:
                self.log_result("Total Menu Items Count", False, f"Expected ~16 items, found {total_items}")
        else:
            self.log_result("Sidebar Menu Returns List", False, "Response is not a list")
        
        # Test 2: GET /api/admin/sidebar-menu - Get all sidebar menu items (admin only)
        success, admin_menu_items = self.test_endpoint(
            "GET /api/admin/sidebar-menu - Get Admin Sidebar Menu",
            "admin/sidebar-menu",
            auth_required=True,
            expected_status=200
        )
        
        if success and isinstance(admin_menu_items, list):
            self.log_result("Admin Sidebar Menu Returns List", True, f"Returned {len(admin_menu_items)} menu items")
            
            # Verify parent-child relationships
            parent_items_admin = [item for item in admin_menu_items if not item.get("parent_id")]
            submenu_items_admin = [item for item in admin_menu_items if item.get("parent_id")]
            
            print(f"  📊 Admin view: {len(parent_items_admin)} parent items, {len(submenu_items_admin)} submenu items")
            
            # Verify children are properly linked to parents
            if submenu_items_admin:
                parent_ids_admin = set(item["id"] for item in parent_items_admin)
                properly_linked = all(item.get("parent_id") in parent_ids_admin for item in submenu_items_admin)
                
                if properly_linked:
                    self.log_result("Admin Menu Parent-Child Links", True, "All children properly linked to parents")
                else:
                    orphaned = [item for item in submenu_items_admin if item.get("parent_id") not in parent_ids_admin]
                    self.log_result("Admin Menu Parent-Child Links", False, f"{len(orphaned)} orphaned items found")
            
            # Compare admin view vs user view
            if len(admin_menu_items) >= len(menu_items):
                self.log_result("Admin View Completeness", True, f"Admin sees all items ({len(admin_menu_items)} >= {len(menu_items)})")
            else:
                self.log_result("Admin View Completeness", False, f"Admin sees fewer items than user ({len(admin_menu_items)} < {len(menu_items)})")
        else:
            self.log_result("Admin Sidebar Menu Returns List", False, "Response is not a list")
    
    def test_admin_endpoints(self):
        """Test admin-only endpoints"""
        print("\n👑 Testing Admin Endpoints...")
        
        if not self.auth_token:
            print("⚠️ No auth token available, skipping admin tests")
            return
        
        # Test admin users endpoint
        success, data = self.test_endpoint(
            "Get Users (Admin)",
            "admin/users",
            auth_required=True,
            required_fields=["id", "email", "name", "role", "created_at"]
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

    def test_dropdown_options_management(self):
        """Test dropdown options CRUD operations"""
        print("\n📋 Testing Dropdown Options Management...")
        
        if not self.auth_token:
            print("⚠️ No auth token available, skipping dropdown options tests")
            return
        
        # Test 1: GET /api/admin/dropdown-options/categories - Get available categories
        success, categories_data = self.test_endpoint(
            "GET /api/admin/dropdown-options/categories - Get Categories",
            "admin/dropdown-options/categories",
            auth_required=True,
            expected_status=200
        )
        
        if success and "available_categories" in categories_data:
            self.log_result("Verify Available Categories", True, f"Found {len(categories_data['available_categories'])} categories")
        
        # Test 2: GET /api/admin/dropdown-options - Get all options
        success, all_options = self.test_endpoint(
            "GET /api/admin/dropdown-options - Get All Options",
            "admin/dropdown-options",
            auth_required=True,
            expected_status=200
        )
        
        initial_count = len(all_options) if success and isinstance(all_options, list) else 0
        print(f"  📊 Initial dropdown options count: {initial_count}")
        
        # Test 3: GET /api/admin/dropdown-options?category=shifts - Filter by category
        success, shifts_options = self.test_endpoint(
            "GET /api/admin/dropdown-options?category=shifts - Filter by Category",
            "admin/dropdown-options?category=shifts",
            auth_required=True,
            expected_status=200
        )
        
        if success and isinstance(shifts_options, list):
            expected_shifts = ["الأولى", "الثانية", "الثالثة", "الرابعة"]
            shift_values = [opt.get("value") for opt in shifts_options]
            if all(shift in shift_values for shift in expected_shifts):
                self.log_result("Verify Shifts Options", True, f"All 4 shifts present: {shift_values}")
            else:
                self.log_result("Verify Shifts Options", False, f"Missing shifts. Found: {shift_values}")
        
        # Test 4: POST /api/admin/dropdown-options - Create new option
        test_option = {
            "category": "gate_types",
            "value": "نفق اختباري",
            "label": "نفق اختباري",
            "color": "#FF0000",
            "order": 10
        }
        
        success, created_option = self.test_endpoint(
            "POST /api/admin/dropdown-options - Create Option",
            "admin/dropdown-options",
            method="POST",
            data=test_option,
            auth_required=True,
            expected_status=200
        )
        
        option_id = None
        if success and "id" in created_option:
            option_id = created_option["id"]
            self.log_result("Verify Option Creation", True, f"Option created with ID: {option_id}")
        
        # Test 5: PUT /api/admin/dropdown-options/{id} - Update option
        if option_id:
            update_data = {
                "label": "نفق اختباري محدث",
                "color": "#00FF00",
                "order": 11
            }
            
            success, updated_option = self.test_endpoint(
                "PUT /api/admin/dropdown-options/{id} - Update Option",
                f"admin/dropdown-options/{option_id}",
                method="PUT",
                data=update_data,
                auth_required=True,
                expected_status=200
            )
            
            if success and updated_option.get("label") == "نفق اختباري محدث":
                self.log_result("Verify Option Update", True, "Option updated successfully")
        
        # Test 6: DELETE /api/admin/dropdown-options/{id} - Delete option
        if option_id:
            success, delete_response = self.test_endpoint(
                "DELETE /api/admin/dropdown-options/{id} - Delete Option",
                f"admin/dropdown-options/{option_id}",
                method="DELETE",
                auth_required=True,
                expected_status=200
            )
        
        # Test 7: GET /api/dropdown-options - Public access (for forms)
        success, public_options = self.test_endpoint(
            "GET /api/dropdown-options - Public Access",
            "dropdown-options",
            auth_required=False,
            expected_status=200
        )
        
        if success and isinstance(public_options, dict):
            self.log_result("Verify Public Options Grouped", True, f"Options grouped by {len(public_options)} categories")
    
    def test_login_page_customization(self):
        """Test login page settings save/load"""
        print("\n🎨 Testing Login Page Customization...")
        
        # Test 1: GET /api/settings/login-page - Get current settings (public)
        success, current_settings = self.test_endpoint(
            "GET /api/settings/login-page - Get Settings",
            "settings/login-page",
            auth_required=False,
            expected_status=200
        )
        
        if success:
            required_fields = ["site_name_ar", "site_name_en", "subtitle_ar", "subtitle_en", "logo_size", "primary_color"]
            missing_fields = [field for field in required_fields if field not in current_settings]
            if not missing_fields:
                self.log_result("Verify Login Settings Structure", True, "All required fields present")
            else:
                self.log_result("Verify Login Settings Structure", False, f"Missing fields: {missing_fields}")
        
        if not self.auth_token:
            print("⚠️ No auth token available, skipping login settings update tests")
            return
        
        # Test 2: PUT /api/admin/settings/login-page - Update settings
        update_settings = {
            "site_name_ar": "خدمات الحشود - اختبار",
            "site_name_en": "Crowd Services - Test",
            "logo_size": 200,
            "primary_color": "#FF5733",
            "welcome_text_ar": "مرحباً بك في الاختبار",
            "welcome_text_en": "Welcome to Test"
        }
        
        success, updated_settings = self.test_endpoint(
            "PUT /api/admin/settings/login-page - Update Settings",
            "admin/settings/login-page",
            method="PUT",
            data=update_settings,
            auth_required=True,
            expected_status=200
        )
        
        if success:
            if updated_settings.get("logo_size") == 200 and updated_settings.get("primary_color") == "#FF5733":
                self.log_result("Verify Login Settings Update", True, "Settings updated correctly")
            else:
                self.log_result("Verify Login Settings Update", False, f"Update failed: logo_size={updated_settings.get('logo_size')}, color={updated_settings.get('primary_color')}")
        
        # Test 3: Restore original settings
        if current_settings:
            restore_settings = {
                "site_name_ar": current_settings.get("site_name_ar"),
                "site_name_en": current_settings.get("site_name_en"),
                "logo_size": current_settings.get("logo_size"),
                "primary_color": current_settings.get("primary_color"),
                "welcome_text_ar": current_settings.get("welcome_text_ar"),
                "welcome_text_en": current_settings.get("welcome_text_en")
            }
            
            success, restored = self.test_endpoint(
                "PUT /api/admin/settings/login-page - Restore Original",
                "admin/settings/login-page",
                method="PUT",
                data=restore_settings,
                auth_required=True,
                expected_status=200
            )
    
    def test_header_customization(self):
        """Test header settings save/load and show/hide toggles"""
        print("\n🎨 Testing Header Customization...")
        
        # Test 1: GET /api/settings/header - Get current settings
        success, current_settings = self.test_endpoint(
            "GET /api/settings/header - Get Settings",
            "settings/header",
            auth_required=False,
            expected_status=200
        )
        
        if success:
            required_fields = ["background_color", "text_color", "show_shadow", "show_date", "show_page_name", 
                             "show_user_name", "show_language_toggle", "show_theme_toggle", "show_logout_button", 
                             "show_notifications_bell"]
            missing_fields = [field for field in required_fields if field not in current_settings]
            if not missing_fields:
                self.log_result("Verify Header Settings Structure", True, "All required fields present")
            else:
                self.log_result("Verify Header Settings Structure", False, f"Missing fields: {missing_fields}")
        
        if not self.auth_token:
            print("⚠️ No auth token available, skipping header settings update tests")
            return
        
        # Test 2: PUT /api/admin/settings/header - Update settings with toggles
        update_settings = {
            "background_color": "#1E40AF",
            "text_color": "#FFFFFF",
            "show_shadow": False,
            "show_date": True,
            "show_page_name": True,
            "show_user_name": True,
            "show_language_toggle": True,
            "show_theme_toggle": True,
            "show_logout_button": True,
            "show_notifications_bell": False,
            "header_height": 72
        }
        
        success, updated_settings = self.test_endpoint(
            "PUT /api/admin/settings/header - Update Settings",
            "admin/settings/header",
            method="PUT",
            data=update_settings,
            auth_required=True,
            expected_status=200
        )
        
        if success:
            checks = [
                updated_settings.get("background_color") == "#1E40AF",
                updated_settings.get("show_shadow") == False,
                updated_settings.get("show_notifications_bell") == False,
                updated_settings.get("header_height") == 72
            ]
            if all(checks):
                self.log_result("Verify Header Settings Update", True, "All settings updated correctly")
            else:
                self.log_result("Verify Header Settings Update", False, f"Some settings not updated correctly")
        
        # Test 3: Restore original settings
        if current_settings:
            restore_settings = {
                "background_color": current_settings.get("background_color"),
                "text_color": current_settings.get("text_color"),
                "show_shadow": current_settings.get("show_shadow"),
                "show_date": current_settings.get("show_date"),
                "show_page_name": current_settings.get("show_page_name"),
                "show_user_name": current_settings.get("show_user_name"),
                "show_language_toggle": current_settings.get("show_language_toggle"),
                "show_theme_toggle": current_settings.get("show_theme_toggle"),
                "show_logout_button": current_settings.get("show_logout_button"),
                "show_notifications_bell": current_settings.get("show_notifications_bell"),
                "header_height": current_settings.get("header_height")
            }
            
            success, restored = self.test_endpoint(
                "PUT /api/admin/settings/header - Restore Original",
                "admin/settings/header",
                method="PUT",
                data=restore_settings,
                auth_required=True,
                expected_status=200
            )
    
    def test_interactive_maps(self):
        """Test interactive maps API endpoints and markers"""
        print("\n🗺️ Testing Interactive Maps...")
        
        # Test 1: GET /api/maps - Get all maps
        success, maps_data = self.test_endpoint(
            "GET /api/maps - Get All Maps",
            "maps",
            auth_required=False,
            expected_status=200
        )
        
        initial_maps_count = len(maps_data) if success and isinstance(maps_data, list) else 0
        print(f"  📊 Initial maps count: {initial_maps_count}")
        
        if not self.auth_token:
            print("⚠️ No auth token available, skipping maps creation tests")
            return
        
        # Test 2: POST /api/admin/maps - Create new map
        test_map = {
            "name_ar": "خريطة الأبواب - اختبار",
            "name_en": "Gates Map - Test",
            "department": "gates",
            "image_url": "https://example.com/map.jpg",
            "width": 1920,
            "height": 1080
        }
        
        success, created_map = self.test_endpoint(
            "POST /api/admin/maps - Create Map",
            "admin/maps",
            method="POST",
            data=test_map,
            auth_required=True,
            expected_status=200
        )
        
        map_id = None
        if success and "id" in created_map:
            map_id = created_map["id"]
            self.log_result("Verify Map Creation", True, f"Map created with ID: {map_id}")
        
        # Test 3: POST /api/admin/maps/markers - Create marker
        if map_id:
            test_marker = {
                "map_id": map_id,
                "type": "gate",
                "entity_id": None,
                "x": 45.5,
                "y": 60.2,
                "label_ar": "باب اختباري",
                "label_en": "Test Gate",
                "icon": "MapPin",
                "color": "#DC2626",
                "show_label": True
            }
            
            success, created_marker = self.test_endpoint(
                "POST /api/admin/maps/markers - Create Marker",
                "admin/maps/markers",
                method="POST",
                data=test_marker,
                auth_required=True,
                expected_status=200
            )
            
            marker_id = None
            if success and "id" in created_marker:
                marker_id = created_marker["id"]
                self.log_result("Verify Marker Creation", True, f"Marker created with ID: {marker_id}")
            
            # Test 4: GET /api/maps/{map_id}/markers - Get markers with live data enrichment
            success, markers_data = self.test_endpoint(
                "GET /api/maps/{map_id}/markers - Get Markers with Live Data",
                f"maps/{map_id}/markers",
                auth_required=False,
                expected_status=200
            )
            
            if success and isinstance(markers_data, list) and len(markers_data) > 0:
                first_marker = markers_data[0]
                if "live_data" in first_marker:
                    self.log_result("Verify Live Data Enrichment", True, "Markers include live_data field")
                else:
                    self.log_result("Verify Live Data Enrichment", False, "live_data field missing")
            
            # Test 5: DELETE /api/admin/maps/markers/{marker_id} - Delete marker
            if marker_id:
                success, delete_response = self.test_endpoint(
                    "DELETE /api/admin/maps/markers/{id} - Delete Marker",
                    f"admin/maps/markers/{marker_id}",
                    method="DELETE",
                    auth_required=True,
                    expected_status=200
                )
        
        # Test 6: GET /api/maps?department=gates - Filter by department
        success, gates_maps = self.test_endpoint(
            "GET /api/maps?department=gates - Filter by Department",
            "maps?department=gates",
            auth_required=False,
            expected_status=200
        )
    
    def test_employee_gate_relationship(self):
        """Test employee-gate relationship: location dropdown and staff count"""
        print("\n👷🚪 Testing Employee-Gate Relationship...")
        
        if not self.auth_token:
            print("⚠️ No auth token available, skipping employee-gate relationship tests")
            return
        
        # Test 1: GET /api/gates?status=open - Get only open gates for employee location dropdown
        success, open_gates = self.test_endpoint(
            "GET /api/gates?status=open - Get Open Gates for Location Dropdown",
            "gates?status=open",
            auth_required=False,
            expected_status=200
        )
        
        if success and isinstance(open_gates, list):
            # Verify all returned gates have status "open" or "متاح"
            all_open = all(gate.get("status") in ["open", "متاح"] for gate in open_gates)
            if all_open:
                self.log_result("Verify Open Gates Filter", True, f"All {len(open_gates)} gates are open")
            else:
                self.log_result("Verify Open Gates Filter", False, "Some gates are not open")
        
        # Test 2: Create employee with gate location
        test_employee_with_gate = {
            "name": "علي محمد الحارثي",
            "job_title": "مشرف باب",
            "department": "gates",
            "location": "باب الملك عبدالعزيز - الساحة الشرقية",
            "shift": "الأولى",
            "is_active": True
        }
        
        success, created_employee = self.test_endpoint(
            "POST /api/employees - Create Employee with Gate Location",
            "employees",
            method="POST",
            data=test_employee_with_gate,
            auth_required=True,
            expected_status=200
        )
        
        employee_id = None
        if success and "id" in created_employee:
            employee_id = created_employee["id"]
            self.log_result("Verify Employee with Gate Location", True, f"Employee created with location: {test_employee_with_gate['location']}")
        
        # Test 3: GET /api/employees/stats/gates - Verify staff count includes employees with locations
        success, gates_stats = self.test_endpoint(
            "GET /api/employees/stats/gates - Verify Staff Count",
            "employees/stats/gates",
            auth_required=True,
            expected_status=200
        )
        
        if success:
            if "employees_with_location" in gates_stats and "locations_count" in gates_stats:
                self.log_result("Verify Staff Count in Stats", True, 
                              f"Employees with location: {gates_stats['employees_with_location']}, Unique locations: {gates_stats['locations_count']}")
            else:
                self.log_result("Verify Staff Count in Stats", False, "Missing location statistics")
        
        # Test 4: GET /api/gates/stats - Verify gate stats (should show staff count indirectly)
        success, gate_stats = self.test_endpoint(
            "GET /api/gates/stats - Get Gate Statistics",
            "gates/stats",
            auth_required=False,
            expected_status=200
        )
        
        if success:
            required_fields = ["total", "open", "closed", "total_flow", "entry_gates", "exit_gates"]
            missing_fields = [field for field in required_fields if field not in gate_stats]
            if not missing_fields:
                self.log_result("Verify Gate Stats Structure", True, "All required fields present")
            else:
                self.log_result("Verify Gate Stats Structure", False, f"Missing fields: {missing_fields}")
        
        # Cleanup: Delete test employee
        if employee_id:
            success, delete_response = self.test_endpoint(
                "DELETE /api/employees/{id} - Delete Test Employee",
                f"employees/{employee_id}",
                method="DELETE",
                auth_required=True,
                expected_status=200
            )
    
    def test_transactions_data_isolation(self):
        """Test comprehensive data isolation for transactions system"""
        print("\n🔒 Testing Transactions Data Isolation (CRITICAL TEST)...")
        
        # Department manager credentials
        dept_managers = {
            "gates": {"email": "manager.gates@crowd.sa", "password": "manager123"},
            "plazas": {"email": "manager.plazas@crowd.sa", "password": "manager123"},
            "planning": {"email": "manager.planning@crowd.sa", "password": "manager123"},
            "mataf": {"email": "manager.mataf@crowd.sa", "password": "manager123"},
            "crowd_services": {"email": "manager.crowd@crowd.sa", "password": "manager123"}
        }
        
        # Test 1: Data isolation for department managers
        print("\n  📋 Test 1: Data Isolation for Department Managers")
        for dept_name, credentials in dept_managers.items():
            # Login as department manager
            success, login_data = self.test_endpoint(
                f"Login as {dept_name.title()} Manager",
                "auth/login",
                method="POST",
                data=credentials,
                expected_status=200
            )
            
            if not success or "access_token" not in login_data:
                print(f"  ⚠️ Failed to login as {dept_name} manager, skipping tests for this department")
                continue
            
            dept_token = login_data["access_token"]
            temp_token = self.auth_token
            self.auth_token = dept_token
            
            # Get transactions without department parameter
            success, transactions = self.test_endpoint(
                f"GET /api/transactions - {dept_name.title()} Manager (no dept param)",
                "transactions",
                auth_required=True,
                expected_status=200
            )
            
            if success and isinstance(transactions, list):
                # Should see exactly 1 transaction
                if len(transactions) == 1:
                    self.log_result(f"{dept_name.title()} Manager - Transaction Count", True, 
                                  f"Correctly sees 1 transaction")
                    
                    # Verify the transaction belongs to the correct department
                    trans_dept = transactions[0].get("department")
                    if trans_dept == dept_name:
                        self.log_result(f"{dept_name.title()} Manager - Department Match", True,
                                      f"Transaction belongs to {dept_name}")
                    else:
                        self.log_result(f"{dept_name.title()} Manager - Department Match", False,
                                      f"Expected {dept_name}, got {trans_dept}")
                else:
                    self.log_result(f"{dept_name.title()} Manager - Transaction Count", False,
                                  f"Expected 1 transaction, got {len(transactions)}")
            
            # Get transaction stats
            success, stats = self.test_endpoint(
                f"GET /api/transactions/stats - {dept_name.title()} Manager",
                "transactions/stats",
                auth_required=True,
                expected_status=200
            )
            
            if success and isinstance(stats, dict):
                total = stats.get("total", 0)
                if total == 1:
                    self.log_result(f"{dept_name.title()} Manager - Stats Total", True,
                                  f"Stats shows total=1")
                else:
                    self.log_result(f"{dept_name.title()} Manager - Stats Total", False,
                                  f"Expected total=1, got {total}")
            
            self.auth_token = temp_token
        
        # Test 2: Admin with department filter
        print("\n  📋 Test 2: Admin Data Isolation with Department Filter")
        
        # Login as admin
        admin_login = {"email": "admin@crowd.sa", "password": "admin123"}
        success, admin_data = self.test_endpoint(
            "Login as System Admin",
            "auth/login",
            method="POST",
            data=admin_login,
            expected_status=200
        )
        
        admin_token = None
        if success and "access_token" in admin_data:
            admin_token = admin_data["access_token"]
            temp_token = self.auth_token
            self.auth_token = admin_token
            
            # Test filtering by each department
            for dept_name in dept_managers.keys():
                success, transactions = self.test_endpoint(
                    f"GET /api/transactions?department={dept_name} - Admin Filter",
                    f"transactions?department={dept_name}",
                    auth_required=True,
                    expected_status=200
                )
                
                if success and isinstance(transactions, list):
                    if len(transactions) == 1:
                        self.log_result(f"Admin Filter - {dept_name.title()} Count", True,
                                      f"Correctly sees 1 transaction for {dept_name}")
                        
                        # Verify department
                        if transactions[0].get("department") == dept_name:
                            self.log_result(f"Admin Filter - {dept_name.title()} Match", True,
                                          f"Transaction belongs to {dept_name}")
                        else:
                            self.log_result(f"Admin Filter - {dept_name.title()} Match", False,
                                          f"Expected {dept_name}, got {transactions[0].get('department')}")
                    else:
                        self.log_result(f"Admin Filter - {dept_name.title()} Count", False,
                                      f"Expected 1 transaction, got {len(transactions)}")
                
                # Test stats with department filter
                success, stats = self.test_endpoint(
                    f"GET /api/transactions/stats?department={dept_name} - Admin",
                    f"transactions/stats?department={dept_name}",
                    auth_required=True,
                    expected_status=200
                )
                
                if success and isinstance(stats, dict):
                    total = stats.get("total", 0)
                    if total == 1:
                        self.log_result(f"Admin Stats - {dept_name.title()} Total", True,
                                      f"Stats shows total=1 for {dept_name}")
                    else:
                        self.log_result(f"Admin Stats - {dept_name.title()} Total", False,
                                      f"Expected total=1, got {total}")
            
            self.auth_token = temp_token
        
        # Test 3: Delete permissions
        print("\n  📋 Test 3: Delete Permissions")
        
        # Login as Gates Manager
        success, gates_login = self.test_endpoint(
            "Login as Gates Manager",
            "auth/login",
            method="POST",
            data=dept_managers["gates"],
            expected_status=200
        )
        
        if success and "access_token" in gates_login:
            gates_token = gates_login["access_token"]
            temp_token = self.auth_token
            self.auth_token = gates_token
            
            # Get gates transactions to find an ID
            success, gates_trans = self.test_endpoint(
                "GET /api/transactions - Gates Manager",
                "transactions",
                auth_required=True,
                expected_status=200
            )
            
            gates_trans_id = None
            if success and isinstance(gates_trans, list) and len(gates_trans) > 0:
                gates_trans_id = gates_trans[0].get("id")
            
            # Get planning transactions (should be filtered to gates only)
            success, planning_trans = self.test_endpoint(
                "GET /api/transactions?department=planning - Gates Manager (should be filtered)",
                "transactions?department=planning",
                auth_required=True,
                expected_status=200
            )
            
            # Gates manager should NOT see planning transactions (backend ignores the filter and returns gates transactions)
            if success and isinstance(planning_trans, list):
                # Check if any planning transactions are returned
                planning_trans_found = [t for t in planning_trans if t.get("department") == "planning"]
                
                if len(planning_trans_found) == 0:
                    self.log_result("Gates Manager - Cannot See Planning Transactions", True,
                                  "Correctly filtered out planning transactions (backend ignores dept filter for managers)")
                else:
                    self.log_result("Gates Manager - Cannot See Planning Transactions", False,
                                  f"Should not see planning transactions, but got {len(planning_trans_found)}")
                
                # Should only see gates transactions
                gates_trans_found = [t for t in planning_trans if t.get("department") == "gates"]
                if len(gates_trans_found) == len(planning_trans):
                    self.log_result("Gates Manager - Only Sees Gates Transactions", True,
                                  f"All {len(planning_trans)} transactions belong to gates department")
            
            # Try to delete a planning transaction (need to get ID from admin first)
            # Switch to admin to get planning transaction ID
            if admin_token:
                self.auth_token = admin_token
                
                success, planning_trans_admin = self.test_endpoint(
                    "GET /api/transactions?department=planning - Admin",
                    "transactions?department=planning",
                    auth_required=True,
                    expected_status=200
                )
                
                planning_trans_id = None
                if success and isinstance(planning_trans_admin, list) and len(planning_trans_admin) > 0:
                    planning_trans_id = planning_trans_admin[0].get("id")
                
                # Switch back to gates manager
                self.auth_token = gates_token
                
                # Try to delete planning transaction (should fail with 403)
                if planning_trans_id:
                    success, delete_response = self.test_endpoint(
                        "DELETE /api/transactions/{id} - Gates Manager Delete Planning (should fail)",
                        f"transactions/{planning_trans_id}",
                        method="DELETE",
                        auth_required=True,
                        expected_status=403
                    )
                    
                    if success:
                        self.log_result("Gates Manager - Cannot Delete Planning Transaction", True,
                                      "Correctly rejected with 403")
            
            # Delete gates transaction (should succeed)
            if gates_trans_id:
                success, delete_response = self.test_endpoint(
                    "DELETE /api/transactions/{id} - Gates Manager Delete Gates (should succeed)",
                    f"transactions/{gates_trans_id}",
                    method="DELETE",
                    auth_required=True,
                    expected_status=200
                )
                
                if success:
                    self.log_result("Gates Manager - Can Delete Own Transaction", True,
                                  "Successfully deleted gates transaction")
            
            self.auth_token = temp_token
        
        # Test 4: Cross-department isolation
        print("\n  📋 Test 4: Cross-Department Isolation")
        
        # Login as Gates Manager
        success, gates_login = self.test_endpoint(
            "Login as Gates Manager (Cross-Dept Test)",
            "auth/login",
            method="POST",
            data=dept_managers["gates"],
            expected_status=200
        )
        
        if success and "access_token" in gates_login:
            gates_token = gates_login["access_token"]
            temp_token = self.auth_token
            self.auth_token = gates_token
            
            # Try to get transactions with department=planning filter
            success, cross_dept_trans = self.test_endpoint(
                "GET /api/transactions?department=planning - Gates Manager (should be filtered)",
                "transactions?department=planning",
                auth_required=True,
                expected_status=200
            )
            
            # Should return empty or only gates transactions (backend should ignore the filter for dept managers)
            if success and isinstance(cross_dept_trans, list):
                # Check if any planning transactions are returned
                planning_trans_found = [t for t in cross_dept_trans if t.get("department") == "planning"]
                
                if len(planning_trans_found) == 0:
                    self.log_result("Cross-Department Isolation - Planning Filter Ignored", True,
                                  "Gates manager cannot access planning transactions even with filter")
                else:
                    self.log_result("Cross-Department Isolation - Planning Filter Ignored", False,
                                  f"Gates manager should not see planning transactions, but got {len(planning_trans_found)}")
                
                # All returned transactions should be gates transactions
                all_gates = all(t.get("department") == "gates" for t in cross_dept_trans)
                if all_gates or len(cross_dept_trans) == 0:
                    self.log_result("Cross-Department Isolation - Only Gates Transactions", True,
                                  "All returned transactions belong to gates department")
                else:
                    depts = set(t.get("department") for t in cross_dept_trans)
                    self.log_result("Cross-Department Isolation - Only Gates Transactions", False,
                                  f"Found transactions from other departments: {depts}")
            
            self.auth_token = temp_token

    def run_all_tests(self):
        """Run all API tests - Comprehensive Testing for Review Request"""
        print("🚀 Starting Crowd Services Platform Comprehensive Testing...")
        print(f"📡 Testing API at: {self.api_url}")
        print("=" * 80)
        
        # Category 1: Authentication & Authorization (all user roles)
        self.test_authentication_endpoints()
        
        # Category 2: User Management (System Admin only)
        self.test_user_management_endpoints()
        self.test_permission_validation()
        
        # Category 3: Employee Management (with location and shift)
        self.test_employee_management()
        
        # Category 4: Gates Management (all 9 fields, plaza_color, multi-category)
        self.test_gates_management_comprehensive()
        
        # Category 5: Dashboard & Stats (including employee_stats with shifts and locations)
        self.test_dashboard_with_employee_stats()
        self.test_dashboard_endpoints()
        
        # Category 6: Activity Logs (with filters)
        self.test_activity_logs()
        
        # Category 7: Alerts/Notifications
        self.test_alerts_comprehensive()
        
        # Category 8: RBAC Report Filtering (TODAY'S FEATURE)
        self.test_rbac_report_filtering()
        
        # Category 9: Sidebar Submenu Functionality (TODAY'S FEATURE)
        self.test_sidebar_submenu_functionality()
        
        # Category 10: Dropdown Options Management (TODAY'S FEATURE)
        self.test_dropdown_options_management()
        
        # Category 11: Login Page Customization (TODAY'S FEATURE)
        self.test_login_page_customization()
        
        # Category 12: Header Customization (TODAY'S FEATURE)
        self.test_header_customization()
        
        # Category 13: Interactive Maps (TODAY'S FEATURE)
        self.test_interactive_maps()
        
        # Category 14: Employee-Gate Relationship (TODAY'S FEATURE)
        self.test_employee_gate_relationship()
        
        # Category 15: Transactions Data Isolation (CRITICAL TEST)
        self.test_transactions_data_isolation()
        
        # Category 16: Transaction Data Isolation for Admin (TODAY'S TEST)
        self.test_transaction_data_isolation_admin()
        
        # Additional tests
        self.test_admin_endpoints()
        self.test_unauthorized_access()
        self.test_root_endpoint()
        self.test_plazas_endpoints()
        self.test_mataf_endpoints()
        self.test_reports_endpoints()
        self.test_planning_endpoints()
        self.test_crowd_services_endpoints()
        
        # Print summary
        print("\n" + "=" * 80)
        print("📊 COMPREHENSIVE TEST SUMMARY")
        print("=" * 80)
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