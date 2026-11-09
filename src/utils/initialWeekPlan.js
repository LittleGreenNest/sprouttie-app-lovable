import { splitSuggestedWord } from '../components/thisweek/weekWords';
import { MAX_WORDS_PER_SET } from './planningEngine';

// Use the same bilingual parsing as the normal weekly planner. Pinyin belongs
// in its own field, never on the printable front or in the English meaning.
export function buildInitialWeekPlan(suggestions, theme, rationale, sets) {
  const count = Math.max(1, Math.min(3, sets || 1));
  const buckets = Array.from({ length: count }, (_, index) => ({ set_number: index + 1, words: [] }));
  (suggestions || []).slice(0, count * MAX_WORDS_PER_SET).forEach((suggestion, index) => {
    const parsed = splitSuggestedWord(suggestion.word);
    buckets[index % count].words.push({
      word: parsed.front,
      back: parsed.english || suggestion.english || '',
      pinyin: parsed.pinyin || suggestion.pinyin || '',
      category: suggestion.category || theme || 'Custom',
      stage_icon: '🌱',
      is_phrase: parsed.front.trim().split(/\s+/).length > 1,
      reason: suggestion.reason || null,
      activity: suggestion.activity || suggestion.activity_tip || null,
    });
  });
  return { theme, theme_rationale: rationale, sets: buckets };
}
