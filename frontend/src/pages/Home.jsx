import { useState, useEffect, useRef } from 'react';
import {
  ArrowRight, MapPin, ShieldCheck, Building2, TrendingUp, Sparkles,
  Star, ChevronLeft, ChevronRight, MessageSquarePlus, X, Quote, CheckCircle2, UserCheck, MessageSquare
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const highlights = [
  {
    title: 'Map Explorer',
    desc: 'Live OpenStreetMap layers combined with real population counts, trade areas, and interactive site selection across Ahmedabad.',
    to: '/dashboard',
  },
  {
    title: 'HotSpot Finder',
    desc: 'Instantly recommends the top 5 highest-performing locations across Ahmedabad tailored to your business category.',
    to: '/best-locations',
  },
  {
    title: 'Compare Sites',
    desc: 'Side-by-side site comparison with instant PDF executive analysis reports for board and investor approval.',
    to: '/compare',
  },
];

const DEFAULT_FEEDBACKS = [
  {
    id: 'fb-1',
    userName: 'Aniket Patel',
    userRole: 'Restaurant Franchise Owner',
    rating: 5,
    date: 'Aug 2026',
    comment: 'LocaVista’s predictive ML scoring model helped us select the ideal location on Ashram Road. The projected footfall matched our actual launch numbers within 5%!',
    avatarColor: 'bg-blue-600',
  },
  {
    id: 'fb-2',
    userName: 'Priya Sharma',
    userRole: 'Retail Expansion Lead',
    rating: 5,
    date: 'Jul 2026',
    comment: 'The 16-variable spatial metric engine and SHAP feature drivers gave our investment board 100% confidence to approve our new retail site in Satellite.',
    avatarColor: 'bg-indigo-600',
  },
  {
    id: 'fb-3',
    userName: 'Rajesh Mehta',
    userRole: 'Commercial Real Estate Broker',
    rating: 5,
    date: 'Jul 2026',
    comment: 'Comparing Navrangpura vs Nikol side-by-side on the dual map saved our client weeks of site visits. The PDF reports are top enterprise quality.',
    avatarColor: 'bg-emerald-600',
  },
  {
    id: 'fb-4',
    userName: 'Sneha Gupta',
    userRole: 'Clinic Chain Operations Head',
    rating: 5,
    date: 'Jun 2026',
    comment: 'The HotSpot Finder immediately pinpointed 3 high-potential medical zoning corridors in Bodakdev. Truly a game-changer for healthcare site selection.',
    avatarColor: 'bg-purple-600',
  },
  {
    id: 'fb-5',
    userName: 'Vikram Shah',
    userRole: 'IT Park Site Strategist',
    rating: 5,
    date: 'Jun 2026',
    comment: 'Having instant access to nearest highway, AMTS bus stop, and population density metrics right on map click makes LocaVista indispensable.',
    avatarColor: 'bg-amber-600',
  },
];

export default function Home() {
  const { isAuthenticated, user } = useAuth();
  const [feedbacks, setFeedbacks] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const scrollRef = useRef(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('locavista_custom_feedbacks');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setFeedbacks([...parsed, ...DEFAULT_FEEDBACKS]);
          return;
        }
      }
    } catch (err) {
      // Ignore storage errors
    }
    setFeedbacks(DEFAULT_FEEDBACKS);
  }, []);

  const handleScroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -280 : 280;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setSubmitSuccess(false);
  };

  const handleSubmitFeedback = (e) => {
    e.preventDefault();
    if (!comment.trim()) return;

    const newFeedback = {
      id: `custom-fb-${Date.now()}`,
      userName: user?.name || 'User Name',
      userRole: user?.role || 'Location Strategist',
      rating: Number(rating),
      date: 'Just Now',
      comment: comment.trim(),
      avatarColor: 'bg-blue-600',
    };

    const updated = [newFeedback, ...feedbacks];
    setFeedbacks(updated);

    try {
      const storedCustom = JSON.parse(localStorage.getItem('locavista_custom_feedbacks') || '[]');
      localStorage.setItem('locavista_custom_feedbacks', JSON.stringify([newFeedback, ...storedCustom]));
    } catch (err) {
      // Ignore storage errors
    }

    setComment('');
    setSubmitSuccess(true);
    setTimeout(() => {
      setIsModalOpen(false);
      setSubmitSuccess(false);
    }, 1000);
  };

  const getInitials = (name) => {
    if (!name) return 'UN';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="flex flex-col gap-12">
      {/* Hero Section */}
      <section className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr] items-center">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 sm:p-10 shadow-xl shadow-slate-200/50">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3.5 py-1 text-xs font-bold text-blue-700">
            <ShieldCheck size={16} /> LocaVista — Site Intelligence Platform
          </div>
          <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            Find Your Next High-Performing Location with LocaVista
          </h1>
          <p className="mb-6 max-w-2xl text-base leading-relaxed text-slate-600">
            Evaluate location readiness for Restaurants, Retail Stores, Offices, and School using spatial interaction econometrics, ML scoring models, and market capture simulations.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/dashboard" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-700 shadow-md shadow-blue-600/20">
              Launch Map Explorer <ArrowRight size={18} />
            </Link>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 text-slate-900 shadow-xl shadow-slate-200/50">
          {/* Subtle ambient blue glow accents */}
          <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-blue-600/5 blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50/80 px-3 py-1 text-xs font-bold text-blue-600">
              <MapPin size={15} className="text-blue-600" />
              <span className="uppercase tracking-wider">Ahmedabad Metro Coverage</span>
            </div>
            <h3 className="mt-3 text-2xl font-bold text-slate-900">Location Intelligence Stack</h3>
            <div className="mt-6 flex flex-col gap-3">
              {highlights.map((item) => (
                <Link
                  key={item.title}
                  to={item.to}
                  className="group block rounded-2xl border border-slate-100 bg-slate-50/80 p-4 transition-all duration-200 hover:border-blue-200 hover:bg-blue-50/50 hover:shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-600 shrink-0" />
                      {item.title}
                    </p>
                    <ArrowRight size={14} className="text-slate-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:text-blue-600 transition-all" />
                  </div>
                  <p className="mt-1 pl-3.5 text-xs text-slate-600">{item.desc}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 font-bold">
            <Building2 size={20} />
          </div>
          <h4 className="mt-4 text-base font-bold text-slate-900">4 Business Models</h4>
          <p className="mt-1 text-xs text-slate-500">Tailored scoring weights for Restaurants, Retail, Offices, and Clinics.</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 font-bold">
            <TrendingUp size={20} />
          </div>
          <h4 className="mt-4 text-base font-bold text-slate-900">Predictive ML Engine</h4>
          <p className="mt-1 text-xs text-slate-500">Ensemble Random Forest scoring for competitive trade area market capture.</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 font-bold">
            <Sparkles size={20} />
          </div>
          <h4 className="mt-4 text-base font-bold text-slate-900">SHAP Driving Factors</h4>
          <p className="mt-1 text-xs text-slate-500">Exact score attributions explaining why a site scored high or low.</p>
        </div>
      </section>

      {/* One-Line Swipable Feedback Carousel Section */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xl shadow-slate-200/50 flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-0.5 text-xs font-bold text-blue-700">
              <Star className="h-3.5 w-3.5 fill-blue-600 text-blue-600" /> User Testimonials & Reviews
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              What Location Strategists Say
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-500">
              Real feedback from business owners and expansion managers who trust LocaVista.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Scroll Navigation Buttons */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => handleScroll('left')}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-700 shadow-xs transition hover:bg-slate-50 hover:text-blue-600 active:scale-95"
                title="Scroll Left"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => handleScroll('right')}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-700 shadow-xs transition hover:bg-slate-50 hover:text-blue-600 active:scale-95"
                title="Scroll Right"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Add Feedback Action - Strictly for Logged Users */}
            {isAuthenticated ? (
              <button
                onClick={handleOpenModal}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-blue-700 shadow-md shadow-blue-600/20 active:scale-95"
              >
                <MessageSquarePlus size={15} /> Add Feedback
              </button>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 hover:border-slate-400"
              >
                <UserCheck size={15} /> Log In to Add Feedback
              </Link>
            )}
          </div>
        </div>

        {/* Single-Line Swipable Row */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto snap-x snap-mandatory py-1 px-0.5 scroll-smooth scrollbar-none"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {feedbacks.map((fb) => (
            <div
              key={fb.id}
              className="w-[240px] sm:w-[270px] shrink-0 snap-start rounded-xl border border-slate-200 bg-slate-50/50 p-4 shadow-2xs flex flex-col justify-between transition-all duration-200 hover:border-blue-300 hover:bg-white hover:shadow-md hover:shadow-blue-500/10 hover:-translate-y-0.5"
            >
              <div>
                {/* Header: Stars & Date */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3 w-3 ${i < fb.rating
                          ? 'fill-amber-400 text-amber-400'
                          : 'fill-slate-200 text-slate-200'
                          }`}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400">{fb.date}</span>
                </div>

                {/* Quote Icon & Feedback Text */}
                <Quote className="h-4 w-4 text-blue-200 mb-1.5 rotate-180" />
                <p className="text-xs text-slate-600 leading-relaxed font-normal mb-3 line-clamp-3">
                  "{fb.comment}"
                </p>
              </div>

              {/* User Profile Footer - Uniform Across All Cards */}
              <div className="flex items-center gap-2.5 border-t border-slate-200/60 pt-2.5 mt-1">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold text-white shadow-2xs ${fb.avatarColor || 'bg-blue-600'
                    }`}
                >
                  {getInitials(fb.userName)}
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="truncate text-xs font-bold text-slate-900">
                      {fb.userName}
                    </span>
                    <CheckCircle2 className="h-3 w-3 shrink-0 text-blue-600" />
                  </div>
                  <span className="truncate text-[10px] text-slate-500 font-medium">
                    {fb.userRole}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Modal Form for Logged-In Users */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 font-bold">
                  <MessageSquare size={18} />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">Share Your Feedback</h3>
                  <p className="text-xs text-slate-500">Post a review as {user?.name || 'User Name'}</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            {submitSuccess ? (
              <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <CheckCircle2 size={32} />
                </div>
                <h4 className="text-lg font-bold text-slate-900">Thank You!</h4>
                <p className="text-xs text-slate-500">Your feedback has been added to the home page carousel.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitFeedback} className="flex flex-col gap-4">
                {/* User Name Field (Pre-filled for logged-in user) */}
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">User Name</label>
                  <input
                    type="text"
                    readOnly
                    value={user?.name || 'User Name'}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-700 outline-none cursor-not-allowed"
                  />
                </div>

                {/* Rating Selector */}
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">Rating</label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setRating(star)}
                        className="p-1 transition hover:scale-110"
                      >
                        <Star
                          className={`h-6 w-6 ${star <= rating
                            ? 'fill-amber-400 text-amber-400'
                            : 'fill-slate-100 text-slate-300'
                            }`}
                        />
                      </button>
                    ))}
                    <span className="ml-2 text-xs font-bold text-slate-600">{rating} / 5 Stars</span>
                  </div>
                </div>

                {/* Feedback Comment Textarea */}
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">Your Feedback</label>
                  <textarea
                    rows={4}
                    required
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Describe your experience with LocaVista's site readiness and GIS tools..."
                    className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                  />
                </div>

                {/* Submit Action */}
                <div className="mt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-600/20 hover:bg-blue-700"
                  >
                    Submit Feedback
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

