"""
Test P2 Enhancements for BetrSlip:
1. CLV (Closing Line Value) tracking in P/L Tracker
2. Enhanced Parlay Optimizer with AI optimal parlays
3. Enhanced Player Props with value indicators and cross-book comparison
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
TEST_EMAIL = "testuser@test.com"
TEST_PASSWORD = "Test1234!"


def get_auth_token():
    """Get auth token for test user"""
    # Try signup first
    response = requests.post(f"{BASE_URL}/api/auth/signup", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get('token')
    
    # Try login
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get('token')
    return None


class TestCLVTracking:
    """Test CLV (Closing Line Value) tracking in P/L Tracker"""
    
    def test_my_stats_returns_avg_clv_field(self):
        """GET /api/performance/my-stats returns avg_clv field"""
        token = get_auth_token()
        if not token:
            pytest.skip("Could not get auth token")
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/performance/my-stats", headers=headers)
        
        assert response.status_code == 200, f"my-stats failed: {response.text}"
        data = response.json()
        
        # CRITICAL: avg_clv field must exist
        assert 'avg_clv' in data, "Response must include avg_clv field"
        assert isinstance(data['avg_clv'], (int, float)), "avg_clv must be numeric"
        print(f"✓ avg_clv field present: {data['avg_clv']}")
    
    def test_my_stats_returns_clv_bets_tracked_field(self):
        """GET /api/performance/my-stats returns clv_bets_tracked field"""
        token = get_auth_token()
        if not token:
            pytest.skip("Could not get auth token")
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/performance/my-stats", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # CRITICAL: clv_bets_tracked field must exist
        assert 'clv_bets_tracked' in data, "Response must include clv_bets_tracked field"
        assert isinstance(data['clv_bets_tracked'], int), "clv_bets_tracked must be integer"
        print(f"✓ clv_bets_tracked field present: {data['clv_bets_tracked']}")
    
    def test_my_stats_full_response_structure(self):
        """GET /api/performance/my-stats returns all required fields"""
        token = get_auth_token()
        if not token:
            pytest.skip("Could not get auth token")
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/performance/my-stats", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        required_fields = [
            'total_bets', 'wins', 'losses', 'pushes', 'win_rate',
            'cumulative_pl', 'total_staked', 'roi', 'best_streak',
            'ai_accuracy', 'avg_clv', 'clv_bets_tracked', 'pl_chart'
        ]
        
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        
        print(f"✓ All {len(required_fields)} required fields present")


class TestEnhancedParlayOptimizer:
    """Test Enhanced Parlay Optimizer with AI optimal parlays"""
    
    def test_parlay_optimizer_returns_optimal_parlays_array(self):
        """GET /api/parlay-optimizer returns optimal_parlays array"""
        token = get_auth_token()
        if not token:
            pytest.skip("Could not get auth token")
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/parlay-optimizer", headers=headers)
        
        assert response.status_code == 200, f"Parlay optimizer failed: {response.text}"
        data = response.json()
        
        # CRITICAL: optimal_parlays array must exist
        assert 'optimal_parlays' in data, "Response must include optimal_parlays array"
        assert isinstance(data['optimal_parlays'], list), "optimal_parlays must be array"
        
        print(f"✓ optimal_parlays array present with {len(data['optimal_parlays'])} parlays")
    
    def test_optimal_parlays_structure(self):
        """GET /api/parlay-optimizer optimal_parlays have required fields"""
        token = get_auth_token()
        if not token:
            pytest.skip("Could not get auth token")
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/parlay-optimizer", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        parlays = data.get('optimal_parlays', [])
        if not parlays:
            pytest.skip("No optimal parlays available - live data dependent")
        
        # Check first parlay structure
        parlay = parlays[0]
        required_fields = ['combined_odds', 'combined_ev', 'combined_probability', 'risk_level', 'legs']
        
        for field in required_fields:
            assert field in parlay, f"Parlay missing required field: {field}"
        
        # Check legs structure
        legs = parlay.get('legs', [])
        assert len(legs) >= 2, "Parlay must have at least 2 legs"
        
        for leg in legs:
            assert 'description' in leg, "Leg must have description"
            assert 'sport' in leg, "Leg must have sport"
            assert 'odds' in leg, "Leg must have odds"
        
        print(f"✓ Optimal parlay structure valid: {len(legs)}-leg parlay @ {parlay['combined_odds']}, EV: {parlay['combined_ev']}%")
    
    def test_optimal_parlays_ev_calculation(self):
        """Verify optimal parlays have combined_ev calculated"""
        token = get_auth_token()
        if not token:
            pytest.skip("Could not get auth token")
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/parlay-optimizer", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        parlays = data.get('optimal_parlays', [])
        if not parlays:
            pytest.skip("No optimal parlays available")
        
        for i, parlay in enumerate(parlays):
            ev = parlay.get('combined_ev')
            prob = parlay.get('combined_probability')
            odds = parlay.get('combined_odds')
            
            assert ev is not None, f"Parlay {i} missing combined_ev"
            assert prob is not None, f"Parlay {i} missing combined_probability"
            assert odds is not None, f"Parlay {i} missing combined_odds"
            
            print(f"  Parlay {i}: {odds} odds, {prob}% prob, {ev}% EV")
        
        print(f"✓ All {len(parlays)} parlays have EV calculations")


class TestEnhancedPlayerProps:
    """Test Enhanced Player Props with value indicators"""
    
    def test_player_props_has_is_value_field(self):
        """GET /api/player-props returns props with is_value field"""
        token = get_auth_token()
        if not token:
            pytest.skip("Could not get auth token")
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/player-props?sport=NBA", headers=headers)
        
        assert response.status_code == 200, f"Player props failed: {response.text}"
        data = response.json()
        
        props = data.get('props', [])
        if not props:
            pytest.skip("No player props available - live data dependent")
        
        # Check first prop has is_value field
        prop = props[0]
        assert 'is_value' in prop, "Prop must have is_value field"
        assert isinstance(prop['is_value'], bool), "is_value must be boolean"
        
        # Count value props
        value_props = [p for p in props if p.get('is_value')]
        print(f"✓ is_value field present. {len(value_props)} value props out of {len(props)} total")
    
    def test_player_props_has_edge_vs_avg_field(self):
        """GET /api/player-props returns props with edge_vs_avg field"""
        token = get_auth_token()
        if not token:
            pytest.skip("Could not get auth token")
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/player-props?sport=NBA", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        props = data.get('props', [])
        if not props:
            pytest.skip("No player props available")
        
        prop = props[0]
        assert 'edge_vs_avg' in prop, "Prop must have edge_vs_avg field"
        assert isinstance(prop['edge_vs_avg'], (int, float)), "edge_vs_avg must be numeric"
        
        print(f"✓ edge_vs_avg field present: {prop['edge_vs_avg']}")
    
    def test_player_props_has_books_available_field(self):
        """GET /api/player-props returns props with books_available field"""
        token = get_auth_token()
        if not token:
            pytest.skip("Could not get auth token")
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/player-props?sport=NBA", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        props = data.get('props', [])
        if not props:
            pytest.skip("No player props available")
        
        prop = props[0]
        assert 'books_available' in prop, "Prop must have books_available field"
        assert isinstance(prop['books_available'], int), "books_available must be integer"
        assert prop['books_available'] >= 1, "books_available must be at least 1"
        
        # Check for props with multiple books
        multi_book_props = [p for p in props if p.get('books_available', 0) >= 2]
        print(f"✓ books_available field present. {len(multi_book_props)} props with 2+ books")
    
    def test_player_props_no_mock_data(self):
        """Verify player props don't contain mock/sample data"""
        token = get_auth_token()
        if not token:
            pytest.skip("Could not get auth token")
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/player-props?sport=NBA", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Source must be 'live' or 'unavailable', not 'sample'
        source = data.get('source')
        assert source != 'sample', "Player props should not have source='sample'"
        assert source in ['live', 'unavailable'], f"Source should be live/unavailable, got: {source}"
        
        props = data.get('props', [])
        if props:
            # Check for obvious mock player names (from old sample data)
            props_text = str(props).lower()
            mock_indicators = ['sample player', 'test player', 'fake player']
            for indicator in mock_indicators:
                assert indicator not in props_text, f"Found mock indicator: {indicator}"
        
        print(f"✓ No mock/sample data detected. Source: {source}")


