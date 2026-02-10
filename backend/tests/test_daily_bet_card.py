"""
Test suite for Daily Bet Card feature
Tests:
- Auth requirements (401/403 without auth)
- Pro gate (pro_required=true for free users)
- Pro user access (success=true with picks array)
- Pick data validation (game, sport, odds, edge, book, confidence, game_time)
- Picks sorted by edge descending
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
PRO_USER_EMAIL = "testuser@test.com"
PRO_USER_PASSWORD = "Test1234!"
FREE_USER_EMAIL = f"free_test_dailybet_{os.urandom(4).hex()}@test.com"
FREE_USER_PASSWORD = "FreeTest123!"


class TestDailyBetCardAuth:
    """Tests for Daily Bet Card authentication requirements"""
    
    def test_daily_bet_card_no_auth_returns_403(self):
        """GET /api/daily-bet-card without auth should return 401/403"""
        response = requests.get(f"{BASE_URL}/api/daily-bet-card")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ No auth returns {response.status_code} as expected")
    
    def test_daily_bet_card_invalid_token_returns_401(self):
        """GET /api/daily-bet-card with invalid token should return 401"""
        response = requests.get(
            f"{BASE_URL}/api/daily-bet-card",
            headers={"Authorization": "Bearer invalid_token_123"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✓ Invalid token returns 401 as expected")


class TestDailyBetCardProGate:
    """Tests for Pro subscription gate"""
    
    @pytest.fixture(scope="class")
    def free_user_token(self):
        """Create a new free user and get token"""
        signup_response = requests.post(
            f"{BASE_URL}/api/auth/signup",
            json={"email": FREE_USER_EMAIL, "password": FREE_USER_PASSWORD}
        )
        if signup_response.status_code == 200:
            return signup_response.json().get('token')
        # User might already exist, try login
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": FREE_USER_EMAIL, "password": FREE_USER_PASSWORD}
        )
        if login_response.status_code == 200:
            return login_response.json().get('token')
        pytest.skip("Could not create/login free user")
    
    def test_free_user_sees_pro_required(self, free_user_token):
        """Free user should see pro_required=true"""
        response = requests.get(
            f"{BASE_URL}/api/daily-bet-card",
            headers={"Authorization": f"Bearer {free_user_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get('success') == False, "Expected success=false for free user"
        assert data.get('pro_required') == True, "Expected pro_required=true for free user"
        assert data.get('message') == "Daily Bet Card is a Pro feature", f"Unexpected message: {data.get('message')}"
        assert data.get('picks') == [], "Expected empty picks array for free user"
        print(f"✓ Free user correctly sees pro_required=true")


class TestDailyBetCardProAccess:
    """Tests for Pro user access to Daily Bet Card"""
    
    @pytest.fixture(scope="class")
    def pro_user_token(self):
        """Get token for pro user"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": PRO_USER_EMAIL, "password": PRO_USER_PASSWORD}
        )
        if response.status_code != 200:
            pytest.skip(f"Pro user login failed: {response.status_code}")
        return response.json().get('token')
    
    def test_pro_user_gets_success_true(self, pro_user_token):
        """Pro user should get success=true"""
        response = requests.get(
            f"{BASE_URL}/api/daily-bet-card",
            headers={"Authorization": f"Bearer {pro_user_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get('success') == True, f"Expected success=true for pro user, got {data.get('success')}"
        assert data.get('pro_required') == False, f"Expected pro_required=false, got {data.get('pro_required')}"
        print(f"✓ Pro user gets success=true")
    
    def test_pro_user_gets_picks_array(self, pro_user_token):
        """Pro user should get picks array with up to 3 picks"""
        response = requests.get(
            f"{BASE_URL}/api/daily-bet-card",
            headers={"Authorization": f"Bearer {pro_user_token}"}
        )
        data = response.json()
        
        picks = data.get('picks', [])
        assert isinstance(picks, list), "picks should be a list"
        # May have 0-3 picks depending on current odds
        assert len(picks) <= 3, f"Expected max 3 picks, got {len(picks)}"
        print(f"✓ Pro user gets {len(picks)} picks")
    
    def test_pro_user_gets_metadata_fields(self, pro_user_token):
        """Pro user response should include date, total_scanned, generated_at"""
        response = requests.get(
            f"{BASE_URL}/api/daily-bet-card",
            headers={"Authorization": f"Bearer {pro_user_token}"}
        )
        data = response.json()
        
        assert 'date' in data, "Response should include 'date' field"
        assert 'total_scanned' in data, "Response should include 'total_scanned' field"
        assert 'generated_at' in data, "Response should include 'generated_at' field"
        print(f"✓ Metadata fields present: date={data.get('date')}, total_scanned={data.get('total_scanned')}")


class TestDailyBetCardPickData:
    """Tests for pick data structure and validation"""
    
    @pytest.fixture(scope="class")
    def pro_user_token(self):
        """Get token for pro user"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": PRO_USER_EMAIL, "password": PRO_USER_PASSWORD}
        )
        if response.status_code != 200:
            pytest.skip(f"Pro user login failed: {response.status_code}")
        return response.json().get('token')
    
    @pytest.fixture(scope="class")
    def bet_card_data(self, pro_user_token):
        """Fetch daily bet card data once for class"""
        response = requests.get(
            f"{BASE_URL}/api/daily-bet-card",
            headers={"Authorization": f"Bearer {pro_user_token}"}
        )
        return response.json()
    
    def test_pick_has_required_fields(self, bet_card_data):
        """Each pick should have all required fields"""
        required_fields = ['pick', 'game', 'sport', 'odds', 'edge', 'book', 'confidence', 'game_time']
        picks = bet_card_data.get('picks', [])
        
        if not picks:
            pytest.skip("No picks available to test structure")
        
        for i, pick in enumerate(picks):
            for field in required_fields:
                assert field in pick, f"Pick {i} missing required field: {field}"
            print(f"✓ Pick {i}: {pick.get('pick')} has all required fields")
    
    def test_pick_sport_is_valid(self, bet_card_data):
        """Pick sport should be valid NBA/NHL/NCAAB"""
        valid_sports = ['NBA', 'NHL', 'NCAAB']
        picks = bet_card_data.get('picks', [])
        
        if not picks:
            pytest.skip("No picks available to test sport")
        
        for pick in picks:
            assert pick.get('sport') in valid_sports, f"Invalid sport: {pick.get('sport')}"
        print(f"✓ All picks have valid sports: {[p.get('sport') for p in picks]}")
    
    def test_pick_edge_is_positive(self, bet_card_data):
        """Pick edge should be positive (these are +EV picks)"""
        picks = bet_card_data.get('picks', [])
        
        if not picks:
            pytest.skip("No picks available to test edge")
        
        for pick in picks:
            edge = pick.get('edge', 0)
            assert edge > 0, f"Expected positive edge, got {edge}"
        print(f"✓ All picks have positive edge: {[p.get('edge') for p in picks]}")
    
    def test_pick_confidence_is_valid(self, bet_card_data):
        """Pick confidence should be high/medium/low"""
        valid_confidence = ['high', 'medium', 'low']
        picks = bet_card_data.get('picks', [])
        
        if not picks:
            pytest.skip("No picks available to test confidence")
        
        for pick in picks:
            assert pick.get('confidence') in valid_confidence, f"Invalid confidence: {pick.get('confidence')}"
        print(f"✓ All picks have valid confidence: {[p.get('confidence') for p in picks]}")


class TestDailyBetCardSorting:
    """Tests for pick sorting by edge"""
    
    @pytest.fixture(scope="class")
    def pro_user_token(self):
        """Get token for pro user"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": PRO_USER_EMAIL, "password": PRO_USER_PASSWORD}
        )
        if response.status_code != 200:
            pytest.skip(f"Pro user login failed: {response.status_code}")
        return response.json().get('token')
    
    def test_picks_sorted_by_edge_descending(self, pro_user_token):
        """Picks should be sorted by edge in descending order (highest first)"""
        response = requests.get(
            f"{BASE_URL}/api/daily-bet-card",
            headers={"Authorization": f"Bearer {pro_user_token}"}
        )
        data = response.json()
        picks = data.get('picks', [])
        
        if len(picks) < 2:
            pytest.skip("Need at least 2 picks to test sorting")
        
        edges = [pick.get('edge', 0) for pick in picks]
        assert edges == sorted(edges, reverse=True), f"Picks not sorted by edge descending: {edges}"
        print(f"✓ Picks correctly sorted by edge (descending): {edges}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
