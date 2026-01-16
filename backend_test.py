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
    def __init__(self, base_url="https://crowdservices.preview.emergentagent.com"):
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
                     required_fields: List[str] = None) -> tuple:
        """Test a single API endpoint"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
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
        
        # Test all endpoints
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