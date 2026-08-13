import logging
from django.core.management.base import BaseCommand

from apps.analysis.services.training_pipeline_service import TrainingPipelineService

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Generate a GIS feature dataset, train the model, and save model artifacts"

    def handle(self, *args, **options):
        service = TrainingPipelineService()
        result = service.train_all(samples=2500)
        self.stdout.write(self.style.SUCCESS(f"Training completed: {result}"))

