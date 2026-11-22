import React, { useMemo, useState } from 'react';
import { buildWordChoices } from './wordChoices';

export default function WordChoicePicker({ suggestion, pending, alternatives, cards, loading, onRetry, onChoose, onClose }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState('');
  const [saving, setSaving] = useState(false);
  const choices = useMemo(() => buildWordChoices(alternatives, cards, pending.map(s => s.word)), [alternatives, cards, pending]);
  const visible = choices.filter(choice => `${choice.front} ${choice.pinyin} ${choice.english}`.toLowerCase().includes(search.toLowerCase().trim()));
  return <div className="mt-3 p-3 rounded-xl border border-[#E4D6BF] bg-white text-left">
    <p className="text-sm font-semibold mb-2">Choose a replacement word</p>
    <input aria-label="Search replacement words" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search Chinese, pinyin or English" className="w-full border rounded-lg p-3 text-sm mb-2" />
    {loading && <p role="status" className="text-xs text-[#66737A]">Finding suggestions. You can choose from your saved cards below.</p>}
    <div role="radiogroup" aria-label="Replacement words" className="max-h-64 overflow-y-auto divide-y">
      {visible.map(choice => <label key={choice.front} className="flex items-center gap-3 py-3 cursor-pointer">
        <input type="radio" name={`replacement-${suggestion.id}`} checked={selected === choice.value} onChange={() => setSelected(choice.value)} disabled={saving} />
        <span className="text-sm"><strong>{choice.front}</strong> <span className="text-[#66737A]">{choice.pinyin} {choice.english && `· ${choice.english}`}</span><small className="block text-[#66737A]">{choice.source}</small></span>
      </label>)}
    </div>
    {!visible.length && !loading && <p className="text-sm py-2">No matching words. Try another search or refresh suggestions.</p>}
    <div className="flex flex-wrap gap-3 items-center mt-3">
      <button type="button" disabled={!selected || saving} className="btn-primary px-4 py-3 rounded-lg disabled:opacity-50" onClick={async () => { setSaving(true); try { if (await onChoose(selected)) onClose(); } finally { setSaving(false); } }}>{saving ? 'Saving…' : 'Use this word'}</button>
      <button type="button" disabled={loading || saving} className="text-sm underline" onClick={onRetry}>Refresh suggestions</button>
      <button type="button" disabled={saving} className="text-sm underline" onClick={onClose}>Cancel</button>
    </div>
  </div>;
}
