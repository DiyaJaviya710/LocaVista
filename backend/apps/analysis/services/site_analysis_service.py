import logging
from typing import Any, Dict, Optional

from apps.analysis.services.prediction_service import PredictionService
from apps.analysis.services.spatial_engine import SpatialAnalysisEngine, SpatialAnalysisError
from apps.analysis.services.use_case_scorers import USE_CASES

logger = logging.getLogger(__name__)


class SiteAnalysisService:
    """Compute a site readiness analysis from location coordinates using unified prediction engine."""

    def __init__(self, feature_engine: Optional[SpatialAnalysisEngine] = None):
        self.prediction_service = PredictionService(engine=feature_engine)

    def analyze(
        self,
        latitude: float,
        longitude: float,
        use_case: str = "restaurant",
        retail_type: Optional[str] = None,
        restaurant_type: Optional[str] = None,
        office_type: Optional[str] = None,
        school_type: Optional[str] = None,
    ) -> Dict[str, Any]:
        if use_case not in USE_CASES:
            raise ValueError(f"Unknown use_case {use_case!r}. Expected one of {USE_CASES}.")
        try:
            pred = self.prediction_service.predict(
                latitude=float(latitude),
                longitude=float(longitude),
                use_case=use_case,
                retail_type=retail_type,
                restaurant_type=restaurant_type,
                office_type=office_type,
                school_type=school_type,
            )
            if pred.get("is_water"):
                explanation = pred.get("explanation", {})
                features = pred.get("features", {})
                metrics = dict(features)
                metrics["score"] = None
                metrics["prediction"] = "Score Not Valid (Water Body)"
                metrics["site_readiness_score"] = None
                metrics["is_water"] = True
                metrics["water_message"] = "Score is not valid on water"
                metrics["explanation"] = explanation
                metrics["use_case"] = use_case
                return metrics

            features = pred.get("features", {})
            explanation = pred.get("explanation", {})
            score_val = pred.get("score")

            metrics = dict(features)
            metrics["population_density"] = metrics.get("population_value")
            metrics["flood_risk"] = metrics.get("flood_risk")
            metrics["competitor_count"] = metrics.get("competitors_250")
            metrics["nearest_competitors"] = metrics.get("nearest_competitors", [])
            metrics["land_use"] = metrics.get("landuse")
            metrics["site_readiness_score"] = score_val
            metrics["score"] = score_val
            metrics["ml_score"] = pred.get("ml_score", score_val)
            metrics["heuristic_score"] = pred.get("heuristic_score")
            metrics["scoring_method"] = pred.get("scoring_method", "machine_learning")
            metrics["confidence"] = pred.get("confidence")
            metrics["prediction"] = pred.get("prediction")
            metrics["explanation"] = explanation
            metrics["use_case"] = use_case
            return metrics
        except SpatialAnalysisError:
            raise
        except Exception as exc:
            logger.exception("Site analysis failed")
            raise ValueError(f"Analysis failed: {exc}") from exc

    def compare(
        self,
        location_a,
        location_b,
        use_case: str = "restaurant",
        retail_type: Optional[str] = None,
        restaurant_type: Optional[str] = None,
        office_type: Optional[str] = None,
        school_type: Optional[str] = None,
    ) -> Dict[str, Any]:
        analysis_a = self.analyze(
            location_a["latitude"],
            location_a["longitude"],
            use_case=use_case,
            retail_type=retail_type,
            restaurant_type=restaurant_type,
            office_type=office_type,
            school_type=school_type,
        )
        analysis_b = self.analyze(
            location_b["latitude"],
            location_b["longitude"],
            use_case=use_case,
            retail_type=retail_type,
            restaurant_type=restaurant_type,
            office_type=office_type,
            school_type=school_type,
        )
        score_a = analysis_a.get("site_readiness_score")
        score_b = analysis_b.get("site_readiness_score")
        if score_a is None and score_b is None:
            better_location = "neither_valid"
        elif score_a is None:
            better_location = "location_b"
        elif score_b is None:
            better_location = "location_a"
        else:
            better_location = "location_a" if score_a >= score_b else "location_b"

        return {
            "location_a": analysis_a,
            "location_b": analysis_b,
            "better_location": better_location,
            "use_case": use_case,
        }
