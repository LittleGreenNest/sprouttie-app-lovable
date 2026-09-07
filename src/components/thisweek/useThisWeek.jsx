import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '../../context/AuthContext';
import { buildWeeklyPlan, planHeadline, SET_SIZE } from './suggestionEngine';

// Get Monday of the current week
export const getCurrentWeekStart = () => {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split('T')[0];
};

/**
 * child_age_band is written by onboarding as a range in YEARS: "0-1", "1-2",
 * "2-3", "3-5". This used to read the first number as a count of months, so a
 * "2-3" child came out as 2 months old and was labelled "Absorbing sounds",
 * and was offered 0 to 2 year board books. Profile.jsx has always rendered
 * these as years, so the app disagreed with itself.
 *
 * Returns the midpoint of the band in months, since a band spans stages and
 * the midpoint is the fairest single point to classify on.
 */
const parseAgeBand = (band) => {
  if (!band) return null;
  const numbers = String(band).match(/\d+(?:\.\d+)?/g);
  if (!numbers || !numbers.length) return null;

  // Tolerate a value that genuinely is in months, e.g. "18 months".
  const perUnit = /month|\bmo\b/i.test(band) ? 1 : 12;

  const values = numbers.map(Number);
  const mid =
    values.length >= 2 ? (values[0] + values[1]) / 2 : values[0];
  return mid * perUnit;
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

/** Display label for a band. The stored value is a year range, not months. */
export const getAgeBandLabel = (band) => {
  if (!band) return '';
  if (/month|year|\bmo\b|\byr\b/i.test(band)) return band;
  if (!/\d/.test(band)) return band; // unrecognised value: show it as-is
  return `${String(band).replace('-', '–')} years`;
};

// Cold start: a brand new account has no deck and no spoken words, so the
// engine has nothing to rank. These are the fallback, not the normal path.
const STARTER_WORDS = [
  { word: 'mama', translation: '妈妈', category: 'Family' },
  { word: 'water', translation: '水', category: 'Food' },
  { word: 'ball', translation: '球', category: 'Toys' },
  { word: 'dog', translation: '狗', category: 'Animals' },
  { word: 'more', translation: '还要', category: 'Actions' },
];

const starterSuggestions = () =>
  STARTER_WORDS.map((d) => ({
    ...d,
    id: `starter-${d.word}`,
    language: 'en',
    reason: 'a starter word while your deck fills up',
    setIndex: 0,
    setName: 'Starter',
    accepted: true,
  }));

const generateBookSuggestions = (ageBand) => {
  const months = parseAgeBand(ageBand);

  // Under two: board books built around single labelled objects.
  if (months !== null && months <= 24) {
    return [
      { title: 'Baby Loves Chinese', author: 'Tuttle Publishing', ageRange: '0–2 years' },
      { title: 'First 100 Words (Bilingual)', author: 'Roger Priddy', ageRange: '0–2 years' },
      { title: 'My First Chinese Words', author: 'Faye-Lynn Wu', ageRange: '1–3 years' },
    ];
  }

  // Three and up: books with a story to talk about, not just labels.
  if (months !== null && months > 42) {
    return [
      { title: 'The Great Race', author: 'Christopher Corr', ageRange: '3–6 years' },
      { title: 'A Big Mooncake for Little Star', author: 'Grace Lin', ageRange: '3–6 years' },
      { title: 'Bringing In the New Year', author: 'Grace Lin', ageRange: '3–6 years' },
    ];
  }

  return [
    { title: 'My First Chinese Words', author: 'Faye-Lynn Wu', ageRange: '1–3 years' },
    { title: 'Dim Sum for Everyone!', author: 'Grace Lin', ageRange: '2–4 years' },
    { title: 'Mei Mei Loves Chinese', author: 'Various', ageRange: '1–3 years' },
  ];
};

const INTERACTION_PROMPTS = [
  ['Point and name objects during meals 🍽', 'Repeat the word slowly when your child looks at you 👀', 'Say the word again when they attempt it. No correction needed 💚'],
  ['Label what they point at in their own words 🫶', 'Use the word in a short sentence at bath time 🛁', 'Sing a word in a simple melody, repetition through music 🎵'],
  ['Narrate what you\'re both doing: "We\'re eating rice!" 🍚', 'Wait 3 seconds after saying a word, to give space for a response 🕐', 'Celebrate any attempt. A smile is enough 😊'],
];

export const useThisWeek = () => {
  const { currentUser, profile } = useAuth() || {};
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [flashcards, setFlashcards] = useState([]);
  const [spokenWords, setSpokenWords] = useState([]);
  const [tracking, setTracking] = useState([]);
  const weekStart = getCurrentWeekStart();
  // Only a real child name may be used here. The old chain fell back to the
  // ACCOUNT holder's name, so a parent called Rena was shown "Rena had a great
  // week" about her toddler. Onboarding does not capture child_name yet, so
  // null is the honest answer and every screen must render without a name.
  const childName = currentUser?.user_metadata?.child_name || null;
  const ageBand = profile?.child_age_band;
  const stage = getStageLabel(ageBand);

  const plan = useMemo(
    () => buildWeeklyPlan({ flashcards, spokenWords, tracking }),
    [flashcards, spokenWords, tracking]
  );

  // Must stay referentially stable: PlanScreen adopts this array in an effect,
  // so a fresh array each render would loop.
  const wordSuggestions = useMemo(
    () => (plan.suggestions.length ? plan.suggestions : starterSuggestions()),
    [plan]
  );
  const planSets = plan.sets;
  const setCount = plan.setCount || 1;
  const planSignals = plan.signals;
  const headline = useMemo(
    () => (plan.suggestions.length ? planHeadline(plan.signals, plan.setCount) : ''),
    [plan]
  );

  const bookSuggestions = useMemo(() => generateBookSuggestions(ageBand), [ageBand]);
  const prompts = useMemo(() => {
    const idx = Math.floor(Math.random() * INTERACTION_PROMPTS.length);
    return INTERACTION_PROMPTS[idx];
  }, []);

  const fetchData = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      // 30 days back covers the engine's 14-day ramp window with room to spare.
      const trackingFrom = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

      const [logsRes, cardsRes, spokenRes, trackingRes] = await Promise.all([
        supabase.from('weekly_logs').select('*').eq('user_id', currentUser.id).eq('week_start', weekStart).order('created_at', { ascending: false }),
        supabase.from('flashcards').select('*').eq('user_id', currentUser.id).limit(1000),
        supabase.from('spoken_words').select('word, word_stage, started_saying_at, created_at').eq('user_id', currentUser.id).limit(1000),
        supabase.from('daily_tracking').select('flashcard_id, date, user_local_date, engagement').eq('user_id', currentUser.id).gte('date', trackingFrom),
      ]);
      setLogs(logsRes.data || []);
      setFlashcards(cardsRes.data || []);
      setSpokenWords(spokenRes.data || []);
      setTracking(trackingRes.data || []);
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
    planSets, setCount, planSignals, headline, setSize: SET_SIZE,
    addLog, deleteLog, stats, refreshData: fetchData,
  };
};
