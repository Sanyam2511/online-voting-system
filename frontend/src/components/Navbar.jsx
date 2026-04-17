import { Link, useNavigate } from 'react-router-dom';
import { Building2, LogOut, ShieldCheck, Vote } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { AUTH_CHANGED_EVENT, clearAuthSession, getStoredUser } from '../lib/auth';

const Navbar = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(getStoredUser());

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

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/candidates', label: 'Candidates' },
    ...(isAdmin ? [{ to: '/manage-candidates', label: 'Manage Candidates' }] : []),
    { to: '/transparency', label: 'Transparency' },
    { to: '/receipt', label: 'Receipt Verify' }
  ];

  const handleLogout = () => {
    clearAuthSession();
    navigate('/login');
  };

  return (
    <nav className="fixed top-0 left-0 w-full z-50 border-b border-[#d4e0f6] bg-white/90 backdrop-blur-xl">
      <div className="section-wrap py-5 flex items-center justify-between gap-6 lg:gap-10">
        <Link to="/" className="flex items-center gap-4 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-[#eaf1ff] border border-[#bfd3fb] flex items-center justify-center">
            <Building2 className="w-5 h-5 text-[#1f66f4]" />
          </div>
          <span className="text-xl sm:text-2xl font-semibold text-[#132b56] tracking-tight">
            SecureVote Election Portal
          </span>
        </Link>

        <div className="flex items-center gap-4 sm:gap-6 lg:gap-8">
          <div className="hidden lg:flex items-center gap-6 xl:gap-7">
            {navLinks.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="text-sm font-semibold text-[#35598e] hover:text-[#17386f] transition"
              >
                {item.label}
              </Link>
            ))}
          </div>

          {!isAdmin && (
            <Link to="/vote" className="btn-primary text-sm py-2.5 px-5 inline-flex items-center gap-2">
              <Vote className="w-4 h-4" /> Vote
            </Link>
          )}

          {isLoggedIn ? (
            <button
              onClick={handleLogout}
              className="btn-secondary text-sm py-2.5 px-5 inline-flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          ) : (
            <>
              <Link to="/login" className="text-sm font-semibold text-[#35598e] hover:text-[#17386f] transition">
                Login
              </Link>
              <Link to="/signup" className="hidden sm:inline-flex items-center gap-2 text-sm font-semibold text-[#17386f] bg-[#eaf1ff] border border-[#bfd3fb] rounded-full px-4 py-2.5 hover:bg-[#dfeaff] transition">
                <ShieldCheck className="w-4 h-4" /> Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;