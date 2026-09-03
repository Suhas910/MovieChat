from fastapi import FastAPI, HTTPException
from datetime import datetime, date
from fastapi.middleware.cors import CORSMiddleware

from .database import engine, Base, get_db
from sqlalchemy.orm import Session
from fastapi import Depends

from . import schemas

from . import auth, models

from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from . import tmdb_service


Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://movie-chat-frontend.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    token = credentials.credentials  # extract token from header
    payload = auth.verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user = db.query(models.User).filter(models.User.username == payload["sub"]).first()
    return user


def verify_grp_membership(
    group_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    membership = (
        db.query(models.GroupMember)
        .filter(
            models.GroupMember.group_id == group_id,
            models.GroupMember.user_id == current_user.user_id,
        )
        .first()
    )
    if not membership:
        raise HTTPException(
            status_code=403, detail="You are not a member of this group"
        )
    return current_user


@app.get("/")
def hello_world():
    return {"Message": "Hello World"}


@app.post("/register")
def register(user: schemas.UserRegister, db: Session = Depends(get_db)):
    # check if username already exists
    existing = (
        db.query(models.User).filter(models.User.username == user.username).first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Username already taken")

    new_user = models.User(
        username=user.username,
        email=user.email,
        hashed_password=auth.hash_password(user.password),  # hash before saving
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@app.post("/login")
def login(credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    user = (
        db.query(models.User)
        .filter(models.User.username == credentials.username)
        .first()
    )

    # check user exists and password matches
    if not user or not auth.verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # generate token with user info inside
    token = auth.create_token({"sub": user.username, "id": user.user_id})
    return {"access_token": token, "token_type": "bearer"}


@app.post("/create_group")
def create_group(
    grp: schemas.GroupCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):

    new_group = models.Group(name=grp.name, created_by=current_user.user_id)
    db.add(new_group)
    db.commit()
    db.refresh(new_group)

    grp_id = db.query(models.Group).filter(models.Group.name == grp.name).first()
    grp_member = models.GroupMember(
        user_id=current_user.user_id, group_id=grp_id.group_id
    )
    db.add(grp_member)
    db.commit()
    db.refresh(grp_member)

    return new_group


@app.post("/groups/{group_id}/add-member")
def add_member(
    group_id: int,
    username: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    admin = db.query(models.Group).filter(models.Group.group_id == group_id).first()

    if current_user.user_id == admin.created_by:
        # check if a user with this specific username exists
        user = db.query(models.User).filter(models.User.username == username).first()

        if user:
            # user with this username exists, add user to this grp
            add_member = models.GroupMember(user_id=user.user_id, group_id=group_id)
            db.add(add_member)
            db.commit()
        else:
            raise HTTPException(status_code=404, detail="Username not found")

    else:
        raise HTTPException(status_code=401, detail="Unauthorised")

    return {"user added"}

@app.get("/groups/{group_id}/all-members")
def all_members(
    group_id: int,
    current_user: models.User = Depends(verify_grp_membership),
    db: Session = Depends(get_db),
):
    #members whole row, access with .
    members = db.query(models.GroupMember).filter(models.GroupMember.group_id == group_id).all()

    all_members = []

    for member in members:
        user = db.query(models.User).filter(models.User.user_id == member.user_id).first()
        name = user.username
        all_members.append(name)

    return all_members




# all groups user is in — returns full objects with group_id and name
@app.get("/my_groups")
def my_groups(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    memberships = (
        db.query(models.GroupMember)
        .filter(models.GroupMember.user_id == current_user.user_id)
        .all()
    )
    groups = []
    for membership in memberships:
        grp = (
            db.query(models.Group)
            .filter(models.Group.group_id == membership.group_id)
            .first()
        )
        if grp:
            groups.append({"group_id": grp.group_id, "name": grp.name})
    return groups


@app.get("/groups/{group_id}/popular_movies")
def popular_movies(
    group_id: int, current_user: models.User = Depends(verify_grp_membership)
):
    pop_movies = tmdb_service.get_popular_movies()
    return pop_movies


@app.get("/groups/{group_id}/movies/{query}")
def search_movies(
    query: str, current_user: models.User = Depends(verify_grp_membership)
):
    data = tmdb_service.search_movie(query)
    if data is None:
        raise HTTPException(status_code=404, detail="Movie not found")
    else:
        first_item = data["results"][0]
        return first_item


@app.post("/groups/{group_id}/movies/{query}")
def add_movie(
    query: str,
    group_id: int,
    current_user: models.User = Depends(verify_grp_membership),
    db: Session = Depends(get_db),
):
    data = tmdb_service.search_movie(query)
    if not data or not data.get("results"):
        raise HTTPException(status_code=404, detail="Movie not found on TMDB")
    first_item = data["results"][0]

    # Check if this movie already exists in this group (by tmdb_id + group_id)
    existing = (
        db.query(models.Movie)
        .filter(
            models.Movie.tmdb_id == first_item["id"],
            models.Movie.group_id == group_id,
        )
        .first()
    )
    if existing:
        return {"message": "Movie already in group", "movie_id": existing.movie_id}

    new_movie = models.Movie(
        tmdb_id=first_item["id"],
        title=first_item["title"],
        poster_url=first_item["poster_path"],
        desc=first_item["overview"],
        release_year=first_item["release_date"],
        group_id=group_id,
        added_by=current_user.user_id,
    )

    db.add(new_movie)
    db.commit()
    db.refresh(new_movie)

    return {"message": "Movie added successfully", "movie_id": new_movie.movie_id}


@app.get("/groups/{group_id}/movies")
def show_all_movies(
    group_id: int,
    current_user: models.User = Depends(verify_grp_membership),
    db: Session = Depends(get_db),
):
    all_movies = (
        db.query(models.Movie)
        .filter(models.Movie.group_id == group_id)
        .order_by(models.Movie.movie_id.desc())
        .all()
    )

    return all_movies


@app.post("/groups/{group_id}/movies/{movie_id}/add-rating")
def add_rating(
    group_id: int,
    movie_id: int,
    user_rating: schemas.RatingCreate,
    current_user: models.User = Depends(verify_grp_membership),
    db: Session = Depends(get_db),
):
    # Upsert: update if this user already rated this movie in this group
    existing = (
        db.query(models.Rating)
        .filter(
            models.Rating.user_id == current_user.user_id,
            models.Rating.movie_id == movie_id,
            models.Rating.group_id == group_id,
        )
        .first()
    )
    if existing:
        existing.rating = user_rating.rating
        db.commit()
        return {"message": "Rating updated"}

    new_rating = models.Rating(
        user_id=current_user.user_id,
        movie_id=movie_id,
        group_id=group_id,
        rating=user_rating.rating,
    )
    db.add(new_rating)
    db.commit()

    user = (
        db.query(models.User)
        .filter(models.User.user_id == current_user.user_id)
        .first()
    )

    return {"message": "Rating added", "username": user.username}


@app.post("/groups/{group_id}/movies/{movie_id}/add-review")
def add_review(
    group_id: int,
    movie_id: int,
    user_review: str,
    current_user: models.User = Depends(verify_grp_membership),
    db: Session = Depends(get_db),
):
    new_review = models.Review(
        user_id=current_user.user_id,
        movie_id=movie_id,
        group_id=group_id,
        content=user_review,
    )

    db.add(new_review)
    db.commit()

    user = (
        db.query(models.User)
        .filter(models.User.user_id == current_user.user_id)
        .first()
    )

    return {"message": "Review added successfully", "username": user.username}


@app.get("/groups/{group_id}/movies/{movie_id}/rating&review")
def rating_review(
    group_id: int,
    movie_id: int,
    current_user: models.User = Depends(verify_grp_membership),
    db: Session = Depends(get_db),
):
    all_ratings = (
        db.query(models.Rating)
        .filter(models.Rating.group_id == group_id, models.Rating.movie_id == movie_id)
        .all()
    )

    all_reviews = (
        db.query(models.Review)
        .filter(models.Review.group_id == group_id, models.Review.movie_id == movie_id)
        .all()
    )

    ratings_data = []
    for r in all_ratings:
        rating_user = (
            db.query(models.User).filter(models.User.user_id == r.user_id).first()
        )
        ratings_data.append(
            {
                "user_id": r.user_id,
                "username": rating_user.username,
                "rating": r.rating,
            }
        )

    reviews_data = []
    for rev in all_reviews:
        review_user = (
            db.query(models.User).filter(models.User.user_id == rev.user_id).first()
        )
        reviews_data.append(
            {
                "review_id": rev.review_id,
                "user_id": rev.user_id,
                "username": review_user.username,
                "content": rev.content,
                "created_at": rev.created_at,
            }
        )

    return {
        "ratings": ratings_data,
        "reviews": reviews_data,
    }
