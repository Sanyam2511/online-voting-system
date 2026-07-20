import { AlertCircle, ArrowRight, CheckCircle2, LockKeyhole, Mail, ShieldCheck, User, UserPlus, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import signupOnboardingIllustration from '../assets/illustrations/signup-onboarding.png';


const Signup = () => {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  
  const [formData, setFormData] = useState({ 
    name: '', 
    email: '', 
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
    setValidationErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Custom Validation
    const errors = {};
    if (!formData.name) errors.name = 'Full name is required';
    if (!formData.email) errors.email = 'Email is required';
    else if (!/^\\S+@\\S+\\.\\S+$/.test(formData.email)) errors.email = 'Invalid email format';
    if (!formData.password) errors.password = 'Password is required';
    else if (formData.password.length < 6) errors.password = 'Password must be at least 6 characters';
    if (formData.password !== formData.confirmPassword) errors.confirmPassword = 'Passwords do not match';
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post('/auth/register', formData);
      const authPayload = response.data;
      setUser(authPayload);
      setSuccess('Account created successfully! Redirecting...');
      const redirectPath = authPayload.role === 'Admin'
        ? '/manage-candidates'
        : '/vote';
      setTimeout(() => navigate(redirectPath), 900);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen page-shell pt-20 pb-12">
      <div className="section-wrap">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-8 items-stretch">
          <section className="bento-card p-6 sm:p-7 lg:p-8">
            <p className="eyebrow mb-6">
              <ShieldCheck className="w-4 h-4" /> {'Verified Registration'}
            </p>
            <h1 className="font-display text-2xl sm:text-3xl text-slate-900 mb-3">{'Create Voter Account'}</h1>
            <p className="text-slate-600 mb-5">{'Register once to access your official digital ballot and governance dashboard.'}</p>

            <div className="flex flex-wrap gap-2 mb-8">
              <span className="metric-pill">{'Identity Ready'}</span>
              <span className="metric-pill">{'Secure Credential'}</span>
              <span className="metric-pill">{'Instant Ballot Access'}</span>
            </div>

            {error && (
              <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-emerald-600">{success}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="name" className="block text-sm font-semibold text-slate-700 mb-2">{'Full Name'}</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-700" />
                  <input
                    id="name"
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder={'Your full legal name'}
                    className={`form-field form-field-with-icon ${validationErrors.name ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : ''}`}
                  />
                </div>
                {validationErrors.name && (
                  <p className="mt-1.5 text-sm font-medium text-red-500 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {validationErrors.name}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-2">{'Email Address'}</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-700" />
                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder={'you@example.com'}
                    className={`form-field form-field-with-icon ${validationErrors.email ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : ''}`}
                  />
                </div>
                {validationErrors.email && (
                  <p className="mt-1.5 text-sm font-medium text-red-500 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {validationErrors.email}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-2">{'Password'}</label>
                <div className="relative">
                  <LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-700" />
                  <input
                    id="password"
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder={'At least 6 characters'}
                    className={`form-field form-field-with-icon ${validationErrors.password ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : ''}`}
                  />
                </div>
                {validationErrors.password && (
                  <p className="mt-1.5 text-sm font-medium text-red-500 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {validationErrors.password}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-slate-700 mb-2">{'Confirm Password'}</label>
                <div className="relative">
                  <LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-700" />
                  <input
                    id="confirmPassword"
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder={'Re-enter password'}
                    className={`form-field form-field-with-icon ${validationErrors.confirmPassword ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : ''}`}
                  />
                </div>
                {validationErrors.confirmPassword && (
                  <p className="mt-1.5 text-sm font-medium text-red-500 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {validationErrors.confirmPassword}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-black-pill w-full inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? 'Creating account...' : 'Create Account'}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>

            <p className="text-sm text-slate-600 mt-6">
              {'Already registered?'}{' '}
              <Link to={'/login'} className="font-semibold text-emerald-600 hover:text-slate-700 transition">
                {'Sign in here'}
              </Link>
            </p>
          </section>

          <aside className="bento-card p-6 sm:p-7 lg:p-8">
            <div className="rounded-2xl overflow-hidden mb-6 shadow-sm">
              <img
                src={signupOnboardingIllustration}
                alt={'Citizen onboarding and identity verification for voting platform'}
                className="w-full h-48 object-cover"
                loading="lazy"
              />
            </div>

            <p className="text-xs uppercase tracking-[0.12em] text-slate-600 mb-4">{'Onboarding Standards'}</p>
            <h2 className="font-display text-2xl sm:text-3xl text-slate-900 mb-5">{'Trusted civic onboarding'}</h2>
            <p className="text-slate-600 leading-relaxed mb-8">
              {'A mature voting ecosystem starts with clean registration, identity confidence, and fraud-resistant account creation.'}
            </p>

            <div className="space-y-4">
              <div className="border-slate-200 pb-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <p className="font-semibold text-slate-900">{'Citizen Identity Ready'}</p>
                </div>
                <p className="text-sm text-slate-500">{'Users are onboarded before they can access ballots.'}</p>
              </div>

              <div className="border-slate-200 pb-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <p className="font-semibold text-slate-900">{'Protected Credentials'}</p>
                </div>
                <p className="text-sm text-slate-500">{'Passwords are validated before account creation is accepted.'}</p>
              </div>

              <div className="border-slate-200 pb-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <p className="font-semibold text-slate-900">{'Direct Ballot Access'}</p>
                </div>
                <p className="text-sm text-slate-500">{'After registration, users move directly to the secure voting arena.'}</p>
              </div>

              <div className="pt-2">
                <div className="flex items-center gap-2 mb-2">
                  <UserPlus className="w-5 h-5 text-emerald-600" />
                  <p className="font-semibold text-emerald-600">{'Platform Integrity'}</p>
                </div>
                <p className="text-sm text-slate-500">{'Reliable onboarding is the first layer of election credibility.'}</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
};

export default Signup;
