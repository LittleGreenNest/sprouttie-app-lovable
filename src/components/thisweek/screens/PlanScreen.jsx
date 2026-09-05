import React, { useState, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronUp, Check, X as XIcon, Plus } from 'lucide-react';
import { useFlashcards } from '../../../context/FlashcardContext';

const Section = ({ title, defaultOpen = true, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-[hsl(var(--border))] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 bg-[hsl(var(--muted)/0.3)] text-left"
      >
        <span className="font-semibold text-[hsl(var(--sprouttie-ink))]">{title}</span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && <div className="p-4 space-y-3">{children}</div>}
    </div>
  );
};

const PlanScreen = ({ wordSuggestions, bookSuggestions, prompts, headline, onNext, onBack }) => {
  const { sets = [], updateSetFlashcards } = useFlashcards() || {};
  const [words, setWords] = useState(wordSuggestions);
  const [customWord, setCustomWord] = useState('');
  const [savedBooks, setSavedBooks] = useState([]);
  const [currentPrompts, setCurrentPrompts] = useState(prompts);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [applyError, setApplyError] = useState('');

  // How many sets are running right now, straight from set_number. This is the
  // same number the Log page and the dashboard show, so the plan can be stated
  // as a change to it rather than as a competing answer.
  const liveSetCount = useMemo(
    () => sets.filter((s) => (s.flashcardIds || []).length > 0).length,
    [sets]
  );

  // Accepted words grouped into the sets the engine proposed. Starter and
  // hand-typed words have no card behind them, so they cannot be assigned.
  const proposedSets = useMemo(() => {
    const groups = new Map();
    words
      .filter((w) => w.accepted && w.setIndex != null && !String(w.id).startsWith('custom-') && !String(w.id).startsWith('starter-'))
      .forEach((w) => {
        if (!groups.has(w.setIndex)) groups.set(w.setIndex, []);
        groups.get(w.setIndex).push(w);
      });
    return [...groups.entries()]
      .sort((a, b) => a[0] - b[0])
      .slice(0, 5) // the deck model has exactly five numbered sets
      .map(([, items]) => items);
  }, [words]);

  const canApply = proposedSets.length > 0 && typeof updateSetFlashcards === 'function';

  const applyToSets = async () => {
    if (!canApply || applying) return;
    setApplying(true);
    setApplyError('');
    try {
      // Sequential, because each call clears the set it is about to fill and
      // running them in parallel would race on the same rows.
      for (let i = 0; i < proposedSets.length; i += 1) {
        await updateSetFlashcards(i + 1, proposedSets[i].map((w) => w.id));
      }
      setApplied(true);
    } catch (e) {
      console.error('Apply plan to sets failed:', e);
      setApplyError('Could not update your sets. Please try again.');
    } finally {
      setApplying(false);
    }
  };

  // The plan is built from data that loads after this screen can mount, so
  // adopt each new set of suggestions instead of keeping the first snapshot.
  // Custom words the parent has typed in are preserved.
  useEffect(() => {
    setWords(prev => [...wordSuggestions, ...prev.filter(w => String(w.id).startsWith('custom-'))]);
  }, [wordSuggestions]);

  const toggleWord = (id) => {
    setWords(prev => prev.map(w => w.id === id ? { ...w, accepted: !w.accepted } : w));
  };

  const addCustomWord = () => {
    if (!customWord.trim()) return;
    setWords(prev => [...prev, { id: `custom-${Date.now()}`, word: customWord.trim(), translation: '', category: 'Custom', accepted: true }]);
    setCustomWord('');
  };

  const toggleBook = (title) => {
    setSavedBooks(prev => prev.includes(title) ? prev.filter(b => b !== title) : [...prev, title]);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-[hsl(var(--sprouttie-ink))] text-center">Plan the Week</h2>

      {headline && (
        <p className="text-sm text-center text-[hsl(var(--muted-foreground))] px-2">{headline}</p>
      )}

      {/* States the plan as a change to the sets the parent is actually
          running, so this screen and the dashboard never show two answers. */}
      {canApply && (
        <div className="rounded-xl border border-[hsl(var(--border))] p-4 space-y-3">
          <div className="flex items-center justify-center gap-3 text-sm">
            <span className="text-[hsl(var(--muted-foreground))]">
              Running now: <strong className="text-[hsl(var(--sprouttie-ink))]">{liveSetCount} set{liveSetCount === 1 ? '' : 's'}</strong>
            </span>
            <span className="text-[hsl(var(--muted-foreground))]">→</span>
            <span className="text-[hsl(var(--muted-foreground))]">
              Suggested: <strong className="text-[hsl(var(--sprouttie-ink))]">{proposedSets.length} set{proposedSets.length === 1 ? '' : 's'}</strong>
            </span>
          </div>

          {applied ? (
            <p className="text-sm text-center text-[hsl(var(--sprouttie-green-dark))] font-medium">
              Sets updated. The Log page and your home screen now show this plan.
            </p>
          ) : (
            <>
              <button
                onClick={applyToSets}
                disabled={applying}
                className="w-full py-3 rounded-xl font-semibold disabled:opacity-60"
                style={{ background: '#F0C040', color: '#1a1a1a' }}
              >
                {applying ? 'Updating your sets…' : 'Use this as my sets'}
              </button>
              <p className="text-xs text-center text-[hsl(var(--muted-foreground))]">
                Replaces Set 1 to {proposedSets.length} with the accepted words above. Nothing else changes until you tap this.
              </p>
            </>
          )}

          {applyError && (
            <p className="text-sm text-center text-red-600">{applyError}</p>
          )}
        </div>
      )}

      {/* Words */}
      <Section title="This Week's Words">
        {words.map(w => (
          <div key={w.id} className="flex items-center justify-between gap-3 bg-[hsl(var(--muted)/0.2)] p-3 rounded-lg">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-medium text-[hsl(var(--sprouttie-ink))]">{w.word}</span>
                {w.translation && <span className="text-sm text-[hsl(var(--muted-foreground))]">{w.translation}</span>}
                <span className="text-xs bg-[hsl(var(--sprouttie-green)/0.1)] text-[hsl(var(--sprouttie-green-dark))] px-2 py-0.5 rounded-full">{w.category}</span>
              </div>
              {w.reason && (
                <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))] italic">{w.reason}</p>
              )}
            </div>
            <div className="flex gap-1 shrink-0">
              <button
                onClick={() => toggleWord(w.id)}
                className={`p-1.5 rounded-lg transition-colors ${w.accepted ? 'bg-[hsl(var(--sprouttie-green))] text-white' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'}`}
              >
                {w.accepted ? <Check className="w-3.5 h-3.5" /> : <XIcon className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        ))}
        <div className="flex gap-2">
          <input
            type="text"
            value={customWord}
            onChange={(e) => setCustomWord(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCustomWord()}
            placeholder="+ Add your own word"
            className="flex-1 border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--sprouttie-green)/0.5)]"
          />
          <button onClick={addCustomWord} className="p-2 bg-[hsl(var(--sprouttie-green))] text-white rounded-lg">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </Section>

      {/* Books */}
      <Section title="Books to Read Together">
        {bookSuggestions.map(b => (
          <div key={b.title} className="flex items-center justify-between bg-[hsl(var(--muted)/0.2)] p-3 rounded-lg">
            <div>
              <p className="font-medium text-[hsl(var(--sprouttie-ink))]">{b.title}</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">{b.author} · {b.ageRange}</p>
            </div>
            <button
              onClick={() => toggleBook(b.title)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                savedBooks.includes(b.title)
                  ? 'bg-[hsl(var(--sprouttie-green))] text-white'
                  : 'border border-[hsl(var(--sprouttie-green))] text-[hsl(var(--sprouttie-green))]'
              }`}
            >
              {savedBooks.includes(b.title) ? 'Saved ✓' : 'Save to List'}
            </button>
          </div>
        ))}
        <p className="text-xs text-[hsl(var(--muted-foreground))] italic">Linked to words you're learning this week</p>
      </Section>

      {/* Interaction Prompts */}
      <Section title="Everyday Moments">
        {currentPrompts.map((p, i) => (
          <div key={i} className="bg-[hsl(var(--sprouttie-green)/0.06)] p-3 rounded-lg text-sm text-[hsl(var(--sprouttie-ink))]">
            {p}
          </div>
        ))}
        <button
          onClick={() => {
            const idx = Math.floor(Math.random() * 3);
            setCurrentPrompts([...prompts].sort(() => Math.random() - 0.5));
          }}
          className="text-xs text-[hsl(var(--sprouttie-green))] font-medium hover:underline"
        >
          Refresh prompts
        </button>
      </Section>

      {/* Navigation */}
      <div className="flex gap-3">
        <button onClick={onBack} className="flex-1 border-2 border-[hsl(var(--border))] text-[hsl(var(--sprouttie-ink))] font-semibold py-3 rounded-xl">
          ← Back
        </button>
        <button onClick={onNext} className="flex-1 bg-[hsl(var(--sprouttie-green))] text-white font-bold py-3 rounded-xl shadow-md">
          Start the Week →
        </button>
      </div>
    </div>
  );
};

export default PlanScreen;
