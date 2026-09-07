import React from 'react';
import { Sparkles } from 'lucide-react';

const ReflectionScreen = ({ childName, stats, onPlanNext, onClose }) => {
  const { said, attempted, read } = stats;

  // Simple rule-based suggestion
  const getSuggestion = () => {
    if (said + attempted === 0) return 'Try pointing and naming 3 objects at mealtimes this week.';
    if (attempted > said) return 'Those attempted words are worth repeating this week.';
    if (read === 0) return 'Try reading a short picture book together before bedtime.';
    return 'A good mix this week. Keep the variety going.';
  };

  return (
    <div className="space-y-6 text-center">
      {/* Headline */}
      <div>
        <p className="text-xs font-semibold tracking-widest uppercase text-[hsl(var(--muted-foreground))] mb-1.5">
          Reflection
        </p>
        <h2 className="text-2xl font-bold text-[hsl(var(--sprouttie-ink))]">
          {said + attempted + read === 0
            ? 'A quiet week.'
            : childName ? `${childName}'s week` : 'Your week'}
        </h2>
        <p className="mt-1.5 text-sm text-[hsl(var(--muted-foreground))]">
          A look back at what you noticed. To change an entry, go back and edit it in the list.
        </p>
      </div>

      {/* Stats */}
      <div className="space-y-3">
        <div className="bg-[hsl(var(--sprouttie-green)/0.08)] p-4 rounded-xl">
          <p className="text-lg font-semibold text-[hsl(var(--sprouttie-ink))]">
            {said + attempted} new word{said + attempted !== 1 ? 's' : ''} {attempted > 0 ? 'attempted' : 'said'}
          </p>
        </div>
        <div className="bg-[hsl(var(--sprouttie-mint))] p-4 rounded-xl">
          <p className="text-lg font-semibold text-[hsl(var(--sprouttie-ink))]">
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
          className="w-full bg-[#F0C040] text-[#1A1A1A] font-bold py-4 rounded-xl shadow-md hover:brightness-95 transition-all"
        >
          Plan Next Week →
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
