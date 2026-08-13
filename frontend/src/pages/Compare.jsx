import { useEffect, useState } from 'react';
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { predictLocation, USE_CASES, RETAIL_TYPES, RESTAURANT_TYPES, OFFICE_TYPES, SCHOOL_TYPES } from '../services/api';
import { AHMEDABAD_LOCATIONS } from '../constants/locations';
import { formatKm } from '../utils/format';
import { printComparePDF } from '../utils/printPdf';
import {
  Trophy, Search, MapPin, Sparkles, ArrowLeftRight,
  FileText, Download, Store, BarChart3, MousePointerClick
} from 'lucide-react';

const locationAIcon = L.divIcon({
  className: 'custom-location-a-pin',
  html: `<div style="background-color: #2563eb; width: 30px; height: 30px; border-radius: 50%; border: 3px solid #ffffff; box-shadow: 0 4px 10px rgba(37,99,235,0.35); display:flex; align-items:center; justify-content:center; color:white; font-weight:800; font-size:13px; font-family:sans-serif;">A</div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const locationBIcon = L.divIcon({
  className: 'custom-location-b-pin',
  html: `<div style="background-color: #2563eb; width: 30px; height: 30px; border-radius: 50%; border: 3px solid #ffffff; box-shadow: 0 4px 10px rgba(37,99,235,0.35); display:flex; align-items:center; justify-content:center; color:white; font-weight:800; font-size:13px; font-family:sans-serif;">B</div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const competitorIconA = L.divIcon({
  className: 'custom-competitor-pin-a',
  html: `<div style="background-color: #ef4444; width: 14px; height: 14px; border-radius: 50%; border: 2.5px solid #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.35);"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const competitorIconB = L.divIcon({
  className: 'custom-competitor-pin-b',
  html: `<div style="background-color: #ef4444; width: 14px; height: 14px; border-radius: 50%; border: 2.5px solid #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.35);"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const PILL_LABELS = {
  restaurant: 'Restaurant',
  retail: 'Retail Store',
  office: 'Office',
  school: 'School',
};

const PRESETS = [
  { name: 'Ashram Rd vs Nikol', locA: AHMEDABAD_LOCATIONS['ashram_road'], locB: AHMEDABAD_LOCATIONS['nikol'] },
  { name: 'Navrangpura vs Satellite', locA: AHMEDABAD_LOCATIONS['navrangpura'], locB: AHMEDABAD_LOCATIONS['satellite'] },
  { name: 'Bodakdev vs Vastrapur', locA: AHMEDABAD_LOCATIONS['bodakdev'], locB: AHMEDABAD_LOCATIONS['vastrapur'] },
  { name: 'SG Highway vs Maninagar', locA: AHMEDABAD_LOCATIONS['sg_highway'], locB: AHMEDABAD_LOCATIONS['maninagar'] },
];

function CompareMapViewController({ posA, posB }) {
  const map = useMap();
  useEffect(() => {
    if (posA && posB && map && !isNaN(posA.latitude) && !isNaN(posB.latitude)) {
      try {
        const bounds = L.latLngBounds(
          [posA.latitude, posA.longitude],
          [posB.latitude, posB.longitude]
        );
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
      } catch (err) {
        // Ignore frame errors
      }
    } else if (posA && map && !isNaN(posA.latitude)) {
      map.setView([posA.latitude, posA.longitude], 13);
    } else if (posB && map && !isNaN(posB.latitude)) {
      map.setView([posB.latitude, posB.longitude], 13);
    }
  }, [posA, posB, map]);
  return null;
}

function CompareMapClickHandler({ activeTarget, onSetLocation }) {
  useMapEvents({
    click: (e) => {
      const lat = Number(e.latlng.lat.toFixed(4));
      const lng = Number(e.latlng.lng.toFixed(4));
      onSetLocation(activeTarget, lat, lng);
    },
  });
  return null;
}

export default function Compare() {
  const [form, setForm] = useState({ locationA: '', locationB: '' });
  const [searchA, setSearchA] = useState('');
  const [searchB, setSearchB] = useState('');
  const [showDropdownA, setShowDropdownA] = useState(false);
  const [showDropdownB, setShowDropdownB] = useState(false);

  const [posA, setPosA] = useState(null);
  const [posB, setPosB] = useState(null);
  const [activeMapTarget, setActiveMapTarget] = useState('A');

  const [useCase, setUseCase] = useState('restaurant');
  const [retailType, setRetailType] = useState('grocery');
  const [restaurantType, setRestaurantType] = useState('fast_food');
  const [officeType, setOfficeType] = useState('auto');
  const [schoolType, setSchoolType] = useState('primary_preschool');

  const [resultA, setResultA] = useState(null);
  const [resultB, setResultB] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('accessibility');

  const getFilteredLocations = (query) => {
    if (!query || !query.trim()) return [];
    const term = query.trim().toLowerCase();
    return Object.values(AHMEDABAD_LOCATIONS)
      .filter((loc) => loc.name.toLowerCase().includes(term))
      .sort((a, b) => {
        const aStarts = a.name.toLowerCase().startsWith(term);
        const bStarts = b.name.toLowerCase().startsWith(term);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return a.name.localeCompare(b.name);
      });
  };

  const filteredA = getFilteredLocations(searchA);
  const filteredB = getFilteredLocations(searchB);

  const handleSetLocation = (target, lat, lng) => {
    if (target === 'A') {
      setPosA({ latitude: lat, longitude: lng });
      setSearchA(`Custom Pin (${lat}, ${lng})`);
      setForm((prev) => ({ ...prev, locationA: `${lat}, ${lng}` }));
    } else {
      setPosB({ latitude: lat, longitude: lng });
      setSearchB(`Custom Pin (${lat}, ${lng})`);
      setForm((prev) => ({ ...prev, locationB: `${lat}, ${lng}` }));
    }
  };

  const handleSelectLocationA = (loc) => {
    setSearchA(loc.name);
    setPosA({ latitude: loc.latitude, longitude: loc.longitude });
    setForm((prev) => ({ ...prev, locationA: `${loc.latitude}, ${loc.longitude}` }));
    setShowDropdownA(false);
  };

  const handleSelectLocationB = (loc) => {
    setSearchB(loc.name);
    setPosB({ latitude: loc.latitude, longitude: loc.longitude });
    setForm((prev) => ({ ...prev, locationB: `${loc.latitude}, ${loc.longitude}` }));
    setShowDropdownB(false);
  };

  const handleApplyPreset = (preset) => {
    handleSelectLocationA(preset.locA);
    handleSelectLocationB(preset.locB);
  };

  const handleSwapLocations = () => {
    if (!posA && !posB) return;
    const tempPosA = posA;
    const tempPosB = posB;
    const tempSearchA = searchA;
    const tempSearchB = searchB;
    const tempFormA = form.locationA;
    const tempFormB = form.locationB;
    const tempResA = resultA;
    const tempResB = resultB;

    setPosA(tempPosB);
    setPosB(tempPosA);
    setSearchA(tempSearchB);
    setSearchB(tempSearchA);
    setForm({ locationA: tempFormB, locationB: tempFormA });
    setResultA(tempResB);
    setResultB(tempResA);
  };

  const executeComparison = async () => {
    if (!form.locationA || !form.locationB) return;
    setLoading(true);
    setError('');
    try {
      const [latA, lngA] = form.locationA.split(',').map((item) => Number(item.trim()));
      const [latB, lngB] = form.locationB.split(',').map((item) => Number(item.trim()));

      if (isNaN(latA) || isNaN(lngA) || isNaN(latB) || isNaN(lngB)) {
        throw new Error('Please enter valid coordinates in format: lat, lng');
      }

      const [resA, resB] = await Promise.all([
        predictLocation(latA, lngA, useCase, retailType, restaurantType, officeType, schoolType),
        predictLocation(latB, lngB, useCase, retailType, restaurantType, officeType, schoolType),
      ]);

      setResultA(resA);
      setResultB(resB);
    } catch (err) {
      setError(err.message || 'Unable to compute location comparison');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (posA?.latitude && posA?.longitude && posB?.latitude && posB?.longitude) {
      executeComparison();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posA, posB, useCase, retailType, restaurantType, officeType, schoolType]);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    const [latA, lngA] = form.locationA.split(',').map((item) => Number(item.trim()));
    const [latB, lngB] = form.locationB.split(',').map((item) => Number(item.trim()));
    if (!isNaN(latA) && !isNaN(lngA)) setPosA({ latitude: latA, longitude: lngA });
    if (!isNaN(latB) && !isNaN(lngB)) setPosB({ latitude: latB, longitude: lngB });
    executeComparison();
  };

  // Winner evaluation logic
  const scoreA = resultA?.score;
  const scoreB = resultB?.score;
  let betterLocation = 'neither_valid';
  if (resultA?.is_water && resultB?.is_water) {
    betterLocation = 'neither_valid';
  } else if (resultA?.is_water) {
    betterLocation = 'location_b';
  } else if (resultB?.is_water) {
    betterLocation = 'location_a';
  } else if (scoreA != null && scoreB != null) {
    betterLocation = scoreA >= scoreB ? 'location_a' : 'location_b';
  }

  const winnerLabel = betterLocation === 'location_a' ? (searchA || 'Location A') : betterLocation === 'location_b' ? (searchB || 'Location B') : 'Neither';
  const competitorsA = resultA?.features?.nearest_competitors ?? [];
  const competitorsB = resultB?.features?.nearest_competitors ?? [];

  const featA = resultA?.features ?? {};
  const featB = resultB?.features ?? {};

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header Panel */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-600">
            <BarChart3 size={20} />
            <h2 className="text-xl font-bold text-slate-900">Side-by-Side Location Comparison in Ahmedabad</h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Compare candidate locations across ML readiness scores, transport accessibility, demographics, and competitor clusters.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleSwapLocations}
            disabled={!posA && !posB}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
            title="Swap Location A and Location B"
          >
            <ArrowLeftRight size={14} className="text-blue-600" /> Swap A ⇄ B
          </button>
          <button
            type="button"
            onClick={() =>
              printComparePDF({
                nameA: searchA || 'Location A',
                nameB: searchB || 'Location B',
                posA,
                posB,
                resultA,
                resultB,
                useCase,
              })
            }
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 shadow-2xs"
          >
            <Download size={14} className="text-blue-600" /> Export PDF
          </button>
        </div>
      </div>

      {/* Main Grid: Left Controls & Map | Right Results & Analytics */}
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        {/* Left Column: Form Controls & Map */}
        <div className="flex flex-col gap-6">
          {/* Controls Card (UPWARDS) */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm font-sans">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Configure Evaluation</p>
                <h3 className="text-lg font-bold text-slate-900">Select Candidate Sites</h3>
              </div>
              <div className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">Predictive ML Engine</div>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              {/* Business Model Selector */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Business Model</p>
                  <p className="text-xs text-slate-400">Scoring ML Model</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {USE_CASES.map((uc) => (
                    <button
                      type="button"
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

              {/* Segment Filters */}
              {useCase === 'retail' && (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">Retail Segment Filter</label>
                  <select
                    value={retailType}
                    onChange={(e) => setRetailType(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 shadow-xs"
                  >
                    {RETAIL_TYPES.map((rt) => (
                      <option key={rt.id} value={rt.id}>{rt.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {useCase === 'restaurant' && (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">Food Segment Filter</label>
                  <select
                    value={restaurantType}
                    onChange={(e) => setRestaurantType(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 shadow-xs"
                  >
                    {RESTAURANT_TYPES.map((rt) => (
                      <option key={rt.id} value={rt.id}>{rt.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {useCase === 'office' && (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">Commercial Office Filter</label>
                  <select
                    value={officeType}
                    onChange={(e) => setOfficeType(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 shadow-xs"
                  >
                    {OFFICE_TYPES.map((ot) => (
                      <option key={ot.id} value={ot.id}>{ot.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {useCase === 'school' && (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">Educational Segment Filter</label>
                  <select
                    value={schoolType}
                    onChange={(e) => setSchoolType(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 shadow-xs"
                  >
                    {SCHOOL_TYPES.map((st) => (
                      <option key={st.id} value={st.id}>{st.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Location A Search Box */}
              <div className="relative">
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-blue-600 flex items-center justify-between">
                  <span>Location A (Site A)</span>
                  {posA && <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full font-sans uppercase tracking-wider">Active</span>}
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 focus-within:bg-white focus-within:border-blue-500">
                  <Search size={16} className="text-slate-400 shrink-0" />
                  <input
                    value={searchA}
                    onChange={(e) => {
                      setSearchA(e.target.value);
                      setShowDropdownA(true);
                    }}
                    onFocus={() => setShowDropdownA(true)}
                    onBlur={() => setTimeout(() => setShowDropdownA(false), 200)}
                    placeholder="Search Area A (e.g. Ashram Road)"
                    className="w-full bg-transparent text-sm text-slate-900 outline-none font-sans"
                  />
                </div>

                {showDropdownA && filteredA.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                    {filteredA.map((loc) => (
                      <button
                        key={loc.name}
                        type="button"
                        onMouseDown={() => handleSelectLocationA(loc)}
                        className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition hover:bg-blue-50"
                      >
                        <div className="flex items-center gap-2">
                          <MapPin size={14} className="text-blue-600 shrink-0" />
                          <span className="font-bold text-slate-800">{loc.name}</span>
                        </div>
                        <span className="text-[11px] font-sans font-normal text-slate-600">
                          {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                <div className="mt-1.5 flex items-center justify-between text-xs font-sans">
                  <span className="font-bold text-black uppercase tracking-wider text-[11px]">Site A Lat, Lng:</span>
                  <input
                    className="w-44 text-right bg-transparent text-slate-700 font-sans outline-none font-normal text-xs"
                    placeholder="e.g. 23.0225, 72.5714"
                    value={form.locationA}
                    onChange={(e) => setForm((prev) => ({ ...prev, locationA: e.target.value }))}
                  />
                </div>
              </div>

              {/* Location B Search Box */}
              <div className="relative">
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-blue-600 flex items-center justify-between">
                  <span>Location B (Site B)</span>
                  {posB && <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full font-sans uppercase tracking-wider">Active</span>}
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 focus-within:bg-white focus-within:border-blue-500">
                  <Search size={16} className="text-slate-400 shrink-0" />
                  <input
                    value={searchB}
                    onChange={(e) => {
                      setSearchB(e.target.value);
                      setShowDropdownB(true);
                    }}
                    onFocus={() => setShowDropdownB(true)}
                    onBlur={() => setTimeout(() => setShowDropdownB(false), 200)}
                    placeholder="Search Area B (e.g. Nikol, Satellite)"
                    className="w-full bg-transparent text-sm text-slate-900 outline-none font-sans"
                  />
                </div>

                {showDropdownB && filteredB.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                    {filteredB.map((loc) => (
                      <button
                        key={loc.name}
                        type="button"
                        onMouseDown={() => handleSelectLocationB(loc)}
                        className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition hover:bg-blue-50"
                      >
                        <div className="flex items-center gap-2">
                          <MapPin size={14} className="text-blue-600 shrink-0" />
                          <span className="font-bold text-slate-800">{loc.name}</span>
                        </div>
                        <span className="text-[11px] font-sans font-normal text-slate-600">
                          {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                <div className="mt-1.5 flex items-center justify-between text-xs font-sans">
                  <span className="font-bold text-black uppercase tracking-wider text-[11px]">Site B Lat, Lng:</span>
                  <input
                    className="w-44 text-right bg-transparent text-slate-700 font-sans outline-none font-normal text-xs"
                    placeholder="e.g. 23.0458, 72.6728"
                    value={form.locationB}
                    onChange={(e) => setForm((prev) => ({ ...prev, locationB: e.target.value }))}
                  />
                </div>
              </div>

              <button className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 shadow-md shadow-blue-600/20" type="submit">
                {loading ? 'Evaluating Scores...' : 'Run Location Comparison'}
              </button>
            </form>

            {error && <p className="mt-3 text-xs font-medium text-rose-600">{error}</p>}
          </div>

          {/* Interactive Map Explorer Card (BELOW FORM) */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-3 font-sans">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 flex items-center gap-1.5">
                  <MousePointerClick size={15} /> Interactive Map Explorer
                </p>
                <h3 className="text-sm font-bold text-slate-900">Ahmedabad Candidate Map</h3>
              </div>

              <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveMapTarget('A')}
                  className={
                    'rounded-lg px-2.5 py-1 font-bold transition flex items-center gap-1 ' +
                    (activeMapTarget === 'A'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-blue-600')
                  }
                >
                  <span className="inline-block h-2 w-2 rounded-full bg-white"></span> Set Pin A
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMapTarget('B')}
                  className={
                    'rounded-lg px-2.5 py-1 font-bold transition flex items-center gap-1 ' +
                    (activeMapTarget === 'B'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-blue-600')
                  }
                >
                  <span className="inline-block h-2 w-2 rounded-full bg-white"></span> Set Pin B
                </button>
              </div>
            </div>

            <div className="h-[300px] sm:h-[360px] lg:h-[400px] w-full overflow-hidden rounded-2xl border border-slate-200 shadow-inner relative">
              <MapContainer center={posA ? [posA.latitude, posA.longitude] : posB ? [posB.latitude, posB.longitude] : [23.0225, 72.5714]} zoom={12} scrollWheelZoom>
                <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <CompareMapViewController posA={posA} posB={posB} />
                <CompareMapClickHandler activeTarget={activeMapTarget} onSetLocation={handleSetLocation} />

                {/* Location A Pin & Concentric Trade Circles */}
                {posA && posA.latitude && posA.longitude && (
                  <>
                    <Circle center={[posA.latitude, posA.longitude]} radius={250} pathOptions={{ color: '#2563eb', fillColor: '#2563eb', fillOpacity: 0.15 }} />
                    <Circle center={[posA.latitude, posA.longitude]} radius={500} pathOptions={{ color: '#7c3aed', fillColor: '#7c3aed', fillOpacity: 0.08 }} />
                    <Circle center={[posA.latitude, posA.longitude]} radius={1000} pathOptions={{ color: '#db2777', fillColor: '#db2777', fillOpacity: 0.03 }} />
                    <Marker
                      position={[posA.latitude, posA.longitude]}
                      icon={locationAIcon}
                      draggable={true}
                      eventHandlers={{
                        dragend: (e) => {
                          const position = e.target.getLatLng();
                          handleSetLocation('A', Number(position.lat.toFixed(4)), Number(position.lng.toFixed(4)));
                        },
                      }}
                    >
                      <Popup>
                        <div className="text-xs font-sans">
                          <p className="font-bold text-blue-600">Location A ({searchA || 'Site A'})</p>
                          <p className="mt-1 font-semibold text-slate-800">Score: {resultA?.score ?? 'N/A'}</p>
                          <p className="text-slate-500">Lat: {posA.latitude.toFixed(4)}, Lng: {posA.longitude.toFixed(4)}</p>
                        </div>
                      </Popup>
                    </Marker>
                  </>
                )}

                {/* Location B Pin & Concentric Trade Circles */}
                {posB && posB.latitude && posB.longitude && (
                  <>
                    <Circle center={[posB.latitude, posB.longitude]} radius={250} pathOptions={{ color: '#2563eb', fillColor: '#2563eb', fillOpacity: 0.15 }} />
                    <Circle center={[posB.latitude, posB.longitude]} radius={500} pathOptions={{ color: '#7c3aed', fillColor: '#7c3aed', fillOpacity: 0.08 }} />
                    <Circle center={[posB.latitude, posB.longitude]} radius={1000} pathOptions={{ color: '#db2777', fillColor: '#db2777', fillOpacity: 0.03 }} />
                    <Marker
                      position={[posB.latitude, posB.longitude]}
                      icon={locationBIcon}
                      draggable={true}
                      eventHandlers={{
                        dragend: (e) => {
                          const position = e.target.getLatLng();
                          handleSetLocation('B', Number(position.lat.toFixed(4)), Number(position.lng.toFixed(4)));
                        },
                      }}
                    >
                      <Popup>
                        <div className="text-xs font-sans">
                          <p className="font-bold text-blue-600">Location B ({searchB || 'Site B'})</p>
                          <p className="mt-1 font-semibold text-slate-800">Score: {resultB?.score ?? 'N/A'}</p>
                          <p className="text-slate-500">Lat: {posB.latitude.toFixed(4)}, Lng: {posB.longitude.toFixed(4)}</p>
                        </div>
                      </Popup>
                    </Marker>
                  </>
                )}

                {/* Competitor Markers Site A */}
                {competitorsA.map((comp, idx) => (
                  <Marker key={`a-${idx}`} position={[comp.latitude, comp.longitude]} icon={competitorIconA}>
                    <Popup>
                      <div className="font-sans text-xs text-slate-900">
                        <p className="font-bold text-rose-600">{comp.name}</p>
                        <p className="mt-1 font-medium text-slate-700">Site A Competitor</p>
                        <p className="text-slate-500">Distance: {formatKm(comp.distance_m)} ({comp.distance_m}m)</p>
                      </div>
                    </Popup>
                  </Marker>
                ))}

                {/* Competitor Markers Site B */}
                {competitorsB.map((comp, idx) => (
                  <Marker key={`b-${idx}`} position={[comp.latitude, comp.longitude]} icon={competitorIconB}>
                    <Popup>
                      <div className="font-sans text-xs text-slate-900">
                        <p className="font-bold text-rose-600">{comp.name}</p>
                        <p className="mt-1 font-medium text-slate-700">Site B Competitor</p>
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
                <span className="flex items-center gap-1.5 font-medium text-slate-700">
                  <span className="inline-block h-3 w-3 rounded-full bg-blue-600 border border-white shadow-2xs"></span>
                  Site A Target
                </span>
                <span className="flex items-center gap-1.5 font-medium text-slate-700">
                  <span className="inline-block h-3 w-3 rounded-full bg-blue-600 border border-white shadow-2xs"></span>
                  Site B Target
                </span>
                <span className="flex items-center gap-1.5 font-medium text-rose-600">
                  <span className="inline-block h-3 w-3 rounded-full bg-rose-500 border border-white shadow-2xs"></span>
                  Competitors ({competitorsA.length + competitorsB.length} plotted)
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">
                250m / 500m / 1000m trade circles
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Detailed Analytics Panel */}
        <div className="flex flex-col gap-6">
          {loading ? (
            <div className="animate-pulse rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 text-blue-600">
                <Sparkles className="animate-spin" size={20} />
                <p className="text-xs font-semibold uppercase tracking-wider">Evaluating Candidate Locations...</p>
              </div>
              <p className="mt-2 text-xs text-slate-500">Extracting GIS spatial features and running predictive ML model scoring...</p>
              <div className="mt-4 h-16 w-full rounded-2xl bg-slate-100"></div>
              <div className="mt-3 h-24 w-full rounded-2xl bg-slate-100"></div>
            </div>
          ) : !resultA || !resultB ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50/50 p-12 text-center shadow-xs">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mb-3">
                <Trophy size={24} />
              </div>
              <h3 className="text-base font-bold text-slate-900">Select Locations A & B to Compare</h3>
              <p className="mt-1 max-w-sm text-xs text-slate-500 leading-relaxed">
                Choose candidate areas above or click directly on the interactive map to calculate live AI site readiness scores and compare spatial features.
              </p>
            </div>
          ) : (
            <>
              {/* Dynamic Winner Score Cards */}
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Site A Hero Score Card */}
                <div
                  className={
                    'rounded-3xl p-6 transition relative overflow-hidden ' +
                    (betterLocation === 'location_a'
                      ? 'border border-blue-500/20 bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-xl shadow-blue-600/20'
                      : 'border border-slate-200 bg-white text-slate-900 shadow-sm')
                  }
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin size={18} className={betterLocation === 'location_a' ? 'text-blue-100' : 'text-blue-600'} />
                      <p className={'text-xs font-bold uppercase tracking-wider ' + (betterLocation === 'location_a' ? 'text-blue-100' : 'text-slate-600')}>
                        Location A Score
                      </p>
                    </div>
                    {betterLocation === 'location_a' && (
                      <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white backdrop-blur-md">
                        Winner
                      </span>
                    )}
                  </div>
                  <p className={'mt-3 text-4xl font-extrabold ' + (betterLocation === 'location_a' ? 'text-white' : 'text-slate-900')}>
                    {scoreA ?? 'N/A'}
                  </p>
                  <p className={'mt-1 text-xs font-medium ' + (betterLocation === 'location_a' ? 'text-blue-100' : 'text-slate-500')}>
                    {searchA || 'Site A'}
                  </p>
                </div>

                {/* Site B Hero Score Card */}
                <div
                  className={
                    'rounded-3xl p-6 transition relative overflow-hidden ' +
                    (betterLocation === 'location_b'
                      ? 'border border-blue-500/20 bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-xl shadow-blue-600/20'
                      : 'border border-slate-200 bg-white text-slate-900 shadow-sm')
                  }
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin size={18} className={betterLocation === 'location_b' ? 'text-blue-100' : 'text-blue-600'} />
                      <p className={'text-xs font-bold uppercase tracking-wider ' + (betterLocation === 'location_b' ? 'text-blue-100' : 'text-slate-600')}>
                        Location B Score
                      </p>
                    </div>
                    {betterLocation === 'location_b' && (
                      <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white backdrop-blur-md">
                        Winner
                      </span>
                    )}
                  </div>
                  <p className={'mt-3 text-4xl font-extrabold ' + (betterLocation === 'location_b' ? 'text-white' : 'text-slate-900')}>
                    {scoreB ?? 'N/A'}
                  </p>
                  <p className={'mt-1 text-xs font-medium ' + (betterLocation === 'location_b' ? 'text-blue-100' : 'text-slate-500')}>
                    {searchB || 'Site B'}
                  </p>
                </div>
              </div>

              {/* Detailed View Navigation Tabs */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
                <div className="flex border-b border-slate-200 text-sm overflow-x-auto font-sans">
                  <button
                    onClick={() => setActiveTab('accessibility')}
                    className={
                      'pb-3.5 px-5 font-bold border-b-2 transition whitespace-nowrap text-sm ' +
                      (activeTab === 'accessibility'
                        ? 'border-blue-600 text-black'
                        : 'border-transparent text-slate-600 hover:text-black')
                    }
                  >
                    Transport & Access
                  </button>
                  <button
                    onClick={() => setActiveTab('competitors')}
                    className={
                      'pb-3.5 px-5 font-bold border-b-2 transition whitespace-nowrap text-sm ' +
                      (activeTab === 'competitors'
                        ? 'border-blue-600 text-black'
                        : 'border-transparent text-slate-600 hover:text-black')
                    }
                  >
                    Competitor Clusters
                  </button>
                  <button
                    onClick={() => setActiveTab('raw')}
                    className={
                      'pb-3.5 px-5 font-bold border-b-2 transition whitespace-nowrap text-sm ' +
                      (activeTab === 'raw'
                        ? 'border-blue-600 text-black'
                        : 'border-transparent text-slate-600 hover:text-black')
                    }
                  >
                    Full Feature Breakdown
                  </button>
                </div>

                {/* TAB 1: TRANSPORT & ACCESSIBILITY */}
                {activeTab === 'accessibility' && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5 font-sans">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-black">Infrastructure & Transport</p>
                        <h4 className="text-base font-extrabold text-black mt-0.5">Transport & Accessibility Breakdown</h4>
                      </div>
                      <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                        Distance Metrics
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm font-sans">
                        <thead>
                          <tr className="border-b border-slate-200 text-black font-bold uppercase tracking-wider text-xs">
                            <th className="pb-3">Infrastructure Metric</th>
                            <th className="pb-3">Location A </th>
                            <th className="pb-3">Location B </th>
                            <th className="pb-3 text-right">Advantage</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-black font-sans">
                          {[
                            ['Nearest Road Distance', featA.road_distance, featB.road_distance, true],
                            ['Nearest Highway Corridor', featA.highway_distance, featB.highway_distance, true],
                            ['Nearest Bus Stop / Transit', featA.bus_stop_distance, featB.bus_stop_distance, true],
                            ['Nearest Railway Line', featA.railway_distance, featB.railway_distance, true],
                            ['Bank & ATM Access', featA.bank_distance, featB.bank_distance, true],
                            ['Hospital / Emergency Access', featA.hospital_distance, featB.hospital_distance, true],
                          ].map(([label, valA, valB, lowerIsBetter]) => {
                            const vA = Number(valA);
                            const vB = Number(valB);
                            const isValid = !isNaN(vA) && !isNaN(vB);
                            let winner = '-';
                            if (isValid) {
                              if (vA === vB) winner = 'Tie';
                              else if (lowerIsBetter ? vA < vB : vA > vB) winner = 'Site A';
                              else winner = 'Site B';
                            }

                            return (
                              <tr key={label} className="hover:bg-slate-50 transition">
                                <td className="py-3.5 font-semibold text-black text-sm">{label}</td>
                                <td className="py-3.5 font-bold text-black text-sm">{formatKm(valA)}</td>
                                <td className="py-3.5 font-bold text-black text-sm">{formatKm(valB)}</td>
                                <td className="py-3.5 text-right">
                                  {winner === 'Site A' ? (
                                    <span className="inline-block rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                                      Site A Win
                                    </span>
                                  ) : winner === 'Site B' ? (
                                    <span className="inline-block rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                                      Site B Win
                                    </span>
                                  ) : (
                                    <span className="text-black font-semibold text-xs">-</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* TAB 2: COMPETITOR CLUSTERS */}
                {activeTab === 'competitors' && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5 font-sans">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-black">Competitor Analysis</p>
                        <h4 className="text-base font-extrabold text-black mt-0.5">Competitor Density & Distance Matrix</h4>
                      </div>
                      <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                        Trade Buffer Map
                      </span>
                    </div>

                    {/* Competitor Lists Side-by-Side Tables */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      {/* Site A Competitors Table */}
                      <div className="rounded-xl border border-slate-200 bg-white p-4.5 space-y-3">
                        <div className="border-b border-slate-100 pb-2">
                          <p className="font-extrabold text-black uppercase tracking-wider text-xs">
                            Location A
                          </p>
                        </div>

                        {competitorsA.length === 0 ? (
                          <p className="text-black text-xs italic font-medium py-3">No immediate competitors within 1000m.</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm font-sans">
                              <thead>
                                <tr className="border-b border-slate-200 text-black font-bold uppercase tracking-wider text-xs">
                                  <th className="pb-2.5">Competitor Name</th>
                                  <th className="pb-2.5 text-right">Distance</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-black font-sans">
                                {competitorsA.map((c, i) => (
                                  <tr key={i} className="hover:bg-slate-50 transition">
                                    <td className="py-3 font-semibold text-black text-sm">{c.name}</td>
                                    <td className="py-3 font-bold text-black text-sm text-right">{c.distance_m}m</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                      {/* Site B Competitors Table */}
                      <div className="rounded-xl border border-slate-200 bg-white p-4.5 space-y-3">
                        <div className="border-b border-slate-100 pb-2">
                          <p className="font-extrabold text-black uppercase tracking-wider text-xs">
                            Location B
                          </p>
                        </div>

                        {competitorsB.length === 0 ? (
                          <p className="text-black text-xs italic font-medium py-3">No immediate competitors within 1000m.</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm font-sans">
                              <thead>
                                <tr className="border-b border-slate-200 text-black font-bold uppercase tracking-wider text-xs">
                                  <th className="pb-2.5">Competitor Name</th>
                                  <th className="pb-2.5 text-right">Distance</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-black font-sans">
                                {competitorsB.map((c, i) => (
                                  <tr key={i} className="hover:bg-slate-50 transition">
                                    <td className="py-3 font-semibold text-black text-sm">{c.name}</td>
                                    <td className="py-3 font-bold text-black text-sm text-right">{c.distance_m}m</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: FULL FEATURE BREAKDOWN */}
                {activeTab === 'raw' && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5 font-sans">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-black">Full GIS Matrix</p>
                        <h4 className="text-base font-extrabold text-black mt-0.5">Full Feature Matrix & Spatial Data</h4>
                      </div>
                      <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                        Spatial Features
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm font-sans">
                        <thead>
                          <tr className="border-b border-slate-200 text-black font-bold uppercase tracking-wider text-xs">
                            <th className="pb-3">Spatial GIS Metric</th>
                            <th className="pb-3">Location A </th>
                            <th className="pb-3">Location B </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-black font-sans">
                          <tr className="hover:bg-slate-50 transition">
                            <td className="py-3.5 font-semibold text-black text-sm">Predictive Readiness Score</td>
                            <td className="py-3.5 font-bold text-black text-sm">{scoreA ?? 'N/A'}</td>
                            <td className="py-3.5 font-bold text-black text-sm">{scoreB ?? 'N/A'}</td>
                          </tr>
                          <tr className="hover:bg-slate-50 transition">
                            <td className="py-3.5 font-semibold text-black text-sm">Population Value</td>
                            <td className="py-3.5 font-bold text-black text-sm">{featA.population_value ?? 'N/A'}</td>
                            <td className="py-3.5 font-bold text-black text-sm">{featB.population_value ?? 'N/A'}</td>
                          </tr>
                          <tr className="hover:bg-slate-50 transition">
                            <td className="py-3.5 font-semibold text-black text-sm">Flood Risk Index</td>
                            <td className="py-3.5 font-bold text-black text-sm">{featA.flood_risk ?? 'N/A'}</td>
                            <td className="py-3.5 font-bold text-black text-sm">{featB.flood_risk ?? 'N/A'}</td>
                          </tr>
                          <tr className="hover:bg-slate-50 transition">
                            <td className="py-3.5 font-semibold text-black text-sm">Land Use Category</td>
                            <td className="py-3.5 font-bold capitalize text-black text-sm">{featA.landuse || 'General'}</td>
                            <td className="py-3.5 font-bold capitalize text-black text-sm">{featB.landuse || 'General'}</td>
                          </tr>
                          <tr className="hover:bg-slate-50 transition">
                            <td className="py-3.5 font-semibold text-black text-sm">Competition Pressure Index</td>
                            <td className="py-3.5 font-bold text-black text-sm">{featA.competition_pressure ?? 0}</td>
                            <td className="py-3.5 font-bold text-black text-sm">{featB.competition_pressure ?? 0}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
