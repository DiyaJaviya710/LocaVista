from typing import Optional

from shapely.geometry import Point

from apps.analysis.services.spatial_engine import SpatialAnalysisEngine


class WaterAnalysisService:
    def __init__(self, engine: Optional[SpatialAnalysisEngine] = None):
        self.engine = engine or SpatialAnalysisEngine()

    def analyze(self, point: Point) -> dict:
        distance = self.engine.nearest_distance(point, "water")
        record = self.engine.nearest_feature_record(point, "water")
        name = self.engine.feature_name(record, "water")
        return {
            "nearest_water_body": name,
            "water_distance": distance,
            "nearest_water_body_name": name,
        }
