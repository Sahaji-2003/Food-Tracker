from fastapi import HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from services.supabase_client import get_supabase

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security)
) -> dict:
    """
    Verify JWT token from Supabase and return user info.
    This dependency validates the access token sent from the mobile app.
    """
    token = credentials.credentials
    
    try:
        supabase = get_supabase()
        # Verify the JWT token with Supabase
        user_response = supabase.auth.get_user(token)
        
        if not user_response or not user_response.user:
            raise HTTPException(
                status_code=401,
                detail="Invalid or expired token"
            )
        
        return {
            "id": user_response.user.id,
            "email": user_response.user.email,
        }
    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail=f"Authentication failed: {str(e)}"
        )


def get_user_id(current_user: dict = Depends(get_current_user)) -> str:
    """Extract user ID from current user."""
    return current_user["id"]
