from supabase import create_client, Client
from functools import lru_cache
from app.config import get_settings


@lru_cache
def get_supabase_client() -> Client:
    """
    Get Supabase client with service_role key.
    
    SECURITY: This client has full database access and bypasses RLS.
    Only use for worker operations, never expose to frontend.
    """
    settings = get_settings()
    return create_client(
        settings.supabase_url,
        settings.supabase_service_role_key
    )
