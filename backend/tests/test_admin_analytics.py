"""
Admin Analytics Dashboard & Top Bets API Tests
- Tests all analytics endpoints for proper structure and data
- Tests top bets endpoints with enriched data fields
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials
ADMIN_EMAIL = "hundojeff@icloud.com"
ADMIN_PASSWORD = "Boo-boo600$"

class TestAdminAnalytics:
    """Admin Analytics Endpoint Tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in login response"
        return data["token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        """Get auth headers with admin token"""
        return {"Authorization": f"Bearer {admin_token}"}
    
    # ============= OVERVIEW ENDPOINT =============
    def test_analytics_overview_structure(self, auth_headers):
        """GET /api/admin/analytics/overview returns proper structure"""
        response = requests.get(f"{BASE_URL}/api/admin/analytics/overview", headers=auth_headers)
        assert response.status_code == 200, f"Overview failed: {response.text}"
        
        data = response.json()
        
        # Check users structure
        assert "users" in data, "Missing 'users' field"
        assert "total" in data["users"], "Missing users.total"
        assert "today" in data["users"], "Missing users.today"
        assert "this_week" in data["users"], "Missing users.this_week"
        assert "this_month" in data["users"], "Missing users.this_month"
        
        # Check subscriptions structure
        assert "subscriptions" in data, "Missing 'subscriptions' field"
        assert "active" in data["subscriptions"], "Missing subscriptions.active"
        assert "conversion_rate" in data["subscriptions"], "Missing subscriptions.conversion_rate"
        
        # Check revenue structure
        assert "revenue" in data, "Missing 'revenue' field"
        assert "mrr" in data["revenue"], "Missing revenue.mrr"
        assert "total_transactions" in data["revenue"], "Missing revenue.total_transactions"
        
        # Check analyses structure
        assert "analyses" in data, "Missing 'analyses' field"
        assert "total" in data["analyses"], "Missing analyses.total"
        assert "today" in data["analyses"], "Missing analyses.today"
        assert "this_week" in data["analyses"], "Missing analyses.this_week"
        
        # Check ai_performance structure
        assert "ai_performance" in data, "Missing 'ai_performance' field"
        assert "accuracy" in data["ai_performance"], "Missing ai_performance.accuracy"
        assert "total_decided" in data["ai_performance"], "Missing ai_performance.total_decided"
        assert "picks_win_rate" in data["ai_performance"], "Missing ai_performance.picks_win_rate"
        assert "picks_record" in data["ai_performance"], "Missing ai_performance.picks_record"
        
        print(f"Overview data: users.total={data['users']['total']}, subscriptions.active={data['subscriptions']['active']}, revenue.mrr={data['revenue']['mrr']}")
    
    # ============= USER GROWTH ENDPOINT =============
    def test_user_growth_endpoint(self, auth_headers):
        """GET /api/admin/analytics/user-growth returns 30-day growth data"""
        response = requests.get(f"{BASE_URL}/api/admin/analytics/user-growth?days=30", headers=auth_headers)
        assert response.status_code == 200, f"User growth failed: {response.text}"
        
        data = response.json()
        assert "data" in data, "Missing 'data' field"
        assert isinstance(data["data"], list), "data should be a list"
        
        # Should have approximately 30 days of data
        assert len(data["data"]) >= 25, f"Expected ~30 days of data, got {len(data['data'])}"
        
        # Check structure of each item
        if len(data["data"]) > 0:
            item = data["data"][0]
            assert "date" in item, "Missing 'date' field in growth data"
            assert "users" in item, "Missing 'users' field in growth data"
            
        print(f"User growth: {len(data['data'])} days of data")
    
    # ============= ANALYSES TREND ENDPOINT =============
    def test_analyses_trend_endpoint(self, auth_headers):
        """GET /api/admin/analytics/analyses-trend returns 30-day trend data"""
        response = requests.get(f"{BASE_URL}/api/admin/analytics/analyses-trend?days=30", headers=auth_headers)
        assert response.status_code == 200, f"Analyses trend failed: {response.text}"
        
        data = response.json()
        assert "data" in data, "Missing 'data' field"
        assert isinstance(data["data"], list), "data should be a list"
        
        # Should have approximately 30 days of data
        assert len(data["data"]) >= 25, f"Expected ~30 days of data, got {len(data['data'])}"
        
        # Check structure of each item
        if len(data["data"]) > 0:
            item = data["data"][0]
            assert "date" in item, "Missing 'date' field in trend data"
            assert "analyses" in item, "Missing 'analyses' field in trend data"
        
        print(f"Analyses trend: {len(data['data'])} days of data")
    
    # ============= TOP USERS ENDPOINT =============
    def test_top_users_endpoint(self, auth_headers):
        """GET /api/admin/analytics/top-users returns top active users"""
        response = requests.get(f"{BASE_URL}/api/admin/analytics/top-users?limit=10", headers=auth_headers)
        assert response.status_code == 200, f"Top users failed: {response.text}"
        
        data = response.json()
        assert "users" in data, "Missing 'users' field"
        assert isinstance(data["users"], list), "users should be a list"
        
        # Check structure of each user (if any exist)
        if len(data["users"]) > 0:
            user = data["users"][0]
            assert "user_id" in user, "Missing 'user_id' field"
            assert "email" in user, "Missing 'email' field"
            assert "analyses_count" in user, "Missing 'analyses_count' field"
            assert "is_pro" in user, "Missing 'is_pro' field"
        
        print(f"Top users: {len(data['users'])} users returned")
    
    # ============= CONVERSION FUNNEL ENDPOINT =============
    def test_funnel_endpoint(self, auth_headers):
        """GET /api/admin/analytics/funnel returns conversion funnel with 4 stages"""
        response = requests.get(f"{BASE_URL}/api/admin/analytics/funnel", headers=auth_headers)
        assert response.status_code == 200, f"Funnel failed: {response.text}"
        
        data = response.json()
        assert "funnel" in data, "Missing 'funnel' field"
        assert isinstance(data["funnel"], list), "funnel should be a list"
        assert len(data["funnel"]) == 4, f"Expected 4 funnel stages, got {len(data['funnel'])}"
        
        # Check each stage has required fields
        expected_stages = ["Registered", "First Analysis", "3+ Analyses", "Pro Subscriber"]
        for i, stage in enumerate(data["funnel"]):
            assert "stage" in stage, f"Missing 'stage' field in funnel[{i}]"
            assert "count" in stage, f"Missing 'count' field in funnel[{i}]"
            assert "percentage" in stage, f"Missing 'percentage' field in funnel[{i}]"
            assert stage["stage"] == expected_stages[i], f"Expected stage '{expected_stages[i]}', got '{stage['stage']}'"
        
        print(f"Funnel stages: {[s['stage'] + ':' + str(s['count']) for s in data['funnel']]}")
    
    # ============= PICKS PERFORMANCE ENDPOINT =============
    def test_picks_performance_endpoint(self, auth_headers):
        """GET /api/admin/analytics/picks-performance returns by_sport and by_confidence"""
        response = requests.get(f"{BASE_URL}/api/admin/analytics/picks-performance", headers=auth_headers)
        assert response.status_code == 200, f"Picks performance failed: {response.text}"
        
        data = response.json()
        
        # Check structure
        assert "by_sport" in data, "Missing 'by_sport' field"
        assert "by_confidence" in data, "Missing 'by_confidence' field"
        assert isinstance(data["by_sport"], list), "by_sport should be a list"
        assert isinstance(data["by_confidence"], list), "by_confidence should be a list"
        
        # Check by_sport structure (if any exist)
        if len(data["by_sport"]) > 0:
            sport = data["by_sport"][0]
            assert "sport" in sport, "Missing 'sport' field"
            assert "total" in sport, "Missing 'total' field"
            assert "won" in sport, "Missing 'won' field"
            assert "lost" in sport, "Missing 'lost' field"
            assert "win_rate" in sport, "Missing 'win_rate' field"
        
        print(f"Picks performance: {len(data['by_sport'])} sports, {len(data['by_confidence'])} confidence buckets")


class TestTopBetsEndpoints:
    """Top Bets Admin Endpoint Tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        """Get auth headers with admin token"""
        return {"Authorization": f"Bearer {admin_token}"}
    
    # ============= TOP BETS ENDPOINT =============
    def test_top_bets_enriched_fields(self, auth_headers):
        """GET /api/admin/top-bets returns enriched bet data with all required fields"""
        response = requests.get(f"{BASE_URL}/api/admin/top-bets?limit=50", headers=auth_headers)
        assert response.status_code == 200, f"Top bets failed: {response.text}"
        
        data = response.json()
        assert "top_bets" in data, "Missing 'top_bets' field"
        assert isinstance(data["top_bets"], list), "top_bets should be a list"
        
        print(f"Total top bets: {len(data['top_bets'])}")
        
        # If there are bets, check all enriched fields
        if len(data["top_bets"]) > 0:
            bet = data["top_bets"][0]
            
            # Check all required fields for enriched data
            assert "id" in bet, "Missing 'id' field"
            assert "user_email" in bet, "Missing 'user_email' field (enriched)"
            assert "win_probability" in bet, "Missing 'win_probability' field"
            assert "confidence_score" in bet, "Missing 'confidence_score' field (enriched)"
            assert "expected_value" in bet, "Missing 'expected_value' field (enriched)"
            assert "kelly_percentage" in bet, "Missing 'kelly_percentage' field (enriched)"
            assert "recommendation" in bet, "Missing 'recommendation' field (enriched)"
            assert "bet_details" in bet, "Missing 'bet_details' field (enriched)"
            
            # Verify field types
            assert isinstance(bet["user_email"], str), "user_email should be string"
            assert isinstance(bet["win_probability"], (int, float)), "win_probability should be numeric"
            assert isinstance(bet["confidence_score"], (int, float)), "confidence_score should be numeric"
            
            # Check value ranges
            assert 0 <= bet["win_probability"] <= 100, f"win_probability out of range: {bet['win_probability']}"
            assert 1 <= bet["confidence_score"] <= 10, f"confidence_score out of range: {bet['confidence_score']}"
            
            print(f"First bet: user={bet['user_email']}, prob={bet['win_probability']}%, conf={bet['confidence_score']}/10, ev={bet.get('expected_value')}, kelly={bet.get('kelly_percentage')}")
        else:
            print("No top bets found (empty state) - this is valid for environments with no bet data")
    
    # ============= TOP BETS STATS ENDPOINT =============
    def test_top_bets_stats_endpoint(self, auth_headers):
        """GET /api/admin/top-bets/stats returns category counts"""
        response = requests.get(f"{BASE_URL}/api/admin/top-bets/stats", headers=auth_headers)
        assert response.status_code == 200, f"Top bets stats failed: {response.text}"
        
        data = response.json()
        
        # Check all required fields
        assert "total_top_bets" in data, "Missing 'total_top_bets' field"
        assert "elite_bets_80_plus" in data, "Missing 'elite_bets_80_plus' field"
        assert "strong_bets_70_79" in data, "Missing 'strong_bets_70_79' field"
        assert "good_bets_60_69" in data, "Missing 'good_bets_60_69' field"
        assert "average_probability" in data, "Missing 'average_probability' field"
        
        # Verify types
        assert isinstance(data["total_top_bets"], int), "total_top_bets should be int"
        assert isinstance(data["elite_bets_80_plus"], int), "elite_bets_80_plus should be int"
        assert isinstance(data["strong_bets_70_79"], int), "strong_bets_70_79 should be int"
        assert isinstance(data["good_bets_60_69"], int), "good_bets_60_69 should be int"
        assert isinstance(data["average_probability"], (int, float)), "average_probability should be numeric"
        
        # Category counts should add up correctly
        total = data["total_top_bets"]
        elite = data["elite_bets_80_plus"]
        strong = data["strong_bets_70_79"]
        good = data["good_bets_60_69"]
        
        assert elite + strong + good <= total, "Category counts should not exceed total"
        
        print(f"Top bets stats: total={total}, elite_80+={elite}, strong_70-79={strong}, good_60-69={good}, avg_prob={data['average_probability']}%")
    
    def test_top_bets_requires_admin(self):
        """GET /api/admin/top-bets requires admin authentication"""
        # Try without auth
        response = requests.get(f"{BASE_URL}/api/admin/top-bets")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        
        # Try with invalid token
        response = requests.get(f"{BASE_URL}/api/admin/top-bets", 
                              headers={"Authorization": "Bearer invalid_token"})
        assert response.status_code in [401, 403], f"Expected 401/403 for invalid token, got {response.status_code}"


class TestAdminAuth:
    """Test admin authentication and access control"""
    
    def test_admin_login(self):
        """Admin login returns valid token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        
        data = response.json()
        assert "token" in data, "No token in response"
        assert "user" in data, "No user in response"
        assert data["user"]["email"] == ADMIN_EMAIL, "Email mismatch"
        
        print(f"Admin login successful: {data['user']['email']}")
    
    def test_analytics_requires_admin(self):
        """Analytics endpoints require admin authentication"""
        endpoints = [
            "/api/admin/analytics/overview",
            "/api/admin/analytics/user-growth",
            "/api/admin/analytics/analyses-trend",
            "/api/admin/analytics/top-users",
            "/api/admin/analytics/funnel",
            "/api/admin/analytics/picks-performance"
        ]
        
        for endpoint in endpoints:
            response = requests.get(f"{BASE_URL}{endpoint}")
            assert response.status_code in [401, 403], f"{endpoint} should require auth, got {response.status_code}"
        
        print(f"All {len(endpoints)} analytics endpoints require admin auth")


class TestHealthCheck:
    """Basic health check test"""
    
    def test_api_health(self):
        """API health check returns healthy"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.text}"
        
        data = response.json()
        assert data["status"] == "healthy", f"Expected healthy status, got {data['status']}"
        print(f"API health: {data['status']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
