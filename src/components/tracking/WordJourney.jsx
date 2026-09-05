import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '../../context/AuthContext';
import { useFlashcards } from '../../context/FlashcardContext';
import { cardIdFrom } from '../../utils/cardId';
import { Search, ChevronDown, ChevronUp, Sparkles, Calendar, Hash, TrendingUp, FolderOpen, List } from 'lucide-react';

const MASTERY_THRESHOLDS = { familiar: 5, confident: 15, mastered: 30 };

const getMasteryStage = (count) => {
  if (count >= MASTERY_THRESHOLDS.mastered) return { label: 'Mastered', color: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50', icon: '🏆' };
  if (count >= MASTERY_THRESHOLDS.confident) return { label: 'Confident', color: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50', icon: '💪' };
  if (count >= MASTERY_THRESHOLDS.familiar) return { label: 'Familiar', color: 'bg-sky-500', text: 'text-sky-700', bg: 'bg-sky-50', icon: '📖' };
  return { label: 'Learning', color: 'bg-slate-400', text: 'text-slate-600', bg: 'bg-slate-50', icon: '🌱' };
};

const MasteryBar = ({ count }) => {
  const maxForBar = MASTERY_THRESHOLDS.mastered;
  const pct = Math.min((count / maxForBar) * 100, 100);
  const stage = getMasteryStage(count);

  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className={`h-full rounded-full ${stage.color}`}
        />
      </div>
      <span className={`text-[10px] font-bold ${stage.text} whitespace-nowrap`}>
        {stage.icon} {stage.label}
      </span>
    </div>
  );
};

const WordCard = ({ word, index }) => {
  const [expanded, setExpanded] = useState(false);
  const stage = getMasteryStage(word.flashCount);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.5) }}
      className={`rounded-xl border-2 transition-colors ${expanded ? 'border-sprouttie-green/40 shadow-md' : 'border-slate-200'} bg-white overflow-hidden`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-slate-50/50 transition-colors"
      >
        {/* Word front */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800 truncate text-sm">{word.front}</p>
          <p className="text-xs text-slate-500 truncate">{word.back}</p>
        </div>

        {/* Stats pills */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[10px] font-bold bg-sprouttie-green-light/30 text-sprouttie-green-dark px-2 py-0.5 rounded-full">
            ×{word.flashCount}
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${stage.bg} ${stage.text}`}>
            {stage.icon}
          </span>
        </div>

        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              {/* Mastery progress */}
              <MasteryBar count={word.flashCount} />

              {/* Timeline stats */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 rounded-lg p-2.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Calendar className="w-3 h-3 text-slate-500" />
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">First Flashed</span>
                  </div>
                  <p className="text-xs font-medium text-slate-800">
                    {word.firstFlashed
                      ? new Date(word.firstFlashed).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : '—'}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-lg p-2.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Calendar className="w-3 h-3 text-slate-500" />
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Last Flashed</span>
                  </div>
                  <p className="text-xs font-medium text-slate-800">
                    {word.lastFlashed
                      ? new Date(word.lastFlashed).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : '—'}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-lg p-2.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Hash className="w-3 h-3 text-slate-500" />
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Total Flashes</span>
                  </div>
                  <p className="text-xs font-medium text-slate-800">{word.flashCount}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-2.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <TrendingUp className="w-3 h-3 text-slate-500" />
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Active Days</span>
                  </div>
                  <p className="text-xs font-medium text-slate-800">{word.uniqueDays}</p>
                </div>
              </div>

              {/* Mini timeline */}
              {word.recentDates.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Recent Activity</p>
                  <div className="flex flex-wrap gap-1">
                    {word.recentDates.map((date, i) => (
                      <span key={i} className="text-[10px] bg-sprouttie-green-light/20 text-sprouttie-green-dark px-2 py-0.5 rounded-full">
                        {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Set info */}
              {word.folder && word.folder !== 'Uncategorized' && (
                <p className="text-[10px] text-slate-400">📁 {word.folder}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const WordJourney = () => {
  const { currentUser } = useAuth();
  const { sets, flashcards } = useFlashcards();
  const navigate = useNavigate();
  const [trackingData, setTrackingData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('most');
  const [filterStage, setFilterStage] = useState('all');
  const [groupByFolder, setGroupByFolder] = useState(false);

  useEffect(() => {
    if (currentUser) loadTracking();
  }, [currentUser]);

  const loadTracking = async () => {
    try {
      setLoading(true);
      // Fetch all flash events
      const { data, error } = await supabase
        .from('daily_tracking')
        .select('flashcard_id, date, flashed_at')
        .eq('user_id', currentUser.id)
        .eq('status', 'flashed')
        .order('date', { ascending: true });

      if (error) throw error;
      setTrackingData(data || []);
    } catch (err) {
      console.error('Error loading word journey:', err);
    } finally {
      setLoading(false);
    }
  };

  const wordJourneys = useMemo(() => {
    // Build a map: flashcard_id -> aggregated stats
    const map = {};
    trackingData.forEach(({ flashcard_id, date, flashed_at }) => {
      const cardId = cardIdFrom(flashcard_id);
      if (!cardId || cardId.startsWith('set-') || cardId === 'shared-note') return;
      if (!map[cardId]) {
        map[cardId] = { dates: [], flashedAts: [] };
      }
      map[cardId].dates.push(date);
      if (flashed_at) map[cardId].flashedAts.push(flashed_at);
    });

    // Build set lookup
    const setMap = {};
    sets.forEach(s => { setMap[s.id] = s.name || `Set ${s.id}`; });

    // Merge with flashcard metadata
    return flashcards
      .map(card => {
        const tracking = map[card.id];
        const flashCount = tracking ? tracking.dates.length : 0;
        const uniqueDays = tracking ? new Set(tracking.dates).size : 0;
        const sortedDates = tracking ? [...tracking.dates].sort() : [];
        const firstFlashed = sortedDates[0] || null;
        const lastFlashed = sortedDates[sortedDates.length - 1] || null;
        const recentDates = [...new Set(sortedDates)].slice(-5).reverse();

        return {
          id: card.id,
          front: card.front,
          back: card.back,
          folder: card.folder || 'Uncategorized',
          setNumber: card.set_number,
          setName: card.set_number ? setMap[card.set_number] || `Set ${card.set_number}` : null,
          flashCount,
          uniqueDays,
          firstFlashed,
          lastFlashed,
          recentDates,
        };
      })
      .filter(w => w.flashCount > 0); // Only show words that have been flashed
  }, [trackingData, flashcards, sets]);

  const filtered = useMemo(() => {
    let result = wordJourneys;

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(w => w.front.toLowerCase().includes(q) || w.back.toLowerCase().includes(q));
    }

    // Filter by mastery stage
    if (filterStage !== 'all') {
      result = result.filter(w => getMasteryStage(w.flashCount).label.toLowerCase() === filterStage);
    }

    // Sort
    switch (sortBy) {
      case 'most': result.sort((a, b) => b.flashCount - a.flashCount); break;
      case 'least': result.sort((a, b) => a.flashCount - b.flashCount); break;
      case 'recent': result.sort((a, b) => (b.lastFlashed || '').localeCompare(a.lastFlashed || '')); break;
      case 'alpha': result.sort((a, b) => a.front.localeCompare(b.front)); break;
      default: break;
    }

    return result;
  }, [wordJourneys, search, sortBy, filterStage]);

  // Group by folder
  const groupedByFolder = useMemo(() => {
    if (!groupByFolder) return null;
    const groups = {};
    filtered.forEach(w => {
      const folder = w.folder;
      if (!groups[folder]) groups[folder] = { words: [], totalFlashes: 0 };
      groups[folder].words.push(w);
      groups[folder].totalFlashes += w.flashCount;
    });
    return Object.entries(groups)
      .sort((a, b) => b[1].totalFlashes - a[1].totalFlashes)
      .map(([folder, data]) => ({ folder, ...data }));
  }, [filtered, groupByFolder]);

  // Summary stats
  const summary = useMemo(() => {
    const stages = { learning: 0, familiar: 0, confident: 0, mastered: 0 };
    wordJourneys.forEach(w => {
      const s = getMasteryStage(w.flashCount).label.toLowerCase();
      stages[s] = (stages[s] || 0) + 1;
    });
    return stages;
  }, [wordJourneys]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-sprouttie-green"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Sparkles className="w-6 h-6 text-sprouttie-green" />
        <div>
          <h2 className="text-xl font-bold text-slate-800">Word Journey</h2>
          <p className="text-xs text-slate-500">{wordJourneys.length} words tracked</p>
        </div>
      </div>

      {/* Stage summary pills */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'all', label: `All (${wordJourneys.length})`, icon: '' },
          { key: 'learning', label: `🌱 ${summary.learning}`, color: 'bg-slate-100 text-slate-700' },
          { key: 'familiar', label: `📖 ${summary.familiar}`, color: 'bg-sky-50 text-sky-700' },
          { key: 'confident', label: `💪 ${summary.confident}`, color: 'bg-emerald-50 text-emerald-700' },
          { key: 'mastered', label: `🏆 ${summary.mastered}`, color: 'bg-amber-50 text-amber-700' },
        ].map(s => (
          <button
            key={s.key}
            onClick={() => setFilterStage(s.key)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-all ${
              filterStage === s.key
                ? 'bg-sprouttie-green text-white shadow-sm'
                : s.color || 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Search + Sort + Group */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search words…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:border-sprouttie-green focus:ring-1 focus:ring-sprouttie-green/30 outline-none transition-all"
          />
        </div>
        <button
          onClick={() => setGroupByFolder(!groupByFolder)}
          className={`p-2 rounded-xl border transition-all ${groupByFolder ? 'bg-sprouttie-green text-white border-sprouttie-green' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}
          title={groupByFolder ? 'Show flat list' : 'Group by folder'}
        >
          {groupByFolder ? <FolderOpen className="w-4 h-4" /> : <List className="w-4 h-4" />}
        </button>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white focus:border-sprouttie-green outline-none"
        >
          <option value="most">Most flashed</option>
          <option value="least">Least flashed</option>
          <option value="recent">Most recent</option>
          <option value="alpha">A → Z</option>
        </select>
      </div>

      {/* Word list */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <p className="text-4xl mb-4">🌱</p>
          <p className="text-lg font-medium text-slate-700 mb-1">Your journey starts here</p>
          <p className="text-sm mb-4">Every word you flash will appear here, building into a map of your child's growing vocabulary.</p>
          <button
            onClick={() => navigate('/daily-tracking')}
            className="inline-block px-4 py-2 bg-sprouttie-green text-white text-sm font-medium rounded-lg"
          >
            Start your first session →
          </button>
        </div>
      ) : groupByFolder && groupedByFolder ? (
        <div className="space-y-4">
          {groupedByFolder.map(group => (
            <div key={group.folder} className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <FolderOpen className="w-4 h-4 text-sprouttie-green" />
                <h3 className="text-sm font-bold text-slate-700">{group.folder}</h3>
                <span className="text-[10px] font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                  {group.words.length} words · {group.totalFlashes} flashes
                </span>
              </div>
              <div className="space-y-2">
                {group.words.map((word, i) => (
                  <WordCard key={word.id} word={word} index={i} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((word, i) => (
            <WordCard key={word.id} word={word} index={i} />
          ))}
        </div>
      )}
    </div>
  );
};

export default WordJourney;
