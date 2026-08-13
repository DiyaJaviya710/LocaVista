import { useEffect, useMemo, useRef, useState } from 'react';
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Compass, LocateFixed, MapPin, Search, Sparkles, Store, Bookmark, CheckCircle2, Download } from 'lucide-react';
import { predictLocation, saveReport, USE_CASES, RETAIL_TYPES, RESTAURANT_TYPES, OFFICE_TYPES, SCHOOL_TYPES } from '../services/api';
import { AHMEDABAD_LOCATIONS } from '../constants/locations';
import { formatKm } from '../utils/format';
import { printAssessmentPDF } from '../utils/printPdf';
import SpatialGraphHub from '../components/SpatialGraphHub';

const competitorIcon = L.divIcon({
  className: 'custom-competitor-pin',
  html: `<div style="background-color: #ef4444; width: 16px; height: 16px; border-radius: 50%; border: 2.5px solid #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.35);"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const PILL_LABELS = {
  restaurant: 'Restaurant',
  retail: 'Retail Store',
  office: 'Office',
  school: 'School',
};

function MapClickHandler({ onLocationSelect }) {
  useMapEvents({
    click: (event) => {
      onLocationSelect(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

function MapViewController({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && center.latitude && center.longitude && map) {
      try {
        map.setView([center.latitude, center.longitude], 13);
      } catch (err) {
        // Ignore initialization frame errors
      }
    }
  }, [center, map]);
  return null;
}



export default function Dashboard() {
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [latInput, setLatInput] = useState('');
  const [lngInput, setLngInput] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [useCase, setUseCase] = useState('restaurant');
  const [retailType, setRetailType] = useState('grocery');
  const [restaurantType, setRestaurantType] = useState('fast_food');
  const [officeType, setOfficeType] = useState('auto');
  const [schoolType, setSchoolType] = useState('primary_preschool');
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (selectedLocation?.latitude !== undefined && selectedLocation?.longitude !== undefined) {
      setLatInput(String(selectedLocation.latitude));
      setLngInput(String(selectedLocation.longitude));
    } else if (!selectedLocation) {
      setLatInput('');
      setLngInput('');
    }
  }, [selectedLocation]);

  const handleRunManualAnalysis = async () => {
    const lat = parseFloat(latInput);
    const lng = parseFloat(lngInput);
    if (!isNaN(lat) && !isNaN(lng)) {
      const newLoc = { latitude: lat, longitude: lng };
      setSelectedLocation(newLoc);
      await requestAnalysis(lat, lng);
    } else {
      setError('Please enter valid numerical Latitude and Longitude values.');
    }
  };

  const filteredLocations = searchValue.trim()
    ? Object.values(AHMEDABAD_LOCATIONS).filter((loc) =>
      loc.name.toLowerCase().includes(searchValue.trim().toLowerCase())
    ).sort((a, b) => {
      const query = searchValue.trim().toLowerCase();
      const aStarts = a.name.toLowerCase().startsWith(query);
      const bStarts = b.name.toLowerCase().startsWith(query);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return a.name.localeCompare(b.name);
    })
    : [];

  const requestAnalysis = async (latitude, longitude, useCaseArg = useCase, retailTypeArg = retailType, restaurantTypeArg = restaurantType, officeTypeArg = officeType, schoolTypeArg = schoolType) => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError('');
    setAnalysis(null);
    try {
      const result = await predictLocation(latitude, longitude, useCaseArg, retailTypeArg, restaurantTypeArg, officeTypeArg, schoolTypeArg);
      if (requestIdRef.current === requestId) {
        setAnalysis(result);
      }
    } catch (err) {
      if (requestIdRef.current === requestId) {
        setError(err.message || 'Could not analyze location');
      }
    } finally {
      if (requestIdRef.current === requestId) {
        setLoading(false);
      }
    }
  };

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSaveAssessmentReport = async () => {
    if (!analysis || !selectedLocation) return;
    const locationName = searchValue || `Lat ${Number(selectedLocation.latitude).toFixed(4)}, Lng ${Number(selectedLocation.longitude).toFixed(4)}`;

    try {
      const apiRes = await saveReport({
        latitude: Number(selectedLocation.latitude),
        longitude: Number(selectedLocation.longitude),
        result: { ...analysis, location_name: locationName, use_case: useCase }
      });

      if (apiRes && apiRes.id) {
        const reportObj = {
          id: `REP-API-${apiRes.id}`,
          apiId: apiRes.id,
          location_name: locationName,
          latitude: Number(selectedLocation.latitude),
          longitude: Number(selectedLocation.longitude),
          use_case: useCase,
          score: analysis.score ?? analysis.site_readiness_score ?? 75.0,
          date: new Date().toISOString().split('T')[0],
          status: 'Approved',
          recommendation: analysis.explanation?.recommendation || 'Site evaluated successfully.'
        };
        const existing = JSON.parse(localStorage.getItem('locavista_saved_reports') || '[]');
        const updated = [reportObj, ...existing.filter((item) => item.id !== reportObj.id && item.apiId !== apiRes.id)];
        localStorage.setItem('locavista_saved_reports', JSON.stringify(updated));
      }
    } catch (err) {
      // Offline fallback: save to localStorage with unique ID
      const reportObj = {
        id: `REP-LOCAL-${Date.now().toString().slice(-6)}`,
        location_name: locationName,
        latitude: Number(selectedLocation.latitude),
        longitude: Number(selectedLocation.longitude),
        use_case: useCase,
        score: analysis.score ?? analysis.site_readiness_score ?? 75.0,
        date: new Date().toISOString().split('T')[0],
        status: 'Approved',
        recommendation: analysis.explanation?.recommendation || 'Site evaluated successfully.'
      };
      const existing = JSON.parse(localStorage.getItem('locavista_saved_reports') || '[]');
      existing.unshift(reportObj);
      localStorage.setItem('locavista_saved_reports', JSON.stringify(existing));
    }

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!searchValue || !searchValue.trim()) return;

    const term = searchValue.trim().toLowerCase();

    // Check built-in dictionary first for instant response
    if (AHMEDABAD_LOCATIONS[term]) {
      const target = AHMEDABAD_LOCATIONS[term];
      const newLoc = { latitude: target.latitude, longitude: target.longitude };
      setSelectedLocation(newLoc);
      requestAnalysis(newLoc.latitude, newLoc.longitude);
      return;
    }

    // Partial match in dictionary
    const matchedKey = Object.keys(AHMEDABAD_LOCATIONS).find((k) => k.includes(term) || term.includes(k));
    if (matchedKey) {
      const target = AHMEDABAD_LOCATIONS[matchedKey];
      const newLoc = { latitude: target.latitude, longitude: target.longitude };
      setSelectedLocation(newLoc);
      requestAnalysis(newLoc.latitude, newLoc.longitude);
      return;
    }

    // Fallback to OpenStreetMap Nominatim geocoding
    setLoading(true);
    setError('');
    try {
      const query = term.includes('ahmedabad') ? term : `${term}, Ahmedabad, Gujarat, India`;
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        const newLoc = { latitude: lat, longitude: lng };
        setSelectedLocation(newLoc);
        requestAnalysis(lat, lng);
      } else {
        setError(`Could not locate "${searchValue}" in Ahmedabad. Try Nikol, Navrangpura, Satellite, Bodakdev, Maninagar, etc.`);
      }
    } catch (err) {
      setError(`Search failed for "${searchValue}". Please pick a location from the map.`);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (selectedLocation?.latitude && selectedLocation?.longitude) {
      await requestAnalysis(selectedLocation.latitude, selectedLocation.longitude);
    }
  };


  const handleMapClick = async (lat, lng) => {
    setSelectedLocation({ latitude: lat, longitude: lng });
    await requestAnalysis(lat, lng);
  };

  useEffect(() => {
    if (selectedLocation?.latitude && selectedLocation?.longitude) {
      requestAnalysis(selectedLocation.latitude, selectedLocation.longitude, useCase, retailType, restaurantType, officeType, schoolType);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useCase, retailType, restaurantType, officeType, schoolType]);

  const metrics = useMemo(() => {
    if (!analysis) return [];
    const features = analysis.features ?? {};
    const entries = [
      // ['Road', features.road_distance, features.nearest_road_name],
      ['Nearest Main Road', features.highway_distance, features.nearest_highway_name],
      ['Nearest Hospital', features.hospital_distance, features.nearest_hospital_name],
      // ['School', features.school_distance, features.nearest_school_name],
      ['Nearest Bank', features.bank_distance, features.nearest_bank_name],
      ['Nearest Restaurant', features.restaurant_distance, features.nearest_restaurant_name],
      ['Nearest Pharmacy', features.pharmacy_distance, features.nearest_pharmacy_name],
      ['Nearest Bus Stop', features.bus_stop_distance, features.nearest_bus_stop_name],
      ['Nearest Railway', features.railway_distance],
    ];
    const distanceRows = entries.map(([label, distance, name]) => ({
      label: `${label} Distance`,
      value: formatKm(distance),
      name: name ?? null,
    }));
    const population = features.population_value;
    const landuse = features.landuse;
    const flood = features.flood_risk;
    const summaryRows = [
      {
        label: 'Population Density',
        value: population === undefined || population === null ? 'n/a' : `${Math.round(population)} residents/km² (${features.population_category ?? 'unknown'})`,
        name: null,
      },
      {
        label: 'Land Use Category',
        value: landuse ?? 'n/a',
        name: null,
      },
      {
        label: 'Flood Exposure',
        value: flood ?? 'n/a',
        name: null,
      },
    ];
    return [...distanceRows, ...summaryRows];
  }, [analysis]);

  const competitorList = useMemo(() => {
    return analysis?.features?.nearest_competitors ?? [];
  }, [analysis]);

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Interactive Map Explorer</p>
            <h2 className="text-xl font-bold text-slate-900">Ahmedabad Location Explorer</h2>
          </div>
          <div className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">Live Spatial AI</div>
        </div>

        <div className="relative mb-4">
          <form onSubmit={(e) => { handleSearch(e); setShowDropdown(false); }} className="flex flex-col gap-2.5 rounded-2xl border border-slate-200 bg-slate-50 p-2.5 sm:flex-row">
            <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
              <Search size={16} className="text-slate-400 shrink-0" />
              <input
                value={searchValue}
                onChange={(event) => {
                  setSearchValue(event.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 outline-none"
                placeholder="Search area (e.g. Nikol, Satellite, Navrangpura)"
              />
            </div>
            <button type="submit" className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 shadow-sm shrink-0">
              <Search size={14} className="mr-1 inline" /> Search
            </button>
            <button
              type="button"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 shrink-0"
              onClick={() => {
                setSelectedLocation(null);
                setSearchValue('');
                setShowDropdown(false);
                setAnalysis(null);
                setError('');
              }}
            >
              <LocateFixed size={16} className="mr-1 inline text-slate-500" /> Reset
            </button>
          </form>

          {/* Autocomplete Dropdown List */}
          {showDropdown && filteredLocations.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
              <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Matching Areas ({filteredLocations.length})
              </p>
              {filteredLocations.map((loc) => (
                <button
                  key={loc.name}
                  type="button"
                  onMouseDown={() => {
                    setSearchValue(loc.name);
                    setSelectedLocation({ latitude: loc.latitude, longitude: loc.longitude });
                    requestAnalysis(loc.latitude, loc.longitude);
                    setShowDropdown(false);
                  }}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition hover:bg-blue-50"
                >
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-blue-600 shrink-0" />
                    <span className="font-bold text-slate-800">{loc.name}</span>
                  </div>
                  <span className="text-[11px] font-sans font-bold text-slate-600">
                    {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Business Use Case</p>
            <p className="text-xs text-slate-400">Scoring ML Model</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {USE_CASES.map((uc) => (
              <button
                key={uc}
                onClick={() => setUseCase(uc)}
                className={
                  'rounded-xl px-4 py-2 text-sm font-medium transition ' +
                  (useCase === uc
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100')
                }
              >
                {PILL_LABELS[uc]}
              </button>
            ))}
          </div>
        </div>

        {useCase === 'retail' && (
          <div className="mb-4 rounded-2xl border border-blue-200 bg-blue-50/70 p-3.5 shadow-2xs">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-blue-900">
                Retail Type (Competitor Segment Filter)
              </p>
              <span className="text-[11px] font-semibold text-blue-700">
                Filters relevant competitors
              </span>
            </div>
            <select
              value={retailType}
              onChange={(e) => setRetailType(e.target.value)}
              className="w-full rounded-xl border border-blue-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 shadow-xs"
            >
              {RETAIL_TYPES.map((rt) => (
                <option key={rt.id} value={rt.id}>
                  {rt.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {useCase === 'restaurant' && (
          <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3.5 shadow-2xs">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                Restaurant Type (Food Segment Filter)
              </p>
              <span className="text-[11px] font-semibold text-emerald-700">
                Filters relevant food competitors
              </span>
            </div>
            <select
              value={restaurantType}
              onChange={(e) => setRestaurantType(e.target.value)}
              className="w-full rounded-xl border border-emerald-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-xs"
            >
              {RESTAURANT_TYPES.map((rt) => (
                <option key={rt.id} value={rt.id}>
                  {rt.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {useCase === 'office' && (
          <div className="mb-4 rounded-2xl border border-purple-200 bg-purple-50/70 p-3.5 shadow-2xs">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-purple-900">
                Office Type (Commercial Segment Filter)
              </p>
              <span className="text-[11px] font-semibold text-purple-700">
                Filters relevant office spaces
              </span>
            </div>
            <select
              value={officeType}
              onChange={(e) => setOfficeType(e.target.value)}
              className="w-full rounded-xl border border-purple-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 shadow-xs"
            >
              {OFFICE_TYPES.map((ot) => (
                <option key={ot.id} value={ot.id}>
                  {ot.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {useCase === 'school' && (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5 shadow-2xs">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-900">
                School Type (Education Segment Filter)
              </p>
              <span className="text-[11px] font-semibold text-amber-700">
                Filters relevant schools & institutes
              </span>
            </div>
            <select
              value={schoolType}
              onChange={(e) => setSchoolType(e.target.value)}
              className="w-full rounded-xl border border-amber-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 shadow-xs"
            >
              {SCHOOL_TYPES.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="h-[300px] sm:h-[360px] lg:h-[400px] w-full overflow-hidden rounded-2xl border border-slate-200 shadow-inner">
          <MapContainer center={selectedLocation ? [selectedLocation.latitude, selectedLocation.longitude] : [23.0225, 72.5714]} zoom={12} scrollWheelZoom>
            <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {selectedLocation && <MapViewController center={selectedLocation} />}
            <MapClickHandler onLocationSelect={handleMapClick} />
            {selectedLocation && selectedLocation.latitude && selectedLocation.longitude && (
              <>
                <Circle center={[selectedLocation.latitude, selectedLocation.longitude]} radius={250} pathOptions={{ color: '#2563eb', fillColor: '#2563eb', fillOpacity: 0.15 }} />
                <Circle center={[selectedLocation.latitude, selectedLocation.longitude]} radius={500} pathOptions={{ color: '#7c3aed', fillColor: '#7c3aed', fillOpacity: 0.08 }} />
                <Circle center={[selectedLocation.latitude, selectedLocation.longitude]} radius={1000} pathOptions={{ color: '#db2777', fillColor: '#db2777', fillOpacity: 0.03 }} />
                <Marker position={[selectedLocation.latitude, selectedLocation.longitude]}>
                  <Popup>
                    <div className="text-sm text-slate-900 font-sans">
                      <p className="font-bold text-blue-600">Selected Location</p>
                      <p>Lat: {selectedLocation.latitude.toFixed(4)}</p>
                      <p>Lng: {selectedLocation.longitude.toFixed(4)}</p>
                    </div>
                  </Popup>
                </Marker>
              </>
            )}

            {competitorList.map((comp, idx) => (
              <Marker
                key={idx}
                position={[comp.latitude, comp.longitude]}
                icon={competitorIcon}
              >
                <Popup>
                  <div className="font-sans text-xs text-slate-900">
                    <p className="font-bold text-rose-600">{comp.name}</p>
                    <p className="mt-1 font-medium text-slate-700 capitalize">
                      Category: {comp.category}
                    </p>
                    <p className="text-slate-500">
                      Distance: {formatKm(comp.distance_m)} ({comp.distance_m}m)
                    </p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-600">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="inline-block h-3 w-3 rounded-full bg-blue-600 border border-white shadow-2xs"></span>
              Target Site
            </span>
            <span className="flex items-center gap-1.5 font-medium text-rose-600">
              <span className="inline-block h-3 w-3 rounded-full bg-rose-500 border border-white shadow-2xs"></span>
              Competitors ({competitorList.length} plotted)
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            250m / 500m / 1000m trade circles
          </span>
        </div>

        {analysis && analysis.features && (
          <div className="mt-6">
            <SpatialGraphHub features={analysis.features} score={analysis.score} explanation={analysis.explanation} />
          </div>
        )}

        {competitorList.length > 0 && (
          <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-600">
                <Store size={18} />
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Nearby Competitors ({competitorList.length})
                </p>
              </div>

              <span className="rounded-full border border-rose-100 bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-600">
                Trade Area Map
              </span>
            </div>

            <div className="mt-4 grid gap-2.5">
              {competitorList.map((comp, idx) => (
                <div
                  key={`${comp.name}-${comp.latitude}-${comp.longitude}-${idx}`}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-3.5 py-2.5 text-xs"
                >
                  <div className="min-w-0">
                    <p
                      className="truncate font-bold text-slate-900"
                      title={comp.name}
                    >
                      {comp.name}
                    </p>

                    <p className="mt-0.5 text-[11px] capitalize text-slate-500">
                      Category: {comp.category}
                    </p>
                  </div>

                  <span className="shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-rose-700 shadow-2xs">
                    {formatKm(comp.distance_m)} ({comp.distance_m}m)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-blue-600">
            <Compass size={18} />
            <p className="text-xs font-semibold uppercase tracking-wider text-black">Target Location Coordinates</p>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 focus-within:border-blue-500 focus-within:bg-white transition">
              <label className="text-xs text-black font-bold block mb-1">Latitude</label>
              <input
                type="number"
                step="any"
                placeholder="e.g. 23.0225"
                value={latInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setLatInput(val);
                  const lat = parseFloat(val);
                  const lng = parseFloat(lngInput);
                  if (!isNaN(lat) && !isNaN(lng)) {
                    setSelectedLocation({ latitude: lat, longitude: lng });
                  }
                }}
                className="w-full text-base font-bold text-black bg-transparent outline-none font-sans"
              />
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 focus-within:border-blue-500 focus-within:bg-white transition">
              <label className="text-xs text-black font-bold block mb-1">Longitude</label>
              <input
                type="number"
                step="any"
                placeholder="e.g. 72.5714"
                value={lngInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setLngInput(val);
                  const lat = parseFloat(latInput);
                  const lng = parseFloat(val);
                  if (!isNaN(lat) && !isNaN(lng)) {
                    setSelectedLocation({ latitude: lat, longitude: lng });
                  }
                }}
                className="w-full text-base font-bold text-black bg-transparent outline-none font-sans"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleRunManualAnalysis}
            disabled={loading || !latInput || !lngInput}
            className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-600/20"
          >
            {loading ? 'Analyzing...' : 'Run Spatial Analysis'}
          </button>

          {error && (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
              <p className="font-semibold text-rose-700">
                {error.toLowerCase().includes('coverage') || error.toLowerCase().includes('outside')
                  ? 'Out of Supported Coverage Area'
                  : error.toLowerCase().includes('timeout')
                    ? 'Request Timeout'
                    : 'Analysis Error'}
              </p>
              <p className="mt-1 leading-relaxed">{error}</p>
              <button
                onClick={() => {
                  setSelectedLocation(null);
                  setLatInput('');
                  setLngInput('');
                  setSearchValue('');
                  setAnalysis(null);
                  setError('');
                }}
                className="mt-3 rounded-xl border border-rose-200 bg-white px-3 py-1.5 font-medium text-rose-700 transition hover:bg-rose-100"
              >
                Clear Selection
              </button>
            </div>
          )}
        </div>

        {!selectedLocation && !analysis && !loading && (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center shadow-xs">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mb-3">
              <Compass size={24} />
            </div>
            <h3 className="text-base font-bold text-slate-900">Select a Location to Begin</h3>
            <p className="mt-1 max-w-sm text-xs text-slate-500 leading-relaxed">
              Click any point on the map or use the search bar above to calculate live AI site readiness scores, competitor counts, and spatial features.
            </p>
          </div>
        )}

        {loading && !analysis && (
          <div className="animate-pulse rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3 text-blue-600">
              <Sparkles className="animate-spin" size={20} />
              <p className="text-xs font-semibold uppercase tracking-wider">Analyzing Location...</p>
            </div>
            <p className="mt-2 text-xs text-slate-500">Querying STRtree spatial indexes, population GeoTIFF, and calculating ML Spatial Scoring & Market Capture...</p>
            <div className="mt-4 h-16 w-full rounded-2xl bg-slate-100"></div>
            <div className="mt-3 h-24 w-full rounded-2xl bg-slate-100"></div>
          </div>
        )}

        {analysis && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-5 font-sans">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div>
                <h3 className="text-base font-extrabold text-black">Active Selected Site Analytics</h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveAssessmentReport}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 text-xs font-bold text-black transition"
                >
                  {savedSuccess ? (
                    <>
                      <CheckCircle2 size={14} className="text-emerald-600" /> Saved!
                    </>
                  ) : (
                    <>
                      <Bookmark size={14} /> Save Report
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => printAssessmentPDF({
                    locationName: selectedLocation?.name || (latInput && lngInput ? `Lat: ${parseFloat(latInput).toFixed(4)}, Lng: ${parseFloat(lngInput).toFixed(4)}` : 'Selected Location'),
                    score: analysis.score,
                    useCase: useCase,
                    latitude: selectedLocation?.latitude || latInput,
                    longitude: selectedLocation?.longitude || lngInput,
                    explanation: analysis.explanation,
                    features: analysis.features
                  })}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 px-3 py-1.5 text-xs font-bold text-black transition shadow-2xs"
                >
                  <Download size={14} className="text-blue-600" /> Export PDF
                </button>
              </div>
            </div>

            {/* Score Gauge */}
            <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-5 flex items-baseline justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-blue-900">AI Readiness Score</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-4xl font-black text-black">
                    {analysis.score != null ? analysis.score : (analysis.site_readiness_score != null ? analysis.site_readiness_score : 'N/A')}
                  </span>
                  {analysis.score != null && <span className="text-xs font-bold text-slate-500">/ 100</span>}
                </div>
              </div>
              <div className="text-right space-y-1">
                <span className="rounded-full bg-blue-600 text-white px-3 py-1 text-xs font-bold block">
                  {analysis.prediction ?? 'Score Not Valid on Water'}
                </span>
                {analysis.confidence !== undefined && (
                  <span className="text-[11px] font-bold text-slate-500 block">
                    Confidence: {Math.round(analysis.confidence * 100)}%
                  </span>
                )}
              </div>
            </div>

            {/* Executive Recommendation */}
            {analysis.explanation?.recommendation && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs font-semibold leading-relaxed text-black">
                {analysis.explanation.recommendation}
              </div>
            )}

            {/* Key Score Drivers */}
            {analysis.explanation?.drivers && analysis.explanation.drivers.length > 0 && (
              <div className="space-y-2 border-t border-slate-100 pt-4">
                <p className="text-xs font-bold uppercase tracking-wider text-black">Key Score Drivers</p>
                <div className="grid gap-2">
                  {analysis.explanation.drivers.map((d, dIdx) => (
                    <div key={dIdx} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-3.5 py-2.5 text-xs font-sans min-w-0">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-black text-xs leading-snug">{d.name}</p>
                        {d.detail && <p className="text-[11px] font-semibold text-slate-500 truncate mt-0.5" title={d.detail}>{d.detail}</p>}
                      </div>
                      <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-lg border shadow-2xs ${d.type === 'positive' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-rose-700 bg-rose-50 border-rose-200'}`}>
                        {d.impact}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}



        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-blue-600">
            <Sparkles size={18} />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-700">Quick Metrics</p>
          </div>
          <div className="mt-4 grid gap-2.5">
            {metrics.map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-500">{item.label}</p>
                  {item.name && <p className="truncate text-xs text-slate-700 font-medium" title={item.name}>{item.name}</p>}
                </div>
                <span className="shrink-0 text-sm font-bold text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


