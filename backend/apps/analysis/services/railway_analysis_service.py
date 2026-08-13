from typing import Optional

from shapely.geometry import Point

from apps.analysis.services.spatial_engine import SpatialAnalysisEngine


class RailwayAnalysisService:
    def __init__(self, engine: Optional[SpatialAnalysisEngine] = None):
        self.engine = engine or SpatialAnalysisEngine()

    def analyze(self, point: Point) -> dict:
        distance = self.engine.nearest_distance(point, "railways")
        record = self.engine.nearest_feature_record(point, "railways")
        name = self.engine.feature_name(record, "railways")
        return {
            "railway_distance": distance,
            "nearest_railway_name": name,
        }
