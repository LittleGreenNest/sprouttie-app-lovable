import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../integrations/supabase/client';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import WaitlistForm from '../WaitlistForm';

const PLANS = [
  {
    name: 'Free',
    priceMonthly: 'Free',
    priceYearly: 'Free',
    description: 'Get started with the basics',
    features: ['Up to 100 flashcards', 'Flash history', 'Organise flashcard folders', 'Session logging', '3 PDF prints/month'],
    planKey: 'free',
    buttonText: 'Get Started',
  },
  {
    name: 'Print Plan',
    priceMonthly: 'SGD 3',
    priceYearly: 'SGD 29',
    description: 'For offline learners',
    features: ['Everything in Free', 'Unlimited flashcards', 'Printable PDF flashcards', 'Multiple PDF export formats'],
    planKey: 'print',
    buttonText: 'Subscribe',
    badge: 'Most Popular',
    highlight: true,
  },
  {
    name: 'Pro Sprout',
    priceMonthly: 'SGD 7',
    priceYearly: 'SGD 59',
    description: 'Premium for growing families',
    features: ['Everything in Print Plan', 'Multi-child profiles', 'Voice training for parents', 'Unlimited AI story generation', 'Priority support'],
    planKey: 'pro',
    buttonText: 'Join Waitlist',
  },
];

const fade = {
  hidden: { opacity: 0, y: 16 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4 } }),
};

