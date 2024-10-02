from fastapi import FastAPI, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import requests
from ibm_watson import NaturalLanguageUnderstandingV1
from ibm_watson.natural_language_understanding_v1 import Features, KeywordsOptions, CategoriesOptions, ConceptsOptions
from ibm_cloud_sdk_core.authenticators import IAMAuthenticator
from dotenv import load_dotenv
import os
import logging
import google.generativeai as genai
import json
from fastapi.responses import JSONResponse
from pymongo import MongoClient
from bson import json_util

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Load environment variables
load_dotenv()

# Watson AI setup
WATSON_API_KEY = os.getenv("API_KEY")
NLU_URL = os.getenv("NLU_URL")

# Gemini API setup
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Geonames API setup
GEONAMES_USERNAME = os.getenv("GEONAMES_USERNAME")
print(GEMINI_API_KEY, GEONAMES_USERNAME, WATSON_API_KEY, NLU_URL)

# Set up Watson NLU
authenticator = IAMAuthenticator(WATSON_API_KEY)
nlu = NaturalLanguageUnderstandingV1(
    version='2023-09-21',
    authenticator=authenticator
)
nlu.set_service_url(NLU_URL)

# Set up Gemini
genai.configure(api_key=GEMINI_API_KEY)

# Overpass API endpoint
overpass_url = "http://overpass-api.de/api/interpreter"

# MongoDB setup
MONGO_URI = os.getenv("MONGO_URI")
client = MongoClient(MONGO_URI)
db = client.get_database("plot_recommendations")
poll_collection = db.poll_data



def get_population_and_places(lat, lon):
    try:
        url = f"http://api.geonames.org/findNearbyPlaceNameJSON?lat={lat}&lng={lon}&radius=10&maxRows=10&username={GEONAMES_USERNAME}"
        response = requests.get(url)

        if response.status_code != 200:
            logger.error(f"Error: Received status code {response.status_code} from Geonames API")
            return "Unknown", []

        data = response.json()

        total_population = 0
        nearby_places = []
        if "geonames" in data and len(data["geonames"]) > 0:
            for place in data["geonames"]:
                population = place.get("population", 0)
                total_population += population
                nearby_places.append(place['name'])

        return total_population if total_population > 0 else "Unknown", nearby_places
    except Exception as e:
        logger.error(f"Error fetching population and places: {str(e)}")
        return "Unknown", []

def get_climate(lat, lon):
    try:
        climate_url = f"http://api.geonames.org/findNearByWeatherJSON?lat={lat}&lng={lon}&username={GEONAMES_USERNAME}"
        response = requests.get(climate_url)

        if response.status_code != 200:
            logger.error(f"Error: Received status code {response.status_code} from Geonames API")
            return "Unknown"

        climate_data = response.json()

        if "weatherObservation" in climate_data:
            temp = climate_data["weatherObservation"].get("temperature", "Unknown")
            weather_conditions = climate_data["weatherObservation"].get("clouds", "Unknown")
            climate_info = f"Temperature: {temp}°C, Conditions: {weather_conditions}"
            return climate_info
        return "Unknown"
    except Exception as e:
        logger.error(f"Error fetching climate data: {str(e)}")
        return "Unknown"

def get_nearby_places(lat, lon):
    query = f"""
    [out:json];
    (
      node["amenity"](around:10000,{lat},{lon});
      node["leisure"](around:10000,{lat},{lon});
      node["shop"](around:10000,{lat},{lon});
    );
    out body;
    """
    try:
        response = requests.get(overpass_url, params={'data': query})

        if response.status_code != 200:
            logger.error(f"Error: Received status code {response.status_code} from Overpass API")
            return []

        nearby_data = response.json()
        nearby_places = []

        for element in nearby_data.get('elements', []):
            if 'tags' in element:
                tags = element['tags']
                if 'amenity' in tags:
                    nearby_places.append(tags['amenity'])
                if 'leisure' in tags:
                    nearby_places.append(tags['leisure'])
                if 'shop' in tags:
                    nearby_places.append(tags['shop'])

        return nearby_places
    except Exception as e:
        logger.error(f"Error fetching nearby places: {str(e)}")
        return []

