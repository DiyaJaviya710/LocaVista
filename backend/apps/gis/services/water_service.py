from services.gis_loader import GISDataLoader


class WaterService:
    """Return waterbody geometries from the prepared datasets."""

    def __init__(self, loader: GISDataLoader | None = None):
        self.loader = loader or GISDataLoader()

    def get_water_bodies(self):
        return self.loader.load_vector("water/water_polygon.geojson")
