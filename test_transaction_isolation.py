#!/usr/bin/env python3
"""
Transaction Isolation Testing for Al-Haram OS
Tests complete isolation between all 5 departments
"""

import requests
import sys
import json
from datetime import datetime

class TransactionIsolationTester:
    def __init__(self, base_url="https://mosque-flow.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        
        # Test credentials
        self.credentials = {
            "admin": {"email": "admin@crowd.sa", "password": "admin123"},
            "manager.gates": {"email": "manager.gates@crowd.sa", "password": "manager123"},
            "manager.plazas": {"email": "manager.plazas@crowd.sa", "password": "manager123"},
            "manager.planning": {"email": "manager.planning@crowd.sa", "password": "manager123"},
            "manager.mataf": {"email": "manager.mataf@crowd.sa", "password": "manager123"},
            "manager.crowd": {"email": "manager.crowd@crowd.sa", "password": "manager123"}
        }
        
        # Departments to test
        self.departments = ["gates", "plazas", "planning", "mataf", "crowd_services"]
        
        # Store tokens
        self.tokens = {}
        
        # Store created transaction IDs for cleanup
        self.created_transaction_ids = []

    def log(self, message, level="INFO"):
        """Log a message"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")

    def log_result(self, test_name: str, success: bool, details: str = ""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {test_name}")
            if details:
                print(f"   {details}")
        else:
            self.failed_tests.append({"test": test_name, "details": details})
            print(f"❌ {test_name}")
            print(f"   FAILED: {details}")

    def login(self, user_key: str) -> str:
        """Login and return token"""
        if user_key in self.tokens:
            return self.tokens[user_key]
        
        creds = self.credentials[user_key]
        try:
            response = requests.post(
                f"{self.api_url}/auth/login",
                json=creds,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                token = data.get("access_token")
                self.tokens[user_key] = token
                self.log(f"Logged in as {creds['email']}")
                return token
            else:
                self.log(f"Login failed for {user_key}: {response.status_code}", "ERROR")
                return None
        except Exception as e:
            self.log(f"Login error for {user_key}: {str(e)}", "ERROR")
            return None

    def create_test_transaction(self, department: str, token: str) -> str:
        """Create a test transaction for a department"""
        transaction_data = {
            "transaction_number": f"TEST-{department}-001",
            "transaction_date": "1446/07/15",
            "subject": f"معاملة اختبار لقسم {department}",
            "assigned_to": f"موظف {department}",
            "priority": "normal",
            "department": department,
            "notes": f"معاملة تجريبية للاختبار - {department}"
        }
        
        try:
            response = requests.post(
                f"{self.api_url}/transactions",
                json=transaction_data,
                headers={"Authorization": f"Bearer {token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                transaction_id = data.get("id")
                self.created_transaction_ids.append(transaction_id)
                self.log(f"Created transaction TEST-{department}-001 (ID: {transaction_id})")
                return transaction_id
            else:
                self.log(f"Failed to create transaction for {department}: {response.status_code}", "ERROR")
                return None
        except Exception as e:
            self.log(f"Error creating transaction for {department}: {str(e)}", "ERROR")
            return None

    def get_transactions(self, token: str, department: str = None) -> list:
        """Get transactions with optional department filter"""
        try:
            url = f"{self.api_url}/transactions"
            if department:
                url += f"?department={department}"
            
            response = requests.get(
                url,
                headers={"Authorization": f"Bearer {token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                self.log(f"Failed to get transactions: {response.status_code}", "ERROR")
                return []
        except Exception as e:
            self.log(f"Error getting transactions: {str(e)}", "ERROR")
            return []

    def delete_transaction(self, transaction_id: str, token: str) -> tuple:
        """Delete a transaction, returns (success, status_code)"""
        try:
            response = requests.delete(
                f"{self.api_url}/transactions/{transaction_id}",
                headers={"Authorization": f"Bearer {token}"},
                timeout=10
            )
            return (response.status_code == 200, response.status_code)
        except Exception as e:
            self.log(f"Error deleting transaction: {str(e)}", "ERROR")
            return (False, 0)

    def cleanup_test_data(self):
        """Clean up all test transactions"""
        self.log("\n🧹 Cleaning up test data...")
        admin_token = self.login("admin")
        if not admin_token:
            self.log("Cannot cleanup - admin login failed", "ERROR")
            return
        
        # Get all transactions
        all_transactions = self.get_transactions(admin_token)
        
        # Delete all TEST-* transactions
        deleted_count = 0
        for trans in all_transactions:
            if trans.get("transaction_number", "").startswith("TEST-"):
                success, _ = self.delete_transaction(trans["id"], admin_token)
                if success:
                    deleted_count += 1
        
        self.log(f"Deleted {deleted_count} test transactions")

    def setup_test_data(self):
        """Create one test transaction per department"""
        self.log("\n📝 Setting up test data...")
        admin_token = self.login("admin")
        if not admin_token:
            self.log("Setup failed - admin login failed", "ERROR")
            return False
        
        # First cleanup any existing test data
        self.cleanup_test_data()
        
        # Create one transaction per department
        for dept in self.departments:
            transaction_id = self.create_test_transaction(dept, admin_token)
            if not transaction_id:
                self.log(f"Failed to create transaction for {dept}", "ERROR")
                return False
        
        self.log(f"✅ Created {len(self.departments)} test transactions")
        return True

    def test_admin_department_filtering(self):
        """Test 1: Admin views each department page and sees only that department's transaction"""
        self.log("\n" + "="*80)
        self.log("TEST 1: Admin Department Filtering")
        self.log("="*80)
        
        admin_token = self.login("admin")
        if not admin_token:
            self.log_result("Admin Login", False, "Failed to login as admin")
            return
        
        for dept in self.departments:
            transactions = self.get_transactions(admin_token, department=dept)
            
            # Should return exactly 1 transaction
            if len(transactions) != 1:
                self.log_result(
                    f"Admin views {dept} page",
                    False,
                    f"Expected 1 transaction, got {len(transactions)}"
                )
                continue
            
            # Check it's the correct department
            trans = transactions[0]
            if trans.get("department") != dept:
                self.log_result(
                    f"Admin views {dept} page",
                    False,
                    f"Expected department '{dept}', got '{trans.get('department')}'"
                )
                continue
            
            # Check transaction number
            expected_number = f"TEST-{dept}-001"
            if trans.get("transaction_number") != expected_number:
                self.log_result(
                    f"Admin views {dept} page",
                    False,
                    f"Expected number '{expected_number}', got '{trans.get('transaction_number')}'"
                )
                continue
            
            self.log_result(
                f"Admin views {dept} page",
                True,
                f"✓ Returns 1 transaction: {expected_number}"
            )

    def test_manager_isolation(self):
        """Test 2: Each department manager sees only their own department's transaction"""
        self.log("\n" + "="*80)
        self.log("TEST 2: Department Manager Isolation")
        self.log("="*80)
        
        manager_mapping = {
            "gates": "manager.gates",
            "plazas": "manager.plazas",
            "planning": "manager.planning",
            "mataf": "manager.mataf",
            "crowd_services": "manager.crowd"
        }
        
        for dept, manager_key in manager_mapping.items():
            token = self.login(manager_key)
            if not token:
                self.log_result(f"{manager_key} login", False, "Login failed")
                continue
            
            # Get transactions (no filter needed - backend auto-filters by user's department)
            transactions = self.get_transactions(token)
            
            # Should return exactly 1 transaction
            if len(transactions) != 1:
                self.log_result(
                    f"{manager_key} sees own data",
                    False,
                    f"Expected 1 transaction, got {len(transactions)}"
                )
                continue
            
            # Check it's the correct department
            trans = transactions[0]
            if trans.get("department") != dept:
                self.log_result(
                    f"{manager_key} sees own data",
                    False,
                    f"Expected department '{dept}', got '{trans.get('department')}'"
                )
                continue
            
            # Check transaction number
            expected_number = f"TEST-{dept}-001"
            if trans.get("transaction_number") != expected_number:
                self.log_result(
                    f"{manager_key} sees own data",
                    False,
                    f"Expected number '{expected_number}', got '{trans.get('transaction_number')}'"
                )
                continue
            
            self.log_result(
                f"{manager_key} sees own data",
                True,
                f"✓ Returns only {expected_number}"
            )

    def test_delete_permissions(self):
        """Test 3: Department managers can only delete their own department's transactions"""
        self.log("\n" + "="*80)
        self.log("TEST 3: Delete Permissions")
        self.log("="*80)
        
        # Get gates manager token
        gates_token = self.login("manager.gates")
        if not gates_token:
            self.log_result("Gates manager login", False, "Login failed")
            return
        
        # Get admin token to fetch transaction IDs
        admin_token = self.login("admin")
        if not admin_token:
            self.log_result("Admin login", False, "Login failed")
            return
        
        # Get planning transaction (different department)
        planning_transactions = self.get_transactions(admin_token, department="planning")
        if len(planning_transactions) == 0:
            self.log_result("Get planning transaction", False, "No planning transaction found")
            return
        
        planning_trans_id = planning_transactions[0]["id"]
        
        # Test 3a: Gates manager tries to delete planning transaction (should fail with 403)
        success, status_code = self.delete_transaction(planning_trans_id, gates_token)
        if status_code == 403:
            self.log_result(
                "Gates manager cannot delete planning transaction",
                True,
                f"✓ Correctly returned 403 Forbidden"
            )
        else:
            self.log_result(
                "Gates manager cannot delete planning transaction",
                False,
                f"Expected 403, got {status_code}"
            )
        
        # Get gates transaction
        gates_transactions = self.get_transactions(admin_token, department="gates")
        if len(gates_transactions) == 0:
            self.log_result("Get gates transaction", False, "No gates transaction found")
            return
        
        gates_trans_id = gates_transactions[0]["id"]
        
        # Test 3b: Gates manager deletes own transaction (should succeed with 200)
        success, status_code = self.delete_transaction(gates_trans_id, gates_token)
        if status_code == 200:
            self.log_result(
                "Gates manager can delete own transaction",
                True,
                f"✓ Successfully deleted TEST-gates-001"
            )
            # Recreate it for other tests
            self.create_test_transaction("gates", admin_token)
        else:
            self.log_result(
                "Gates manager can delete own transaction",
                False,
                f"Expected 200, got {status_code}"
            )

    def run_all_tests(self):
        """Run all transaction isolation tests"""
        print("\n" + "="*80)
        print("🧪 TRANSACTION ISOLATION TESTING")
        print("="*80)
        print(f"Testing complete isolation between 5 departments:")
        print(f"  1. gates")
        print(f"  2. plazas")
        print(f"  3. planning")
        print(f"  4. mataf")
        print(f"  5. crowd_services")
        print("="*80)
        
        # Setup test data
        if not self.setup_test_data():
            print("\n❌ Test setup failed. Aborting tests.")
            return
        
        # Run tests
        self.test_admin_department_filtering()
        self.test_manager_isolation()
        self.test_delete_permissions()
        
        # Cleanup
        self.cleanup_test_data()
        
        # Print summary
        print("\n" + "="*80)
        print("📊 TEST SUMMARY")
        print("="*80)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {len(self.failed_tests)}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100) if self.tests_run > 0 else 0:.1f}%")
        
        if self.failed_tests:
            print("\n❌ FAILED TESTS:")
            for failed in self.failed_tests:
                print(f"  • {failed['test']}")
                print(f"    {failed['details']}")
        else:
            print("\n✅ ALL TESTS PASSED!")
        
        print("="*80)
        
        return len(self.failed_tests) == 0


if __name__ == "__main__":
    tester = TransactionIsolationTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)
