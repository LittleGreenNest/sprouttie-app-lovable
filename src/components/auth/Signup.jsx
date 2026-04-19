import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import sprouttielogo from '../../assets/sprouttie-logo.png';

const fade = { hidden: { opacity: 0, y: 16 }, visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4 } }) };

const PasswordStrengthIndicator = ({ password }) => {
  const requirements = useMemo(() => [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'Contains a number', met: /\d/.test(password) },
    { label: 'Contains a special character', met: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
    { label: 'Contains uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'Contains lowercase letter', met: /[a-z]/.test(password) },
  ], [password]);

  const strength = requirements.filter(r => r.met).length;
  const strengthLabel = strength <= 2 ? 'Weak' : strength <= 4 ? 'Medium' : 'Strong';
  const barColor = strength <= 2 ? 'bg-red-400' : strength <= 4 ? 'bg-amber-400' : 'bg-[hsl(var(--sprouttie-green))]';

  if (!password) return null;

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= strength ? barColor : 'bg-[hsl(var(--border))]'}`} />
        ))}
      </div>
      <p className={`text-xs font-medium ${strength <= 2 ? 'text-red-500' : strength <= 4 ? 'text-amber-600' : 'text-[hsl(var(--sprouttie-green-dark))]'}`}>
        Password strength: {strengthLabel}
      </p>
      <ul className="space-y-1">
        {requirements.map((req, i) => (
          <li key={i} className="flex items-center gap-2 text-xs">
            {req.met
              ? <Check className="h-3 w-3 text-[hsl(var(--sprouttie-green))]" />
              : <X className="h-3 w-3 text-[hsl(var(--muted-foreground))]" />}
            <span className={req.met ? 'text-[hsl(var(--sprouttie-green-dark))]' : 'text-[hsl(var(--muted-foreground))]'}>{req.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

const validatePassword = (password) => {
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!/\d/.test(password)) return 'Password must contain a number';
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return 'Password must contain a special character';
  if (!/[A-Z]/.test(password)) return 'Password must contain an uppercase letter';
  if (!/[a-z]/.test(password)) return 'Password must contain a lowercase letter';
  return null;
};

const Signup = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const { signup, loading, error, setError, currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) navigate('/dashboard', { replace: true });
  }, [currentUser, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password || !confirmPassword) { setError('Please fill in all fields'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    const pwError = validatePassword(password);
    if (pwError) { setError(pwError); return; }
    if (!agreeToTerms) { setError('You must agree to the terms and conditions'); return; }
    try {
      await signup(email, password, name);
      navigate('/dashboard');
    } catch (err) {
      // error set in context
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[hsl(var(--sprouttie-cream))] via-white to-[hsl(var(--sprouttie-mint))] px-5 py-12 font-body">
      <div className="w-full max-w-md">

        {/* Logo */}
        <motion.div variants={fade} initial="hidden" animate="visible" className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <img src={sprouttielogo} alt="Sprouttie" className="h-10 -scale-x-100" />
            <span className="font-display text-2xl text-[hsl(var(--sprouttie-green-dark))]">Sprouttie</span>
          </Link>
          <h1 className="font-display text-2xl text-[hsl(var(--sprouttie-ink))] mt-5 mb-1">Create your account</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Already have one?{' '}
            <Link to="/login" className="font-medium text-[hsl(var(--sprouttie-green-dark))] hover:underline">
              Sign in
            </Link>
          </p>
        </motion.div>

        {/* Card */}
        <motion.div variants={fade} initial="hidden" animate="visible" custom={1} className="glass rounded-2xl p-7 shadow-[var(--shadow-lg)]">

          {error && (
            <div className="mb-4 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[hsl(var(--sprouttie-ink))] mb-1.5" htmlFor="name">
                Full name
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[hsl(var(--border))] bg-white/70 text-[hsl(var(--foreground))] text-sm placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--sprouttie-green)/0.4)] focus:border-[hsl(var(--sprouttie-green))] transition-all"
                placeholder="Your name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[hsl(var(--sprouttie-ink))] mb-1.5" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[hsl(var(--border))] bg-white/70 text-[hsl(var(--foreground))] text-sm placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--sprouttie-green)/0.4)] focus:border-[hsl(var(--sprouttie-green))] transition-all"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[hsl(var(--sprouttie-ink))] mb-1.5" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[hsl(var(--border))] bg-white/70 text-[hsl(var(--foreground))] text-sm placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--sprouttie-green)/0.4)] focus:border-[hsl(var(--sprouttie-green))] transition-all"
                placeholder="Create a password"
              />
              <PasswordStrengthIndicator password={password} />
            </div>

            <div>
              <label className="block text-sm font-medium text-[hsl(var(--sprouttie-ink))] mb-1.5" htmlFor="confirm-password">
                Confirm password
              </label>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[hsl(var(--border))] bg-white/70 text-[hsl(var(--foreground))] text-sm placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--sprouttie-green)/0.4)] focus:border-[hsl(var(--sprouttie-green))] transition-all"
                placeholder="Repeat your password"
              />
            </div>

            <div className="flex items-start gap-2.5 pt-1">
              <input
                id="agree-terms"
                type="checkbox"
                checked={agreeToTerms}
                onChange={(e) => setAgreeToTerms(e.target.checked)}
                required
                className="mt-0.5 h-4 w-4 rounded text-[hsl(var(--sprouttie-green))] border-[hsl(var(--border))] focus:ring-[hsl(var(--sprouttie-green)/0.4)]"
              />
              <label htmlFor="agree-terms" className="text-sm text-[hsl(var(--muted-foreground))]">
                I agree to the{' '}
                <Link to="/terms" className="text-[hsl(var(--sprouttie-green-dark))] hover:underline font-medium">Terms</Link>
                {' '}and{' '}
                <Link to="/privacy" className="text-[hsl(var(--sprouttie-green-dark))] hover:underline font-medium">Privacy Policy</Link>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[hsl(var(--sprouttie-green))] hover:bg-[hsl(var(--sprouttie-green-dark))] text-white font-semibold text-sm transition-all duration-250 shadow-[var(--shadow-md)] hover:shadow-[var(--shadow-lg)] hover:-translate-y-px disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account…' : 'Create account — it\'s free'}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default Signup;
