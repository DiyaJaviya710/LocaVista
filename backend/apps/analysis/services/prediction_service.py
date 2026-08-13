import logging
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

import joblib
import pandas as pd

from apps.analysis.services.explanation_service import ExplanationService
from apps.analysis.services.feature_extraction_service import FeatureExtractionService
from apps.analysis.services.spatial_engine import SpatialAnalysisEngine, SpatialAnalysisError, get_default_engine
from apps.analysis.services.use_case_scorers import USE_CASES

logger = logging.getLogger(__name__)


class PredictionService:
    """Load trained models per use-case and predict site readiness scores."""

    def __init__(
        self,
        artifact_dir: Optional[Path] = None,
        engine: Optional[SpatialAnalysisEngine] = None,
    ):
        self.artifact_dir = artifact_dir or Path(__file__).resolve().parent / "artifacts"
        self.feature_service = FeatureExtractionService(engine=engine or get_default_engine())
        self.explanation_service = ExplanationService()
        self.feature_columns = [
            "road_distance",
            "highway_distance",
            "hospital_distance",
            "school_distance",
            "bank_distance",
            "restaurant_distance",
            "pharmacy_distance",
            "bus_stop_distance",
            "railway_distance",
            "water_distance",
            "population_value",
            "population_category",
            "competitors_250",
            "competitors_500",
            "competitors_1000",
            "competition_pressure",
            "landuse",
            "flood_risk",
            "business_subcategory",
        ]
        self._bundles: Dict[str, Tuple[Any, Any]] = {}
        self.available_use_cases: Tuple[str, ...] = ()

    def _model_path(self, use_case: str) -> Path:
        return self.artifact_dir / use_case / "model.pkl"

    def _preprocessor_path(self, use_case: str) -> Path:
        return self.artifact_dir / use_case / "preprocessor.pkl"

    def load(self) -> None:
        loaded = []
        for uc in USE_CASES:
            model_path = self._model_path(uc)
            preprocessor_path = self._preprocessor_path(uc)
            if not model_path.exists() or not preprocessor_path.exists():
                logger.warning(
                    "Skipping use-case %s: missing artifacts at %s or %s",
                    uc, model_path, preprocessor_path,
                )
                continue
            self._bundles[uc] = (joblib.load(model_path), joblib.load(preprocessor_path))
            loaded.append(uc)
        self.available_use_cases = tuple(loaded)
        if not loaded:
            raise RuntimeError(
                "No prediction artifacts found. Train models first via "
                "TrainingPipelineService.train_all()."
            )
        logger.info("PredictionService loaded use cases: %s", loaded)

    def predict(self, latitude: float, longitude: float, use_case: str = "restaurant", retail_type: Optional[str] = None, restaurant_type: Optional[str] = None, office_type: Optional[str] = None, school_type: Optional[str] = None, hospital_type: Optional[str] = None) -> Dict[str, Any]:
        if not self._bundles:
            self.load()

        if use_case not in self._bundles:
            raise ValueError(
                f"Use case {use_case!r} is not loaded. Available: {self.available_use_cases}. "
                "Train it with TrainingPipelineService.run(use_case='{use_case}')."
            )

        from shapely.geometry import Point
        point = Point(longitude, latitude)
        is_water, water_name = self.feature_service.engine.is_point_in_water(point)

        features = self.feature_service.extract(latitude, longitude, use_case=use_case, retail_type=retail_type, restaurant_type=restaurant_type, office_type=office_type, school_type=school_type, hospital_type=hospital_type)
        water_dist = features.get("water_distance")

        if is_water or (water_dist is not None and float(water_dist) <= 50.0):
            water_body_title = water_name or features.get("nearest_water_body_name") or "Sabarmati River / Water Body"
            return {
                "score": None,
                "confidence": 0.0,
                "prediction": "Score Not Valid (Water Body)",
                "use_case": use_case,
                "is_water": True,
                "water_message": "Score is not valid on water",
                "explanation": {
                    "recommendation": f"Location on Water Body: Selected point is located directly inside or on a water body ({water_body_title}). Construction or commercial setup is not viable on open water. Score is not valid on water.",
                    "drivers": [
                        {
                            "name": "Submerged in Water Body",
                            "impact": "N/A",
                            "type": "negative",
                            "detail": f"Inside {water_body_title} - Score is not valid on water"
                        }
                    ],
                    "top_positive_features": [],
                    "top_negative_features": ["Submerged in Water Body"]
                },
                "features": features,
            }

        if use_case == "restaurant" and restaurant_type and restaurant_type != "auto":
            selected_subcategory = str(restaurant_type).lower()
        elif use_case == "retail" and retail_type and retail_type != "auto":
            selected_subcategory = str(retail_type).lower()
        elif use_case == "office" and office_type and office_type != "auto":
            selected_subcategory = str(office_type).lower()
        elif use_case == "school" and school_type and school_type != "auto":
            selected_subcategory = str(school_type).lower()
        elif use_case == "hospital" and hospital_type and hospital_type != "auto":
            selected_subcategory = str(hospital_type).lower()
        else:
            selected_subcategory = str(
                restaurant_type or retail_type or office_type or school_type or hospital_type or "general"
            ).lower()

        from apps.analysis.services.dataset_generation_service import calc_competition_pressure
        c250 = features.get("competitors_250") or 0
        c500 = features.get("competitors_500") or 0
        c1000 = features.get("competitors_1000") or 0
        pressure = calc_competition_pressure(c250, c500, c1000)
        features["competition_pressure"] = pressure

        model, preprocessor = self._bundles[use_case]
        row = pd.DataFrame([{
            "road_distance": features.get("road_distance"),
            "highway_distance": features.get("highway_distance"),
            "hospital_distance": features.get("hospital_distance"),
            "school_distance": features.get("school_distance"),
            "bank_distance": features.get("bank_distance"),
            "restaurant_distance": features.get("restaurant_distance"),
            "pharmacy_distance": features.get("pharmacy_distance"),
            "bus_stop_distance": features.get("bus_stop_distance"),
            "railway_distance": features.get("railway_distance"),
            "water_distance": features.get("water_distance"),
            "population_value": features.get("population_value"),
            "population_category": features.get("population_category"),
            "competitors_250": c250,
            "competitors_500": c500,
            "competitors_1000": c1000,
            "competition_pressure": pressure,
            "landuse": features.get("landuse"),
            "flood_risk": features.get("flood_risk"),
            "business_subcategory": selected_subcategory,
        }])

        processed = preprocessor.transform(row[self.feature_columns])
        raw_ml_score = float(model.predict(processed)[0])

        import hashlib
        import json
        feat_dict = row[self.feature_columns].to_dict(orient="records")[0]
        feat_str = json.dumps(feat_dict, sort_keys=True, default=str)
        feature_hash = hashlib.sha256(feat_str.encode("utf-8")).hexdigest()[:12]

        logger.info(
            "[PREDICTION SERVICE TRACE] use_case=%s | subcategory=%s | lat=%.4f | lng=%.4f | feature_hash=%s | raw_score=%.2f",
            use_case, selected_subcategory, latitude, longitude, feature_hash, raw_ml_score
        )

        # Primary & Final Site Readiness Score derived exclusively from ML Model prediction, bounded [0.0, 100.0]
        score = max(0.0, min(100.0, raw_ml_score))

        # Heuristic score calculated strictly for informational/diagnostic/explanation data
        from apps.analysis.services.use_case_scorers import score as compute_heuristic_score
        h_score = compute_heuristic_score(features, use_case=use_case, subcategory=selected_subcategory)
        heuristic_val = float(h_score) if h_score is not None else None

        confidence = max(0.0, min(1.0, 0.85 + (score / 1000.0)))
        explanation = self.explanation_service.explain(features, score, use_case=use_case)

        return {
            "score": round(score, 2),
            "site_readiness_score": round(score, 2),
            "ml_score": round(score, 2),
            "heuristic_score": round(heuristic_val, 2) if heuristic_val is not None else None,
            "scoring_method": "machine_learning",
            "confidence": round(confidence, 2),
            "prediction": self._prediction_label(score),
            "use_case": use_case,
            "explanation": explanation,
            "features": features,
        }


    def _prediction_label(self, score: float) -> str:
        if score >= 80:
            return "Excellent"
        if score >= 60:
            return "Good"
        if score >= 40:
            return "Average"
        return "Poor"
