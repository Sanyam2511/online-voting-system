import React from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, ShieldCheck, Vote } from 'lucide-react';
import BrandMark from './BrandMark';

import { useUiPreferences } from '../context/useUiPreferences';

const Footer = () => {
  const { t, withLanguagePath } = useUiPreferences();
  const currentYear = new Date().getFullYear();

  const trustPoints = [
    t('footer.trustPoint.scope', 'Election-scoped ballots and candidate pools'),
    t('footer.trustPoint.oneVote', 'One vote per user per election enforcement'),
    t('footer.trustPoint.transparency', 'Public transparency metrics and receipt verification')
  ];

  const platformLinks = [
    { to: '/', label: t('nav.home', 'Home') },
    { to: '/candidates', label: t('nav.candidates', 'Candidates') },
    { to: '/disputes', label: t('nav.disputes', 'Disputes') },
    { to: '/security', label: t('nav.security', 'Security') },
    { to: '/transparency', label: t('nav.transparency', 'Transparency') },
    { to: '/receipt', label: t('nav.receipt', 'Receipt Verify') }
  ];

  const participationLinks = [
    { to: '/signup', label: t('nav.register', 'Register') },
    { to: '/login', label: t('nav.login', 'Login') },
    { to: '/vote', label: t('nav.vote', 'Vote') },
    { to: '/manage-candidates', label: t('nav.manage', 'Manage') }
  ];

  return (
    <footer className="mt-10 footer-shell">
      <div className="section-wrap">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-x-8 gap-y-7 py-6 sm:py-7 lg:py-8 items-start">
          <section className="sm:col-span-2 lg:col-span-5">
            <Link to={withLanguagePath('/')} className="inline-flex items-center gap-3">
              <BrandMark className="w-10 h-10" />
              <div>
                <p className="text-lg font-semibold text-[#102b58]">{t('footer.brandTitle', 'SecureVote Election Portal')}</p>
                <p className="text-xs uppercase tracking-[0.12em] text-[#60759a]">{t('footer.brandSubtitle', 'Digital civic governance')}</p>
              </div>
            </Link>

            <p className="text-[0.9rem] text-[#5e7298] leading-relaxed mt-3 max-w-xl">
              {t('footer.brandBody', 'Built for high-trust public participation with secure authentication, controlled election lifecycles, and transparent vote accountability.')}
            </p>

            <div className="flex flex-wrap gap-2 mt-4">
              <span className="metric-pill">
                <Vote className="w-3.5 h-3.5" /> {t('footer.metric.multiElection', 'Multi-Election Ready')}
              </span>
              <span className="metric-pill">
                <ShieldCheck className="w-3.5 h-3.5" /> {t('footer.metric.receipt', 'Receipt Integrity Verification')}
              </span>
              <span className="metric-pill">
                <BarChart3 className="w-3.5 h-3.5" /> {t('footer.metric.public', 'Public Transparency')}
              </span>
            </div>
          </section>

          <section className="lg:col-span-2">
            <p className="footer-title">{t('footer.platformNavigation', 'Platform Navigation')}</p>
            <ul className="footer-link-list mt-4" aria-label="Platform navigation links">
              {platformLinks.map((item) => (
                <li key={item.to}>
                  <Link to={withLanguagePath(item.to)} className="footer-link">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="lg:col-span-2">
            <p className="footer-title">{t('footer.electionAccess', 'Election Access')}</p>
            <ul className="footer-link-list mt-4" aria-label="Election access links">
              {participationLinks.map((item) => (
                <li key={item.to}>
                  <Link to={withLanguagePath(item.to)} className="footer-link">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="sm:col-span-2 lg:col-span-3">
            <p className="footer-title">{t('footer.trustSignals', 'Trust Signals')}</p>
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
          <p className="text-[11px] text-[#60759a]">
            {t('footer.copyright', 'Copyright {year} SecureVote Election Portal. Designed for transparent and auditable civic outcomes.')
              .replace('{year}', String(currentYear))}
          </p>
          <div className="flex items-center gap-2.5 sm:gap-4">
            <Link to={withLanguagePath('/transparency')} className="footer-mini-link">{t('footer.transparency', 'Transparency')}</Link>
            <Link to={withLanguagePath('/receipt')} className="footer-mini-link">{t('footer.verifyReceipt', 'Verify Receipt')}</Link>
            <Link to={withLanguagePath('/vote')} className="footer-mini-link">{t('footer.castVote', 'Cast Vote')}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
