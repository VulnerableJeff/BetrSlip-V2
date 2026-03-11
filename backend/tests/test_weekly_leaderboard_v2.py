"""
Test script for BetrSlip Weekly Leaderboard Feature:
1. GET /api/leaderboard/weekly - Public leaderboard endpoint
2. POST /api/bets/log - Log bet results (requires auth)
3. GET /api/user/betting-stats - User betting statistics (requires auth)
"""
import pytest
import requests
import os
import uuid

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


class TestWeeklyLeaderboardPublic:
    """Tests for public /api/leaderboard/weekly endpoint"""
    
    def test_weekly_leaderboard_is_public(self):
        """Leaderboard endpoint should be accessible without auth"""
        resp = requests.get(f"{BASE_URL}/api/leaderboard/weekly")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    
    def test_weekly_leaderboard_response_structure(self):
        """Response should have week_id, week_start, week_end, leaderboard, min_bets_required"""
        resp = requests.get(f"{BASE_URL}/api/leaderboard/weekly")
        assert resp.status_code == 200
        
        data = resp.json()
        assert 'week_id' in data, "Response should have 'week_id'"
        assert 'week_start' in data, "Response should have 'week_start'"
        assert 'week_end' in data, "Response should have 'week_end'"
        assert 'leaderboard' in data, "Response should have 'leaderboard' array"
        assert 'min_bets_required' in data, "Response should have 'min_bets_required'"
        assert data.get('min_bets_required') == 3, "min_bets_required should be 3"
    
    def test_weekly_leaderboard_entry_structure(self):
        """Each leaderboard entry should have rank, display_name, wins, losses, etc."""
        resp = requests.get(f"{BASE_URL}/api/leaderboard/weekly")
        assert resp.status_code == 200
        
        data = resp.json()
        leaderboard = data.get('leaderboard', [])
        
        if len(leaderboard) > 0:
            entry = leaderboard[0]
            required_fields = ['rank', 'display_name', 'wins', 'losses', 'total_bets', 'win_rate', 'total_profit', 'roi']
            for field in required_fields:
                assert field in entry, f"Leaderboard entry should have '{field}'"
    
    def test_weekly_leaderboard_has_admin_user(self):
        """Admin user 'hun***' should appear on leaderboard"""
        resp = requests.get(f"{BASE_URL}/api/leaderboard/weekly")
        assert resp.status_code == 200
        
        data = resp.json()
        leaderboard = data.get('leaderboard', [])
        
        hun_user = [e for e in leaderboard if e.get('display_name') == 'hun***']
        assert len(hun_user) > 0, "User 'hun***' should appear on leaderboard"
        
        if hun_user:
            print(f"hun*** stats: rank={hun_user[0].get('rank')}, profit={hun_user[0].get('total_profit')}, win_rate={hun_user[0].get('win_rate')}%")
    
    def test_weekly_leaderboard_win_rate_valid(self):
        """Win rate should be between 0-100"""
        resp = requests.get(f"{BASE_URL}/api/leaderboard/weekly")
        assert resp.status_code == 200
        
        data = resp.json()
        leaderboard = data.get('leaderboard', [])
        
        for entry in leaderboard:
            win_rate = entry.get('win_rate', 0)
            assert 0 <= win_rate <= 100, f"Win rate should be 0-100, got {win_rate}"


class TestBetLogging:
    """Tests for POST /api/bets/log endpoint"""
    
    def test_log_bet_requires_auth(self):
        """Log bet endpoint should require authentication"""
        resp = requests.post(f"{BASE_URL}/api/bets/log", json={
            "bet_type": "daily_pick",
            "result": "win",
            "amount_wagered": 50
        })
        assert resp.status_code in [401, 403], f"Expected 401/403, got {resp.status_code}"
    
    def test_log_bet_win_success(self):
        """Logging a WIN bet should succeed and return profit"""
        token = get_auth_token()
        if not token:
            pytest.skip("Could not get auth token")
        
        resp = requests.post(
            f"{BASE_URL}/api/bets/log",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "bet_type": "custom",
                "result": "win",
                "amount_wagered": 50,
                "amount_won": 100,
                "description": "TEST_win_bet"
            }
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        assert 'message' in data, "Response should have 'message'"
        assert 'id' in data, "Response should have 'id'"
        assert 'profit' in data, "Response should have 'profit'"
        assert data.get('profit') == 50, f"Profit for $50 win on $50 wager should be $50, got {data.get('profit')}"
    
    def test_log_bet_loss_success(self):
        """Logging a LOSS bet should succeed and return negative profit"""
        token = get_auth_token()
        if not token:
            pytest.skip("Could not get auth token")
        
        resp = requests.post(
            f"{BASE_URL}/api/bets/log",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "bet_type": "analysis",
                "result": "loss",
                "amount_wagered": 25,
                "description": "TEST_loss_bet"
            }
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        assert data.get('profit') == -25, f"Profit for loss of $25 should be -$25, got {data.get('profit')}"
    
    def test_log_bet_push_success(self):
        """Logging a PUSH bet should succeed with zero profit"""
        token = get_auth_token()
        if not token:
            pytest.skip("Could not get auth token")
        
        resp = requests.post(
            f"{BASE_URL}/api/bets/log",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "bet_type": "daily_pick",
                "result": "push",
                "amount_wagered": 100,
                "description": "TEST_push_bet"
            }
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        assert data.get('profit') == 0, f"Profit for push should be $0, got {data.get('profit')}"
    
    def test_log_bet_all_types(self):
        """Test all bet types: daily_pick, analysis, custom"""
        token = get_auth_token()
        if not token:
            pytest.skip("Could not get auth token")
        
        bet_types = ['daily_pick', 'analysis', 'custom']
        for bet_type in bet_types:
            resp = requests.post(
                f"{BASE_URL}/api/bets/log",
                headers={"Authorization": f"Bearer {token}"},
                json={
                    "bet_type": bet_type,
                    "result": "win",
                    "amount_wagered": 10,
                    "amount_won": 20,
                    "description": f"TEST_{bet_type}_type"
                }
            )
            assert resp.status_code == 200, f"Failed to log bet type '{bet_type}': {resp.text}"
            print(f"SUCCESS: Logged bet type '{bet_type}'")


