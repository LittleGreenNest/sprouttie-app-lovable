//src/components/subscription/Plans.js
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../supabaseClient';
import WaitlistForm from '../WaitlistForm';

const SERVER_URL =
  process.env.REACT_APP_BACKEND_URL ||
  (window.location.hostname === 'localhost' ? 'http://localhost:5001' : '');


console.log('SERVER_URL →', SERVER_URL);

const plans = [
  {
    name: 'Free',
    priceMonthly: '$0',
    priceYearly: '$0',
    description: 'Get started with the basics',
    features: ['100 flashcards', 'Sample story access', 'Organize flashcard folders'],
    planKey: 'free',
    buttonText: 'Get Started',
  },
  {
    name: 'Print Plan',
    priceMonthly: '$1',
    priceYearly: '$10',
    description: 'Perfect for offline studying',
    features: ['Everything in Free', 'Printable PDF Flashcards', 'PDF export formats'],
    planKey: 'print',
    buttonText: 'Subscribe',
  },
  {
    name: 'Pro Sprout',
    priceMonthly: '$3',
    priceYearly: '$30',
    description: 'Full access and unlimited AI stories',
    features: ['Everything in Print Plan', 'Unlimited story generation', 'Save flash history', 'Collaborate with parents'],
    planKey: 'pro',
    buttonText: 'Join Waitlist',
  }
];

