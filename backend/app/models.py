from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, CheckConstraint, UniqueConstraint
from sqlalchemy.orm import declarative_base, relationship
from .database import Base


class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)

class Group(Base):
    __tablename__ = "groups"

    group_id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    created_by = Column(Integer, ForeignKey("users.user_id"))

class GroupMember(Base):
    __tablename__ = "groupmember"

    group_member_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"))
    group_id = Column(Integer, ForeignKey("groups.group_id"))

class Movie(Base):
    __tablename__ = "movies"

    movie_id = Column(Integer, primary_key=True, index=True)
    tmdb_id = Column(Integer, unique=True, index=True)
    title = Column(String, index=True)
    poster_url = Column(String)
    desc = Column(String)
    release_year = Column(String)
    #created_at = Column(DateTime, default= datetime.now(timezone.utc))

    group_id = Column(Integer, ForeignKey("groups.group_id"))
    added_by =  Column(Integer, ForeignKey("users.user_id"))

class Rating(Base):
    __tablename__ = "ratings"

    user_id = Column(Integer, ForeignKey("users.user_id"), primary_key=True)
    movie_id = Column(Integer, ForeignKey("movies.movie_id"), primary_key=True)
    group_id = Column(Integer, ForeignKey("groups.group_id"), primary_key=True)
    rating = Column(Integer) # 1 to 10

class Review(Base):
    __tablename__ = "reviews"

    review_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"))
    movie_id = Column(Integer, ForeignKey("movies.movie_id"))
    group_id = Column(Integer, ForeignKey("groups.group_id"))
    content = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.now())









