import { FREE_CARD_LIMIT } from './planLimits.js';

// Serialize writes in this app so a multi-card import cannot use a stale
// React count. The database migration provides the cross-device guard.
export function createFlashcardWriter(supabase) {
  let pending = Promise.resolve();
  return function insertFlashcards(rows, { single = false } = {}) {
    const operation = pending.then(async () => {
      const items = Array.isArray(rows) ? rows : [rows];
      const userId = items[0]?.user_id;
      if (!userId || items.some((row) => row.user_id !== userId)) {
        throw new Error('Could not identify the account for these cards. Please sign in again.');
      }
      const { data: profile, error: planError } = await supabase
        .from('profiles').select('plan').eq('id', userId).maybeSingle();
      if (planError) throw planError;
      if (!profile?.plan || profile.plan === 'free') {
        const { count, error: countError } = await supabase
          .from('flashcards').select('id', { count: 'exact', head: true }).eq('user_id', userId);
        if (countError) throw countError;
        if ((count || 0) + items.length > FREE_CARD_LIMIT) {
          throw new Error(`Free includes up to ${FREE_CARD_LIMIT} flashcards. Your existing cards are safe. Upgrade to add more.`);
        }
      }
      const request = supabase.from('flashcards').insert(rows).select('*');
      return await (single ? request.single() : request);
    });
    pending = operation.catch(() => {});
    return operation;
  }

}
