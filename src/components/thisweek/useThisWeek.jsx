import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '../../context/AuthContext';

// Get Monday of the current week
export const getCurrentWeekStart = () => {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split('T')[0];
};

// Parse age band like "13-18" into months
const parseAgeBand = (band) => {
  if (!band) return null;
  const match = band.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
};

export const getStageLabel = (ageBand) => {
  const months = parseAgeBand(ageBand);
  if (months === null) return 'Growing every day';
  if (months <= 6) return 'Absorbing sounds';
  if (months <= 12) return 'Recognising simple words';
  if (months <= 18) return 'Mimicking sounds';
  if (months <= 24) return 'Building word combinations';
  return 'Expanding vocabulary';
};

// Rule-based word suggestions from existing flashcard categories
const generateWordSuggestions = (flashcards, ageBand) => {
  const folders = {};
  flashcards.forEach(f => {
    const folder = f.folder || 'default';
    if (!folders[folder]) folders[folder] = [];
    folders[folder].push(f);
  });

  // Pick words from the most populated folders, preferring less-reviewed ones
  const allCards = [...flashcards].sort((a, b) => (a.review_count || 0) - (b.review_count || 0));
  const suggestions = allCards.slice(0, 8).map(c => ({
    id: c.id,
    word: c.front,
    translation: c.back,
    category: c.folder || 'General',
    accepted: true,
  }));

  // If not enough flashcards, add some defaults based on age
  if (suggestions.length < 5) {
    const defaults = [
      { word: 'mama', translation: '妈妈', category: 'Family' },
      { word: 'water', translation: '水', category: 'Food' },
      { word: 'ball', translation: '球', category: 'Toys' },
      { word: 'dog', translation: '狗', category: 'Animals' },
      { word: 'more', translation: '还要', category: 'Actions' },
    ];
    defaults.forEach(d => {
      if (suggestions.length < 8 && !suggestions.find(s => s.word === d.word)) {
        suggestions.push({ ...d, id: `default-${d.word}`, accepted: true });
      }
    });
  }

  return suggestions;
};

const generateBookSuggestions = (ageBand) => {
  const months = parseAgeBand(ageBand);
  if (months !== null && months <= 12) {
    return [
      { title: 'Baby Loves Chinese', author: 'Tuttle Publishing', ageRange: '0–2 years' },
      { title: 'First 100 Words (Bilingual)', author: 'Roger Priddy', ageRange: '0–2 years' },
    ];
  }
  return [
    { title: 'My First Chinese Words', author: 'Faye-Lynn Wu', ageRange: '1–3 years' },
    { title: 'Dim Sum for Everyone!', author: 'Grace Lin', ageRange: '2–4 years' },
    { title: 'Mei Mei Loves Chinese', author: 'Various', ageRange: '1–3 years' },
  ];
};

const INTERACTION_PROMPTS = [
  ['Point and name objects during meals 🍽', 'Repeat the word slowly when your child looks at you 👀', 'Say the word again when they attempt it — no correction needed 💚'],
  ['Label what they point at in their own words 🫶', 'Use the word in a short sentence at bath time 🛁', 'Sing a word in a simple melody — repetition through music 🎵'],
  ['Narrate what you\'re both doing: "We\'re eating rice!" 🍚', 'Wait 3 seconds after saying a word — give space for a response 🕐', 'Celebrate any attempt — a smile is enough 😊'],
];

export const useThisWeek = () => {
  const { currentUser, profile } = useAuth() || {};
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [flashcards, setFlashcards] = useState([]);
  const weekStart = getCurrentWeekStart();
  const childName = currentUser?.user_metadata?.child_name || currentUser?.user_metadata?.name?.split(' ')[0] || 'Your child';
  const ageBand = profile?.child_age_band;
  const stage = getStageLabel(ageBand);

  const wordSuggestions = useMemo(() => generateWordSuggestions(flashcards, ageBand), [flashcards, ageBand]);
  const bookSuggestions = useMemo(() => generateBookSuggestions(ageBand), [ageBand]);
  const prompts = useMemo(() => {
    const idx = Math.floor(Math.random() * INTERACTION_PROMPTS.length);
    return INTERACTION_PROMPTS[idx];
  }, []);

  const fetchData = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const [logsRes, cardsRes] = await Promise.all([
        supabase.from('weekly_logs').select('*').eq('user_id', currentUser.id).eq('week_start', weekStart).order('created_at', { ascending: false }),
        supabase.from('flashcards').select('*').eq('user_id', currentUser.id).limit(100),
      ]);
      setLogs(logsRes.data || []);
      setFlashcards(cardsRes.data || []);
    } catch (e) {
      console.error('ThisWeek fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [currentUser, weekStart]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const addLog = useCallback(async (logType, content, context = null) => {
    if (!currentUser) return;
    const { data, error } = await supabase.from('weekly_logs').insert({
      user_id: currentUser.id,
      week_start: weekStart,
      log_type: logType,
      content,
      context,
    }).select().single();
    if (!error && data) {
      setLogs(prev => [data, ...prev]);
    }
    return { data, error };
  }, [currentUser, weekStart]);

  const deleteLog = useCallback(async (id) => {
    const { error } = await supabase.from('weekly_logs').delete().eq('id', id);
    if (!error) setLogs(prev => prev.filter(l => l.id !== id));
  }, []);

  // Stats for reflection
  const stats = useMemo(() => {
    const said = logs.filter(l => l.log_type === 'said').length;
    const attempted = logs.filter(l => l.log_type === 'attempted').length;
    const read = logs.filter(l => l.log_type === 'read').length;
    return { said, attempted, read, total: said + attempted + read };
  }, [logs]);

  return {
    weekStart, childName, ageBand, stage, logs, loading,
    wordSuggestions, bookSuggestions, prompts,
    addLog, deleteLog, stats, refreshData: fetchData,
  };
};
