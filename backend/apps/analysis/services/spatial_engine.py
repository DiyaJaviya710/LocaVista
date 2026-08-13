import logging
import math
from pathlib import Path
from typing import Any, Dict, Optional

import geopandas as gpd
import rasterio
from shapely.geometry import Point
from shapely.strtree import STRtree

from services.gis_loader import GISDataLoader

logger = logging.getLogger(__name__)


class SpatialAnalysisError(ValueError):
    """Raised when a spatial analysis request cannot be fulfilled."""


class SpatialAnalysisEngine:
    """Cache spatial datasets and provide optimized nearest-neighbor lookups."""

    def __init__(self, loader: Optional[GISDataLoader] = None):
        self.loader = loader or GISDataLoader()
        self._cache: Dict[str, Any] = {}
        self._indexes: Dict[str, STRtree] = {}
        self._raster_cache: Dict[str, Any] = {}
        self._lookup_cache: Dict[str, Any] = {}
        self._utm_transformer = None

    def get_dataset(self, dataset_key: str):
        if dataset_key not in self._cache:
            self._cache[dataset_key] = self._load_dataset(dataset_key)
        return self._cache[dataset_key]

    def get_index(self, dataset_key: str):
        if dataset_key not in self._indexes:
            gdf = self.get_dataset(dataset_key)
            if gdf is None:
                return None
            if getattr(gdf, "empty", True):
                return None
            if "geometry" not in gdf.columns:
                return None
            gdf_projected = self._project_to_utm(gdf)
            self._indexes[dataset_key] = (gdf_projected, STRtree(gdf_projected.geometry.to_numpy()))
        return self._indexes[dataset_key]

    def nearest_distance(self, point: Point, dataset_key: str) -> Optional[float]:
        cache_key = f"dist_{round(point.x, 5)}_{round(point.y, 5)}_{dataset_key}"
        if cache_key in self._lookup_cache:
            return self._lookup_cache[cache_key]

        index_entry = self.get_index(dataset_key)
        if index_entry is None:
            return None
        gdf_projected, index = index_entry
        point_projected = self._project_to_utm_point(point)
        nearest_idx = index.nearest(point_projected)
        if nearest_idx is None:
            return None
        nearest_geom = gdf_projected.geometry.iloc[nearest_idx]
        val = round(float(point_projected.distance(nearest_geom)), 2)
        self._lookup_cache[cache_key] = val
        return val

    def get_system_health(self) -> Dict[str, Any]:
        """Return real-time diagnostic health of spatial datasets, indices, and cache handles."""
        return {
            "status": "healthy",
            "loaded_datasets_count": len(self._cache),
            "loaded_spatial_indexes_count": len(self._indexes),
            "raster_cache_count": len(self._raster_cache),
            "in_memory_lookup_cache_entries": len(self._lookup_cache),
        }

    def nearest_feature(self, point: Point, dataset_key: str):
        index_entry = self.get_index(dataset_key)
        if index_entry is None:
            return None
        gdf_projected, index = index_entry
        point_projected = self._project_to_utm_point(point)
        nearest_idx = index.nearest(point_projected)
        if nearest_idx is None:
            return None
        return gdf_projected.geometry.iloc[nearest_idx]

    def nearest_feature_record(self, point: Point, dataset_key: str):
        """Return the full GeoDataFrame row (Series) of the nearest feature, or None."""
        index_entry = self.get_index(dataset_key)
        if index_entry is None:
            return None
        gdf_projected, index = index_entry
        point_projected = self._project_to_utm_point(point)
        nearest_idx = index.nearest(point_projected)
        if nearest_idx is None:
            return None
        return gdf_projected.iloc[nearest_idx]

    def feature_name(self, record, dataset_key: str) -> Optional[str]:
        if record is None:
            return None
        try:
            props = record.to_dict()
        except Exception:
            return None
        priority_columns = {
            "roads": ["name", "ref", "highway"],
            "highways": ["name", "ref", "highway"],
            "poi_hospitals": ["name", "operator"],
            "poi_schools": ["name", "operator"],
            "poi_banks": ["name", "operator"],
            "poi_restaurants": ["name", "operator"],
            "poi_pharmacies": ["name", "operator"],
            "poi_bus_stops": ["name", "operator"],
            "railways": ["ref", "name", "railway"],
            "water": ["name", "water", "natural"],
        }
        for column in priority_columns.get(dataset_key, ["name"]):
            value = props.get(column)
            if value is None:
                continue
            if isinstance(value, float) and not math.isfinite(value):
                continue
            text = str(value).strip()
            if text:
                return text
        return None

    def point_in_buffer_count(self, point: Point, dataset_key: str, radius_meters: float) -> int:
        gdf = self.get_dataset(dataset_key)
        if gdf is None or getattr(gdf, "empty", True):
            return 0
        gdf_projected = self._project_to_utm(gdf)
        point_projected = self._project_to_utm_point(point)
        buffer = point_projected.buffer(radius_meters)
        return int(gdf_projected[gdf_projected.geometry.intersects(buffer)].shape[0])

    def _get_raster_dataset(self, dataset_key: str):
        path = self.get_dataset(dataset_key)
        if path is None:
            return None
        cache_key = str(path)
        if cache_key not in self._raster_cache:
            self._raster_cache[cache_key] = rasterio.open(path)
        return self._raster_cache[cache_key]

    def population_value(self, point: Point) -> Optional[float]:
        try:
            src = self._get_raster_dataset("population_raster")
            if src is None:
                return None
            val = next(src.sample([(point.x, point.y)]))[0]
            return float(val)
        except Exception as exc:
            logger.exception("Population raster lookup failed")
            return None

    def flood_risk(self, point: Point) -> str:
        gdf = self.get_dataset("flood")
        if gdf is None or getattr(gdf, "empty", True):
            return "Low"
        try:
            if gdf.geometry.contains(point).any():
                return "High"
        except Exception:
            return "Low"
        return "Low"

    def is_point_in_water(self, point: Point) -> tuple[bool, Optional[str]]:
        """Return (True, water_body_name) if the point is inside or directly on a water body."""
        index_entry = self.get_index("water")
        if index_entry is not None:
            try:
                gdf_projected, index = index_entry
                point_projected = self._project_to_utm_point(point)
                nearest_idx = index.nearest(point_projected)
                if nearest_idx is not None:
                    row = gdf_projected.iloc[nearest_idx]
                    dist_m = float(row.geometry.distance(point_projected))
                    if dist_m <= 50.0:
                        water_name = self.feature_name(row, "water") or "Sabarmati River / Water Body"
                        return True, water_name
            except Exception as exc:
                logger.warning("Water containment check failed: %s", exc)

        try:
            lu = str(self.land_use(point)).lower()
            if lu in {"water", "river", "reservoir", "lake", "canal", "basin", "dock"}:
                return True, "Water Body"
        except Exception:
            pass

        return False, None


    def land_use(self, point: Point) -> str:
        categories = [
            "retail", "commercial", "residential", "industrial",
            "recreation_ground", "grass", "forest", "cemetery", "agriculture",
        ]
        try:
            point_projected = self._project_to_utm_point(point)
        except Exception:
            return "Commercial"

        closest_dist = float("inf")
        closest_cat = "Commercial"

        for category in categories:
            index_entry = self.get_index(f"landuse_{category}")
            if index_entry is None:
                continue
            gdf_projected, index = index_entry
            try:
                nearest_idx = index.nearest(point_projected)
                if nearest_idx is not None:
                    geom = gdf_projected.geometry.iloc[nearest_idx]
                    if bool(geom.contains(point_projected)):
                        return category.replace("_", " ").title()
                    dist = float(geom.distance(point_projected))
                    if dist < closest_dist:
                        closest_dist = dist
                        closest_cat = category.replace("_", " ").title()
            except Exception:
                continue

        if closest_dist <= 3000.0:
            return closest_cat
        return "Commercial"

    def validate_coordinates(self, latitude: float, longitude: float) -> Point:
        if not (-90 <= latitude <= 90 and -180 <= longitude <= 180):
            raise SpatialAnalysisError("Coordinates are outside valid global ranges (-90 to 90 lat, -180 to 180 lng).")

        if not (22.8 <= latitude <= 23.3 and 72.3 <= longitude <= 72.9):
            raise SpatialAnalysisError(
                f"Selected location (Lat {latitude:.4f}, Lng {longitude:.4f}) is outside the supported dataset coverage area. "
                "Current GIS layers & trained ML models are configured for the Ahmedabad Metropolitan Region (Lat 22.8°–23.3°N, Lng 72.3°–72.9°E)."
            )

        return Point(longitude, latitude)


    def _load_dataset(self, dataset_key: str):
        if dataset_key == "roads":
            return self.loader.load_vector("roads/roads.geojson")
        if dataset_key == "poi":
            return self.loader.load_vector("poi")
        if dataset_key == "poi_hospitals":
            return self.loader.load_vector("poi/hospitals.geojson")
        if dataset_key == "poi_schools":
            return self.loader.load_vector("poi/schools.geojson")
        if dataset_key == "poi_restaurants":
            from apps.analysis.services.competitor_analysis_service import filter_food_competitors
            gdf = self.loader.load_vector("poi/restaurants.geojson")
            return filter_food_competitors(gdf)
        if dataset_key == "poi_banks":
            return self.loader.load_vector("poi/banks.geojson")
        if dataset_key == "poi_pharmacies":
            return self.loader.load_vector("poi/pharmacies.geojson")
        if dataset_key == "poi_bus_stops":
            return self.loader.load_vector("poi/bus_stops.geojson")
        if dataset_key == "railways":
            return self.loader.load_vector("railways/railways_linestring.geojson")
        if dataset_key == "water":
            return self.loader.load_vector("water/water_polygon.geojson")
        if dataset_key == "competitors":
            return self.loader.load_vector("competitors/competitors.geojson")
        if dataset_key == "flood":
            return self.loader.load_vector("flood/high_risk.geojson")
        if dataset_key == "population_raster":
            # Resolve the dataset path relative to the repository root so it works
            # regardless of the current working directory.
            # spatial_engine.py -> services (0) -> analysis (1) -> apps (2) -> backend (3) -> repo root (4)
            repo_root = Path(__file__).resolve().parents[4]
            return repo_root / "datasets" / "population" / "ahmedabad_population.tif"
        if dataset_key == "landuse_residential":
            return self.loader.load_vector("landuse/residential_polygon.geojson")
        if dataset_key == "landuse_commercial":
            return self.loader.load_vector("landuse/commercial_polygon.geojson")
        if dataset_key == "landuse_industrial":
            return self.loader.load_vector("landuse/industrial_polygon.geojson")
        if dataset_key == "landuse_agriculture":
            return self.loader.load_vector("landuse/farmland_polygon.geojson")
        if dataset_key == "landuse_retail":
            return self.loader.load_vector("landuse/retail_polygon.geojson")
        if dataset_key == "landuse_recreation_ground":
            return self.loader.load_vector("landuse/recreation_ground_polygon.geojson")
        if dataset_key == "landuse_grass":
            return self.loader.load_vector("landuse/grass_polygon.geojson")
        if dataset_key == "landuse_forest":
            return self.loader.load_vector("landuse/forest_polygon.geojson")
        if dataset_key == "landuse_cemetery":
            return self.loader.load_vector("landuse/cemetery_polygon.geojson")
        if dataset_key == "buildings":
            return self.loader.load_vector("buildings/buildings.geojson")
        if dataset_key == "highways":
            roads = self.loader.load_vector("roads/roads.geojson")
            if roads is None or getattr(roads, "empty", True):
                return roads
            major = {"motorway", "trunk", "primary"}
            mask = roads["highway"].isin(major)
            return roads[mask].copy()
        raise KeyError(f"Unsupported dataset: {dataset_key}")

    def _project_to_utm(self, gdf):
        if gdf.crs is None:
            gdf = gdf.set_crs("EPSG:4326")
        return gdf.to_crs("EPSG:32643")

    def _project_to_utm_point(self, point: Point):
        from shapely.ops import transform

        if self._utm_transformer is None:
            from pyproj import Transformer
            self._utm_transformer = Transformer.from_crs("EPSG:4326", "EPSG:32643", always_xy=True)
        return transform(self._utm_transformer.transform, point)

    def _has_geographic_projection(self, gdf):
        return gdf.crs is not None and "32643" in str(gdf.crs).upper()


_default_engine: Optional[SpatialAnalysisEngine] = None
_default_engine_lock = None


def get_default_engine() -> SpatialAnalysisEngine:
    """Return a process-wide SpatialAnalysisEngine so caches survive between requests."""
    global _default_engine, _default_engine_lock
    if _default_engine is None:
        import threading
        if _default_engine_lock is None:
            _default_engine_lock = threading.Lock()
        with _default_engine_lock:
            if _default_engine is None:
                _default_engine = SpatialAnalysisEngine()
    return _default_engine
