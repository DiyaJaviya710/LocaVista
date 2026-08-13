import logging
from pathlib import Path
from typing import Optional

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd
import seaborn as sns

logger = logging.getLogger(__name__)


class VisualizationService:
    """Generate charts for model performance and feature relationships."""

    def __init__(self, output_dir: Optional[Path] = None):
        self.output_dir = output_dir or Path(__file__).resolve().parent / "artifacts"
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def generate(self, dataset: pd.DataFrame, model_results: dict) -> None:
        sns.set_theme(style="darkgrid")
        self._feature_importance_plot(dataset)
        self._correlation_plot(dataset)
        self._performance_plot(model_results)

    def _feature_importance_plot(self, dataset: pd.DataFrame) -> None:
        plt.figure(figsize=(10, 6))
        corr = dataset.corr(numeric_only=True)["site_readiness_score"].sort_values(ascending=False)
        corr.drop("site_readiness_score", inplace=True)
        corr.head(10).plot(kind="bar")
        plt.title("Top Feature Correlations")
        plt.tight_layout()
        plt.savefig(self.output_dir / "feature_correlation.png")
        plt.close()

    def _correlation_plot(self, dataset: pd.DataFrame) -> None:
        numeric = dataset.select_dtypes(include=["number"])
        plt.figure(figsize=(10, 8))
        sns.heatmap(numeric.corr(), annot=False, cmap="coolwarm")
        plt.title("Correlation Matrix")
        plt.tight_layout()
        plt.savefig(self.output_dir / "correlation_matrix.png")
        plt.close()

    def _performance_plot(self, model_results: dict) -> None:
        plt.figure(figsize=(8, 5))
        names = list(model_results.keys())
        r2_scores = [model_results[name]["r2"] for name in names]
        plt.bar(names, r2_scores)
        plt.title("Model Performance (R²)")
        plt.tight_layout()
        plt.savefig(self.output_dir / "model_performance.png")
        plt.close()
