#!/usr/bin/env python3
"""
Test the full analysis endpoint with enhanced features
"""

import requests
import sys
import base64
import io
from datetime import datetime
from PIL import Image, ImageDraw, ImageFont

class FullAnalysisTest:
    def __init__(self, base_url="https://winrate-predict.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None

    def create_realistic_bet_slip_image(self):
        """Create a more realistic betting slip image with text"""
        # Create image
        img = Image.new('RGB', (400, 600), color='white')
        draw = ImageDraw.Draw(img)
        
        # Try to use a font, fallback to default if not available
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 16)
            small_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 12)
        except:
            font = ImageFont.load_default()
            small_font = ImageFont.load_default()
        
        # Draw bet slip content
        y_pos = 20
        
        # Header
        draw.text((20, y_pos), "DRAFTKINGS SPORTSBOOK", fill='black', font=font)
        y_pos += 40
        
        # Bet details
        draw.text((20, y_pos), "NFL - MONEYLINE", fill='black', font=font)
        y_pos += 30
        
        draw.text((20, y_pos), "Kansas City Chiefs", fill='black', font=font)
        y_pos += 20
        draw.text((20, y_pos), "vs Buffalo Bills", fill='black', font=small_font)
        y_pos += 30
        
        draw.text((20, y_pos), "Chiefs ML: +150", fill='black', font=font)
        y_pos += 40
        
        # Stake and payout
        draw.text((20, y_pos), "Stake: $100.00", fill='black', font=font)
        y_pos += 25
        draw.text((20, y_pos), "To Win: $150.00", fill='black', font=font)
        y_pos += 25
        draw.text((20, y_pos), "Total Payout: $250.00", fill='black', font=font)
        
        # Convert to bytes
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='JPEG')
        img_bytes.seek(0)
        
        return img_bytes.getvalue()

    def signup_and_login(self):
        """Create user and get token"""
        test_email = f"test_analysis_{datetime.now().strftime('%H%M%S')}@example.com"
        test_password = "TestPass123!"
        
        # Signup
        signup_data = {"email": test_email, "password": test_password}
        response = requests.post(f"{self.api_url}/auth/signup", json=signup_data)
        
        if response.status_code == 200:
            data = response.json()
            self.token = data['token']
            print(f"✅ User created and logged in")
            return True
        else:
            print(f"❌ Signup failed: {response.status_code}")
            return False

    def test_full_analysis(self):
        """Test the full analysis endpoint with enhanced features"""
        if not self.token:
            print("❌ No token available")
            return False

        print("\n🧠 Testing Full Analysis Endpoint with Enhanced Features")
        print("=" * 60)

        # Create realistic bet slip image
        image_data = self.create_realistic_bet_slip_image()
        
        files = {
            'file': ('chiefs_bills_bet.jpg', image_data, 'image/jpeg')
        }
        
        headers = {
            'Authorization': f'Bearer {self.token}'
        }
        
        print("🔍 Uploading bet slip for analysis...")
        response = requests.post(f"{self.api_url}/analyze", files=files, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Analysis completed successfully!")
            
            # Check all required fields
            required_fields = [
                'id', 'win_probability', 'analysis_text', 'confidence_score',
                'individual_bets', 'risk_factors', 'positive_factors',
                'expected_value', 'kelly_percentage', 'true_odds', 'recommendation'
            ]
            
            print("\n📊 Analysis Results:")
            print(f"   Win Probability: {data.get('win_probability', 'N/A')}%")
            print(f"   Confidence Score: {data.get('confidence_score', 'N/A')}/10")
            print(f"   Expected Value: {data.get('expected_value', 'N/A')}%")
            print(f"   Kelly Percentage: {data.get('kelly_percentage', 'N/A')}%")
            print(f"   True Odds: {data.get('true_odds', 'N/A')}")
            print(f"   Recommendation: {data.get('recommendation', 'N/A')}")
            
            # Check individual bets
            individual_bets = data.get('individual_bets', [])
            if individual_bets:
                print(f"\n🎯 Individual Bets ({len(individual_bets)}):")
                for i, bet in enumerate(individual_bets[:3]):  # Show first 3
                    print(f"   {i+1}. {bet.get('description', 'N/A')}")
                    print(f"      Odds: {bet.get('odds', 'N/A')}")
                    print(f"      Probability: {bet.get('individual_probability', 'N/A')}%")
            
            # Check risk factors
            risk_factors = data.get('risk_factors', [])
            if risk_factors:
                print(f"\n⚠️ Risk Factors ({len(risk_factors)}):")
                for factor in risk_factors[:3]:  # Show first 3
                    print(f"   - {factor}")
            
            # Check positive factors
            positive_factors = data.get('positive_factors', [])
            if positive_factors:
                print(f"\n✅ Positive Factors ({len(positive_factors)}):")
                for factor in positive_factors[:3]:  # Show first 3
                    print(f"   - {factor}")
            
            # Check if analysis includes enhanced data
            analysis_text = data.get('analysis_text', '')
            enhanced_indicators = [
                'injury', 'weather', 'form', 'record', 'recent', 'stats'
            ]
            
            found_indicators = [indicator for indicator in enhanced_indicators 
                             if indicator.lower() in analysis_text.lower()]
            
            if found_indicators:
                print(f"\n🔍 Enhanced Data Detected in Analysis:")
                print(f"   Found indicators: {', '.join(found_indicators)}")
            else:
                print(f"\n⚠️ No enhanced data indicators found in analysis")
            
            # Check missing fields
            missing_fields = [field for field in required_fields if field not in data]
            if missing_fields:
                print(f"\n❌ Missing fields: {missing_fields}")
                return False
            else:
                print(f"\n✅ All required fields present")
                return True
                
        else:
            print(f"❌ Analysis failed: {response.status_code}")
            print(f"   Response: {response.text[:200]}...")
            return False

def main():
    print("🚀 Starting Full Analysis Test")
    print("=" * 50)
    
    tester = FullAnalysisTest()
    
    # Step 1: Create user and login
    if not tester.signup_and_login():
        print("❌ Failed to create user")
        return 1
    
    # Step 2: Test full analysis
    if not tester.test_full_analysis():
        print("❌ Full analysis test failed")
        return 1
    
    print("\n🎉 Full analysis test completed successfully!")
    return 0

if __name__ == "__main__":
    sys.exit(main())