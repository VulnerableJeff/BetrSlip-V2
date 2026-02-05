"""
BetrSlip API Backend Tests
Tests for authentication, bet slip analysis, and history endpoints
"""
import pytest
import requests
import os
import base64
from PIL import Image
import io

# Get BASE_URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    raise ValueError("REACT_APP_BACKEND_URL environment variable not set")

# Test credentials
TEST_EMAIL = "hundojeff@icloud.com"
TEST_PASSWORD = "Boo-boo600"

# Test user for signup tests
TEST_SIGNUP_EMAIL = f"test_user_{os.urandom(4).hex()}@test.com"
TEST_SIGNUP_PASSWORD = "TestPassword123!"


class TestHealthEndpoints:
    """Health check endpoint tests"""
    
    def test_health_check(self):
        """Test /health endpoint"""
        response = requests.get(f"{BASE_URL}/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print(f"✓ Health check passed: {data}")
    
    def test_api_health_check(self):
        """Test /api/health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print(f"✓ API health check passed: {data}")


class TestAuthentication:
    """Authentication endpoint tests"""
    
    def test_login_success(self):
        """Test successful login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "Token not in response"
        assert "user" in data, "User not in response"
        assert data["user"]["email"] == TEST_EMAIL
        print(f"✓ Login successful for {TEST_EMAIL}")
        return data["token"]
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@test.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Invalid credentials correctly rejected")
    
    def test_login_missing_fields(self):
        """Test login with missing fields"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL
        })
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        print("✓ Missing fields correctly rejected")
    
    def test_get_current_user(self):
        """Test /api/auth/me endpoint"""
        # First login to get token
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = login_response.json()["token"]
        
        # Get current user
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Get user failed: {response.text}"
        data = response.json()
        assert data["email"] == TEST_EMAIL
        print(f"✓ Get current user successful: {data['email']}")


class TestUsageTracking:
    """Usage tracking endpoint tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        return response.json()["token"]
    
    def test_get_usage(self, auth_token):
        """Test /api/usage endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/usage",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Get usage failed: {response.text}"
        data = response.json()
        assert "analyses_used" in data or "analyses_remaining" in data
        assert "free_limit" in data or "is_subscribed" in data
        print(f"✓ Usage data retrieved: {data}")
    
    def test_get_auth_usage(self, auth_token):
        """Test /api/auth/usage endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/auth/usage",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Get auth usage failed: {response.text}"
        data = response.json()
        assert "analyses_used" in data
        print(f"✓ Auth usage data retrieved: {data}")


class TestBetSlipAnalysis:
    """Bet slip analysis endpoint tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        return response.json()["token"]
    
    @pytest.fixture
    def test_image(self):
        """Create a test bet slip image"""
        # Create a simple bet slip image
        img = Image.new('RGB', (400, 500), color='white')
        from PIL import ImageDraw
        draw = ImageDraw.Draw(img)
        
        # Add bet slip content
        draw.rectangle([10, 10, 390, 490], outline='black', width=2)
        draw.text((20, 20), "BET SLIP", fill='black')
        draw.line([(20, 50), (380, 50)], fill='black', width=1)
        draw.text((20, 70), "NFL - Sunday Night Football", fill='black')
        draw.text((20, 100), "Kansas City Chiefs -3.5", fill='black')
        draw.text((20, 130), "vs Buffalo Bills", fill='black')
        draw.text((20, 160), "Odds: -110", fill='black')
        draw.text((20, 210), "Stake: $50", fill='black')
        draw.text((20, 240), "Potential Win: $95.45", fill='black')
        
        # Save to bytes
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        return buffer
    
    def test_analyze_bet_slip(self, auth_token, test_image):
        """Test POST /api/analyze endpoint with image upload"""
        files = {
            'file': ('bet_slip.png', test_image, 'image/png')
        }
        
        response = requests.post(
            f"{BASE_URL}/api/analyze",
            headers={"Authorization": f"Bearer {auth_token}"},
            files=files,
            timeout=120  # AI analysis can take time
        )
        
        assert response.status_code == 200, f"Analysis failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "id" in data, "Analysis ID not in response"
        assert "analysis" in data, "Analysis data not in response"
        
        # Verify analysis contains expected fields
        analysis = data["analysis"]
        print(f"✓ Bet slip analysis successful!")
        print(f"  Analysis ID: {data['id']}")
        print(f"  Analysis keys: {list(analysis.keys())}")
        
        return data
    
    def test_analyze_without_auth(self, test_image):
        """Test analyze endpoint without authentication"""
        files = {
            'file': ('bet_slip.png', test_image, 'image/png')
        }
        
        response = requests.post(
            f"{BASE_URL}/api/analyze",
            files=files
        )
        
        # Should fail without auth
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Unauthenticated analysis correctly rejected")


class TestAnalysisHistory:
    """Analysis history endpoint tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        return response.json()["token"]
    
    def test_get_analyses(self, auth_token):
        """Test GET /api/analyses endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/analyses",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200, f"Get analyses failed: {response.text}"
        data = response.json()
        
        assert "analyses" in data, "Analyses list not in response"
        assert "total" in data, "Total count not in response"
        
        print(f"✓ Analysis history retrieved: {data['total']} total analyses")
        
        # Verify structure of analyses if any exist
        if data["analyses"]:
            analysis = data["analyses"][0]
            assert "id" in analysis, "Analysis ID missing"
            assert "created_at" in analysis, "Created at missing"
            print(f"  Latest analysis ID: {analysis['id']}")
    
    def test_get_analyses_pagination(self, auth_token):
        """Test analyses endpoint with pagination"""
        response = requests.get(
            f"{BASE_URL}/api/analyses?skip=0&limit=5",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200, f"Pagination failed: {response.text}"
        data = response.json()
        assert len(data["analyses"]) <= 5, "Pagination limit not respected"
        print(f"✓ Pagination working: returned {len(data['analyses'])} analyses")
    
    def test_get_analyses_without_auth(self):
        """Test analyses endpoint without authentication"""
        response = requests.get(f"{BASE_URL}/api/analyses")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Unauthenticated history access correctly rejected")


class TestLiveGames:
    """Live games endpoint tests"""
    
    def test_get_live_games(self):
        """Test GET /api/live-games endpoint"""
        response = requests.get(f"{BASE_URL}/api/live-games")
        
        assert response.status_code == 200, f"Get live games failed: {response.text}"
        data = response.json()
        
        assert "games" in data, "Games list not in response"
        print(f"✓ Live games retrieved: {len(data.get('games', []))} games")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
