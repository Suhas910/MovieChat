import os
import requests
from dotenv import load_dotenv

load_dotenv()
TMDB_API_KEY = os.getenv("TMDB_API_KEY")

BASE_URL = "https://api.themoviedb.org/3"


def get_popular_movies():
    """to get popular movies"""
    url = f"{BASE_URL}/movie/popular"
    params = {"api_key": TMDB_API_KEY}

    response = requests.get(url, params=params)
    data = response.json()
    return data


def search_movie(query):
    url = f"{BASE_URL}/search/movie"
    params = {"api_key": TMDB_API_KEY, "query": query}

    response = requests.get(url, params=params)
    if response.status_code == 200:
        data = response.json()
        return data
    else:
        return None
