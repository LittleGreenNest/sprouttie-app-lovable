import React, { useState } from 'react';
import { MessageCircle, BookOpen, Handshake } from 'lucide-react';
import { getAgeBandLabel } from '../useThisWeek';

const FOCUS_AREAS = [
  { id: 'words', icon: MessageCircle, emoji: '🗣', label: 'Words', sub: '5–10 new words this week' },
  { id: 'books', icon: BookOpen, emoji: '📚', label: 'Books', sub: '2–3 books to read together' },
  { id: 'interaction', icon: Handshake, emoji: '🤝', label: 'Interaction', sub: 'Simple prompts for daily moments' },
];

const SnapshotScreen = ({ childName, ageBand, stage, onNext }) => {
  const [activePills, setActivePills] = useState(['words', 'books', 'interaction']);

  const togglePill = (id) => {
    setActivePills(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-[hsl(var(--sprouttie-ink))]">{childName}'s Week</h2>
        {ageBand && (
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
            {getAgeBandLabel(ageBand)}
          </p>
        )}
        <div className="mt-3 inline-block bg-[hsl(var(--sprouttie-green)/0.1)] text-[hsl(var(--sprouttie-green-dark))] px-4 py-1.5 rounded-full text-sm font-medium">
          {stage}
        </div>
      </div>

      {/* Focus area pills */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-[hsl(var(--sprouttie-ink))]">Focus areas</p>
        {FOCUS_AREAS.map(area => (
          <button
            key={area.id}
            onClick={() => togglePill(area.id)}
            className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
              activePills.includes(area.id)
                ? 'border-[hsl(var(--sprouttie-green))] bg-[hsl(var(--sprouttie-green)/0.06)]'
                : 'border-[hsl(var(--border))] bg-white'
            }`}
          >
            <span className="text-2xl">{area.emoji}</span>
            <div className="flex-1">
              <p className="font-semibold text-[hsl(var(--sprouttie-ink))]">{area.label}</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">{area.sub}</p>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
              activePills.includes(area.id)
                ? 'border-[hsl(var(--sprouttie-green))] bg-[hsl(var(--sprouttie-green))]'
                : 'border-[hsl(var(--muted))]'
            }`}>
              {activePills.includes(area.id) && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* CTA */}
      <button
        onClick={onNext}
        className="w-full bg-[hsl(var(--sprouttie-green))] text-white font-bold py-4 rounded-xl shadow-md hover:shadow-lg transition-all text-base"
      >
        Plan This Week →
      </button>
    </div>
  );
};

export default SnapshotScreen;
