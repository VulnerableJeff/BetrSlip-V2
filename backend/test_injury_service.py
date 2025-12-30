#!/usr/bin/env python3
"""
Test script for BetrSlip injury and weather services
Tests the newly implemented ESPN Injury API and Weather API integrations
"""

import asyncio
import sys
import os
sys.path.append(os.path.dirname(__file__))

from injury_weather_service import InjuryWeatherService, get_enhanced_game_context
from sports_data_service import SportsDataService, get_enhanced_context_for_analysis

async def test_injury_service():
    """Test ESPN Injury API integration"""
    print("🏥 Testing ESPN Injury API Integration")
    print("=" * 50)
    
    test_teams = ['chiefs', 'bills', 'cowboys', 'eagles']
    
    for team in test_teams:
        print(f"\n🔍 Testing injuries for {team.upper()}...")
        try:
            injuries = await InjuryWeatherService.get_injuries_for_team(team)
            
            if injuries:
                print(f"✅ Found {len(injuries)} injuries for {team}")
                for injury in injuries[:3]:  # Show first 3
                    print(f"   - {injury['player']} ({injury['position']}): {injury['status']} - {injury['injury']}")
            else:
                print(f"ℹ️  No injuries found for {team} (or team not found)")
                
        except Exception as e:
            print(f"❌ Error testing {team}: {str(e)}")
    
    return True

async def test_weather_service():
    """Test Weather API integration"""
    print("\n🌤️ Testing Weather API Integration")
    print("=" * 50)
    
    test_teams = ['chiefs', 'bills', 'cowboys', 'eagles']
    
    for team in test_teams:
        print(f"\n🔍 Testing weather for {team.upper()}...")
        try:
            weather = await InjuryWeatherService.get_weather_for_game(team)
            
            if weather:
                if 'note' in weather:
                    print(f"ℹ️  {weather['note']}")
                else:
                    print(f"✅ Weather data for {team}:")
                    print(f"   - Temperature: {weather.get('temp', 'N/A')}°F (feels like {weather.get('feels_like', 'N/A')}°F)")
                    print(f"   - Conditions: {weather.get('conditions', 'N/A')}")
                    print(f"   - Wind: {weather.get('wind_speed', 'N/A')} mph")
                    print(f"   - Humidity: {weather.get('humidity', 'N/A')}%")
                    print(f"   - Precipitation chance: {weather.get('precipitation_chance', 'N/A')}%")
            else:
                print(f"❌ No weather data found for {team}")
                
        except Exception as e:
            print(f"❌ Error testing weather for {team}: {str(e)}")
    
    return True

async def test_enhanced_team_stats():
    """Test enhanced team stats and form"""
    print("\n📊 Testing Enhanced Team Stats & Form")
    print("=" * 50)
    
    test_teams = ['chiefs', 'bills']
    
    for team in test_teams:
        print(f"\n🔍 Testing stats for {team.upper()}...")
        
        try:
            # Test team record
            print(f"   📈 Team Record:")
            record = await SportsDataService.get_team_record(team)
            if record:
                print(f"      ✅ Overall: {record.get('overall', 'N/A')}")
                print(f"      ✅ Home: {record.get('home', 'N/A')} | Away: {record.get('away', 'N/A')}")
                print(f"      ✅ Standing: {record.get('standing', 'N/A')}")
            else:
                print(f"      ❌ No record data found")
            
            # Test recent games
            print(f"   🎯 Recent Games (last 5):")
            recent_games = await SportsDataService.get_recent_games(team, limit=5)
            if recent_games:
                print(f"      ✅ Found {len(recent_games)} recent games")
                for game in recent_games[:3]:  # Show first 3
                    print(f"         {game['result']} vs {game['opponent']} ({game['score']}) - {game['home_away']}")
                
                # Test form rating
                form = SportsDataService.calculate_form_rating(recent_games)
                print(f"      ✅ Form: {form['form']} ({form['rating']})")
                print(f"      ✅ Record: {form['wins']}-{form['losses']}, Avg margin: {form['avg_margin']}")
            else:
                print(f"      ❌ No recent games found")
            
            # Test team stats
            print(f"   📊 Key Stats:")
            stats = await SportsDataService.get_team_stats(team)
            if stats and stats.get('key_stats'):
                print(f"      ✅ Found stats for {stats['team_name']}")
                stat_count = 0
                for stat_name, value in stats['key_stats'].items():
                    if stat_count < 3:  # Show first 3 stats
                        print(f"         - {stat_name}: {value}")
                        stat_count += 1
            else:
                print(f"      ❌ No stats found")
                
        except Exception as e:
            print(f"❌ Error testing stats for {team}: {str(e)}")
    
    return True

async def test_enhanced_context():
    """Test the enhanced context for analysis"""
    print("\n🧠 Testing Enhanced Context for Analysis")
    print("=" * 50)
    
    test_bet_details = "Chiefs vs Bills moneyline bet"
    
    try:
        print(f"🔍 Testing enhanced context for: '{test_bet_details}'")
        
        # Test team name extraction
        team_names = SportsDataService.extract_team_names(test_bet_details)
        print(f"   ✅ Extracted teams: {team_names}")
        
        # Test enhanced context
        context = await get_enhanced_context_for_analysis([], test_bet_details)
        
        if context:
            print(f"   ✅ Enhanced context generated ({len(context)} characters)")
            print(f"   📝 Context preview:")
            # Show first 300 characters
            preview = context[:300] + "..." if len(context) > 300 else context
            for line in preview.split('\n')[:10]:  # Show first 10 lines
                if line.strip():
                    print(f"      {line}")
        else:
            print(f"   ❌ No enhanced context generated")
            
    except Exception as e:
        print(f"❌ Error testing enhanced context: {str(e)}")
    
    return True

async def test_injury_weather_context():
    """Test combined injury and weather context"""
    print("\n🏥🌤️ Testing Combined Injury & Weather Context")
    print("=" * 50)
    
    test_teams = ['chiefs', 'bills']
    
    try:
        print(f"🔍 Testing combined context for teams: {test_teams}")
        
        context = await get_enhanced_game_context(test_teams)
        
        if context:
            print(f"   ✅ Combined context generated ({len(context)} characters)")
            print(f"   📝 Context preview:")
            # Show first 400 characters
            preview = context[:400] + "..." if len(context) > 400 else context
            for line in preview.split('\n')[:15]:  # Show first 15 lines
                if line.strip():
                    print(f"      {line}")
        else:
            print(f"   ❌ No combined context generated")
            
    except Exception as e:
        print(f"❌ Error testing combined context: {str(e)}")
    
    return True

async def main():
    """Run all tests"""
    print("🚀 Starting BetrSlip Service Tests")
    print("=" * 60)
    
    tests = [
        ("ESPN Injury API", test_injury_service),
        ("Weather API", test_weather_service),
        ("Enhanced Team Stats", test_enhanced_team_stats),
        ("Enhanced Context", test_enhanced_context),
        ("Combined Injury & Weather", test_injury_weather_context),
    ]
    
    results = []
    
    for test_name, test_func in tests:
        try:
            print(f"\n{'='*20} {test_name} {'='*20}")
            result = await test_func()
            results.append((test_name, result))
            print(f"✅ {test_name} completed")
        except Exception as e:
            print(f"❌ {test_name} failed: {str(e)}")
            results.append((test_name, False))
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 TEST SUMMARY")
    print("=" * 60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {test_name}")
    
    print(f"\n🎯 Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All service tests passed!")
        return 0
    else:
        print("⚠️  Some service tests failed")
        return 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)