class TestLiveDataEndpoints:
    """Verify all endpoints return live data (not simulated)"""
    
    def test_ev_scanner_returns_live_source(self):
        """GET /api/ev-scanner returns source=live (not simulated)"""
        token = get_auth_token()
        if not token:
            pytest.skip("Could not get auth token")
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/ev-scanner", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        source = data.get('source')
        assert source != 'simulated', "EV Scanner must NOT return simulated data!"
        assert source in ['live', 'unavailable'], f"Source must be live/unavailable, got: {source}"
        
        if source == 'live':
            opportunities = data.get('opportunities', [])
            assert len(opportunities) > 0, "Live source should have opportunities"
            print(f"✓ EV Scanner returns live data: {len(opportunities)} opportunities")
        else:
            print(f"✓ EV Scanner source is {source} (no live data available)")
    
    def test_arbitrage_scanner_returns_real_data(self):
        """GET /api/arbitrage-scanner returns real arbitrage opportunities"""
        token = get_auth_token()
        if not token:
            pytest.skip("Could not get auth token")
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/arbitrage-scanner", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert 'count' in data, "Must have count field"
        assert 'opportunities' in data, "Must have opportunities field"
        
        opportunities = data.get('opportunities', [])
        if opportunities:
            o = opportunities[0]
            assert 'game' in o, "Must have game"
            assert 'sport' in o, "Must have sport"
            assert 'profit_percentage' in o, "Must have profit_percentage"
            print(f"✓ Arbitrage Scanner: {len(opportunities)} opportunities. Top: {o['game']} @ {o['profit_percentage']}%")
        else:
            print(f"✓ Arbitrage Scanner: No opportunities at this time (normal)")
    
    def test_line_movements_returns_live_source(self):
        """GET /api/line-movements returns source=live"""
        response = requests.get(f"{BASE_URL}/api/line-movements")
        
        assert response.status_code == 200
        data = response.json()
        
        source = data.get('source')
        assert source in ['live', 'unavailable'], f"Source must be live/unavailable, got: {source}"
        
        if source == 'live':
            movements = data.get('movements', [])
            assert len(movements) > 0, "Live source should have movements"
            print(f"✓ Line Movements: {len(movements)} movements with source=live")
        else:
            print(f"✓ Line Movements source is {source}")
    
    def test_odds_comparison_returns_live_source(self):
        """GET /api/odds-comparison?sport=NBA returns source=live"""
        response = requests.get(f"{BASE_URL}/api/odds-comparison", params={"sport": "NBA"})
        
        assert response.status_code == 200
        data = response.json()
        
        source = data.get('source')
        assert source in ['live', 'unavailable'], f"Source must be live/unavailable, got: {source}"
        
        if source == 'live':
            comparisons = data.get('comparisons', [])
            assert len(comparisons) > 0, "Live source should have comparisons"
            print(f"✓ Odds Comparison: {len(comparisons)} comparisons with source=live")
        else:
            print(f"✓ Odds Comparison source is {source}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s", "--tb=short"])
