from services.gis_loader import GISDataLoader


class POIService:
    """Return points of interest from the prepared datasets."""

    def __init__(self, loader: GISDataLoader | None = None):
        self.loader = loader or GISDataLoader()

    def get_poi(self):
        return self.loader.load_vector("poi")
