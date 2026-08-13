import logging
from typing import Any, Dict, List, Tuple

logger = logging.getLogger(__name__)


def fmt_dist(meters) -> str:
    if meters is None:
        return "N/A"
    try:
        m = float(meters)
        if m >= 9999:
            return "N/A"
        km = m / 1000.0
        if km < 0.01:
            return f"{round(m)} m"
        return f"{km:.2f} km"
    except Exception:
        return "N/A"


class ExplanationService:
    """Generate model-agnostic feature attribution and driving factors for a site prediction."""

    def __init__(self):
        pass

    def explain(self, features: Dict[str, Any], score: float, use_case: str = "restaurant") -> Dict[str, Any]:
        drivers = []
        positive_texts = []
        negative_texts = []

        # 1. Population & Customer Base (Max Weight: 20.0)
        pop_val = features.get("population_value") or 0
        if pop_val >= 70:
            drivers.append({"name": "Local Population & Customers", "impact": "+15.0 / 20.0", "type": "positive", "detail": f"{pop_val:.0f} residents/km² — High footfall area"})
            positive_texts.append("High population density")
        elif pop_val >= 25:
            drivers.append({"name": "Local Population & Customers", "impact": "+10.0 / 20.0", "type": "positive", "detail": f"{pop_val:.0f} residents/km² — Good local customer base"})
            positive_texts.append("Moderate population density")
        else:
            drivers.append({"name": "Local Population & Customers", "impact": "+4.0 / 20.0", "type": "negative", "detail": f"{pop_val:.0f} residents/km² — Low footfall area"})
            negative_texts.append("Low population density")

        # 2. Main Road Accessibility (Max Weight: 20.0)
        road_dist = features.get("road_distance")
        road_name = features.get("nearest_road_name")
        formatted_road = fmt_dist(road_dist)
        if road_dist is not None and road_dist <= 100:
            detail = f"{formatted_road} to {road_name}" if road_name else f"{formatted_road} to main road — Easy vehicle & foot access"
            drivers.append({"name": "Main Road Accessibility", "impact": "+17.5 / 20.0", "type": "positive", "detail": detail})
            positive_texts.append("Short road distance")
        elif road_dist is not None and road_dist <= 500:
            detail = f"{formatted_road} to {road_name}" if road_name else f"{formatted_road} to main road"
            drivers.append({"name": "Main Road Accessibility", "impact": "+12.0 / 20.0", "type": "positive", "detail": detail})
            positive_texts.append("Moderate road access")
        else:
            detail = f"{formatted_road} to nearest road"
            drivers.append({"name": "Main Road Accessibility", "impact": "+4.0 / 20.0", "type": "negative", "detail": detail})
            negative_texts.append("Distant road access")

        # 3. Property Zoning & Land Use (Max Weight: 15.0)
        landuse = str(features.get("landuse") or "residential").lower()
        if landuse in {"commercial", "retail"}:
            drivers.append({"name": "Property Zoning", "impact": "+13.5 / 15.0", "type": "positive", "detail": f"{landuse.title()} Area — High commercial suitability"})
            positive_texts.append(f"Zoned for {landuse.title()}")
        elif landuse in {"residential", "mixed"}:
            drivers.append({"name": "Property Zoning", "impact": "+10.0 / 15.0", "type": "positive", "detail": f"{landuse.title()} Zone — Suitable for neighborhood business"})
            positive_texts.append(f"Zoned for {landuse.title()}")
        elif landuse == "industrial":
            drivers.append({"name": "Property Zoning", "impact": "+10.0 / 15.0", "type": "positive", "detail": "Industrial Area — Commercial & warehouse suitability"})
            positive_texts.append("Zoned for Industrial")
        else:
            drivers.append({"name": "Property Zoning", "impact": "+3.0 / 15.0", "type": "negative", "detail": f"{landuse.title()} Non-Commercial Zone"})
            negative_texts.append("Non-commercial zoning")

        # 4. Bus & Public Transport (Max Weight: 15.0)
        bus_dist = features.get("bus_stop_distance")
        bus_name = features.get("nearest_bus_stop_name")
        formatted_bus = fmt_dist(bus_dist)
        if bus_dist is not None and bus_dist <= 500:
            detail = f"{formatted_bus} to {bus_name}" if bus_name else f"{formatted_bus} to bus stop — Convenient public transit"
            drivers.append({"name": "Bus & Public Transport", "impact": "+12.5 / 15.0", "type": "positive", "detail": detail})
            positive_texts.append("Close to public transit")
        elif bus_dist is not None and bus_dist <= 1500:
            detail = f"{formatted_bus} to {bus_name}" if bus_name else f"{formatted_bus} to nearest bus stop"
            drivers.append({"name": "Bus & Public Transport", "impact": "+8.0 / 15.0", "type": "positive", "detail": detail})
            positive_texts.append("Moderate transit distance")
        else:
            detail = f"{formatted_bus} to nearest bus stop"
            drivers.append({"name": "Bus & Public Transport", "impact": "+3.0 / 15.0", "type": "negative", "detail": detail})
            negative_texts.append("Poor transit accessibility")

        # 5. Market Demand & Competition (Max Weight: 15.0)
        comp_250 = features.get("competitors_250") or 0
        comp_500 = features.get("competitors_500") or 0
        if comp_500 >= 7 or comp_250 >= 5:
            drivers.append({"name": "Market Demand & Competition", "impact": "+4.0 / 15.0", "type": "negative", "detail": "High Market Saturation — Overcrowded Competition Area"})
            negative_texts.append("High competitor market saturation")
        elif comp_500 >= 4:
            drivers.append({"name": "Market Demand & Competition", "impact": "+8.0 / 15.0", "type": "positive", "detail": "Moderate Market Competition — Active Commercial Area"})
            positive_texts.append("Moderate competition")
        elif comp_500 >= 1:
            drivers.append({"name": "Market Demand & Competition", "impact": "+13.0 / 15.0", "type": "positive", "detail": "Good Customer Cluster Demand — Strong Synergy"})
            positive_texts.append("Cluster demand synergy")
        else:
            drivers.append({"name": "Market Demand & Competition", "impact": "+10.0 / 15.0", "type": "positive", "detail": "High Market Capture Opportunity — Low Competition"})
            positive_texts.append("Low direct competition")

        # 6. Train & Metro Access (Max Weight: 5.0)
        rail_dist = features.get("railway_distance")
        rail_name = features.get("nearest_railway_name")
        formatted_rail = fmt_dist(rail_dist)
        if rail_dist is not None and rail_dist <= 2000:
            detail = f"{formatted_rail} to {rail_name}" if rail_name else f"{formatted_rail} to train station"
            drivers.append({"name": "Train & Metro Access", "impact": "+4.5 / 5.0", "type": "positive", "detail": detail})
            positive_texts.append("Close to railway terminal")
        elif rail_dist is not None and rail_dist <= 5000:
            detail = f"{formatted_rail} to nearest station"
            drivers.append({"name": "Train & Metro Access", "impact": "+3.0 / 5.0", "type": "positive", "detail": detail})
        else:
            detail = f"{formatted_rail} to nearest station"
            drivers.append({"name": "Train & Metro Access", "impact": "+1.5 / 5.0", "type": "negative", "detail": detail})

        # 7. Safety & Flood Risk (Max Weight: 10.0)
        flood = str(features.get("flood_risk") or "low").lower()
        if flood == "high":
            drivers.append({"name": "Safety & Flood Risk", "impact": "+1.0 / 10.0", "type": "negative", "detail": "Active Flood Risk Area"})
            negative_texts.append("High flood exposure")
        else:
            drivers.append({"name": "Safety & Flood Risk", "impact": "+9.0 / 10.0", "type": "positive", "detail": "Low flood risk — Safe commercial location"})
            positive_texts.append("Low flood exposure")

        if score >= 80:
            recommendation = f"Highly Recommended: Strong site readiness and commercial suitability for a {use_case} location."
        elif score >= 60:
            recommendation = f"Recommended with Minor Review: Solid location for a {use_case}. Verify local parking and transit connections."
        elif score >= 40:
            recommendation = f"Proceed with Caution: Moderate readiness for a {use_case} with operational constraints."
        else:
            recommendation = f"Not Recommended: Poor readiness for a {use_case} due to accessibility or environmental constraints."

        return {
            "drivers": drivers,
            "top_positive_features": positive_texts[:3],
            "top_negative_features": negative_texts[:3],
            "recommendation": recommendation,
        }



