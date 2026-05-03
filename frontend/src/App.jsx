import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import VotingArena from './pages/VotingArena';
import CandidateProfiles from './pages/CandidateProfiles';
import CandidateManagement from './pages/CandidateManagement';
import TransparencyDashboard from './pages/TransparencyDashboard';
import ReceiptVerification from './pages/ReceiptVerification';
import RecountDisputes from './pages/RecountDisputes';
import SecurityCenter from './pages/SecurityCenter';
import { useUiPreferences } from './context/useUiPreferences';
import { SUPPORTED_LANGUAGES } from './context/i18n.js';

const LocalizedShell = () => {
  const { lang } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { setLanguage, t } = useUiPreferences();

  useEffect(() => {
    if (!lang || !SUPPORTED_LANGUAGES.includes(lang)) {
      const nextPath = `/en${location.pathname.replace(/^\/(en|hi)(?=\/|$)/, '')}`;
      navigate(nextPath || '/en', { replace: true });
      return;
    }

    setLanguage(lang);
  }, [lang, location.pathname, navigate, setLanguage]);

  if (!lang || !SUPPORTED_LANGUAGES.includes(lang)) {
    return null;
  }

  return (
    <div className="min-h-screen bg-transparent app-shell">
      <a href="#app-main-content" className="skip-link">
        {t('app.skipToMain', 'Skip to main content')}
      </a>
      <Navbar />
      <Toaster
        position="top-right"
        gutter={10}
        toastOptions={{
          duration: 3600,
          style: {
            background: '#11284f',
            color: '#eaf1ff',
            border: '1px solid #35598e',
            borderRadius: '14px',
            boxShadow: '0 16px 34px rgba(12, 30, 62, 0.36)',
            fontSize: '14px'
          },
          success: {
            iconTheme: {
              primary: '#41ba67',
              secondary: '#11284f'
            }
          },
          error: {
            iconTheme: {
              primary: '#ef5e5e',
              secondary: '#11284f'
            }
          }
        }}
      />
      <main id="app-main-content" tabIndex="-1" className="focus:outline-none">
        <Routes>
          <Route index element={<Home />} />
          <Route path="login" element={<Login />} />
          <Route path="signup" element={<Signup />} />
          <Route path="candidates" element={<CandidateProfiles />} />
          <Route path="manage-candidates" element={<CandidateManagement />} />
          <Route path="security" element={<SecurityCenter />} />
          <Route path="transparency" element={<TransparencyDashboard />} />
          <Route path="receipt" element={<ReceiptVerification />} />
          <Route path="disputes" element={<RecountDisputes />} />
          <Route path="vote" element={<VotingArena />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/en" replace />} />
        <Route path="/:lang/*" element={<LocalizedShell />} />
        <Route path="*" element={<Navigate to="/en" replace />} />
      </Routes>
    </Router>
  );
}

export default App;