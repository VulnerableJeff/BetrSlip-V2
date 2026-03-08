"""
Test new features for iteration 15:
- Public Results page (/api/picks-performance - public, no auth)
- Win Streak Banner (via /api/picks-performance)
- Free Trial Extension (/api/usage/extend)
- View All Results link (frontend only)
- FreeTrialExtension component for free users
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPublicResults:
    """Test /api/picks-performance - PUBLIC endpoint for Results page"""
    
    def test_picks_performance_no_auth_required(self):
        """GET /api/picks-performance should work without authentication"""
        response = requests.get(f"{BASE_URL}/api/picks-performance")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("PASSED: /api/picks-performance accessible without auth")
    
    def test_picks_performance_returns_win_stats(self):
        """GET /api/picks-performance returns wins, losses, win_rate"""
        response = requests.get(f"{BASE_URL}/api/picks-performance")
        assert response.status_code == 200
        
        data = response.json()
        assert "won" in data, "Response missing 'won' field"
        assert "lost" in data, "Response missing 'lost' field"
        assert "win_rate" in data, "Response missing 'win_rate' field"
        
        print(f"PASSED: picks-performance returns stats - won={data['won']}, lost={data['lost']}, win_rate={data['win_rate']}%")
    
    def test_picks_performance_returns_streak_info(self):
        """GET /api/picks-performance returns current_streak and streak_type"""
        response = requests.get(f"{BASE_URL}/api/picks-performance")
        assert response.status_code == 200
        
        data = response.json()
        assert "current_streak" in data, "Response missing 'current_streak' field"
        assert "streak_type" in data, "Response missing 'streak_type' field"
        
        print(f"PASSED: picks-performance returns streak info - streak={data['current_streak']}, type={data['streak_type']}")
    
    def test_picks_performance_returns_recent_picks(self):
        """GET /api/picks-performance returns recent_picks array"""
        response = requests.get(f"{BASE_URL}/api/picks-performance")
        assert response.status_code == 200
        
        data = response.json()
        assert "recent_picks" in data, "Response missing 'recent_picks' field"
        assert isinstance(data['recent_picks'], list), "'recent_picks' should be a list"
        
        print(f"PASSED: picks-performance returns recent_picks - count={len(data['recent_picks'])}")
        
        # If there are recent picks, verify they have expected fields
        if data['recent_picks']:
            pick = data['recent_picks'][0]
            assert "outcome" in pick, "Pick missing 'outcome' field"
            # Check for title/pick_title field
            assert "title" in pick or "pick_title" in pick, "Pick missing title field"
            print(f"  Sample pick: {pick.get('title', pick.get('pick_title', 'N/A'))} - {pick.get('outcome')}")


class TestFreeTrialExtension:
    """Test /api/usage/extend - requires authentication"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get auth headers for admin user"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "hundojeff@icloud.com",
            "password": "Boo-boo600$"
        })
        if login_response.status_code != 200:
            pytest.skip(f"Login failed: {login_response.status_code}")
        
        token = login_response.json().get("token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_extend_requires_auth(self):
        """POST /api/usage/extend should require authentication"""
        response = requests.post(f"{BASE_URL}/api/usage/extend", json={"reason": "share"})
        # Should get 401 or 403 without auth
        assert response.status_code in [401, 403, 422], f"Expected auth error, got {response.status_code}"
        print("PASSED: /api/usage/extend requires authentication")
    
    def test_extend_returns_400_if_already_used(self, auth_headers):
        """POST /api/usage/extend returns 400 if already used"""
        # First call - might work or might already be used
        response1 = requests.post(
            f"{BASE_URL}/api/usage/extend",
            json={"reason": "share"},
            headers=auth_headers
        )
        
        # Second call should definitely return 400 if first succeeded
        response2 = requests.post(
            f"{BASE_URL}/api/usage/extend", 
            json={"reason": "share"},
            headers=auth_headers
        )
        
        # Either first call already failed (400) or second call should fail (400)
        assert response1.status_code == 400 or response2.status_code == 400, \
            f"Expected 400 on duplicate use, got {response1.status_code} then {response2.status_code}"
        
        print("PASSED: /api/usage/extend returns 400 when already used")


class TestHealthEndpoints:
    """Verify basic API health"""
    
    def test_health_endpoint(self):
        """GET /health returns 200"""
        response = requests.get(f"{BASE_URL}/health")
        assert response.status_code == 200
        print("PASSED: /health endpoint working")
    
    def test_api_health_endpoint(self):
        """GET /api/health returns 200"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print("PASSED: /api/health endpoint working")


class TestAuthFlow:
    """Test login flow"""
    
    def test_login_with_valid_credentials(self):
        """POST /api/auth/login with valid admin credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "hundojeff@icloud.com",
            "password": "Boo-boo600$"
        })
        assert response.status_code == 200, f"Login failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert "token" in data, "Response missing 'token' field"
        print("PASSED: Login returns token for admin user")


class TestPublicStatsEndpoint:
    """Test /api/public-stats for landing page"""
    
    def test_public_stats_no_auth(self):
        """GET /api/public-stats should work without auth"""
        response = requests.get(f"{BASE_URL}/api/public-stats")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "total_users" in data, "Missing total_users"
        assert "total_analyses" in data, "Missing total_analyses"
        print(f"PASSED: public-stats returns data - users={data['total_users']}, analyses={data['total_analyses']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
