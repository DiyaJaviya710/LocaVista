from services.gis_loader import GISDataLoader


class BuildingService:
    """Return building geometries from the prepared datasets."""

    def __init__(self, loader: GISDataLoader | None = None):
        self.loader = loader or GISDataLoader()

    def get_buildings(self):
        return self.loader.load_vector("buildings/buildings.geojson")
