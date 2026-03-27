# server/services/auth.py
import os
import jwt
from datetime import datetime, timedelta
from google.auth.transport import requests
from google.oauth2 import id_token


LOCAL_GOOGLE_REDIRECT_URI = "http://localhost:5000/api/auth/google/callback"


def _is_render_runtime() -> bool:
    return (os.getenv("RENDER") or "").strip().lower() == "true"


def get_google_callback_url() -> str:
    return get_google_redirect_uri()


def get_google_redirect_uri() -> str:
    # Local development should always use localhost callback.
    if not _is_render_runtime():
        return LOCAL_GOOGLE_REDIRECT_URI

    callback_url = (os.getenv("GOOGLE_CALLBACK_URL") or "").strip()
    if not callback_url:
        raise Exception("GOOGLE_CALLBACK_URL não configurado no Render")
    if not (callback_url.startswith("http://") or callback_url.startswith("https://")):
        raise Exception("GOOGLE_CALLBACK_URL deve ser uma URL completa (http/https)")
    return callback_url.rstrip("/")

def verify_google_token(token: str):
    """Verify Google ID token and return payload"""
    try:
        google_client_id = os.getenv('GOOGLE_CLIENT_ID')
        
        if not google_client_id:
            raise Exception("GOOGLE_CLIENT_ID não configurado no .env")
        
        # Verify token with Google
        idinfo = id_token.verify_oauth2_token(
            token, 
            requests.Request(), 
            google_client_id
        )
        
        # Token is valid
        return {
            'email': idinfo.get('email'),
            'name': idinfo.get('name'),
            'picture': idinfo.get('picture'),
            'aud': idinfo.get('aud')
        }
    except Exception as e:
        raise Exception(f"Token verification failed: {str(e)}")

def generate_jwt(payload: dict):
    """Generate JWT token"""
    jwt_secret = os.getenv('JWT_SECRET') or os.getenv('JWT_SECRET_DEV') or os.getenv('JWT_SECRET_PROD')
    
    if not jwt_secret:
        raise Exception("JWT_SECRET not configured")
    
    # Keep only app-relevant claims to avoid decode issues with provider-specific fields
    # like "aud" that can trigger InvalidAudienceError in some PyJWT setups.
    token_payload = {
        'email': payload.get('email'),
        'name': payload.get('name'),
        'picture': payload.get('picture'),
        'role': payload.get('role'),
        'position': payload.get('position'),
        'department': payload.get('department'),
        'exp': datetime.utcnow() + timedelta(hours=24),
        'iat': datetime.utcnow(),
    }

    token = jwt.encode(token_payload, jwt_secret, algorithm='HS256')
    return token

def decode_jwt(token: str):
    """Decode and verify JWT token"""
    jwt_secret = os.getenv('JWT_SECRET') or os.getenv('JWT_SECRET_DEV') or os.getenv('JWT_SECRET_PROD')
    
    try:
        payload = jwt.decode(
            token,
            jwt_secret,
            algorithms=['HS256'],
            options={'verify_aud': False},
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise Exception("Token has expired")
    except jwt.InvalidTokenError:
        raise Exception("Invalid token")
