import logging
from pathlib import Path
from typing import Optional

import joblib
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import GroupKFold, KFold, cross_val_score

logger = logging.getLogger(__name__)


class ModelTrainingService:
    """Train and compare regression models for site readiness prediction using Spatial K-Fold Validation."""

    def __init__(self, output_dir: Optional[Path] = None):
        self.output_dir = output_dir or Path(__file__).resolve().parent / "artifacts"
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def train(self, X_train, y_train, X_val, y_val, X_test, y_test, use_case: Optional[str] = None) -> dict:
        models = {
            "random_forest": RandomForestRegressor(n_estimators=200, random_state=42, n_jobs=-1),
            "gradient_boosting": GradientBoostingRegressor(random_state=42),
        }

        # Create spatial cluster groups to prevent spatial autocorrelation leakage
        try:
            coords = X_train[["road_distance", "highway_distance"]].values if "road_distance" in X_train.columns else X_train.values
            spatial_groups = KMeans(n_clusters=5, random_state=42, n_init=10).fit_predict(coords)
        except Exception:
            spatial_groups = None

        tag = f"[{use_case}] " if use_case else ""
        results = {}
        for name, model in models.items():
            model.fit(X_train, y_train)
            pred = model.predict(X_test)
            metrics = {
                "r2": round(float(r2_score(y_test, pred)), 4),
                "mae": round(float(mean_absolute_error(y_test, pred)), 4),
                "rmse": round(float(mean_squared_error(y_test, pred) ** 0.5), 4),
            }
            if spatial_groups is not None:
                gkf = GroupKFold(n_splits=5)
                cv_scores = cross_val_score(model, X_train, y_train, cv=gkf, groups=spatial_groups, scoring="r2")
            else:
                cv = KFold(n_splits=5, shuffle=True, random_state=42)
                cv_scores = cross_val_score(model, X_train, y_train, cv=cv, scoring="r2")
            metrics["cv_r2_mean"] = round(float(cv_scores.mean()), 4)
            results[name] = metrics

            joblib.dump(model, self.output_dir / f"{name}.pkl")

        best_model_name = max(results, key=lambda name: results[name]["r2"])
        best_model = joblib.load(self.output_dir / f"{best_model_name}.pkl")
        joblib.dump(best_model, self.output_dir / "model.pkl")
        logger.info(
            "%sBest model selected: %s (spatial_r2=%s, mae=%s)",
            tag,
            best_model_name,
            results[best_model_name]["r2"],
            results[best_model_name]["mae"],
        )
        return {"results": results, "best_model": best_model_name}

