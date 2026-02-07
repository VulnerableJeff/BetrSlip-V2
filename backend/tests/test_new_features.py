"""
BetrSlip New Features API Tests
Tests for: Admin Analytics Dashboard, Referral Program, Push Notifications, Best Value Finder
"""
import pytest
import requests
import os

# Get BASE_URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    raise ValueError("REACT_APP_BACKEND_URL environment variable not set")

# Admin credentials
ADMIN_EMAIL = "hundojeff@icloud.com"
ADMIN_PASSWORD = "Boo-boo600"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    return response.json()["token"]


# ===== ADMIN ANALYTICS DASHBOARD TESTS =====
class TestAdminAnalytics:
    """Admin Analytics Dashboard endpoints - requires admin auth"""

    def test_admin_analytics_overview(self, admin_token):
        """Test GET /api/admin/analytics/overview"""
        response = requests.get(
            f"{BASE_URL}/api/admin/analytics/overview",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Admin analytics overview failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "users" in data, "users field missing"
        assert "subscriptions" in data, "subscriptions field missing"
        assert "revenue" in data, "revenue field missing"
        assert "analyses" in data, "analyses field missing"
        assert "ai_performance" in data, "ai_performance field missing"
        
        # Verify users data structure
        assert "total" in data["users"], "users.total missing"
        assert "today" in data["users"], "users.today missing"
        assert "this_week" in data["users"], "users.this_week missing"
        assert "this_month" in data["users"], "users.this_month missing"
        
        # Verify subscriptions data structure
        assert "active" in data["subscriptions"], "subscriptions.active missing"
        assert "conversion_rate" in data["subscriptions"], "subscriptions.conversion_rate missing"
        
        print(f"✓ Admin analytics overview retrieved:")
        print(f"  Total users: {data['users']['total']}")
        print(f"  Active subscriptions: {data['subscriptions']['active']}")
        print(f"  MRR: ${data['revenue']['mrr']}")
        print(f"  AI Accuracy: {data['ai_performance']['accuracy']}%")

    def test_admin_analytics_user_growth(self, admin_token):
        """Test GET /api/admin/analytics/user-growth"""
        response = requests.get(
            f"{BASE_URL}/api/admin/analytics/user-growth?days=30",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"User growth failed: {response.text}"
        data = response.json()
        
        assert "data" in data, "data field missing"
        assert isinstance(data["data"], list), "data should be a list"
        
        # Verify data structure if not empty
        if data["data"]:
            day = data["data"][0]
            assert "date" in day, "date field missing"
            assert "users" in day, "users field missing"
        
        print(f"✓ User growth data retrieved: {len(data['data'])} days")

    def test_admin_analytics_top_users(self, admin_token):
        """Test GET /api/admin/analytics/top-users"""
        response = requests.get(
            f"{BASE_URL}/api/admin/analytics/top-users?limit=10",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Top users failed: {response.text}"
        data = response.json()
        
        assert "users" in data, "users field missing"
        assert isinstance(data["users"], list), "users should be a list"
        
        # Verify user structure if not empty
        if data["users"]:
            user = data["users"][0]
            assert "user_id" in user, "user_id missing"
            assert "email" in user, "email missing"
            assert "analyses_count" in user, "analyses_count missing"
        
        print(f"✓ Top users retrieved: {len(data['users'])} users")

    def test_admin_analytics_funnel(self, admin_token):
        """Test GET /api/admin/analytics/funnel"""
        response = requests.get(
            f"{BASE_URL}/api/admin/analytics/funnel",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Funnel failed: {response.text}"
        data = response.json()
        
        assert "funnel" in data, "funnel field missing"
        assert isinstance(data["funnel"], list), "funnel should be a list"
        
        # Verify funnel stages
        stages = [f["stage"] for f in data["funnel"]]
        assert "Registered" in stages, "Registered stage missing"
        
        for stage in data["funnel"]:
            assert "stage" in stage, "stage field missing"
            assert "count" in stage, "count field missing"
            assert "percentage" in stage, "percentage field missing"
        
        print(f"✓ Conversion funnel retrieved: {len(data['funnel'])} stages")
        for stage in data["funnel"]:
            print(f"  {stage['stage']}: {stage['count']} ({stage['percentage']}%)")

    def test_admin_analytics_sport_breakdown(self, admin_token):
        """Test GET /api/admin/analytics/sport-breakdown"""
        response = requests.get(
            f"{BASE_URL}/api/admin/analytics/sport-breakdown",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Sport breakdown failed: {response.text}"
        data = response.json()
        
        assert "breakdown" in data, "breakdown field missing"
        assert isinstance(data["breakdown"], list), "breakdown should be a list"
        
        # Verify structure if not empty
        if data["breakdown"]:
            sport = data["breakdown"][0]
            assert "sport" in sport, "sport field missing"
            assert "count" in sport, "count field missing"
        
        print(f"✓ Sport breakdown retrieved: {len(data['breakdown'])} sports")

    def test_admin_analytics_picks_performance(self, admin_token):
        """Test GET /api/admin/analytics/picks-performance"""
        response = requests.get(
            f"{BASE_URL}/api/admin/analytics/picks-performance",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Picks performance failed: {response.text}"
        data = response.json()
        
        assert "by_sport" in data, "by_sport field missing"
        assert "by_confidence" in data, "by_confidence field missing"
        
        print(f"✓ Picks performance retrieved")
        print(f"  Sports: {len(data['by_sport'])}")
        print(f"  Confidence levels: {len(data['by_confidence'])}")

    def test_admin_analytics_unauthorized(self):
        """Test admin analytics without auth should fail"""
        response = requests.get(f"{BASE_URL}/api/admin/analytics/overview")
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Unauthorized access correctly rejected")


# ===== REFERRAL PROGRAM TESTS =====
class TestReferralProgram:
    """Referral Program endpoints"""

    def test_get_my_referral_code(self, admin_token):
        """Test GET /api/referrals/my-code - get or create referral code"""
        response = requests.get(
            f"{BASE_URL}/api/referrals/my-code",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Get referral code failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "code" in data, "code field missing"
        assert "referral_link" in data, "referral_link field missing"
        assert "total_referrals" in data, "total_referrals field missing"
        assert "successful_referrals" in data, "successful_referrals field missing"
        assert "rewards_earned" in data, "rewards_earned field missing"
        
        # Verify code format (8 char uppercase)
        assert len(data["code"]) == 8, f"Code should be 8 chars, got {len(data['code'])}"
        assert data["code"].isupper(), "Code should be uppercase"
        
        # Verify referral link format
        assert "ref=" in data["referral_link"], "Referral link should contain ref="
        
        print(f"✓ Referral code retrieved:")
        print(f"  Code: {data['code']}")
        print(f"  Link: {data['referral_link']}")
        print(f"  Total referrals: {data['total_referrals']}")
        print(f"  Successful: {data['successful_referrals']}")
        print(f"  Rewards earned: {data['rewards_earned']}")
        
        return data["code"]

    def test_referral_leaderboard(self):
        """Test GET /api/referrals/leaderboard - public endpoint"""
        response = requests.get(f"{BASE_URL}/api/referrals/leaderboard")
        
        assert response.status_code == 200, f"Leaderboard failed: {response.text}"
        data = response.json()
        
        assert "leaderboard" in data, "leaderboard field missing"
        assert isinstance(data["leaderboard"], list), "leaderboard should be a list"
        
        # Verify structure if not empty
        if data["leaderboard"]:
            entry = data["leaderboard"][0]
            assert "rank" in entry, "rank field missing"
            assert "user" in entry, "user field missing (anonymized)"
            assert "referrals" in entry, "referrals field missing"
        
        print(f"✓ Referral leaderboard retrieved: {len(data['leaderboard'])} entries")

    def test_apply_invalid_referral_code(self, admin_token):
        """Test POST /api/referrals/apply with invalid code"""
        response = requests.post(
            f"{BASE_URL}/api/referrals/apply",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"code": "INVALID0"}
        )
        
        # Should return 404 for invalid code
        assert response.status_code == 404, f"Expected 404 for invalid code, got {response.status_code}"
        print("✓ Invalid referral code correctly rejected")

    def test_apply_own_referral_code(self, admin_token):
        """Test applying own referral code should fail"""
        # First get own code
        code_response = requests.get(
            f"{BASE_URL}/api/referrals/my-code",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        own_code = code_response.json()["code"]
        
        # Try to apply own code
        response = requests.post(
            f"{BASE_URL}/api/referrals/apply",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"code": own_code}
        )
        
        # Should fail - can't use own code
        assert response.status_code == 400, f"Expected 400 for own code, got {response.status_code}"
        print("✓ Own referral code correctly rejected")

    def test_referral_my_code_unauthorized(self):
        """Test referral my-code without auth should fail"""
        response = requests.get(f"{BASE_URL}/api/referrals/my-code")
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Unauthorized referral code access correctly rejected")


# ===== PUSH NOTIFICATIONS TESTS =====
class TestPushNotifications:
    """Push Notifications endpoints"""

    def test_get_notification_preferences(self, admin_token):
        """Test GET /api/notifications/preferences"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/preferences",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Get preferences failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "is_subscribed" in data, "is_subscribed field missing"
        assert "preferences" in data, "preferences field missing"
        
        prefs = data["preferences"]
        assert "line_movements" in prefs, "line_movements pref missing"
        assert "game_starts" in prefs, "game_starts pref missing"
        assert "daily_picks" in prefs, "daily_picks pref missing"
        assert "bet_results" in prefs, "bet_results pref missing"
        
        print(f"✓ Notification preferences retrieved:")
        print(f"  Subscribed: {data['is_subscribed']}")
        print(f"  Line movements: {prefs['line_movements']}")
        print(f"  Game starts: {prefs['game_starts']}")
        print(f"  Daily picks: {prefs['daily_picks']}")
        print(f"  Bet results: {prefs['bet_results']}")

    def test_update_notification_preferences(self, admin_token):
        """Test PUT /api/notifications/preferences"""
        # Update preferences
        new_prefs = {
            "line_movements": True,
            "game_starts": False,
            "daily_picks": True,
            "bet_results": False
        }
        
        response = requests.put(
            f"{BASE_URL}/api/notifications/preferences",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=new_prefs
        )
        
        assert response.status_code == 200, f"Update preferences failed: {response.text}"
        data = response.json()
        
        assert "message" in data, "message field missing"
        print(f"✓ Notification preferences updated: {data['message']}")
        
        # Verify by fetching again
        verify_response = requests.get(
            f"{BASE_URL}/api/notifications/preferences",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        verify_data = verify_response.json()
        
        # Check at least one preference was updated
        prefs = verify_data["preferences"]
        assert prefs["line_movements"] == new_prefs["line_movements"], "line_movements not updated"
        assert prefs["game_starts"] == new_prefs["game_starts"], "game_starts not updated"
        print("✓ Preferences verified after update")

    def test_get_notification_status(self, admin_token):
        """Test GET /api/notifications/status"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/status",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Get status failed: {response.text}"
        data = response.json()
        
        assert "enabled" in data, "enabled field missing"
        print(f"✓ Notification status: enabled={data['enabled']}")

    def test_notification_preferences_unauthorized(self):
        """Test notification preferences without auth should fail"""
        response = requests.get(f"{BASE_URL}/api/notifications/preferences")
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Unauthorized notification preferences access correctly rejected")


# ===== BEST VALUE FINDER TESTS =====
class TestBestValueFinder:
    """Best Value Finder endpoints - uses MOCKED sportsbook odds data"""

    def test_best_value_finder(self, admin_token):
        """Test POST /api/best-value-finder"""
        response = requests.post(
            f"{BASE_URL}/api/best-value-finder",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={}
        )
        
        assert response.status_code == 200, f"Best value finder failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "success" in data, "success field missing"
        
        if data["success"]:
            assert "total_bets_analyzed" in data, "total_bets_analyzed missing"
            assert "average_improvement" in data, "average_improvement missing"
            assert "findings" in data, "findings missing"
            assert "summary" in data, "summary missing"
            
            # Verify findings structure if any exist
            if data["findings"]:
                finding = data["findings"][0]
                assert "bet" in finding, "bet field missing"
                assert "current_odds" in finding, "current_odds field missing"
                assert "best_odds" in finding, "best_odds field missing"
                assert "best_book" in finding, "best_book field missing"
                assert "savings_percent" in finding, "savings_percent field missing"
            
            print(f"✓ Best value finder results (MOCKED DATA):")
            print(f"  Bets analyzed: {data['total_bets_analyzed']}")
            print(f"  Avg improvement: {data['average_improvement']}%")
            print(f"  Findings: {len(data['findings'])}")
            if data.get("top_recommendation"):
                print(f"  Top recommendation: {data['top_recommendation']['best_book']}")
        else:
            # If no recent analysis, this is expected behavior
            assert "message" in data, "message field missing for unsuccessful response"
            print(f"✓ Best value finder returned: {data.get('message', 'No analysis found')}")

    def test_best_value_finder_unauthorized(self):
        """Test best value finder without auth should fail"""
        response = requests.post(f"{BASE_URL}/api/best-value-finder", json={})
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Unauthorized best value finder access correctly rejected")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
