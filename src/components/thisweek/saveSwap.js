// Read the updated ID back: an RLS-filtered zero-row update is not a saved swap.
export async function saveSwap(client, userId, id, word) {
  if (!userId || !id || typeof word !== 'string' || !word.trim()) throw new Error('Invalid replacement');
  const update = patch => client.from('weekly_suggestions').update(patch)
    .eq('id', id).eq('user_id', userId).eq('status', 'pending_review').select('id').single();
  let result = await update({ word, reason: null, activity_tip: null });
  if (result.error && /activity_tip/.test(result.error.message || '')) {
    result = await update({ word, reason: null });
  }
  if (result.error || result.data?.id !== id) throw result.error || new Error('Replacement was not saved');
  return true;
}
