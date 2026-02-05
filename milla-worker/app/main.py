"""
Milla Worker - FastAPI application with APScheduler.

Polls for pending jobs every 30 seconds and processes them.
"""

import structlog
from contextlib import asynccontextmanager
from datetime import datetime
from fastapi import FastAPI
from apscheduler.schedulers.background import BackgroundScheduler

from app.config import get_settings
from app.services.job_processor import (
    process_pending_jobs,
    check_and_enqueue_for_active_subscriptions,
)

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

# Scheduler instance
scheduler = BackgroundScheduler()


def scheduled_job_processor():
    """Scheduled task to process pending jobs."""
    try:
        # First, check for new subscriptions and enqueue jobs
        check_and_enqueue_for_active_subscriptions()
        
        # Then process pending jobs
        count = process_pending_jobs()
        if count:
            logger.info("scheduled_run_complete", processed=count)
    except Exception as e:
        logger.error("scheduled_run_error", error=str(e))


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan - start/stop scheduler."""
    settings = get_settings()
    
    # Start scheduler
    scheduler.add_job(
        scheduled_job_processor,
        "interval",
        seconds=settings.poll_interval_seconds,
        id="job_processor",
        replace_existing=True,
    )
    scheduler.start()
    logger.info(
        "scheduler_started",
        poll_interval=settings.poll_interval_seconds,
    )
    
    yield
    
    # Shutdown scheduler
    scheduler.shutdown(wait=False)
    logger.info("scheduler_stopped")


# Create FastAPI app
app = FastAPI(
    title="Milla Worker",
    description="Background job processor for Milla readings",
    version="1.0.0",
    lifespan=lifespan,
)


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {
        "status": "ok",
        "timestamp": datetime.utcnow().isoformat(),
        "scheduler_running": scheduler.running,
    }


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "service": "milla-worker",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.post("/trigger")
async def trigger_job_processing():
    """
    Manually trigger job processing.
    
    Useful for testing and debugging.
    """
    try:
        # Check for subscriptions
        enqueued = check_and_enqueue_for_active_subscriptions()
        
        # Process jobs
        processed = process_pending_jobs()
        
        return {
            "success": True,
            "enqueued": enqueued,
            "processed": processed,
        }
    except Exception as e:
        logger.error("manual_trigger_error", error=str(e))
        return {
            "success": False,
            "error": str(e),
        }
