import re
from typing import Any, Iterable, Optional

from shapely.geometry import Point
# pyrefly: ignore [missing-import]
from apps.analysis.services.spatial_engine import SpatialAnalysisEngine


MAX_NEAREST_NAMES = 5

COMPETITOR_CATEGORY_BY_USE_CASE: dict[str, Optional[str]] = {
    "restaurant": "restaurants",
    "retail": "retail",
    "hospital": "hospitals",
    "clinic": "hospitals",
    "office": "office",
    "school": "schools",
}


def categorize_school(name: str) -> str:
    n = str(name).lower()

    if any(k in n for k in ['petrochemical', 'petroleum', 'chemical', 'fertilizer', 'agritron', 'industries', 'pharmaceutical', 'gaushala']):
        return 'General Educational School'

    # 1. Primary & Pre-School
    if any(k in n for k in ['preschool', 'pre-school', 'pre school', 'nursery', 'playgroup', 'play group', 'kindergarten', 'kg school', 'kids', 'kiddies', 'toddler', 'primary school', 'prathmik', 'shishu', 'balmandir', 'bal mandir', 'baby', 'little', 'montessori']):
        return 'Primary & Pre-School'

    # 2. International School
    if any(k in n for k in ['international', 'ib ', 'cambridge', 'global school', 'world school', 'heritage international', 'american', 'british']):
        return 'International School'

    # 3. College & University Campus
    if any(k in n for k in [
        'college', 'university', 'mahavidyalaya', 'vidyapith', 'vidyapeeth', 'polytechnic',
        'degree college', 'iim', 'iit', 'nid', 'nift', 'gtu', 'gujarat university', 'nirma', 'cept',
        'ahmedabad university', 'engineering', 'medical college', 'dental college',
        'nursing college', 'pharmacy college', 'commerce college', 'arts college',
        'science college', 'law college', 'b.ed college', 'campus', 'mica', 'mudra institute', 'ld college',
        'vgec', 'silver oak', 'sal institute', 'indus university', 'karnavati university',
        'school of law', 'school of architecture', 'school of management', 'school of business',
        'school of engineering', 'school of technology', 'school of planning', 'school of design',
        'business school', 'institute of engineering', 'institute of technology', 'institute of management',
        'institute of pharmacy', 'institute of computer', 'institute of media', 'institute of science',
        'institute of design', 'institute of architecture'
    ]):
        return 'College & University'

    # 4. Coaching & Entrance Institute
    if any(k in n for k in ['coaching', 'tuition', 'tution', 'classes', 'jee', 'neet', 'allen', 'aakash', 'resonance', 'career', 'study center', 'study centre', 'career launcher', 'test prep', 'tutor']):
        return 'Coaching & Entrance Institute'

    # 5. Secondary & High School
    if any(k in n for k in [
        'high school', 'secondary', 'higher secondary', 'vidyalaya', 'vidhyalaya', 'cbse', 'icse', 'gseb',
        'public school', 'dps', 'delhi public school', 'st. xavier', 'saint xavier', 'mt. carmel', 'mount carmel', 'st. kabir',
        'anand niketan', 'c.n.', 'cn vidyalaya', 'podar', 'hb kapadia', 'h.b. kapadia', 'shanti asiatic',
        'udgam', 'rachana', 'redbricks', 'school', 'niketan', 'shikshan', 'bhavan', 'shala'
    ]):
        return 'Secondary & High School'

    return 'General Educational School'


SCHOOL_TYPE_MAP = {
    'primary_preschool': ['Primary & Pre-School'],
    'secondary_highschool': ['Secondary & High School'],
    'international': ['International School'],
    'coaching': ['Coaching & Entrance Institute'],
    'college_university': ['College & University'],
    'general': ['General Educational School'],
}


def filter_school_competitors(gdf, school_type: Optional[str] = None):
    """Filter school competitors. If school_type is specified, restrict to competitors matching that specific segment."""
    if gdf is None or getattr(gdf, "empty", True):
        return gdf

    st = str(school_type or "").strip().lower()
    if not st or st in ['all', 'auto', 'all school', 'all schools', 'auto detect', 'auto detect / all educational schools']:
        return gdf

    allowed = SCHOOL_TYPE_MAP.get(st, [])
    if not allowed:
        return gdf

    def _matches_school(row):
        name = str(row.get("name") or "").strip()
        if not name:
            return True
        cat = categorize_school(name)
        return cat in allowed

    mask = gdf.apply(_matches_school, axis=1)
    return gdf[mask].copy()


