from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, CheckConstraint, UniqueConstraint
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True)
    username = Column(String(20), unique=True, nullable=False)
    hashed_password = Column(String)
    email = Column(String(30), unique=True, nullable=False)

    ratings = relationship("Rating", back_populates="user", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="user", cascade="all, delete-orphan")

class Movie(Base):
    __tablename__ = "movies"

    movie_id = Column(Integer, primary_key=True)
    title = Column(String(50), nullable=False)
    description = Column(Text)
    release_date = Column(DateTime)

    ratings = relationship("Rating", back_populates="movie", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="movie", cascade="all, delete-orphan")

#Rating of a movie given by user ( 1 to 5 )
class Rating(Base):
    __tablename__ = "ratings"

    __table_args__ = (
        CheckConstraint("rating >= 1 AND rating <= 5", name='check_rating_range'),
    )

    rating_id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.user_id"))
    movie_id = Column(Integer, ForeignKey("movies.movie_id"))
    rating = Column(Integer)

    #relationship
    user = relationship("User", back_populates="ratings")
    movie = relationship("Movie", back_populates="ratings")



class Review(Base):
    __tablename__ = "reviews"

    __table_args__ = (
        UniqueConstraint("user_id", "movie_id", "group_id", name="unique_review_per_user_movie_group"),
    )

    review_id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.user_id"))
    movie_id = Column(Integer, ForeignKey("movies.movie_id"))
    review_text = Column(String(500))

    user = relationship("User", back_populates="reviews")
    movie = relationship("Movie", back_populates="reviews")

class Group(Base):
    __tablename__ = "groups"

    group_id = Column(Integer, primary_key=True)
    name = Column(String(50), unique=True, nullable=False)
    description = Column(String(200))
    created_by = Column(Integer, ForeignKey("users.user_id"))

    members = relationship("GroupMember", back_populates="group", cascade="all, delete-orphan")

class GroupMember(Base):
    __tablename__ = "group_members"

    id = Column(Integer, primary_key=True)
    group_id = Column(Integer, ForeignKey("groups.group_id"))
    user_id = Column(Integer, ForeignKey("users.user_id"))

    group = relationship("Group", back_populates="members")
    user = relationship("User")




