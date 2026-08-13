from services.gis_loader import GISDataLoader


class RailwayService:
    """Return railway geometries from the prepared datasets."""

    def __init__(self, loader: GISDataLoader | None = None):
        self.loader = loader or GISDataLoader()

    def get_railways(self):
        return self.loader.load_vector("railways/railways_linestring.geojson")