def categorize_office_building(name: str) -> str:
    n = str(name).lower()
    if any(k in n for k in ['software', 'it park', 'tech', 'systems', 'info', 'cyber', 'cloud', 'digital', 'tcs', 'infosys', 'wipro', 'cognizant', 'accenture', 'l&t technology', 'bacancy', 'tatvasoft', 'radixweb', 'hidden brains', 'cybage']):
        return 'IT / Software Office'
    if any(k in n for k in ['coworking', 'co-working', 'wework', 'awfis', 'devx', 'regus', '91springboard', 'workafella', 'unspace', 'flexi', 'product house']):
        return 'Coworking Space'
    if any(k in n for k in ['bank', 'financial', 'capital', 'securities', 'wealth', 'consultancy', 'ca', 'advisory', 'kpmg', 'ey', 'pwc', 'deloitte', 'motilal', 'sharekhan', 'icici', 'hdfc', 'axis', 'sbi']):
        return 'Financial / Professional Office'
    if any(k in n for k in ['bpo', 'kpo', 'call center', 'customer care', 'back office', 'teleperformance', 'concentrix', 'taskus']):
        return 'BPO / Back Office'
    if any(k in n for k in ['corporate', 'house', 'tower', 'hq', 'headquarters', 'park', 'heights', 'mondeal', 'privilon', 'atlantis', 'titanium', 'ratnaakar', 'iscon elegance', 'westgate', 'adani', 'zydus', 'torrent', 'nirma', 'shivalik', 'synthesis', 'gala empire']):
        return 'Corporate Office'
    return 'General Office'


OFFICE_TYPE_MAP = {
    'it_software': ['IT / Software Office'],
    'corporate': ['Corporate Office'],
    'coworking': ['Coworking Space'],
    'financial': ['Financial / Professional Office'],
    'bpo': ['BPO / Back Office'],
    'general': ['General Office'],
}


def filter_office_competitors(gdf, office_type: Optional[str] = None):
    """Filter office competitors. If office_type is specified, restrict to competitors matching that specific segment."""
    if gdf is None or getattr(gdf, "empty", True):
        return gdf

    def _matches_office(row):
        name = str(row.get("name") or "").strip()
        if not name:
            return True
        if office_type and str(office_type).lower() not in ['all', 'auto', 'all office', 'auto detect']:
            cat = categorize_office_building(name)
            allowed = OFFICE_TYPE_MAP.get(str(office_type).lower(), [])
            if allowed and cat not in allowed:
                return False
        return True

    mask = gdf.apply(_matches_office, axis=1)
    return gdf[mask].copy()



def categorize_restaurant_store(name: str) -> str:
    n = str(name).lower()
    if any(k in n for k in ['pizza', "la pino'z", 'la pinoz', 'domino', 'ovenstory', 'chicago pizza', 'italian']):
        return 'Pizza & Italian'
    if any(k in n for k in ['burger', 'mcdonald', 'kfc', 'subway', 'sandwich', 'toast', 'frankie', 'franky', 'wrap', 'vadapav', 'vada pav', 'dabeli', 'fast food', 'qsr', 'honest', 'jay bhavani', 'karnavati']):
        return 'Fast Food & QSR'
    if any(k in n for k in ['cafe', 'coffee', 'starbucks', 'ccd', 'third wave', 'chai', 'tea post', 'tapri', 'roastery', 'espresso', 'bistro']):
        return 'Cafes & Coffee Shops'
    if any(k in n for k in ['thal', 'thali', 'gujarati', 'kathiyawadi', 'vishalla', 'gordhan', 'iscon thal', 'swati snacks', 'agashiye', 'bhojanalay', 'rajwadu', 'khakhra', 'farsan']):
        return 'Gujarati & Kathiyawadi'
    if any(k in n for k in ['punjabi', 'dhaba', 'tandoor', 'handi', 'mughlai', 'biryani', 'butter chicken', 'shahi', 'barbeque nation', 'barbecue', 'yellow chili', 'mirch masala']):
        return 'North Indian & Punjabi'
    if any(k in n for k in ['south indian', 'dosa', 'idli', 'sankalp', 'dakshinayan', 'udupi', 'woodlands', 'saravana', 'sambhar']):
        return 'South Indian'
    if any(k in n for k in ['chinese', 'asian', 'noodle', 'wok', 'mainland china', 'dimsum', 'momo']):
        return 'Chinese & Asian'
    if any(k in n for k in ['ice cream', 'ice-cream', 'kulfi', 'falooda', 'waffle', 'baskin robbins', 'natural ice cream', 'cream stone', 'havmor ice cream', 'sundae', 'dessert']):
        return 'Desserts & Ice Cream'
    if any(k in n for k in ['bakery', 'cake', 'pastry', 'monginis', 'gwalia', 'kandoi', 'induben', 'patisserie']):
        return 'Bakery & Snacks'
    if any(k in n for k in ['urban chowk', 'law garden night', 'manek chowk', 'food court', 'food truck', 'street food', 'chaat', 'pani puri', 'bhel', 'stall']):
        return 'Street Food & Food Court'
    return 'Fine Dining & Family Restaurant'


