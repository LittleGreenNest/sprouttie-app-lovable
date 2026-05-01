import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Plus, X } from 'lucide-react';

const SUGGESTED_INTERESTS = [
  '🚚 Trucks', '🐶 Dogs', '🐱 Cats', '🦖 Dinosaurs', '🚂 Trains',
  '⚽ Balls', '🎵 Music', '💧 Water', '🛁 Bath', '🍌 Bananas',
  '📺 Bluey', '🧸 Stuffed toys', '🚗 Cars', '🌙 Moon', '🌧️ Rain',
];

const parseInterests = (raw) => {
  if (!raw) return [];
  return raw.split(',').map(s => s.trim()).filter(Boolean);
};

const InterestsCard = () => {
  const { currentUser } = useAuth();
  const [selected, setSelected] = useState([]);
  const [input, setInput] = useState('');
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef(null);

  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('child_interests')
        .eq('id', currentUser.id)
        .single();
      if (cancelled) return;
      setSelected(parseInterests(data?.child_interests));
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [currentUser]);

  useEffect(() => {
    if (!loaded || !currentUser) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await supabase
        .from('profiles')
        .update({ child_interests: selected.join(', ') })
        .eq('id', currentUser.id);
    }, 600);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [selected, loaded, currentUser]);

  const toggle = (label) => {
    setSelected(prev => prev.includes(label) ? prev.filter(s => s !== label) : [...prev, label]);
  };

  const addCustom = () => {
    const v = input.trim();
    if (!v) return;
    if (!selected.includes(v)) setSelected(prev => [...prev, v]);
    setInput('');
  };

  return (
    <div style={{ padding: '14px 14px' }}>
      <p style={{ fontSize: '12px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>
        ✨ What they're into right now
      </p>
      <p style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '8px', lineHeight: 1.4 }}>
        Sprouttie uses this to suggest words your child will actually care about.
      </p>

      <div className="flex gap-2 flex-wrap">
        {SUGGESTED_INTERESTS.map(label => {
          const isSelected = selected.includes(label);
          return (
            <button
              key={label}
              type="button"
              onClick={() => toggle(label)}
              style={{
                fontSize: '12px', fontWeight: 500,
                padding: '6px 12px', borderRadius: '20px',
                border: isSelected ? '0.5px solid #52B788' : '0.5px solid #D1D5DB',
                background: isSelected ? '#52B788' : '#fff',
                color: isSelected ? '#fff' : '#6B7280',
                cursor: 'pointer', minHeight: '32px'
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {selected.filter(s => !SUGGESTED_INTERESTS.includes(s)).length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {selected.filter(s => !SUGGESTED_INTERESTS.includes(s)).map(label => (
            <span key={label} className="flex items-center gap-1" style={{
              fontSize: '12px', background: '#52B788', color: '#fff',
              padding: '4px 10px', borderRadius: '16px',
            }}>
              {label}
              <button onClick={() => toggle(label)} style={{ marginLeft: '2px', color: '#fff', cursor: 'pointer' }}>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2 mt-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
          placeholder="Add your own (e.g. tractors, Peppa Pig)"
          style={{
            flex: 1, border: '0.5px solid #D1D5DB', borderRadius: '8px',
            padding: '8px 12px', fontSize: '13px', outline: 'none', color: '#1F2937'
          }}
          onFocus={(e) => e.target.style.borderColor = '#52B788'}
          onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
        />
        <button
          type="button"
          onClick={addCustom}
          style={{
            padding: '8px 12px', borderRadius: '8px',
            background: '#52B788', color: '#fff', fontSize: '13px', fontWeight: 500,
            border: 'none', cursor: 'pointer'
          }}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default InterestsCard;
