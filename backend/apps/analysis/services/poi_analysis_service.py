from typing import Optional

from shapely.geometry import Point

from apps.analysis.services.spatial_engine import SpatialAnalysisEngine


class POIAnalysisService:
    def __init__(self, engine: Optional[SpatialAnalysisEngine] = None):
        self.engine = engine or SpatialAnalysisEngine()

    def analyze(self, point: Point) -> dict:
        poi_by_type = {
            "hospital": "poi_hospitals",
            "school": "poi_schools",
            "restaurant": "poi_restaurants",
            "bank": "poi_banks",
            "pharmacy": "poi_pharmacies",
            "bus_stop": "poi_bus_stops",
        }

        result = {}
        for key, dataset_name in poi_by_type.items():
            dist = self.engine.nearest_distance(point, dataset_name)
            result[f"{key}_distance"] = dist
            record = self.engine.nearest_feature_record(point, dataset_name)
            result[f"{key}_name"] = self.engine.feature_name(record, dataset_name)
        return result
