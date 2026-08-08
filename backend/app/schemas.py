from pydantic import BaseModel, ConfigDict, Field, EmailStr, field_validator
from datetime import datetime
from typing import list , Optional

# Authentication 

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id:int
    username:str
    email:str

    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    username: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

#Group

class GroupCreate(BaseModel):
    name: str
    description: Optional[str] = None

class GroupResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    created_by : UserResponse
    members: list[UserResponse] = []

    class Config:
        from_attributes = True

class GroupInvite(BaseModel):
    username: str

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

#comment
class CommentCreate(BaseModel):
    review_id: int
    content: str

class CommentResponse(BaseModel):
    id: int
    author: UserResponse
    content: str
    created_at: datetime

    class Config:
        from_attributes = True




