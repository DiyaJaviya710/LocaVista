import logging
from pathlib import Path
from typing import Optional, Tuple

import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

logger = logging.getLogger(__name__)


class DataPreprocessingService:
    """Preprocess GIS feature data and persist the fitted transformers.

    Each use case has its own fitted preprocessor (separate categorical
    encoders if feature distributions ever diverge). Output is written
    into `output_dir / preprocessor.pkl`.
    """

    def __init__(self, output_dir: Optional[Path] = None):
        self.output_dir = output_dir or Path(__file__).resolve().parent / "artifacts"
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.feature_columns = [
            "road_distance",
            "highway_distance",
            "hospital_distance",
            "school_distance",
            "bank_distance",
            "restaurant_distance",
            "pharmacy_distance",
            "bus_stop_distance",
            "railway_distance",
            "water_distance",
            "population_value",
            "population_category",
            "competitors_250",
            "competitors_500",
            "competitors_1000",
            "competition_pressure",
            "landuse",
            "flood_risk",
            "business_subcategory",
        ]

    def prepare(
        self,
        dataset: pd.DataFrame,
        label_column: str,
    ) -> Tuple[pd.DataFrame, pd.Series, pd.DataFrame, pd.Series, pd.DataFrame, pd.Series, Pipeline]:
        X = dataset[self.feature_columns].copy()
        y = dataset[label_column].copy()

        numeric_features = [
            "road_distance",
            "highway_distance",
            "hospital_distance",
            "school_distance",
            "bank_distance",
            "restaurant_distance",
            "pharmacy_distance",
            "bus_stop_distance",
            "railway_distance",
            "water_distance",
            "population_value",
            "competitors_250",
            "competitors_500",
            "competitors_1000",
            "competition_pressure",
        ]
        categorical_features = ["population_category", "landuse", "flood_risk", "business_subcategory"]

        preprocessor = ColumnTransformer(
            transformers=[
                ("num", Pipeline([("imputer", SimpleImputer(strategy="median")), ("scaler", StandardScaler())]), numeric_features),
                ("cat", Pipeline([("imputer", SimpleImputer(strategy="most_frequent")), ("onehot", OneHotEncoder(handle_unknown="ignore"))]), categorical_features),
            ],
            remainder="drop",
        )

        from sklearn.model_selection import train_test_split

        X_train_raw, X_temp_raw, y_train, y_temp = train_test_split(X, y, test_size=0.3, random_state=42)
        X_val_raw, X_test_raw, y_val, y_test = train_test_split(X_temp_raw, y_temp, test_size=0.5, random_state=42)

        # Fit preprocessor exclusively on X_train_raw to prevent data leakage
        X_train = preprocessor.fit_transform(X_train_raw)
        X_val = preprocessor.transform(X_val_raw)
        X_test = preprocessor.transform(X_test_raw)

        joblib.dump(preprocessor, self.output_dir / "preprocessor.pkl")

        return X_train, y_train, X_val, y_val, X_test, y_test, preprocessor
