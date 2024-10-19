from fastapi import FastAPI, Form, File, UploadFile
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
from typing import List
import geopy.distance
from fastapi import Form
from fastapi.responses import JSONResponse
from typing import Optional, Dict
import json
from bson import json_util
import re
from gradio_client import Client
import shutil

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

GRADIO_CLIENT_ID= os.getenv("GRADIO_ADDRESS")



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
plot_submission_collection = db.plot_submissions
plot_status_collection = db.plot_status


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
      node["amenity"](around:6000,{lat},{lon});
      node["leisure"](around:6000,{lat},{lon});
      node["shop"](around:6000,{lat},{lon});
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

        logger.info(f"Watson NLU Response: {lat},{lon}")

        # Extract relevant information from NLU response
        keywords = [keyword['text'] for keyword in nlu_response.get('keywords', [])]
        categories = [category['label'] for category in nlu_response.get('categories', [])]
        concepts = [concept['text'] for concept in nlu_response.get('concepts', [])]

        # Prepare input for Gemini
        # In the get_recommendations function, modify the Gemini input and parsing:

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

        For each recommendation, provide:
        1. A brief one-line explanation of why it's suitable, considering both area characteristics and public opinion.
        2. A detailed description of how the development would look and fit into the surrounding area (for image generation purposes).

        Format your response as a JSON object where each key is a short title for the recommendation, and the value is an object containing "explanation" and "description" fields.
        Example:
        {{
            "Community Center": {{
                "explanation": "Addresses the lack of social spaces and aligns with public desire for community facilities",
                "description": "A modern two-story building with large windows, surrounded by green space. The exterior features a mix of brick and wood paneling, with a spacious parking area. Inside, there are multipurpose rooms, a gym, and a cafeteria. The landscaping includes walking paths and a small playground."
            }},
            "Green Park": {{
                "explanation": "Enhances environmental quality and meets the demand for open spaces in a densely populated area",
                "description": "A sprawling park with winding paths, mature trees, and open grassy areas. Features include a central fountain, flower gardens, benches, and a dedicated area for outdoor fitness equipment. The park is designed with sustainability in mind, incorporating native plants and rainwater collection systems."
            }}
        }}
        """

       # Call Gemini API
        model = genai.GenerativeModel('gemini-pro')
        response = model.generate_content(gemini_input)

        json_string = re.sub(r'```json\s*|\s*```', '', response.text)
        try:
            recommendations = json.loads(json_string)
            print (recommendations)
        except json.JSONDecodeError:
            logger.error(f"Error parsing Gemini response as JSON: {json_string}")
            recommendations = {}

        return recommendations
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
                    # Calculate plot size (even if incomplete)
                    plot_size = calculate_plot_size(plot_coords)
                    
                    # Find boundary coordinates (even if incomplete)
                    lats = [coord[0] for coord in plot_coords]
                    lons = [coord[1] for coord in plot_coords]
                    boundaries = {
                        "north": max(lats, default=0),
                        "south": min(lats, default=0),
                        "east": max(lons, default=0),
                        "west": min(lons, default=0)
                    }
                    
                    # Include the plot even if calculations are incomplete
                    empty_plots.append({
                        "coordinates": plot_coords,
                        "size": plot_size if plot_size > 0 else None,
                        "boundaries": boundaries
                    })

        return empty_plots
    except Exception as e:
        logger.error(f"Error in get_empty_plots: {str(e)}")
        return []

def calculate_plot_size(coordinates):
    if len(coordinates) < 3:
        return 0  # Not enough points to form a polygon, but we'll return 0 instead of failing
    
    total_area = 0
    for i in range(len(coordinates)):
        j = (i + 1) % len(coordinates)
        total_area += coordinates[i][0] * coordinates[j][1]
        total_area -= coordinates[j][0] * coordinates[i][1]
    area = abs(total_area) / 2
    
    # Convert area to square meters (approximate)
    center_lat = sum(coord[0] for coord in coordinates) / len(coordinates)
    center_lon = sum(coord[1] for coord in coordinates) / len(coordinates)
    coord_1 = (center_lat, center_lon)
    coord_2 = (center_lat + 0.001, center_lon + 0.001)  # Move slightly to calculate distance
    meters_per_degree = geopy.distance.distance(coord_1, coord_2).meters / 0.001
    return area * (meters_per_degree ** 2)

@app.post("/api/image_process")
async def image_process(description: str = Form(...), recommendation_title: str = Form(...)):
    logger.info(description)
    try:
        # Check if the image already exists
        public_folder = r"D:\Projects New\IBM\nextjs-tailwind-landing-page-main\public"
        generated_images_folder = os.path.join(public_folder, "generated_images")
        os.makedirs(generated_images_folder, exist_ok=True)
        
        # Create a safe filename from the recommendation title
        safe_filename = "".join(x for x in recommendation_title if x.isalnum() or x in [' ', '-', '_']).rstrip()
        safe_filename = safe_filename.replace(' ', '_') + '.png'
        destination_path = os.path.join(generated_images_folder, safe_filename)
        
        # If the image already exists, return its URL
        if os.path.exists(destination_path):
            image_url = f"/generated_images/{safe_filename}"
            return JSONResponse(content={"image_url": image_url})
        
        # If the image doesn't exist, generate it
        client = Client("https://afb60fc71417057dce.gradio.live/")
        result = client.predict(
            description,
            False,  # upscale parameter
            api_name="/generate_with_update"
        )
        
        # Assuming the result is a tuple and the first element is the image path
        source_image_path = result[0]
        
        # Copy the image to the public folder with the new filename
        shutil.copy2(source_image_path, destination_path)
        
        # The URL that the frontend will use to access the image
        image_url = f"/generated_images/{safe_filename}"
        
        return JSONResponse(content={"image_url": image_url})
    except Exception as e:
        logger.error(f"Error in image_process: {str(e)}")
        logger.exception("Full traceback:")
        return JSONResponse(content={"error": f"An error occurred: {str(e)}"}, status_code=500)

@app.post("/api/get-empty-plots")
async def get_empty_plots_route(city: str = Form(...)):
    try:
        # Get empty plots from Overpass API
        overpass_plots = get_empty_plots(city)

        # Get submitted plots from MongoDB
        submitted_plots = list(plot_submission_collection.find({"city": city}))

        # Combine and process all plots
        all_plots = []

        for plot in overpass_plots:
            all_plots.append({
                "source": "overpass",
                "coordinates": plot["coordinates"],
                "lat": plot["coordinates"][0][0],
                "lon": plot["coordinates"][0][1],
                "size": plot["size"],
                "boundaries": plot["boundaries"]
            })

        for plot in submitted_plots:
            plot_data = {
                "source": "user_submitted",
                "coordinates": [[plot["latitude"], plot["longitude"]]],
                "lat": plot["latitude"],
                "lon": plot["longitude"],
                "size": None,  # Size might not be available for user-submitted plots
                "owner_name": plot["owner_name"],
                "owner_email": plot["owner_email"],
                "owner_mobile": plot["owner_mobile"],
                "files": plot["files"]
            }

            # Include boundaries if available
            if "boundaries" in plot:
                plot_data["boundaries"] = plot["boundaries"]
            else:
                # If no boundaries are provided, create a small square around the point
                delta = 0.001  # Approximately 100 meters
                plot_data["boundaries"] = {
                    "north": plot["latitude"] + delta,
                    "south": plot["latitude"] - delta,
                    "east": plot["longitude"] + delta,
                    "west": plot["longitude"] - delta
                }

            all_plots.append(plot_data)

        if not all_plots:
            return JSONResponse(content={"message": "No empty plots found"})

        for plot in all_plots:
            plot_status = plot_status_collection.find_one({"latitude": plot["lat"], "longitude": plot["lon"]})
            if plot_status:
                plot["status"] = plot_status["status"]
                plot["color"] = "green" if plot_status["status"] == "environmental" else "blue"
            else:
                plot["status"] = "available"
                plot["color"] = "red"

        return JSONResponse(content={
            "message": f"Found {len(all_plots)} empty plots in {city}",
            "plots": json.loads(json_util.dumps(all_plots))
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
    
def ensure_uploads_directory():
    uploads_dir = "uploads"
    if not os.path.exists(uploads_dir):
        os.makedirs(uploads_dir)
        logger.info(f"Created uploads directory: {uploads_dir}")

@app.get("/api/get-submitted-plots")
async def get_submitted_plots():
    try:
        submitted_plots = list(plot_submission_collection.find())
        return JSONResponse(content={
            "message": f"Found {len(submitted_plots)} submitted plots",
            "plots": json.loads(json_util.dumps(submitted_plots))
        })
    except Exception as e:
        logger.error(f"Error in get_submitted_plots route: {str(e)}")
        return JSONResponse(content={"error": f"An error occurred: {str(e)}"}, status_code=500)



@app.post("/api/submit-plot")
async def submit_plot(
    latitude: float = Form(...),
    longitude: float = Form(...),
    city: str = Form(...),
    owner_name: str = Form(...),
    owner_email: str = Form(...),
    owner_mobile: str = Form(...),
    files: List[UploadFile] = File(...),
    boundaries: Optional[str] = Form(None)
):
    try:
        ensure_uploads_directory()

        plot_submission = {
            "latitude": latitude,
            "longitude": longitude,
            "city": city,
            "owner_name": owner_name,
            "owner_email": owner_email,
            "owner_mobile": owner_mobile,
            "files": []
        }

        # Process boundaries if provided
        if boundaries:
            try:
                boundaries_dict = json.loads(boundaries)
                plot_submission["boundaries"] = boundaries_dict
            except json.JSONDecodeError:
                logger.error(f"Invalid JSON for boundaries: {boundaries}")
                return JSONResponse(content={"error": "Invalid boundaries format"}, status_code=400)

        for file in files:
            file_path = os.path.join("uploads", file.filename)
            with open(file_path, "wb") as buffer:
                buffer.write(await file.read())
            plot_submission["files"].append(file_path)

        result = plot_submission_collection.insert_one(plot_submission)

        return JSONResponse(content={"message": "Plot submitted successfully", "id": str(result.inserted_id)})
    except Exception as e:
        logger.error(f"Error in submit_plot route: {str(e)}")
        return JSONResponse(content={"error": f"An error occurred: {str(e)}"}, status_code=500)

@app.post("/api/update-plot-status")
async def update_plot_status(
    latitude: float = Form(...),
    longitude: float = Form(...),
    status: str = Form(...)
):
    try:
        plot_data = {
            "latitude": latitude,
            "longitude": longitude,
            "status": status
        }

        result = plot_status_collection.update_one(
            {"latitude": latitude, "longitude": longitude},
            {"$set": plot_data},
            upsert=True
        )

        return JSONResponse(content={"message": "Plot status updated successfully"})
    except Exception as e:
        logger.error(f"Error in update_plot_status route: {str(e)}")
        return JSONResponse(content={"error": f"An error occurred: {str(e)}"}, status_code=500)

@app.get("/api/get-plot-status")
async def get_plot_status(latitude: float, longitude: float):
    try:
        plot_status = plot_status_collection.find_one({"latitude": latitude, "longitude": longitude})
        if plot_status:
            return JSONResponse(content=json.loads(json_util.dumps(plot_status)))
        else:
            return JSONResponse(content={"message": "Plot status not found"}, status_code=404)
    except Exception as e:
        logger.error(f"Error in get_plot_status route: {str(e)}")
        return JSONResponse(content={"error": f"An error occurred: {str(e)}"}, status_code=500)

    
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
