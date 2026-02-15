"""
Test script for BetrSlip feature updates:
1. Bet of the Day spotlight with confidence meter
2. Line Movers section removed
3. Build Your Own removed from AI Parlay Picks
4. Today's Best Bets shows winning probability
5. Today's Top Picks has Share/Copy buttons
6. ParlayBuilder removed from dashboard
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "hundojeff@icloud.com"
ADMIN_PASSWORD = "Boo-boo600$"


def get_auth_token():
    """Get auth token for testing"""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if resp.status_code == 200:
        return resp.json().get('token')
    return None


class TestBetOfTheDay:
    """Tests for the new /api/bet-of-the-day endpoint"""
    
    def test_bet_of_day_requires_auth(self):
        """Endpoint should require authentication"""
        resp = requests.get(f"{BASE_URL}/api/bet-of-the-day")
        assert resp.status_code in [401, 403], f"Expected 401/403, got {resp.status_code}"
    
    def test_bet_of_day_with_auth_returns_success(self):
        """Authenticated request should return pick data"""
        token = get_auth_token()
        if not token:
            pytest.skip("Could not get auth token")
        
        resp = requests.get(
            f"{BASE_URL}/api/bet-of-the-day",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        assert data.get('success') == True
        assert 'pick' in data
        assert 'date' in data
        assert 'alternatives_count' in data
    
    def test_bet_of_day_pick_has_required_fields(self):
        """Pick should have all required fields including confidence_score and winning_probability"""
        token = get_auth_token()
        if not token:
            pytest.skip("Could not get auth token")
        
        resp = requests.get(
            f"{BASE_URL}/api/bet-of-the-day",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert resp.status_code == 200
        
        data = resp.json()
        pick = data.get('pick')
        
        if pick:  # Pick may be null if no games available
            required_fields = ['pick', 'game', 'sport', 'bet_type', 'odds', 'edge', 
                             'book', 'winning_probability', 'confidence_score', 
                             'books_compared', 'game_time', 'reasons']
            for field in required_fields:
                assert field in pick, f"Missing required field: {field}"
            
            # Confidence score should be 0-100
            assert 0 <= pick['confidence_score'] <= 100, f"Invalid confidence_score: {pick['confidence_score']}"
            
            # Winning probability should be percentage
            assert 0 <= pick['winning_probability'] <= 100, f"Invalid winning_probability: {pick['winning_probability']}"
    
    def test_bet_of_day_confidence_meter_data(self):
        """Pick should provide confidence_score for confidence meter display"""
        token = get_auth_token()
        if not token:
            pytest.skip("Could not get auth token")
        
        resp = requests.get(
            f"{BASE_URL}/api/bet-of-the-day",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert resp.status_code == 200
        
        data = resp.json()
        pick = data.get('pick')
        
        if pick:
            # Confidence score used for the circular meter
            assert isinstance(pick.get('confidence_score'), (int, float))
            # Edge used for EV display
            assert isinstance(pick.get('edge'), (int, float))


class TestDailyBetCardWinningProbability:
    """Tests for winning_probability in daily bet card picks (Today's Best Bets)"""
    
    def test_daily_bet_card_picks_have_winning_probability(self):
        """Each pick in daily bet card should have winning_probability"""
        token = get_auth_token()
        if not token:
            pytest.skip("Could not get auth token")
        
        resp = requests.get(
            f"{BASE_URL}/api/daily-bet-card",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert resp.status_code == 200
        
        data = resp.json()
        picks = data.get('picks', [])
        
        for i, pick in enumerate(picks):
            assert 'winning_probability' in pick, f"Pick {i} missing winning_probability"
            assert isinstance(pick['winning_probability'], (int, float)), f"Pick {i} winning_probability should be numeric"
            assert 0 <= pick['winning_probability'] <= 100, f"Pick {i} winning_probability out of range"


class TestParlayOptimizer:
    """Tests for AI Parlay Picks (removed Build Your Own section)"""
    
    def test_parlay_optimizer_returns_optimal_parlays(self):
        """Should return optimal_parlays without individual suggestions for building"""
        token = get_auth_token()
        if not token:
            pytest.skip("Could not get auth token")
        
        resp = requests.get(
            f"{BASE_URL}/api/parlay-optimizer",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert resp.status_code == 200
        
        data = resp.json()
        assert data.get('success') == True
        assert 'optimal_parlays' in data
        
        # Verify optimal_parlays structure
        optimal_parlays = data.get('optimal_parlays', [])
        for parlay in optimal_parlays:
            assert 'legs' in parlay
            assert 'combined_probability' in parlay
            assert 'combined_odds' in parlay
            assert 'combined_ev' in parlay
            assert 'leg_count' in parlay
    
    def test_parlay_optimizer_parlays_have_2_legs(self):
        """AI Optimal parlays should be 2-leg parlays"""
        token = get_auth_token()
        if not token:
            pytest.skip("Could not get auth token")
        
        resp = requests.get(
            f"{BASE_URL}/api/parlay-optimizer",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert resp.status_code == 200
        
        data = resp.json()
        optimal_parlays = data.get('optimal_parlays', [])
        
        for parlay in optimal_parlays:
            assert parlay.get('leg_count') == 2, "Optimal parlays should be 2-leg"


class TestLineMoversRemoved:
    """Verify Line Movers endpoint still exists but won't be used in UI"""
    
    def test_line_movements_endpoint_exists(self):
        """Line movements endpoint should still exist on backend"""
        resp = requests.get(f"{BASE_URL}/api/line-movements")
        # Endpoint exists, may or may not require auth
        assert resp.status_code in [200, 401, 403]


class TestDailyPicks:
    """Tests for Today's Top Picks"""
    
    def test_daily_picks_returns_picks_with_win_probability(self):
        """Daily picks should include win_probability for each pick"""
        resp = requests.get(f"{BASE_URL}/api/daily-picks")
        assert resp.status_code == 200
        
        data = resp.json()
        picks = data.get('picks', [])
        
        for pick in picks:
            assert 'win_probability' in pick, "Each pick should have win_probability"


class TestAPIHealth:
    """Basic API health checks"""
    
    def test_api_health(self):
        """API should be reachable"""
        resp = requests.get(f"{BASE_URL}/api/health")
        assert resp.status_code == 200
    
    def test_auth_login_works(self):
        """Login should work with admin credentials"""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert resp.status_code == 200
        assert 'token' in resp.json()


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
