"""
Tests for System Announcements and Quick Add Credits Features
Iteration 17 - BetrSlip Testing

Features tested:
1. GET /api/announcements - Get announcements for Pro user
2. POST /api/admin/announcements - Create new announcement
3. POST /api/announcements/{id}/dismiss - Dismiss announcement
4. POST /api/admin/users/{id}/add-credits - Quick add 25 credits to Pro users
5. GET /api/admin/announcements - Admin view all announcements
6. DELETE /api/admin/announcements/{id} - Admin delete announcement
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "hundojeff@icloud.com"
ADMIN_PASSWORD = "Boo-boo600$"


class TestAnnouncementsAndCredits:
    """Test System Announcements and Quick Add Credits features"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with admin authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if login_response.status_code == 200:
            self.token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
            user_data = login_response.json().get("user", {})
            self.user_id = user_data.get("id")
        else:
            pytest.skip(f"Admin login failed: {login_response.status_code}")
    
    # ===== BACKEND API TESTS =====
    
    def test_health_check(self):
        """Verify API is healthy"""
        response = self.session.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print(f"✓ Health check passed: {data['service']} v{data['version']}")
    
    def test_get_announcements_for_pro_user(self):
        """GET /api/announcements returns announcements for Pro user"""
        response = self.session.get(f"{BASE_URL}/api/announcements")
        assert response.status_code == 200
        data = response.json()
        assert "announcements" in data
        print(f"✓ GET /api/announcements returned {len(data['announcements'])} announcements")
        return data["announcements"]
    
    def test_create_announcement_admin(self):
        """POST /api/admin/announcements creates new announcement"""
        test_message = f"Test announcement {uuid.uuid4().hex[:8]}"
        
        response = self.session.post(f"{BASE_URL}/api/admin/announcements", json={
            "message": test_message,
            "type": "info",
            "target": "pro",  # Target Pro users only
            "dismissible": True,
            "show_modal": False
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["message"] == "Announcement created"
        print(f"✓ Created announcement: {data['id']}")
        return data["id"]
    
    def test_create_modal_announcement_admin(self):
        """POST /api/admin/announcements creates modal popup announcement"""
        test_message = f"Modal test {uuid.uuid4().hex[:8]}"
        
        response = self.session.post(f"{BASE_URL}/api/admin/announcements", json={
            "message": test_message,
            "type": "warning",
            "target": "pro",
            "dismissible": True,
            "show_modal": True  # Modal popup
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        print(f"✓ Created modal announcement: {data['id']}")
        return data["id"]
    
    def test_admin_get_all_announcements(self):
        """GET /api/admin/announcements returns all announcements"""
        response = self.session.get(f"{BASE_URL}/api/admin/announcements")
        assert response.status_code == 200
        data = response.json()
        assert "announcements" in data
        print(f"✓ Admin view: {len(data['announcements'])} total announcements")
        
        # Verify announcement structure
        if data["announcements"]:
            ann = data["announcements"][0]
            assert "id" in ann
            assert "message" in ann
            assert "type" in ann
            assert "target" in ann
            assert "is_active" in ann
            print(f"✓ Announcement structure verified: {ann['message'][:50]}...")
        
        return data["announcements"]
    
    def test_dismiss_announcement(self):
        """POST /api/announcements/{id}/dismiss marks as dismissed"""
        # First create an announcement to dismiss
        create_response = self.session.post(f"{BASE_URL}/api/admin/announcements", json={
            "message": f"Dismissible test {uuid.uuid4().hex[:8]}",
            "type": "info",
            "target": "all",
            "dismissible": True,
            "show_modal": False
        })
        ann_id = create_response.json().get("id")
        
        # Now dismiss it
        response = self.session.post(f"{BASE_URL}/api/announcements/{ann_id}/dismiss")
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Announcement dismissed"
        print(f"✓ Dismissed announcement: {ann_id}")
    
    def test_delete_announcement_admin(self):
        """DELETE /api/admin/announcements/{id} deactivates announcement"""
        # First create an announcement
        create_response = self.session.post(f"{BASE_URL}/api/admin/announcements", json={
            "message": f"Delete test {uuid.uuid4().hex[:8]}",
            "type": "info",
            "target": "all",
            "dismissible": True,
            "show_modal": False
        })
        ann_id = create_response.json().get("id")
        
        # Delete it
        response = self.session.delete(f"{BASE_URL}/api/admin/announcements/{ann_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Announcement deactivated"
        print(f"✓ Deleted announcement: {ann_id}")
    
    # ===== QUICK ADD CREDITS TESTS =====
    
    def test_admin_add_credits_to_user(self):
        """POST /api/admin/users/{id}/add-credits adds 25 credits"""
        # Get users list first
        users_response = self.session.get(f"{BASE_URL}/api/admin/users?limit=10")
        assert users_response.status_code == 200
        users = users_response.json().get("users", [])
        
        # Find a Pro user (or admin)
        pro_user = next((u for u in users if u.get("is_subscribed")), None)
        if not pro_user:
            pytest.skip("No Pro user found to test credits")
        
        user_id = pro_user["id"]
        
        # Add credits
        response = self.session.post(
            f"{BASE_URL}/api/admin/users/{user_id}/add-credits",
            json={"credits": 25}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "Added 25 bonus credits" in data["message"]
        print(f"✓ Added 25 credits to user {pro_user['email']}")
    
    def test_admin_add_custom_credits(self):
        """POST /api/admin/users/{id}/add-credits with custom amount"""
        # Get users list
        users_response = self.session.get(f"{BASE_URL}/api/admin/users?limit=10")
        users = users_response.json().get("users", [])
        
        pro_user = next((u for u in users if u.get("is_subscribed")), None)
        if not pro_user:
            pytest.skip("No Pro user found")
        
        user_id = pro_user["id"]
        
        # Add custom credits (10)
        response = self.session.post(
            f"{BASE_URL}/api/admin/users/{user_id}/add-credits",
            json={"credits": 10}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "Added 10 bonus credits" in data["message"]
        print(f"✓ Added 10 custom credits to user {pro_user['email']}")
    
    def test_usage_shows_bonus_credits(self):
        """GET /api/usage returns bonus_credits field"""
        response = self.session.get(f"{BASE_URL}/api/usage")
        assert response.status_code == 200
        data = response.json()
        
        assert "bonus_credits" in data
        assert "monthly_limit" in data
        assert "analyses_remaining" in data
        print(f"✓ Usage shows bonus_credits: {data['bonus_credits']}, remaining: {data['analyses_remaining']}")
    
    # ===== ADMIN USERS LIST TESTS =====
    
    def test_admin_users_list_includes_subscription_info(self):
        """GET /api/admin/users returns users with subscription status"""
        response = self.session.get(f"{BASE_URL}/api/admin/users?limit=20")
        assert response.status_code == 200
        data = response.json()
        
        assert "users" in data
        assert "total" in data
        
        # Check user structure
        if data["users"]:
            user = data["users"][0]
            assert "id" in user
            assert "email" in user
            assert "is_subscribed" in user or "is_banned" in user
            
            # Count Pro users
            pro_users = [u for u in data["users"] if u.get("is_subscribed")]
            free_users = [u for u in data["users"] if not u.get("is_subscribed") and not u.get("is_banned")]
            print(f"✓ Users list: {len(pro_users)} Pro, {len(free_users)} Free, {data['total']} total")


class TestAnnouncementTargeting:
    """Test announcement targeting (all/pro/free users)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with admin authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if login_response.status_code == 200:
            self.token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip(f"Admin login failed")
    
    def test_create_all_users_announcement(self):
        """Create announcement targeting all users"""
        response = self.session.post(f"{BASE_URL}/api/admin/announcements", json={
            "message": "Announcement for ALL users",
            "type": "info",
            "target": "all",
            "dismissible": True,
            "show_modal": False
        })
        
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Created 'all' target announcement: {data['id']}")
    
    def test_create_pro_only_announcement(self):
        """Create announcement targeting Pro users only"""
        response = self.session.post(f"{BASE_URL}/api/admin/announcements", json={
            "message": "Pro-only announcement test",
            "type": "success",
            "target": "pro",
            "dismissible": True,
            "show_modal": True
        })
        
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Created 'pro' target modal announcement: {data['id']}")
    
    def test_create_free_only_announcement(self):
        """Create announcement targeting Free users only"""
        response = self.session.post(f"{BASE_URL}/api/admin/announcements", json={
            "message": "Free users special offer",
            "type": "warning",
            "target": "free",
            "dismissible": True,
            "show_modal": False
        })
        
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Created 'free' target announcement: {data['id']}")
    
    def test_verify_announcement_types(self):
        """Verify admin can see all announcement types and targets"""
        response = self.session.get(f"{BASE_URL}/api/admin/announcements")
        assert response.status_code == 200
        announcements = response.json().get("announcements", [])
        
        # Group by target
        targets = {}
        for ann in announcements:
            target = ann.get("target", "all")
            targets[target] = targets.get(target, 0) + 1
        
        print(f"✓ Announcement targets: {targets}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
