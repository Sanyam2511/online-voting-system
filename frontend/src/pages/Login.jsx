import { AlertCircle, ArrowRight, CheckCircle2, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../lib/api';
import { setAuthSession } from '../lib/auth';
import loginSecurityIllustration from '../assets/illustrations/login-security.svg';

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post('/auth/login', formData);
      const authPayload = response.data;
      setAuthSession(authPayload);
      setSuccess('Login successful! Redirecting...');
      const redirectPath = authPayload.role === 'Admin' ? '/manage-candidates' : '/vote';
      setTimeout(() => navigate(redirectPath), 900);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen page-shell pt-28 pb-14">
      <div className="section-wrap">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-8 items-stretch">
          <section className="surface-card p-8 sm:p-10 lg:p-12">
            <p className="eyebrow mb-6">
              <ShieldCheck className="w-4 h-4" /> Secure Sign In
            </p>
            <h1 className="text-4xl sm:text-5xl text-[#102347] mb-3">Welcome Back</h1>
            <p className="text-[#5b7095] mb-5">Access your verified ballot and participate in official decision-making.</p>

            <div className="flex flex-wrap gap-2 mb-8">
              <span className="metric-pill">JWT Session</span>
              <span className="metric-pill">One Vote / Election</span>
              <span className="metric-pill">Receipt Backed</span>
            </div>

            {error && (
              <div className="mb-6 p-4 rounded-2xl bg-[#fff1f1] border border-[#f1c6c6] flex gap-3">
                <AlertCircle className="w-5 h-5 text-[#c73939] flex-shrink-0 mt-0.5" />
                <p className="text-sm text-[#a62f2f]">{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-6 p-4 rounded-2xl bg-[#eefcf3] border border-[#bde8cc] flex gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#1f9c4c] flex-shrink-0 mt-0.5" />
                <p className="text-sm text-[#1b7a3d]">{success}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-[#183769] mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6a7ea3]" />
                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    required
                    className="form-field form-field-with-icon"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-[#183769] mb-2">Password</label>
                <div className="relative">
                  <LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6a7ea3]" />
                  <input
                    id="password"
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter your secure password"
                    required
                    className="form-field form-field-with-icon"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing in...' : 'Sign In'}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>

            <p className="text-sm text-[#5e7298] mt-6">
              New voter?{' '}
              <Link to="/signup" className="font-semibold text-[#1f66f4] hover:text-[#1149bd] transition">
                Create an account
              </Link>
            </p>
          </section>

          <aside className="glass-panel p-8 sm:p-10 lg:p-12 relative overflow-hidden">
            <div className="absolute inset-x-8 top-8 h-28 rounded-full bg-[#d7e6ff] blur-3xl" aria-hidden="true"></div>
            <div className="relative z-10">
              <div className="rounded-2xl border border-[#cfdcf6] bg-white overflow-hidden mb-6 shadow-sm">
                <img
                  src={loginSecurityIllustration}
                  alt="Secure voter login with shield and lock protection"
                  className="w-full h-48 object-cover"
                  loading="lazy"
                />
              </div>

              <p className="text-xs uppercase tracking-[0.12em] text-[#4d6794] mb-4">Platform Assurance</p>
              <h2 className="text-3xl sm:text-4xl text-[#132b56] mb-5">Election-grade access controls</h2>
              <p className="text-[#5e7298] leading-relaxed mb-8">
                Session protection, token-based authentication, and single-vote enforcement preserve institutional trust.
              </p>

              <div className="space-y-4">
                <div className="rounded-2xl border border-[#cfdcf6] bg-white p-4">
                  <p className="text-sm font-semibold text-[#17386f] mb-1">Identity Verification</p>
                  <p className="text-sm text-[#60739a]">Only authenticated users can access the ballot interface.</p>
                </div>

                <div className="rounded-2xl border border-[#cfdcf6] bg-white p-4">
                  <p className="text-sm font-semibold text-[#17386f] mb-1">Session Security</p>
                  <p className="text-sm text-[#60739a]">Authenticated state is synced across the app for controlled access.</p>
                </div>

                <div className="rounded-2xl border border-[#cfdcf6] bg-[#1f66f4] p-4">
                  <p className="text-sm font-semibold text-white mb-1">Governance Ready</p>
                  <p className="text-sm text-[#d9e7ff]">A refined citizen experience built for credible public participation.</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
};

export default Login;