import logging
from pathlib import Path
from typing import Optional

import geopandas as gpd
import rasterio

logger = logging.getLogger(__name__)


class GISDataLoader:
    """Load vector and raster datasets from the repository datasets directory once and cache them in memory."""

    def __init__(self, base_dir: Optional[Path] = None):
        self.base_dir = base_dir or Path(__file__).resolve().parents[1] / ".." / "datasets"
        self.base_dir = self.base_dir.resolve()
        self._vector_cache = {}
        self._raster_cache = {}

    def load_vector(self, relative_path: str):
        """Load a vector GIS dataset from a GeoJSON or shapefile path, using a memory cache."""
        path = (self.base_dir / relative_path).resolve()
        if not path.exists():
            raise FileNotFoundError(f"Dataset not found: {path}")

        cache_key = str(path)
        if cache_key in self._vector_cache:
            return self._vector_cache[cache_key]

        if path.is_dir():
            candidates = sorted(
                [child for child in path.iterdir() if child.is_file() and child.suffix.lower() in {".pkl", ".geojson", ".shp", ".csv"}]
            )
            if not candidates:
                raise FileNotFoundError(f"No vector datasets found in directory: {path}")
            path = candidates[0]

        pkl_path = path.with_suffix(".pkl")
        if pkl_path.exists():
            import pandas as pd
            gdf = pd.read_pickle(pkl_path)
        else:
            gdf = gpd.read_file(path)
            try:
                gdf.to_pickle(pkl_path)
            except Exception as exc:
                logger.warning("Could not create pkl cache for %s: %s", path, exc)

        self._vector_cache[cache_key] = gdf
        return gdf

    def load_raster(self, relative_path: str):
        """Load a raster dataset such as population density geotiff and cache the handle in memory."""
        path = (self.base_dir / relative_path).resolve()
        if not path.exists():
            raise FileNotFoundError(f"Raster dataset not found: {path}")

        cache_key = str(path)
        if cache_key in self._raster_cache:
            return self._raster_cache[cache_key]

        src = rasterio.open(path)
        self._raster_cache[cache_key] = src
        return src
