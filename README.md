# 📍 LocaVista — AI-Powered Geospatial Platform for Intelligent Business Site Selection

<div align="center">

[![Python Version](https://img.shields.io/badge/Python-3.10%2B-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![Django](https://img.shields.io/badge/Django-5.0%2B-092E20?style=for-the-badge&logo=django&logoColor=white)](https://www.djangoproject.com/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-8.0-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.0-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Leaflet](https://img.shields.io/badge/Leaflet-1.9-199900?style=for-the-badge&logo=leaflet&logoColor=white)](https://leafletjs.com/)
[![Scikit-Learn](https://img.shields.io/badge/Scikit--Learn-1.3%2B-F7931E?style=for-the-badge&logo=scikit-learn&logoColor=white)](https://scikit-learn.org/)
[![GeoPandas](https://img.shields.io/badge/GeoPandas-GIS-139C5A?style=for-the-badge)](https://geopandas.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

<p align="center">
  <strong>Transforming geospatial big data, demographic rasters, and machine learning into pinpoint commercial site recommendations.</strong>
</p>

[Key Features](#-key-features) • [System Architecture](#-system-architecture) • [Tech Stack](#-tech-stack) • [Installation & Setup](#-installation--setup) • [API Reference](#-api-reference) • [ML & GIS Pipeline](#-machine-learning--gis-pipeline) • [Contributing](#-contributing)

</div>

---

## 🌟 Overview

**LocaVista** is an advanced, full-stack Location Intelligence and Site Selection platform designed for entrepreneurs, retail chains, urban planners, and real estate developers. 

By unifying **multi-layer GIS datasets** (roads, land use, POIs, flood zones, railways, and population raster grids) with **trained Machine Learning models** (Random Forest & Gradient Boosting Regressors), LocaVista evaluates any geographic coordinate in sub-second latency and delivers an explainable **Site Suitability Score (0–100)** tailored to specific business types.

---

## ✨ Key Features

### 1. 🎯 Sub-Category & Sector-Tailored Scoring
Tailors multi-criteria decision heuristics and ML inferences across 4 primary sectors and dozens of specific sub-categories:
- 🍽️ **Restaurants & Food Service**: Fast Food, Cafes, Fine Dining, Pizzerias, Gujarati/Punjabi/South Indian cuisine, Bakeries, Street Food hubs.
- 🛍️ **Retail & Supermarkets**: Grocery & Supermarkets, Electronics, Fashion & Apparel, Footwear, Pharmacies, Beauty, Jewellery, Furniture.
- 🏢 **Offices & Coworking**: IT/Software Parks, Corporate HQs, Coworking Spaces, Financial Hubs, BPO/Back-offices.
- 🎓 **Education & Institutions**: Pre-schools/Kindergartens, High Schools (CBSE/ICSE/IB), Coaching Institutes (JEE/NEET), University Campuses.

### 2. ⚡ High-Performance Spatial Engine (Sub-30ms)
- Spatial indexing with **R-Trees & Shapely** for microsecond spatial lookups.
- High-resolution population raster integration using **RasterIO GeoTIFF** extraction.
- **Singleton cache warm-up** architecture ensures zero cold-start latency for spatial queries.
- Live fallback integration with **OpenStreetMap Overpass API** for real-time geographic verification.

### 3. ⚖️ Multi-Site Comparison Tool
- Place candidate pins on interactive maps to perform **side-by-side comparative analysis**.
- Dynamic **Spider/Radar Charts** visualising strengths and weaknesses across footfall, accessibility, competition, and risk indices.
- Automatic winner recommendation based on multi-parameter score deltas.

### 4. 🧭 AI Best Location Finder (Hotspot Discovery)
- Define a bounding box or select a target city zone.
- The AI scanning engine autonomously parses spatial grids and ranks the top **N optimal sites** matching your target business profile.

### 5. 🔍 Explainable AI & Detailed Analytics
- Breakdown of **16 extracted spatial metrics** (distance to nearest arterial roads, road names, transit accessibility, competitor density, flood hazard index, commercial zoning affinity).
- Human-readable AI diagnostic reports highlighting primary site advantages and potential risk factors.

### 6. 🔐 Authentication & History Management
- Full authentication suite with **Gmail SMTP Email OTP verification**.
- User profile dashboard with saved site evaluation history, bookmarked locations, and exportable analysis reports.

---

## 🏛️ System Architecture

```mermaid
flowchart TD
    subgraph Client["Frontend (React 19 + Vite 8 + Tailwind CSS v4)"]
        UI[Interactive Dashboard & Map UI]
        Leaflet[Leaflet & React-Leaflet GIS Layers]
        Charts[Chart.js / Radar & Bar Visualizations]
        Auth[Auth & OTP Verification Flow]
    end

    subgraph API_Gateway["Django REST Framework Backend (Django 5.x)"]
        Router[API Endpoints & URL Router]
        AuthService[User & OTP Auth Service]
        HistoryService[Analysis History & Reports Service]
    end

    subgraph Spatial_Core["LocaVista Spatial & Analysis Engine"]
        Engine[Singleton SpatialAnalysisEngine]
        RTree[R-Tree Spatial Indexing]
        Overpass[Live Overpass API Fallback]
        FeatureExt[16-Factor Feature Extraction]
    end

    subgraph ML_Layer["Machine Learning & Scoring Pipeline"]
        Scorers[Sector-Specific Heuristic Scorers]
        Models[Trained ML Regressors (RF & GBR - R² ≥ 0.99)]
        Explain[Explanation & Insight Service]
    end

    subgraph GIS_Data["GIS Data Layers & Storage"]
        Rasters[(Population Raster GeoTIFF)]
        Vectors[(Shapefiles / GeoJSON - Roads, POI, Landuse, Flood)]
        DB[(SQLite / PostgreSQL DB)]
    end

    UI -->|REST Requests / JWT| Router
    Router --> AuthService
    Router --> HistoryService
    Router --> Engine

    Engine --> RTree
    Engine --> Overpass
    RTree --> Vectors
    Engine --> Rasters
    
    Engine --> FeatureExt
    FeatureExt --> Scorers
    FeatureExt --> Models
    Models --> Explain
    Explain --> Router
    
    AuthService --> DB
    HistoryService --> DB
```

---

## 🛠️ Tech Stack

### Frontend
| Technology | Description |
| :--- | :--- |
| **React 19** | Modern UI components with hooks and React Context state management |
| **Vite 8** | Ultra-fast build tool and development server |
| **Tailwind CSS v4** | Modern utility-first styling with `@tailwindcss/vite` |
| **Leaflet & React-Leaflet** | Interactive mapping, custom markers, vector shapes, tile layers |
| **Chart.js & React-Chartjs-2** | Radar charts, bar comparisons, and metric telemetry |
| **Lucide React** | Clean, modern UI icon set |
| **Axios** | Robust HTTP client with token interceptors |

### Backend & Machine Learning
| Technology | Description |
| :--- | :--- |
| **Python 3.10+** | Core programming language |
| **Django 5.x / 6.x** | Enterprise web framework |
| **Django REST Framework** | Scalable RESTful API architecture |
| **GeoPandas & Shapely** | High-performance vector geospatial geometry processing |
| **RasterIO & PyProj** | Demographic raster grid analysis and CRS transformations |
| **Scikit-Learn & Joblib** | Random Forest & Gradient Boosting regression pipelines |
| **NumPy & Pandas** | High-throughput matrix manipulation and feature engineering |
| **SMTP / Email Backend** | Automated OTP verification via Gmail SMTP |

---

## 📁 Repository Structure

```plaintext
LocaVista/
├── backend/
│   ├── apps/
│   │   ├── accounts/             # User profiles, auth models, and serializers
│   │   ├── analysis/             # Core spatial intelligence & ML services
│   │   │   ├── management/       # CLI commands (e.g. train_model.py)
│   │   │   ├── services/         # GIS engine, feature extraction, ML predictors
│   │   │   │   ├── spatial_engine.py          # Singleton spatial index engine
│   │   │   │   ├── feature_extraction_service.py # 16-feature GIS extractor
│   │   │   │   ├── use_case_scorers.py        # Sector scoring algorithms
│   │   │   │   ├── prediction_service.py      # ML inference pipeline
│   │   │   │   ├── live_overpass_service.py   # Live OSM API fallback
│   │   │   │   └── competitor_analysis_service.py
│   │   │   └── apps.py           # Warm-up preloading on server boot
│   │   ├── api/                  # REST API views, viewsets, and URL routes
│   │   ├── gis/                  # GIS dataset management and utilities
│   │   └── reports/              # Report generation and export handlers
│   ├── config/                   # Django settings, wsgi/asgi, root URLs
│   ├── manage.py
│   └── requirements.txt          # Python dependencies
├── datasets/                     # GIS layers (Shapefiles, GeoJSON, GeoTIFF)
│   ├── buildings/                # Building footprints
│   ├── competitors/              # Competitor registry
│   ├── flood/                    # Flood risk zones
│   ├── landuse/                  # Zoning (commercial, residential, industrial)
│   ├── poi/                      # Points of Interest (Hospitals, Banks, etc.)
│   ├── population/               # High-res population raster grids
│   ├── railways/                 # Transit stations & railway networks
│   ├── roads/                    # Road hierarchies and arteries
│   └── water/                    # Water bodies and natural features
├── frontend/
│   ├── src/
│   │   ├── components/           # Reusable UI & GIS widgets (Radar, Graph Hub)
│   │   ├── context/              # Global Authentication state
│   │   ├── layouts/              # Navbar, Sidebar, and App shell
│   │   ├── pages/                # Dashboard, Compare, BestLocations, Reports, Auth
│   │   ├── services/             # Axios API service endpoints
│   │   └── utils/                # Distance formatting & spatial helpers
│   ├── package.json
│   └── vite.config.js
├── .gitignore
└── README.md
```

---

## 🚀 Installation & Setup

### Prerequisites
- **Python**: Version `3.10` or higher
- **Node.js**: Version `18.x` or `20.x+` (npm included)
- **Git**

---

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/LocaVista.git
cd LocaVista
```

---

### 2. Backend Setup (Django & GIS Engine)

1. **Navigate to the backend directory**:
   ```bash
   cd backend
   ```

2. **Create and activate a virtual environment**:
   - **Windows (PowerShell)**:
     ```powershell
     python -m venv .venv
     .venv\Scripts\Activate.ps1
     ```
   - **Linux / macOS**:
     ```bash
     python3 -m venv .venv
     source .venv/bin/activate
     ```

3. **Install Python dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Apply database migrations**:
   ```bash
   python manage.py migrate
   ```

5. **Train ML Models & Build Spatial Artifacts**:
   ```bash
   python manage.py train_model
   ```
   > *This extracts feature metrics across GIS datasets and fits RandomForest & GradientBoosting models for all business sectors.*

6. **Start the Django Development Server**:
   ```bash
   python manage.py runserver
   ```
   Backend will be accessible at: `http://127.0.0.1:8000/`

---

### 3. Frontend Setup (React & Vite)

1. **Open a new terminal and navigate to `frontend`**:
   ```bash
   cd frontend
   ```

2. **Install Node dependencies**:
   ```bash
   npm install
   ```

3. **Run the Vite development server**:
   ```bash
   npm run dev
   ```
   Frontend will launch at: `http://localhost:5173/`

---

## 📡 API Reference

### Core Analysis Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/analyze/` | Extract all 16 GIS metrics and calculate heuristic suitability score |
| `POST` | `/api/predict/` | Run trained Machine Learning inference (RF + GBR) for given coordinate |
| `POST` | `/api/compare/` | Compare Location A and Location B across all spatial and demographic features |
| `POST` | `/api/recommendations/` | AI hotspot scanner returning top candidate coordinates in a bounding region |
| `GET`  | `/api/health/` | Service health check and cache status |

### Authentication & Reports

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/send-otp/` | Send 6-digit email OTP for verification |
| `POST` | `/api/register-user/` | Register new user with verified email OTP |
| `POST` | `/api/login-user/` | Authenticate user and issue session token |
| `GET`  | `/api/history/` | Fetch saved analysis history for authenticated user |
| `POST` | `/api/history/` | Save analysis report to user history |
| `DELETE` | `/api/history/:id/` | Remove a saved report |

---

### Sample Request: Predict Site Suitability
```bash
curl -X POST http://127.0.0.1:8000/api/predict/ \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 23.0225,
    "longitude": 72.5714,
    "use_case": "restaurant",
    "restaurant_type": "cafe"
  }'
```

#### Sample Response:
```json
{
  "status": "success",
  "score": 87.19,
  "rating": "Excellent",
  "confidence": 0.94,
  "nearest_features": {
    "nearest_road": "Ashram Road",
    "nearest_road_dist_m": 42.5,
    "nearest_hospital": "Dr. Manoj Tank E.N.T. Hospital",
    "nearest_bank": "State Bank of India Ahmedabad Office",
    "nearest_bus_stop": "Lal Darwaja AMTS Bus Stop"
  },
  "metrics": {
    "population_density": 88.4,
    "transit_accessibility": 92.0,
    "flood_risk": "Low",
    "commercial_zoning_score": 95.0,
    "competitor_density": 64.0
  }
}
```

---

## 📊 Machine Learning & GIS Pipeline

### 1. Spatial Feature Extraction (16 Metrics)
For any coordinate $(\text{lat}, \text{lon})$, the engine extracts:
1. **Primary Road Distance** ($m$) & Arterial Road Name
2. **Population Density Index** (Raster GeoTIFF cell extraction)
3. **Hospital / Healthcare Proximity** ($m$)
4. **School & University Proximity** ($m$)
5. **Bank & Financial Hub Proximity** ($m$)
6. **Restaurant & Food Outlet Proximity** ($m$)
7. **Pharmacy & Medical Store Proximity** ($m$)
8. **Public Transit / Bus Stop Proximity** ($m$)
9. **Railway Station Proximity** ($m$)
10. **Water Body Proximity** ($m$)
11. **Flood Hazard Vulnerability Index** (Categorical Risk Mapping)
12. **Residential Land Use Overlap** ($0/1$)
13. **Commercial & Mixed Land Use Overlap** ($0/1$)
14. **Industrial Zone Overlap** ($0/1$)
15. **Agricultural Zone Overlap** ($0/1$)
16. **Competitor Saturation Count** (Kernel density within 500m / 1000m radius)

### 2. Model Training & Accuracy
- **Models**: `RandomForestRegressor` and `GradientBoostingRegressor`
- **Training Samples**: 2,500+ generated spatial ground-truth coordinates
- **Performance**:
  - Restaurant Model: $R^2 = 0.9927$
  - Retail Store Model: $R^2 = 0.9956$
  - Corporate Office Model: $R^2 = 0.9954$
  - Healthcare / Clinic Model: $R^2 = 0.9942$

---

## ⚙️ Environment Variables (Optional Configuration)

Create a `.env` file in the `backend/` directory if you wish to override default SMTP email settings:

```env
# Django Settings
DEBUG=True
SECRET_KEY=your-custom-django-secret-key
ALLOWED_HOSTS=127.0.0.1,localhost

# Email SMTP Settings (For OTP Delivery)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your_email@gmail.com
EMAIL_HOST_PASSWORD=your_app_specific_password
DEFAULT_FROM_EMAIL=LocaVista AI <your_email@gmail.com>
```

---

## 🤝 Contributing

Contributions are welcome! If you'd like to improve LocaVista:

1. **Fork the Repository**
2. **Create a Feature Branch**:
   ```bash
   git checkout -b feature/AmazingFeature
   ```
3. **Commit your Changes**:
   ```bash
   git commit -m "Add AmazingFeature"
   ```
4. **Push to the Branch**:
   ```bash
   git push origin feature/AmazingFeature
   ```
5. **Open a Pull Request**

---



---

<div align="center">
  <sub>Built with ❤️ by the LocaVista Engineering Team. Empowering businesses with spatial intelligence.</sub>
</div>

