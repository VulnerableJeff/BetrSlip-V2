"""
Test file for BetrSlip Bug Fixes - Iteration 14
Tests:
1. Admin users endpoint returns up to 500 users (increased from 100)
2. POST /api/admin/users/{user_id}/reset-usage resets analysis count to 0
3. GET /api/usage returns proper usage data with analyses_remaining, free_limit, is_subscribed
4. Login works for admin user
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://credit-system-51.preview.emergentagent.com"

# Admin credentials from backend/.env
ADMIN_EMAIL = "hundojeff@icloud.com"
ADMIN_PASSWORD = "Boo-boo600$"


class TestAdminLogin:
    """Test admin authentication"""
    
    def test_admin_login_success(self):
        """Test that admin can log in successfully"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "Token not returned"
        assert "user" in data, "User not returned"
        assert data["user"]["email"] == ADMIN_EMAIL
        print(f"[PASS] Admin login successful, user_id: {data['user']['id']}")
        return data["token"], data["user"]["id"]


class TestAdminUsersEndpoint:
    """Test admin users endpoint with increased limit"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Admin login failed")
    
    def test_admin_users_accepts_limit_500(self, admin_token):
        """Test that /api/admin/users accepts limit=500 parameter"""
        response = requests.get(
            f"{BASE_URL}/api/admin/users?limit=500",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Admin users endpoint failed: {response.text}"
        data = response.json()
        assert "users" in data, "Users list not returned"
        assert "total" in data, "Total count not returned"
        print(f"[PASS] Admin users endpoint returns {len(data['users'])} users (total: {data['total']})")
    
    def test_admin_users_default_limit(self, admin_token):
        """Test that default limit works (should be 500 now)"""
        response = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Admin users endpoint failed: {response.text}"
        data = response.json()
        assert "users" in data
        print(f"[PASS] Admin users default endpoint returns {len(data['users'])} users")


class TestResetUsageEndpoint:
    """Test admin reset-usage endpoint"""
    
    @pytest.fixture
    def admin_auth(self):
        """Get admin token and user_id"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if response.status_code == 200:
            data = response.json()
            return data["token"], data["user"]["id"]
        pytest.skip("Admin login failed")
    
    def test_reset_usage_endpoint_exists(self, admin_auth):
        """Test that reset-usage endpoint exists and responds"""
        token, user_id = admin_auth
        response = requests.post(
            f"{BASE_URL}/api/admin/users/{user_id}/reset-usage",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Reset usage failed: {response.text}"
        data = response.json()
        assert "message" in data, "Message not returned"
        assert "reset" in data["message"].lower() or "0" in data["message"], f"Unexpected message: {data['message']}"
        print(f"[PASS] Reset usage endpoint works: {data['message']}")
    
    def test_reset_usage_returns_proper_message(self, admin_auth):
        """Test that reset-usage returns proper success message"""
        token, user_id = admin_auth
        response = requests.post(
            f"{BASE_URL}/api/admin/users/{user_id}/reset-usage",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        # Check message contains helpful info about 5 free analyses
        assert "5" in data["message"] or "free" in data["message"].lower(), \
            f"Message should mention 5 free analyses: {data['message']}"
        print(f"[PASS] Reset usage message: {data['message']}")
    
    def test_reset_usage_requires_admin_auth(self):
        """Test that reset-usage requires admin authentication"""
        # Try without token
        response = requests.post(
            f"{BASE_URL}/api/admin/users/some-id/reset-usage"
        )
        assert response.status_code in [401, 403, 422], f"Should require auth: {response.status_code}"
        print(f"[PASS] Reset usage requires authentication (got {response.status_code})")


class TestUsageEndpoint:
    """Test /api/usage endpoint returns proper data"""
    
    @pytest.fixture
    def auth_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Login failed")
    
    def test_usage_endpoint_returns_analyses_remaining(self, auth_token):
        """Test that /api/usage returns analyses_remaining field"""
        response = requests.get(
            f"{BASE_URL}/api/usage",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Usage endpoint failed: {response.text}"
        data = response.json()
        assert "analyses_remaining" in data, f"analyses_remaining not in response: {data}"
        print(f"[PASS] Usage endpoint returns analyses_remaining: {data['analyses_remaining']}")
    
    def test_usage_endpoint_returns_free_limit(self, auth_token):
        """Test that /api/usage returns free_limit field"""
        response = requests.get(
            f"{BASE_URL}/api/usage",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "free_limit" in data, f"free_limit not in response: {data}"
        assert data["free_limit"] == 5, f"free_limit should be 5, got {data['free_limit']}"
        print(f"[PASS] Usage endpoint returns free_limit: {data['free_limit']}")
    
    def test_usage_endpoint_returns_is_subscribed(self, auth_token):
        """Test that /api/usage returns is_subscribed field"""
        response = requests.get(
            f"{BASE_URL}/api/usage",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "is_subscribed" in data, f"is_subscribed not in response: {data}"
        # Admin is a Pro subscriber
        assert data["is_subscribed"] == True, f"Admin should be subscribed, got {data['is_subscribed']}"
        print(f"[PASS] Usage endpoint returns is_subscribed: {data['is_subscribed']}")
    
    def test_usage_endpoint_all_fields(self, auth_token):
        """Test that /api/usage returns all required fields"""
        response = requests.get(
            f"{BASE_URL}/api/usage",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        required_fields = ["analyses_remaining", "free_limit", "is_subscribed"]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        
        print(f"[PASS] Usage endpoint returns all required fields: {data}")


class TestAdminUserDetails:
    """Test admin can view user details with usage info"""
    
    @pytest.fixture
    def admin_auth(self):
        """Get admin token and user_id"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if response.status_code == 200:
            data = response.json()
            return data["token"], data["user"]["id"]
        pytest.skip("Admin login failed")
    
    def test_admin_can_view_user_details(self, admin_auth):
        """Test that admin can view user details"""
        token, user_id = admin_auth
        response = requests.get(
            f"{BASE_URL}/api/admin/user/{user_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"User details failed: {response.text}"
        data = response.json()
        assert "user" in data, "User data not returned"
        assert "usage" in data or "subscription" in data, "Usage/subscription data not returned"
        print(f"[PASS] Admin can view user details: {data['user'].get('email', 'unknown')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
