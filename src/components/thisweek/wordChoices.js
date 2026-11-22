import { splitSuggestedWord } from './weekWords.js';

export function buildWordChoices(alternatives = [], cards = [], excluded = []) {
  const key = value => splitSuggestedWord(value).front.trim().toLowerCase();
  const seen = new Set(excluded.map(key));
  const choices = [];
  const add = (value, source) => {
    const parsed = splitSuggestedWord(value);
    const id = key(value);
    if (!id || seen.has(id)) return;
    seen.add(id);
    choices.push({ value, ...parsed, source });
  };
  alternatives.filter(value => typeof value === 'string').forEach(value => add(value, 'Suggested'));
  cards.forEach(card => {
    const front = card.front || card.word || '';
    const parsed = splitSuggestedWord(front);
    const english = card.english || card.back || parsed.english;
    const pinyin = card.pinyin || parsed.pinyin;
    const value = /[㐀-鿿]/.test(parsed.front) && english
      ? `${english} (${parsed.front} ${pinyin || ''})`
      : pinyin ? `${parsed.front} (${pinyin})` : front;
    add(value, 'Your cards');
  });
  return choices;
}
