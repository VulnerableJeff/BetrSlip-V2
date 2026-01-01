import requests
import sys
import base64
import io
from datetime import datetime
from PIL import Image

class BetAnalyzerAPITester:
    def __init__(self, base_url="https://win-predictor-35.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        
        if not files:
            headers['Content-Type'] = 'application/json'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                if files:
                    response = requests.post(url, files=files, headers={k: v for k, v in headers.items() if k != 'Content-Type'})
                else:
                    response = requests.post(url, json=data, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response keys: {list(response_data.keys()) if isinstance(response_data, dict) else 'Non-dict response'}")
                except:
                    print(f"   Response: {response.text[:100]}...")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")

            return success, response.json() if success and response.text else {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        success, response = self.run_test(
            "Root API Endpoint",
            "GET",
            "",
            200
        )
        return success

    def test_signup(self, email, password):
        """Test user signup"""
        success, response = self.run_test(
            "User Signup",
            "POST",
            "auth/signup",
            200,
            data={"email": email, "password": password}
        )
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response.get('user', {}).get('id')
            print(f"   Token received: {self.token[:20]}...")
            return True
        return False

    def test_login(self, email, password):
        """Test user login"""
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data={"email": email, "password": password}
        )
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response.get('user', {}).get('id')
            print(f"   Token received: {self.token[:20]}...")
            return True
        return False

    def create_test_image(self):
        """Create a test betting slip image"""
        # Create a simple test image with text
        img = Image.new('RGB', (400, 600), color='white')
        
        # Convert to bytes
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='JPEG')
        img_bytes.seek(0)
        
        return img_bytes.getvalue()

    def test_analyze_bet_slip_with_teams(self):
        """Test bet slip analysis with real team names to trigger real-time intelligence"""
        if not self.token:
            print("❌ No token available for analysis test")
            return False

        # Create test image with team names in the filename to help with extraction
        image_data = self.create_test_image()
        
        # Use a filename that suggests team content
        files = {
            'file': ('chiefs_vs_bills_bet_slip.jpg', image_data, 'image/jpeg')
        }
        
        print(f"🔍 Testing with team-specific bet slip...")
        success, response = self.run_test(
            "Analyze Bet Slip (Chiefs vs Bills)",
            "POST",
            "analyze",
            200,
            files=files
        )
        
        if success:
            # Test NEW real-time intelligence fields
            intelligence_fields = ['injuries_data', 'weather_data', 'team_form_data']
            print(f"\n🔍 Testing Real-Time Intelligence Fields:")
            
            has_intelligence_data = False
            for field in intelligence_fields:
                if field in response:
                    value = response[field]
                    if value is not None:
                        has_intelligence_data = True
                        print(f"   ✅ {field}: Found data")
                        if field == 'injuries_data' and isinstance(value, list):
                            print(f"      - {len(value)} injury records")
                            if value:
                                print(f"      - Sample: {value[0].get('player', 'N/A')} ({value[0].get('status', 'N/A')})")
                        elif field == 'weather_data' and isinstance(value, dict):
                            print(f"      - Temperature: {value.get('temp', 'N/A')}°F")
                            print(f"      - Conditions: {value.get('conditions', 'N/A')}")
                        elif field == 'team_form_data' and isinstance(value, list):
                            print(f"      - {len(value)} team records")
                            if value:
                                print(f"      - Sample: {value[0].get('team', 'N/A')} ({value[0].get('record', 'N/A')})")
                    else:
                        print(f"   ⚠️  {field}: Present but null")
                else:
                    print(f"   ❌ {field}: Missing from response")
            
            if not has_intelligence_data:
                print(f"   ℹ️  Note: No team names detected in image, so real-time data is null (expected for test image)")
            
            print(f"\n📊 Analysis Results:")
            print(f"   Win probability: {response.get('win_probability', 'N/A')}%")
            print(f"   Confidence score: {response.get('confidence_score', 'N/A')}/10")
            print(f"   Expected value: {response.get('expected_value', 'N/A')}%")
            print(f"   Recommendation: {response.get('recommendation', 'N/A')}")
        
        return success

    def test_get_history(self):
        """Test getting bet history"""
        if not self.token:
            print("❌ No token available for history test")
            return False

        success, response = self.run_test(
            "Get Bet History",
            "GET",
            "history",
            200
        )
        
        if success:
            if isinstance(response, list):
                print(f"   History items: {len(response)}")
                if response:
                    first_item = response[0]
                    print(f"   First item keys: {list(first_item.keys())}")
            else:
                print(f"   Unexpected response type: {type(response)}")
        
        return success

    def test_invalid_auth(self):
        """Test endpoints with invalid authentication"""
        old_token = self.token
        self.token = "invalid_token"
        
        success, _ = self.run_test(
            "Invalid Auth - History",
            "GET",
            "history",
            401
        )
        
        self.token = old_token
        return success

def main():
    print("🚀 Starting BetAnalyzer API Tests")
    print("=" * 50)
    
    # Setup
    tester = BetAnalyzerAPITester()
    test_email = f"test_user_{datetime.now().strftime('%H%M%S')}@example.com"
    test_password = "TestPass123!"

    # Test sequence
    tests_to_run = [
        ("Root Endpoint", lambda: tester.test_root_endpoint()),
        ("User Signup", lambda: tester.test_signup(test_email, test_password)),
        ("Bet Slip Analysis", lambda: tester.test_analyze_bet_slip()),
        ("Get History", lambda: tester.test_get_history()),
        ("Invalid Auth", lambda: tester.test_invalid_auth()),
    ]

    # Run tests
    for test_name, test_func in tests_to_run:
        try:
            result = test_func()
            if not result:
                print(f"⚠️  {test_name} failed - continuing with remaining tests")
        except Exception as e:
            print(f"💥 {test_name} crashed: {str(e)}")

    # Test login with existing user
    print(f"\n🔄 Testing login with existing user...")
    login_success = tester.test_login(test_email, test_password)
    if login_success:
        print("✅ Login with existing user successful")
    else:
        print("❌ Login with existing user failed")

    # Print results
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print("⚠️  Some tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())