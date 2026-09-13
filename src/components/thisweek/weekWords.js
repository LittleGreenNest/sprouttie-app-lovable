const CJK = /[㐀-䶿一-鿿]/;

export const hasCJK = (s) => CJK.test(s || '');

/**
 * The suggestion engine writes Mandarin words as "火车 (huǒ chē)". A card wants
 * the characters on the front and the pinyin in its own field, or the printed
 * card carries both on one face.
 */
export const splitSuggestedWord = (raw) => {
  const text = String(raw || '').trim();
  const match = text.match(/^(.+?)\s*[(（]([^)）]+)[)）]$/);
  if (match && hasCJK(match[1])) return { front: match[1].trim(), pinyin: match[2].trim() };
  return { front: text, pinyin: '' };
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
