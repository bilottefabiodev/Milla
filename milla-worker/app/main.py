"""
Milla Worker - FastAPI application with APScheduler.

Polls for pending jobs every 30 seconds and processes them.
"""

import structlog
import pytz
from contextlib import asynccontextmanager
from datetime import datetime, date, timedelta
from fastapi import FastAPI
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from app.config import get_settings
from app.services.job_processor import (
    process_pending_jobs,
    check_and_enqueue_for_active_subscriptions,
    enqueue_forecast_jobs_for_all_users,
    cleanup_expired_forecasts,
)

# São Paulo timezone
SAO_PAULO_TZ = pytz.timezone('America/Sao_Paulo')

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


def trigger_weekly_forecasts():
    """Trigger weekly forecast generation for all active users."""
    try:
        today = date.today()
        # Find next Sunday (week start)
        days_until_sunday = (6 - today.weekday()) % 7
        if days_until_sunday == 0:
            days_until_sunday = 7
        week_start = today + timedelta(days=days_until_sunday)
        week_end = week_start + timedelta(days=6)
        
        count = enqueue_forecast_jobs_for_all_users("weekly", week_start, week_end)
        logger.info("weekly_forecasts_triggered", count=count)
    except Exception as e:
        logger.error("weekly_forecasts_error", error=str(e))


def trigger_monthly_forecasts():
    """Trigger monthly forecast generation for all active users."""
    try:
        today = date.today()
        # Current month
        month_start = date(today.year, today.month, 1)
        # Last day of current month
        if today.month == 12:
            month_end = date(today.year + 1, 1, 1) - timedelta(days=1)
        else:
            month_end = date(today.year, today.month + 1, 1) - timedelta(days=1)
        
        count = enqueue_forecast_jobs_for_all_users("monthly", month_start, month_end)
        logger.info("monthly_forecasts_triggered", count=count)
    except Exception as e:
        logger.error("monthly_forecasts_error", error=str(e))


def trigger_yearly_forecasts():
    """Trigger yearly forecast generation for all active users."""
    try:
        year = date.today().year
        year_start = date(year, 1, 1)
        year_end = date(year, 12, 31)
        
        count = enqueue_forecast_jobs_for_all_users("yearly", year_start, year_end)
        logger.info("yearly_forecasts_triggered", count=count)
    except Exception as e:
        logger.error("yearly_forecasts_error", error=str(e))


def scheduled_cleanup():
    """Scheduled task to cleanup expired forecasts."""
    try:
        count = cleanup_expired_forecasts()
        if count:
            logger.info("cleanup_complete", deleted=count)
    except Exception as e:
        logger.error("cleanup_error", error=str(e))


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan - start/stop scheduler."""
    settings = get_settings()
    
    # Job processor (every 30 seconds)
    scheduler.add_job(
        scheduled_job_processor,
        "interval",
        seconds=settings.poll_interval_seconds,
        id="job_processor",
        replace_existing=True,
    )
    
    # Weekly forecasts - Sunday 20:00 BRT
    scheduler.add_job(
        trigger_weekly_forecasts,
        CronTrigger(day_of_week='sun', hour=20, minute=0, timezone=SAO_PAULO_TZ),
        id='weekly_forecasts',
        replace_existing=True,
    )
    
    # Monthly forecasts - 1st day 8:00 BRT
    scheduler.add_job(
        trigger_monthly_forecasts,
        CronTrigger(day=1, hour=8, minute=0, timezone=SAO_PAULO_TZ),
        id='monthly_forecasts',
        replace_existing=True,
    )
    
    # Yearly forecasts - January 1st 8:00 BRT
    scheduler.add_job(
        trigger_yearly_forecasts,
        CronTrigger(month=1, day=1, hour=8, minute=0, timezone=SAO_PAULO_TZ),
        id='yearly_forecasts',
        replace_existing=True,
    )
    
    # Cleanup expired forecasts - Daily 3:00 BRT
    scheduler.add_job(
        scheduled_cleanup,
        CronTrigger(hour=3, minute=0, timezone=SAO_PAULO_TZ),
        id='forecast_cleanup',
        replace_existing=True,
    )
    
    scheduler.start()
    logger.info(
        "scheduler_started",
        poll_interval=settings.poll_interval_seconds,
        crons=["weekly_forecasts", "monthly_forecasts", "yearly_forecasts", "forecast_cleanup"],
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
