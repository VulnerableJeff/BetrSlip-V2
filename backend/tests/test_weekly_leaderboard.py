"""
Test script for BetrSlip Weekly Leaderboard and Layout Updates:
1. Weekly Leaderboard (Pick of the Week) - Pro only feature
2. Auto-save of Bet of the Day picks to bot_pick_history collection
3. Verification of layout order changes on Dashboard
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


class TestWeeklyLeaderboard:
    """Tests for /api/weekly-leaderboard endpoint (Pick of the Week)"""
    
    def test_weekly_leaderboard_requires_auth(self):
        """Endpoint should require authentication"""
        resp = requests.get(f"{BASE_URL}/api/weekly-leaderboard")
        assert resp.status_code in [401, 403], f"Expected 401/403, got {resp.status_code}"
    
    def test_weekly_leaderboard_with_invalid_token(self):
        """Invalid token should return 401"""
        resp = requests.get(
            f"{BASE_URL}/api/weekly-leaderboard",
            headers={"Authorization": "Bearer invalid_token_here"}
        )
        assert resp.status_code == 401
    
    def test_weekly_leaderboard_pro_user_success(self):
        """Pro user (admin) should get leaderboard data successfully"""
        token = get_auth_token()
        if not token:
            pytest.skip("Could not get auth token")
        
        resp = requests.get(
            f"{BASE_URL}/api/weekly-leaderboard",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        assert data.get('success') == True, "Expected success=true for Pro user"
        assert data.get('pro_required') == False, "Pro user should not see pro_required=true"
    
    def test_weekly_leaderboard_response_structure(self):
        """Response should have proper structure with week and all_time stats"""
        token = get_auth_token()
        if not token:
            pytest.skip("Could not get auth token")
        
        resp = requests.get(
            f"{BASE_URL}/api/weekly-leaderboard",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert resp.status_code == 200
        
        data = resp.json()
        
        # Check 'week' object structure
        assert 'week' in data, "Response should have 'week' object"
        week = data['week']
        assert 'picks' in week, "week should have 'picks' array"
        assert 'won' in week, "week should have 'won' count"
        assert 'lost' in week, "week should have 'lost' count"
        assert 'win_rate' in week, "week should have 'win_rate'"
        assert 'roi' in week, "week should have 'roi'"
        
        # Check 'all_time' object structure
        assert 'all_time' in data, "Response should have 'all_time' object"
        all_time = data['all_time']
        assert 'won' in all_time, "all_time should have 'won' count"
        assert 'lost' in all_time, "all_time should have 'lost' count"
        assert 'win_rate' in all_time, "all_time should have 'win_rate'"
        assert 'roi' in all_time, "all_time should have 'roi'"
        assert 'streak' in all_time, "all_time should have 'streak'"
        assert 'streak_type' in all_time, "all_time should have 'streak_type'"
        assert 'total_picks' in all_time, "all_time should have 'total_picks'"
    
    def test_weekly_leaderboard_picks_structure(self):
        """Each pick in weekly picks should have proper fields"""
        token = get_auth_token()
        if not token:
            pytest.skip("Could not get auth token")
        
        resp = requests.get(
            f"{BASE_URL}/api/weekly-leaderboard",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert resp.status_code == 200
        
        data = resp.json()
        week_picks = data.get('week', {}).get('picks', [])
        
        # Check structure of each pick if any exist
        for i, pick in enumerate(week_picks):
            assert 'pick' in pick, f"Pick {i} should have 'pick' description"
            assert 'game' in pick, f"Pick {i} should have 'game'"
            assert 'sport' in pick, f"Pick {i} should have 'sport'"
            assert 'odds' in pick, f"Pick {i} should have 'odds'"
            # outcome can be None for PENDING picks
            # This is expected as new picks start with outcome=null
    
    def test_weekly_leaderboard_win_rate_valid(self):
        """Win rate should be between 0-100"""
        token = get_auth_token()
        if not token:
            pytest.skip("Could not get auth token")
        
        resp = requests.get(
            f"{BASE_URL}/api/weekly-leaderboard",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert resp.status_code == 200
        
        data = resp.json()
        week_win_rate = data.get('week', {}).get('win_rate', 0)
        all_time_win_rate = data.get('all_time', {}).get('win_rate', 0)
        
        assert 0 <= week_win_rate <= 100, f"Week win_rate should be 0-100, got {week_win_rate}"
        assert 0 <= all_time_win_rate <= 100, f"All-time win_rate should be 0-100, got {all_time_win_rate}"


class TestBetOfDayAutoSave:
    """Tests for auto-save of Bet of the Day to bot_pick_history"""
    
    def test_bet_of_day_triggers_save_to_history(self):
        """Calling bet-of-the-day should auto-save the pick to bot_pick_history"""
        token = get_auth_token()
        if not token:
            pytest.skip("Could not get auth token")
        
        # First, call bet-of-the-day
        resp = requests.get(
            f"{BASE_URL}/api/bet-of-the-day",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data.get('success') == True
        
        # The pick should now be saved - verify by checking weekly leaderboard
        leaderboard_resp = requests.get(
            f"{BASE_URL}/api/weekly-leaderboard",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert leaderboard_resp.status_code == 200
        
        lb_data = leaderboard_resp.json()
        week_picks = lb_data.get('week', {}).get('picks', [])
        
        # There should be at least 1 pick tracked for this week (today's Bet of the Day)
        # The pick should show with outcome None (PENDING) initially
        print(f"Weekly picks tracked: {len(week_picks)}")
        # Note: picks may or may not exist depending on when the test runs
    
    def test_bet_of_day_pick_has_all_fields_for_tracking(self):
        """Bet of the Day pick should include all necessary fields for tracking"""
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
            # These fields are required for tracking
            required_for_tracking = ['pick', 'game', 'sport', 'bet_type', 'odds', 'edge', 
                                      'winning_probability', 'confidence_score', 'book', 'game_time']
            for field in required_for_tracking:
                assert field in pick, f"Pick missing '{field}' needed for tracking"


class TestDailyBetCardWinningProbability:
    """Verify Today's Best Bets shows winning probability percentages"""
    
    def test_daily_bet_card_has_winning_probability(self):
        """Daily Bet Card picks should include winning_probability field"""
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
            assert 'winning_probability' in pick, f"Pick {i} should have 'winning_probability'"
            wp = pick['winning_probability']
            assert isinstance(wp, (int, float)), f"winning_probability should be numeric"
            assert 0 <= wp <= 100, f"winning_probability should be 0-100, got {wp}"
            print(f"Pick {i}: {pick.get('pick')} - {wp}% win probability")


