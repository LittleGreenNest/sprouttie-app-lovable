import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import sprouttielogo from '../../assets/sprouttie-logo.png';

const fade = { hidden: { opacity: 0, y: 16 }, visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4 } }) };

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, signInWithGoogle, loading, error, setError, currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) navigate('/dashboard', { replace: true });
  }, [currentUser, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError('Please enter both email and password'); return; }
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      // error set in context
    }
  };

  const handleGoogleSignIn = async () => {
    try { await signInWithGoogle(); } catch (err) { /* error set in context */ }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-5 py-12 font-body">
      <div className="w-full max-w-md">

        {/* Logo */}
        <motion.div variants={fade} initial="hidden" animate="visible" className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <img src={sprouttielogo} alt="Sprouttie" className="h-10 -scale-x-100" />
            <span className="font-display text-2xl text-[hsl(var(--sprouttie-green-dark))]">Sprouttie</span>
          </Link>
          <h1 className="font-display text-2xl text-[hsl(var(--sprouttie-ink))] mt-5 mb-1">Welcome back</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            No account?{' '}
            <Link to="/signup" className="font-medium text-[hsl(var(--sprouttie-green-dark))] hover:underline">
              Sign up free
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
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-[hsl(var(--sprouttie-ink))]" htmlFor="password">
                  Password
                </label>
                <Link to="/forgot-password" className="text-xs text-[hsl(var(--sprouttie-green-dark))] hover:underline">
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[hsl(var(--border))] bg-white/70 text-[hsl(var(--foreground))] text-sm placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--sprouttie-green)/0.4)] focus:border-[hsl(var(--sprouttie-green))] transition-all"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[hsl(var(--sprouttie-green))] hover:bg-[hsl(var(--sprouttie-green-dark))] text-white font-semibold text-sm transition-all duration-250 shadow-[var(--shadow-md)] hover:shadow-[var(--shadow-lg)] hover:-translate-y-px disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[hsl(var(--border))]" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 bg-white/80 text-xs text-[hsl(var(--muted-foreground))]">or continue with</span>
            </div>
          </div>

          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-[hsl(var(--border))] bg-white/70 hover:bg-white text-sm font-medium text-[hsl(var(--foreground))] transition-all duration-250 disabled:opacity-60"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in with Google
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