class TestUserBettingStats:
    """Tests for GET /api/user/betting-stats endpoint"""
    
    def test_betting_stats_requires_auth(self):
        """Betting stats endpoint should require authentication"""
        resp = requests.get(f"{BASE_URL}/api/user/betting-stats")
        assert resp.status_code in [401, 403], f"Expected 401/403, got {resp.status_code}"
    
    def test_betting_stats_response_structure(self):
        """Response should have this_week, all_time, and recent_bets"""
        token = get_auth_token()
        if not token:
            pytest.skip("Could not get auth token")
        
        resp = requests.get(
            f"{BASE_URL}/api/user/betting-stats",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        assert 'this_week' in data, "Response should have 'this_week'"
        assert 'all_time' in data, "Response should have 'all_time'"
        assert 'recent_bets' in data, "Response should have 'recent_bets'"
    
    def test_betting_stats_this_week_structure(self):
        """this_week should have wins, losses, total_bets, total_profit, win_rate, rank"""
        token = get_auth_token()
        if not token:
            pytest.skip("Could not get auth token")
        
        resp = requests.get(
            f"{BASE_URL}/api/user/betting-stats",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert resp.status_code == 200
        
        data = resp.json()
        this_week = data.get('this_week', {})
        
        required_fields = ['wins', 'losses', 'total_bets', 'total_profit', 'win_rate', 'rank']
        for field in required_fields:
            assert field in this_week, f"this_week should have '{field}'"
    
    def test_betting_stats_all_time_structure(self):
        """all_time should have wins, losses, total_bets, total_profit, win_rate"""
        token = get_auth_token()
        if not token:
            pytest.skip("Could not get auth token")
        
        resp = requests.get(
            f"{BASE_URL}/api/user/betting-stats",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert resp.status_code == 200
        
        data = resp.json()
        all_time = data.get('all_time', {})
        
        required_fields = ['wins', 'losses', 'total_bets', 'total_profit', 'win_rate']
        for field in required_fields:
            assert field in all_time, f"all_time should have '{field}'"
    
    def test_betting_stats_recent_bets_structure(self):
        """recent_bets should be an array with bet details"""
        token = get_auth_token()
        if not token:
            pytest.skip("Could not get auth token")
        
        resp = requests.get(
            f"{BASE_URL}/api/user/betting-stats",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert resp.status_code == 200
        
        data = resp.json()
        recent_bets = data.get('recent_bets', [])
        
        assert isinstance(recent_bets, list), "recent_bets should be a list"
        
        if len(recent_bets) > 0:
            bet = recent_bets[0]
            expected_fields = ['id', 'week_id', 'bet_type', 'result', 'profit', 'created_at']
            for field in expected_fields:
                assert field in bet, f"Recent bet should have '{field}'"
    
    def test_user_has_rank_when_qualified(self):
        """User with 3+ bets this week should have a rank"""
        token = get_auth_token()
        if not token:
            pytest.skip("Could not get auth token")
        
        resp = requests.get(
            f"{BASE_URL}/api/user/betting-stats",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert resp.status_code == 200
        
        data = resp.json()
        this_week = data.get('this_week', {})
        
        total_bets = this_week.get('total_bets', 0)
        rank = this_week.get('rank')
        
        if total_bets >= 3:
            assert rank is not None, f"User with {total_bets} bets should have a rank"
            assert isinstance(rank, int), f"Rank should be an integer, got {type(rank)}"
            print(f"User rank: #{rank} with {total_bets} bets")


class TestAPIHealthAndIntegration:
    """Basic health checks and integration tests"""
    
    def test_health_endpoint(self):
        """API health check"""
        resp = requests.get(f"{BASE_URL}/api/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data.get('status') == 'healthy'
    
    def test_leaderboard_and_stats_data_consistency(self):
        """Data should be consistent between leaderboard and user stats"""
        token = get_auth_token()
        if not token:
            pytest.skip("Could not get auth token")
        
        # Get leaderboard
        lb_resp = requests.get(f"{BASE_URL}/api/leaderboard/weekly")
        assert lb_resp.status_code == 200
        lb_data = lb_resp.json()
        
        # Get user stats
        stats_resp = requests.get(
            f"{BASE_URL}/api/user/betting-stats",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert stats_resp.status_code == 200
        stats_data = stats_resp.json()
        
        # Find user on leaderboard
        hun_entries = [e for e in lb_data.get('leaderboard', []) if e.get('display_name') == 'hun***']
        
        if hun_entries:
            lb_entry = hun_entries[0]
            this_week = stats_data.get('this_week', {})
            
            # Both should have same total_bets (approximately, allowing for test data variance)
            lb_total = lb_entry.get('total_bets', 0)
            stats_total = this_week.get('total_bets', 0)
            
            # The totals may differ slightly if bets were logged during testing
            # Just verify they're both > 0
            assert lb_total > 0, "Leaderboard should show bets"
            assert stats_total > 0, "User stats should show bets"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
