import requests

def test_geonames_api(lat, lon):
    username = 'abizer786'  # Replace with your username
    url = f"http://api.geonames.org/findNearbyPlaceNameJSON?lat={lat}&lng={lon}&username={username}"
    response = requests.get(url)
    return response.json()

# Example coordinates (you can replace these with valid lat/lon)
print(test_geonames_api(40.7128, -74.0060))  # For New York City
