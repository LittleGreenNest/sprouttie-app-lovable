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
  description 
}) => {
  const planName = PLAN_NAMES[requiredPlan] || 'Print Plan';
  
  return (
    <div className="bg-white rounded-lg shadow-md p-8 text-center max-w-md mx-auto">
      <div className="text-6xl mb-4">🔒</div>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">
        {title || `${feature} - Premium Feature`}
      </h2>
      <p className="text-gray-600 mb-6">
        {description || `Upgrade to ${planName} or higher to access this feature.`}
      </p>
      <div className="space-y-3">
        <button
          onClick={() => window.location.href = '/plans'}
          className="w-full px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
        >
          View Plans & Upgrade
        </button>
        <button
          onClick={() => window.location.href = '/dashboard'}
          className="w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
};

export default usePlanAccess;
