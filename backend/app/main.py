from fastapi import FastAPI, HTTPException
from app.tmdb_service import get_popular_movies, search_movie
from app.database import get_db, engine, SessionLocal
from app.models import Base


Base.metadata.create_all(bind=engine)



app = FastAPI()

movie_posts = []


@app.get("/")
def hello_world():
    return {"Message": "Hello World"}


@app.get("/popular_movies")
def popular_movies():
    data = get_popular_movies()
    return data


@app.get("/movies/{query}")
def search_movies(query: str):
    data = search_movie(query)
    if data is None:
        raise HTTPException(status_code=404, detail="Movie not found")
    else:
        first_item = data["results"][0]
        return first_item

@app.post("/movies/{query}")
def add_movie(query: str):
    data = search_movie(query)
    first_item = data["results"][0]
    movie_posts.append(first_item)
    return {"message": "Movie added successfully"}


