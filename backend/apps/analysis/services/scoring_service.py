class SiteScoringService:
    """Calculate a weighted site readiness score from derived metrics."""

    def __init__(self):
        self.weights = {
            "road_distance": 0.25,
            "population": 0.20,
            "flood": 0.20,
            "competitors": 0.15,
            "land_use": 0.20,
        }

    def score(self, metrics):
        road_score = self._road_score(metrics.get("road_distance", 1000))
        population_score = self._population_score(metrics.get("population_density", 0))
        flood_score = self._flood_score(metrics.get("flood_risk", "High"))
        competitor_score = self._competitor_score(metrics.get("competitor_count", 10))
        land_use_score = self._land_use_score(metrics.get("land_use", "Residential"))

        overall = (
            road_score * self.weights["road_distance"]
            + population_score * self.weights["population"]
            + flood_score * self.weights["flood"]
            + competitor_score * self.weights["competitors"]
            + land_use_score * self.weights["land_use"]
        )
        return round(overall, 2)

    def _road_score(self, distance):
        if distance <= 100:
            return 100
        if distance <= 300:
            return 80
        if distance <= 500:
            return 60
        return 30

    def _population_score(self, density):
        if density >= 70:
            return 100
        if density >= 40:
            return 70
        return 40

    def _flood_score(self, risk):
        risk = str(risk).lower()
        if risk == "low":
            return 100
        if risk == "medium":
            return 60
        return 20

    def _competitor_score(self, count):
        if count == 0:
            return 100
        if count <= 3:
            return 80
        if count <= 6:
            return 60
        return 30

    def _land_use_score(self, land_use):
        land_use = str(land_use).lower()
        if land_use in {"commercial", "retail", "mixed"}:
            return 100
        if land_use in {"residential", "industrial"}:
            return 70
        return 50
