#!/usr/bin/env python3
"""
Comprehensive test for BetrSlip Real-Time Intelligence feature
Tests the integration of injuries, weather, and team form data in analysis
"""

import asyncio
import sys
import os
import requests
import json
from datetime import datetime

# Add backend to path
sys.path.append('/app/backend')

from injury_weather_service import InjuryWeatherService, get_enhanced_game_context
from sports_data_service import SportsDataService, get_enhanced_context_for_analysis

class RealTimeIntelligenceTest:
    def __init__(self):
        self.base_url = "https://win-predictor-35.preview.emergentagent.com"
        self.api_url = f"{self.base_url}/api"
        self.token = None
        
    async def test_injury_data_integration(self):
        """Test injury data fetching and formatting"""
        print("🏥 Testing Injury Data Integration")
        print("=" * 50)
        
        test_teams = ['chiefs', 'bills']
        all_injuries = []
        
        for team in test_teams:
            print(f"\n🔍 Testing {team.upper()}...")
            injuries = await InjuryWeatherService.get_injuries_for_team(team)
            
            if injuries:
                print(f"✅ Found {len(injuries)} injuries")
                for injury in injuries[:2]:  # Show first 2
                    print(f"   - {injury['player']} ({injury['position']}): {injury['status']} - {injury['injury']}")
                    
                # Add team name to injuries (as done in server.py)
                team_injuries = [{**inj, 'team': team.title()} for inj in injuries]
                all_injuries.extend(team_injuries)
            else:
                print(f"⚠️  No injuries found for {team}")
        
        print(f"\n📊 Total injuries collected: {len(all_injuries)}")
        return all_injuries
    
    async def test_weather_data_integration(self):
        """Test weather data fetching"""
        print("\n🌤️ Testing Weather Data Integration")
        print("=" * 50)
        
        test_teams = ['chiefs', 'bills', 'cowboys']  # Mix of outdoor and indoor
        weather_data = None
        
        for team in test_teams:
            print(f"\n🔍 Testing weather for {team.upper()}...")
            weather = await InjuryWeatherService.get_weather_for_game(team)
            
            if weather:
                if 'note' in weather:
                    print(f"ℹ️  {weather['note']}")
                else:
                    print(f"✅ Weather data:")
                    print(f"   - Temperature: {weather.get('temp', 'N/A')}°F")
                    print(f"   - Conditions: {weather.get('conditions', 'N/A')}")
                    print(f"   - Wind: {weather.get('wind_speed', 'N/A')} mph")
                    print(f"   - Humidity: {weather.get('humidity', 'N/A')}%")
                    
                    if not weather_data and 'note' not in weather:
                        weather_data = weather  # Use first outdoor stadium weather
            else:
                print(f"❌ No weather data for {team}")
        
        return weather_data
    
    async def test_team_form_integration(self):
        """Test team form and stats integration"""
        print("\n📊 Testing Team Form Integration")
        print("=" * 50)
        
        test_teams = ['chiefs', 'bills']
        team_form_data = []
        
        for team in test_teams:
            print(f"\n🔍 Testing form for {team.upper()}...")
            
            # Get recent games
            recent_games = await SportsDataService.get_recent_games(team, limit=5)
            if recent_games:
                print(f"✅ Found {len(recent_games)} recent games")
                
                # Calculate form
                form = SportsDataService.calculate_form_rating(recent_games)
                print(f"   Form: {form['form']} ({form['rating']})")
                print(f"   Record: {form['wins']}-{form['losses']}")
                print(f"   Avg margin: {form['avg_margin']}")
                
                # Get team record
                record = await SportsDataService.get_team_record(team)
                
                team_form_entry = {
                    'team': record.get('team_name', team.title()) if record else team.title(),
                    'record': record.get('overall', 'N/A') if record else 'N/A',
                    'form': form.get('form', ''),
                    'rating': form.get('rating', 'Unknown'),
                    'avg_margin': form.get('avg_margin', 0),
                    'recent': [f"{g['result']} vs {g['opponent']}" for g in recent_games[:3]]
                }
                team_form_data.append(team_form_entry)
                
                print(f"   Recent games:")
                for game in recent_games[:3]:
                    print(f"      {game['result']} vs {game['opponent']} ({game['score']})")
            else:
                print(f"⚠️  No recent games found for {team}")
        
        return team_form_data
    
    async def test_enhanced_context_generation(self):
        """Test the enhanced context generation"""
        print("\n🧠 Testing Enhanced Context Generation")
        print("=" * 50)
        
        test_bet_details = "Kansas City Chiefs vs Buffalo Bills moneyline bet"
        
        print(f"🔍 Testing context for: '{test_bet_details}'")
        
        # Test team extraction
        teams = SportsDataService.extract_team_names(test_bet_details)
        print(f"✅ Extracted teams: {teams}")
        
        # Test enhanced context
        context = await get_enhanced_context_for_analysis([], test_bet_details)
        print(f"✅ Enhanced context generated ({len(context)} characters)")
        
        # Test injury/weather context
        injury_weather_context = await get_enhanced_game_context(teams)
        print(f"✅ Injury/weather context generated ({len(injury_weather_context)} characters)")
        
        return {
            'teams': teams,
            'context_length': len(context),
            'injury_weather_length': len(injury_weather_context),
            'context_preview': context[:200] + "..." if len(context) > 200 else context
        }
    
    def authenticate(self):
        """Get authentication token"""
        test_email = f"intelligence_test_{datetime.now().strftime('%H%M%S')}@example.com"
        test_password = "TestPass123!"
        
        # Signup
        signup_data = {"email": test_email, "password": test_password}
        response = requests.post(f"{self.api_url}/auth/signup", json=signup_data)
        
        if response.status_code == 200:
            data = response.json()
            self.token = data['token']
            print(f"✅ Authentication successful")
            return True
        else:
            print(f"❌ Authentication failed: {response.status_code}")
            return False
    
    def test_api_response_structure(self):
        """Test that API returns the expected structure"""
        print("\n🔍 Testing API Response Structure")
        print("=" * 50)
        
        if not self.token:
            print("❌ No authentication token")
            return False
        
        # Create a simple test image
        from PIL import Image
        import io
        import base64
        
        img = Image.new('RGB', (400, 600), color='white')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='JPEG')
        img_bytes.seek(0)
        
        files = {
            'file': ('test_bet_slip.jpg', img_bytes.getvalue(), 'image/jpeg')
        }
        
        headers = {'Authorization': f'Bearer {self.token}'}
        
        response = requests.post(f"{self.api_url}/analyze", files=files, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            
            # Check for real-time intelligence fields
            required_fields = ['injuries_data', 'weather_data', 'team_form_data']
            
            print("✅ API Response Structure Test:")
            for field in required_fields:
                if field in data:
                    print(f"   ✅ {field}: Present")
                    if data[field] is not None:
                        print(f"      - Has data: {type(data[field])}")
                    else:
                        print(f"      - Null (expected for test image)")
                else:
                    print(f"   ❌ {field}: Missing")
            
            return True
        else:
            print(f"❌ API call failed: {response.status_code}")
            return False

async def main():
    """Run comprehensive real-time intelligence tests"""
    print("🚀 BetrSlip Real-Time Intelligence Comprehensive Test")
    print("=" * 60)
    
    tester = RealTimeIntelligenceTest()
    
    # Test backend services
    print("🔧 Testing Backend Services...")
    injuries = await tester.test_injury_data_integration()
    weather = await tester.test_weather_data_integration()
    team_forms = await tester.test_team_form_integration()
    context_info = await tester.test_enhanced_context_generation()
    
    # Test API integration
    print("\n🌐 Testing API Integration...")
    if tester.authenticate():
        api_success = tester.test_api_response_structure()
    else:
        api_success = False
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 COMPREHENSIVE TEST SUMMARY")
    print("=" * 60)
    
    results = {
        "Injury Data": len(injuries) > 0,
        "Weather Data": weather is not None,
        "Team Form Data": len(team_forms) > 0,
        "Context Generation": context_info['context_length'] > 0,
        "API Structure": api_success
    }
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {test_name}")
    
    # Detailed results
    print(f"\n📈 Data Summary:")
    print(f"   - Injuries found: {len(injuries)}")
    print(f"   - Weather data: {'Yes' if weather else 'No'}")
    print(f"   - Team forms: {len(team_forms)}")
    print(f"   - Context length: {context_info['context_length']} chars")
    print(f"   - Teams extracted: {context_info['teams']}")
    
    passed = sum(1 for result in results.values() if result)
    total = len(results)
    
    print(f"\n🎯 Final Result: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All real-time intelligence features working correctly!")
        return 0
    else:
        print("⚠️  Some features need attention")
        return 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)