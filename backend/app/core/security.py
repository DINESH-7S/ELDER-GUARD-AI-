from datetime import datetime, timedelta, timezone
from typing import Optional, List, Any

try:
    import bcrypt
except ImportError:
    bcrypt = None  # type: ignore

from jose import jwt, JWTError
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.config import (
    JWT_SECRET,
    JWT_ALGORITHM,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    REFRESH_TOKEN_EXPIRE_DAYS,
)

security_scheme = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    """Hashes a plain text password using bcrypt."""
    if bcrypt is None:
        raise RuntimeError("bcrypt package is not installed.")
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain text password against a bcrypt hashed password."""
    if bcrypt is None:
        return False
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False



def create_jwt_token(user_id: str, role: str, expires_delta: Optional[timedelta] = None) -> str:
    """Creates a JWT access token containing user_id and role claims."""
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {
        "sub": str(user_id),
        "user_id": str(user_id),
        "role": role,
        "type": "access",
        "exp": expire
    }
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str, role: str) -> str:
    """Creates a JWT refresh token with longer validity."""
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode = {
        "sub": str(user_id),
        "user_id": str(user_id),
        "role": role,
        "type": "refresh",
        "exp": expire
    }
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verify_jwt_token(token: str) -> dict:
    """Decodes and verifies a JWT token. Raises HTTP 401 if invalid or expired."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials or token expired",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("user_id") or payload.get("sub")
        role: str = payload.get("role")
        if user_id is None or role is None:
            raise credentials_exception
        return payload
    except JWTError:
        raise credentials_exception


def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme)) -> dict:
    """
    FastAPI dependency that extracts Bearer token from Authorization header,
    verifies it, and returns the payload user object dict.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing or invalid scheme",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return verify_jwt_token(credentials.credentials)


def require_role(allowed_roles: List[str]):
    """
    FastAPI dependency factory enforcing that the authenticated user has one of the allowed roles.
    """
    def role_checker(current_user: dict = Depends(get_current_user)) -> dict:
        user_role = current_user.get("role")
        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: User role '{user_role}' is not authorized for this resource. Required: {allowed_roles}",
            )
        return current_user
    return role_checker
