import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, RotateCw, BookOpen, X as XIcon, Trash2 } from 'lucide-react';

const QuickLogSheet = ({ type, onSubmit, onClose, books = [] }) => {
  const [content, setContent] = useState('');
  const [context, setContext] = useState('');
  const [selectedBook, setSelectedBook] = useState('');

  const labels = {
    said: { title: 'Word Said', placeholder: 'What word did they say?' },
    attempted: { title: 'Word Attempted', placeholder: 'What word did they try?' },
    read: { title: 'Book Read', placeholder: 'Which book?' },
  };

  const handleSubmit = () => {
    const value = type === 'read' ? (selectedBook || content) : content;
    if (!value.trim()) return;
    onSubmit(type, value.trim(), context.trim() || null);
    onClose();
  };

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      className="fixed inset-x-0 bottom-0 z-[60] bg-white rounded-t-2xl shadow-2xl p-6 max-h-[50vh]"
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-[hsl(var(--sprouttie-ink))]">{labels[type].title}</h3>
        <button onClick={onClose} className="p-1"><XIcon className="w-5 h-5" /></button>
      </div>

      {type === 'read' && books.length > 0 ? (
        <div className="space-y-2 mb-3">
          {books.map(b => (
            <button
              key={b}
              onClick={() => setSelectedBook(b)}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${selectedBook === b ? 'border-[hsl(var(--sprouttie-green))] bg-[hsl(var(--sprouttie-green)/0.06)]' : 'border-[hsl(var(--border))]'}`}
            >
              {b}
            </button>
          ))}
          <input
            type="text"
            value={content}
            onChange={(e) => { setContent(e.target.value); setSelectedBook(''); }}
            placeholder="Or type a title..."
            className="w-full border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--sprouttie-green)/0.5)]"
          />
        </div>
      ) : (
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={labels[type].placeholder}
          autoFocus
          className="w-full border border-[hsl(var(--border))] rounded-lg px-3 py-3 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--sprouttie-green)/0.5)]"
        />
      )}

      {type !== 'read' && (
        <input
          type="text"
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder="Context (optional) — e.g. during lunch"
          className="w-full border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--sprouttie-green)/0.5)]"
        />
      )}

      <button
        onClick={handleSubmit}
        className="w-full bg-[hsl(var(--sprouttie-green))] text-white font-bold py-3 rounded-xl"
      >
        Save
      </button>
    </motion.div>
  );
};

const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const BADGE_STYLES = {
  said: 'bg-[hsl(var(--sprouttie-green)/0.12)] text-[hsl(var(--sprouttie-green-dark))]',
  attempted: 'bg-amber-100 text-amber-700',
  read: 'bg-blue-100 text-blue-700',
};

const BADGE_LABELS = { said: 'Said', attempted: 'Attempted', read: 'Read' };

const DuringScreen = ({ logs, addLog, deleteLog, onNext, onBack }) => {
  const [sheet, setSheet] = useState(null);
  const [swiped, setSwiped] = useState(null);

  // Group logs by day
  const grouped = logs.reduce((acc, log) => {
    const day = new Date(log.created_at).toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric' });
    if (!acc[day]) acc[day] = [];
    acc[day].push(log);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <p className="text-sm text-[hsl(var(--muted-foreground))] italic text-center">
        A gentle record of what you notice — not a test.
      </p>

      {/* Quick log buttons */}
      <div className="space-y-3">
        <button
          onClick={() => setSheet('said')}
          className="w-full flex items-center gap-3 bg-[hsl(var(--sprouttie-green)/0.08)] text-[hsl(var(--sprouttie-green-dark))] font-semibold py-4 px-5 rounded-xl border border-[hsl(var(--sprouttie-green)/0.2)] transition-all hover:bg-[hsl(var(--sprouttie-green)/0.15)]"
        >
          <MessageCircle className="w-5 h-5" /> + Word Said
        </button>
        <button
          onClick={() => setSheet('attempted')}
          className="w-full flex items-center gap-3 bg-amber-50 text-amber-700 font-semibold py-4 px-5 rounded-xl border border-amber-200 transition-all hover:bg-amber-100"
        >
          <RotateCw className="w-5 h-5" /> + Word Attempted
        </button>
        <button
          onClick={() => setSheet('read')}
          className="w-full flex items-center gap-3 bg-blue-50 text-blue-700 font-semibold py-4 px-5 rounded-xl border border-blue-200 transition-all hover:bg-blue-100"
        >
          <BookOpen className="w-5 h-5" /> + Book Read
        </button>
      </div>

      {/* Running log */}
      {Object.keys(grouped).length > 0 ? (
        <div className="space-y-4">
          {Object.entries(grouped).map(([day, entries]) => (
            <div key={day}>
              <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))] mb-2">{day}</p>
              <div className="space-y-2">
                {entries.map(entry => (
                  <div key={entry.id} className="flex items-center justify-between bg-[hsl(var(--muted)/0.2)] p-3 rounded-lg group">
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[hsl(var(--sprouttie-ink))] text-sm">{entry.content}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${BADGE_STYLES[entry.log_type]}`}>
                          {BADGE_LABELS[entry.log_type]}
                        </span>
                      </div>
                      {entry.context && (
                        <span className="text-xs text-[hsl(var(--muted-foreground))] italic">{entry.context}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[hsl(var(--muted-foreground))]">{timeAgo(entry.created_at)}</span>
                      <button
                        onClick={() => deleteLog(entry.id)}
                        className="p-1 opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-[hsl(var(--muted-foreground))] text-center py-4">Nothing noted yet this week. Tap a button above when you notice something.</p>
      )}

      {/* Navigation */}
      <div className="flex gap-3 pt-2">
        <button onClick={onBack} className="flex-1 border-2 border-[hsl(var(--border))] text-[hsl(var(--sprouttie-ink))] font-semibold py-3 rounded-xl">
          ← Back
        </button>
        <button onClick={onNext} className="flex-1 bg-[hsl(var(--sprouttie-green))] text-white font-bold py-3 rounded-xl shadow-md">
          See Reflection →
        </button>
      </div>

      {/* Quick-log bottom sheets */}
      <AnimatePresence>
        {sheet && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 z-[55]"
              onClick={() => setSheet(null)}
            />
            <QuickLogSheet
              type={sheet}
              onSubmit={addLog}
              onClose={() => setSheet(null)}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DuringScreen;
