import logging
import shutil
from pathlib import Path
from typing import Optional

import pandas as pd

from apps.analysis.services.data_preprocessing_service import DataPreprocessingService
from apps.analysis.services.dataset_generation_service import DatasetGenerationService
from apps.analysis.services.model_training_service import ModelTrainingService
from apps.analysis.services.use_case_scorers import USE_CASES

logger = logging.getLogger(__name__)


class TrainingPipelineService:
    """Orchestrate dataset generation, preprocessing, training, and model artifact creation.

    Per-use-case artifacts live under `artifacts/<use_case>/`:
        dataset.csv      # shared across use cases (computed once)
        preprocessor.pkl
        model.pkl
        random_forest.pkl
        gradient_boosting.pkl

    The dataset.csv is shared across all use cases (it contains all four
    score columns). It is generated once and copied into each use-case
    directory so that each directory is self-contained for inspection.
    """

    def __init__(self, artifacts_root: Optional[Path] = None):
        self.artifacts_root = artifacts_root or Path(__file__).resolve().parent / "artifacts"
        self.artifacts_root.mkdir(parents=True, exist_ok=True)
        self.dataset_service = DatasetGenerationService()

    def run(self, use_case: str, samples: int = 2500, reuse_dataset: bool = False) -> dict:
        if use_case not in USE_CASES:
            raise ValueError(f"Unknown use_case {use_case!r}. Expected one of {USE_CASES}.")

        output_dir = self.artifacts_root / use_case
        output_dir.mkdir(parents=True, exist_ok=True)

        dataset_csv = output_dir / "dataset.csv"
        if reuse_dataset and dataset_csv.exists():
            logger.info("Reusing existing dataset at %s", dataset_csv)
            dataset = pd.read_csv(dataset_csv)
        else:
            dataset = self.dataset_service.generate_dataset(output_dir, samples=samples, use_case=use_case)

        if "competition_pressure" not in dataset.columns:
            from apps.analysis.services.dataset_generation_service import calc_competition_pressure
            pressures = []
            for _, r in dataset.iterrows():
                pressures.append(calc_competition_pressure(r.get("competitors_250"), r.get("competitors_500"), r.get("competitors_1000")))
            dataset["competition_pressure"] = pressures

        label_column = f"{use_case}_score"
        preprocess_service = DataPreprocessingService(output_dir)
        training_service = ModelTrainingService(output_dir)
        X_train, y_train, X_val, y_val, X_test, y_test, _ = preprocess_service.prepare(dataset, label_column=label_column)
        result = training_service.train(X_train, y_train, X_val, y_val, X_test, y_test, use_case=use_case)
        result["use_case"] = use_case
        result["label_column"] = label_column
        return result

    def train_all(self, samples: int = 2500, reuse_dataset: bool = False) -> dict:
        summary = {}
        for uc in USE_CASES:
            logger.info("=== Training use case: %s ===", uc)
            summary[uc] = self.run(use_case=uc, samples=samples, reuse_dataset=reuse_dataset)
        return summary
