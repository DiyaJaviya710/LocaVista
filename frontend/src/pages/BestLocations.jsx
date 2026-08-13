import { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Sparkles, MapPin, Utensils, Store, Building, GraduationCap, CheckCircle2, Bookmark, ShieldCheck, Activity, Download } from 'lucide-react';
import { getRecommendedLocations, saveReport, RESTAURANT_TYPES, RETAIL_TYPES, OFFICE_TYPES, SCHOOL_TYPES } from '../services/api';
import { formatKm } from '../utils/format';
import { printAssessmentPDF } from '../utils/printPdf';
import SpatialGraphHub from '../components/SpatialGraphHub';

const competitorIcon = L.divIcon({
  className: 'custom-competitor-pin',
  html: `<div style="background-color: #ef4444; width: 14px; height: 14px; border-radius: 50%; border: 2px solid #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.25);"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

function createRankPinIcon(rank) {
  const isWinner = rank === 1;
  const bgColor = isWinner
    ? '#2563eb'
    : rank === 2
      ? '#1d4ed8'
      : rank === 3
        ? '#4f46e5'
        : rank === 4
          ? '#0284c7'
          : '#475569';

  const size = isWinner ? 34 : 28;
  const fontSize = isWinner ? 13 : 11;

  return L.divIcon({
    className: `custom-rank-pin-${rank}`,
    html: `<div style="background-color: ${bgColor}; width: ${size}px; height: ${size}px; border-radius: 50%; border: 2.5px solid #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; color: #ffffff; font-weight: 800; font-size: ${fontSize}px; font-family: sans-serif;">#${rank}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

const USE_CASE_CONFIG = [
  { id: 'restaurant', label: 'Restaurant & Cafe', icon: Utensils },
  { id: 'retail', label: 'Retail Store', icon: Store },
  { id: 'office', label: 'Corporate Office', icon: Building },
  { id: 'school', label: 'Education & School', icon: GraduationCap },
];

function MapViewController({ selectedLoc }) {
  const map = useMap();
  useEffect(() => {
    if (selectedLoc && selectedLoc.latitude && selectedLoc.longitude && map) {
      try {
        map.setView([selectedLoc.latitude, selectedLoc.longitude], 14, { animate: true });
      } catch (err) {
        // Ignore frame errors
      }
    }
  }, [selectedLoc, map]);
  return null;
}

export const buildAnalysisPayload = (uc, ret, rest, off, sch, limit = 5) => {
  const payload = { use_case: uc, limit };
  if (uc === 'restaurant') {
    payload.restaurant_type = rest || 'fast_food';
  } else if (uc === 'retail') {
    payload.retail_type = ret || 'grocery';
  } else if (uc === 'office') {
    payload.office_type = off || 'auto';
  } else if (uc === 'school') {
    payload.school_type = sch || 'primary_preschool';
  }
  return payload;
};

export default function BestLocations() {
  const [useCase, setUseCase] = useState('restaurant');
  const [retailType, setRetailType] = useState('grocery');
  const [restaurantType, setRestaurantType] = useState('fast_food');
  const [officeType, setOfficeType] = useState('auto');
  const [schoolType, setSchoolType] = useState('primary_preschool');

  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [selectedLoc, setSelectedLoc] = useState(null);
  const [error, setError] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const latestRequestId = useRef(0);
  const abortControllerRef = useRef(null);

  const fetchRecommendations = async (
    targetUseCase = useCase,
    targetRetail = retailType,
    targetRestaurant = restaurantType,
    targetOffice = officeType,
    targetSchool = schoolType
  ) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const currentReqId = ++latestRequestId.current;
    setLoading(true);
    setError('');
    setRecommendations([]);
    setSelectedLoc(null);

    const payload = buildAnalysisPayload(
      targetUseCase,
      targetRetail,
      targetRestaurant,
      targetOffice,
      targetSchool,
      5
    );

    try {
      const res = await getRecommendedLocations(payload, controller.signal);
      if (currentReqId !== latestRequestId.current) return;
      if (res && res.recommendations) {
        setRecommendations(res.recommendations);
        if (res.recommendations.length > 0) {
          setSelectedLoc(res.recommendations[0]);
        }
      }
    } catch (err) {
      if (err.name === 'CanceledError' || err.name === 'AbortError' || err.message === 'canceled') return;
      if (currentReqId !== latestRequestId.current) return;
      setError('Could not fetch AI location recommendations. Please verify network connection.');
    } finally {
      if (currentReqId === latestRequestId.current) {
        setLoading(false);
      }
    }
  };

  const handleRunAnalysis = (
    uc = useCase,
    ret = retailType,
    rest = restaurantType,
    off = officeType,
    sch = schoolType
  ) => {
    setHasSearched(true);
    fetchRecommendations(uc, ret, rest, off, sch);
  };

  // Only auto-update if the user has already initiated an analysis
  useEffect(() => {
    if (hasSearched) {
      fetchRecommendations(useCase, retailType, restaurantType, officeType, schoolType);
    }
  }, [useCase, retailType, restaurantType, officeType, schoolType]);

  const handleSaveAssessmentReport = async () => {
    if (!selectedLoc || !selectedLoc.result) return;
    const realScore = selectedLoc.result.score ?? selectedLoc.score;
    const locationName = selectedLoc.name || `Lat ${Number(selectedLoc.latitude).toFixed(4)}, Lng ${Number(selectedLoc.longitude).toFixed(4)}`;
    try {
      const apiRes = await saveReport({
        latitude: Number(selectedLoc.latitude),
        longitude: Number(selectedLoc.longitude),
        result: {
          ...selectedLoc.result,
          score: realScore,
          site_readiness_score: realScore,
          location_name: locationName,
          use_case: useCase,
          retail_type: retailType,
          restaurant_type: restaurantType,
          office_type: officeType,
          school_type: schoolType,
        }
      });

      if (apiRes && apiRes.id) {
        const reportObj = {
          id: `REP-API-${apiRes.id}`,
          apiId: apiRes.id,
          location_name: locationName,
          latitude: Number(selectedLoc.latitude),
          longitude: Number(selectedLoc.longitude),
          use_case: useCase,
          score: realScore,
          date: new Date().toISOString().split('T')[0],
          status: 'Approved',
          recommendation: selectedLoc.result.explanation?.recommendation || 'Site evaluated successfully.',
          raw: apiRes.result
        };
        const existingLocal = JSON.parse(localStorage.getItem('locavista_saved_reports') || '[]');
        localStorage.setItem('locavista_saved_reports', JSON.stringify([reportObj, ...existingLocal]));
      }

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      // Ignore save error
    }
  };

  const activeResult = selectedLoc?.result;
  const activeFeatures = activeResult?.features ?? {};
  const activeExplanation = activeResult?.explanation ?? {};
  const competitorList = activeFeatures.nearest_competitors ?? [];

  const metrics = useMemo(() => {
    if (!activeFeatures || Object.keys(activeFeatures).length === 0) return [];
    const entries = [
      ['Nearest Main Road', activeFeatures.highway_distance, activeFeatures.nearest_highway_name],
      ['Nearest Hospital', activeFeatures.hospital_distance, activeFeatures.nearest_hospital_name],
      ['Nearest Bank', activeFeatures.bank_distance, activeFeatures.nearest_bank_name],
      ['Nearest Restaurant', activeFeatures.restaurant_distance, activeFeatures.nearest_restaurant_name],
      ['Nearest Pharmacy', activeFeatures.pharmacy_distance, activeFeatures.nearest_pharmacy_name],
      ['Nearest Bus Stop', activeFeatures.bus_stop_distance, activeFeatures.nearest_bus_stop_name],
      ['Nearest Railway', activeFeatures.railway_distance, activeFeatures.nearest_railway_name],
    ];
    const distanceRows = entries.map(([label, distance, name]) => ({
      label: `${label} Distance`,
      value: formatKm(distance),
      name: name ?? null,
    }));
    const population = activeFeatures.population_value;
    const landuse = activeFeatures.landuse;
    const flood = activeFeatures.flood_risk;
    const summaryRows = [
      {
        label: 'Population Density',
        value: population === undefined || population === null ? 'n/a' : `${Math.round(population)} residents/km² (${activeFeatures.population_category ?? 'unknown'})`,
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
  }, [activeFeatures]);

  return (
    <div className="flex flex-col gap-6 font-sans">
      {/* Enterprise Header Banner Card 1 */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3.5 py-1 text-xs font-bold text-blue-700">
            <ShieldCheck size={15} />
            <span>Automated High-Performance Site Finder</span>
          </div>
          <h1 className="text-2xl font-extrabold text-black tracking-tight sm:text-3xl">
            HotSpot Finder in Ahmedabad
          </h1>
          <p className="text-xs font-semibold text-slate-600 max-w-3xl leading-relaxed">
            Discover and rank the top 5 highest-performing commercial locations across Ahmedabad tailored to your business model using ML, population density, and market capture models.
          </p>
        </div>
      </div>

      {/* Business Use Case & Sub-Category Selection Card 2 */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 font-sans">
        <div className="flex flex-wrap items-center gap-2">
          {USE_CASE_CONFIG.map((uc) => {
            const Icon = uc.icon;
            const isActive = useCase === uc.id;
            return (
              <button
                key={uc.id}
                type="button"
                onClick={() => setUseCase(uc.id)}
                className={
                  'flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold border transition-all duration-150 ' +
                  (isActive
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-600/20'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-blue-400 hover:bg-slate-50')
                }
              >
                <Icon size={15} />
                <span>{uc.label}</span>
              </button>
            );
          })}
        </div>

        {/* Sub-Category Dropdown */}
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">Sub-Category Filter:</span>
          {useCase === 'restaurant' && (
            <select
              value={restaurantType}
              onChange={(e) => setRestaurantType(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-900 outline-none focus:border-blue-600 font-sans shadow-2xs cursor-pointer hover:border-blue-400 transition"
            >
              {RESTAURANT_TYPES.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          )}

          {useCase === 'retail' && (
            <select
              value={retailType}
              onChange={(e) => setRetailType(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-900 outline-none focus:border-blue-600 font-sans shadow-2xs cursor-pointer hover:border-blue-400 transition"
            >
              {RETAIL_TYPES.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          )}

          {useCase === 'office' && (
            <select
              value={officeType}
              onChange={(e) => setOfficeType(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-900 outline-none focus:border-blue-600 font-sans shadow-2xs cursor-pointer hover:border-blue-400 transition"
            >
              {OFFICE_TYPES.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          )}

          {useCase === 'school' && (
            <select
              value={schoolType}
              onChange={(e) => setSchoolType(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-900 outline-none focus:border-blue-600 font-sans shadow-2xs cursor-pointer hover:border-blue-400 transition"
            >
              {SCHOOL_TYPES.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {!hasSearched ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-xs font-sans">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <Sparkles size={32} />
          </div>
          <h3 className="mt-4 text-lg font-extrabold text-black">No Location Analysis Executed Yet</h3>
          <p className="mt-1.5 text-xs font-medium text-slate-500 max-w-md mx-auto leading-relaxed">
            Select your business use case and sub-category filter above, then click <strong>"Run City-Wide Analysis"</strong> to evaluate and rank optimal commercial candidate sites in Ahmedabad.
          </p>
          <button
            type="button"
            onClick={() => handleRunAnalysis()}
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3.5 text-xs font-bold text-white shadow-md shadow-blue-600/20 hover:bg-blue-700 transition"
          >
            <Sparkles size={16} />
            <span>Run City-Wide Analysis</span>
          </button>
        </div>
      ) : (
        /* Main Grid: LEFT (Single Outer Card: Map + Nearby Competitors) | RIGHT (Leaderboard, Site Analytics & Metrics) */
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          {/* Left Column: SINGLE PARENT CARD containing Map & Nearby Competitors Box (EXACT MATCH TO MAP EXPLORER) */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm font-sans">
            {/* Leaflet Map Canvas */}
            <div className="h-[300px] sm:h-[360px] lg:h-[400px] w-full overflow-hidden rounded-2xl border border-slate-200 shadow-inner">
              <MapContainer
                center={[23.0365, 72.5611]}
                zoom={12}
                scrollWheelZoom={true}
                className="h-full w-full"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapViewController selectedLoc={selectedLoc} />

                {/* Plotted Trade Area Circles */}
                {selectedLoc && selectedLoc.latitude && selectedLoc.longitude && (
                  <>
                    <Circle center={[selectedLoc.latitude, selectedLoc.longitude]} radius={250} pathOptions={{ color: '#2563eb', fillColor: '#2563eb', fillOpacity: 0.15 }} />
                    <Circle center={[selectedLoc.latitude, selectedLoc.longitude]} radius={500} pathOptions={{ color: '#7c3aed', fillColor: '#7c3aed', fillOpacity: 0.08 }} />
                    <Circle center={[selectedLoc.latitude, selectedLoc.longitude]} radius={1000} pathOptions={{ color: '#db2777', fillColor: '#db2777', fillOpacity: 0.03 }} />
                  </>
                )}

                {/* Rank Pins #1 to #5 */}
                {recommendations.map((loc, idx) => {
                  const rank = loc.rank || idx + 1;
                  return (
                    <Marker
                      key={loc.name}
                      position={[loc.latitude, loc.longitude]}
                      icon={createRankPinIcon(rank)}
                      eventHandlers={{
                        click: () => setSelectedLoc(loc),
                      }}
                    >
                      <Popup>
                        <div className="p-1 font-sans space-y-1 text-xs">
                          <p className="font-extrabold text-sm text-black">{loc.name}</p>
                          <p className="font-bold text-blue-600">Rank #{rank} Candidate</p>
                          <p className="font-black text-black">Readiness Score: {loc.score}</p>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}

                {/* Competitor Pins */}
                {competitorList.map((comp, idx) => (
                  <Marker
                    key={idx}
                    position={[comp.latitude, comp.longitude]}
                    icon={competitorIcon}
                  >
                    <Popup>
                      <div className="font-sans text-xs text-black">
                        <p className="font-bold text-rose-600">{comp.name}</p>
                        <p className="mt-0.5 capitalize text-slate-700">Category: {comp.category}</p>
                        <p className="text-slate-500">Distance: {formatKm(comp.distance_m)} ({comp.distance_m}m)</p>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>

            {/* Map Legend Bar */}
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

            {selectedLoc && activeResult && activeFeatures && (
              <div className="mt-6">
                <SpatialGraphHub features={activeFeatures} score={selectedLoc.score} explanation={activeExplanation} />
              </div>
            )}

            {/* Nearby Competitors Inner Box (INSIDE THE SAME SINGLE OUTER CARD!) */}
            {competitorList.length > 0 && (
              <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm font-sans">
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

                      <span className="shrink-0 rounded-lg border border-rose-100 bg-white px-2.5 py-1 text-[11px] font-semibold text-rose-600">
                        {formatKm(comp.distance_m)} ({comp.distance_m}m)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Location Ranking Matrix, Site Analytics & Quick Metrics */}
          <div className="space-y-6">
            {/* Location Ranking Matrix Card */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm font-sans">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 mb-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-black">Location Ranking Matrix</p>
                  <h3 className="text-base font-extrabold text-black">Top Recommended Zones in Ahmedabad</h3>
                </div>
                <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                  Top 5 Candidates
                </span>
              </div>

              {loading ? (
                <div className="space-y-2 py-4">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <div key={n} className="h-12 w-full animate-pulse rounded-xl bg-slate-100"></div>
                  ))}
                </div>
              ) : error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-700">
                  {error}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-sans">
                    <thead>
                      <tr className="border-b border-slate-200 text-black font-bold uppercase tracking-wider">
                        <th className="pb-3">Rank & Zone Name</th>
                        <th className="pb-3 text-center">Readiness Score</th>
                        <th className="pb-3 text-right">Map Pin & Focus</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-black font-sans">
                      {recommendations.map((item, idx) => {
                        const rank = item.rank || idx + 1;
                        const isSelected = selectedLoc?.name === item.name;
                        return (
                          <tr
                            key={item.name}
                            onClick={() => setSelectedLoc(item)}
                            className={
                              'cursor-pointer transition ' +
                              (isSelected ? 'bg-blue-50/80 font-bold' : 'hover:bg-slate-50')
                            }
                          >
                            <td className="py-3">
                              <div className="flex items-center gap-2.5">
                                <span
                                  className={
                                    'flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-black text-white shrink-0 ' +
                                    (rank === 1
                                      ? 'bg-blue-600'
                                      : rank === 2
                                        ? 'bg-blue-700'
                                        : rank === 3
                                          ? 'bg-indigo-600'
                                          : rank === 4
                                            ? 'bg-sky-600'
                                            : 'bg-slate-600')
                                  }
                                >
                                  #{rank}
                                </span>
                                <div>
                                  <p className="font-extrabold text-black text-sm">{item.name}</p>
                                  <p className="text-[10px] font-bold text-slate-500">{item.rank_label}</p>
                                </div>
                              </div>
                            </td>

                            <td className="py-3 text-center font-black text-black text-base">
                              {item.score}
                            </td>

                            <td className="py-3 text-right">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedLoc(item);
                                }}
                                className={
                                  'inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition ' +
                                  (isSelected
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : 'border border-slate-200 bg-white text-black hover:bg-slate-100')
                                }
                              >
                                <MapPin size={13} /> Pin #{rank}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Active Selected Site Analytics Card */}
            {selectedLoc && activeResult && (
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
                        locationName: selectedLoc.name,
                        score: selectedLoc.result?.score ?? selectedLoc.score,
                        useCase: useCase,
                        latitude: selectedLoc.latitude,
                        longitude: selectedLoc.longitude,
                        explanation: activeExplanation,
                        features: activeFeatures
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
                      <span className="text-4xl font-black text-black">{selectedLoc.score}</span>
                      <span className="text-xs font-bold text-slate-500">/ 100</span>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <span className="rounded-full bg-blue-600 text-white px-3 py-1 text-xs font-bold block">
                      {activeResult.prediction ?? 'Recommended'}
                    </span>
                    {activeResult.confidence && (
                      <span className="text-[11px] font-bold text-slate-500 block">
                        Confidence: {Math.round(activeResult.confidence * 100)}%
                      </span>
                    )}
                  </div>
                </div>

                {/* Executive Recommendation */}
                {activeExplanation.recommendation && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs font-semibold leading-relaxed text-black">
                    {activeExplanation.recommendation}
                  </div>
                )}

                {/* Key Score Drivers */}
                {activeExplanation.drivers && activeExplanation.drivers.length > 0 && (
                  <div className="space-y-2 border-t border-slate-100 pt-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-black">Key Score Drivers</p>
                    <div className="grid gap-2">
                      {activeExplanation.drivers.map((d, dIdx) => (
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

            {/* Quick Metrics (EXACT MATCH TO MAP EXPLORER) */}
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
      )}
    </div>
  );
}
