import { Link } from 'react-router-dom';
import { BarChart3, ShieldCheck, Vote } from 'lucide-react';
import BrandMark from './BrandMark';

import { useUiPreferences } from '../context/useUiPreferences';

const Footer = () => {
  
  const currentYear = new Date().getFullYear();

  const trustPoints = [
    'Election-scoped ballots and candidate pools',
    'One vote per user per election enforcement',
    'Public transparency metrics and receipt verification'
  ];

  const platformLinks = [
    { to: '/', label: 'Home' },
    { to: '/candidates', label: 'Candidates' },
    { to: '/disputes', label: 'Disputes' },
    { to: '/security', label: 'Security' },
    { to: '/transparency', label: 'Transparency' },
    { to: '/receipt', label: 'Receipt Verify' }
  ];

  const participationLinks = [
    { to: '/signup', label: 'Register' },
    { to: '/login', label: 'Login' },
    { to: '/vote', label: 'Vote' },
    { to: '/manage-candidates', label: 'Manage' }
  ];

  return (
    <footer className="mt-10 footer-shell">
      <div className="section-wrap">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-x-8 gap-y-7 py-6 sm:py-7 lg:py-8 items-start">
          <section className="sm:col-span-2 lg:col-span-5">
            <Link to={'/'} className="inline-flex items-center gap-3">
              <BrandMark className="w-10 h-10" />
              <div>
                <p className="text-lg font-semibold text-slate-900">{'SecureVote Election Portal'}</p>
                <p className="text-xs uppercase tracking-[0.12em] text-slate-500">{'Digital civic governance'}</p>
              </div>
            </Link>

            <p className="text-[0.9rem] text-slate-500 leading-relaxed mt-3 max-w-xl">
              {'Built for high-trust public participation with secure authentication, controlled election lifecycles, and transparent vote accountability.'}
            </p>

            <div className="flex flex-wrap gap-2 mt-4">
              <span className="metric-pill">
                <Vote className="w-3.5 h-3.5" /> {'Multi-Election Ready'}
              </span>
              <span className="metric-pill">
                <ShieldCheck className="w-3.5 h-3.5" /> {'Receipt Integrity Verification'}
              </span>
              <span className="metric-pill">
                <BarChart3 className="w-3.5 h-3.5" /> {'Public Transparency'}
              </span>
            </div>
          </section>

          <section className="lg:col-span-2">
            <p className="footer-title">{'Platform Navigation'}</p>
            <ul className="footer-link-list mt-4" aria-label="Platform navigation links">
              {platformLinks.map((item) => (
                <li key={item.to}>
                  <Link to={item.to} className="footer-link">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="lg:col-span-2">
            <p className="footer-title">{'Election Access'}</p>
            <ul className="footer-link-list mt-4" aria-label="Election access links">
              {participationLinks.map((item) => (
                <li key={item.to}>
                  <Link to={item.to} className="footer-link">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="sm:col-span-2 lg:col-span-3">
            <p className="footer-title">{'Trust Signals'}</p>
            <ul className="space-y-2.5 mt-4" aria-label="Trust signals">
              {trustPoints.map((point) => (
                <li key={point} className="footer-trust-item">
                  {point}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      <div className="footer-base">
        <div className="section-wrap py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2.5">
          <p className="text-[11px] text-slate-500">
            {'Copyright {year} SecureVote Election Portal. Designed for transparent and auditable civic outcomes.'
              .replace('{year}', String(currentYear))}
          </p>
          <div className="flex items-center gap-2.5 sm:gap-4">
            <Link to={'/transparency'} className="footer-mini-link">{'Transparency'}</Link>
            <Link to={'/receipt'} className="footer-mini-link">{'Verify Receipt'}</Link>
            <Link to={'/vote'} className="footer-mini-link">{'Cast Vote'}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
