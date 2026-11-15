// Keep the stored display string compatible with existing weekly-plan readers.
// New model responses must supply the three fields independently.
export function normaliseSuggestion(s: any, mandarin: boolean) {
  if (!s || typeof s !== 'object') throw new Error('Invalid suggestion');
  if (!mandarin) {
    if (typeof s.word !== 'string' || !s.word.trim()) throw new Error('Missing word');
    return s;
  }
  const chinese = typeof s.chinese === 'string' ? s.chinese.trim() : '';
  const pinyin = typeof s.pinyin === 'string' ? s.pinyin.trim() : '';
  const english = typeof s.english === 'string' ? s.english.trim() : '';
  if (!/^[\p{Script=Han}\s，。！？、]+$/u.test(chinese) || !/[\p{Script=Han}]/u.test(chinese) ||
      !/[a-z]/i.test(pinyin) || /[\p{Script=Han}]/u.test(pinyin) ||
      !/[a-z]/i.test(english) || /[\p{Script=Han}]/u.test(english)) {
    throw new Error('The suggested words are missing translations. Please try again.');
  }
  return { ...s, chinese, pinyin, english, word: `${english} (${chinese} ${pinyin})` };
}
