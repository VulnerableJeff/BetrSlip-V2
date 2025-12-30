import os
import aiohttp
import logging
from typing import Dict, Optional, List
from datetime import datetime
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)

# WeatherAPI.com (Free tier: 1M calls/month!)
WEATHERAPI_KEY = os.environ.get('WEATHERAPI_KEY', '')
WEATHERAPI_BASE = 'http://api.weatherapi.com/v1'

# Stadium/Venue locations (major NFL stadiums)
STADIUM_LOCATIONS = {
    # NFL Teams
    'chiefs': {'city': 'Kansas City', 'lat': 39.0489, 'lon': -94.4839, 'outdoor': True},
    'bills': {'city': 'Buffalo', 'lat': 42.7738, 'lon': -78.7870, 'outdoor': True},
    'cowboys': {'city': 'Arlington', 'lat': 32.7473, 'lon': -97.0945, 'outdoor': False},  # Dome
    'eagles': {'city': 'Philadelphia', 'lat': 39.9008, 'lon': -75.1675, 'outdoor': True},
    'packers': {'city': 'Green Bay', 'lat': 44.5013, 'lon': -88.0622, 'outdoor': True},
    '49ers': {'city': 'Santa Clara', 'lat': 37.4032, 'lon': -121.9698, 'outdoor': True},
    'ravens': {'city': 'Baltimore', 'lat': 39.2780, 'lon': -76.6227, 'outdoor': True},
    'bengals': {'city': 'Cincinnati', 'lat': 39.0954, 'lon': -84.5160, 'outdoor': True},
    'browns': {'city': 'Cleveland', 'lat': 41.5061, 'lon': -81.6995, 'outdoor': True},
    'steelers': {'city': 'Pittsburgh', 'lat': 40.4468, 'lon': -80.0158, 'outdoor': True},
    'patriots': {'city': 'Foxborough', 'lat': 42.0909, 'lon': -71.2643, 'outdoor': True},
    'dolphins': {'city': 'Miami Gardens', 'lat': 25.9580, 'lon': -80.2389, 'outdoor': True},
    'jets': {'city': 'East Rutherford', 'lat': 40.8135, 'lon': -74.0745, 'outdoor': True},
    'raiders': {'city': 'Las Vegas', 'lat': 36.0908, 'lon': -115.1836, 'outdoor': False},  # Dome
    'chargers': {'city': 'Inglewood', 'lat': 33.9535, 'lon': -118.3390, 'outdoor': False},  # Dome
    'rams': {'city': 'Inglewood', 'lat': 33.9535, 'lon': -118.3390, 'outdoor': False},
    'seahawks': {'city': 'Seattle', 'lat': 47.5952, 'lon': -122.3316, 'outdoor': True},
    'broncos': {'city': 'Denver', 'lat': 39.7439, 'lon': -104.9537, 'outdoor': True},
    'saints': {'city': 'New Orleans', 'lat': 29.9511, 'lon': -90.0812, 'outdoor': False},  # Dome
    'falcons': {'city': 'Atlanta', 'lat': 33.7554, 'lon': -84.4008, 'outdoor': False},  # Dome
    'panthers': {'city': 'Charlotte', 'lat': 35.2258, 'lon': -80.8530, 'outdoor': True},
    'buccaneers': {'city': 'Tampa', 'lat': 27.9759, 'lon': -82.5033, 'outdoor': True},
    # Add more as needed
}


