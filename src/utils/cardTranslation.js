import { lookupCommonTranslation } from '../../supabase/functions/_shared/commonMandarin.js';
import { withTimeout } from './requestTimeout.js';

export function validateTranslation(data, direction) {
  if (!data || data.error || typeof data.english !== 'string' || !data.english.trim() ||
      typeof data.pinyin !== 'string' || !data.pinyin.trim() ||
      (direction === 'en-to-zh' && (typeof data.chinese !== 'string' || !/[㐀-鿿]/.test(data.chinese)))) {
    throw new Error('The translation was incomplete. Please retry or fill in the fields yourself.');
  }
  return data;
}

// A generation changes on every input, manual edit, reset and unmount. Late
// responses can populate the session cache but never touch a newer form.
export function createCardTranslator({ invoke, onResult, onState, debounceMs = 300, timeoutMs = 11000 }) {
  let generation = 0, timer;
  const cache = new Map();
  const cancel = () => { generation++; clearTimeout(timer); onState({ loading: false, error: '' }); };
  const change = (word, direction = 'zh-to-en', immediate = false) => {
    cancel();
    const term = word.trim();
    if (!term || (direction !== 'en-to-zh' && !/[㐀-鿿]/.test(term))) return;
    const current = generation;
    const key = `${direction}:${term.toLowerCase()}`;
    const known = cache.get(key) || lookupCommonTranslation(term, direction);
    if (known) { onResult(known); return; }
    onState({ loading: true, error: '' });
    timer = setTimeout(async () => {
      try {
        const result = await withTimeout(invoke(term, direction), timeoutMs);
        const data = validateTranslation(result, direction);
        cache.set(key, data);
        if (generation === current) { onResult(data); onState({ loading: false, error: '' }); }
      } catch {
        if (generation === current) onState({ loading: false, error: 'Translation is unavailable right now. Retry, or fill in Chinese, English and pinyin yourself.' });
      }
    }, immediate ? 0 : debounceMs);
  };
  return { change, cancel };
}

export function mandarinCardReady({ chinese, english, pinyin, translating }) {
  return !translating && /[㐀-鿿]/.test(chinese || '') && Boolean(english?.trim()) && Boolean(pinyin?.trim());
}
