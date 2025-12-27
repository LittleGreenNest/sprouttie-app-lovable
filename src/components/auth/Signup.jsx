// src/components/auth/Signup.js
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { Check, X } from 'lucide-react';

const PasswordStrengthIndicator = ({ password }) => {
  const requirements = useMemo(() => [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'Contains a number', met: /\d/.test(password) },
    { label: 'Contains a special character (!@#$%^&*)', met: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
    { label: 'Contains uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'Contains lowercase letter', met: /[a-z]/.test(password) },
  ], [password]);

  const strength = requirements.filter(r => r.met).length;
  const strengthLabel = strength <= 2 ? 'Weak' : strength <= 4 ? 'Medium' : 'Strong';
  const strengthColor = strength <= 2 ? 'bg-red-500' : strength <= 4 ? 'bg-yellow-500' : 'bg-green-500';

  if (!password) return null;

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded ${i <= strength ? strengthColor : 'bg-gray-200'}`}
          />
        ))}
      </div>
      <p className={`text-xs font-medium ${strength <= 2 ? 'text-red-600' : strength <= 4 ? 'text-yellow-600' : 'text-green-600'}`}>
        Password strength: {strengthLabel}
      </p>
      <ul className="space-y-1">
        {requirements.map((req, i) => (
          <li key={i} className="flex items-center gap-2 text-xs">
            {req.met ? (
              <Check className="h-3 w-3 text-green-600" />
            ) : (
              <X className="h-3 w-3 text-gray-400" />
            )}
            <span className={req.met ? 'text-green-700' : 'text-gray-500'}>{req.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

const validatePassword = (password) => {
  const errors = [];
  if (password.length < 8) errors.push('Password must be at least 8 characters');
  if (!/\d/.test(password)) errors.push('Password must contain a number');
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) errors.push('Password must contain a special character');
  if (!/[A-Z]/.test(password)) errors.push('Password must contain an uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('Password must contain a lowercase letter');
  return errors;
};

const Signup = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const { signup, loading, error, setError, currentUser } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (currentUser) {
      navigate('/dashboard', { replace: true });
    }
  }, [currentUser, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    // Password strength validation
    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0) {
      setError(passwordErrors[0]);
      return;
    }
    
    if (!agreeToTerms) {
      setError('You must agree to the terms and conditions');
      return;
    }
    
    try {
      await signup(email, password, name);
      navigate('/dashboard'); // Redirect to dashboard after signup
    } catch (err) {
      console.error('Signup error:', err);
      // Error is set in the context
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold text-green-800">
            Create a Sprouttie Account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link to="/login" className="font-medium text-green-600 hover:text-green-500">
              sign in to your existing account
            </Link>
          </p>
        </div>
        
        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">{error}</h3>
              </div>
            </div>
          </div>
        )}
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="name" className="sr-only">
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="email-address" className="sr-only">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <PasswordStrengthIndicator password={password} />
            </div>
            <div className="mt-3">
              <label htmlFor="confirm-password" className="sr-only">
                Confirm Password
              </label>
              <input
                id="confirm-password"
                name="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center">
            <input
              id="agree-terms"
              name="agree-terms"
              type="checkbox"
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              checked={agreeToTerms}
              onChange={(e) => setAgreeToTerms(e.target.checked)}
              required
            />
            <label htmlFor="agree-terms" className="ml-2 block text-sm text-gray-900">
              I agree to the{' '}
              <Link to="/terms" className="font-medium text-green-600 hover:text-green-500">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link to="/privacy" className="font-medium text-green-600 hover:text-green-500">
                Privacy Policy
              </Link>
            </label>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${
                loading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </div>
          
        </form>
      </div>
    </div>
  );
};

export default Signup;