from services.gis_loader import GISDataLoader


class RoadService:
    """Return road geometries from the prepared datasets."""

    def __init__(self, loader: GISDataLoader | None = None):
        self.loader = loader or GISDataLoader()

    def get_roads(self):
        return self.loader.load_vector("roads/roads.geojson")
