import React from 'react';
import { AlertCircle, X, ArrowLeft } from 'lucide-react';

const DowngradeReview = ({ currentPlan, onCancel, onConfirm, loading }) => {
  // Define what features are lost when downgrading to free
  const getFeatureLosses = () => {
    const losses = {
      print: {
        usageLimits: [
          { text: "Unlimited flashcards", newLimit: "50 flashcards max" },
          { text: "Unlimited PDF exports", newLimit: "No PDF exports" },
        ],
        features: [
          { text: "Printable PDF Flashcards" },
          { text: "Multiple PDF export formats" },
          { text: "Bulk flashcard creation" },
        ],
      },
      pro: {
        usageLimits: [
          { text: "Unlimited flashcards", newLimit: "50 flashcards max" },
          { text: "Unlimited AI story generation", newLimit: "Sample story access only" },
          { text: "Unlimited PDF exports", newLimit: "No PDF exports" },
        ],
        features: [
          { text: "Multi-child profiles" },
          { text: "Voice training for parents" },
          { text: "AI-powered story generation" },
          { text: "Printable PDF Flashcards" },
          { text: "Multiple PDF export formats" },
        ],
        support: [
          { text: "Priority support", newLevel: "Standard community support" },
        ],
      },
    };

    return losses[currentPlan] || losses.print;
  };

  const featureLosses = getFeatureLosses();
  const planName = currentPlan === 'pro' ? 'Pro Sprout' : 'Print Plan';

  return (
    <div className="bg-white rounded-2xl shadow-lg max-w-2xl w-full mx-4 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="text-slate-400">1. Select plan</span>
            <span className="text-slate-300">›</span>
            <span className="font-medium text-slate-900">2. Review changes</span>
            <span className="text-slate-300">›</span>
            <span className="text-slate-400">3. Confirm</span>
          </div>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-8">
        <h2 className="text-2xl font-semibold text-slate-900 mb-6">
          Before you downgrade, review what changes
        </h2>

        {/* Warning Banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-900">
                You'll lose access to {planName} features
              </p>
              <p className="text-sm text-amber-700 mt-1">
                Your existing flashcards will be preserved, but you won't be able to add more than 50 
                or use premium features in new sessions.
              </p>
            </div>
          </div>
        </div>

        {/* Usage Limits Section */}
        {featureLosses.usageLimits && featureLosses.usageLimits.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-medium text-slate-900 mb-3">
              You'll have lower usage limits
            </h3>
            <ul className="space-y-2">
              {featureLosses.usageLimits.map((item, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <X className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-600">
                    <span className="line-through text-slate-400">{item.text}</span>
                    {item.newLimit && (
                      <span className="text-slate-600"> → {item.newLimit}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Features Section */}
        {featureLosses.features && featureLosses.features.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-medium text-slate-900 mb-3">
              These features will stop working
            </h3>
            <ul className="space-y-2">
              {featureLosses.features.map((item, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <X className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-600">
                    No <span className="font-medium">{item.text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Support Section (Pro only) */}
        {featureLosses.support && featureLosses.support.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-medium text-slate-900 mb-3">
              Your support level will decrease
            </h3>
            <ul className="space-y-2">
              {featureLosses.support.map((item, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <X className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-600">
                    <span className="line-through text-slate-400">{item.text}</span>
                    {item.newLevel && (
                      <span className="text-slate-600"> → {item.newLevel}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* What you keep */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-6">
          <h4 className="font-medium text-green-900 mb-2">What you'll keep</h4>
          <ul className="text-sm text-green-700 space-y-1">
            <li>✓ All your existing flashcards (up to 50 will remain active)</li>
            <li>✓ Your flashing history and progress data</li>
            <li>✓ Access to sample stories</li>
            <li>✓ Flashcard folder organization</li>
          </ul>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
        <button
          onClick={onCancel}
          className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Processing...' : 'Continue with downgrade'}
        </button>
      </div>
    </div>
  );
};

export default DowngradeReview;
