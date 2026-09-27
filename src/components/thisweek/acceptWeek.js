import { supabase } from '@/integrations/supabase/client';
import { toLocalDateString } from '@/utils/week';
import { emptiestSetNumber, hasCJK, splitSuggestedWord } from './weekWords';

const norm = (s) => String(s || '').trim().toLowerCase();

// Chunked so five words never trip the translate-word rate limit. A failed
// lookup degrades to a blank English side, never blocks the accept.
const translate = async (words) => {
  const out = {};
  for (let i = 0; i < words.length; i += 5) {
    const results = await Promise.all(
      words.slice(i, i + 5).map(async (w) => {
        try {
          const { data, error } = await supabase.functions.invoke('translate-word', { body: { word: w } });
          if (error) throw error;
          return [w, { english: data?.english || '', pinyin: data?.pinyin || '' }];
        } catch (err) {
          console.warn('translate-word failed for', w, err);
          return [w, { english: '', pinyin: '' }];
        }
      })
    );
    results.forEach(([w, v]) => { out[w] = v; });
  }
  return out;
};

/**
 * Accepts this week's suggestions and puts the words where the parent will
 * actually flash them.
 *
 * The Word Planner's accept only adds words to a backlog as waiting cards with
 * no set, and nothing in the app moves a waiting card into a set, so accepted
 * words never reached the Log page. Here, words that are not already in a set
 * go into the emptiest of the five sets. Cards previously in that set are taken
 * out of it, never deleted. Words already in a set stay where they are, so
 * accepting a plan cannot quietly shrink a set the parent is running.
 *
 * Writes go straight to Supabase rather than through updateSetFlashcards, which
 * swallows its errors. Suggestions are marked accepted last, so a failure part
 * way leaves them pending and the parent can simply tap again.
 */
export async function acceptWeek({ userId, weekStart, suggestions }) {
  const { data: cards, error: cardsError } = await supabase
    .from('flashcards')
    .select('id, front, set_number')
    .eq('user_id', userId)
    .limit(2000);
  if (cardsError) throw cardsError;

  const byFront = new Map((cards || []).map((c) => [norm(c.front), c]));
  const words = [];
  const seen = new Set();
  suggestions.forEach((s) => {
    const { front, pinyin, english } = splitSuggestedWord(s.word);
    const key = norm(front);
    if (!front || seen.has(key)) return;
    seen.add(key);
    words.push({ s, front, pinyin, english, key });
  });

  const missing = words.filter((w) => !byFront.has(w.key));
  const needLookup = missing.filter((w) => !w.english || !w.pinyin);
  const translations = needLookup.length ? await translate(needLookup.map((w) => w.front)) : {};
  const today = toLocalDateString(new Date());

  if (missing.length) {
    const { data: inserted, error: insertError } = await supabase
      .from('flashcards')
      .insert(
        missing.map((w) => ({
          user_id: userId,
          front: w.front,
          back: w.english || translations[w.front]?.english || '',
          pinyin: w.pinyin || translations[w.front]?.pinyin || null,
          folder: w.s.category || w.s.theme || 'default',
          card_type: 'word',
          card_language: hasCJK(w.front) ? 'zh' : 'en',
          card_status: 'active',
          date_introduced: today,
        }))
      )
      .select('id, front, set_number');
    if (insertError) throw insertError;
    (inserted || []).forEach((c) => byFront.set(norm(c.front), c));
  }

  const weekCards = words.map((w) => byFront.get(w.key)).filter(Boolean);
  const toPlace = weekCards.filter((c) => !c.set_number).map((c) => c.id);
  let setNumber = null;

  if (toPlace.length) {
    setNumber = emptiestSetNumber((cards || []).filter((c) => !toPlace.includes(c.id)));

    const { error: clearError } = await supabase
      .from('flashcards')
      .update({ set_number: null })
      .eq('user_id', userId)
      .eq('set_number', setNumber);
    if (clearError) throw clearError;

    const { error: placeError } = await supabase
      .from('flashcards')
      .update({ set_number: setNumber, card_status: 'active' })
      .eq('user_id', userId)
      .in('id', toPlace);
    if (placeError) throw placeError;
  }

  // Keeps the Word Planner's list for this week in step. Not fatal: the cards
  // and sets above are what the parent flashes from.
  const { data: planned } = await supabase
    .from('word_plans')
    .select('word')
    .eq('user_id', userId)
    .eq('planned_week_start', weekStart);
  const plannedWords = new Set((planned || []).map((p) => norm(p.word)));
  const planRows = words
    .filter((w) => !plannedWords.has(w.key))
    .map((w, i) => ({
      user_id: userId,
      word: w.front,
      pinyin: w.pinyin || translations[w.front]?.pinyin || null,
      theme: w.s.theme || w.s.category || null,
      planned_week_start: weekStart,
      display_order: (planned || []).length + i,
    }));
  if (planRows.length) {
    const { error: planError } = await supabase.from('word_plans').insert(planRows);
    if (planError) console.warn('word_plans insert failed:', planError.message);
  }

  const { error: acceptError } = await supabase
    .from('weekly_suggestions')
    .update({ status: 'accepted' })
    .in('id', suggestions.map((s) => s.id));
  if (acceptError) throw acceptError;

  return { setNumber, placed: toPlace.length };
}