RESTAURANT_TYPE_MAP = {
    'fast_food': ['Fast Food & QSR'],
    'cafe': ['Cafes & Coffee Shops'],
    'coffee': ['Cafes & Coffee Shops'],
    'pizza': ['Pizza & Italian'],
    'burger': ['Fast Food & QSR'],
    'sandwich': ['Fast Food & QSR'],
    'gujarati': ['Gujarati & Kathiyawadi'],
    'punjabi': ['North Indian & Punjabi'],
    'north_indian': ['North Indian & Punjabi'],
    'south_indian': ['South Indian'],
    'chinese': ['Chinese & Asian'],
    'asian': ['Chinese & Asian'],
    'fine_dining': ['Fine Dining & Family Restaurant'],
    'family': ['Fine Dining & Family Restaurant'],
    'dessert': ['Desserts & Ice Cream'],
    'ice_cream': ['Desserts & Ice Cream'],
    'bakery': ['Bakery & Snacks'],
    'street_food': ['Street Food & Food Court'],
    'food_court': ['Street Food & Food Court'],
}


def filter_food_competitors(gdf, restaurant_type: Optional[str] = None):
    """Filter out non-food venues like ATMs, Banks, Hospitals, Lodgings, Travel Agencies, Cyber Cafes, Publishers, etc., while including all authentic food competitors. If restaurant_type is specified, restrict to matching segment."""
    if gdf is None or getattr(gdf, "empty", True):
        return gdf

    non_food_patterns = [
        r"\batm\b", r"\bbank\b", r"\bhospital\b", r"\bclinic\b", r"\bmedical\b",
        r"\bpharmacy\b", r"\bchemist\b", r"\bcyber\b", r"\btours?\b", r"\btravels?\b",
        r"\bcourier\b", r"\bexpress\b", r"\bcargo\b", r"\blogistics?\b", r"\bpublishers?\b",
        r"\bpublication\b", r"\bpublicity\b", r"\bhardware\b", r"\bplywood\b", r"\bglass\b",
        r"\bsteel\b", r"\bautomotive\b", r"\bgarage\b", r"\brepair\b", r"\bschool\b",
        r"\bcollege\b", r"\bacademy\b", r"\binstitute\b", r"\bsalon\b", r"\bparlour\b",
        r"\bbeauty\b", r"\bspa\b", r"\bguest\s*house\b", r"\bguesthouse\b", r"\bhostel\b",
        r"\bboarding\b", r"\bpg\b", r"\bhomestay\b", r"\bdharamsala\b", r"\bdormitory\b",
        r"\bsociety\b", r"\bpolymers?\b", r"\bcorporation\b", r"\bassociation\b", r"\btrust\b", r"\bmandal\b"
    ]

    def _is_food(row):
        name = str(row.get("name") or "").strip().lower()
        subcat = str(row.get("sub_category") or "").strip().lower()
        if not name:
            return True
        if any(re.search(pat, name) for pat in non_food_patterns) or any(re.search(pat, subcat) for pat in non_food_patterns):
            return False
        if restaurant_type and str(restaurant_type).lower() not in ['all', 'auto', 'all food', 'auto detect']:
            cat = categorize_restaurant_store(name)
            allowed = RESTAURANT_TYPE_MAP.get(str(restaurant_type).lower(), [])
            if allowed and cat not in allowed:
                return False
        return True

    mask = gdf.apply(_is_food, axis=1)
    return gdf[mask].copy()


