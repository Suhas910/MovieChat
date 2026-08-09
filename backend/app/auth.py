from datetime import datetime, timedelta, UTC
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from . import models, schemas
from .database import get_db
import os
from dotenv import load_dotenv

load_dotenv()

# --Configuration--
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise ValueError("SECRET_KEY not found in .env")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

#---PASSWORD_HASHING-----------------
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str):
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str):
    return pwd_context.context.verify(plain_password, hashed_password)

#JWT Token Creation--------------------
def create_access_token(data: dict) -> str:
    """
    Create a JWT token.
    
    Args:
        data: dict with at least {"sub": user_id}
              "sub" = subject, standard JWT field for "who is this token for"
    
    Returns:
        A JWT string like "eyJ...xyz"
    """

    payload = data.copy()

    expire = datetime.now(UTC) + timedelta(minutes = ACCESS_TOKEN_EXPIRE_MINUTES)
    payload.update({"exp": expire})

    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    return token

#JWT Token Verification
oauth2_scheme = OAuth2PasswordBearer(tokenurl="/auth/login")

def get_current_user(
        token:str = Depends(oauth2_scheme),
        db: Session = Depends(get_db)
):
    """
    Dependency that verifies a JWT token and returns the User.
    
    Flow:
      1. FastAPI extracts token from Authorization header
      2. This function decodes it (verifies signature)
      3. Gets user_id from the payload
      4. Fetches User from DB
      5. Returns User to the route
    
    If token is invalid/expired → raises 401 Unauthorized
    """

    from .database import get_db
    from . import models

    credentials_exception = HTTPException(
        status_code = status.HTTP_401_UNAUTHORIZED,
        detail = "Could not validate credentials",
        headers = {"WWW-Authenticate":"Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("sub")

        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if user is None:
        raise credentials_exception

    return user