export default function Plans() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [userPlan, setUserPlan] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [loading, setLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const isCurrentPlan = (dbPlan, cardKey) => {
    const alias = { pdf: 'print', print: 'print', free: 'free', pro: 'pro' };
    return (alias[dbPlan] || dbPlan) === cardKey;
  };

  const isPaidPlan = (dbPlan) => dbPlan && dbPlan !== 'free';

  const fetchUserPlan = useCallback(async () => {
    if (!currentUser) return;
    const { data, error } = await supabase
      .from('profiles')
      .select('plan, subscription_status')
      .eq('id', currentUser.id)
      .single();
    if (!error && data) setUserPlan(data.plan);
  }, [currentUser]);

  useEffect(() => { fetchUserPlan(); }, [fetchUserPlan]);

  useEffect(() => {
    if (showWaitlist) {
      document.body.style.overflow = 'hidden';
      const onKey = (e) => { if (e.key === 'Escape') setShowWaitlist(false); };
      window.addEventListener('keydown', onKey);
      return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey); };
    }
  }, [showWaitlist]);

  const handleSubscribe = async (planKey) => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    setLoading(true);
    try {
      const priceIds = {
        print: { monthly: 'price_1TV5x9EVoum0YBjstZUa3WSq', yearly: 'price_1TV5yoEVoum0YBjseEsQMVBY' },
      };
      const priceId = priceIds[planKey]?.[billingCycle];
      if (!priceId) throw new Error('Invalid plan or billing cycle');

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId, planKey },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (e) {
      toast.error(`Failed to start subscription: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!currentUser) return;
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No portal URL returned');
      }
    } catch (e) {
      toast.error('Could not open billing portal. Please contact support.');
    } finally {
      setPortalLoading(false);
    }
  };

  const onPlanClick = (planKey) => {
    if (loading || portalLoading) return;

    if (planKey === 'free') {
      if (!currentUser) { navigate('/signup'); return; }
      if (isCurrentPlan(userPlan, 'free')) return;
      // Downgrade: send to Stripe portal to cancel
      handleManageSubscription();
      return;
    }

    if (planKey === 'print') {
      if (!currentUser) { navigate('/login'); return; }
      if (isPaidPlan(userPlan)) {
        // Already on a paid plan — send to portal to manage
        handleManageSubscription();
        return;
      }
      handleSubscribe('print');
      return;
    }

    if (planKey === 'pro') {
      setShowWaitlist(true);
      if (window.gtag) window.gtag('event', 'open_waitlist_modal', { source: 'plans_modal' });
      if (window.fbq) window.fbq('trackCustom', 'OpenWaitlistModal', { source: 'plans_modal' });
    }
  };

  const getButtonLabel = (plan) => {
    if (loading && plan.planKey !== 'pro') return 'Processing…';
    if (portalLoading) return 'Opening portal…';
    if (currentUser && isCurrentPlan(userPlan, plan.planKey)) return 'Current Plan';
    if (plan.planKey === 'free' && currentUser && isPaidPlan(userPlan)) return 'Downgrade';
    if (plan.planKey === 'print' && currentUser && isPaidPlan(userPlan) && !isCurrentPlan(userPlan, 'print')) return 'Switch Plan';
    return plan.buttonText;
  };

  const isCurrent = (plan) => currentUser && isCurrentPlan(userPlan, plan.planKey);
  const isDowngrade = (plan) => currentUser && plan.planKey === 'free' && isPaidPlan(userPlan);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(var(--sprouttie-cream))] via-white to-[hsl(var(--sprouttie-mint))] py-16 px-5 font-body">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <motion.div variants={fade} initial={false} animate="visible" className="text-center mb-10">
          <span className="text-xs font-semibold tracking-widest uppercase text-[hsl(var(--sprouttie-coral-dark))] bg-[hsl(var(--sprouttie-coral-light)/0.5)] px-3.5 py-1.5 rounded-full border border-[hsl(var(--sprouttie-coral-light))]">
            Pricing
          </span>
          <h1 className="font-display text-4xl sm:text-5xl text-[hsl(var(--sprouttie-ink))] mt-5 mb-3">
            Choose your plan
          </h1>
          <p className="text-[hsl(var(--muted-foreground))] text-base max-w-md mx-auto">
            {currentUser
              ? 'Manage or upgrade your Sprouttie subscription.'
              : "Start free, upgrade when you're ready."}
          </p>
        </motion.div>

        {/* Billing toggle */}
        <motion.div variants={fade} initial={false} animate="visible" custom={1} className="flex items-center justify-center gap-3 mb-10">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              billingCycle === 'monthly'
                ? 'bg-[hsl(var(--sprouttie-green))] text-white shadow-sm'
                : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--sprouttie-ink))]'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
              billingCycle === 'yearly'
                ? 'bg-[hsl(var(--sprouttie-green))] text-white shadow-sm'
                : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--sprouttie-ink))]'
            }`}
          >
            Yearly
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              billingCycle === 'yearly' ? 'bg-white/20' : 'bg-[hsl(var(--sprouttie-coral-light))] text-[hsl(var(--sprouttie-coral-dark))]'
            }`}>
              Save 17%
            </span>
          </button>
        </motion.div>

        {/* Plan cards */}
        <div className="grid md:grid-cols-3 gap-5">
          {PLANS.map((plan, i) => {
            const current = isCurrent(plan);
            const downgrade = isDowngrade(plan);
            return (
              <motion.div
                key={plan.planKey}
                variants={fade}
                initial={false}
                animate="visible"
                custom={i + 2}
                className={`relative rounded-2xl p-7 flex flex-col transition-all duration-300 ${
                  plan.highlight
                    ? 'bg-[hsl(var(--sprouttie-ink))] text-white shadow-xl ring-2 ring-[hsl(var(--sprouttie-green))]'
                    : 'glass hover:shadow-[var(--shadow-lg)]'
                } ${current && !plan.highlight ? 'ring-2 ring-[hsl(var(--sprouttie-green))]' : ''}`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-[hsl(var(--sprouttie-green))] text-white text-xs font-bold px-3 py-1 rounded-full">
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div className="flex-1">
                  <h3 className={`font-display text-xl mb-1 ${plan.highlight ? 'text-white' : 'text-[hsl(var(--sprouttie-ink))]'}`}>
                    {plan.name}
                  </h3>
                  <p className={`text-sm mb-5 ${plan.highlight ? 'text-white/60' : 'text-[hsl(var(--muted-foreground))]'}`}>
                    {plan.description}
                  </p>

                  <div className="mb-6">
                    <span className={`font-display text-4xl font-bold ${plan.highlight ? 'text-white' : 'text-[hsl(var(--sprouttie-ink))]'}`}>
                      {billingCycle === 'monthly' ? plan.priceMonthly : plan.priceYearly}
                    </span>
                    <span className={`text-sm ml-1 ${plan.highlight ? 'text-white/50' : 'text-[hsl(var(--muted-foreground))]'}`}>
                      /{billingCycle === 'monthly' ? 'mo' : 'yr'}
                    </span>
                  </div>

                  <ul className="space-y-2.5 mb-8">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <svg className={`h-4 w-4 mt-0.5 flex-shrink-0 ${plan.highlight ? 'text-[hsl(var(--sprouttie-green-light))]' : 'text-[hsl(var(--sprouttie-green))]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                        </svg>
                        <span className={`text-sm ${plan.highlight ? 'text-white/80' : 'text-[hsl(var(--foreground))]'}`}>
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => onPlanClick(plan.planKey)}
                  disabled={current || loading || portalLoading}
                  className={`w-full py-3 rounded-xl font-semibold text-sm transition-all duration-250 ${
                    current
                      ? plan.highlight
                        ? 'bg-white/10 text-white/50 cursor-not-allowed'
                        : 'bg-[hsl(var(--sprouttie-green)/0.1)] text-[hsl(var(--sprouttie-green-dark))] cursor-not-allowed'
                      : downgrade
                      ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                      : plan.highlight
                      ? 'bg-[hsl(var(--sprouttie-green))] text-white hover:bg-[hsl(var(--sprouttie-green-dark))] shadow-lg hover:shadow-xl hover:-translate-y-px'
                      : 'bg-[hsl(var(--sprouttie-ink))] text-white hover:opacity-90'
                  }`}
                >
                  {current ? 'Current Plan' : getButtonLabel(plan)}
                </button>
              </motion.div>
            );
          })}
        </div>

        {/* Manage billing link for paid users */}
        {currentUser && isPaidPlan(userPlan) && (
          <motion.div variants={fade} initial={false} animate="visible" custom={6} className="mt-8 text-center">
            <button
              onClick={handleManageSubscription}
              disabled={portalLoading}
              className="text-sm text-[hsl(var(--sprouttie-green-dark))] hover:underline font-medium"
            >
              {portalLoading ? 'Opening billing portal…' : 'Manage billing & invoices →'}
            </button>
          </motion.div>
        )}

        {currentUser && (
          <motion.div variants={fade} initial={false} animate="visible" custom={7} className="mt-4 text-center">
            <button onClick={() => navigate('/profile')} className="text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--sprouttie-ink))]">
              ← Back to Profile
            </button>
          </motion.div>
        )}
      </div>

      {/* Waitlist modal */}
      {showWaitlist && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowWaitlist(false)}
        >
          <div className="relative w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <WaitlistForm onClose={() => setShowWaitlist(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
