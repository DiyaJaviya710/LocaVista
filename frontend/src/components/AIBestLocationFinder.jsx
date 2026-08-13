import { useState, useEffect } from 'react';
import { Sparkles, Trophy, MapPin, TrendingUp, ChevronRight, Star, Utensils, Store, Building, GraduationCap } from 'lucide-react';
import { getRecommendedLocations, RESTAURANT_TYPES, RETAIL_TYPES, OFFICE_TYPES, SCHOOL_TYPES } from '../services/api';

const USE_CASE_CONFIG = [
  { id: 'restaurant', label: 'Restaurant & Cafe', icon: Utensils, desc: 'Find top dining, fast food & cafe hotspots' },
  { id: 'retail', label: 'Retail Store', icon: Store, desc: 'Find prime commercial footfall corridors' },
  { id: 'office', label: 'Office Space', icon: Building, desc: 'Find corporate & tech park locations' },
  { id: 'school', label: 'School & Institute', icon: GraduationCap, desc: 'Find residential catchment zones' },
];

export default function AIBestLocationFinder({ onSelectRecommendation }) {
  const [useCase, setUseCase] = useState('restaurant');
  const [retailType, setRetailType] = useState('auto');
  const [restaurantType, setRestaurantType] = useState('auto');
  const [officeType, setOfficeType] = useState('auto');
  const [schoolType, setSchoolType] = useState('primary_preschool');

  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  const fetchRecommendations = async (uc = useCase) => {
    setLoading(true);
    setError('');
    try {
      const res = await getRecommendedLocations(uc, retailType, restaurantType, officeType, schoolType, 5);
      if (res && res.recommendations) {
        setRecommendations(res.recommendations);
        setSearched(true);
      }
    } catch (err) {
      setError('Could not fetch location recommendations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations(useCase);
  }, [useCase, retailType, restaurantType, officeType, schoolType]);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm font-sans space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2 text-blue-600 mb-1">
            <Sparkles size={20} className="animate-pulse text-amber-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-black">AI Location Advisor</span>
          </div>
          <h3 className="text-xl font-extrabold text-black tracking-tight">AI Best Location Finder in Ahmedabad</h3>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            AI scans candidate areas across Ahmedabad and recommends the top suitable locations for your business.
          </p>
        </div>
        <button
          type="button"
          onClick={() => fetchRecommendations(useCase)}
          disabled={loading}
          className="inline-flex items-center gap-2 shrink-0 rounded-2xl bg-blue-600 px-5 py-3 text-xs font-bold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700 disabled:opacity-50"
        >
          <Sparkles size={16} />
          {loading ? 'AI Scanning...' : 'Refresh AI Top 5'}
        </button>
      </div>

      {/* Use Case Tabs */}
      <div className="grid gap-3 sm:grid-cols-4">
        {USE_CASE_CONFIG.map((uc) => {
          const Icon = uc.icon;
          const isActive = useCase === uc.id;
          return (
            <button
              key={uc.id}
              type="button"
              onClick={() => setUseCase(uc.id)}
              className={
                'flex flex-col text-left p-4 rounded-2xl border transition-all duration-150 ' +
                (isActive
                  ? 'border-blue-600 bg-blue-50/70 shadow-sm text-black'
                  : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700')
              }
            >
              <div className="flex items-center justify-between w-full mb-2">
                <div className={'p-2.5 rounded-xl ' + (isActive ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700')}>
                  <Icon size={18} />
                </div>
                {isActive && <span className="rounded-full bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5">Active</span>}
              </div>
              <p className="font-extrabold text-sm text-black">{uc.label}</p>
              <p className="text-[11px] font-medium text-slate-500 mt-0.5 leading-tight">{uc.desc}</p>
            </button>
          );
        })}
      </div>

      {/* Sub-category Selector */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
        <label className="text-xs font-bold text-black uppercase tracking-wider block mb-2">
          Fine-tune Business Sub-Type:
        </label>
        {useCase === 'restaurant' && (
          <select
            value={restaurantType}
            onChange={(e) => setRestaurantType(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-black outline-none focus:border-blue-500 font-sans"
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
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-black outline-none focus:border-blue-500 font-sans"
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
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-black outline-none focus:border-blue-500 font-sans"
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
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-black outline-none focus:border-blue-500 font-sans"
          >
            {SCHOOL_TYPES.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        )}
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="animate-pulse rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-3">
              <div className="h-4 w-1/2 bg-slate-200 rounded"></div>
              <div className="h-8 w-1/3 bg-slate-200 rounded"></div>
              <div className="h-12 w-full bg-slate-200 rounded"></div>
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-700">
          {error}
        </div>
      )}

      {/* Recommendations Cards Grid */}
      {!loading && recommendations.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold uppercase tracking-wider text-black">
              Top Ranked Locations in Ahmedabad for {USE_CASE_CONFIG.find((c) => c.id === useCase)?.label}
            </p>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
              5 Areas Evaluated
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recommendations.map((item, idx) => {
              const isWinner = idx === 0;
              return (
                <div
                  key={item.name}
                  className={
                    'rounded-2xl border transition-all duration-200 p-5 flex flex-col justify-between relative overflow-hidden ' +
                    (isWinner
                      ? 'border-blue-600 bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-xl shadow-blue-600/20'
                      : 'border-slate-200 bg-white text-black hover:border-blue-300 shadow-sm')
                  }
                >
                  <div>
                    {/* Top Rank Badge */}
                    <div className="flex items-center justify-between mb-3">
                      <span
                        className={
                          'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ' +
                          (isWinner
                            ? 'bg-amber-400 text-slate-950 shadow-sm'
                            : 'bg-blue-50 text-blue-700 border border-blue-200')
                        }
                      >
                        {isWinner ? <Trophy size={14} className="fill-slate-950" /> : <Star size={14} />}
                        {item.rank_label}
                      </span>
                    </div>

                    {/* Location Name & Score */}
                    <div className="flex items-baseline justify-between mb-2">
                      <h4 className={'text-xl font-extrabold tracking-tight ' + (isWinner ? 'text-white' : 'text-black')}>
                        {item.name}
                      </h4>
                      <div className="text-right">
                        <span className={'text-2xl font-black ' + (isWinner ? 'text-amber-300' : 'text-black')}>
                          {item.score}
                        </span>
                        <span className={'text-xs font-bold block ' + (isWinner ? 'text-blue-100' : 'text-slate-500')}>
                          AI Readiness Score
                        </span>
                      </div>
                    </div>

                    {/* Driver Highlights */}
                    <div className="my-3 space-y-1.5 border-t border-b py-3 font-sans text-xs">
                      {item.result?.explanation?.positives?.slice(0, 2).map((pos, pIdx) => (
                        <div key={pIdx} className="flex items-center gap-1.5">
                          <TrendingUp size={14} className={isWinner ? 'text-amber-300 shrink-0' : 'text-blue-600 shrink-0'} />
                          <span className={'font-semibold truncate ' + (isWinner ? 'text-blue-50' : 'text-black')}>
                            {pos.title || pos}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Explore Button */}
                  <button
                    type="button"
                    onClick={() => onSelectRecommendation && onSelectRecommendation(item)}
                    className={
                      'mt-2 w-full flex items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-xs font-bold transition shadow-xs ' +
                      (isWinner
                        ? 'bg-white text-blue-700 hover:bg-amber-300 hover:text-slate-950'
                        : 'bg-blue-600 text-white hover:bg-blue-700')
                    }
                  >
                    <MapPin size={15} /> Explore on Map <ChevronRight size={15} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
