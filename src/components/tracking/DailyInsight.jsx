import React, { useState, useEffect } from 'react';
import { Lightbulb, ChevronDown, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

const DailyInsight = ({ dateString }) => {
  const { currentUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!currentUser || !dateString) return;
    loadInsight();
  }, [currentUser, dateString]);

  const loadInsight = async () => {
    const { data } = await supabase
      .from('weekly_logs')
      .select('*')
      .eq('user_id', currentUser.id)
      .eq('log_type', 'daily_insight')
      .eq('week_start', dateString)
      .maybeSingle();

    if (data) {
      setTitle(data.content || '');
      setBody(data.context || '');
      if (data.content || data.context) setOpen(true);
    } else {
      setTitle('');
      setBody('');
    }
  };

  const saveInsight = async () => {
    if (!currentUser) return;
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from('weekly_logs')
        .select('id')
        .eq('user_id', currentUser.id)
        .eq('log_type', 'daily_insight')
        .eq('week_start', dateString)
        .maybeSingle();

      if (existing) {
        await supabase.from('weekly_logs').update({ content: title, context: body }).eq('id', existing.id);
      } else {
        await supabase.from('weekly_logs').insert({
          user_id: currentUser.id,
          log_type: 'daily_insight',
          week_start: dateString,
          content: title,
          context: body,
        });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (err) {
      console.error('Error saving insight:', err);
    } finally {
      setSaving(false);
    }
  };

  const hasContent = title.trim() || body.trim();

  return (
    <div className="mx-4 mt-3">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between"
        style={{
          background: '#FFFBEB', border: '0.5px solid #FDE68A',
          borderRadius: '12px', padding: '12px 14px', cursor: 'pointer'
        }}
      >
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4" style={{ color: '#F59E0B' }} />
          <span style={{ fontSize: '14px', color: '#92400E', fontWeight: 500 }}>Insight for today</span>
          {hasContent && !open && (
            <span style={{ fontSize: '11px', background: '#FEF3C7', color: '#92400E', padding: '1px 6px', borderRadius: '8px', fontWeight: 500 }}>
              ✨
            </span>
          )}
        </div>
        {open
          ? <ChevronDown className="w-4 h-4" style={{ color: '#F59E0B' }} />
          : <ChevronRight className="w-4 h-4" style={{ color: '#F59E0B' }} />
        }
      </button>

      {open && (
        <div className="mt-2" style={{
          background: '#fff', border: '0.5px solid #D1D5DB',
          borderRadius: '12px', overflow: 'hidden', padding: '14px'
        }}>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. She said 'apple' clearly today!"
            style={{
              width: '100%', border: '0.5px solid #D1D5DB', borderRadius: '8px',
              padding: '10px 12px', fontSize: '14px', fontWeight: 600, outline: 'none',
              color: '#1F2937', marginBottom: '8px'
            }}
            onFocus={(e) => e.target.style.borderColor = '#F59E0B'}
            onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="More details: what happened, how your child reacted, what surprised you..."
            style={{
              width: '100%', border: '0.5px solid #D1D5DB', borderRadius: '8px',
              padding: '10px 12px', fontSize: '13px', lineHeight: 1.5,
              resize: 'none', outline: 'none', minHeight: '80px',
              color: '#1F2937'
            }}
            onFocus={(e) => e.target.style.borderColor = '#F59E0B'}
            onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
          />
          {hasContent && (
            <button
              onClick={saveInsight}
              disabled={saving}
              style={{
                marginTop: '8px', padding: '8px 16px', borderRadius: '8px',
                background: saved ? '#065F46' : '#F59E0B', color: '#fff',
                fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer',
                opacity: saving ? 0.7 : 1
              }}
            >
              {saving ? 'Saving...' : saved ? 'Saved ✓' : 'Save Insight'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default DailyInsight;
