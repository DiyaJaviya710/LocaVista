import logging
from typing import Any, Dict, Optional

from shapely.geometry import Point


# pyrefly: ignore [missing-import]
from apps.analysis.services.competitor_analysis_service import CompetitorAnalysisService
# pyrefly: ignore [missing-import]
from apps.analysis.services.flood_analysis_service import FloodAnalysisService
# pyrefly: ignore [missing-import]
from apps.analysis.services.highway_analysis_service import HighwayAnalysisService
# pyrefly: ignore [missing-import]
from apps.analysis.services.landuse_analysis_service import LandUseAnalysisService
# pyrefly: ignore [missing-import]
from apps.analysis.services.poi_analysis_service import POIAnalysisService
# pyrefly: ignore [missing-import]
from apps.analysis.services.population_analysis_service import PopulationAnalysisService
# pyrefly: ignore [missing-import]
from apps.analysis.services.railway_analysis_service import RailwayAnalysisService
# pyrefly: ignore [missing-import]
from apps.analysis.services.road_analysis_service import RoadAnalysisService
# pyrefly: ignore [missing-import]
from apps.analysis.services.spatial_engine import SpatialAnalysisEngine, SpatialAnalysisError
# pyrefly: ignore [missing-import]
from apps.analysis.services.water_analysis_service import WaterAnalysisService

logger = logging.getLogger(__name__)


class FeatureExtractionService:
    def __init__(self, engine: Optional[SpatialAnalysisEngine] = None):
        self.engine = engine or SpatialAnalysisEngine()
        self.road_service = RoadAnalysisService(self.engine)
        self.highway_service = HighwayAnalysisService(self.engine)
        self.poi_service = POIAnalysisService(self.engine)
        self.railway_service = RailwayAnalysisService(self.engine)
        self.water_service = WaterAnalysisService(self.engine)
        self.competitor_service = CompetitorAnalysisService(self.engine)
        self.population_service = PopulationAnalysisService(self.engine)
        self.flood_service = FloodAnalysisService(self.engine)
        self.landuse_service = LandUseAnalysisService(self.engine)

    def extract(self, latitude: float, longitude: float, use_case: str = "restaurant", retail_type: Optional[str] = None, restaurant_type: Optional[str] = None, office_type: Optional[str] = None, school_type: Optional[str] = None, hospital_type: Optional[str] = None) -> Dict[str, Any]:
        point = self.engine.validate_coordinates(latitude, longitude)

        def safe(service, name, **kwargs):
            try:
                return service.analyze(point, **kwargs) if kwargs else service.analyze(point)
            except Exception:
                logger.exception("Sub-analysis %s failed", name)
                return {}

        road_metrics = safe(self.road_service, "road")
        highway_metrics = safe(self.highway_service, "highway")
        poi_metrics = safe(self.poi_service, "poi")
        railway_metrics = safe(self.railway_service, "railway")
        water_metrics = safe(self.water_service, "water")
        competitor_metrics = safe(self.competitor_service, "competitor", use_case=use_case, retail_type=retail_type, restaurant_type=restaurant_type, office_type=office_type, school_type=school_type, hospital_type=hospital_type)
        population_metrics = safe(self.population_service, "population")
        flood_metrics = safe(self.flood_service, "flood")
        landuse_metrics = safe(self.landuse_service, "landuse")

        def calc_travel_times(distance_m: Optional[float]) -> Dict[str, Optional[float]]:
            if distance_m is None:
                return {"walk_min": None, "drive_min": None}
            # Average walking speed ~4.8 km/h = 80 m/min
            # Average driving speed ~30 km/h = 500 m/min (accounting for urban turns/traffic)
            walk_min = round(max(0.5, distance_m / 80.0), 1)
            drive_min = round(max(0.5, distance_m / 500.0), 1)
            return {"walk_min": walk_min, "drive_min": drive_min}

        road_dist = road_metrics.get("road_distance")
        road_tt = calc_travel_times(road_dist)
        bus_dist = poi_metrics.get("bus_stop_distance")
        bus_tt = calc_travel_times(bus_dist)

        nearest_comps = competitor_metrics.get("nearest_competitors", [])

        school_dist = poi_metrics.get("school_distance")
        school_name = poi_metrics.get("school_name")
        if use_case == "school" and nearest_comps:
            first_school = nearest_comps[0]
            school_dist = first_school.get("distance_m", school_dist)
            school_name = first_school.get("name", school_name)

        restaurant_dist = poi_metrics.get("restaurant_distance")
        restaurant_name = poi_metrics.get("restaurant_name")
        if use_case == "restaurant" and nearest_comps:
            first_rest = nearest_comps[0]
            restaurant_dist = first_rest.get("distance_m", restaurant_dist)
            restaurant_name = first_rest.get("name", restaurant_name)

        return {
            "road_distance": road_dist,
            "road_walk_min": road_tt["walk_min"],
            "road_drive_min": road_tt["drive_min"],
            "nearest_road_name": road_metrics.get("nearest_road_name"),
            "highway_distance": highway_metrics.get("highway_distance"),
            "nearest_highway_name": highway_metrics.get("nearest_highway_name"),
            "hospital_distance": poi_metrics.get("hospital_distance"),
            "nearest_hospital_name": poi_metrics.get("hospital_name"),
            "school_distance": school_dist,
            "nearest_school_name": school_name,
            "bank_distance": poi_metrics.get("bank_distance"),
            "nearest_bank_name": poi_metrics.get("bank_name"),
            "restaurant_distance": restaurant_dist,
            "nearest_restaurant_name": restaurant_name,
            "pharmacy_distance": poi_metrics.get("pharmacy_distance"),
            "nearest_pharmacy_name": poi_metrics.get("pharmacy_name"),
            "bus_stop_distance": bus_dist,
            "bus_stop_walk_min": bus_tt["walk_min"],
            "bus_stop_drive_min": bus_tt["drive_min"],
            "nearest_bus_stop_name": poi_metrics.get("bus_stop_name"),
            "railway_distance": railway_metrics.get("railway_distance"),
            "nearest_railway_name": railway_metrics.get("nearest_railway_name"),
            "water_distance": water_metrics.get("water_distance"),
            "nearest_water_body_name": water_metrics.get("nearest_water_body_name"),
            "population_value": population_metrics.get("population"),
            "population_category": population_metrics.get("population_category"),
            "competitors_250": competitor_metrics.get("competitors_250"),
            "competitors_500": competitor_metrics.get("competitors_500"),
            "competitors_1000": competitor_metrics.get("competitors_1000"),
            "nearest_competitor_names": competitor_metrics.get("nearest_competitor_names"),
            "nearest_competitors": competitor_metrics.get("nearest_competitors", []),
            "landuse": landuse_metrics.get("landuse"),
            "flood_risk": flood_metrics.get("flood"),
        }

