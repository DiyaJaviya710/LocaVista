# Fix Plan

## Bug Fixes

- [x] 1. Register `@tailwindcss/vite` plugin in `frontend/vite.config.js` (root cause of invisible map / unstyled UI)
- [x] 2. Add Leaflet default marker icon fix in `frontend/src/main.jsx`
- [x] 3. Create `backend/requirements.txt` with backend dependencies
- [x] 4. Fix population raster path in `backend/apps/analysis/services/spatial_engine.py`
- [x] 5. Clean up population dataset endpoint in `backend/apps/api/views/api_views.py`
- [x] 6. Wire map-click on Dashboard to trigger analysis (`frontend/src/pages/Dashboard.jsx`)
- [x] 7. Fix POST /api/analyze/ timeout — singleton SpatialAnalysisEngine + startup warm-up so first user request isn't bounded by cold cache (see `spatial_engine.py:188-202`, `apps.py:ready`, `api_views.py:103-107`)
- [x] 8. Wire Dashboard map-click to trained model via `/api/predict/` — frontend `Dashboard.jsx` calls `predictLocation()`, score card displays `score`/`prediction`/`confidence`/`features`. Backend `PredictionService` now uses singleton engine + preloads model in `apps.py.ready`.
- [x] 9. Retrain trained model — replaced broken `_generate_rule_based_label` (always clamped to 0) with `SiteScoringService.score()` heuristic. Re-fit RandomForest (r²=0.98) and GradientBoosting (r²=0.998) on 2500 regenerated samples. Live `/api/predict/` returns score 87.19 / Excellent for the default marker.
- [x] 10. UI distances in km — `frontend/src/utils/format.js` (`formatKm` helper, falls back to meters for sub-10m); applied in Dashboard Quick Metrics and Analysis metric grid.
- [x] 11. Return nearest feature names — `SpatialAnalysisEngine.nearest_feature_record` + `feature_name` (priority columns per dataset); leaf services surface `nearest_{x}_name`; `/api/predict/` and `/api/analyze/` JSON include road/POI/railway/water names; Dashboard quick metrics and Analysis grid show them under each distance.
- [x] 12. Per-use-case site readiness — `use_case_scorers.py` defines score_restaurant, score_retail, score_office, score_clinic as specialized weighted heuristics over the same 16 features. `DatasetGenerationService` emits four score columns per row; `TrainingPipelineService.run(use_case)` writes artifacts under `artifacts/<use_case>/` (model.pkl, preprocessor.pkl, dataset.csv, plus rf + gb). `PredictionService` is now a multi-bundle loader; `apps.py.ready()` preloads all four. New `use_case` parameter on both `/api/predict/` and `/api/analyze/`, defaults to `restaurant`, rejects unknown values with 400. Dashboard and Analysis pages show a four-pill segmented control above the map/form; switching reruns analysis with the chosen use case. Caption now reads `Source: trained model · <Use Case Label>`.

## Verification

- [x] 13. Backend warm-cache request after engine warm-up: ~18ms (was ~50s)
- [x] 14. Trained-model /api/predict/ round trip ~30ms with reasonable score distribution across points
- [x] 15. Names visible in API response for default marker: Ashram Road, Dr. Manoj Tank E.N.T. Hospital, Balghar school, State Bank of India Ahmedabad Office, Jai Jalaram Parontha House, Apollo Pharmacy, Lal Darwaja AMTS Bus Stop
- [x] 16. Per-use-case model training — all four use cases have r² ≥ 0.99 against their heuristic (restaurant GBR r²=0.9927, retail 0.9956, office 0.9954, clinic 0.9942). Live /api/predict/ scores at default marker: restaurant 86.59, retail 88.50, office 76.24, clinic 84.47 — distinct across use cases.

