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
import json
from fastapi.responses import JSONResponse
from pymongo import MongoClient
from bson import json_util
from llama_cpp import Llama

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

# Geonames API setup
GEONAMES_USERNAME = os.getenv("GEONAMES_USERNAME")

# Set up Watson NLU
authenticator = IAMAuthenticator(WATSON_API_KEY)
nlu = NaturalLanguageUnderstandingV1(
    version='2023-09-21',
    authenticator=authenticator
)
nlu.set_service_url(NLU_URL)

# Load the local GGUF model
MODEL_PATH = os.getenv("GGUF_MODEL_PATH")  # Add this to your .env file
llm = Llama(model_path=MODEL_PATH, n_ctx=2048, n_threads=4)

# Overpass API endpoint
overpass_url = "http://overpass-api.de/api/interpreter"

# MongoDB setup
MONGO_URI = os.getenv("MONGO_URI")
client = MongoClient(MONGO_URI)
db = client.get_database("plot_recommendations")
poll_collection = db.poll_data

# ... [Keep all other functions unchanged] ...

def get_recommendations(lat, lon, population, climate, nearby_places_summary, poll_data):
    places_description = ", ".join([f"{place}: {count}" for place, count in nearby_places_summary.items()])
    logger.info(places_description)

    # Process poll data
    poll_summary = summarize_poll_data(poll_data)
    poll_description = ", ".join([f"{category}: {votes} votes" for category, votes in poll_summary.items()])

    prompt = f"""
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
    Format each recommendation as: "Recommendation: Explanation"
    """

    try:
        # Watson NLU Analysis
        nlu_response = nlu.analyze(
            text=prompt,
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

        # Prepare input for local model
        model_input = f"""
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

        # Generate recommendations using the local model
        output = llm(model_input, max_tokens=500, stop=["Human:", "Assistant:"], echo=False)
        recommendations = output['choices'][0]['text'].strip().split('\n')

        # Limit to top 5 recommendations
        recommendations = recommendations[:5]

        return "Recommendations:\n" + "\n".join(recommendations)
    except Exception as e:
        logger.error(f"Error in get_recommendations: {str(e)}")
        return f"Error generating recommendations. Please try again later. Error details: {str(e)}"

# ... [Keep all route handlers unchanged] ...

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)