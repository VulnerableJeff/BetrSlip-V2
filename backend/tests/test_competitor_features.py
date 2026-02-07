"""
BetrSlip Competitor-Inspired Features API Tests
Tests for: AI Chat Assistant, P/L Performance Tracker, EV Scanner, Parlay Builder, Social Leaderboard
"""
import pytest
import requests
import os
import time

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


# ===== AI CHAT ASSISTANT TESTS =====
class TestAIChatAssistant:
    """AI Chat Assistant endpoints - uses GPT-4o via Emergent LLM Key"""

    def test_chat_message_new_session(self, admin_token):
        """Test POST /api/chat/message with new session (session_id=null)"""
        response = requests.post(
            f"{BASE_URL}/api/chat/message",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "message": "What is a parlay bet?",
                "session_id": None
            },
            timeout=30  # AI responses may take time
        )
        
        assert response.status_code == 200, f"Chat message failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "response" in data, "response field missing"
        assert "session_id" in data, "session_id field missing"
        
        # Verify session_id was created
        assert data["session_id"] is not None, "session_id should be generated"
        assert len(data["session_id"]) > 0, "session_id should not be empty"
        
        # Verify AI response contains relevant content
        response_text = data["response"].lower()
        assert len(data["response"]) > 50, "AI response too short"
        
        print(f"✓ AI Chat new session test passed")
        print(f"  Session ID: {data['session_id']}")
        print(f"  Response length: {len(data['response'])} chars")
        print(f"  Response preview: {data['response'][:100]}...")
        
        return data["session_id"]

    def test_chat_message_existing_session(self, admin_token):
        """Test POST /api/chat/message with existing session for multi-turn"""
        # First create a session
        first_response = requests.post(
            f"{BASE_URL}/api/chat/message",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "message": "What's the Kelly Criterion?",
                "session_id": None
            },
            timeout=30
        )
        
        assert first_response.status_code == 200, f"First message failed: {first_response.text}"
        session_id = first_response.json()["session_id"]
        
        # Wait a moment then send follow-up in same session
        time.sleep(1)
        
        second_response = requests.post(
            f"{BASE_URL}/api/chat/message",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "message": "How do I calculate it?",
                "session_id": session_id
            },
            timeout=30
        )
        
        assert second_response.status_code == 200, f"Second message failed: {second_response.text}"
        data = second_response.json()
        
        # Session ID should remain the same
        assert data["session_id"] == session_id, "Session ID changed unexpectedly"
        assert len(data["response"]) > 30, "Follow-up response too short"
        
        print(f"✓ AI Chat multi-turn conversation test passed")
        print(f"  Same session maintained: {session_id}")

    def test_chat_get_sessions(self, admin_token):
        """Test GET /api/chat/sessions - list chat sessions"""
        response = requests.get(
            f"{BASE_URL}/api/chat/sessions",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Get sessions failed: {response.text}"
        data = response.json()
        
        assert "sessions" in data, "sessions field missing"
        assert isinstance(data["sessions"], list), "sessions should be a list"
        
        # If sessions exist, verify structure
        if data["sessions"]:
            session = data["sessions"][0]
            assert "session_id" in session, "session_id missing"
            assert "preview" in session, "preview missing"
            assert "last_at" in session, "last_at missing"
            assert "message_count" in session, "message_count missing"
        
        print(f"✓ Chat sessions retrieved: {len(data['sessions'])} sessions")

    def test_chat_get_history(self, admin_token):
        """Test GET /api/chat/history - get messages from a session"""
        response = requests.get(
            f"{BASE_URL}/api/chat/history",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Get history failed: {response.text}"
        data = response.json()
        
        assert "messages" in data, "messages field missing"
        assert isinstance(data["messages"], list), "messages should be a list"
        
        # If messages exist, verify structure
        if data["messages"]:
            msg = data["messages"][0]
            assert "role" in msg, "role missing"
            assert "content" in msg, "content missing"
            assert "created_at" in msg, "created_at missing"
            assert msg["role"] in ["user", "assistant"], f"Invalid role: {msg['role']}"
        
        print(f"✓ Chat history retrieved: {len(data['messages'])} messages")

    def test_chat_unauthorized(self):
        """Test chat endpoints without auth should fail"""
        response = requests.post(
            f"{BASE_URL}/api/chat/message",
            json={"message": "test", "session_id": None}
        )
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Unauthorized chat access correctly rejected")


# ===== P/L PERFORMANCE TRACKER TESTS =====
class TestPLPerformanceTracker:
    """P/L Performance Tracker endpoints"""

    def test_get_my_performance_stats(self, admin_token):
        """Test GET /api/performance/my-stats - user's P/L data"""
        response = requests.get(
            f"{BASE_URL}/api/performance/my-stats",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Get performance stats failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "total_bets" in data, "total_bets missing"
        assert "wins" in data, "wins missing"
        assert "losses" in data, "losses missing"
        assert "pushes" in data, "pushes missing"
        assert "win_rate" in data, "win_rate missing"
        assert "cumulative_pl" in data, "cumulative_pl missing"
        assert "total_staked" in data, "total_staked missing"
        assert "roi" in data, "roi missing"
        assert "best_streak" in data, "best_streak missing"
        assert "ai_accuracy" in data, "ai_accuracy missing"
        assert "pl_chart" in data, "pl_chart missing"
        
        # Verify pl_chart is a list
        assert isinstance(data["pl_chart"], list), "pl_chart should be a list"
        
        # If chart data exists, verify structure
        if data["pl_chart"]:
            point = data["pl_chart"][0]
            assert "date" in point, "date missing in pl_chart"
            assert "pl" in point, "pl missing in pl_chart"
            assert "outcome" in point, "outcome missing in pl_chart"
        
        print(f"✓ Performance stats retrieved:")
        print(f"  Total bets: {data['total_bets']}")
        print(f"  Win rate: {data['win_rate']}%")
        print(f"  ROI: {data['roi']}%")
        print(f"  Cumulative P/L: ${data['cumulative_pl']}")
        print(f"  AI accuracy: {data['ai_accuracy']}%")
        print(f"  Chart points: {len(data['pl_chart'])}")

    def test_performance_stats_unauthorized(self):
        """Test performance stats without auth should fail"""
        response = requests.get(f"{BASE_URL}/api/performance/my-stats")
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Unauthorized performance access correctly rejected")


# ===== EV SCANNER TESTS =====
class TestEVScanner:
    """EV Scanner endpoints - MOCKED sportsbook odds data"""

    def test_get_ev_opportunities(self, admin_token):
        """Test GET /api/ev-scanner - get +EV opportunities"""
        response = requests.get(
            f"{BASE_URL}/api/ev-scanner",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"EV scanner failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "count" in data, "count missing"
        assert "opportunities" in data, "opportunities missing"
        assert "last_updated" in data, "last_updated missing"
        assert isinstance(data["opportunities"], list), "opportunities should be a list"
        
        # If opportunities exist, verify structure
        if data["opportunities"]:
            opp = data["opportunities"][0]
            assert "game" in opp, "game missing"
            assert "sport" in opp, "sport missing"
            assert "true_probability" in opp, "true_probability missing"
            assert "true_odds" in opp, "true_odds missing"
            assert "best_book" in opp, "best_book missing"
            assert "best_edge" in opp, "best_edge missing"
            assert "best_odds" in opp, "best_odds missing"
            assert "book_odds" in opp, "book_odds missing"
            assert "kelly_bet" in opp, "kelly_bet missing"
            
            # Verify book_odds structure
            assert isinstance(opp["book_odds"], dict), "book_odds should be dict"
            if opp["book_odds"]:
                book_name = list(opp["book_odds"].keys())[0]
                book_data = opp["book_odds"][book_name]
                assert "decimal" in book_data, "decimal missing in book_odds"
                assert "american" in book_data, "american missing in book_odds"
                assert "implied_prob" in book_data, "implied_prob missing in book_odds"
                assert "edge" in book_data, "edge missing in book_odds"
            
            # Verify best_edge is positive (EV Scanner should only show +EV)
            assert opp["best_edge"] > 0, f"best_edge should be positive, got {opp['best_edge']}"
        
        print(f"✓ EV Scanner results (MOCKED DATA):")
        print(f"  Opportunities found: {data['count']}")
        if data["opportunities"]:
            print(f"  Top opportunity: {data['opportunities'][0]['game']}")
            print(f"  Best edge: +{data['opportunities'][0]['best_edge']}%")
            print(f"  Best book: {data['opportunities'][0]['best_book']}")

    def test_ev_scanner_unauthorized(self):
        """Test EV scanner without auth should fail"""
        response = requests.get(f"{BASE_URL}/api/ev-scanner")
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Unauthorized EV scanner access correctly rejected")


# ===== PARLAY BUILDER TESTS =====
class TestParlayBuilder:
    """Parlay Builder endpoints"""

    def test_parlay_calculate_basic(self, admin_token):
        """Test POST /api/parlay-builder/calculate - basic 2-leg parlay"""
        parlay_request = {
            "legs": [
                {
                    "description": "Chiefs -3.5",
                    "odds": "-110",
                    "sport": "NFL",
                    "game": "Chiefs vs Bills",
                    "probability": 55
                },
                {
                    "description": "Lakers ML",
                    "odds": "+120",
                    "sport": "NBA",
                    "game": "Lakers vs Celtics",
                    "probability": 45
                }
            ],
            "stake": 25.0
        }
        
        response = requests.post(
            f"{BASE_URL}/api/parlay-builder/calculate",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=parlay_request
        )
        
        assert response.status_code == 200, f"Parlay calculate failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "legs" in data, "legs missing"
        assert "leg_count" in data, "leg_count missing"
        assert "stake" in data, "stake missing"
        assert "combined_odds" in data, "combined_odds missing"
        assert "combined_decimal" in data, "combined_decimal missing"
        assert "parlay_probability" in data, "parlay_probability missing"
        assert "implied_probability" in data, "implied_probability missing"
        assert "potential_payout" in data, "potential_payout missing"
        assert "potential_profit" in data, "potential_profit missing"
        assert "expected_value" in data, "expected_value missing"
        assert "ev_percentage" in data, "ev_percentage missing"
        assert "kelly_percentage" in data, "kelly_percentage missing"
        assert "individual_ev_total" in data, "individual_ev_total missing"
        assert "parlay_vs_individual" in data, "parlay_vs_individual missing"
        assert "correlation_warnings" in data, "correlation_warnings missing"
        assert "recommendation" in data, "recommendation missing"
        
        # Verify calculations are reasonable
        assert data["leg_count"] == 2, f"Expected 2 legs, got {data['leg_count']}"
        assert data["stake"] == 25.0, f"Stake should be 25.0, got {data['stake']}"
        assert data["potential_payout"] > data["stake"], "Payout should be > stake"
        assert data["recommendation"] in ["BET", "PASS"], f"Invalid recommendation: {data['recommendation']}"
        
        # Verify legs analysis
        assert len(data["legs"]) == 2, "Should have 2 legs in analysis"
        for leg in data["legs"]:
            assert "description" in leg, "leg description missing"
            assert "odds" in leg, "leg odds missing"
            assert "decimal_odds" in leg, "leg decimal_odds missing"
            assert "probability" in leg, "leg probability missing"
            assert "implied_probability" in leg, "leg implied_probability missing"
            assert "edge" in leg, "leg edge missing"
        
        print(f"✓ Parlay calculation successful:")
        print(f"  Combined odds: {data['combined_odds']}")
        print(f"  Parlay probability: {data['parlay_probability']}%")
        print(f"  Potential payout: ${data['potential_payout']}")
        print(f"  EV: {data['ev_percentage']}%")
        print(f"  Kelly: {data['kelly_percentage']}%")
        print(f"  Recommendation: {data['recommendation']}")

    def test_parlay_calculate_correlation_warning(self, admin_token):
        """Test POST /api/parlay-builder/calculate - same game legs should warn"""
        parlay_request = {
            "legs": [
                {
                    "description": "Chiefs ML",
                    "odds": "-150",
                    "sport": "NFL",
                    "game": "Chiefs vs Bills",  # Same game
                    "probability": 60
                },
                {
                    "description": "Over 48.5",
                    "odds": "-110",
                    "sport": "NFL",
                    "game": "Chiefs vs Bills",  # Same game - should trigger warning
                    "probability": 52
                }
            ],
            "stake": 10.0
        }
        
        response = requests.post(
            f"{BASE_URL}/api/parlay-builder/calculate",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=parlay_request
        )
        
        assert response.status_code == 200, f"Parlay calculate failed: {response.text}"
        data = response.json()
        
        # Should have correlation warnings
        assert "correlation_warnings" in data, "correlation_warnings missing"
        assert len(data["correlation_warnings"]) > 0, "Should have at least one correlation warning"
        
        print(f"✓ Correlation warning detected: {data['correlation_warnings']}")

    def test_parlay_calculate_validation_min_legs(self, admin_token):
        """Test POST /api/parlay-builder/calculate - require at least 2 legs"""
        parlay_request = {
            "legs": [
                {
                    "description": "Chiefs ML",
                    "odds": "-150",
                    "sport": "NFL",
                    "game": "",
                    "probability": 60
                }
            ],
            "stake": 10.0
        }
        
        response = requests.post(
            f"{BASE_URL}/api/parlay-builder/calculate",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=parlay_request
        )
        
        # Should fail with 400 - minimum 2 legs required
        assert response.status_code == 400, f"Expected 400 for single leg, got {response.status_code}"
        print("✓ Minimum 2 legs validation works")

    def test_parlay_save(self, admin_token):
        """Test POST /api/parlay-builder/save - save a parlay"""
        parlay_request = {
            "legs": [
                {
                    "description": "Test Chiefs -3",
                    "odds": "-110",
                    "sport": "NFL",
                    "game": "Chiefs vs Ravens",
                    "probability": 53
                },
                {
                    "description": "Test Lakers +5",
                    "odds": "-105",
                    "sport": "NBA",
                    "game": "Lakers vs Suns",
                    "probability": 50
                }
            ],
            "stake": 15.0
        }
        
        response = requests.post(
            f"{BASE_URL}/api/parlay-builder/save",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=parlay_request
        )
        
        assert response.status_code == 200, f"Parlay save failed: {response.text}"
        data = response.json()
        
        assert "message" in data, "message missing"
        assert "id" in data, "id missing"
        assert len(data["id"]) > 0, "id should not be empty"
        
        print(f"✓ Parlay saved with ID: {data['id']}")
        return data["id"]

    def test_parlay_get_my_parlays(self, admin_token):
        """Test GET /api/parlay-builder/my-parlays - get saved parlays"""
        response = requests.get(
            f"{BASE_URL}/api/parlay-builder/my-parlays",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Get parlays failed: {response.text}"
        data = response.json()
        
        assert "parlays" in data, "parlays missing"
        assert isinstance(data["parlays"], list), "parlays should be a list"
        
        # If parlays exist, verify structure
        if data["parlays"]:
            parlay = data["parlays"][0]
            assert "id" in parlay, "id missing"
            assert "legs" in parlay, "legs missing"
            assert "stake" in parlay, "stake missing"
            assert "status" in parlay, "status missing"
            assert "created_at" in parlay, "created_at missing"
        
        print(f"✓ User's saved parlays retrieved: {len(data['parlays'])} parlays")

    def test_parlay_unauthorized(self):
        """Test parlay endpoints without auth should fail"""
        response = requests.post(
            f"{BASE_URL}/api/parlay-builder/calculate",
            json={"legs": [], "stake": 10}
        )
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Unauthorized parlay access correctly rejected")


# ===== SOCIAL LEADERBOARD TESTS =====
class TestLeaderboard:
    """Social Leaderboard endpoints - public"""

    def test_get_leaderboard(self):
        """Test GET /api/leaderboard - public leaderboard"""
        response = requests.get(f"{BASE_URL}/api/leaderboard")
        
        assert response.status_code == 200, f"Get leaderboard failed: {response.text}"
        data = response.json()
        
        assert "leaderboard" in data, "leaderboard missing"
        assert isinstance(data["leaderboard"], list), "leaderboard should be a list"
        
        # If entries exist, verify structure
        if data["leaderboard"]:
            entry = data["leaderboard"][0]
            assert "rank" in entry, "rank missing"
            assert "user" in entry, "user missing (anonymized)"
            assert "total_bets" in entry, "total_bets missing"
            assert "wins" in entry, "wins missing"
            assert "losses" in entry, "losses missing"
            assert "win_rate" in entry, "win_rate missing"
            assert "is_pro" in entry, "is_pro missing"
            
            # Verify user is anonymized (e.g., "abc***")
            assert "***" in entry["user"], "user should be anonymized"
            
            # Verify ranking is sorted by win_rate
            for i, e in enumerate(data["leaderboard"]):
                assert e["rank"] == i + 1, f"Rank should be {i+1}, got {e['rank']}"
        
        print(f"✓ Leaderboard retrieved: {len(data['leaderboard'])} entries")
        if data["leaderboard"]:
            top = data["leaderboard"][0]
            print(f"  #1: {top['user']} - {top['win_rate']}% win rate ({top['total_bets']} bets)")


# ===== EXISTING FEATURES STABILITY TESTS =====
class TestExistingFeaturesStability:
    """Verify existing features still work after new additions"""

    def test_health_check(self):
        """Test /api/health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.text}"
        print("✓ Health check passed")

    def test_login(self):
        """Test login still works"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        assert "token" in response.json(), "token missing from login response"
        print("✓ Login works")

    def test_daily_picks(self, admin_token):
        """Test GET /api/daily-picks"""
        response = requests.get(
            f"{BASE_URL}/api/daily-picks",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Daily picks failed: {response.text}"
        data = response.json()
        assert "picks" in data, "picks missing"
        print(f"✓ Daily picks works: {len(data['picks'])} picks")

    def test_line_movements(self, admin_token):
        """Test GET /api/line-movements"""
        response = requests.get(
            f"{BASE_URL}/api/line-movements",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Line movements failed: {response.text}"
        print("✓ Line movements works")

    def test_odds_comparison(self, admin_token):
        """Test GET /api/odds-comparison"""
        response = requests.get(
            f"{BASE_URL}/api/odds-comparison",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Odds comparison failed: {response.text}"
        print("✓ Odds comparison works")

    def test_admin_analytics(self, admin_token):
        """Test GET /api/admin/analytics/overview"""
        response = requests.get(
            f"{BASE_URL}/api/admin/analytics/overview",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Admin analytics failed: {response.text}"
        print("✓ Admin analytics works")

    def test_referrals(self, admin_token):
        """Test GET /api/referrals/my-code"""
        response = requests.get(
            f"{BASE_URL}/api/referrals/my-code",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Referrals failed: {response.text}"
        print("✓ Referrals works")

    def test_notifications(self, admin_token):
        """Test GET /api/notifications/preferences"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/preferences",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Notifications failed: {response.text}"
        print("✓ Notifications works")

    def test_analyses_history(self, admin_token):
        """Test GET /api/analyses - bet analysis history"""
        response = requests.get(
            f"{BASE_URL}/api/analyses",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Analyses failed: {response.text}"
        print("✓ Analyses history works")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
