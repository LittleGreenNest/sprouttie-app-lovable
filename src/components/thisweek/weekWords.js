const CJK = /[㐀-䶿一-鿿]/;

export const hasCJK = (s) => CJK.test(s || '');

const CJK_RUN = /[㐀-䶿一-鿿][㐀-䶿一-鿿\s]*/;
const PARENS = /^(.+?)\s*[(（]([^)）]+)[)）]$/;
const SLASH = /^(.+?)\s*[/／]\s*(.+)$/;

/**
 * Splits a suggested word into what goes on the card. The engine's prompt does
 * not fix an order, and it has written "火车 (huǒ chē)", "leaf (树叶 shù yè)"
 * and "火车 (huǒ chē) / Train". Whichever it sends, the characters go on the
 * front, pinyin and English in their own fields, or the printed card carries
 * all three on one face.
 */
export const splitSuggestedWord = (raw) => {
  const full = String(raw || '').trim();
  if (!hasCJK(full)) return { front: full, pinyin: '', english: '' };

  // "火车 (huǒ chē) / Train": the English sits on the far side of a slash.
  // Split there first, then read the Chinese side as before.
  const slash = full.match(SLASH);
  if (slash && hasCJK(slash[1]) !== hasCJK(slash[2])) {
    const [zh, en] = hasCJK(slash[1]) ? [slash[1], slash[2]] : [slash[2], slash[1]];
    const rest = splitSuggestedWord(zh);
    return { ...rest, english: rest.english || en.trim() };
  }

  const text = full;
  const match = text.match(PARENS);
  if (!match) {
    // "火车 huǒ chē": characters, then pinyin, no bracket.
    const chars = (text.match(CJK_RUN) || [''])[0].replace(/\s+/g, '');
    const after = text.replace(CJK_RUN, ' ').replace(/\s+/g, ' ').trim();
    return chars && after && !hasCJK(after) && text.startsWith(chars[0])
      ? { front: chars, pinyin: after, english: '' }
      : { front: text, pinyin: '', english: '' };
  }

  const outside = match[1].trim();
  const inside = match[2].trim();
  const [cjkPart, otherPart] = hasCJK(outside) ? [outside, inside] : [inside, outside];

  const chars = (cjkPart.match(CJK_RUN) || [''])[0].replace(/\s+/g, '');
  const afterChars = cjkPart.replace(CJK_RUN, ' ').replace(/\s+/g, ' ').trim();

  // "火车 (huǒ chē)": the bracket holds pinyin.
  // "leaf (树叶 shù yè)": English outside, pinyin after the characters.
  // "火车 huǒ chē (train)": pinyin after the characters, English in the bracket.
  if (hasCJK(outside)) {
    return afterChars
      ? { front: chars, pinyin: afterChars, english: otherPart }
      : { front: chars, pinyin: otherPart, english: '' };
  }
  return { front: chars, pinyin: afterChars, english: otherPart };
};

/** Set 1 to 5 holding the fewest cards. The lowest number wins a tie. */
export const emptiestSetNumber = (cards = []) => {
  const counts = [0, 0, 0, 0, 0];
  cards.forEach((c) => {
    if (c.set_number >= 1 && c.set_number <= 5) counts[c.set_number - 1] += 1;
  });
  let best = 0;
  counts.forEach((n, i) => {
    if (n < counts[best]) best = i;
  });
  return best + 1;
};
