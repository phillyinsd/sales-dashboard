"""
auth.py — Module 6
===================
JWT authentication helpers.
Handles password hashing, token creation, and token verification.
"""

from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

# ── Config ────────────────────────────────────────────────────────────────────
# In production these move to environment variables (Module 7)
SECRET_KEY  = "changeme-use-a-long-random-string-in-production"
ALGORITHM   = "HS256"
TOKEN_EXPIRE_MINUTES = 60 * 8  # 8 hours

# ── Password hashing ──────────────────────────────────────────────────────────
# bcrypt is the industry standard — it's slow by design to resist brute force
# Never store plain text passwords. Ever.
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(plain: str) -> str:
    """Hash a plain text password — call this when creating a user."""
    return pwd_context.hash(plain)

def verify_password(plain: str, hashed: str) -> bool:
    """Check a plain password against a stored hash — call this on login."""
    return pwd_context.verify(plain, hashed)

# ── JWT tokens ────────────────────────────────────────────────────────────────
def create_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Creates a signed JWT token.
    The token contains the user's email and an expiry time.
    It's signed with SECRET_KEY so the server can verify it wasn't tampered with.
    """
    payload = data.copy()
    expire  = datetime.utcnow() + (expires_delta or timedelta(minutes=TOKEN_EXPIRE_MINUTES))
    payload.update({"exp": expire})
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

# ── Token verification (used as a FastAPI dependency) ─────────────────────────
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    """
    FastAPI dependency — add this to any route you want to protect.
    Usage:  def my_route(user = Depends(get_current_user)):
    FastAPI will automatically extract the Bearer token from the
    Authorization header and pass it here for verification.
    """
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_error
        return {"email": email}
    except JWTError:
        raise credentials_error
