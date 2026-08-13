from typing import Optional

from shapely.geometry import Point

from apps.analysis.services.spatial_engine import SpatialAnalysisEngine


class RoadAnalysisService:
    def __init__(self, engine: Optional[SpatialAnalysisEngine] = None):
        self.engine = engine or SpatialAnalysisEngine()

    def analyze(self, point: Point) -> dict:
        distance = self.engine.nearest_distance(point, "roads")
        record = self.engine.nearest_feature_record(point, "roads")
        name = self.engine.feature_name(record, "roads")
        return {
            "nearest_road": name,
            "road_distance": distance,
            "nearest_road_name": name,
        }
