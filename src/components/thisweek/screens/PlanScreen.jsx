import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Check, X as XIcon, Plus } from 'lucide-react';

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

const PlanScreen = ({ wordSuggestions, bookSuggestions, prompts, onNext, onBack }) => {
  const [words, setWords] = useState(wordSuggestions);
  const [customWord, setCustomWord] = useState('');
  const [savedBooks, setSavedBooks] = useState([]);
  const [currentPrompts, setCurrentPrompts] = useState(prompts);

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

      {/* Words */}
      <Section title="This Week's Words">
        {words.map(w => (
          <div key={w.id} className="flex items-center justify-between bg-[hsl(var(--muted)/0.2)] p-3 rounded-lg">
            <div className="flex-1">
              <span className="font-medium text-[hsl(var(--sprouttie-ink))]">{w.word}</span>
              {w.translation && <span className="text-sm text-[hsl(var(--muted-foreground))] ml-2">{w.translation}</span>}
              <span className="ml-2 text-xs bg-[hsl(var(--sprouttie-green)/0.1)] text-[hsl(var(--sprouttie-green-dark))] px-2 py-0.5 rounded-full">{w.category}</span>
            </div>
            <div className="flex gap-1">
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
