"""
Job processor - claims and processes pending jobs.
"""

import time
from datetime import datetime, date
from typing import Optional
import structlog

from app.config import get_settings
from app.services.supabase_client import get_supabase_client
from app.services.numerology import SectionType, get_section_reading_data
from app.services.openai_service import generate_reading

logger = structlog.get_logger()

# Section display names
SECTION_DISPLAY_NAMES = {
    "missao_da_alma": "Missão da Alma",
    "personalidade": "Personalidade",
    "destino": "Destino",
    "proposito": "Propósito",
    "manifestacao_material": "Manifestação Material",
}

# Backoff intervals in seconds
BACKOFF_INTERVALS = [30, 60, 120]


def claim_jobs() -> list[dict]:
    """
    Claim pending jobs using RPC.
    
    Returns list of claimed job records.
    """
    settings = get_settings()
    supabase = get_supabase_client()
    
    try:
        result = supabase.rpc(
            "claim_pending_jobs",
            {"job_limit": settings.job_claim_limit}
        ).execute()
        
        jobs = result.data or []
        if jobs:
            logger.info("jobs_claimed", count=len(jobs))
        return jobs
        
    except Exception as e:
        logger.error("claim_jobs_failed", error=str(e))
        return []


def get_profile(user_id: str) -> Optional[dict]:
    """Get user profile."""
    supabase = get_supabase_client()
    
    try:
        result = supabase.table("profiles").select("*").eq("id", user_id).execute()
        if result.data and len(result.data) > 0:
            return result.data[0]
        return None
    except Exception as e:
        logger.error("get_profile_failed", user_id=user_id[:8], error=str(e))
        return None


def get_active_prompt(section: SectionType) -> Optional[dict]:
    """Get the active prompt for a section."""
    supabase = get_supabase_client()
    
    try:
        result = supabase.table("prompts").select("*").eq("section", section).eq("is_active", True).execute()
        if result.data and len(result.data) > 0:
            return result.data[0]
        return None
    except Exception as e:
        logger.error("get_active_prompt_failed", section=section, error=str(e))
        return None


def upsert_reading(
    user_id: str,
    section: SectionType,
    content: dict,
    prompt_version: str,
    model_used: str,
) -> None:
    """
    Upsert reading (insert or update on conflict).
    """
    supabase = get_supabase_client()
    
    supabase.table("readings").upsert(
        {
            "user_id": user_id,
            "section": section,
            "content": content,
            "prompt_version": prompt_version,
            "model_used": model_used,
        },
        on_conflict="user_id,section"
    ).execute()
    
    logger.info("reading_upserted", user_id=user_id[:8], section=section)


def update_job_completed(job_id: str, result: Optional[dict] = None) -> None:
    """Mark job as completed."""
    supabase = get_supabase_client()
    
    supabase.table("jobs").update({
        "status": "completed",
        "completed_at": datetime.utcnow().isoformat(),
        "result": result or {"success": True},
    }).eq("id", job_id).execute()


def update_job_failed(job_id: str, error: str, attempts: int) -> None:
    """Mark job as failed or schedule retry."""
    supabase = get_supabase_client()
    
    update_data = {
        "last_error": error[:500],  # Truncate error
    }
    
    # Check if we should retry or mark as failed
    if attempts >= 3:
        update_data["status"] = "failed"
        update_data["completed_at"] = datetime.utcnow().isoformat()
    else:
        # Schedule retry with backoff
        backoff = BACKOFF_INTERVALS[min(attempts - 1, len(BACKOFF_INTERVALS) - 1)]
        from datetime import timedelta
        retry_at = datetime.utcnow() + timedelta(seconds=backoff)
        update_data["status"] = "pending"
        update_data["started_at"] = None
        update_data["scheduled_at"] = retry_at.isoformat()
    
    supabase.table("jobs").update(update_data).eq("id", job_id).execute()
    
    logger.info(
        "job_updated",
        job_id=job_id[:8],
        status=update_data.get("status", "pending"),
        attempts=attempts,
    )


