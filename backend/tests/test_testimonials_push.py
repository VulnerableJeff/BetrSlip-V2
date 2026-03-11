"""
Test suite for User Testimonials and Push Notifications features
Iteration 18 - Tests POST/GET testimonials and push notification endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')

# Admin credentials
ADMIN_EMAIL = "hundojeff@icloud.com"
ADMIN_PASSWORD = "Boo-boo600$"


class TestAuth:
    """Get auth token for testing"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Login as admin and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        # API returns 'token' not 'access_token'
        assert "token" in data, "No token in response"
        return data["token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        """Auth headers for API requests"""
        return {"Authorization": f"Bearer {admin_token}"}


class TestTestimonialsAPI(TestAuth):
    """User Testimonials API tests"""
    
    def test_get_approved_testimonials_public(self):
        """GET /api/testimonials/approved - should be public and return testimonials"""
        response = requests.get(f"{BASE_URL}/api/testimonials/approved")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "testimonials" in data, "No testimonials field in response"
        assert isinstance(data["testimonials"], list), "testimonials should be a list"
        print(f"✓ Found {len(data['testimonials'])} approved testimonials")
        
        # If there are approved testimonials, verify structure
        if len(data["testimonials"]) > 0:
            testimonial = data["testimonials"][0]
            assert "rating" in testimonial, "rating field missing"
            assert "message" in testimonial, "message field missing"
            assert "user_email" in testimonial, "user_email field missing"
            # Should be anonymized (ends with ***)
            assert testimonial["user_email"].endswith("***"), f"Email not anonymized: {testimonial['user_email']}"
            print(f"✓ Testimonial structure verified: {testimonial['user_email']} - {testimonial['rating']} stars")
    
    def test_post_testimonial_requires_auth(self):
        """POST /api/testimonials - should require authentication (401 or 403)"""
        response = requests.post(f"{BASE_URL}/api/testimonials", json={
            "rating": 5,
            "message": "Test testimonial"
        })
        # API returns 403 for missing auth (FastAPI behavior)
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ POST /api/testimonials requires authentication")
    
    def test_post_testimonial_as_pro_user(self, auth_headers):
        """POST /api/testimonials - Pro user can submit testimonial"""
        response = requests.post(f"{BASE_URL}/api/testimonials", json={
            "rating": 5,
            "message": "TEST_Amazing platform! Won $350 on my first parlay.",
            "win_amount": "$350"
        }, headers=auth_headers)
        
        # Should succeed (200 or 201) for Pro users
        assert response.status_code in [200, 201], f"Failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "message" in data or "id" in data, "Missing expected response fields"
        print(f"✓ Pro user can submit testimonial - Response: {data}")
    
    def test_admin_get_all_testimonials(self, auth_headers):
        """GET /api/admin/testimonials - Admin can see all testimonials"""
        response = requests.get(f"{BASE_URL}/api/admin/testimonials", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "testimonials" in data, "No testimonials field"
        print(f"✓ Admin sees {len(data['testimonials'])} total testimonials (all statuses)")
        
        # Check for different statuses
        pending = [t for t in data['testimonials'] if t.get('status') == 'pending']
        approved = [t for t in data['testimonials'] if t.get('status') == 'approved']
        rejected = [t for t in data['testimonials'] if t.get('status') == 'rejected']
        print(f"  - Pending: {len(pending)}, Approved: {len(approved)}, Rejected: {len(rejected)}")
        
        return data['testimonials']
    
    def test_approved_testimonial_has_required_fields(self):
        """Verify approved testimonials have all display fields"""
        response = requests.get(f"{BASE_URL}/api/testimonials/approved")
        assert response.status_code == 200
        data = response.json()
        
        if len(data["testimonials"]) > 0:
            t = data["testimonials"][0]
            # Check for display fields
            assert "user_email" in t
            assert "rating" in t
            assert "message" in t
            assert 1 <= t["rating"] <= 5, f"Rating out of range: {t['rating']}"
            # win_amount is optional
            print(f"✓ Approved testimonial verified: {t['user_email']} rated {t['rating']} stars")
            if t.get("win_amount"):
                print(f"  - Win amount badge: {t['win_amount']}")
        else:
            print("⚠ No approved testimonials to verify structure")


class TestPushNotificationsAPI(TestAuth):
    """Push Notifications API tests"""
    
    def test_push_status_requires_auth(self):
        """GET /api/push/status - should require authentication (401 or 403)"""
        response = requests.get(f"{BASE_URL}/api/push/status")
        # API returns 403 for missing auth (FastAPI behavior)
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ GET /api/push/status requires authentication")
    
    def test_get_push_status(self, auth_headers):
        """GET /api/push/status - returns enabled status for authenticated user"""
        response = requests.get(f"{BASE_URL}/api/push/status", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "enabled" in data, "No enabled field in response"
        assert isinstance(data["enabled"], bool), "enabled should be boolean"
        print(f"✓ Push status: enabled={data['enabled']}")
    
    def test_subscribe_push_notifications(self, auth_headers):
        """POST /api/push/subscribe - enables push notifications"""
        response = requests.post(f"{BASE_URL}/api/push/subscribe", json={
            "endpoint": "browser-notification",
            "keys": {"browser": True}
        }, headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "message" in data, "No message in response"
        print(f"✓ Subscribe response: {data['message']}")
    
    def test_verify_push_enabled_after_subscribe(self, auth_headers):
        """Verify push is enabled after subscribing"""
        response = requests.get(f"{BASE_URL}/api/push/status", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["enabled"] == True, f"Expected enabled=True after subscribe, got {data['enabled']}"
        print("✓ Push notifications verified as enabled")
    
    def test_get_pending_notifications(self, auth_headers):
        """GET /api/push/pending - returns pending notifications"""
        response = requests.get(f"{BASE_URL}/api/push/pending", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "notifications" in data, "No notifications field"
        assert isinstance(data["notifications"], list), "notifications should be a list"
        print(f"✓ Pending notifications: {len(data['notifications'])} items")
    
    def test_unsubscribe_push_notifications(self, auth_headers):
        """POST /api/push/unsubscribe - disables push notifications"""
        response = requests.post(f"{BASE_URL}/api/push/unsubscribe", json={}, headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "message" in data
        print(f"✓ Unsubscribe response: {data['message']}")
    
    def test_verify_push_disabled_after_unsubscribe(self, auth_headers):
        """Verify push is disabled after unsubscribing"""
        response = requests.get(f"{BASE_URL}/api/push/status", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["enabled"] == False, f"Expected enabled=False after unsubscribe, got {data['enabled']}"
        print("✓ Push notifications verified as disabled")
    
    def test_re_enable_push_for_testing(self, auth_headers):
        """Re-enable push for future testing"""
        response = requests.post(f"{BASE_URL}/api/push/subscribe", json={
            "endpoint": "browser-notification",
            "keys": {"browser": True}
        }, headers=auth_headers)
        assert response.status_code == 200
        print("✓ Push notifications re-enabled for testing")


class TestLandingPageAPI:
    """Landing page testimonials integration"""
    
    def test_landing_page_loads(self):
        """Verify landing page is accessible"""
        response = requests.get(BASE_URL)
        assert response.status_code == 200, f"Landing page failed: {response.status_code}"
        print("✓ Landing page loads successfully")
    
    def test_public_stats_endpoint(self):
        """GET /api/public-stats - needed for landing page"""
        response = requests.get(f"{BASE_URL}/api/public-stats")
        assert response.status_code == 200, f"Public stats failed: {response.text}"
        print("✓ Public stats endpoint working")


class TestAdminTestimonialsActions(TestAuth):
    """Admin actions for testimonials"""
    
    def test_admin_can_approve_testimonial(self, auth_headers):
        """Admin approve testimonial flow"""
        # First get all testimonials
        response = requests.get(f"{BASE_URL}/api/admin/testimonials", headers=auth_headers)
        assert response.status_code == 200
        testimonials = response.json()["testimonials"]
        
        # Find a pending one to approve (or use any)
        if testimonials:
            test_id = testimonials[0]["id"]
            # Approve it
            approve_response = requests.post(
                f"{BASE_URL}/api/admin/testimonials/{test_id}/approve",
                json={},
                headers=auth_headers
            )
            assert approve_response.status_code == 200, f"Approve failed: {approve_response.text}"
            print(f"✓ Admin approved testimonial {test_id}")
        else:
            print("⚠ No testimonials to approve")
    
    def test_admin_can_reject_testimonial(self, auth_headers):
        """Admin reject testimonial flow"""
        # Create a new test testimonial first
        create_response = requests.post(f"{BASE_URL}/api/testimonials", json={
            "rating": 3,
            "message": "TEST_For rejection test - will be rejected",
            "win_amount": None
        }, headers=auth_headers)
        
        if create_response.status_code in [200, 201]:
            # Get its ID
            response = requests.get(f"{BASE_URL}/api/admin/testimonials", headers=auth_headers)
            testimonials = response.json()["testimonials"]
            test_testimonial = next((t for t in testimonials if "rejection test" in t.get("message", "")), None)
            
            if test_testimonial:
                reject_response = requests.post(
                    f"{BASE_URL}/api/admin/testimonials/{test_testimonial['id']}/reject",
                    json={},
                    headers=auth_headers
                )
                assert reject_response.status_code == 200, f"Reject failed: {reject_response.text}"
                print(f"✓ Admin rejected testimonial")
            else:
                print("⚠ Could not find test testimonial for rejection")
        else:
            print(f"⚠ Could not create test testimonial: {create_response.status_code}")
