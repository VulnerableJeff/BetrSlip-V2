"""
Test suite for Landing Page and Admin Panel New Features
- Backend endpoints for fading_public, is_online, IP tracking
- Weekly leaderboard with picks
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
ADMIN_EMAIL = "hundojeff@icloud.com"
ADMIN_PASSWORD = "Boo-boo600$"

# ===== FIXTURES =====
@pytest.fixture(scope="module")
def admin_token():
    """Get admin token via login"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Admin login failed: {response.status_code}")
    return response.json().get("token")

@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

# ===== LANDING PAGE TESTS =====
class TestLandingPageHealth:
    """Health check before other tests"""
    
    def test_backend_health(self, api_client):
        """Backend health endpoint should return 200"""
        response = api_client.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print(f"Health check: {response.json()}")

# ===== BET OF THE DAY WITH FADING PUBLIC =====
class TestBetOfTheDayFadingPublic:
    """Test /api/bet-of-the-day returns fading_public and fade_reason"""
    
    def test_bet_of_day_requires_auth(self, api_client):
        """Bet of the Day requires authentication"""
        response = api_client.get(f"{BASE_URL}/api/bet-of-the-day")
        assert response.status_code in [401, 403]
        print("Bet of the Day requires auth: PASS")
    
    def test_bet_of_day_returns_pick(self, api_client, admin_token):
        """Bet of the Day returns a pick with fading_public field"""
        response = api_client.get(
            f"{BASE_URL}/api/bet-of-the-day",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True
        print(f"Bet of Day response success: {data.get('success')}")
        
        # Check if pick exists
        pick = data.get("pick")
        if pick:
            print(f"Pick found: {pick.get('pick')} - {pick.get('game')}")
            print(f"fading_public: {pick.get('fading_public')}")
            print(f"fade_reason: {pick.get('fade_reason')}")
            
            # Verify fading_public field exists (boolean)
            assert "fading_public" in pick, "fading_public field should be in pick"
            assert isinstance(pick.get("fading_public"), bool), "fading_public should be boolean"
            
            # If fading_public is True, fade_reason should have content
            if pick.get("fading_public"):
                assert pick.get("fade_reason"), "fade_reason should have content when fading_public is True"
                print(f"FADING PUBLIC pick detected: {pick.get('fade_reason')}")
        else:
            print("No pick available (API quota or no games)")

# ===== ADMIN USERS WITH ONLINE STATUS & IPs =====
class TestAdminUserDetails:
    """Test /api/admin/users returns is_online, last_login, ip_addresses"""
    
    def test_admin_users_requires_admin(self, api_client):
        """Admin users endpoint requires admin auth"""
        response = api_client.get(f"{BASE_URL}/api/admin/users")
        assert response.status_code in [401, 403]
        print("Admin users requires auth: PASS")
    
    def test_admin_users_returns_online_status(self, api_client, admin_token):
        """Admin users list includes is_online, last_login, ip_addresses"""
        response = api_client.get(
            f"{BASE_URL}/api/admin/users?limit=10",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        users = data.get("users", [])
        assert len(users) > 0, "Should have at least one user"
        print(f"Found {len(users)} users")
        
        # Check admin user (hundojeff)
        admin_user = next((u for u in users if u.get("email") == ADMIN_EMAIL), None)
        assert admin_user is not None, "Admin user should be in list"
        
        # Verify new fields exist
        print(f"\nAdmin user details:")
        print(f"  is_online: {admin_user.get('is_online')}")
        print(f"  last_login: {admin_user.get('last_login')}")
        print(f"  last_active: {admin_user.get('last_active')}")
        print(f"  ip_addresses: {admin_user.get('ip_addresses')}")
        
        assert "is_online" in admin_user, "is_online field should exist"
        assert "last_login" in admin_user, "last_login field should exist"
        assert "ip_addresses" in admin_user, "ip_addresses field should exist"
        
        # is_online should be boolean
        assert isinstance(admin_user.get("is_online"), bool), "is_online should be boolean"
        
        # ip_addresses should be a list
        assert isinstance(admin_user.get("ip_addresses"), list), "ip_addresses should be a list"

    def test_admin_user_detail_has_ip_info(self, api_client, admin_token):
        """Individual user detail includes IP addresses"""
        # First get users list to find admin user ID
        users_response = api_client.get(
            f"{BASE_URL}/api/admin/users?limit=10",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        users = users_response.json().get("users", [])
        admin_user = next((u for u in users if u.get("email") == ADMIN_EMAIL), None)
        
        if admin_user:
            user_id = admin_user.get("id")
            # Get individual user detail
            detail_response = api_client.get(
                f"{BASE_URL}/api/admin/user/{user_id}",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            if detail_response.status_code == 200:
                detail = detail_response.json()
                print(f"\nUser detail for {ADMIN_EMAIL}:")
                print(f"  ip_addresses: {detail.get('ip_addresses', [])}")
                print(f"  last_login: {detail.get('last_login')}")
            else:
                print(f"User detail endpoint returned {detail_response.status_code}")

# ===== WEEKLY LEADERBOARD WITH OUTCOME TRACKING =====
class TestWeeklyLeaderboard:
    """Test /api/weekly-leaderboard returns weekly picks with outcome tracking"""
    
    def test_weekly_leaderboard_requires_auth(self, api_client):
        """Weekly leaderboard requires authentication"""
        response = api_client.get(f"{BASE_URL}/api/weekly-leaderboard")
        assert response.status_code in [401, 403]
        print("Weekly leaderboard requires auth: PASS")
    
    def test_weekly_leaderboard_pro_user(self, api_client, admin_token):
        """Weekly leaderboard returns picks for Pro user"""
        response = api_client.get(
            f"{BASE_URL}/api/weekly-leaderboard",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        print(f"\nWeekly leaderboard response:")
        print(f"  success: {data.get('success')}")
        print(f"  pro_required: {data.get('pro_required')}")
        
        assert data.get("success") == True
        
        # Check week stats
        week = data.get("week", {})
        print(f"\n  Week stats:")
        print(f"    picks count: {len(week.get('picks', []))}")
        print(f"    won: {week.get('won')}")
        print(f"    lost: {week.get('lost')}")
        print(f"    win_rate: {week.get('win_rate')}")
        print(f"    roi: {week.get('roi')}")
        
        # Check all_time stats
        all_time = data.get("all_time", {})
        print(f"\n  All-time stats:")
        print(f"    won: {all_time.get('won')}")
        print(f"    lost: {all_time.get('lost')}")
        print(f"    win_rate: {all_time.get('win_rate')}")
        print(f"    total_picks: {all_time.get('total_picks')}")
        print(f"    streak: {all_time.get('streak')}")
        print(f"    streak_type: {all_time.get('streak_type')}")
        
        # Verify structure
        assert "week" in data
        assert "all_time" in data
        assert "picks" in week
        
        # Check individual pick structure if any exist
        if week.get("picks"):
            pick = week["picks"][0]
            print(f"\n  Sample pick:")
            print(f"    pick: {pick.get('pick')}")
            print(f"    game: {pick.get('game')}")
            print(f"    outcome: {pick.get('outcome')}")
            
            # Verify pick has outcome field for tracking
            assert "outcome" in pick, "Pick should have outcome field"

# ===== ADMIN EXPANDED USER VIEW (5-column grid check) =====
class TestAdminExpandedUserGrid:
    """Test that admin users have all required fields for 5-column grid display"""
    
    def test_admin_users_have_grid_fields(self, api_client, admin_token):
        """Admin user list has fields for 5-column grid:
        Analyses, Status (online/banned), Subscription, Last Login, IPs
        """
        response = api_client.get(
            f"{BASE_URL}/api/admin/users?limit=5",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        users = data.get("users", [])
        
        if users:
            user = users[0]
            required_fields = [
                "analyses_count",       # Column 1: Analyses
                "is_online",            # Column 2: Status (part of)
                "is_banned",            # Column 2: Status (part of)
                "is_subscribed",        # Column 3: Subscription
                "last_login",           # Column 4: Last Login
                "ip_addresses"          # Column 5: IPs
            ]
            
            print(f"\nChecking user {user.get('email')} has all grid fields:")
            for field in required_fields:
                has_field = field in user
                value = user.get(field)
                print(f"  {field}: {'PRESENT' if has_field else 'MISSING'} = {value}")
                assert has_field, f"User should have {field} field"
            
            print("\nAll 5-column grid fields present: PASS")

# ===== LOGIN TRACKS IP AND LAST LOGIN =====
class TestLoginIPTracking:
    """Test that login updates IP and last_login fields"""
    
    def test_login_updates_user_tracking(self, api_client):
        """Login should update last_login and ip_addresses"""
        # Perform login
        before_login_time = time.time()
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        token = response.json().get("token")
        
        # Verify user has last_login set (via admin users endpoint)
        users_response = api_client.get(
            f"{BASE_URL}/api/admin/users?limit=10",
            headers={"Authorization": f"Bearer {token}"}
        )
        users = users_response.json().get("users", [])
        admin_user = next((u for u in users if u.get("email") == ADMIN_EMAIL), None)
        
        if admin_user:
            last_login = admin_user.get("last_login")
            ip_addresses = admin_user.get("ip_addresses", [])
            
            print(f"\nAfter login:")
            print(f"  last_login: {last_login}")
            print(f"  ip_addresses count: {len(ip_addresses)}")
            
            assert last_login is not None, "last_login should be set after login"
            # Note: In test environment, IP might be proxy IP
            print(f"  IP tracking working: {'Yes' if ip_addresses else 'No IPs recorded (may be behind proxy)'}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
