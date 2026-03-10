"""
Test Suite for Support Contact Feature
Tests: POST/GET support messages, admin support management endpoints
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://credit-system-51.preview.emergentagent.com').rstrip('/')

# Admin credentials from env
ADMIN_EMAIL = 'hundojeff@icloud.com'
ADMIN_PASSWORD = 'Boo-boo600$'

# Test user for support messages
TEST_USER_EMAIL = f'testuser_support_{uuid.uuid4().hex[:8]}@example.com'
TEST_USER_PASSWORD = 'TestPass123!'


class TestPublicStats:
    """Test /api/public-stats endpoint for landing page"""
    
    def test_public_stats_returns_pro_users(self):
        """Verify public-stats includes pro_users count"""
        response = requests.get(f"{BASE_URL}/api/public-stats")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "pro_users" in data, "Response should include pro_users field"
        assert isinstance(data["pro_users"], int), "pro_users should be an integer"
        assert data["pro_users"] >= 0, "pro_users should be non-negative"
        print(f"✓ public-stats returns pro_users: {data['pro_users']}")
        
    def test_public_stats_structure(self):
        """Verify public-stats response structure"""
        response = requests.get(f"{BASE_URL}/api/public-stats")
        assert response.status_code == 200
        
        data = response.json()
        required_fields = ['total_users', 'total_analyses', 'pro_users', 'active_now']
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        print(f"✓ public-stats structure complete: {list(data.keys())}")


class TestSupportEndpointsAuth:
    """Test support endpoints require authentication"""
    
    def test_support_message_requires_auth(self):
        """POST /api/support/message should require auth"""
        response = requests.post(
            f"{BASE_URL}/api/support/message",
            json={"subject": "Test", "message": "Test message"}
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ POST /api/support/message requires authentication")
        
    def test_support_messages_requires_auth(self):
        """GET /api/support/messages should require auth"""
        response = requests.get(f"{BASE_URL}/api/support/messages")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ GET /api/support/messages requires authentication")


class TestSupportEndpointsWithAuth:
    """Test support endpoints with authenticated user"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        # Login as admin for testing
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if response.status_code != 200:
            pytest.skip(f"Login failed: {response.status_code}")
        
        self.token = response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
        print(f"✓ Logged in as {ADMIN_EMAIL}")
    
    def test_create_support_message_success(self):
        """POST /api/support/message creates message"""
        test_subject = f"Test Subject {uuid.uuid4().hex[:6]}"
        test_message = "This is a test support message for testing purposes."
        
        response = requests.post(
            f"{BASE_URL}/api/support/message",
            headers=self.headers,
            json={"subject": test_subject, "message": test_message}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should include success message"
        assert "id" in data, "Response should include message id"
        print(f"✓ Support message created with id: {data['id']}")
        
        return data["id"]
    
    def test_create_support_message_validation(self):
        """POST /api/support/message validates empty fields"""
        # Empty subject
        response = requests.post(
            f"{BASE_URL}/api/support/message",
            headers=self.headers,
            json={"subject": "", "message": "Test message"}
        )
        assert response.status_code == 400, f"Expected 400 for empty subject, got {response.status_code}"
        print("✓ Empty subject correctly rejected")
        
        # Empty message
        response = requests.post(
            f"{BASE_URL}/api/support/message",
            headers=self.headers,
            json={"subject": "Test", "message": ""}
        )
        assert response.status_code == 400, f"Expected 400 for empty message, got {response.status_code}"
        print("✓ Empty message correctly rejected")
        
        # Whitespace only
        response = requests.post(
            f"{BASE_URL}/api/support/message",
            headers=self.headers,
            json={"subject": "   ", "message": "   "}
        )
        assert response.status_code == 400, f"Expected 400 for whitespace, got {response.status_code}"
        print("✓ Whitespace-only fields correctly rejected")
    
    def test_get_user_support_messages(self):
        """GET /api/support/messages returns user's messages"""
        # First create a message
        test_subject = f"Test Message {uuid.uuid4().hex[:6]}"
        requests.post(
            f"{BASE_URL}/api/support/message",
            headers=self.headers,
            json={"subject": test_subject, "message": "Test content"}
        )
        
        # Now get messages
        response = requests.get(
            f"{BASE_URL}/api/support/messages",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "messages" in data, "Response should include messages array"
        assert isinstance(data["messages"], list), "messages should be a list"
        print(f"✓ GET /api/support/messages returns {len(data['messages'])} messages")


class TestAdminSupportEndpoints:
    """Test admin support management endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin and get token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.status_code}")
        
        self.token = response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
        print(f"✓ Logged in as admin: {ADMIN_EMAIL}")
    
    def test_admin_get_support_messages(self):
        """GET /api/admin/support-messages returns all messages"""
        response = requests.get(
            f"{BASE_URL}/api/admin/support-messages",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "messages" in data, "Response should include messages"
        assert "unread_count" in data, "Response should include unread_count"
        print(f"✓ Admin got {len(data['messages'])} support messages, {data['unread_count']} unread")
    
    def test_admin_mark_message_read(self):
        """POST /api/admin/support-messages/{id}/read marks message as read"""
        # First create a message
        test_subject = f"Mark Read Test {uuid.uuid4().hex[:6]}"
        create_response = requests.post(
            f"{BASE_URL}/api/support/message",
            headers=self.headers,
            json={"subject": test_subject, "message": "Test for mark read"}
        )
        assert create_response.status_code == 200
        message_id = create_response.json()["id"]
        
        # Mark as read
        response = requests.post(
            f"{BASE_URL}/api/admin/support-messages/{message_id}/read",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"✓ Message {message_id} marked as read")
    
    def test_admin_reply_to_message(self):
        """POST /api/admin/support-messages/{id}/reply sends reply"""
        # First create a message
        test_subject = f"Reply Test {uuid.uuid4().hex[:6]}"
        create_response = requests.post(
            f"{BASE_URL}/api/support/message",
            headers=self.headers,
            json={"subject": test_subject, "message": "Test for reply"}
        )
        assert create_response.status_code == 200
        message_id = create_response.json()["id"]
        
        # Send reply
        reply_text = "This is an admin reply to your message."
        response = requests.post(
            f"{BASE_URL}/api/admin/support-messages/{message_id}/reply",
            headers=self.headers,
            json={"reply": reply_text}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✓ Admin replied to message {message_id}")
        
        # Verify reply is visible in user's messages
        messages_response = requests.get(
            f"{BASE_URL}/api/support/messages",
            headers=self.headers
        )
        assert messages_response.status_code == 200
        messages = messages_response.json()["messages"]
        
        # Find the message with the reply
        replied_msg = next((m for m in messages if m.get("id") == message_id), None)
        assert replied_msg is not None, "Message not found in user's messages"
        assert replied_msg.get("admin_reply") == reply_text, "Reply text not saved correctly"
        assert replied_msg.get("status") == "replied", "Status should be 'replied'"
        print(f"✓ Reply verified in user's messages: status={replied_msg.get('status')}")
    
    def test_admin_delete_message(self):
        """DELETE /api/admin/support-messages/{id} deletes message"""
        # First create a message
        test_subject = f"Delete Test {uuid.uuid4().hex[:6]}"
        create_response = requests.post(
            f"{BASE_URL}/api/support/message",
            headers=self.headers,
            json={"subject": test_subject, "message": "Test for deletion"}
        )
        assert create_response.status_code == 200
        message_id = create_response.json()["id"]
        
        # Delete message
        response = requests.delete(
            f"{BASE_URL}/api/admin/support-messages/{message_id}",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"✓ Message {message_id} deleted")
        
        # Verify deletion
        messages_response = requests.get(
            f"{BASE_URL}/api/admin/support-messages",
            headers=self.headers
        )
        messages = messages_response.json()["messages"]
        deleted_msg = next((m for m in messages if m.get("id") == message_id), None)
        assert deleted_msg is None, "Deleted message should not appear in list"
        print("✓ Verified message no longer in admin list")
    
    def test_admin_support_requires_admin(self):
        """Verify admin endpoints require admin role"""
        # Try to access without token
        response = requests.get(f"{BASE_URL}/api/admin/support-messages")
        assert response.status_code in [401, 403], f"Expected 401/403 without token, got {response.status_code}"
        print("✓ Admin support endpoints require authentication")


class TestHealthEndpoint:
    """Test health endpoint is accessible"""
    
    def test_health_check(self):
        """GET /api/health returns healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("✓ Health check passed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