def summarize_nearby_places(nearby_places):
    summary = {}
    for place in nearby_places:
        if place in summary:
            summary[place] += 1
        else:
            summary[place] = 1
    return summary
def get_recommendations(lat, lon, population, climate, nearby_places_summary, poll_data):
    places_description = ", ".join([f"{place}: {count}" for place, count in nearby_places_summary.items()])
    logger.info(places_description)

    # Process poll data
    poll_summary = summarize_poll_data(poll_data)
    poll_description = ", ".join([f"{category}: {votes} votes" for category, votes in poll_summary.items()])

    description = f"""
    Analyze development potential for an empty plot:
    Location: Latitude {lat}, Longitude {lon}
    Area characteristics:
    - Population: Approximately {population} people nearby
    - Climate: {climate}
    - Nearby places: {places_description}
    
    Public opinion (based on votes):
    {poll_description}

    Considering these factors, including public opinion, suggest 3-5 specific development opportunities that would:
    1. Benefit the local community
    2. Align with the area's current characteristics and public demand
    3. Address any gaps in services or amenities
    4. Be suitable for the climate conditions
    5. Match the population density

    For each suggestion, provide a brief one-line explanation of why it's recommended, considering both the area characteristics and public opinion.
    """

    try:
        # Watson NLU Analysis
        nlu_response = nlu.analyze(
            text=description,
            features=Features(
                keywords=KeywordsOptions(limit=20),
                categories=CategoriesOptions(limit=10),
                concepts=ConceptsOptions(limit=10)
            )
        ).get_result()

        logger.info(f"Watson NLU Response: {nlu_response}")

        # Extract relevant information from NLU response
        keywords = [keyword['text'] for keyword in nlu_response.get('keywords', [])]
        categories = [category['label'] for category in nlu_response.get('categories', [])]
        concepts = [concept['text'] for concept in nlu_response.get('concepts', [])]

        # Prepare input for Gemini
        gemini_input = f"""
        Based on the following analysis of an empty plot, provide 3-5 specific development recommendations:

        Location: Latitude {lat}, Longitude {lon}
        Population: Approximately {population} people nearby
        Climate: {climate}
        Nearby places: {places_description}
        Public opinion: {poll_description}

        Key aspects identified:
        Keywords: {', '.join(keywords)}
        Categories: {', '.join(categories)}
        Concepts: {', '.join(concepts)}

        For each recommendation, provide a brief one-line explanation of why it's suitable, considering both area characteristics and public opinion.
        Format each recommendation as: "Recommendation: Explanation"
        """

        # Call Gemini API
        model = genai.GenerativeModel('gemini-pro')
        response = model.generate_content(gemini_input)

        # Extract recommendations from Gemini response
        recommendations = response.text.split('\n')

        # Limit to top 5 recommendations
        recommendations = recommendations[:5]

        return "Recommendations:\n" + "\n".join(recommendations)
    except Exception as e:
        logger.error(f"Error in get_recommendations: {str(e)}")
        return f"Error generating recommendations. Please try again later. Error details: {str(e)}"

def summarize_poll_data(poll_data):
    summary = {}
    for item in poll_data:
        category = item['category']
        votes = item['votes']
        if category in summary:
            summary[category] += votes
        else:
            summary[category] = votes
    return summary

