// src/hooks/usePlanAccess.jsx
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '../context/AuthContext';

// Plan hierarchy and feature access configuration
export const PLANS = {
  free: 'free',
  print: 'print',
  pro: 'pro',
};

// Feature access by plan
export const PLAN_FEATURES = {
  free: {
    maxFlashcards: 50,
    pdfExport: false,
    aiStories: false,
    voiceTraining: false,
    multiChild: false,
    prioritySupport: false,
    unlimitedStories: false,
    saveHistory: true,
  },
  print: {
    maxFlashcards: Infinity,
    pdfExport: true,
    aiStories: false,
    voiceTraining: false,
    multiChild: false,
    prioritySupport: false,
    unlimitedStories: false,
    saveHistory: true,
  },
  pro: {
    maxFlashcards: Infinity,
    pdfExport: true,
    aiStories: true,
    voiceTraining: true,
    multiChild: true,
    prioritySupport: true,
    unlimitedStories: true,
    saveHistory: true,
  },
};

// Plan display names
export const PLAN_NAMES = {
  free: 'Free',
  print: 'Print Plan',
  pro: 'Pro Sprout',
};

export const usePlanAccess = () => {
  const { currentUser } = useAuth();
  const [userPlan, setUserPlan] = useState('free');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUserPlan = useCallback(async () => {
    if (!currentUser) {
      setUserPlan('free');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('plan')
        .eq('id', currentUser.id)
        .single();

      if (fetchError) {
        console.error('Error fetching user plan:', fetchError);
        setError(fetchError.message);
        setUserPlan('free');
      } else if (data) {
        setUserPlan(data.plan || 'free');
      }
    } catch (err) {
      console.error('Error in fetchUserPlan:', err);
      setError(err.message);
      setUserPlan('free');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchUserPlan();
  }, [fetchUserPlan]);

  // Get features for current plan
  const getFeatures = useCallback(() => {
    return PLAN_FEATURES[userPlan] || PLAN_FEATURES.free;
  }, [userPlan]);

  // Check if user has access to a specific feature
  const hasFeature = useCallback((featureName) => {
    const features = getFeatures();
    return features[featureName] ?? false;
  }, [getFeatures]);

  // Check if user can add more flashcards
  const canAddFlashcards = useCallback((currentCount) => {
    const features = getFeatures();
    return currentCount < features.maxFlashcards;
  }, [getFeatures]);

  // Get remaining flashcard slots
  const getRemainingFlashcardSlots = useCallback((currentCount) => {
    const features = getFeatures();
    if (features.maxFlashcards === Infinity) return Infinity;
    return Math.max(0, features.maxFlashcards - currentCount);
  }, [getFeatures]);

  // Check if current plan is at least a certain level
  const isPlanAtLeast = useCallback((requiredPlan) => {
    const planHierarchy = ['free', 'print', 'pro'];
    const currentIndex = planHierarchy.indexOf(userPlan);
    const requiredIndex = planHierarchy.indexOf(requiredPlan);
    return currentIndex >= requiredIndex;
  }, [userPlan]);

  // Get plan display name
  const getPlanName = useCallback(() => {
    return PLAN_NAMES[userPlan] || 'Free';
  }, [userPlan]);

  return {
    userPlan,
    loading,
    error,
    hasFeature,
    canAddFlashcards,
    getRemainingFlashcardSlots,
    isPlanAtLeast,
    getPlanName,
    getFeatures,
    refreshPlan: fetchUserPlan,
  };
};

// Upgrade prompt component for locked features
export const UpgradePrompt = ({
  feature,
  requiredPlan = 'print',
  title,
  description,
}) => {
  const planName = PLAN_NAMES[requiredPlan] || 'Print Plan';

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 font-body">
      <div className="glass rounded-2xl p-8 text-center max-w-sm w-full shadow-[var(--shadow-lg)]">
        <div className="text-5xl mb-4">🌱</div>
        <h2 className="font-display text-2xl text-[hsl(var(--sprouttie-ink))] mb-2">
          {title || `${feature}`}
        </h2>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">
          {description || `Upgrade to ${planName} or higher to unlock this feature.`}
        </p>
        <div className="space-y-3">
          <a
            href="/plans"
            className="block w-full py-3 rounded-xl bg-[hsl(var(--sprouttie-green))] hover:bg-[hsl(var(--sprouttie-green-dark))] text-white font-semibold text-sm transition-all"
          >
            View plans & upgrade
          </a>
          <a
            href="/dashboard"
            className="block w-full py-3 rounded-xl border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--sprouttie-ink))] text-sm transition-all"
          >
            Back to dashboard
          </a>
        </div>
      </div>
    </div>
  );
};

export default usePlanAccess;
