import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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


function App() {
  return (
    <Router>
      <div className="min-h-screen bg-transparent app-shell">
        <a href="#app-main-content" className="skip-link">
          Skip to main content
        </a>
        <Navbar />
        <Toaster
          position="top-right"
          gutter={10}
          toastOptions={{
            duration: 3600,
            style: {
              background: '#0f172a',
              color: '#f8fafc',
              border: '1px solid #334155',
              borderRadius: '14px',
              boxShadow: '0 16px 34px rgba(15, 23, 42, 0.36)',
              fontSize: '14px'
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#0f172a'
              }
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#0f172a'
              }
            }
          }}
        />
        <main id="app-main-content" tabIndex="-1" className="focus:outline-none">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/candidates" element={<CandidateProfiles />} />
            <Route path="/manage-candidates" element={<CandidateManagement />} />
            <Route path="/security" element={<SecurityCenter />} />
            <Route path="/transparency" element={<TransparencyDashboard />} />
            <Route path="/receipt" element={<ReceiptVerification />} />
            <Route path="/disputes" element={<RecountDisputes />} />
            <Route path="/vote" element={<VotingArena />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;