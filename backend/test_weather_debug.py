#!/usr/bin/env python3
"""
Quick test for weather API specifically
"""

import asyncio
import sys
import os
sys.path.append(os.path.dirname(__file__))

from injury_weather_service import InjuryWeatherService

async def test_weather_debug():
    """Debug weather API"""
    print("🌤️ Debug Weather API")
    print("=" * 30)
    
    # Check environment variable
    weather_key = os.environ.get('WEATHERAPI_KEY', '')
    print(f"Weather API Key: {'SET' if weather_key else 'NOT SET'}")
    if weather_key:
        print(f"Key length: {len(weather_key)}")
    
    # Test weather for Chiefs
    print(f"\n🔍 Testing weather for Chiefs...")
    try:
        weather = await InjuryWeatherService.get_weather_for_game('chiefs')
        print(f"Weather result: {weather}")
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_weather_debug())