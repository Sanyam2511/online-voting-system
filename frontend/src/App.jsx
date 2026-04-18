import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import VotingArena from './pages/VotingArena';
import CandidateProfiles from './pages/CandidateProfiles';
import CandidateManagement from './pages/CandidateManagement';
import TransparencyDashboard from './pages/TransparencyDashboard';
import ReceiptVerification from './pages/ReceiptVerification';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-transparent app-shell">
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
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/candidates" element={<CandidateProfiles />} />
          <Route path="/manage-candidates" element={<CandidateManagement />} />
          <Route path="/transparency" element={<TransparencyDashboard />} />
          <Route path="/receipt" element={<ReceiptVerification />} />
          <Route path="/vote" element={<VotingArena />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;