export default function Plans() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [userPlan, setUserPlan] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [showFreeConfirm, setShowFreeConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const isCurrentPlan = (dbPlan, cardKey) => {
    const alias = { pdf: 'print', print: 'print', free: 'free', pro: 'pro' };
    return (alias[dbPlan] || dbPlan) === cardKey;
  };

  // Function to fetch user plan - useCallback to fix ESLint warning
  const fetchUserPlan = useCallback(async () => {
    if (!currentUser) return;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('plan, subscription_status')
      .eq('id', currentUser.id)
      .single();
      
    if (error) {
      console.error('Error fetching user plan:', error);
      return;
    }
    
    if (data) {
      console.log('User plan fetched:', data);
      setUserPlan(data.plan);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchUserPlan();
  }, [fetchUserPlan]);

  // UX niceties for modals
  useEffect(() => {
    if (showWaitlist || showFreeConfirm) {
      document.body.style.overflow = 'hidden';
      const onKey = (e) => {
        if (e.key === 'Escape') {
          setShowWaitlist(false);
          setShowFreeConfirm(false);
        }
      };
      window.addEventListener('keydown', onKey);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', onKey);
      };
    }
  }, [showWaitlist, showFreeConfirm]);

  // Start Stripe Checkout - require auth for paid plans
  const handleSubscribe = async (plan) => {
    if (!currentUser) {
      alert('Please log in to subscribe to a plan.');
      navigate('/login');
      return;
    }

    setLoading(true);
    try {
      const identifiers = { userId: currentUser.id, email: currentUser.email };

      console.log('Creating checkout session for:', { plan, ...identifiers });

      const res = await fetch(`${SERVER_URL}/create-checkout-session`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ plan, userId: currentUser.id, email: currentUser.email })
});


      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `HTTP ${res.status}`);
      }
      
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'No checkout URL returned');
      }
    } catch (e) {
      console.error('Subscription error:', e);
      alert(`Failed to start subscription: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle downgrade to free plan
  const handleDowngradeToFree = async () => {
    if (!currentUser) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ plan: 'free', subscription_status: 'canceled' })
        .eq('id', currentUser.id);

      if (error) throw error;

      setUserPlan('free');
      setShowFreeConfirm(false);
      alert('Your plan has been changed to Free.');
      navigate('/profile');
    } catch (error) {
      console.error('Error downgrading plan:', error);
      alert('Error changing plan. Please try again.');
    }
  };

  const onPlanClick = (planKey) => {
    if (loading) return;
    
    if (planKey === 'free') {
      if (!currentUser) {
        navigate('/signup');
        return;
      }
      // If they're already on free, do nothing
      if (userPlan === 'free') {
        return;
      }
      // Show confirmation for downgrade
      setShowFreeConfirm(true);
      return;
    }
    
    if (planKey === 'print') {
      return handleSubscribe('print');
    }
    
    if (planKey === 'pro') {
      setShowWaitlist(true);
      if (window.gtag) window.gtag('event', 'open_waitlist_modal', { source: 'plans_modal' });
      if (window.fbq) window.fbq('trackCustom', 'OpenWaitlistModal', { source: 'plans_modal' });
    }
  };

  return (
    <div className="bg-gray-50 py-16 px-6 sm:px-8 lg:px-24">
      <div className="max-w-6xl mx-auto text-center">
        <h2 className="text-4xl font-bold text-green-800 mb-4">Choose Your Plan</h2>
        <p className="text-lg text-gray-600 mb-12">
          {currentUser 
            ? 'Upgrade your learning experience or manage your current subscription.' 
            : 'Start your learning journey with Sprouttie. Sign up to get started!'
          }
        </p>

        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan) => {
            const isCurrent = currentUser && isCurrentPlan(userPlan, plan.planKey);
            const isDowngrade = currentUser && userPlan && (
              (userPlan === 'pro' && plan.planKey !== 'pro') ||
              (userPlan === 'print' && plan.planKey === 'free')
            );
            
            return (
              <div
                key={plan.planKey}
                className={`bg-white rounded-lg overflow-hidden transition-all duration-300 hover:shadow-lg p-8 flex flex-col justify-between ${
                  isCurrent ? 'ring-2 ring-green-500' : ''
                }`}
              >
                <div>
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-gray-600 mb-4">{plan.description}</p>
                  <div className="text-3xl font-bold mb-4">
                    {billingCycle === 'monthly' ? plan.priceMonthly : plan.priceYearly}
                    <span className="text-lg font-normal text-gray-500">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                  </div>
                  <ul className="space-y-3 mb-8 text-left">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start">
                        <svg className="h-5 w-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {isCurrent ? (
                  <button
                    disabled
                    className="w-full py-2 rounded-md font-medium text-green-700 bg-green-100 cursor-not-allowed"
                  >
                    Current Plan
                  </button>
                ) : (
                  <button
                    onClick={() => onPlanClick(plan.planKey)}
                    disabled={loading}
                    className={`w-full py-2 rounded-md font-medium transition-colors mt-auto ${
                      loading 
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : isDowngrade
                        ? 'bg-orange-600 hover:bg-orange-700 text-white'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  >
                    {loading ? 'Processing...' : isDowngrade ? 'Downgrade' : plan.buttonText}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6">
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              checked={billingCycle === 'yearly'}
              onChange={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
              className="form-checkbox text-green-600"
            />
            <span className="ml-2 text-gray-700">Bill yearly (Save 17%!)</span>
          </label>
        </div>

        {currentUser && (
          <div className="mt-8">
            <button
              onClick={() => navigate('/profile')}
              className="text-green-600 hover:text-green-500 text-sm font-medium"
            >
              ← Back to Profile
            </button>
          </div>
        )}
      </div>

      {/* Waitlist modal */}
      {showWaitlist && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-label="Join Pro Plan Waitlist"
          onClick={() => setShowWaitlist(false)}
        >
          <div
            className="relative w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <WaitlistForm onClose={() => setShowWaitlist(false)} />
          </div>
        </div>
      )}

      {/* Free plan confirmation modal */}
      {showFreeConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowFreeConfirm(false)}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Downgrade</h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to downgrade to the Free plan? You'll lose access to premium features like printable PDFs and unlimited story generation.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowFreeConfirm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDowngradeToFree}
                className="px-4 py-2 bg-orange-600 text-white rounded-md text-sm font-medium hover:bg-orange-700"
              >
                Yes, Downgrade to Free
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}