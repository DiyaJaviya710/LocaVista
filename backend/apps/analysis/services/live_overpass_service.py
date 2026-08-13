import json
import math
import time
import urllib.request
from typing import Any, Dict, List, Optional

from apps.analysis.services.competitor_analysis_service import (
    categorize_restaurant_store,
    categorize_retail_store,
    RESTAURANT_TYPE_MAP,
    RETAIL_TYPE_MAP,
)


def haversine_distance_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate Great Circle distance in meters between two lat/lon points."""
    R = 6371000.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


class LiveOverpassService:
    _instance: Optional["LiveOverpassService"] = None
    _cache: Dict[str, Dict[str, Any]] = {}

    MIRRORS = [
        "https://overpass-api.de/api/interpreter",
        "https://overpass.kumi.systems/api/interpreter",
        "https://overpass.nchc.org.tw/api/interpreter",
    ]

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(LiveOverpassService, cls).__new__(cls)
            cls._cache = {}
        return cls._instance

    def fetch_live_competitors(
        self,
        lat: float,
        lon: float,
        use_case: str = "restaurant",
        retail_type: Optional[str] = None,
        restaurant_type: Optional[str] = None,
        radius_m: float = 1000.0,
    ) -> Optional[Dict[str, Any]]:
        """Fetch live real-time commercial POIs from OpenStreetMap Overpass API."""
        cache_key = f"{round(lat, 3)}_{round(lon, 3)}_{use_case}_{retail_type}_{restaurant_type}_{radius_m}"
        now = time.time()

        if cache_key in self._cache:
            entry = self._cache[cache_key]
            if now - entry["timestamp"] < 3600:  # 1 hour cache
                return entry["data"]

        if use_case == "restaurant":
            node_q = 'node["amenity"~"restaurant|fast_food|cafe|bakery|food_court|ice_cream|pub|bar"]'
            way_q = 'way["amenity"~"restaurant|fast_food|cafe|bakery|food_court|ice_cream|pub|bar"]'
        elif use_case == "retail":
            node_q = 'node["shop"~"supermarket|convenience|clothes|fashion|electronics|mobile|shoes|footwear|chemist|pharmacy|jewelry|jewellery|furniture|department_store|general"]'
            way_q = 'way["shop"~"supermarket|convenience|clothes|fashion|electronics|mobile|shoes|footwear|chemist|pharmacy|jewelry|jewellery|furniture|department_store|general"]'
        else:
            return None

        query = f"""
        [out:json][timeout:4];
        (
          {node_q}(around:{radius_m},{lat},{lon});
          {way_q}(around:{radius_m},{lat},{lon});
        );
        out center;
        """

        raw_elements = []
        success = False

        for url in self.MIRRORS:
            try:
                req = urllib.request.Request(
                    url,
                    data=query.encode("utf-8"),
                    headers={"User-Agent": "GeoSpatial-SiteAnalyzer-Live/1.0"},
                )
                with urllib.request.urlopen(req, timeout=4) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
                    raw_elements = data.get("elements", [])
                    success = True
                    break
            except Exception:
                continue

        if not success:
            return None

        poi_list = []
        for el in raw_elements:
            tags = el.get("tags", {})
            name = tags.get("name") or tags.get("name:en") or tags.get("brand")
            if not name or str(name).strip().lower() in ["nan", "unnamed"]:
                continue

            e_lat = el.get("lat") or el.get("center", {}).get("lat")
            e_lon = el.get("lon") or el.get("center", {}).get("lon")
            if not e_lat or not e_lon:
                continue

            name_str = str(name).strip()
            dist_m = haversine_distance_m(lat, lon, float(e_lat), float(e_lon))

            if dist_m > radius_m:
                continue

            if use_case == "restaurant":
                cat = categorize_restaurant_store(name_str)
                if restaurant_type and str(restaurant_type).lower() not in ["all", "auto", "all food", "auto detect"]:
                    allowed = RESTAURANT_TYPE_MAP.get(str(restaurant_type).lower(), [])
                    if allowed and cat not in allowed:
                        continue
            else:
                cat = categorize_retail_store(name_str)
                if retail_type and str(retail_type).lower() not in ["all", "auto", "all retail", "auto detect"]:
                    allowed = RETAIL_TYPE_MAP.get(str(retail_type).lower(), [])
                    if allowed and cat not in allowed:
                        continue

            poi_list.append({
                "name": name_str,
                "latitude": round(float(e_lat), 6),
                "longitude": round(float(e_lon), 6),
                "distance_m": round(dist_m, 1),
                "category": cat
            })

        poi_list.sort(key=lambda x: x["distance_m"])

        c_250 = sum(1 for p in poi_list if p["distance_m"] <= 250)
        c_500 = sum(1 for p in poi_list if p["distance_m"] <= 500)
        c_1000 = sum(1 for p in poi_list if p["distance_m"] <= 1000)

        result = {
            "competitors_250": c_250,
            "competitors_500": c_500,
            "competitors_1000": c_1000,
            "nearest_competitor_names": [p["name"] for p in poi_list[:5]],
            "nearest_competitors": poi_list[:10],
            "live_sync": True
        }

        self._cache[cache_key] = {"timestamp": now, "data": result}
        return result
