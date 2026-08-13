from services.gis_loader import GISDataLoader


class PopulationService:
    """Return population related datasets from the prepared datasets."""

    def __init__(self, loader: GISDataLoader | None = None):
        self.loader = loader or GISDataLoader()

    def get_population_raster(self):
        return self.loader.load_raster("population/ahmedabad_population.tif")
