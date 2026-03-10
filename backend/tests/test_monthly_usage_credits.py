"""
Tests for Monthly Usage Limit and Credit System Features
- Monthly usage tracking for Pro users (100/month limit)
- Credit pack purchase via Stripe ($3 for 25 credits)
- Admin actions: Grant Pro, Reset Usage, Add Credits, Ban, Delete
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials
ADMIN_EMAIL = "hundojeff@icloud.com"
ADMIN_PASSWORD = "Boo-boo600$"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    return response.json()["token"]


@pytest.fixture(scope="module")
def admin_user_id(admin_token):
    """Get admin user ID"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    return response.json()["user"]["id"]


class TestMonthlyUsageEndpoint:
    """Tests for GET /api/usage endpoint - monthly tracking"""
    
    def test_usage_returns_monthly_fields(self, admin_token):
        """Verify usage endpoint returns monthly tracking fields"""
        response = requests.get(
            f"{BASE_URL}/api/usage",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Required fields for monthly tracking
        assert "monthly_used" in data
        assert "monthly_limit" in data
        assert "bonus_credits" in data
        assert "analyses_remaining" in data
        assert "is_subscribed" in data
        assert "current_month" in data
    
    def test_pro_user_has_100_monthly_limit(self, admin_token):
        """Pro user should have 100 analyses per month"""
        response = requests.get(
            f"{BASE_URL}/api/usage",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Admin is Pro user
        assert data["is_subscribed"] == True
        assert data["monthly_limit"] == 100
    
    def test_usage_tracks_bonus_credits(self, admin_token):
        """Verify bonus_credits field exists and is a number"""
        response = requests.get(
            f"{BASE_URL}/api/usage",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "bonus_credits" in data
        assert isinstance(data["bonus_credits"], int)


class TestCreditPurchaseEndpoint:
    """Tests for POST /api/credits/purchase endpoint"""
    
    def test_credits_purchase_requires_auth(self):
        """Credit purchase requires authentication"""
        response = requests.post(f"{BASE_URL}/api/credits/purchase")
        assert response.status_code in [401, 403, 422]
    
    def test_credits_purchase_returns_stripe_url(self, admin_token):
        """Credit purchase returns Stripe checkout URL for Pro users"""
        response = requests.post(
            f"{BASE_URL}/api/credits/purchase",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"origin_url": "https://credit-system-51.preview.emergentagent.com"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "url" in data
        assert "session_id" in data
        assert "stripe.com" in data["url"]


class TestAdminUserManagement:
    """Tests for admin user management endpoints"""
    
    def test_admin_users_endpoint(self, admin_token):
        """GET /api/admin/users returns user list"""
        response = requests.get(
            f"{BASE_URL}/api/admin/users?limit=10",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "users" in data
        assert "total" in data
        assert isinstance(data["users"], list)
    
    def test_admin_users_have_subscription_info(self, admin_token):
        """User list includes subscription status"""
        response = requests.get(
            f"{BASE_URL}/api/admin/users?limit=10",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        if data["users"]:
            user = data["users"][0]
            assert "is_subscribed" in user
            assert "is_banned" in user


class TestAdminActions:
    """Tests for admin action endpoints"""
    
    @pytest.fixture(scope="class")
    def test_user(self, admin_token):
        """Get a test user to perform actions on"""
        response = requests.get(
            f"{BASE_URL}/api/admin/users?limit=10",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        data = response.json()
        # Find a non-admin user
        for user in data["users"]:
            if user["email"] != ADMIN_EMAIL:
                return user
        return None
    
    def test_grant_subscription_endpoint(self, admin_token, test_user):
        """POST /api/admin/users/{id}/grant-subscription works"""
        if not test_user:
            pytest.skip("No test user available")
        
        response = requests.post(
            f"{BASE_URL}/api/admin/users/{test_user['id']}/grant-subscription",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        assert "granted" in response.json()["message"].lower() or "Pro" in response.json()["message"]
    
    def test_reset_usage_endpoint(self, admin_token, test_user):
        """POST /api/admin/users/{id}/reset-usage works"""
        if not test_user:
            pytest.skip("No test user available")
        
        response = requests.post(
            f"{BASE_URL}/api/admin/users/{test_user['id']}/reset-usage",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        assert "reset" in response.json()["message"].lower()
    
    def test_add_credits_endpoint(self, admin_token, test_user):
        """POST /api/admin/users/{id}/add-credits works"""
        if not test_user:
            pytest.skip("No test user available")
        
        response = requests.post(
            f"{BASE_URL}/api/admin/users/{test_user['id']}/add-credits",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"credits": 25}
        )
        assert response.status_code == 200
        assert "25" in response.json()["message"] or "credits" in response.json()["message"].lower()
    
    def test_ban_and_unban_endpoints(self, admin_token, test_user):
        """POST /api/admin/users/{id}/ban and /unban work"""
        if not test_user:
            pytest.skip("No test user available")
        
        # Ban user
        ban_response = requests.post(
            f"{BASE_URL}/api/admin/users/{test_user['id']}/ban",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"reason": "Test ban for regression testing"}
        )
        assert ban_response.status_code == 200
        assert "banned" in ban_response.json()["message"].lower()
        
        # Unban user
        unban_response = requests.post(
            f"{BASE_URL}/api/admin/users/{test_user['id']}/unban",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert unban_response.status_code == 200
        assert "unbanned" in unban_response.json()["message"].lower()


class TestHealthEndpoints:
    """Basic health checks"""
    
    def test_api_health(self):
        """API health endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
    
    def test_root_health(self):
        """Root health endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/health")
        assert response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
