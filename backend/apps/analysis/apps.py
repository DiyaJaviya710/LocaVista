import logging
import os

from django.apps import AppConfig

logger = logging.getLogger(__name__)


class AnalysisConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.analysis"

    def ready(self) -> None:
        if os.environ.get("RUN_MAIN") != "true":
            return
        if os.environ.get("ANALYSIS_SKIP_WARMUP") == "1":
            return

        import threading
        import time

        import shapely  # Pre-import to avoid thread-unsafe import race condition

        def _warmup():
            time.sleep(1.0)
            try:
                from apps.analysis.services.spatial_engine import get_default_engine
                engine = get_default_engine()
                keys = [
                    "roads",
                    "poi_hospitals",
                    "poi_schools",
                    "poi_banks",
                    "poi_restaurants",
                    "poi_pharmacies",
                    "poi_bus_stops",
                    "railways",
                    "water",
                    "competitors",
                    "flood",
                    "population_raster",
                    "landuse_residential",
                    "landuse_commercial",
                    "landuse_industrial",
                    "landuse_agriculture",
                ]
                from shapely.geometry import Point

                point = Point(72.5714, 23.0225)
                for key in keys:
                    try:
                        engine.get_index(key)
                    except Exception:
                        logger.exception("Warm-up failed for dataset %s", key)
                try:
                    engine.population_value(point)
                except Exception:
                    logger.exception("Population raster warm-up failed")
                logger.info("Spatial analysis engine warm-up complete")

                from apps.analysis.services.prediction_service import PredictionService
                prediction_service = PredictionService(engine=get_default_engine())
                prediction_service.load()
                logger.info(
                    "Prediction model preloaded for use cases: %s",
                    prediction_service.available_use_cases,
                )
            except Exception:
                logger.exception("Spatial engine warm-up failed")

        threading.Thread(target=_warmup, daemon=True).start()