def process_job(job: dict) -> None:
    """
    Process a single job.
    """
    job_id = job["id"]
    user_id = job["user_id"]
    attempts = job["attempts"]
    payload = job.get("payload", {})
    
    section: SectionType = payload.get("section", "missao_da_alma")
    
    start_time = time.time()
    
    logger.info(
        "job_started",
        job_id=job_id[:8],
        section=section,
        attempt=attempts,
    )
    
    try:
        # Get profile
        profile = get_profile(user_id)
        if not profile:
            raise ValueError(f"Profile not found for user")
        
        if not profile.get("birthdate"):
            raise ValueError("User has no birthdate")
        
        if not profile.get("full_name"):
            raise ValueError("User has no name")
        
        # Get prompt
        prompt = get_active_prompt(section)
        if not prompt:
            raise ValueError(f"No active prompt for section: {section}")
        
        # Calculate numerology
        birthdate = date.fromisoformat(profile["birthdate"])
        ponto_valor, arcano = get_section_reading_data(birthdate, section)
        
        # Generate reading
        settings = get_settings()
        reading_content = generate_reading(
            prompt_template=prompt["template"],
            nome=profile["full_name"],
            ponto_nome=SECTION_DISPLAY_NAMES.get(section, section),
            ponto_valor=ponto_valor,
            arcano=arcano,
        )
        
        # Upsert reading
        upsert_reading(
            user_id=user_id,
            section=section,
            content=reading_content.model_dump_for_db(),
            prompt_version=prompt["version"],
            model_used=settings.openai_model,
        )
        
        # Mark completed
        elapsed_ms = int((time.time() - start_time) * 1000)
        update_job_completed(job_id, {"success": True, "duration_ms": elapsed_ms})
        
        logger.info(
            "job_completed",
            job_id=job_id[:8],
            section=section,
            duration_ms=elapsed_ms,
        )
        
    except Exception as e:
        elapsed_ms = int((time.time() - start_time) * 1000)
        error_type = type(e).__name__
        
        logger.error(
            "job_failed",
            job_id=job_id[:8],
            section=section,
            error_type=error_type,
            duration_ms=elapsed_ms,
        )
        
        update_job_failed(job_id, f"{error_type}: {str(e)}", attempts)


def process_pending_jobs() -> int:
    """
    Main job processing loop.
    
    Returns:
        Number of jobs processed
    """
    logger.info("polling_jobs")
    
    jobs = claim_jobs()
    
    if not jobs:
        logger.debug("no_pending_jobs")
        return 0
    
    for job in jobs:
        try:
            process_job(job)
        except Exception as e:
            # Should not happen, but catch anyway
            logger.error(
                "unexpected_error",
                job_id=job.get("id", "unknown")[:8],
                error=str(e),
            )
    
    return len(jobs)


def enqueue_reading_jobs(user_id: str) -> int:
    """
    Enqueue 5 reading jobs for a user.
    
    Called when subscription is activated.
    Uses deterministic idempotency keys to prevent duplicates.
    
    Returns:
        Number of jobs created
    """
    supabase = get_supabase_client()
    
    sections: list[SectionType] = [
        "missao_da_alma",
        "personalidade",
        "destino",
        "proposito",
        "manifestacao_material",
    ]
    
    created = 0
    
    for section in sections:
        # Deterministic idempotency key
        idempotency_key = f"{user_id}:{section}:v1"
        
        try:
            supabase.table("jobs").insert({
                "user_id": user_id,
                "type": "generate_reading",
                "payload": {"section": section},
                "idempotency_key": idempotency_key,
            }).execute()
            
            created += 1
            logger.info("job_enqueued", user_id=user_id[:8], section=section)
            
        except Exception as e:
            # Likely duplicate key - job already exists
            if "duplicate" in str(e).lower() or "unique" in str(e).lower():
                logger.debug("job_already_exists", section=section)
            else:
                logger.error("enqueue_failed", section=section, error=str(e))
    
    return created


def check_and_enqueue_for_active_subscriptions() -> int:
    """
    Check for active subscriptions that don't have jobs and enqueue them.
    
    Returns:
        Number of users whose jobs were enqueued
    """
    supabase = get_supabase_client()
    
    # Find users with active subscriptions who don't have jobs yet
    # This is a simplified check - in production you might want a more sophisticated approach
    result = supabase.table("subscriptions").select(
        "user_id"
    ).eq(
        "status", "active"
    ).execute()
    
    if not result.data:
        return 0
    
    total_enqueued = 0
    
    for sub in result.data:
        user_id = sub["user_id"]
        
        # Check if user already has jobs
        jobs_result = supabase.table("jobs").select(
            "id"
        ).eq(
            "user_id", user_id
        ).limit(1).execute()
        
        if not jobs_result.data:
            # No jobs yet, enqueue them
            enqueue_reading_jobs(user_id)
            total_enqueued += 1
    
    if total_enqueued:
        logger.info("subscriptions_processed", count=total_enqueued)
    
    return total_enqueued
