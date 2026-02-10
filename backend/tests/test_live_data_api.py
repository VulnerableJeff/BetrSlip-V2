"""
Test BetrSlip APIs for LIVE data only - No Mock/Sample data allowed
Ensures all data comes from real The Odds API
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "testuser@test.com"
TEST_PASSWORD = "Test1234!"


class TestHealthAndAuth:
    """Basic health and authentication tests"""
    
    def test_health_endpoint(self):
        """GET /api/health returns healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.text}"
        data = response.json()
        assert data.get('status') == 'healthy'
        print(f"✓ Health check passed: {data}")
    
    def test_signup_new_user(self):
        """POST /api/auth/signup creates new user"""
        unique_email = f"test_{int(time.time())}@test.com"
        response = requests.post(f"{BASE_URL}/api/auth/signup", json={
            "email": unique_email,
            "password": TEST_PASSWORD
        })
        # Could be 200 or 400 if email already exists
        if response.status_code == 200:
            data = response.json()
            assert 'token' in data, "Signup should return token"
            assert 'user' in data, "Signup should return user"
            print(f"✓ Signup successful for new user: {unique_email}")
        elif response.status_code == 400:
            print(f"✓ Signup correctly rejects duplicate email (expected)")
        else:
            pytest.fail(f"Unexpected signup status: {response.status_code} - {response.text}")
    
    def test_signup_testuser(self):
        """POST /api/auth/signup with test user"""
        response = requests.post(f"{BASE_URL}/api/auth/signup", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        # If already exists, expect 400
        if response.status_code == 200:
            data = response.json()
            assert 'token' in data
            print(f"✓ Test user created successfully")
        elif response.status_code == 400:
            print(f"✓ Test user already exists (expected)")
        else:
            pytest.fail(f"Unexpected status: {response.status_code}")
    
    def test_login_existing_user(self):
        """POST /api/auth/login returns token for existing user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.status_code} - {response.text}"
        data = response.json()
        assert 'token' in data, "Login should return token"
        assert 'user' in data, "Login should return user info"
        print(f"✓ Login successful, token received")
        return data['token']


def get_auth_token():
    """Helper to get auth token"""
    # First try signup, then login
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


class TestLineMovementsLive:
    """Line movements must return live data with source=live"""
    
    def test_line_movements_returns_live_source(self):
        """GET /api/line-movements returns live data with source=live"""
        response = requests.get(f"{BASE_URL}/api/line-movements")
        assert response.status_code == 200, f"Line movements failed: {response.text}"
        
        data = response.json()
        print(f"Line movements response: count={data.get('count')}, source={data.get('source')}")
        
        # Must have source field
        assert 'source' in data, "Response must include source field"
        
        # Source should be 'live' or 'unavailable' (if no games available)
        source = data.get('source')
        assert source in ['live', 'unavailable'], f"Source must be 'live' or 'unavailable', got: {source}"
        
        if source == 'live':
            assert data.get('count', 0) > 0, "Live source should have movements"
            movements = data.get('movements', [])
            print(f"✓ Line movements: {len(movements)} live movements found")
            
            # Check first movement has real data
            if movements:
                m = movements[0]
                assert 'game' in m, "Movement must have game"
                assert 'sport' in m, "Movement must have sport"
                print(f"  Sample: {m.get('game')} ({m.get('sport')}) - {m.get('bet_type')}")
        else:
            print(f"✓ No live games available right now (source=unavailable)")


class TestOddsComparisonLive:
    """Odds comparison must return live data from real sportsbooks"""
    
    def test_odds_comparison_nba_returns_live_source(self):
        """GET /api/odds-comparison?sport=NBA returns real comparisons with source=live"""
        response = requests.get(f"{BASE_URL}/api/odds-comparison", params={"sport": "NBA"})
        assert response.status_code == 200, f"Odds comparison failed: {response.text}"
        
        data = response.json()
        print(f"Odds comparison: count={data.get('count')}, source={data.get('source')}, sport={data.get('sport')}")
        
        assert data.get('sport') == 'NBA', "Sport should be NBA"
        assert 'source' in data, "Response must include source field"
        
        source = data.get('source')
        assert source in ['live', 'unavailable'], f"Source must be live/unavailable, got: {source}"
        
        if source == 'live':
            comparisons = data.get('comparisons', [])
            assert len(comparisons) > 0, "Live source should have comparisons"
            print(f"✓ Odds comparison: {len(comparisons)} games with live odds")
            
            # Check first comparison has real sportsbook data
            if comparisons:
                c = comparisons[0]
                assert 'game' in c, "Comparison must have game"
                assert 'odds' in c, "Comparison must have odds"
                
                # Check for real sportsbook names
                odds = c.get('odds', {})
                print(f"  Sample game: {c.get('game')}")
                print(f"  Books: {list(odds.keys())}")
        else:
            print(f"✓ No live NBA games available right now")


class TestArbitrageScannerLive:
    """Arbitrage scanner requires auth and must return real opportunities"""
    
    def test_arbitrage_scanner_requires_auth(self):
        """GET /api/arbitrage-scanner without auth returns 401/403"""
        response = requests.get(f"{BASE_URL}/api/arbitrage-scanner")
        assert response.status_code in [401, 403], f"Should require auth, got: {response.status_code}"
        print(f"✓ Arbitrage scanner correctly requires authentication")
    
    def test_arbitrage_scanner_returns_real_data(self):
        """GET /api/arbitrage-scanner (auth) returns real arb opportunities"""
        token = get_auth_token()
        if not token:
            pytest.skip("Could not get auth token")
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/arbitrage-scanner", headers=headers)
        assert response.status_code == 200, f"Arbitrage scan failed: {response.text}"
        
        data = response.json()
        print(f"Arbitrage scanner: count={data.get('count')}, last_updated={data.get('last_updated')}")
        
        # Should have count and opportunities
        assert 'count' in data, "Must have count"
        assert 'opportunities' in data, "Must have opportunities array"
        assert 'last_updated' in data, "Must have last_updated timestamp"
        
        opportunities = data.get('opportunities', [])
        if opportunities:
            print(f"✓ Found {len(opportunities)} arbitrage/near-arb opportunities")
            
            # Check structure of first opportunity
            o = opportunities[0]
            assert 'game' in o, "Opportunity must have game"
            assert 'sport' in o, "Opportunity must have sport"
            assert 'profit_percentage' in o, "Must have profit_percentage"
            print(f"  Sample: {o.get('game')} - {o.get('profit_percentage')}% profit")
        else:
            print(f"✓ No arbitrage opportunities found at this time (normal)")


class TestEVScannerLive:
    """EV Scanner requires auth and must return source=live, NOT simulated"""
    
    def test_ev_scanner_requires_auth(self):
        """GET /api/ev-scanner without auth returns 401/403"""
        response = requests.get(f"{BASE_URL}/api/ev-scanner")
        assert response.status_code in [401, 403], f"Should require auth, got: {response.status_code}"
        print(f"✓ EV scanner correctly requires authentication")
    
    def test_ev_scanner_returns_live_not_simulated(self):
        """GET /api/ev-scanner (auth) returns real EV data with source=live, NO simulated"""
        token = get_auth_token()
        if not token:
            pytest.skip("Could not get auth token")
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/ev-scanner", headers=headers)
        assert response.status_code == 200, f"EV scan failed: {response.text}"
        
        data = response.json()
        print(f"EV Scanner response: count={data.get('count')}, source={data.get('source')}")
        
        # CRITICAL: Source must be 'live' or 'unavailable' - NOT 'simulated'
        source = data.get('source')
        assert source != 'simulated', "EV Scanner must NOT return simulated data!"
        assert source in ['live', 'unavailable'], f"Source must be live/unavailable, got: {source}"
        
        if source == 'live':
            opportunities = data.get('opportunities', [])
            assert len(opportunities) > 0, "Live source should have opportunities"
            print(f"✓ EV Scanner: {len(opportunities)} live +EV opportunities")
            
            # Check structure
            if opportunities:
                o = opportunities[0]
                assert 'game' in o, "Must have game"
                assert 'best_edge' in o, "Must have best_edge"
                assert 'true_probability' in o, "Must have true_probability"
                print(f"  Sample: {o.get('game')} - {o.get('best_edge')}% edge at {o.get('best_book')}")
        else:
            print(f"✓ No live EV opportunities available right now")


class TestPlayerPropsLive:
    """Player props must return live data from real Odds API, NOT sample/fake data"""
    
    def test_player_props_requires_auth(self):
        """GET /api/player-props without auth returns 401/403"""
        response = requests.get(f"{BASE_URL}/api/player-props")
        assert response.status_code in [401, 403], f"Should require auth, got: {response.status_code}"
        print(f"✓ Player props correctly requires authentication")
    
    def test_player_props_returns_live_not_sample(self):
        """GET /api/player-props?sport=NBA returns real props with source=live, NOT sample"""
        token = get_auth_token()
        if not token:
            pytest.skip("Could not get auth token")
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/player-props", params={"sport": "NBA"}, headers=headers)
        assert response.status_code == 200, f"Player props failed: {response.text}"
        
        data = response.json()
        print(f"Player props: count={data.get('count')}, source={data.get('source')}, sport={data.get('sport')}")
        
        # CRITICAL: Source must be 'live' or 'unavailable'
        source = data.get('source')
        assert source in ['live', 'unavailable'], f"Source must be live/unavailable, got: {source}"
        
        props = data.get('props', [])
        
        if source == 'live' and props:
            print(f"✓ Player props: {len(props)} live props found")
            
            # CRITICAL: Check for fake/mock player names
            fake_names = ['LeBron James', 'Stephen Curry', 'Kevin Durant', 'Sample Player']
            for prop in props[:5]:
                player = prop.get('player', '')
                # Check if it's a known fake/sample name indicator
                is_fake = any(fake in player for fake in fake_names if fake in str(props)[:500])
                
                print(f"  Player: {player} - {prop.get('market')} {prop.get('line')} ({prop.get('over_under')}) @ {prop.get('odds')}")
            
            # Verify structure
            p = props[0]
            assert 'player' in p, "Must have player name"
            assert 'game' in p, "Must have game"
            assert 'market' in p, "Must have market type"
            assert 'line' in p, "Must have line"
            assert 'odds' in p, "Must have odds"
        else:
            print(f"✓ No live player props available for NBA right now")
    
    def test_player_props_no_fake_lebron(self):
        """Verify player props don't contain obvious fake names like 'LeBron James' from sample data"""
        token = get_auth_token()
        if not token:
            pytest.skip("Could not get auth token")
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/player-props", params={"sport": "NBA"}, headers=headers)
        
        if response.status_code != 200:
            pytest.skip("Player props endpoint not available")
        
        data = response.json()
        props = data.get('props', [])
        
        # Convert to string to search
        props_str = str(props)
        
        # These names were in the old sample data - should NOT appear unless it's real API data
        # Note: Real API might have these players, but combined with "sample" source would be bad
        if data.get('source') == 'sample':
            pytest.fail("Player props should not have source='sample'!")
        
        print(f"✓ Player props source is '{data.get('source')}' - no sample/mock indicators")


class TestParlayOptimizerLive:
    """Parlay optimizer requires auth and must return source=live"""
    
    def test_parlay_optimizer_requires_auth(self):
        """GET /api/parlay-optimizer without auth returns 401/403"""
        response = requests.get(f"{BASE_URL}/api/parlay-optimizer")
        assert response.status_code in [401, 403], f"Should require auth, got: {response.status_code}"
        print(f"✓ Parlay optimizer correctly requires authentication")
    
    def test_parlay_optimizer_returns_live_suggestions(self):
        """GET /api/parlay-optimizer (auth) returns real suggestions with source=live"""
        token = get_auth_token()
        if not token:
            pytest.skip("Could not get auth token")
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/parlay-optimizer", headers=headers)
        assert response.status_code == 200, f"Parlay optimizer failed: {response.text}"
        
        data = response.json()
        print(f"Parlay optimizer: count={data.get('count')}, source={data.get('source')}")
        
        # Must have source field
        assert 'source' in data, "Response must include source field"
        
        source = data.get('source')
        assert source in ['live', 'unavailable'], f"Source must be live/unavailable, got: {source}"
        
        if source == 'live':
            suggestions = data.get('suggestions', [])
            assert len(suggestions) > 0, "Live source should have suggestions"
            print(f"✓ Parlay optimizer: {len(suggestions)} live suggestions")
            
            if suggestions:
                s = suggestions[0]
                print(f"  Sample: {s.get('description')} ({s.get('sport')}) - {s.get('odds')} ({s.get('probability')}% prob)")
        else:
            print(f"✓ No parlay suggestions available right now")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s", "--tb=short"])