EXCLUDE_RETAIL_PATTERNS = [
    r"\bpublication\b", r"\bpublishers?\b", r"\bpress\b", r"\bprinting\b",
    r"\bmachine\b", r"\btools?\b", r"\bsecurity system\b", r"\bmedical devices?\b",
    r"\bdisposable\b", r"\bcorporation\b", r"\bindustrial\b", r"\bpackaging\b",
    r"\blogistics\b", r"\bchemicals?\b", r"\bmanufacturing\b", r"\bconsultant\b",
    r"\btution\b", r"\btuition\b", r"\bresearch laboratory\b", r"\blaboratory\b"
]


def categorize_retail_store(name: str) -> str:
    n = str(name).lower()
    if any(k in n for k in ['pharmacy', 'medical', 'pharma', 'chemist', 'medirise', 'apollo', 'medplus', 'wellness forever']):
        return 'Pharmacy & Medical'
    if any(k in n for k in ['grocery', 'supermarket', 'hypermarket', 'kirana', 'provision', 'mart', 'bazaar', 'bazar', 'd-mart', 'dmart', 'reliance smart', 'dairy', 'parlour', 'parlor', 'cash n carry', 'vegetable', 'more megastore', 'osia', "nature's basket"]):
        return 'Grocery & Supermarket'
    if any(k in n for k in ['fashion', 'clothing', 'apparel', 'textile', 'garment', 'selection', 'asopalav', 'benetton', 'chanel', 'wills', 'readymade', 'wedding', 'lifestyle', 'boutique', 'house of mg', 'monte carlo', 'zudio', 'pantaloons', 'westside', 'trends', 'manyavar', 'fabindia', 'raymond', 'peter england', 'allen solly', 'van heusen', 'arvind', 'zara', 'h&m', 'levi']):
        return 'Clothing & Fashion'
    if any(k in n for k in ['electronics', 'mobile', 'computer', 'digital', 'samsung', 'fonebook', 'vijay sales', 'croma', 'appliances', 'apple', 'xiaomi', 'mi home', 'oneplus', 'vivo', 'oppo', 'poorvika', 'sangeetha']):
        return 'Mobile & Electronics'
    if any(k in n for k in ['bata', 'adidas', 'shoe', 'footwear', 'woodland', 'red chief', 'metro shoes', 'mochi', 'nike', 'puma', 'skechers']):
        return 'Footwear'
    if any(k in n for k in ['jewel', 'jwell', 'gold', 'silver', 'diamond', 'tanishq', 'kalyan', 'malabar', 'joyalukkas', 'caratlane', 'चिराग़']):
        return 'Jewelry & Accessories'
    if any(k in n for k in ['furniture', 'hardware', 'plywood', 'handicraft', 'decor', 'home', 'pepperfry', 'urban ladder', 'godrej interio', 'featherlite', 'nilkamal', 'kurlon', 'tdw']):
        return 'Furniture & Home Decor'
    if any(k in n for k in ['skin', 'cosmetic', 'beauty', 'violette', 'nykaa', 'sugar', 'sephora', 'body shop', 'plum']):
        return 'Cosmetics & Beauty'
    if any(k in n for k in ['mall', 'plaza', 'plazza', 'emporio', 'arcade', 'center', 'centre', 'shopping', 'alpha one']):
        return 'Department Store & Mall'
    return 'General Retail Store'


RETAIL_TYPE_MAP = {
    'grocery': ['Grocery & Supermarket'],
    'supermarket': ['Grocery & Supermarket'],
    'electronics': ['Mobile & Electronics'],
    'mobile': ['Mobile & Electronics'],
    'appliances': ['Mobile & Electronics', 'Furniture & Home Decor'],
    'fashion': ['Clothing & Fashion'],
    'clothing': ['Clothing & Fashion'],
    'footwear': ['Footwear'],
    'pharmacy': ['Pharmacy & Medical'],
    'beauty': ['Cosmetics & Beauty'],
    'cosmetics': ['Cosmetics & Beauty'],
    'jewellery': ['Jewelry & Accessories'],
    'jewelry': ['Jewelry & Accessories'],
    'furniture': ['Furniture & Home Decor'],
    'books': ['Department Store & Mall', 'General Retail Store'],
    'sports': ['Footwear', 'Clothing & Fashion'],
    'automotive': ['Furniture & Home Decor', 'General Retail Store'],
    'toys': ['General Retail Store'],
    'specialty': ['General Retail Store', 'Cosmetics & Beauty', 'Jewelry & Accessories'],
    'general': ['General Retail Store'],
}


