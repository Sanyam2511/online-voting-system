import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Menu, Moon, ShieldCheck, Sun, X, ChevronDown } from 'lucide-react';
import { useEffect, useMemo, useState, useRef } from 'react';
import { AUTH_CHANGED_EVENT, clearAuthSession, getStoredUser } from '../lib/auth';
import BrandMark from './BrandMark';
import { useUiPreferences } from '../context/useUiPreferences';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useUiPreferences();
  const [user, setUser] = useState(getStoredUser());
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const syncAuthState = () => {
    setUser(getStoredUser());
  };

  useEffect(() => {
    window.addEventListener(AUTH_CHANGED_EVENT, syncAuthState);
    window.addEventListener('storage', syncAuthState);

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, syncAuthState);
      window.removeEventListener('storage', syncAuthState);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close dropdown on route change
  useEffect(() => {
    setDropdownOpen(false);
  }, [location.pathname]);

  const isLoggedIn = Boolean(user?.token || localStorage.getItem('token'));
  const isAdmin = user?.role === 'Admin';

  const navLinks = useMemo(
    () => [
      { to: '/', label: 'Home', end: true },
      { to: '/candidates', label: 'Candidates' },
      { to: '/disputes', label: 'Disputes' },
      ...(isAdmin ? [{ to: '/manage-candidates', label: 'Manage' }] : []),
      ...(isAdmin ? [{ to: '/security', label: 'Security' }] : []),
      { to: '/transparency', label: 'Transparency' },
      { to: '/receipt', label: 'Receipt Verify' }
    ],
    [isAdmin]
  );

  const handleLogout = () => {
    clearAuthSession();
    setMobileOpen(false);
    navigate(`/login`);
  };

  const closeMobileMenu = () => {
    setMobileOpen(false);
  };

  const getNavLinkClass = ({ isActive }) => `block px-4 py-2 text-sm transition-colors ${isActive ? 'bg-slate-50 font-semibold text-emerald-600' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`;
  const getMobileNavLinkClass = ({ isActive }) => `block px-3 py-2 text-sm rounded-lg transition-colors ${isActive ? 'bg-slate-100 font-semibold text-emerald-600' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`;

  return (
    <nav className="fixed top-4 left-0 w-full z-50 flex justify-center pointer-events-none">
      <div className="pill-nav backdrop-blur-xl pointer-events-auto shadow-sm bg-white/80">
        <div className="flex items-center justify-between gap-4 sm:gap-8">
          <div className="flex items-center justify-between gap-3">
            <Link to={`/`} onClick={closeMobileMenu} className="flex items-center gap-2.5 min-w-0 pr-2">
              <BrandMark className="w-12 h-12" />
              <div className="min-w-0">
                <p className="text-[15px] sm:text-base font-semibold text-slate-900 tracking-tight truncate">SecureVote</p>
              </div>
            </Link>

            <div className="hidden lg:flex items-center gap-1" ref={dropdownRef}>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="nav-link font-medium inline-flex items-center gap-1.5 px-3 py-2 text-sm text-slate-700 hover:text-slate-900 transition-colors rounded-lg hover:bg-slate-100/50"
                  aria-expanded={dropdownOpen}
                >
                  Pages
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {dropdownOpen && (
                  <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50 flex flex-col overflow-hidden">
                    {navLinks.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        className={getNavLinkClass}
                        end={item.end}
                        onClick={() => setDropdownOpen(false)}
                      >
                        {item.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 ml-2">
              <button
                type="button"
                onClick={toggleTheme}
                className="hidden md:inline-flex nav-link p-2 rounded-full hover:bg-slate-100/50 transition-colors text-slate-600 hover:text-slate-900"
                aria-pressed={theme === 'dark'}
                aria-label={theme === 'dark' ? 'Dark mode on' : 'Light mode on'}
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              {isLoggedIn ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="btn-secondary text-xs !py-1.5 !px-3 inline-flex items-center gap-1.5 ml-2 shadow-sm"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline font-medium">{'Logout'}</span>
                </button>
              ) : (
                <>
                  <Link to={`/login`} onClick={closeMobileMenu} className="hidden sm:inline-flex px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors rounded-lg hover:bg-slate-100/50">{'Login'}</Link>
                  <Link to={`/signup`} onClick={closeMobileMenu} className="btn-black-pill text-sm inline-flex items-center gap-1.5 ml-1 shadow-sm px-4">
                    <ShieldCheck className="w-4 h-4" />
                    <span className="hidden sm:inline">{'Sign Up'}</span>
                  </Link>
                </>
              )}

              <button
                type="button"
                onClick={() => setMobileOpen((current) => !current)}
                className="lg:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 bg-white text-slate-800 ml-1 shadow-sm"
                aria-label={'Toggle navigation menu'}
              >
                {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {mobileOpen && (
            <div className="lg:hidden mt-3 pt-3 border-t border-slate-100 bg-white/50 rounded-b-2xl">
              <div className="flex flex-col gap-1 max-h-[60vh] overflow-y-auto px-1 pb-2">
                <p className="px-3 py-1 text-xs uppercase tracking-wider font-semibold text-slate-400">Pages</p>
                {navLinks.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={getMobileNavLinkClass}
                    end={item.end}
                    onClick={closeMobileMenu}
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>

              {!isLoggedIn && (
                <div className="px-1 py-2 border-t border-slate-100">
                  <Link to={`/login`} onClick={closeMobileMenu} className="block w-full text-center py-2 text-sm font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors">{'Login'}</Link>
                </div>
              )}

              <div className="p-2 border-t border-slate-100">
                <button type="button" onClick={toggleTheme} className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors" aria-pressed={theme === 'dark'}>
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  {'Toggle Theme'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;