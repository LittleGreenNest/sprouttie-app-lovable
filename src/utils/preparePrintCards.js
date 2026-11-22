import { splitSuggestedWord } from '../components/thisweek/weekWords.js';

// Wait for missing pronunciations before exposing downloadable cards. Failed
// lookups stay retryable and never overwrite a parent's saved pronunciation.
export async function preparePrintCards(cards, lookup, cache = {}) {
  const prepared = cards.map(card => ({ ...card, pinyin: card.pinyin?.trim() || splitSuggestedWord(card.word).pinyin }));
  const missing = [...new Set(prepared.filter(card => !card.pinyin && /[㐀-鿿]/.test(card.word || '') && !cache[card.word]).map(card => card.word))];
  for (let index = 0; index < missing.length; index += 5) {
    await Promise.all(missing.slice(index, index + 5).map(async word => {
      try {
        const pinyin = String(await lookup(word) || '').trim();
        if (pinyin) cache[word] = pinyin;
      } catch { /* The UI reports missing pinyin; another preview can retry. */ }
    }));
  }
  return prepared.map(card => ({ ...card, pinyin: card.pinyin || cache[card.word] || '' }));
}
