// A card is stored as a front/back pair, but which language sits on the front
// depends on how it was created: 蜗牛 / "snail" for a Chinese-first card,
// "bouncing ball" / 拍球 for an English-first one. Either way the back is the
// half the reader is missing, so it is what we show alongside the front.

const CJK = /[\u4e00-\u9fff]/;

const clean = (value) => (typeof value === 'string' ? value.trim() : '');

export const hasChinese = (value) => CJK.test(clean(value));

export const getPrimaryText = (card) => clean(card?.front) || clean(card?.word);

// After updateFlashcard the local copy carries `english`; a freshly loaded row
// carries `back`. Read both so a just-filled translation shows without a reload.
export const getEnglishText = (card) => clean(card?.english) || clean(card?.back);

export const getSecondaryText = (card) => {
  const primary = getPrimaryText(card);
  const secondary = getEnglishText(card);
  if (!secondary || secondary.toLowerCase() === primary.toLowerCase()) return '';
  return secondary;
};

// A Chinese card with nothing on the back cannot be read or searched in
// English, which is the whole point of the pairing.
export const needsEnglish = (card) =>
  hasChinese(getPrimaryText(card)) && !getEnglishText(card);

// Pinyin is stored with tone marks (māo). Someone searching types "mao", so
// compare against a stripped copy as well as the stored one.
const stripTones = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export const wordMatchesQuery = (card, query) => {
  const q = clean(query).toLowerCase();
  if (!q) return true;

  const pinyin = clean(card?.pinyin).toLowerCase();
  const strippedPinyin = stripTones(pinyin);
  const haystack = [
    getPrimaryText(card),
    getEnglishText(card),
    pinyin,
    strippedPinyin,
    strippedPinyin.replace(/\s+/g, ''),
  ];

  const strippedQuery = stripTones(q);
  return haystack.some((value) => {
    const lower = clean(value).toLowerCase();
    return lower && (lower.includes(q) || lower.includes(strippedQuery));
  });
};
