#!/usr/bin/env python3
"""
Test odds API functionality
"""

import asyncio
import sys
import os
sys.path.append(os.path.dirname(__file__))

from sports_data_service import SportsDataService

async def test_odds_api():
    """Test odds API"""
    print("📈 Testing Odds API")
    print("=" * 30)
    
    # Check environment variable
    odds_key = os.environ.get('ODDS_API_KEY', '')
    print(f"Odds API Key: {'SET' if odds_key else 'NOT SET'}")
    if odds_key:
        print(f"Key length: {len(odds_key)}")
    
    # Test live odds
    print(f"\n🔍 Testing live odds for NFL...")
    try:
        odds = await SportsDataService.get_live_odds('americanfootball_nfl')
        if odds:
            print(f"✅ Found {len(odds)} games with odds")
            if odds:
                first_game = odds[0]
                print(f"   Sample game: {first_game.get('away_team')} @ {first_game.get('home_team')}")
                print(f"   Bookmakers: {len(first_game.get('bookmakers', []))}")
        else:
            print(f"❌ No odds data returned")
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_odds_api())