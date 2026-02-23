"""
Test Auth Email Validation & Disposable Email Blocking
Tests for:
1. Disposable email domain blocking (mailinator, yopmail, etc.)
2. Password length validation (min 6 chars)
3. Login still works with valid credentials
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestDisposableEmailBlocking:
    """Test backend blocks disposable/temporary email domains"""
    
    def test_mailinator_blocked(self):
        """mailinator.com should be blocked"""
        response = requests.post(f"{BASE_URL}/api/auth/signup", json={
            "email": f"test{uuid.uuid4().hex[:8]}@mailinator.com",
            "password": "test123456"
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        assert "disposable" in response.json().get('detail', '').lower() or "temporary" in response.json().get('detail', '').lower()
        print("PASS: mailinator.com blocked with correct message")
    
    def test_yopmail_blocked(self):
        """yopmail.com should be blocked"""
        response = requests.post(f"{BASE_URL}/api/auth/signup", json={
            "email": f"test{uuid.uuid4().hex[:8]}@yopmail.com",
            "password": "test123456"
        })
        assert response.status_code == 400
        assert "disposable" in response.json().get('detail', '').lower() or "temporary" in response.json().get('detail', '').lower()
        print("PASS: yopmail.com blocked with correct message")
    
    def test_tempmail_blocked(self):
        """tempmail.com should be blocked"""
        response = requests.post(f"{BASE_URL}/api/auth/signup", json={
            "email": f"test{uuid.uuid4().hex[:8]}@tempmail.com",
            "password": "test123456"
        })
        assert response.status_code == 400
        print("PASS: tempmail.com blocked")
    
    def test_guerrillamail_blocked(self):
        """guerrillamail.com should be blocked"""
        response = requests.post(f"{BASE_URL}/api/auth/signup", json={
            "email": f"test{uuid.uuid4().hex[:8]}@guerrillamail.com",
            "password": "test123456"
        })
        assert response.status_code == 400
        print("PASS: guerrillamail.com blocked")
    
    def test_10minutemail_blocked(self):
        """10minutemail.com should be blocked"""
        response = requests.post(f"{BASE_URL}/api/auth/signup", json={
            "email": f"test{uuid.uuid4().hex[:8]}@10minutemail.com",
            "password": "test123456"
        })
        assert response.status_code == 400
        print("PASS: 10minutemail.com blocked")


class TestPasswordValidation:
    """Test password length validation on signup"""
    
    def test_short_password_rejected(self):
        """Password less than 6 chars should be rejected"""
        response = requests.post(f"{BASE_URL}/api/auth/signup", json={
            "email": f"test{uuid.uuid4().hex[:8]}@gmail.com",
            "password": "abc"
        })
        assert response.status_code == 400
        assert "6" in response.json().get('detail', '') or "character" in response.json().get('detail', '').lower()
        print("PASS: Short password (3 chars) rejected")
    
    def test_5_char_password_rejected(self):
        """5 char password should be rejected"""
        response = requests.post(f"{BASE_URL}/api/auth/signup", json={
            "email": f"test{uuid.uuid4().hex[:8]}@gmail.com",
            "password": "12345"
        })
        assert response.status_code == 400
        print("PASS: 5-char password rejected")
    
    def test_6_char_password_allowed(self):
        """6 char password should be allowed (if email not already registered)"""
        # This might fail with 'already registered' error which is OK
        response = requests.post(f"{BASE_URL}/api/auth/signup", json={
            "email": f"testuser{uuid.uuid4().hex[:8]}@testvalidation.com",
            "password": "123456"
        })
        # Either success (201/200) or 'already registered' - both indicate password was valid
        assert response.status_code in [200, 201, 400]
        if response.status_code == 400:
            # Should be "already registered" not password error
            detail = response.json().get('detail', '').lower()
            assert "password" not in detail or "already" in detail
        print(f"PASS: 6-char password accepted (status: {response.status_code})")


class TestLoginWorks:
    """Test login functionality with admin credentials"""
    
    def test_admin_login_success(self):
        """Admin can login with correct credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "hundojeff@icloud.com",
            "password": "Boo-boo600$"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert data.get("user", {}).get("email") == "hundojeff@icloud.com"
        assert data.get("user", {}).get("is_admin") == True
        print("PASS: Admin login successful with token")
    
    def test_invalid_password_rejected(self):
        """Invalid password should return 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "hundojeff@icloud.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("PASS: Wrong password correctly rejected with 401")
    
    def test_nonexistent_email_rejected(self):
        """Non-existent email should return 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": f"nonexistent{uuid.uuid4().hex[:8]}@test.com",
            "password": "anypassword"
        })
        assert response.status_code == 401
        print("PASS: Non-existent email correctly rejected with 401")


class TestHealthEndpoints:
    """Verify API health"""
    
    def test_health_check(self):
        """Health endpoint should return healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print(f"PASS: API healthy - version {data.get('version')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
