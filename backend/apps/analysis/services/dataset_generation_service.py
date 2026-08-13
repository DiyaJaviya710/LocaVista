import logging
import random
from pathlib import Path
from typing import Optional

import pandas as pd

# pyrefly: ignore [missing-import]
from    apps.analysis.services.feature_extraction_service import FeatureExtractionService
# pyrefly: ignore [missing-import]
from apps.analysis.services.spatial_engine import get_default_engine
# pyrefly: ignore [missing-import]
from apps.analysis.services.use_case_scorers import SCORERS, USE_CASES
from shapely.geometry import Point

logger = logging.getLogger(__name__)


class DatasetGenerationService:
    """Generate a labeled training dataset from random Ahmedabad coordinates.

    Each row gets all four per-use-case score columns
    (restaurant_score, retail_score, office_score, clinic_score) computed
    from the same 16-feature vector. Downstream, TrainingPipelineService
    picks the column matching the `use_case` it's training.

    Competitor counts are computed per use case (only same-category
    businesses are "competitors"). The dataset keeps per-UC competitor
    columns (`competitors_500_<uc>`) so that each scorer consumes the
    right counts. For training/prediction, the active use case's column
    is copied into `competitors_500` before the model sees it.
    """

SUBCATEGORIES_BY_USE_CASE = {
    "retail": ["grocery", "supermarket", "electronics", "mobile", "clothing", "fashion", "footwear", "pharmacy", "beauty", "cosmetics", "jewellery", "furniture", "general"],
    "restaurant": ["fast_food", "cafe", "coffee", "pizza", "burger", "sandwich", "gujarati", "punjabi", "south_indian", "chinese", "fine_dining", "dessert", "bakery", "street_food"],
    "office": ["it_software", "corporate", "coworking", "financial", "bpo", "general"],
    "school": ["primary_preschool", "secondary_highschool", "international", "coaching", "college_university", "general"],
    "hospital": ["hospital", "general"],
    "clinic": ["clinic", "general"],
}


def calc_competition_pressure(c250: float, c500: float, c1000: float) -> float:
    c250_val = max(0.0, float(c250 or 0))
    c500_val = max(0.0, float(c500 or 0))
    c1000_val = max(0.0, float(c1000 or 0))
    comp_0_250 = c250_val
    comp_250_500 = max(0.0, c500_val - c250_val)
    comp_500_1000 = max(0.0, c1000_val - c500_val)
    return round(comp_0_250 * 1.0 + comp_250_500 * 0.6 + comp_500_1000 * 0.25, 2)


class DatasetGenerationService:
    """Generate a labeled training dataset from random Ahmedabad coordinates."""

    def __init__(self, feature_service: Optional[FeatureExtractionService] = None):
        self.feature_service = feature_service or FeatureExtractionService()
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

    def generate_dataset(self, output_dir: Optional[Path] = None, samples: int = 2500, use_case: str = "restaurant") -> pd.DataFrame:
        output_dir = output_dir or Path(__file__).resolve().parent / "artifacts" / use_case
        output_dir.mkdir(parents=True, exist_ok=True)

        engine = get_default_engine()
        rows = []
        random.seed(42)

        subcategories = SUBCATEGORIES_BY_USE_CASE.get(use_case, ["general"])

        for i in range(samples):
            latitude = round(random.uniform(22.81, 23.29), 6)
            longitude = round(random.uniform(72.31, 72.89), 6)
            subcat = subcategories[i % len(subcategories)]

            try:
                kw = {}
                if use_case == "retail":
                    kw["retail_type"] = subcat
                elif use_case == "restaurant":
                    kw["restaurant_type"] = subcat
                elif use_case == "office":
                    kw["office_type"] = subcat
                elif use_case == "school":
                    kw["school_type"] = subcat
                elif use_case in ("hospital", "clinic"):
                    kw["hospital_type"] = subcat

                features = self.feature_service.extract(latitude, longitude, use_case=use_case, **kw)
            except Exception as exc:
                logger.warning("Skipping sample %s, %s: %s", latitude, longitude, exc)
                continue

            c250 = features.get("competitors_250") or 0
            c500 = features.get("competitors_500") or 0
            c1000 = features.get("competitors_1000") or 0
            pressure = calc_competition_pressure(c250, c500, c1000)

            row = {
                "latitude": latitude,
                "longitude": longitude,
                "business_subcategory": subcat,
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
                "landuse": features.get("landuse"),
                "flood_risk": features.get("flood_risk"),
                "competitors_250": c250,
                "competitors_500": c500,
                "competitors_1000": c1000,
                "competition_pressure": pressure,
            }

            # pyrefly: ignore [missing-import]
            from apps.analysis.services.use_case_scorers import SCORERS
            scorer = SCORERS.get(use_case)
            if scorer:
                row[f"{use_case}_score"] = scorer(features, subcategory=subcat)
            else:
                row[f"{use_case}_score"] = 50.0

            rows.append(row)

        if not rows:
            raise RuntimeError(f"No valid samples could be generated for use_case {use_case}")

        df = pd.DataFrame(rows)
        csv_path = output_dir / "dataset.csv"
        df.to_csv(csv_path, index=False)
        logger.info("Wrote %d samples to %s for use_case %s", len(df), csv_path, use_case)
        return df

    def _generate_rule_based_label(self, row: dict) -> float:
        # pyrefly: ignore [missing-import]
        from apps.analysis.services.scoring_service import SiteScoringService

        metrics = {
            "road_distance": row.get("road_distance"),
            "population_density": row.get("population_value"),
            "flood_risk": row.get("flood_risk"),
            "competitor_count": row.get("competitors_250"),
            "land_use": row.get("landuse"),
        }
        return float(SiteScoringService().score(metrics))
