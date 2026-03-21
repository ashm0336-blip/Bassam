#!/usr/bin/env python3
"""
Backend API Testing for Crowd Services Platform
Tests login, dashboard APIs, field worker endpoints, and employee APIs
"""

import requests
import sys
import json
from datetime import datetime

class CrowdServicesTester:
    def __init__(self, base_url="https://employee-dash-19.preview.emergentagent.com"):
        self.base_url = base_url.rstrip('/')
        self.api_url = f"{self.base_url}/api"
        self.access_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def log(self, message):
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")

    def run_test(self, name, method, endpoint, expected_status=200, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint.lstrip('/')}"
        test_headers = {'Content-Type': 'application/json'}
        
        if headers:
            test_headers.update(headers)
        
        if self.access_token:
            test_headers['Authorization'] = f'Bearer {self.access_token}'

        self.tests_run += 1
        self.log(f"Testing {name}...")
        self.log(f"  {method} {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                self.log(f"✅ PASSED - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, dict) and len(str(response_data)) < 500:
                        self.log(f"   Response: {json.dumps(response_data, ensure_ascii=False)[:200]}")
                except:
                    self.log(f"   Response length: {len(response.text)} chars")
                return True, response.json() if response.text else {}
            else:
                self.log(f"❌ FAILED - Expected {expected_status}, got {response.status_code}")
                self.log(f"   Response: {response.text[:200]}")
                self.failed_tests.append(f"{name}: Expected {expected_status}, got {response.status_code}")
                return False, {}

        except requests.exceptions.Timeout:
            self.log(f"❌ FAILED - Request timeout")
            self.failed_tests.append(f"{name}: Request timeout")
            return False, {}
        except Exception as e:
            self.log(f"❌ FAILED - Error: {str(e)}")
            self.failed_tests.append(f"{name}: {str(e)}")
            return False, {}

    def test_login(self):
        """Test login with admin@crowd.sa / admin123 using 'identifier' field"""
        self.log("\n=== Testing Authentication ===")
        
        # Test login with correct credentials
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "/auth/login",
            200,
            data={"identifier": "admin@crowd.sa", "password": "admin123"}
        )
        
        if success and 'access_token' in response:
            self.access_token = response['access_token']
            self.log(f"✅ Login successful, got access_token")
            return True
        else:
            self.log(f"❌ Login failed - no access_token in response: {response}")
            return False

    def test_dashboard_ops(self):
        """Test dashboard operations room endpoint"""
        self.log("\n=== Testing Dashboard APIs ===")
        
        success, response = self.run_test(
            "Dashboard Ops Data",
            "GET",
            "/dashboard/ops",
            200
        )
        
        if success:
            # Validate response structure
            expected_keys = ['kpis', 'heatmap', 'smart_alerts', 'timeline']
            missing_keys = [key for key in expected_keys if key not in response]
            if missing_keys:
                self.log(f"⚠️ Missing keys in response: {missing_keys}")
            else:
                self.log(f"✅ Dashboard ops response has all expected keys")
        
        return success

    def test_field_worker_endpoints(self):
        """Test field worker density and alert endpoints"""
        self.log("\n=== Testing Field Worker APIs ===")
        
        if not self.access_token:
            self.log("❌ No access token available for field worker tests")
            return False

        # Test density submission
        density_success, _ = self.run_test(
            "Field Density Submission",
            "POST",
            "/field/density",
            200,
            data={
                "zone_name": "Test Zone",
                "value": "متوسط",
                "notes": "Test density from API testing"
            }
        )

        # Test alert submission  
        alert_success, _ = self.run_test(
            "Field Alert Submission", 
            "POST",
            "/field/alert",
            200,
            data={
                "alert_type": "density",
                "message": "Test alert from API testing",
                "location": "Test Location",
                "priority": "medium"
            }
        )

        return density_success and alert_success

    def test_smart_alerts(self):
        """Test smart alerts endpoint"""
        self.log("\n=== Testing Smart Alerts ===")
        
        if not self.access_token:
            self.log("❌ No access token available for smart alerts test")
            return False

        success, response = self.run_test(
            "Smart Alerts",
            "GET", 
            "/smart-alerts",
            200
        )
        
        if success:
            if isinstance(response, list):
                self.log(f"✅ Smart alerts returned {len(response)} alerts")
            else:
                self.log(f"⚠️ Smart alerts response is not a list: {type(response)}")
        
        return success

    def test_employees_api(self):
        """Test employees API and profile endpoint"""
        self.log("\n=== Testing Employee APIs ===")
        
        if not self.access_token:
            self.log("❌ No access token available for employees test") 
            return False

        # Get employees list
        emp_success, emp_response = self.run_test(
            "Get Employees List",
            "GET",
            "/employees", 
            200
        )

        if not emp_success or not emp_response:
            return False

        # Get first employee ID for profile test
        if isinstance(emp_response, list) and len(emp_response) > 0:
            employee_id = emp_response[0].get('id')
            if employee_id:
                self.log(f"✅ Found employee ID: {employee_id}")
                
                # Test employee profile
                profile_success, _ = self.run_test(
                    "Employee Profile",
                    "GET",
                    f"/employees/{employee_id}/profile",
                    200
                )
                return profile_success
            else:
                self.log("❌ No employee ID found in response")
                return False
        else:
            self.log(f"❌ Expected employees list, got: {type(emp_response)}")
            return False

    def test_health_endpoint(self):
        """Test health check endpoint"""
        self.log("\n=== Testing Health Check ===")
        
        success, _ = self.run_test(
            "Health Check",
            "GET",
            "/health",
            200
        )
        return success

    def run_all_tests(self):
        """Run all backend API tests"""
        self.log("🚀 Starting Crowd Services Backend API Tests")
        self.log(f"🔗 Base URL: {self.base_url}")
        
        # Test health check first
        health_ok = self.test_health_endpoint()
        if not health_ok:
            self.log("❌ Health check failed - server may not be running")
        
        # Test authentication
        login_ok = self.test_login()
        if not login_ok:
            self.log("❌ Login failed - cannot continue with authenticated tests")
            return self.print_results()

        # Test dashboard APIs
        dashboard_ok = self.test_dashboard_ops()
        
        # Test field worker endpoints
        field_ok = self.test_field_worker_endpoints()
        
        # Test smart alerts
        alerts_ok = self.test_smart_alerts()
        
        # Test employees API
        employees_ok = self.test_employees_api()

        return self.print_results()

    def print_results(self):
        """Print test summary and return exit code"""
        self.log("\n" + "="*50)
        self.log("📊 TEST SUMMARY")
        self.log("="*50)
        self.log(f"Tests Run: {self.tests_run}")
        self.log(f"Tests Passed: {self.tests_passed}")
        self.log(f"Tests Failed: {self.tests_run - self.tests_passed}")
        self.log(f"Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%" if self.tests_run > 0 else "Success Rate: 0%")
        
        if self.failed_tests:
            self.log("\n❌ FAILED TESTS:")
            for i, failure in enumerate(self.failed_tests, 1):
                self.log(f"  {i}. {failure}")
        
        if self.tests_passed == self.tests_run:
            self.log("🎉 All tests passed!")
            return 0
        else:
            self.log("💥 Some tests failed!")
            return 1

def main():
    tester = CrowdServicesTester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())