import { AlertCircle, ArrowRight, CheckCircle2, LockKeyhole, Mail, ShieldCheck, User, UserPlus } from 'lucide-react';
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../lib/api';
import { setAuthSession } from '../lib/auth';
import signupOnboardingIllustration from '../assets/illustrations/signup-onboarding.svg';

const Signup = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ 
    name: '', 
    email: '', 
    password: '',
    confirmPassword: ''
  });
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

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      const submitData = {
        name: formData.name,
        email: formData.email,
        password: formData.password
      };

      const response = await api.post('/auth/register', submitData);
      const authPayload = response.data;
      setAuthSession(authPayload);
      setSuccess('Account created successfully! Redirecting...');
      const redirectPath = authPayload.role === 'Admin' ? '/manage-candidates' : '/vote';
      setTimeout(() => navigate(redirectPath), 900);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
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
              <ShieldCheck className="w-4 h-4" /> Verified Registration
            </p>
            <h1 className="text-4xl sm:text-5xl text-[#102347] mb-3">Create Voter Account</h1>
            <p className="text-[#5b7095] mb-5">Register once to access your official digital ballot and governance dashboard.</p>

            <div className="flex flex-wrap gap-2 mb-8">
              <span className="metric-pill">Identity Ready</span>
              <span className="metric-pill">Secure Credential</span>
              <span className="metric-pill">Instant Ballot Access</span>
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
                <label htmlFor="name" className="block text-sm font-semibold text-[#183769] mb-2">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6a7ea3]" />
                  <input
                    id="name"
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Your full legal name"
                    required
                    className="form-field form-field-with-icon"
                  />
                </div>
              </div>

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
                    placeholder="At least 6 characters"
                    required
                    className="form-field form-field-with-icon"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-[#183769] mb-2">Confirm Password</label>
                <div className="relative">
                  <LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6a7ea3]" />
                  <input
                    id="confirmPassword"
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Re-enter password"
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
                {loading ? 'Creating account...' : 'Create Account'}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>

            <p className="text-sm text-[#5e7298] mt-6">
              Already registered?{' '}
              <Link to="/login" className="font-semibold text-[#1f66f4] hover:text-[#1149bd] transition">
                Sign in here
              </Link>
            </p>
          </section>

          <aside className="glass-panel p-8 sm:p-10 lg:p-12">
            <div className="rounded-2xl border border-[#cfdcf6] bg-white overflow-hidden mb-6 shadow-sm">
              <img
                src={signupOnboardingIllustration}
                alt="Citizen onboarding and identity verification for voting platform"
                className="w-full h-48 object-cover"
                loading="lazy"
              />
            </div>

            <p className="text-xs uppercase tracking-[0.12em] text-[#4d6794] mb-4">Onboarding Standards</p>
            <h2 className="text-3xl sm:text-4xl text-[#132b56] mb-5">Trusted civic onboarding</h2>
            <p className="text-[#5e7298] leading-relaxed mb-8">
              A mature voting ecosystem starts with clean registration, identity confidence, and fraud-resistant account creation.
            </p>

            <div className="space-y-4">
              <div className="rounded-2xl border border-[#cfdcf6] bg-white p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-[#1f66f4]" />
                  <p className="font-semibold text-[#17386f]">Citizen Identity Ready</p>
                </div>
                <p className="text-sm text-[#60739a]">Users are onboarded before they can access ballots.</p>
              </div>

              <div className="rounded-2xl border border-[#cfdcf6] bg-white p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-[#1f66f4]" />
                  <p className="font-semibold text-[#17386f]">Protected Credentials</p>
                </div>
                <p className="text-sm text-[#60739a]">Passwords are validated before account creation is accepted.</p>
              </div>

              <div className="rounded-2xl border border-[#cfdcf6] bg-white p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-[#1f66f4]" />
                  <p className="font-semibold text-[#17386f]">Direct Ballot Access</p>
                </div>
                <p className="text-sm text-[#60739a]">After registration, users move directly to the secure voting arena.</p>
              </div>

              <div className="rounded-2xl border border-[#bfd1f8] bg-[#1f66f4] p-5 mt-5">
                <div className="flex items-center gap-2 mb-2">
                  <UserPlus className="w-5 h-5 text-white" />
                  <p className="font-semibold text-white">Platform Integrity</p>
                </div>
                <p className="text-sm text-[#d9e7ff]">Reliable onboarding is the first layer of election credibility.</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
};

export default Signup;
