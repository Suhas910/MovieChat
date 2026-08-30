from pydantic import BaseModel, ConfigDict, Field, EmailStr, field_validator
from datetime import datetime
from typing import Optional

# Authentication 

class UserRegister(BaseModel):
    username : str
    email : EmailStr
    password : str

class UserLogin(BaseModel):
    username : str
    password : str

class UserResponse(BaseModel):
    id:int
    username:str
    email:str

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

#Group

class GroupCreate(BaseModel):
    name: str

class GroupResponse(BaseModel):
    group_id: int
    name: str

    model_config={"from_attributes": True}

# ── GroupMember ───────────────────────────────────────────────────────────────

class GroupMemberCreate(BaseModel):
    user_id: int                     # who to add
    group_id: int                    # which group


class GroupMemberResponse(BaseModel):
    user_id: int
    group_id: int
    joined_at: datetime

    model_config = {"from_attributes": True}

#Movie

class MovieAdd(BaseModel):
    tmdb_id: int
    group_id: int

class MovieResponse(BaseModel):
    id: int
    tmdb_id: int
    title: str
    poster_url: Optional[str]
    release_year: Optional[str]
    overview: Optional[str]

    class Config:
        from_attributes = True

#Review

class ReviewCreate(BaseModel):
    movie_id: int
    group_id: int
    rating: float
    content: Optional[str] = None

    @field_validator("rating")
    def rating_range(cls, v):
        if not (0.5 <= v <= 5.0):
            raise ValueError("Rating must be between 0.5 and 5.0")
        return round(v * 2) / 2   # forces 0.5 steps like IMDB

class ReviewResponse(BaseModel):
    id: int
    movie: MovieResponse
    author: UserResponse
    rating: float
    content: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class ReviewUpdate(BaseModel):
    rating: Optional[float] = None
    content: Optional[str] = None


#Rating
class RatingCreate(BaseModel):
    rating: int = Field(ge=1, le=10)






