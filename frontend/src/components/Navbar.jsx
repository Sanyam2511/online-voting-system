import { Link, NavLink, useNavigate } from 'react-router-dom';
import { LogOut, Menu, ShieldCheck, Vote, X } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { AUTH_CHANGED_EVENT, clearAuthSession, getStoredUser } from '../lib/auth';
import BrandMark from './BrandMark';

const Navbar = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(getStoredUser());
  const [mobileOpen, setMobileOpen] = useState(false);

  const syncAuthState = () => {
    setUser(getStoredUser());
  };

  useEffect(() => {
    window.addEventListener(AUTH_CHANGED_EVENT, syncAuthState);
    window.addEventListener('storage', syncAuthState);

    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, syncAuthState);
      window.removeEventListener('storage', syncAuthState);
    };
  }, []);

  const isLoggedIn = Boolean(user?.token || localStorage.getItem('token'));
  const isAdmin = user?.role === 'Admin';

  const navLinks = useMemo(
    () => [
      { to: '/', label: 'Home' },
      { to: '/candidates', label: 'Candidates' },
      ...(isAdmin ? [{ to: '/manage-candidates', label: 'Manage' }] : []),
      { to: '/transparency', label: 'Transparency' },
      { to: '/receipt', label: 'Receipt Verify' }
    ],
    [isAdmin]
  );

  const handleLogout = () => {
    clearAuthSession();
    setMobileOpen(false);
    navigate('/login');
  };

  const closeMobileMenu = () => {
    setMobileOpen(false);
  };

  const getNavLinkClass = ({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`;

  return (
    <nav className="fixed top-0 left-0 w-full z-50">
      <div className="section-wrap pt-2 pb-1">
        <div className="rounded-[1.2rem] border border-[#c6d5f1] bg-white/90 backdrop-blur-xl shadow-[0_16px_34px_rgba(12,33,71,0.14)] px-3 sm:px-4 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <Link to="/" onClick={closeMobileMenu} className="flex items-center gap-2.5 min-w-0">
              <BrandMark className="w-10 h-10" />
              <div className="min-w-0">
                <p className="text-[15px] sm:text-base font-semibold text-[#132b56] tracking-tight truncate">SecureVote</p>
                <p className="hidden sm:block text-[11px] uppercase tracking-[0.12em] text-[#60759a]">Election Portal</p>
              </div>
            </Link>

            <div className="hidden lg:flex items-center gap-1">
              {navLinks.map((item) => (
                <NavLink key={item.to} to={item.to} className={getNavLinkClass} onClick={closeMobileMenu}>
                  {item.label}
                </NavLink>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              {!isAdmin && (
                <Link to="/vote" onClick={closeMobileMenu} className="btn-primary text-xs !py-1.5 !px-3 inline-flex items-center gap-1.5">
                  <Vote className="w-4 h-4" />
                  <span className="hidden sm:inline">Vote</span>
                </Link>
              )}

              {isLoggedIn ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="btn-secondary text-xs !py-1.5 !px-3 inline-flex items-center gap-1.5"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              ) : (
                <>
                  <Link to="/login" onClick={closeMobileMenu} className="hidden sm:inline-flex nav-link">Login</Link>
                  <Link to="/signup" onClick={closeMobileMenu} className="btn-secondary text-xs !py-1.5 !px-3 inline-flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    <span className="hidden sm:inline">Register</span>
                  </Link>
                </>
              )}

              <button
                type="button"
                onClick={() => setMobileOpen((current) => !current)}
                className="lg:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg border border-[#c5d5f4] bg-[#f4f8ff] text-[#2b4d80]"
                aria-label="Toggle navigation menu"
              >
                {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {mobileOpen && (
            <div className="lg:hidden mt-2.5 pt-2.5 border-t border-[#d9e4f9]">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                {navLinks.map((item) => (
                  <NavLink key={item.to} to={item.to} className={getNavLinkClass} onClick={closeMobileMenu}>
                    {item.label}
                  </NavLink>
                ))}
              </div>

              {!isLoggedIn && (
                <div className="mt-2">
                  <Link to="/login" onClick={closeMobileMenu} className="nav-link mr-2 inline-flex">Login</Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;