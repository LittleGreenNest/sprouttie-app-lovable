import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

/* ─── colour tokens (spec values) ─── */
const C = {
  cream:     '#F5F2EC',
  white:     '#FFFFFF',
  sage:      '#3B7A57',
  sageMid:   '#5A9470',
  sageLight: '#A8CDB8',
  sagePale:  '#E8F3EC',
  sageMist:  '#F0F7F2',
  stone:     '#E8E3D8',
  stoneMid:  '#D4CEBF',
  charcoal:  '#1E2D27',
  ink:       '#2C3A32',
  muted:     '#7A8A7E',
  faint:     '#B8C0BC',
  amberBg:   '#FEF6E4',
  amberText: '#8A6B1A',
  phraseBg:  '#EDF2FA',
  phraseClr: '#3A5F9A',
  doneBg:    '#EBF5EF',
};

const shadow = {
  card:    '0 1px 3px rgba(30,45,39,.06), 0 4px 14px rgba(30,45,39,.05)',
  primary: '0 4px 16px rgba(59,122,87,.25)',
  today:   '0 4px 20px rgba(59,122,87,.22)',
};

/* ─── date helpers ─── */
const getWeekStart = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.getFullYear(), d.getMonth(), diff);
};

const formatDateStr = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const formatShortDate = (date) => {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${date.getDate()} ${months[date.getMonth()]}`;
};

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/* ─── tiny visual helpers ─── */
const Pips = ({ filled, total = 5, graduated = false }) => (
  <div style={{ display: 'flex', gap: 3 }}>
    {Array.from({ length: total }).map((_, i) => (
      <div key={i} style={{
        width: 9, height: 9, borderRadius: '50%',
        background: graduated ? C.sageLight : i < filled ? C.sage : C.stone,
      }} />
    ))}
  </div>
);

const Tag = ({ text, bg, color }) => (
  <span style={{
    fontSize: 9, fontFamily: 'Inter', fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: 0.5, padding: '2px 6px', borderRadius: 3, background: bg, color,
  }}>{text}</span>
);

const SpokenChip = ({ text }) => (
  <span style={{
    background: C.amberBg, color: C.amberText,
    fontSize: 10, fontFamily: 'Inter', fontWeight: 600,
    padding: '1px 6px', borderRadius: 3, display: 'inline-flex', whiteSpace: 'nowrap',
  }}>{text}</span>
);

const SubLabel = ({ text }) => (
  <div style={{
    padding: '7px 20px 5px', fontFamily: 'Inter', fontSize: 10, fontWeight: 700,
    letterSpacing: 1, textTransform: 'uppercase', color: C.muted,
    background: C.cream, borderTop: `1px solid ${C.stone}`, borderBottom: `1px solid ${C.stone}`,
  }}>{text}</div>
);

const SectionHeader = ({ title, right }) => (
  <>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
      <h2 style={{ fontFamily: "'Playfair Display'", fontSize: 20, fontWeight: 600, color: C.charcoal, margin: 0 }}>{title}</h2>
      <span style={{ fontFamily: 'Inter', fontSize: 12, color: C.muted }}>{right}</span>
    </div>
    <div style={{ height: 1, background: C.stoneMid, marginBottom: 14 }} />
  </>
);

/* ─── Word Row (active) ─── */
const ActiveWordRow = ({ word, emoji, meta, day, phrase, isLast }) => (
  <div style={{
    display: 'grid', gridTemplateColumns: '20px 1fr auto', padding: '10px 20px', gap: 10,
    borderBottom: isLast ? 'none' : `1px solid rgba(232,227,216,.5)`,
  }}>
    <span style={{ fontSize: 14 }}>{emoji}</span>
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 3 }}>
        <span style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 500, color: C.ink }}>{word}</span>
        {phrase && <Tag text="Phrase" bg={C.phraseBg} color={C.phraseClr} />}
      </div>
      <div style={{ fontFamily: 'Inter', fontSize: 11, color: C.muted, lineHeight: 1.4 }}>
        {meta}
      </div>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
      <Pips filled={day} />
      <span style={{ fontFamily: 'Inter', fontSize: 10, color: C.faint, whiteSpace: 'nowrap' }}>Day {day} of 5</span>
    </div>
  </div>
);

/* ─── Queued Word Row ─── */
const QueuedWordRow = ({ rank, word, tags, ai, isLast }) => {
  const borderColor = rank === 1 ? C.sage : rank === 2 ? C.sageMid : C.sageLight;
  const badgeBg = rank === 1 ? C.sage : rank === 2 ? C.sageMid : C.sageLight;
  const badgeColor = rank <= 2 ? '#fff' : C.charcoal;
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '20px 1fr auto', padding: '10px 20px', paddingLeft: 17, gap: 10,
      background: '#FAFDF9', borderLeft: `3px solid ${borderColor}`,
      borderBottom: isLast ? 'none' : `1px solid rgba(232,227,216,.5)`,
    }}>
      <span style={{
        width: 16, height: 16, borderRadius: '50%', background: badgeBg, color: badgeColor,
        fontFamily: 'Inter', fontSize: 9, fontWeight: 700,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>{rank}</span>
      <div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 3, alignItems: 'center' }}>
          <span style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 600, color: C.charcoal }}>{word}</span>
          {(tags || []).map(t => {
            if (t === 'Next to enter') return <Tag key={t} text={t} bg={C.sagePale} color={C.sage} />;
            return <Tag key={t} text={t} bg={C.stone} color={C.muted} />;
          })}
        </div>
        {ai && <div style={{ fontFamily: 'Inter', fontSize: 11, color: C.sageMid, fontStyle: 'italic', lineHeight: 1.4 }}>{ai}</div>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
        <Pips filled={0} />
        <span style={{ fontFamily: 'Inter', fontSize: 10, color: C.faint, whiteSpace: 'nowrap' }}>queued</span>
      </div>
    </div>
  );
};

const AIContextBanner = ({ children }) => (
  <div style={{
    background: C.sageMist, borderTop: `1px solid ${C.stone}`, borderBottom: `1px solid ${C.stone}`,
    padding: '11px 20px', display: 'flex', gap: 9, alignItems: 'flex-start',
  }}>
    <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>🤖</span>
    <span style={{ fontFamily: 'Inter', fontSize: 12, color: C.ink, lineHeight: 1.6 }}>{children}</span>
  </div>
);

/* ─── DaySquare for check-in ─── */
const DaySquare = ({ sessions }) => {
  const dots = sessions >= 3
    ? [C.white, C.white, C.white]
    : sessions === 2
    ? [C.sageLight, C.sageLight, C.stoneMid]
    : sessions === 1
    ? [C.sageLight, C.stoneMid, C.stoneMid]
    : [];
  const bg = sessions >= 3 ? C.sage : sessions > 0 ? C.sagePale : C.stone;
  const border = sessions > 0 && sessions < 3 ? `1.5px solid ${C.sageLight}` : 'none';
  return (
    <div style={{
      width: 36, height: 36, borderRadius: 6, background: bg, border,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2,
    }}>
      {dots.map((c, i) => (
        <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: c }} />
      ))}
    </div>
  );
};

/* ─── This Week Set Card ─── */
const ThisWeekSetCard = ({ set }) => (
  <div style={{ background: C.white, border: `1px solid ${C.stone}`, borderRadius: 16, overflow: 'hidden', marginBottom: 10, boxShadow: shadow.card }}>
    <div style={{
      padding: '13px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      background: C.cream, borderBottom: `1px solid ${C.stone}`,
    }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
        <span style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: 700, color: C.charcoal }}>{set.name}</span>
        <span className="set-sub" style={{ fontFamily: 'Inter', fontSize: 11, color: C.muted }}>· {set.active.length} words</span>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <span style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 10, background: C.stone, color: C.muted }}>{set.active.length} active</span>
        <span style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 10, background: C.sagePale, color: C.sage }}>{set.queued.length} queued</span>
      </div>
    </div>
    <SubLabel text="Flashing this week" />
    {set.active.map((w, i) => (
      <ActiveWordRow key={i} {...w} isLast={i === set.active.length - 1} />
    ))}
    {set.aiContext && <AIContextBanner>{set.aiContext}</AIContextBanner>}
    {set.queued.length > 0 && (
      <>
        <SubLabel text="Coming up next — in order" />
        {set.queued.map((w, i) => (
          <QueuedWordRow key={i} {...w} isLast={i === set.queued.length - 1} />
        ))}
      </>
    )}
  </div>
);

/* ─── Last Week Set Card (collapsible) ─── */
const LastWeekSetCard = ({ set }) => {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ background: C.white, border: `1px solid ${C.stone}`, borderRadius: 16, overflow: 'hidden', marginBottom: 10, boxShadow: shadow.card }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          padding: '13px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: C.cream, borderBottom: open ? `1px solid ${C.stone}` : 'none', cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
          <span style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: 700, color: C.charcoal }}>{set.name}</span>
          <span style={{ fontFamily: 'Inter', fontSize: 11, color: C.muted }}>· {set.wordCount} words</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {set.graduated.length > 0 && (
            <span style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 10, background: C.doneBg, color: C.sage }}>
              ✓ {set.graduated.map(g => g.word).join(', ')} graduated
            </span>
          )}
          <span style={{
            transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            fontSize: 12, color: C.muted,
          }}>▼</span>
        </div>
      </div>

      {open && (
        <div>
          {set.graduated.length > 0 && (
            <>
              <SubLabel text="✓ Graduated" />
              {set.graduated.map((g, i) => (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '20px 1fr auto', padding: '10px 20px', gap: 10,
                  background: C.sageMist,
                  borderBottom: i < set.graduated.length - 1 ? `1px solid rgba(232,227,216,.5)` : 'none',
                }}>
                  <div style={{
                    width: 15, height: 15, borderRadius: '50%', background: C.sage, color: '#fff',
                    fontFamily: 'Inter', fontSize: 9, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>✓</div>
                  <div>
                    <span style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 600, color: C.sageMid }}>{g.word}</span>
                    <div style={{ fontFamily: 'Inter', fontSize: 11, color: C.muted, lineHeight: 1.4 }}>Completed 5 days · retired</div>
                  </div>
                  <Pips filled={5} graduated />
                </div>
              ))}
            </>
          )}
          {set.words.length > 0 && (
            <>
              <SubLabel text="Still in progress" />
              {set.words.map((w, i) => (
                <ActiveWordRow key={i} {...w} isLast={i === set.words.length - 1} />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
};

/* ─── Legend ─── */
const LegendBar = () => (
  <div style={{
    display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center',
    background: C.sageMist, border: `1px solid ${C.stone}`, borderRadius: 8,
    padding: '12px 18px', marginTop: 4,
  }}>
    {[
      { icon: '🌱', label: 'New / Sprouting' },
      { icon: '🌿', label: 'Growing (carried over)' },
      { icon: '🌳', label: 'Graduated / Retired' },
    ].map(l => (
      <div key={l.label} style={{ display: 'flex', gap: 5, alignItems: 'center', fontFamily: 'Inter', fontSize: 11, color: C.muted }}>
        <span>{l.icon}</span> {l.label}
      </div>
    ))}
    <div style={{ display: 'flex', gap: 5, alignItems: 'center', fontFamily: 'Inter', fontSize: 11, color: C.muted }}>
      <div style={{ display: 'flex', gap: 2 }}>
        {[C.sage, C.sage, C.stone, C.stone, C.stone].map((c, i) => (
          <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: c }} />
        ))}
      </div>
      Days flashed (5 = graduates)
    </div>
  </div>
);

/* ─── Last Week Check-in ─── */
const LastWeekCheckin = ({ daySessions, totalFullDays }) => {
  const [pace, setPace] = useState(3);
  const label = totalFullDays >= 5 ? '✓ Strong week' : totalFullDays >= 3 ? '◐ Decent week' : 'Getting started';
  return (
    <div style={{ background: C.white, border: `1px solid ${C.stone}`, borderRadius: 12, overflow: 'hidden', marginBottom: 28, boxShadow: shadow.card }}>
      <div style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: 600, letterSpacing: 1.2, textTransform: 'uppercase', color: C.muted }}>Last Week Check-in</span>
          <span style={{ background: C.sagePale, color: C.sage, fontFamily: 'Inter', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20 }}>{label}</span>
        </div>
        <p style={{ fontFamily: 'Inter', fontSize: 14, color: C.ink, lineHeight: 1.55, margin: 0 }}>
          You flashed on <strong style={{ color: C.sage }}>{totalFullDays} day{totalFullDays !== 1 ? 's' : ''}</strong> last week.
        </p>
        <div style={{ display: 'flex', gap: 5, marginBottom: 8, marginTop: 14 }}>
          {daySessions.map((d, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <span style={{ fontFamily: 'Inter', fontSize: 9, fontWeight: 700, color: C.faint, textTransform: 'uppercase' }}>{DAY_LABELS[i]}</span>
              <DaySquare sessions={d} />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 14, marginBottom: 16, flexWrap: 'wrap' }}>
          {[
            { bg: C.sage, border: 'none', label: 'Full day (3 sessions)' },
            { bg: C.sagePale, border: `1.5px solid ${C.sageLight}`, label: 'Partial (1–2 sessions)' },
            { bg: C.stone, border: 'none', label: 'Missed' },
          ].map((l, i) => (
            <div key={i} style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
              <div style={{ width: 11, height: 11, borderRadius: 3, background: l.bg, border: l.border }} />
              <span style={{ fontFamily: 'Inter', fontSize: 11, color: C.muted }}>{l.label}</span>
            </div>
          ))}
        </div>
        <div style={{ fontFamily: 'Inter', fontSize: 12, color: C.muted, marginBottom: 6 }}>Confirm your pace for this week</div>
        <div style={{ display: 'flex', background: C.cream, border: `1px solid ${C.stone}`, borderRadius: 8, padding: 3, gap: 3 }}>
          {[3, 2].map(n => (
            <button key={n} onClick={() => setPace(n)} style={{
              flex: 1, padding: 8, textAlign: 'center', fontFamily: 'Inter', fontSize: 13, fontWeight: 600,
              border: 'none', borderRadius: 6, cursor: 'pointer',
              background: pace === n ? C.sage : 'transparent',
              color: pace === n ? '#fff' : C.muted,
              boxShadow: pace === n ? '0 2px 8px rgba(59,122,87,.2)' : 'none',
            }}>
              {n} sessions / day
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ─── Today Launchpad ─── */
const TodayLaunchpad = ({ totalSets, totalWords, todaySessions }) => {
  const today = new Date();
  const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const dateLabel = `${dayNames[today.getDay()]} ${today.getDate()} ${months[today.getMonth()]}`;
  const dayOfWeek = today.getDay() === 0 ? 7 : today.getDay(); // Mon=1

  return (
    <div style={{ background: C.sage, borderRadius: 16, overflow: 'hidden', boxShadow: shadow.today, marginBottom: 12 }}>
      <div style={{ padding: '20px 24px 18px', display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: 'rgba(255,255,255,.6)', marginBottom: 4 }}>Today · {dateLabel}</div>
          <div style={{ fontFamily: "'Playfair Display'", fontSize: 22, color: '#fff', letterSpacing: -0.2, marginBottom: 5 }}>
            {todaySessions > 0 ? `${todaySessions} session${todaySessions !== 1 ? 's' : ''} logged` : 'No sessions yet'}
          </div>
          <div style={{ fontFamily: 'Inter', fontSize: 13, color: 'rgba(255,255,255,.72)' }}>
            Day {dayOfWeek} of 7 · {totalSets} set{totalSets !== 1 ? 's' : ''} · {totalWords} words
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── MAIN PAGE ─── */
const WordPlannerPage = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [thisWeekSets, setThisWeekSets] = useState([]);
  const [lastWeekSets, setLastWeekSets] = useState([]);
  const [lastWeekDaySessions, setLastWeekDaySessions] = useState([0, 0, 0, 0, 0, 0, 0]);
  const [todaySessions, setTodaySessions] = useState(0);
  const [spokenWords, setSpokenWords] = useState([]);

  const now = new Date();
  const thisWeekStart = getWeekStart(now);
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const thisWeekEnd = new Date(thisWeekStart);
  thisWeekEnd.setDate(thisWeekEnd.getDate() + 6);
  const lastWeekEnd = new Date(lastWeekStart);
  lastWeekEnd.setDate(lastWeekEnd.getDate() + 6);

  const buildSetsFromFlashcards = useCallback((flashcards, trackingMap) => {
    // Group flashcards by set_number
    const setGroups = {};
    const unassigned = [];
    flashcards.forEach(fc => {
      if (fc.set_number) {
        if (!setGroups[fc.set_number]) setGroups[fc.set_number] = [];
        setGroups[fc.set_number].push(fc);
      } else {
        unassigned.push(fc);
      }
    });

    const sortedSetNums = Object.keys(setGroups).map(Number).sort((a, b) => a - b);

    return sortedSetNums.map(setNum => {
      const cards = setGroups[setNum];
      const activeCards = cards.filter(c => c.card_status === 'active' || c.card_status === 'waiting');
      const retiredCards = cards.filter(c => c.card_status === 'retired');

      // Build active word rows
      const active = activeCards
        .sort((a, b) => (a.set_display_order || 0) - (b.set_display_order || 0))
        .map(card => {
          const dayCount = card.active_day_count || 0;
          const isPhrase = card.card_type === 'phrase';
          const remaining = Math.max(0, 5 - dayCount);
          let meta = '';
          if (dayCount === 0) meta = 'Just entered — 5 days to go';
          else if (remaining <= 1) meta = "Almost done — graduates after tomorrow's flash";
          else meta = `Needs ${remaining} more days`;

          // Check tracking for flash count
          const trackCount = trackingMap[card.id] || 0;

          return {
            word: card.front,
            emoji: dayCount >= 3 ? '🌿' : '🌱',
            meta,
            day: dayCount,
            phrase: isPhrase,
          };
        });

      // Queued words from word_plans or waiting cards not in set
      const queued = [];

      return {
        name: `Set ${setNum}`,
        active,
        queued,
        aiContext: null,
      };
    });
  }, []);

  const loadData = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const uid = currentUser.id;
      const thisWeekStr = formatDateStr(thisWeekStart);
      const lastWeekStr = formatDateStr(lastWeekStart);
      const todayStr = formatDateStr(now);
      const lastWeekEndStr = formatDateStr(lastWeekEnd);

      // Parallel queries
      const [flashcardsRes, trackingRes, sessionsRes, spokenRes, lastWeekTrackingRes, todaySessionsRes, wordPlansRes] = await Promise.all([
        supabase.from('flashcards').select('*').eq('user_id', uid).neq('card_status', 'retired'),
        supabase.from('daily_tracking').select('flashcard_id, date, status').eq('user_id', uid).eq('status', 'flashed').gte('date', thisWeekStr),
        supabase.from('daily_flashing_sessions').select('session_date, session_occurred').eq('user_id', uid).gte('session_date', lastWeekStr).lte('session_date', lastWeekEndStr),
        supabase.from('spoken_words').select('word, word_stage').eq('user_id', uid).order('created_at', { ascending: false }).limit(20),
        supabase.from('daily_tracking').select('flashcard_id, date, status').eq('user_id', uid).eq('status', 'flashed').gte('date', lastWeekStr).lt('date', thisWeekStr),
        supabase.from('daily_flashing_sessions').select('*').eq('user_id', uid).eq('session_date', todayStr),
        supabase.from('word_plans').select('*').eq('user_id', uid).eq('planned_week_start', thisWeekStr).order('display_order', { ascending: true }),
      ]);

      // Spoken words
      setSpokenWords(spokenRes.data || []);

      // Today's sessions count
      setTodaySessions((todaySessionsRes.data || []).filter(s => s.session_occurred).length);

      // Build tracking map for this week (flashcard_id -> count of days flashed)
      const thisWeekTracking = trackingRes.data || [];
      const trackingMap = {};
      thisWeekTracking.forEach(t => {
        trackingMap[t.flashcard_id] = (trackingMap[t.flashcard_id] || 0) + 1;
      });

      // Build this week sets
      const flashcards = flashcardsRes.data || [];
      const sets = buildSetsFromFlashcards(flashcards, trackingMap);

      // Add queued words from word_plans
      const wordPlans = wordPlansRes.data || [];
      const flashcardWords = new Set(flashcards.map(f => f.front?.toLowerCase()));
      const queuedWords = wordPlans.filter(wp => !flashcardWords.has(wp.word?.toLowerCase()));
      if (sets.length > 0 && queuedWords.length > 0) {
        // Distribute queued words across sets
        queuedWords.forEach((wp, i) => {
          const setIdx = i % sets.length;
          sets[setIdx].queued.push({
            rank: sets[setIdx].queued.length + 1,
            word: wp.word,
            tags: sets[setIdx].queued.length === 0 ? ['Next to enter', wp.theme || 'General'] : [wp.theme || 'General'],
            ai: wp.notes || null,
          });
        });
      }

      // Add AI context from spoken words
      const recentSpoken = (spokenRes.data || []).slice(0, 5);
      if (recentSpoken.length > 0 && sets.length > 0) {
        sets[0].aiContext = (
          <>
            Your child is saying{' '}
            {recentSpoken.slice(0, 3).map((sw, i) => (
              <React.Fragment key={i}>
                {i > 0 && (i === Math.min(recentSpoken.length, 3) - 1 ? ' and ' : ', ')}
                <SpokenChip text={sw.word} />
              </React.Fragment>
            ))}
            {' '}— this week's words build on their current vocabulary.
          </>
        );
      }

      // If no sets with set_number, show all flashcards as one set
      if (sets.length === 0 && flashcards.length > 0) {
        const allActive = flashcards
          .sort((a, b) => (a.set_display_order || 0) - (b.set_display_order || 0))
          .map(card => {
            const dayCount = card.active_day_count || 0;
            const remaining = Math.max(0, 5 - dayCount);
            return {
              word: card.front,
              emoji: dayCount >= 3 ? '🌿' : '🌱',
              meta: dayCount === 0 ? 'Just entered — 5 days to go' : remaining <= 1 ? "Almost done" : `Needs ${remaining} more days`,
              day: dayCount,
              phrase: card.card_type === 'phrase',
            };
          });

        sets.push({
          name: 'All Words',
          active: allActive.slice(0, 10),
          queued: queuedWords.map((wp, i) => ({
            rank: i + 1,
            word: wp.word,
            tags: i === 0 ? ['Next to enter'] : [],
            ai: wp.notes || null,
          })),
          aiContext: recentSpoken.length > 0 ? (
            <>Your child is saying {recentSpoken.slice(0, 3).map((sw, i) => (
              <React.Fragment key={i}>
                {i > 0 && (i === Math.min(recentSpoken.length, 3) - 1 ? ' and ' : ', ')}
                <SpokenChip text={sw.word} />
              </React.Fragment>
            ))} — building on their vocabulary.</>
          ) : null,
        });
      }

      setThisWeekSets(sets);

      // ─── Last week data ───
      const lastWeekTracking = lastWeekTrackingRes.data || [];
      // Count sessions per day-of-week (Mon=0..Sun=6)
      const daySessionCounts = [0, 0, 0, 0, 0, 0, 0];
      const lastWeekSessionDates = {};
      (sessionsRes.data || []).forEach(s => {
        if (s.session_occurred) {
          const d = new Date(s.session_date + 'T00:00:00');
          const dayIdx = d.getDay() === 0 ? 6 : d.getDay() - 1; // Mon=0
          daySessionCounts[dayIdx] = (daySessionCounts[dayIdx] || 0) + 1;
        }
      });

      // Also use daily_tracking if no sessions recorded
      if (daySessionCounts.every(c => c === 0)) {
        const dateSet = new Set(lastWeekTracking.map(t => t.date));
        dateSet.forEach(dateStr => {
          const d = new Date(dateStr + 'T00:00:00');
          const dayIdx = d.getDay() === 0 ? 6 : d.getDay() - 1;
          daySessionCounts[dayIdx] = Math.max(daySessionCounts[dayIdx], 1);
        });
      }

      setLastWeekDaySessions(daySessionCounts);

      // Build last week sets from retired flashcards
      const allFlashcardsRes = await supabase.from('flashcards').select('*').eq('user_id', uid);
      const allCards = allFlashcardsRes.data || [];

      // Cards that were active last week (check date_retired or date_introduced)
      const lastWeekRetired = allCards.filter(c =>
        c.card_status === 'retired' && c.date_retired &&
        c.date_retired >= lastWeekStr && c.date_retired < thisWeekStr
      );

      // Group by set_number for last week
      const lwSetGroups = {};
      allCards.forEach(fc => {
        if (!fc.set_number) return;
        // Include if it was introduced before this week end and either still active or retired this/last week
        const introduced = fc.date_introduced || fc.created_at?.split('T')[0];
        if (introduced && introduced <= lastWeekEndStr) {
          if (!lwSetGroups[fc.set_number]) lwSetGroups[fc.set_number] = [];
          lwSetGroups[fc.set_number].push(fc);
        }
      });

      const lwSortedNums = Object.keys(lwSetGroups).map(Number).sort((a, b) => a - b);
      const lwSets = lwSortedNums.map(setNum => {
        const cards = lwSetGroups[setNum];
        const graduated = cards.filter(c => c.card_status === 'retired' && c.date_retired && c.date_retired >= lastWeekStr && c.date_retired < thisWeekStr);
        const inProgress = cards.filter(c => c.card_status !== 'retired');

        return {
          name: `Set ${setNum}`,
          wordCount: cards.length,
          graduated: graduated.map(g => ({ word: g.front, emoji: '🌳' })),
          words: inProgress.slice(0, 8).map(card => {
            const dayCount = card.active_day_count || 0;
            return {
              word: card.front,
              emoji: dayCount >= 3 ? '🌿' : '🌱',
              meta: `Day ${dayCount} of 5`,
              day: dayCount,
              phrase: card.card_type === 'phrase',
            };
          }),
        };
      });

      setLastWeekSets(lwSets);
    } catch (err) {
      console.error('WordPlannerPage load error:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser, buildSetsFromFlashcards]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalWords = thisWeekSets.reduce((sum, s) => sum + s.active.length, 0);
  const totalFullDays = lastWeekDaySessions.filter(s => s >= 3).length;

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', background: C.cream }}>
        <Loader2 style={{ width: 32, height: 32, color: C.sage }} className="animate-spin" />
      </div>
    );
  }

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      <div style={{ background: C.cream, minHeight: '100vh', WebkitFontSmoothing: 'antialiased' }}>
        <div style={{ maxWidth: 580, margin: '0 auto', padding: '20px 24px 120px' }}>
          <TodayLaunchpad totalSets={thisWeekSets.length} totalWords={totalWords} todaySessions={todaySessions} />
          <LastWeekCheckin daySessions={lastWeekDaySessions} totalFullDays={totalFullDays} />

          {/* This Week's Plan */}
          <SectionHeader
            title="This Week's Plan"
            right={`${formatShortDate(thisWeekStart)} – ${formatShortDate(thisWeekEnd)}`}
          />
          {thisWeekSets.length > 0 ? (
            <>
              <p style={{ fontFamily: 'Inter', fontSize: 13, color: C.muted, lineHeight: 1.6, marginBottom: 14, marginTop: 0 }}>
                Words carry over — nothing resets. Each day you flash, the oldest word graduates and one new word enters.
              </p>
              {thisWeekSets.map((s, i) => <ThisWeekSetCard key={i} set={s} />)}
            </>
          ) : (
            <p style={{ fontFamily: 'Inter', fontSize: 14, color: C.muted, textAlign: 'center', padding: '24px 0' }}>
              No flashcard sets yet. Add words to your sets to see your weekly plan here.
            </p>
          )}

          <LegendBar />
          <div style={{ height: 32 }} />

          {/* Last Week's Words */}
          {lastWeekSets.length > 0 && (
            <>
              <SectionHeader
                title="Last Week's Words"
                right={`${formatShortDate(lastWeekStart)} – ${formatShortDate(lastWeekEnd)}`}
              />
              <p style={{ fontFamily: 'Inter', fontSize: 13, color: C.muted, lineHeight: 1.6, marginBottom: 14, marginTop: 0 }}>
                A record of what appeared and what graduated. Tap any set to expand.
              </p>
              {lastWeekSets.map((s, i) => <LastWeekSetCard key={i} set={s} />)}
            </>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 580px) {
          .set-sub { display: none !important; }
        }
      `}</style>
    </>
  );
};

export default WordPlannerPage;
