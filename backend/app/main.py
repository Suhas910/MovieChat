from fastapi import FastAPI, HTTPException, Depends
from app.tmdb_service import get_popular_movies, search_movie
from app.database import get_db, engine, SessionLocal
from app.models import Base
from fastapi.security import OAuth2PasswordRequestForm
from . import auth, schemas, models


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
def add_movie(
    query: str,
    db: SessionLocal = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)):
    data = search_movie(query)
    first_item = data["results"][0]
    movie_posts.append(first_item)
    return {"message": "Movie added successfully"}

@app.post("/auth/register", response_model=schemas.UserResponse)
def register(user: schemas.UserCreate, db: SessionLocal = Depends(get_db)):

    # Check if user exists
    existing = db.query(models.User).filter(models.User.username == user.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already taken")

    # Create new user with hashed password
    db_user = models.User(
        username=user.username,
        hashed_password=auth.hash_password(user.password)
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.post("/auth/login", response_model=schemas.Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: SessionLocal = Depends(get_db)
):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    
    # Check password (if user doesn't exist, verify still works but returns False)
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=401,
            detail="Invalid username or password"
        )

    # Create token with user's ID
    token = auth.create_access_token(data={"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer"}


