from typing import Optional

from shapely.geometry import Point

from apps.analysis.services.spatial_engine import SpatialAnalysisEngine


class PopulationAnalysisService:
    def __init__(self, engine: Optional[SpatialAnalysisEngine] = None):
        self.engine = engine or SpatialAnalysisEngine()

    def analyze(self, point: Point) -> dict:
        value = self.engine.population_value(point)
        if value is None:
            category = "Unknown"
        elif value >= 100:
            category = "High"
        elif value >= 50:
            category = "Medium"
        else:
            category = "Low"
        return {"population": round(value, 2) if value is not None else None, "population_category": category}
