from typing import Optional

from shapely.geometry import Point

from apps.analysis.services.spatial_engine import SpatialAnalysisEngine


class HighwayAnalysisService:
    """Distance and name of the nearest major road (motorway/trunk/primary)."""

    def __init__(self, engine: Optional[SpatialAnalysisEngine] = None):
        self.engine = engine or SpatialAnalysisEngine()

    def analyze(self, point: Point) -> dict:
        distance = self.engine.nearest_distance(point, "highways")
        record = self.engine.nearest_feature_record(point, "highways")
        name = self.engine.feature_name(record, "highways")
        return {
            "highway_distance": distance,
            "nearest_highway_name": name,
        }
