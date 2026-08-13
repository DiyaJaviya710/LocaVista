"""Per-use-case site readiness scorers.

Each scorer returns a 0–100 score derived from the same 16 metrics produced
by `FeatureExtractionService`. The differentiators are the weights and the
distance bands each use case cares about.

Weights are frozen in one pass. Re-tuning requires editing this file and
re-running `TrainingPipelineService.run` for the affected use case(s).
"""

from typing import Any, Dict, Optional


def _clamp(value: float, low: float = 0.0, high: float = 100.0) -> float:
    return max(low, min(high, value))


def _road_band(distance: float) -> float:
    if distance is None:
        return 30
    if distance <= 100:
        return 100
    if distance <= 300:
        return 80
    if distance <= 500:
        return 60
    if distance <= 1000:
        return 40
    return 20


def _population_band(value: float) -> float:
    if value is None:
        return 40
    if value >= 70:
        return 100
    if value >= 40:
        return 70
    if value >= 10:
        return 50
    return 30


def _flood_band(risk: Any) -> float:
    if risk is None:
        return 30
    r = str(risk).lower()
    if r == "low":
        return 100
    if r == "medium":
        return 60
    return 20


def _landuse_commercial_preference(landuse: Any) -> float:
    if landuse is None:
        return 50
    l = str(landuse).lower()
    if l in {"commercial", "retail", "mixed"}:
        return 100
    if l == "residential":
        return 80
    if l == "industrial":
        return 60
    if l == "recreation ground":
        return 70
    if l in {"grass", "forest", "cemetery", "agriculture"}:
        return 30
    return 50


def _landuse_residential_preference(landuse: Any) -> float:
    if landuse is None:
        return 50
    l = str(landuse).lower()
    if l in {"residential", "commercial", "mixed"}:
        return 100
    if l == "recreation ground":
        return 70
    if l == "industrial":
        return 40
    if l in {"grass", "forest", "cemetery", "agriculture"}:
        return 30
    return 50


def _landuse_office_preference(landuse: Any) -> float:
    if landuse is None:
        return 50
    l = str(landuse).lower()
    if l in {"commercial", "retail", "mixed"}:
        return 100
    if l == "industrial":
        return 75
    if l == "residential":
        return 65
    if l == "recreation ground":
        return 55
    if l in {"grass", "forest", "cemetery", "agriculture"}:
        return 30
    return 45


def _landuse_clinic_preference(landuse: Any) -> float:
    if landuse is None:
        return 50
    l = str(landuse).lower()
    if l in {"residential", "commercial", "retail", "mixed"}:
        return 100
    if l == "industrial":
        return 60
    if l == "recreation ground":
        return 70
    if l in {"grass", "forest", "cemetery", "agriculture"}:
        return 40
    return 50


def _distance_to_score(distance: float, near: float, far: float) -> float:
    """Linear decay from 100 at <=near to 0 at >=far."""
    if distance is None:
        return 30
    if distance <= near:
        return 100
    if distance >= far:
        return 20
    return 100 - 80 * (distance - near) / (far - near)


def _competitor_density_score(competitors_500: float) -> float:
    """Category-Specific Competition Score.

    Fewer same-category competitors -> HIGHER competition score.
    More same-category competitors -> LOWER competition score.

    Strictly monotonic normalized curve:
    - 0 competitors: 100.0 (Maximum competition score)
    - 1 competitor:  85.0
    - 2 competitors: 76.5
    - 3 competitors: 69.4
    - 5 competitors: 57.3
    - 10 competitors: 33.0 (Strictly lower than 5 competitors)
    - 15 competitors: 12.5
    - 20+ competitors: 10.0
    """
    if competitors_500 is None:
        return 50.0
    c = max(0.0, float(competitors_500))
    if c == 0:
        return 100.0
    score_val = 100.0 - 15.0 * (c ** 0.65)
    return round(max(10.0, min(100.0, score_val)), 2)


def _inverse_distance_score(distance: float, near: float, far: float) -> float:
    """Higher is better when distance is *small* (e.g. competitor hospitals)."""
    if distance is None:
        return 50
    if distance <= near:
        return 20
    if distance >= far:
        return 100
    return 20 + 80 * (distance - near) / (far - near)


def _get(metrics: Dict[str, Any], key: str, default: Any = None) -> Any:
    return metrics.get(key, default)


def score_restaurant(metrics: Dict[str, Any], subcategory: Optional[str] = None) -> float:
    """Restaurant site readiness with subcategory weighting."""
    highway = _road_band(_get(metrics, "highway_distance"))
    population = _population_band(_get(metrics, "population_value"))
    flood = _flood_band(_get(metrics, "flood_risk"))
    landuse = _landuse_commercial_preference(_get(metrics, "landuse"))
    restaurant_density = _competitor_density_score(_get(metrics, "competitors_500"))
    bus_walk = _distance_to_score(_get(metrics, "bus_stop_distance"), near=300, far=2000)

    sub = str(subcategory or "").lower()
    if sub in {"cafe", "coffee"}:
        # Cafes prioritize public transit and commercial activity
        score = (
            highway * 0.15
            + population * 0.15
            + flood * 0.10
            + landuse * 0.25
            + restaurant_density * 0.20
            + bus_walk * 0.15
        )
    elif sub in {"fast_food", "burger", "pizza"}:
        # Fast food prioritizes quick transit & highway/road access
        score = (
            highway * 0.25
            + population * 0.20
            + flood * 0.10
            + landuse * 0.15
            + restaurant_density * 0.20
            + bus_walk * 0.10
        )
    else:
        score = (
            highway * 0.20
            + population * 0.20
            + flood * 0.10
            + landuse * 0.15
            + restaurant_density * 0.30
            + bus_walk * 0.05
        )
    return round(_clamp(score), 2)