def filter_retail_competitors(gdf, retail_type: Optional[str] = None):
    """Filter retail competitors to include customer-facing retail businesses. If retail_type is specified, restrict to competitors matching that specific segment."""
    if gdf is None or getattr(gdf, "empty", True):
        return gdf

    def _is_customer_retail(row):
        name = str(row.get("name") or "").strip().lower()
        if not name:
            return True
        if any(re.search(pat, name) for pat in EXCLUDE_RETAIL_PATTERNS):
            return False
        if retail_type and str(retail_type).lower() not in ['all', 'auto', 'all retail', 'auto detect']:
            cat = categorize_retail_store(name)
            allowed = RETAIL_TYPE_MAP.get(str(retail_type).lower(), [])
            if allowed and cat not in allowed:
                return False
        return True

    mask = gdf.apply(_is_customer_retail, axis=1)
    return gdf[mask].copy()


class CompetitorAnalysisService:
    def __init__(self, engine: Optional[SpatialAnalysisEngine] = None):
        self.engine = engine or SpatialAnalysisEngine()

    def analyze(
        self,
        point: Point,
        use_case: str = "restaurant",
        retail_type: Optional[str] = None,
        restaurant_type: Optional[str] = None,
        office_type: Optional[str] = None,
        school_type: Optional[str] = None,
    ) -> dict:
        category = COMPETITOR_CATEGORY_BY_USE_CASE.get(use_case)
        counts = {}
        for radius in [250, 500, 1000]:
            counts[f"competitors_{radius}"] = (
                self._count_in_buffer(point, category, radius, retail_type=retail_type, restaurant_type=restaurant_type, office_type=office_type, school_type=school_type) if category else 0
            )
        counts["nearest_competitor_names"] = (
            self._nearest_names(point, 500, MAX_NEAREST_NAMES, category, retail_type=retail_type, restaurant_type=restaurant_type, office_type=office_type, school_type=school_type)
            if category
            else []
        )
    def _get_matching_subset(
        self,
        point_projected: Point,
        radius_m: float,
        category: Optional[str],
        retail_type: Optional[str] = None,
        restaurant_type: Optional[str] = None,
        office_type: Optional[str] = None,
        school_type: Optional[str] = None,
        hospital_type: Optional[str] = None,
    ):
        index_entry = self.engine.get_index("competitors")
        if index_entry is None:
            return None
        gdf_projected, index = index_entry
        buffer = point_projected.buffer(radius_m)
        matches = index.query(buffer, predicate="intersects")
        if len(matches) == 0:
            return None
        subset = gdf_projected.iloc[matches]

        if category is not None:
            mapped_cat = COMPETITOR_CATEGORY_BY_USE_CASE.get(category.lower(), category)
            subset = subset[subset["competitor_type"] == mapped_cat]
            if subset.empty:
                return subset

        if category == "retail":
            return filter_retail_competitors(subset, retail_type)
        elif category == "restaurants":
            return filter_food_competitors(subset, restaurant_type)
        elif category == "office":
            return filter_office_competitors(subset, office_type)
        elif category == "schools":
            return filter_school_competitors(subset, school_type)
        
        return subset

    def analyze(
        self,
        point: Point,
        use_case: str = "restaurant",
        retail_type: Optional[str] = None,
        restaurant_type: Optional[str] = None,
        office_type: Optional[str] = None,
        school_type: Optional[str] = None,
        hospital_type: Optional[str] = None,
    ) -> dict[str, Any]:
        category = COMPETITOR_CATEGORY_BY_USE_CASE.get(use_case.lower(), use_case)

        c_250 = self._count_in_radius(point, 250, category, retail_type=retail_type, restaurant_type=restaurant_type, office_type=office_type, school_type=school_type, hospital_type=hospital_type)
        c_500 = self._count_in_radius(point, 500, category, retail_type=retail_type, restaurant_type=restaurant_type, office_type=office_type, school_type=school_type, hospital_type=hospital_type)
        c_1000 = self._count_in_radius(point, 1000, category, retail_type=retail_type, restaurant_type=restaurant_type, office_type=office_type, school_type=school_type, hospital_type=hospital_type)

        nearest = self._nearest_names(point, 1000, MAX_NEAREST_NAMES, category, retail_type=retail_type, restaurant_type=restaurant_type, office_type=office_type, school_type=school_type, hospital_type=hospital_type)
        nearest_objs = self._nearest_competitor_objects(point, 1000, 10, category, retail_type=retail_type, restaurant_type=restaurant_type, office_type=office_type, school_type=school_type, hospital_type=hospital_type)

        data_status = "verified" if len(nearest_objs) > 0 else "No verified data available"

        return {
            "use_case": use_case,
            "data_status": data_status,
            "competitors_250": c_250,
            "competitors_500": c_500,
            "competitors_1000": c_1000,
            "nearest_competitor_names": nearest,
            "nearest_competitors": nearest_objs,
        }

    def _count_in_radius(
        self,
        point: Point,
        radius_m: float,
        category: Optional[str],
        retail_type: Optional[str] = None,
        restaurant_type: Optional[str] = None,
        office_type: Optional[str] = None,
        school_type: Optional[str] = None,
        hospital_type: Optional[str] = None,
    ) -> int:
        point_projected = self.engine._project_to_utm_point(point)
        subset = self._get_matching_subset(point_projected, radius_m, category, retail_type=retail_type, restaurant_type=restaurant_type, office_type=office_type, school_type=school_type, hospital_type=hospital_type)
        if subset is None or getattr(subset, "empty", True):
            return 0
        return len(subset)

    def _nearest_names(
        self,
        point: Point,
        radius_m: float,
        limit: int,
        category: Optional[str],
        retail_type: Optional[str] = None,
        restaurant_type: Optional[str] = None,
        office_type: Optional[str] = None,
        school_type: Optional[str] = None,
        hospital_type: Optional[str] = None,
    ) -> list[str]:
        point_projected = self.engine._project_to_utm_point(point)
        subset = self._get_matching_subset(point_projected, radius_m, category, retail_type=retail_type, restaurant_type=restaurant_type, office_type=office_type, school_type=school_type, hospital_type=hospital_type)
        if subset is None or getattr(subset, "empty", True):
            return []
        distances = subset.geometry.distance(point_projected)
        subset = subset.assign(_distance=distances).sort_values("_distance")
        names = []
        seen = set()
        for _, row in subset.iterrows():
            name = row.get("name")
            if name is None or (isinstance(name, float) and not name == name):
                continue
            text = str(name).strip()
            if text and text not in seen:
                seen.add(text)
                names.append(text)
                if len(names) >= limit:
                    break
        return names

    def _nearest_competitor_objects(
        self,
        point: Point,
        radius_m: float,
        limit: int,
        category: Optional[str],
        retail_type: Optional[str] = None,
        restaurant_type: Optional[str] = None,
        office_type: Optional[str] = None,
        school_type: Optional[str] = None,
        hospital_type: Optional[str] = None,
    ) -> list[dict]:
        point_projected = self.engine._project_to_utm_point(point)
        subset = self._get_matching_subset(point_projected, radius_m, category, retail_type=retail_type, restaurant_type=restaurant_type, office_type=office_type, school_type=school_type, hospital_type=hospital_type)
        if subset is None or getattr(subset, "empty", True):
            return []
        distances = subset.geometry.distance(point_projected)
        subset = subset.assign(_distance=distances).sort_values("_distance")
        results = []
        seen_ids = set()
        seen_names = set()
        for _, row in subset.iterrows():
            name = row.get("name")
            place_id = str(row.get("place_id") or "").strip()
            lat_val = row.get("lat")
            lon_val = row.get("lon")

            # Strict verification: Must have valid coordinates and non-empty name
            if not name or (isinstance(name, float) and name != name) or str(name).strip().lower() in ["nan", "none", "unnamed"]:
                continue
            if lat_val is None or lon_val is None or (isinstance(lat_val, float) and lat_val != lat_val):
                continue

            lat = float(lat_val)
            lon = float(lon_val)
            name_str = str(name).strip()

            if not place_id or place_id in ["nan", "None"]:
                place_id = f"place_{category}_{round(lat, 5)}_{round(lon, 5)}_{re.sub(r'[^a-zA-Z0-9]', '', name_str[:12].lower())}"

            if place_id in seen_ids or name_str in seen_names:
                continue
            seen_ids.add(place_id)
            seen_names.add(name_str)

            dist_m = round(float(row.get("_distance", 0.0)), 1)
            if category == "retail":
                cat_label = categorize_retail_store(name_str)
            elif category == "restaurants":
                cat_label = categorize_restaurant_store(name_str)
            elif category == "office":
                cat_label = categorize_office_building(name_str)
            elif category == "schools":
                cat_label = categorize_school(name_str)
            else:
                cat_label = str(category).title()

            results.append({
                "id": place_id,
                "name": name_str,
                "latitude": round(lat, 5),
                "longitude": round(lon, 5),
                "distance_m": dist_m,
                "category": cat_label,
            })
            if len(results) >= limit:
                break
        return results
