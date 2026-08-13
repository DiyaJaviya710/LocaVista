from django.test import SimpleTestCase
from rest_framework.test import APIClient

from apps.analysis.services.feature_extraction_service import FeatureExtractionService
from apps.analysis.services.spatial_engine import SpatialAnalysisError


class FeatureExtractionServiceTests(SimpleTestCase):
    def test_extract_returns_expected_feature_schema(self):
        service = FeatureExtractionService()

        result = service.extract(23.0225, 72.5714)

        self.assertIn("road_distance", result)
        self.assertIn("hospital_distance", result)
        self.assertIn("school_distance", result)
        self.assertIn("bank_distance", result)
        self.assertIn("restaurant_distance", result)
        self.assertIn("railway_distance", result)
        self.assertIn("water_distance", result)
        self.assertIn("population_value", result)
        self.assertIn("population_category", result)
        self.assertIn("competitors_250", result)
        self.assertIn("competitors_500", result)
        self.assertIn("competitors_1000", result)
        self.assertIn("landuse", result)
        self.assertIn("flood_risk", result)

    def test_extract_rejects_out_of_bounds_coordinates(self):
        service = FeatureExtractionService()

        with self.assertRaises(SpatialAnalysisError):
            service.extract(12.0, 72.0)


class PredictionApiTests(SimpleTestCase):
    def test_predict_endpoint_returns_prediction_payload(self):
        client = APIClient()
        response = client.post(
            "/api/predict/",
            {"latitude": 23.0225, "longitude": 72.5714},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn("score", response.json())
        self.assertIn("confidence", response.json())
        self.assertIn("prediction", response.json())
        self.assertIn("features", response.json())

    def test_water_location_returns_null_score_and_invalid_message(self):
        client = APIClient()
        # Coordinate inside Kankaria Lake / Water Body
        response = client.post(
            "/api/predict/",
            {"latitude": 23.0060, "longitude": 72.6010},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsNone(data.get("score"))
        self.assertEqual(data.get("is_water"), True)
        self.assertIn("Water Body", data.get("prediction", ""))
        self.assertIn("Score is not valid on water", data.get("explanation", {}).get("recommendation", ""))