def score_retail(metrics: Dict[str, Any], subcategory: Optional[str] = None) -> float:
    """Retail store site readiness with subcategory weighting."""
    road = _road_band(_get(metrics, "road_distance"))
    population = _population_band(_get(metrics, "population_value"))
    flood = _flood_band(_get(metrics, "flood_risk"))
    landuse = _landuse_commercial_preference(_get(metrics, "landuse"))
    bank_proximity = _distance_to_score(_get(metrics, "bank_distance"), near=500, far=3000)
    competitor_density = _competitor_density_score(_get(metrics, "competitors_500"))

    sub = str(subcategory or "").lower()
    if sub in {"grocery", "supermarket"}:
        # Grocery prioritizes residential population & road access
        score = (
            road * 0.25
            + population * 0.35
            + flood * 0.10
            + landuse * 0.10
            + bank_proximity * 0.05
            + competitor_density * 0.15
        )
    elif sub in {"mobile", "electronics"}:
        # Mobile/electronics prioritizes commercial landuse & banking/commercial hubs
        score = (
            road * 0.20
            + population * 0.15
            + flood * 0.10
            + landuse * 0.25
            + bank_proximity * 0.15
            + competitor_density * 0.15
        )
    elif sub in {"pharmacy", "medical"}:
        # Pharmacy prioritizes hospital proximity & population
        hosp_prox = _distance_to_score(_get(metrics, "hospital_distance"), near=200, far=2000)
        score = (
            road * 0.15
            + population * 0.30
            + hosp_prox * 0.25
            + landuse * 0.10
            + competitor_density * 0.20
        )
    else:
        score = (
            road * 0.20
            + population * 0.20
            + flood * 0.10
            + landuse * 0.15
            + bank_proximity * 0.10
            + competitor_density * 0.25
        )
    return round(_clamp(score), 2)


def score_office(metrics: Dict[str, Any], subcategory: Optional[str] = None) -> float:
    """Office / coworking site readiness with subcategory weighting."""
    road = _road_band(_get(metrics, "road_distance"))
    bus_stop = _distance_to_score(_get(metrics, "bus_stop_distance"), near=300, far=2000)
    railway = _distance_to_score(_get(metrics, "railway_distance"), near=500, far=5000)
    population = _population_band(_get(metrics, "population_value"))
    flood = _flood_band(_get(metrics, "flood_risk"))
    landuse = _landuse_office_preference(_get(metrics, "landuse"))
    competitor_density = _competitor_density_score(_get(metrics, "competitors_500"))

    sub = str(subcategory or "").lower()
    if sub in {"it_software", "coworking"}:
        score = (
            road * 0.15
            + bus_stop * 0.20
            + railway * 0.20
            + population * 0.10
            + flood * 0.05
            + landuse * 0.20
            + competitor_density * 0.10
        )
    else:
        score = (
            road * 0.20
            + bus_stop * 0.15
            + railway * 0.15
            + population * 0.10
            + flood * 0.05
            + landuse * 0.15
            + competitor_density * 0.20
        )
    return round(_clamp(score), 2)


def score_clinic(metrics: Dict[str, Any], subcategory: Optional[str] = None) -> float:
    """Clinic / hospital site readiness."""
    road = _road_band(_get(metrics, "road_distance"))
    population = _population_band(_get(metrics, "population_value"))
    flood = _flood_band(_get(metrics, "flood_risk"))
    landuse = _landuse_clinic_preference(_get(metrics, "landuse"))
    saturation = _inverse_distance_score(_get(metrics, "hospital_distance"), near=200, far=3000)
    pharmacy_access = _distance_to_score(_get(metrics, "pharmacy_distance"), near=300, far=2000)

    score = (
        road * 0.20
        + population * 0.40
        + flood * 0.15
        + landuse * 0.10
        + saturation * 0.10
        + pharmacy_access * 0.05
    )
    return round(_clamp(score), 2)


def score_school(metrics: Dict[str, Any], subcategory: Optional[str] = None) -> float:
    """School / Educational Institution site readiness."""
    road = _road_band(_get(metrics, "road_distance"))
    population = _population_band(_get(metrics, "population_value"))
    flood = _flood_band(_get(metrics, "flood_risk"))
    landuse = _landuse_residential_preference(_get(metrics, "landuse"))
    bus_access = _distance_to_score(_get(metrics, "bus_stop_distance"), near=200, far=2000)
    competitor_density = _competitor_density_score(_get(metrics, "competitors_500"))

    score_val = (
        population * 0.25
        + road * 0.20
        + flood * 0.10
        + bus_access * 0.10
        + landuse * 0.10
        + competitor_density * 0.25
    )
    return round(_clamp(score_val), 2)


score_hospital = score_clinic

SCORERS = {
    "restaurant": score_restaurant,
    "retail": score_retail,
    "office": score_office,
    "hospital": score_hospital,
    "clinic": score_clinic,
    "school": score_school,
}

USE_CASES = ("restaurant", "retail", "office", "hospital", "clinic", "school")


def score(metrics: Dict[str, Any], use_case: str = "restaurant", subcategory: Optional[str] = None):
    water_dist = metrics.get("water_distance")
    if water_dist is not None and float(water_dist) <= 50.0:
        return None
    scorer = SCORERS.get(use_case)
    if scorer is None:
        raise ValueError(f"Unknown use_case {use_case!r}. Expected one of {USE_CASES}.")
    return scorer(metrics, subcategory=subcategory)


