import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Loader2 } from 'lucide-react';
import { useWeeklyReview } from './useWeeklyReview';

/**
 * One question a week. Deliberately holds nothing but the words: no stats, no
 * charts, no secondary actions. Thirty seconds is the whole budget.
 */
const WeeklyReview = () => {
  const navigate = useNavigate();
  const { loading, saving, error, items, done, tappedCount, toggle, submit } =
    useWeeklyReview();
  const [finished, setFinished] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  const handleSubmit = async () => {
    const res = await submit();
    if (res.ok) {
      setSavedCount(res.count);
      setFinished(true);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--sprouttie-green))]" />
      </div>
    );
  }

  if (finished) {
    return (
      <div className="max-w-md mx-auto text-center py-20 space-y-4">
        <h1 className="text-2xl font-bold text-[hsl(var(--sprouttie-ink))]">
          {savedCount > 0
            ? `${savedCount} word${savedCount === 1 ? '' : 's'} moved on 🌱`
            : 'Noted, thank you'}
        </h1>
        <p className="text-[hsl(var(--muted-foreground))]">
          {savedCount > 0
            ? 'Next week’s plan will take this into account.'
            : 'No change this week. The same words will come round again.'}
        </p>
        <button
          onClick={() => navigate('/dashboard')}
          className="mt-2 px-6 py-3 rounded-xl font-semibold"
          style={{ background: '#F0C040', color: '#1a1a1a' }}
        >
          Back to home
        </button>
      </div>
    );
  }

  if (done && !items.length) {
    return (
      <div className="max-w-md mx-auto text-center py-20 space-y-4">
        <h1 className="text-2xl font-bold text-[hsl(var(--sprouttie-ink))]">
          All caught up
        </h1>
        <p className="text-[hsl(var(--muted-foreground))]">
          You have already reviewed this week.
        </p>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="max-w-md mx-auto text-center py-20 space-y-4">
        <h1 className="text-2xl font-bold text-[hsl(var(--sprouttie-ink))]">
          Nothing to review yet
        </h1>
        <p className="text-[hsl(var(--muted-foreground))]">
          Flash a few cards this week and they will show up here.
        </p>
        <button
          onClick={() => navigate('/dashboard')}
          className="mt-2 text-sm text-[hsl(var(--sprouttie-green))] font-medium hover:underline"
        >
          Back to home
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto pb-32">
      <div className="text-center pt-6 pb-6">
        <h1 className="text-2xl font-bold text-[hsl(var(--sprouttie-ink))]">
          Did he say any of these?
        </h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-2">
          Tap the ones you heard. Skip the rest.
        </p>
      </div>

      {done && (
        <p className="text-center text-xs text-[hsl(var(--muted-foreground))] mb-4">
          You have already reviewed this week. Anything you tap now still counts.
        </p>
      )}

      <div className="space-y-2">
        {items.map((item) => (
          <motion.button
            key={item.cardId}
            onClick={() => toggle(item.cardId)}
            whileTap={{ scale: 0.985 }}
            aria-pressed={item.tapped}
            className={`w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--sprouttie-green))] ${
              item.tapped
                ? 'border-[hsl(var(--sprouttie-green))] bg-[hsl(var(--sprouttie-green)/0.08)]'
                : 'border-[hsl(var(--border))] bg-white'
            }`}
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border transition-colors ${
                item.tapped
                  ? 'bg-[hsl(var(--sprouttie-green))] border-[hsl(var(--sprouttie-green))]'
                  : 'border-[hsl(var(--border))]'
              }`}
            >
              {item.tapped && <Check className="w-3.5 h-3.5 text-white" />}
            </span>

            <span className="flex-1 min-w-0">
              <span className="block font-medium text-[hsl(var(--sprouttie-ink))]">
                {item.word}
              </span>
              {item.translation && item.translation !== item.word && (
                <span className="block text-sm text-[hsl(var(--muted-foreground))]">
                  {item.translation}
                </span>
              )}
            </span>
          </motion.button>
        ))}
      </div>

      {error && (
        <p className="text-sm text-red-600 text-center mt-4">{error}</p>
      )}

      <div className="fixed bottom-20 left-0 right-0 px-4">
        <div className="max-w-md mx-auto">
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full py-4 rounded-xl font-semibold shadow-lg disabled:opacity-60"
            style={{ background: '#F0C040', color: '#1a1a1a' }}
          >
            {saving
              ? 'Saving…'
              : tappedCount > 0
              ? `Save ${tappedCount} word${tappedCount === 1 ? '' : 's'}`
              : 'None of these'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WeeklyReview;
