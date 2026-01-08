"""
Celery application configuration for SeeMe ML Service
Handles asynchronous image processing tasks with RabbitMQ broker and Redis backend
"""
from celery import Celery
from celery.signals import worker_ready, worker_shutdown
from loguru import logger

from config import settings

# Initialize Celery app
celery_app = Celery(
    'seeme_ml',
    broker=settings.rabbitmq_url,
    backend=settings.redis_url,
    include=['tasks.process_image']
)

# Celery Configuration
celery_app.conf.update(
    # Serialization
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',

    # Timezone
    timezone='UTC',
    enable_utc=True,

    # Task execution
    task_track_started=True,
    task_time_limit=settings.celery_task_time_limit,
    task_soft_time_limit=settings.celery_task_time_limit - 30,  # 30 seconds before hard limit

    # Results
    result_expires=settings.celery_result_expires,
    result_extended=True,

    # Worker
    worker_prefetch_multiplier=1,  # One task at a time (for GPU-intensive work)
    worker_max_tasks_per_child=50,  # Restart worker after 50 tasks (prevent memory leaks)

    # Retry policy
    task_default_retry_delay=30,  # 30 seconds
    task_max_retries=3,

    # Queue configuration
    task_default_queue='ml_processing',
    task_routes={
        'tasks.process_image.process_image_task': {'queue': 'ml_processing'},
    },
)


@worker_ready.connect
def on_worker_ready(sender, **kwargs):
    """Called when worker is ready to receive tasks"""
    logger.info("=" * 60)
    logger.info("Celery Worker Ready")
    logger.info(f"Broker: {settings.rabbitmq_url}")
    logger.info(f"Backend: {settings.redis_url}")
    logger.info("=" * 60)


@worker_shutdown.connect
def on_worker_shutdown(sender, **kwargs):
    """Called when worker is shutting down"""
    logger.info("Celery Worker Shutting Down")


if __name__ == '__main__':
    celery_app.start()