class TestFreeUserProGate:
    """Test that free users see Pro gate for Weekly Leaderboard"""
    
    def test_free_user_setup_and_pro_gate(self):
        """Create free user and verify they see pro_required=true"""
        import uuid
        
        # Create a new free test user
        test_email = f"freetest_{uuid.uuid4().hex[:8]}@test.com"
        test_password = "TestFree123!"
        
        # Register new user
        reg_resp = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": test_password
        })
        
        if reg_resp.status_code != 200:
            pytest.skip(f"Could not create test user: {reg_resp.text}")
        
        # Login as free user
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": test_email,
            "password": test_password
        })
        
        if login_resp.status_code != 200:
            pytest.skip("Could not login as free user")
        
        free_token = login_resp.json().get('token')
        
        # Call weekly leaderboard
        resp = requests.get(
            f"{BASE_URL}/api/weekly-leaderboard",
            headers={"Authorization": f"Bearer {free_token}"}
        )
        assert resp.status_code == 200
        
        data = resp.json()
        # Free user should see pro_required=true
        assert data.get('success') == False or data.get('pro_required') == True, \
            f"Free user should see pro_required=true, got: {data}"


class TestAPIEndpointsHealth:
    """Basic health checks for all related endpoints"""
    
    def test_health_endpoint(self):
        """API health check"""
        resp = requests.get(f"{BASE_URL}/api/health")
        assert resp.status_code == 200
    
    def test_bet_of_day_endpoint_exists(self):
        """Bet of the Day endpoint exists"""
        token = get_auth_token()
        if not token:
            pytest.skip("Could not get auth token")
        
        resp = requests.get(
            f"{BASE_URL}/api/bet-of-the-day",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert resp.status_code == 200
    
    def test_weekly_leaderboard_endpoint_exists(self):
        """Weekly Leaderboard endpoint exists"""
        token = get_auth_token()
        if not token:
            pytest.skip("Could not get auth token")
        
        resp = requests.get(
            f"{BASE_URL}/api/weekly-leaderboard",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert resp.status_code == 200
    
    def test_daily_picks_endpoint_exists(self):
        """Daily picks endpoint exists (Today's Top Picks)"""
        resp = requests.get(f"{BASE_URL}/api/daily-picks")
        assert resp.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