def get_empty_plots(city_name):
    query = f"""
    [out:json];
    area["name"="{city_name}"]->.searchArea;
    (
      // Query for areas marked as greenfield, vacant, brownfield, abandoned, or disused
      way["landuse"="greenfield"](area.searchArea);
      way["vacant"="yes"](area.searchArea);
      way["landuse"="brownfield"](area.searchArea);
      way["abandoned"="yes"](area.searchArea);
      way["disused"="yes"](area.searchArea);

      // Include areas under construction but filter out if not vacant
      way["landuse"="construction"]["vacant"="yes"](area.searchArea);
    );
    out body;
    >;
    out skel qt;
    """

    try:
        response = requests.get(overpass_url, params={'data': query})

        if response.status_code != 200:
            logger.error(f"Error: Received status code {response.status_code} from Overpass API")
            return []

        data = response.json()

        # Collect all node IDs from way elements
        node_ids = set()
        for element in data['elements']:
            if element['type'] == 'way':
                node_ids.update(element['nodes'])

        # Fetch details for the nodes (coordinates)
        node_query = f"""
        [out:json];
        node(id:{','.join(map(str, node_ids))});
        out body;
        """

        node_response = requests.get(overpass_url, params={'data': node_query})
        if node_response.status_code != 200:
            logger.error(f"Error: Received status code {node_response.status_code} from Overpass API for node query")
            return []

        node_data = node_response.json()

        # Map node IDs to coordinates
        node_coords = {node['id']: (node['lat'], node['lon']) for node in node_data['elements'] if node['type'] == 'node'}

        # Collect plot coordinates
        empty_plots = []
        for element in data['elements']:
            if element['type'] == 'way':
                plot_coords = [node_coords[node_id] for node_id in element['nodes'] if node_id in node_coords]
                if plot_coords:
                    empty_plots.append(plot_coords)

        return empty_plots
    except Exception as e:
        logger.error(f"Error in get_empty_plots: {str(e)}")
        return []

@app.post("/api/get-empty-plots")
async def get_empty_plots_route(city: str = Form(...)):
    try:
        empty_plots = get_empty_plots(city)

        if not empty_plots:
            return JSONResponse(content={"message": "No empty plots found"})

        plot_data = []
        for plot in empty_plots:
            if plot:
                lat, lon = plot[0]
                plot_data.append({
                    "coordinates": plot,
                    "lat": lat,
                    "lon": lon
                })

        return JSONResponse(content={
            "message": f"Found {len(empty_plots)} empty plots in {city}",
            "plots": plot_data
        })
    except Exception as e:
        logger.error(f"Error in get_empty_plots_route: {str(e)}")
        return JSONResponse(content={"error": f"An error occurred: {str(e)}"}, status_code=500)
@app.post("/api/vote")
async def vote(lat: float = Form(...), lon: float = Form(...), category: str = Form(...)):
    try:
        # Update the vote count in MongoDB
        result = poll_collection.update_one(
            {"lat": lat, "lon": lon, "category": category},
            {"$inc": {"votes": 1}},
            upsert=True
        )

        return JSONResponse(content={"message": "Vote recorded successfully"})
    except Exception as e:
        logger.error(f"Error in vote route: {str(e)}")
        return JSONResponse(content={"error": f"An error occurred: {str(e)}"}, status_code=500)

@app.get("/api/poll-data")
async def get_poll_data(lat: float, lon: float):
    try:
        # Retrieve poll data for the given coordinates
        poll_data = list(poll_collection.find({"lat": lat, "lon": lon}))
        
        # Convert ObjectId to string for JSON serialization
        poll_data = json.loads(json_util.dumps(poll_data))

        return JSONResponse(content={"poll_data": poll_data})
    except Exception as e:
        logger.error(f"Error in get_poll_data route: {str(e)}")
        return JSONResponse(content={"error": f"An error occurred: {str(e)}"}, status_code=500)
@app.post("/api/get-recommendations")
async def get_recommendations_route(lat: float = Form(...), lon: float = Form(...)):
    try:
        population, nearby_places = get_population_and_places(lat, lon)
        climate = get_climate(lat, lon)
        additional_nearby_places = get_nearby_places(lat, lon)
        all_nearby_places = nearby_places + additional_nearby_places
        nearby_places_summary = summarize_nearby_places(all_nearby_places)

        # Retrieve existing poll data
        poll_data = list(poll_collection.find({"lat": lat, "lon": lon}))
        
        # Generate recommendations including poll data
        recommendations = get_recommendations(lat, lon, population, climate, nearby_places_summary, poll_data)

        # Convert ObjectId to string for JSON serialization
        poll_data = json.loads(json_util.dumps(poll_data))

        return JSONResponse(content={
            "lat": lat,
            "lon": lon,
            "population": population,
            "climate": climate,
            "recommendations": recommendations,
            "poll_data": poll_data
        })
    except Exception as e:
        logger.error(f"Error in get_recommendations_route: {str(e)}")
        return JSONResponse(content={"error": f"An error occurred: {str(e)}"}, status_code=500)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
