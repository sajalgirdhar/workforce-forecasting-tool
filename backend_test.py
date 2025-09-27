#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime, timedelta
import io

class CallCenterAPITester:
    def __init__(self, base_url="https://call-forecast.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def test_api_root(self):
        """Test API root endpoint"""
        try:
            response = requests.get(f"{self.api_url}/", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Response: {data}"
            self.log_test("API Root Endpoint", success, details)
            return success
        except Exception as e:
            self.log_test("API Root Endpoint", False, str(e))
            return False

    def test_get_call_data_empty(self):
        """Test getting call data when empty"""
        try:
            response = requests.get(f"{self.api_url}/call-data", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Data points: {len(data)}"
            self.log_test("Get Call Data (Empty)", success, details)
            return success, response.json() if success else []
        except Exception as e:
            self.log_test("Get Call Data (Empty)", False, str(e))
            return False, []

    def test_add_single_call_data(self):
        """Test adding a single call data point"""
        try:
            test_data = {
                "date": "2024-12-01",
                "calls_volume": 150,
                "staffing_level": 12,
                "service_level": 0.85
            }
            
            response = requests.post(
                f"{self.api_url}/call-data", 
                json=test_data,
                timeout=10
            )
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", ID: {data.get('id', 'N/A')}"
            self.log_test("Add Single Call Data", success, details)
            return success
        except Exception as e:
            self.log_test("Add Single Call Data", False, str(e))
            return False

    def test_add_bulk_call_data(self):
        """Test adding multiple call data points"""
        try:
            # Generate sample data for 14 days
            bulk_data = []
            base_date = datetime(2024, 12, 1)
            
            for i in range(14):
                date = base_date + timedelta(days=i)
                bulk_data.append({
                    "date": date.strftime("%Y-%m-%d"),
                    "calls_volume": 120 + (i * 5) + (i % 3 * 10),  # Varying call volume
                    "staffing_level": 10 + (i % 4),  # Varying staffing
                    "service_level": 0.75 + (i % 5 * 0.03)  # Varying service level
                })
            
            payload = {"data_points": bulk_data}
            response = requests.post(
                f"{self.api_url}/call-data/bulk",
                json=payload,
                timeout=15
            )
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Message: {data.get('message', 'N/A')}"
            self.log_test("Add Bulk Call Data", success, details)
            return success
        except Exception as e:
            self.log_test("Add Bulk Call Data", False, str(e))
            return False

    def test_get_call_data_with_data(self):
        """Test getting call data after adding data"""
        try:
            response = requests.get(f"{self.api_url}/call-data", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Data points: {len(data)}"
                success = len(data) > 0  # Should have data now
            self.log_test("Get Call Data (With Data)", success, details)
            return success, response.json() if response.status_code == 200 else []
        except Exception as e:
            self.log_test("Get Call Data (With Data)", False, str(e))
            return False, []

    def test_csv_upload(self):
        """Test CSV file upload functionality"""
        try:
            # Create sample CSV content
            csv_content = """date,calls_volume,staffing_level,service_level
2024-12-15,180,15,0.88
2024-12-16,165,14,0.82
2024-12-17,195,16,0.91"""
            
            # Create file-like object
            csv_file = io.StringIO(csv_content)
            files = {'file': ('test_data.csv', csv_file.getvalue(), 'text/csv')}
            
            response = requests.post(
                f"{self.api_url}/upload-csv",
                files=files,
                timeout=15
            )
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Message: {data.get('message', 'N/A')}"
            self.log_test("CSV Upload", success, details)
            return success
        except Exception as e:
            self.log_test("CSV Upload", False, str(e))
            return False

    def test_forecasting_methods(self):
        """Test all forecasting methods"""
        methods = ["arima", "exponential_smoothing", "random_forest", "linear_regression", "seasonal_decompose"]
        
        for method in methods:
            try:
                forecast_request = {
                    "method": method,
                    "forecast_days": 7,
                    "confidence_level": 0.95
                }
                
                response = requests.post(
                    f"{self.api_url}/forecast",
                    json=forecast_request,
                    timeout=30  # Forecasting can take time
                )
                success = response.status_code == 200
                details = f"Status: {response.status_code}"
                if success:
                    data = response.json()
                    details += f", Predictions: {len(data.get('predicted_calls', []))}"
                    details += f", Method: {data.get('method', 'N/A')}"
                else:
                    try:
                        error_data = response.json()
                        details += f", Error: {error_data.get('detail', 'Unknown error')}"
                    except:
                        details += f", Raw response: {response.text[:100]}"
                
                self.log_test(f"Forecast - {method.upper()}", success, details)
            except Exception as e:
                self.log_test(f"Forecast - {method.upper()}", False, str(e))

    def test_get_forecasts(self):
        """Test getting saved forecasts"""
        try:
            response = requests.get(f"{self.api_url}/forecasts", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Forecasts: {len(data)}"
            self.log_test("Get Forecasts", success, details)
            return success
        except Exception as e:
            self.log_test("Get Forecasts", False, str(e))
            return False

    def test_accuracy_analysis(self):
        """Test accuracy analysis endpoint"""
        try:
            response = requests.get(f"{self.api_url}/analytics/accuracy", timeout=30)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                if isinstance(data, dict) and 'message' in data:
                    details += f", Message: {data['message']}"
                else:
                    details += f", Methods analyzed: {len(data) if isinstance(data, dict) else 0}"
            self.log_test("Accuracy Analysis", success, details)
            return success
        except Exception as e:
            self.log_test("Accuracy Analysis", False, str(e))
            return False

    def test_invalid_forecast_method(self):
        """Test invalid forecasting method"""
        try:
            forecast_request = {
                "method": "invalid_method",
                "forecast_days": 7,
                "confidence_level": 0.95
            }
            
            response = requests.post(
                f"{self.api_url}/forecast",
                json=forecast_request,
                timeout=10
            )
            success = response.status_code == 400  # Should return error
            details = f"Status: {response.status_code} (Expected 400)"
            self.log_test("Invalid Forecast Method", success, details)
            return success
        except Exception as e:
            self.log_test("Invalid Forecast Method", False, str(e))
            return False

    def run_all_tests(self):
        """Run all backend API tests"""
        print("🚀 Starting Call Center Forecasting API Tests")
        print("=" * 60)
        
        # Test basic connectivity
        if not self.test_api_root():
            print("❌ API is not accessible. Stopping tests.")
            return False
        
        # Test data management
        print("\n📊 Testing Data Management...")
        self.test_get_call_data_empty()
        self.test_add_single_call_data()
        self.test_add_bulk_call_data()
        success, data = self.test_get_call_data_with_data()
        
        if not success or len(data) < 7:
            print("⚠️  Insufficient data for forecasting tests")
            return False
        
        # Test CSV upload
        print("\n📁 Testing CSV Upload...")
        self.test_csv_upload()
        
        # Test forecasting
        print("\n🔮 Testing Forecasting Methods...")
        self.test_forecasting_methods()
        
        # Test forecast retrieval
        print("\n📈 Testing Forecast Management...")
        self.test_get_forecasts()
        self.test_accuracy_analysis()
        
        # Test error handling
        print("\n🛡️  Testing Error Handling...")
        self.test_invalid_forecast_method()
        
        return True

    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.tests_run - self.tests_passed > 0:
            print("\n❌ Failed Tests:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  - {result['test']}: {result['details']}")
        
        return self.tests_passed == self.tests_run

def main():
    tester = CallCenterAPITester()
    
    try:
        success = tester.run_all_tests()
        tester.print_summary()
        return 0 if success else 1
    except KeyboardInterrupt:
        print("\n⚠️  Tests interrupted by user")
        return 1
    except Exception as e:
        print(f"\n💥 Unexpected error: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())