class InjuryWeatherService:
    """Service for fetching injury reports and weather data"""
    
    @staticmethod
    async def get_injuries_for_team(team_name: str) -> List[Dict]:
        """
        Fetch injury report from ESPN for a team
        Uses ESPN's sports.core API for injuries
        """
        try:
            # ESPN Team IDs (NFL)
            team_ids = {
                'chiefs': '12', 'bills': '2', 'cowboys': '6', 'eagles': '21',
                'packers': '9', '49ers': '25', 'ravens': '33', 'bengals': '4',
                'browns': '5', 'steelers': '23', 'patriots': '17', 'dolphins': '15',
                'jets': '20', 'raiders': '13', 'chargers': '24', 'rams': '14',
                'seahawks': '26', 'broncos': '7', 'saints': '18', 'falcons': '1',
                'panthers': '29', 'buccaneers': '27'
            }
            
            team_lower = team_name.lower()
            team_id = None
            for key, tid in team_ids.items():
                if key in team_lower or team_lower in key:
                    team_id = tid
                    break
            
            if not team_id:
                return []
            
            # Try the sports.core.api endpoint for injuries
            url = f'https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/teams/{team_id}/injuries'
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        injuries = []
                        if 'items' in data:
                            for item in data['items'][:5]:  # Top 5
                                try:
                                    # Fetch individual injury details
                                    injury_url = item.get('$ref', '')
                                    if injury_url:
                                        async with session.get(injury_url, timeout=aiohttp.ClientTimeout(total=5)) as injury_resp:
                                            if injury_resp.status == 200:
                                                injury_data = await injury_resp.json()
                                                
                                                athlete_ref = injury_data.get('athlete', {}).get('$ref', '')
                                                athlete_name = 'Unknown'
                                                position = ''
                                                
                                                # Fetch athlete name
                                                if athlete_ref:
                                                    async with session.get(athlete_ref, timeout=aiohttp.ClientTimeout(total=3)) as athlete_resp:
                                                        if athlete_resp.status == 200:
                                                            athlete_data = await athlete_resp.json()
                                                            athlete_name = athlete_data.get('displayName', 'Unknown')
                                                            position = athlete_data.get('position', {}).get('abbreviation', '')
                                                
                                                # Status can be a string or dict depending on ESPN API version
                                                status_val = injury_data.get('status', 'Unknown')
                                                if isinstance(status_val, dict):
                                                    status_val = status_val.get('name', 'Unknown')
                                                
                                                # Get injury type from details
                                                details = injury_data.get('details', {})
                                                injury_type = details.get('type', 'Undisclosed') if isinstance(details, dict) else 'Undisclosed'
                                                
                                                injuries.append({
                                                    'player': athlete_name,
                                                    'position': position,
                                                    'status': status_val,
                                                    'injury': injury_type
                                                })
                                except Exception as e:
                                    logger.debug(f"Error parsing injury: {str(e)}")
                                    continue
                        
                        return injuries
                    else:
                        logger.error(f"ESPN injury API error: {response.status}")
                        return []
        except Exception as e:
            logger.error(f"Error fetching injuries for {team_name}: {str(e)}")
            return []
    
    @staticmethod
    async def get_weather_for_game(team_name: str, game_time: Optional[datetime] = None) -> Optional[Dict]:
        """
        Fetch weather forecast for game location using WeatherAPI.com
        Only relevant for outdoor stadiums
        """
        if not WEATHERAPI_KEY:
            logger.warning("WEATHERAPI_KEY not set")
            return None
        
        team_lower = team_name.lower()
        location = None
        
        for key, loc in STADIUM_LOCATIONS.items():
            if key in team_lower or team_lower in key:
                location = loc
                break
        
        if not location:
            return None
        
        # Skip weather for domed stadiums
        if not location.get('outdoor', True):
            return {'note': 'Indoor stadium - weather not a factor'}
        
        try:
            # Use city name for WeatherAPI
            url = f'{WEATHERAPI_BASE}/forecast.json'
            params = {
                'key': WEATHERAPI_KEY,
                'q': location['city'],
                'days': 1,
                'aqi': 'no',
                'alerts': 'no'
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params, timeout=aiohttp.ClientTimeout(total=10)) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        current = data.get('current', {})
                        forecast_day = data.get('forecast', {}).get('forecastday', [{}])[0].get('day', {})
                        
                        weather_info = {
                            'temp': current.get('temp_f', 0),
                            'feels_like': current.get('feelslike_f', 0),
                            'conditions': current.get('condition', {}).get('text', 'Unknown'),
                            'wind_speed': current.get('wind_mph', 0),
                            'humidity': current.get('humidity', 0),
                            'precipitation_chance': forecast_day.get('daily_chance_of_rain', 0),
                            'city': location['city'],
                            'wind_gust': current.get('gust_mph', 0)
                        }
                        
                        return weather_info
                    else:
                        logger.error(f"Weather API error: {response.status}")
                        text = await response.text()
                        logger.error(f"Response: {text}")
                        return None
        except Exception as e:
            logger.error(f"Error fetching weather for {team_name}: {str(e)}")
            return None
    
    @staticmethod
    def format_injury_report(injuries: List[Dict]) -> str:
        """Format injury list for AI prompt"""
        if not injuries:
            return ""
        
        report = "\n\n⚕️ INJURY REPORT:\n"
        for injury in injuries:
            report += f"  - {injury['player']} ({injury['position']}): {injury['status']} - {injury['injury']}\n"
        
        return report
    
    @staticmethod
    def format_weather_report(weather: Optional[Dict]) -> str:
        """Format weather data for AI prompt"""
        if not weather:
            return ""
        
        if 'note' in weather:
            return f"\n\n🏟️ VENUE: {weather['note']}"
        
        report = f"\n\n🌡️ WEATHER FORECAST ({weather['city']}):\n"
        report += f"  - Temperature: {weather['temp']:.0f}°F (feels like {weather['feels_like']:.0f}°F)\n"
        report += f"  - Conditions: {weather['conditions']}\n"
        report += f"  - Wind: {weather['wind_speed']:.0f} mph\n"
        report += f"  - Humidity: {weather['humidity']}%\n"
        
        if weather['precipitation_chance'] > 30:
            report += f"  - ⚠️ Precipitation chance: {weather['precipitation_chance']:.0f}%\n"
        
        # Add impact analysis
        if weather['wind_speed'] > 15:
            report += "  - Impact: High winds may affect passing game\n"
        if weather['temp'] < 32:
            report += "  - Impact: Freezing conditions may affect ball handling\n"
        if weather['precipitation_chance'] > 50:
            report += "  - Impact: Rain/snow likely - favors running game\n"
        
        return report


async def get_enhanced_game_context(team_names: List[str]) -> str:
    """
    Get injury and weather context for teams
    """
    context_parts = []
    
    for team in team_names[:2]:  # Max 2 teams (home and away)
        # Get injuries
        injuries = await InjuryWeatherService.get_injuries_for_team(team)
        if injuries:
            context_parts.append(InjuryWeatherService.format_injury_report(injuries))
        
        # Get weather (only for home team typically)
        weather = await InjuryWeatherService.get_weather_for_game(team)
        if weather:
            context_parts.append(InjuryWeatherService.format_weather_report(weather))
    
    return "".join(context_parts)
