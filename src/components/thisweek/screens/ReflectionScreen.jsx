import React from 'react';
import { Sparkles } from 'lucide-react';

const ReflectionScreen = ({ childName, stats, onPlanNext, onClose }) => {
  const { said, attempted, read } = stats;

  // Simple rule-based suggestion
  const getSuggestion = () => {
    if (said + attempted === 0) return 'Try pointing and naming 3 objects at mealtimes this week.';
    if (attempted > said) return 'Keep repeating those attempted words — they\'re almost there!';
    if (read === 0) return 'Try reading a short picture book together before bedtime.';
    return 'Great balance this week! Keep up the variety.';
  };

  return (
    <div className="space-y-6 text-center">
      {/* Headline */}
      <div>
        <h2 className="text-2xl font-bold text-[hsl(var(--sprouttie-ink))]">
          {childName} had a great week 🎉
        </h2>
      </div>

      {/* Stats */}
      <div className="space-y-3">
        <div className="bg-[hsl(var(--sprouttie-green)/0.08)] p-4 rounded-xl">
          <p className="text-lg font-semibold text-[hsl(var(--sprouttie-ink))]">
            {said + attempted} new word{said + attempted !== 1 ? 's' : ''} {attempted > 0 ? 'attempted' : 'said'}
          </p>
        </div>
        <div className="bg-blue-50 p-4 rounded-xl">
          <p className="text-lg font-semibold text-blue-700">
            {read} book{read !== 1 ? 's' : ''} read together
          </p>
        </div>
      </div>

      {/* AI suggestion */}
      <div className="bg-[hsl(var(--muted)/0.3)] p-4 rounded-xl flex items-start gap-3 text-left">
        <Sparkles className="w-5 h-5 text-[hsl(var(--sprouttie-green))] flex-shrink-0 mt-0.5" />
        <p className="text-sm text-[hsl(var(--sprouttie-ink))]">{getSuggestion()}</p>
      </div>

      {/* CTAs */}
      <div className="space-y-3">
        <button
          onClick={onPlanNext}
          className="w-full bg-[hsl(var(--sprouttie-green))] text-white font-bold py-4 rounded-xl shadow-md"
        >
          Plan Next Week →
        </button>
        <button
          disabled
          className="w-full border-2 border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] font-semibold py-3 rounded-xl opacity-50 cursor-not-allowed"
        >
          Share this week (coming soon)
        </button>
        <button
          onClick={onClose}
          className="text-sm text-[hsl(var(--muted-foreground))] hover:underline"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default ReflectionScreen;
