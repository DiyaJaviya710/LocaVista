import { useState, useEffect } from 'react';
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BarChart3, Compass, FileText, Home, MapPinned, Menu, X, LogOut, User, ShieldCheck, Sparkles, Phone, Mail, MapPin, ArrowUpRight } from 'lucide-react';

const navItems = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/dashboard', label: 'Map Explorer', icon: BarChart3 },
  { to: '/best-locations', label: 'HotSpot Finder', icon: Sparkles },
  { to: '/compare', label: 'Compare Sites', icon: MapPinned },
  { to: '/reports', label: 'Saved Reports', icon: FileText },
];

export default function MainLayout() {
  const [open, setOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Official Print PDF Header (Visible ONLY when exporting to PDF) */}
      <div className="hidden print:flex items-center justify-between border-b-2 border-slate-900 pb-3 mb-6 font-sans">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 font-extrabold text-white">
            LV
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-black uppercase tracking-wider">LocaVista — Site Intelligence Platform</h1>
            <p className="text-xs font-semibold text-slate-600">Enterprise Spatial AI Assessment & Site Readiness Report</p>
          </div>
        </div>
        <div className="text-right text-xs font-semibold text-slate-500">
          <p>Generated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          <p className="text-[10px] text-blue-600 font-bold">Confidential Commercial Intelligence</p>
        </div>
      </div>

      <header className="sticky top-0 z-[9999] border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-xs">
        <div className="mx-auto flex max-w-[1380px] items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8 gap-4">
          <Link to="/" className="flex items-center gap-3 shrink-0 whitespace-nowrap">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 font-extrabold text-white shadow-sm shadow-blue-600/30 tracking-wider">
              LV
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-600">LocaVista</p>
              <h1 className="text-base font-extrabold tracking-tight text-black whitespace-nowrap">Site Intelligence Platform</h1>
            </div>
          </Link>

          <button className="rounded-xl border border-slate-200 p-2 text-slate-600 xl:hidden" onClick={() => setOpen((prev) => !prev)}>
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>

          <nav className="hidden gap-1.5 xl:flex items-center">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold whitespace-nowrap shrink-0 transition-all duration-150 ${isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-black hover:bg-slate-100 hover:text-blue-600'
                  }`
                }
              >
                <Icon size={16} />
                <span className="whitespace-nowrap">{label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="hidden xl:flex items-center gap-3 shrink-0 whitespace-nowrap">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-blue-600 font-bold border border-slate-200">
                    {user.name ? user.name[0] : 'U'}
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-black whitespace-nowrap">{user.name}</p>
                    <p className="text-[10px] font-semibold text-slate-500 whitespace-nowrap">{user.email || 'Verified User'}</p>
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-black transition hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 shadow-2xs whitespace-nowrap"
                  title="Logout"
                >
                  <LogOut size={14} /> Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="rounded-xl border border-slate-200 px-4.5 py-2 text-xs font-bold text-black hover:bg-slate-100 whitespace-nowrap">
                  Sign In
                </Link>
                <Link to="/register" className="rounded-xl bg-blue-600 px-4.5 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-sm shadow-blue-600/20 whitespace-nowrap">
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>

        {open && (
          <div className="border-t border-slate-200 bg-white px-4 py-4 xl:hidden">
            <div className="flex flex-col gap-2">
              {navItems.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-bold whitespace-nowrap transition ${isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                      : 'text-black hover:bg-slate-50 hover:text-blue-600'
                    }`
                  }
                  onClick={() => setOpen(false)}
                >
                  <Icon size={18} />
                  <span className="whitespace-nowrap">{label}</span>
                </NavLink>
              ))}
            </div>
            <div className="mt-3 border-t border-slate-100 pt-3">
              {isAuthenticated && user ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-900">{user.name}</p>
                    <p className="text-[10px] text-slate-500">{user.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      logout();
                      setOpen(false);
                    }}
                    className="rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Link to="/login" onClick={() => setOpen(false)} className="flex-1 text-center rounded-xl border border-slate-200 py-2 text-xs font-semibold text-slate-700">
                    Sign In
                  </Link>
                  <Link to="/register" onClick={() => setOpen(false)} className="flex-1 text-center rounded-xl bg-blue-600 py-2 text-xs font-semibold text-white">
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto flex max-w-[1380px] flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white pt-12 pb-8 mt-16 text-slate-600 font-sans">
        <div className="mx-auto max-w-[1380px] px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row justify-between gap-10 pb-10 border-b border-slate-100">
            {/* Left Side: Brand Info */}
            <div className="space-y-3 max-w-sm shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 font-extrabold text-white shadow-sm shadow-blue-600/30 tracking-wider">
                  LV
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-blue-600">LocaVista</p>
                  <h3 className="text-sm font-extrabold tracking-tight text-slate-900">Site Intelligence Platform</h3>
                </div>
              </div>
              <p className="text-xs leading-relaxed text-slate-500">
                AI-powered location scoring, spatial econometrics, and trade-area intelligence for commercial site selection across Ahmedabad.
              </p>
              <div className="pt-1 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>System Operational • Ahmedabad Metro</span>
              </div>
            </div>

            {/* Right Side: 3 Columns Right-Aligned Group */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-12 lg:gap-16">
              {/* Column 2: 1st - Platform Navigation */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">Platform Navigation</h4>
                <ul className="space-y-2.5 text-xs font-medium text-slate-500">
                  <li>
                    <Link to="/" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="text-slate-600 hover:text-blue-600 transition font-medium flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-600 shrink-0"></span>
                      <span>Home Page</span>
                    </Link>
                  </li>
                  <li>
                    <Link to="/dashboard" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="text-slate-600 hover:text-blue-600 transition font-medium flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-600 shrink-0"></span>
                      <span>Map Explorer</span>
                    </Link>
                  </li>
                  <li>
                    <Link to="/best-locations" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="text-slate-600 hover:text-blue-600 transition font-medium flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-600 shrink-0"></span>
                      <span>HotSpot Finder</span>
                    </Link>
                  </li>
                  <li>
                    <Link to="/compare" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="text-slate-600 hover:text-blue-600 transition font-medium flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-600 shrink-0"></span>
                      <span>Compare Sites</span>
                    </Link>
                  </li>
                  <li>
                    <Link to="/reports" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="text-slate-600 hover:text-blue-600 transition font-medium flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-600 shrink-0"></span>
                      <span>Saved Reports</span>
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Column 3: 2nd - Business Use Case */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">Business Use Case</h4>
                <ul className="space-y-2.5 text-xs font-medium text-slate-500">
                  <li className="flex items-center gap-2 text-slate-600 font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600 shrink-0"></span>
                    <span>Restaurant</span>
                  </li>
                  <li className="flex items-center gap-2 text-slate-600 font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600 shrink-0"></span>
                    <span>Retail Store</span>
                  </li>
                  <li className="flex items-center gap-2 text-slate-600 font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600 shrink-0"></span>
                    <span>Office</span>
                  </li>
                  <li className="flex items-center gap-2 text-slate-600 font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600 shrink-0"></span>
                    <span>School</span>
                  </li>
                </ul>
              </div>

              {/* Column 4: 3rd - Get in Touch */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">Get in Touch</h4>
                <ul className="space-y-2.5 text-xs font-medium text-slate-500">
                  <li>
                    <a
                      href="tel:+917211172096"
                      className="flex items-center gap-2 text-slate-600 hover:text-blue-600 transition font-medium"
                    >
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100/80 shrink-0">
                        <Phone size={12} />
                      </div>
                      <span>+91 7211172096</span>
                    </a>
                  </li>
                  <li>
                    <a
                      href="mailto:locavistaa@gmail.com"
                      className="flex items-center gap-2 text-slate-600 hover:text-blue-600 transition font-medium"
                    >
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100/80 shrink-0">
                        <Mail size={12} />
                      </div>
                      <span>locavistaa@gmail.com</span>
                    </a>
                  </li>
                  <li className="flex items-center gap-2 text-slate-600 font-medium">
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100/80 shrink-0">
                      <MapPin size={12} />
                    </div>
                    <span>Ahmedabad, Gujarat, India</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-6 flex items-center justify-start text-xs text-slate-500 font-medium">
            <p>© 2026 LocaVista Site Intelligence Platform. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
