import React, { useState } from 'react';
import { motion } from 'framer-motion';

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

/* ─── tiny helpers ─── */
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
    letterSpacing: 0.5, padding: '2px 6px', borderRadius: 3,
    background: bg, color,
  }}>{text}</span>
);

const SpokenChip = ({ text }) => (
  <span style={{
    background: C.amberBg, color: C.amberText,
    fontSize: 10, fontFamily: 'Inter', fontWeight: 600,
    padding: '1px 6px', borderRadius: 3, display: 'inline-flex', whiteSpace: 'nowrap',
  }}>{text}</span>
);

/* ─── data ─── */
const thisWeekSets = [
  {
    name: 'Set 1', activeCount: 5, queuedCount: 3,
    active: [
      { word: 'Shoe', emoji: '🌱', meta: 'Just entered — 5 days to go', day: 0 },
      { word: 'Sock', emoji: '🌱', meta: 'Needs 4 more days', day: 1 },
      { word: 'Hat', emoji: '🌱', meta: 'Needs 3 more days', day: 2 },
      { word: 'Red car', emoji: '🌱', meta: 'Needs 2 more days', day: 3, phrase: true },
      { word: 'Cup', emoji: '🌱', meta: "Almost done — graduates after tomorrow's flash", day: 4 },
    ],
    aiContext: (
      <>Alexander is saying <SpokenChip text="Big truck" /> and <SpokenChip text="Yellow bus" /> — the next words build the Mandarin for vehicles he's already talking about in English.</>
    ),
    queued: [
      { rank: 1, word: 'Truck', tags: ['Next to enter', 'Vehicles'], ai: "He says 'Big truck' in English — flashing stabilises it in Mandarin." },
      { rank: 2, word: 'Bus', tags: ['Vehicles'], ai: "Pairs with 'Yellow bus' — builds the Mandarin bridge for a word he loves." },
      { rank: 3, word: 'Car', tags: ['Vehicles'], ai: "Completes the vehicle cluster and reinforces 'Red car' phrase." },
    ],
  },
  {
    name: 'Set 2', activeCount: 5, queuedCount: 3,
    active: [
      { word: 'Lamp', emoji: '🌱', meta: 'Just entered — 5 days to go', day: 0 },
      { word: 'Table', emoji: '🌱', meta: 'Needs 4 more days', day: 1 },
      { word: 'Chair', emoji: '🌱', meta: 'Needs 3 more days', day: 2 },
      { word: 'Bird', emoji: '🌱', meta: 'Needs 2 more days', day: 3 },
      { word: 'Shoes', emoji: '🌱', meta: "Almost done — graduates after tomorrow's flash", day: 4 },
    ],
    aiContext: (
      <>Alexander is saying <SpokenChip text="Go there" /> and <SpokenChip text="Put back" /> — this set shifts toward action words to match what he's already using.</>
    ),
    queued: [
      { rank: 1, word: 'Go', tags: ['Next to enter', 'Actions'], ai: "He says 'Go there' — flashing builds the Mandarin for something he already uses." },
      { rank: 2, word: 'Put', tags: ['Actions'], ai: "He says 'Put back' — another active word worth stabilising in Mandarin." },
      { rank: 3, word: 'See', tags: ['Actions'], ai: "'I see a bus' — a core action verb already in his spontaneous speech." },
    ],
  },
  {
    name: 'Set 3', activeCount: 5, queuedCount: 3,
    active: [
      { word: 'Bed', emoji: '🌱', meta: 'Just entered — 5 days to go', day: 0 },
      { word: 'Door', emoji: '🌱', meta: 'Needs 4 more days', day: 1 },
      { word: 'Boat', emoji: '🌱', meta: 'Needs 3 more days', day: 2 },
      { word: 'Cat', emoji: '🌱', meta: 'Needs 2 more days', day: 3 },
      { word: 'Spoon', emoji: '🌱', meta: "Almost done — graduates after tomorrow's flash", day: 4 },
    ],
    aiContext: (
      <>Alexander said <SpokenChip text="Nai nai Chor, ye ye Chor" /> — he's naming family in phrases. These next words reinforce the people he talks about most.</>
    ),
    queued: [
      { rank: 1, word: 'Nai nai', tags: ['Next to enter', 'Family'], ai: "He's already saying this — flashing builds the visual character connection in Mandarin." },
      { rank: 2, word: 'Ye ye', tags: ['Family'], ai: "Always paired with Nai nai — introducing both mirrors how he already uses them." },
      { rank: 3, word: 'Sit', tags: ['Actions'], ai: "'Chor' (sit) is in his phrase — the Mandarin bridges his Cantonese to the target language." },
    ],
  },
];

const lastWeekSets = [
  {
    name: 'Set 1', wordCount: 9,
    graduated: { word: 'Mama', emoji: '🌳' },
    gradChip: '✓ Mama graduated',
    words: [
      { word: 'Cup', emoji: '🌱', meta: 'Introduced Day 1 · Day 4 of 5', day: 4 },
      { word: 'Red car', emoji: '🌱', meta: 'Introduced Day 2 · Day 3 of 5', day: 3, phrase: true },
      { word: 'Hat', emoji: '🌱', meta: 'Introduced Day 3 · Day 2 of 5', day: 2 },
      { word: 'Sock', emoji: '🌱', meta: 'Introduced Day 4 · Day 1 of 5', day: 1 },
      { word: 'Ball', emoji: '🌿', meta: 'Carried from prior week · Day 4 of 5', day: 4 },
      { word: 'More', emoji: '🌿', meta: 'Carried from prior week · Day 3 of 5', day: 3 },
      { word: 'Up', emoji: '🌿', meta: 'Carried from prior week · Day 2 of 5', day: 2 },
      { word: 'No', emoji: '🌿', meta: 'Carried from prior week · Day 1 of 5', day: 1 },
    ],
  },
  {
    name: 'Set 2', wordCount: 9,
    graduated: { word: 'Water', emoji: '🌳' },
    gradChip: '✓ Water graduated',
    words: [
      { word: 'Shoes', emoji: '🌱', meta: 'Introduced Day 1 · Day 4 of 5', day: 4 },
      { word: 'Bird', emoji: '🌱', meta: 'Introduced Day 2 · Day 3 of 5', day: 3 },
      { word: 'Chair', emoji: '🌱', meta: 'Introduced Day 3 · Day 2 of 5', day: 2 },
      { word: 'Table', emoji: '🌱', meta: 'Introduced Day 4 · Day 1 of 5', day: 1 },
      { word: 'Dada', emoji: '🌿', meta: 'Carried from prior week · Day 4 of 5', day: 4 },
      { word: 'Dog', emoji: '🌿', meta: 'Carried from prior week · Day 3 of 5', day: 3 },
      { word: 'Eat', emoji: '🌿', meta: 'Carried from prior week · Day 2 of 5', day: 2 },
      { word: 'Yes', emoji: '🌿', meta: 'Carried from prior week · Day 1 of 5', day: 1 },
    ],
  },
  {
    name: 'Set 3', wordCount: 9,
    graduated: { word: 'More', emoji: '🌳' },
    gradChip: '✓ More graduated',
    words: [
      { word: 'Spoon', emoji: '🌱', meta: 'Introduced Day 1 · Day 4 of 5', day: 4 },
      { word: 'Cat', emoji: '🌱', meta: 'Introduced Day 2 · Day 3 of 5', day: 3 },
      { word: 'Boat', emoji: '🌱', meta: 'Introduced Day 3 · Day 2 of 5', day: 2 },
      { word: 'Door', emoji: '🌱', meta: 'Introduced Day 4 · Day 1 of 5', day: 1 },
      { word: 'Bath', emoji: '🌿', meta: 'Carried from prior week · Day 4 of 5', day: 4 },
      { word: 'Up', emoji: '🌿', meta: 'Carried from prior week · Day 3 of 5', day: 3 },
      { word: 'Dog', emoji: '🌿', meta: 'Carried from prior week · Day 2 of 5', day: 2 },
      { word: 'Ball', emoji: '🌿', meta: 'Carried from prior week · Day 1 of 5', day: 1 },
    ],
  },
];

const lastWeekDays = [
  { label: 'M', sessions: 3 },
  { label: 'T', sessions: 3 },
  { label: 'W', sessions: 3 },
  { label: 'T', sessions: 2 },
  { label: 'F', sessions: 3 },
  { label: 'S', sessions: 0 },
  { label: 'S', sessions: 3 },
];

/* ─── Sub-components ─── */

const StickyNav = () => (
  <div style={{
    position: 'sticky', top: 0, zIndex: 100,
    background: C.white, borderBottom: `1px solid ${C.stone}`,
    height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 24px',
  }}>
    <span style={{ fontFamily: 'Inter', fontSize: 17, fontWeight: 600, color: C.sage }}>🌱 Sprouttie</span>
    <div style={{
      width: 32, height: 32, borderRadius: '50%', background: C.sagePale,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Inter', fontSize: 13, fontWeight: 600, color: C.sage,
    }}>C</div>
  </div>
);

const TodayLaunchpad = () => (
  <div style={{ background: C.sage, borderRadius: 16, overflow: 'hidden', boxShadow: shadow.today, marginBottom: 12 }}>
    <div style={{ padding: '20px 24px 18px', display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: 180 }}>
        <div style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: 'rgba(255,255,255,.6)', marginBottom: 4 }}>Today · Mon 24 Feb</div>
        <div style={{ fontFamily: "'Playfair Display'", fontSize: 22, color: '#fff', letterSpacing: -0.2, marginBottom: 5 }}>Session 2 of 3</div>
        <div style={{ fontFamily: 'Inter', fontSize: 13, color: 'rgba(255,255,255,.72)' }}>Day 1 of 5 · 3 sets · 15 words ready</div>
      </div>
      <button style={{
        background: '#fff', color: C.sage, border: 'none', borderRadius: 8,
        padding: '12px 20px', fontFamily: 'Inter', fontSize: 14, fontWeight: 700,
        boxShadow: '0 2px 10px rgba(0,0,0,.12)', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
      }}>
        Flash now
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><polygon points="2,0 12,6 2,12" fill={C.sage}/></svg>
      </button>
    </div>
    <div style={{ background: 'rgba(0,0,0,.18)', padding: '10px 24px', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
      <span style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.55)', flexShrink: 0 }}>Today's sessions</span>
      {[
        { label: '✓ Session 1', bg: 'rgba(255,255,255,.88)', color: C.sage, border: 'none' },
        { label: '▶ Session 2', bg: 'rgba(255,255,255,.28)', color: '#fff', border: '1px solid rgba(255,255,255,.45)' },
        { label: 'Session 3', bg: 'rgba(255,255,255,.1)', color: 'rgba(255,255,255,.45)', border: 'none' },
      ].map((s, i) => (
        <span key={i} style={{
          fontFamily: 'Inter', fontSize: 11, fontWeight: 600,
          padding: '4px 11px', borderRadius: 20,
          background: s.bg, color: s.color, border: s.border || 'none',
        }}>{s.label}</span>
      ))}
    </div>
  </div>
);

const DaySquare = ({ sessions }) => {
  const dots = sessions === 3
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

const LastWeekCheckin = () => {
  const [pace, setPace] = useState(3);
  return (
    <div style={{ background: C.white, border: `1px solid ${C.stone}`, borderRadius: 12, overflow: 'hidden', marginBottom: 28, boxShadow: shadow.card }}>
      <div style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: 600, letterSpacing: 1.2, textTransform: 'uppercase', color: C.muted }}>Last Week Check-in</span>
          <span style={{ background: C.sagePale, color: C.sage, fontFamily: 'Inter', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20 }}>✓ Strong week</span>
        </div>
        <p style={{ fontFamily: 'Inter', fontSize: 14, color: C.ink, lineHeight: 1.55, marginBottom: 14, margin: 0, marginTop: 0 }}>
          Alexander completed <strong style={{ color: C.sage }}>5 full days</strong> last week — ideally 3 sessions each. That's a consistent week.
        </p>
        <div style={{ display: 'flex', gap: 5, marginBottom: 8, marginTop: 14 }}>
          {lastWeekDays.map((d, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <span style={{ fontFamily: 'Inter', fontSize: 9, fontWeight: 700, color: C.faint, textTransform: 'uppercase' }}>{d.label}</span>
              <DaySquare sessions={d.sessions} />
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
      <div style={{ background: C.sageMist, borderTop: `1px solid ${C.stone}`, padding: '10px 20px', display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{ width: 6, height: 6, background: C.sage, borderRadius: '50%' }} />
        <span style={{ fontFamily: 'Inter', fontSize: 12, fontWeight: 500, color: C.sage }}>Pace confirmed — plan is live</span>
      </div>
    </div>
  );
};

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
        {meta.split(/(\d+ (?:more )?days?)/g).map((part, i) =>
          /\d+ (?:more )?days?/.test(part)
            ? <span key={i} style={{ color: C.sage, fontWeight: 500 }}>{part}</span>
            : part
        )}
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
          {tags.map(t => {
            if (t === 'Next to enter') return <Tag key={t} text={t} bg={C.sagePale} color={C.sage} />;
            return <Tag key={t} text={t} bg={C.stone} color={C.muted} />;
          })}
        </div>
        <div style={{ fontFamily: 'Inter', fontSize: 11, color: C.sageMid, fontStyle: 'italic', lineHeight: 1.4 }}>{ai}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
        <Pips filled={0} />
        <span style={{ fontFamily: 'Inter', fontSize: 10, color: C.faint, whiteSpace: 'nowrap' }}>queued</span>
      </div>
    </div>
  );
};

/* ─── AI Context Banner ─── */
const AIContextBanner = ({ children }) => (
  <div style={{
    background: C.sageMist, borderTop: `1px solid ${C.stone}`, borderBottom: `1px solid ${C.stone}`,
    padding: '11px 20px', display: 'flex', gap: 9, alignItems: 'flex-start',
  }}>
    <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>🤖</span>
    <span style={{ fontFamily: 'Inter', fontSize: 12, color: C.ink, lineHeight: 1.6 }}>{children}</span>
  </div>
);

/* ─── Sub-label ─── */
const SubLabel = ({ text }) => (
  <div style={{
    padding: '7px 20px 5px', fontFamily: 'Inter', fontSize: 10, fontWeight: 700,
    letterSpacing: 1, textTransform: 'uppercase', color: C.muted,
    background: C.cream, borderTop: `1px solid ${C.stone}`, borderBottom: `1px solid ${C.stone}`,
  }}>{text}</div>
);

/* ─── This Week Set Card ─── */
const ThisWeekSetCard = ({ set }) => (
  <div style={{ background: C.white, border: `1px solid ${C.stone}`, borderRadius: 16, overflow: 'hidden', marginBottom: 10, boxShadow: shadow.card }}>
    {/* Header */}
    <div style={{
      padding: '13px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      background: C.cream, borderBottom: `1px solid ${C.stone}`,
    }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
        <span style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: 700, color: C.charcoal }}>{set.name}</span>
        <span className="set-sub" style={{ fontFamily: 'Inter', fontSize: 11, color: C.muted }}>· 5 words, flashed every session</span>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <span style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 10, background: C.stone, color: C.muted }}>5 active</span>
        <span style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 10, background: C.sagePale, color: C.sage }}>3 queued</span>
      </div>
    </div>

    {/* Active words */}
    <SubLabel text="Flashing this week" />
    {set.active.map((w, i) => (
      <ActiveWordRow key={i} {...w} isLast={i === set.active.length - 1} />
    ))}

    {/* AI banner */}
    <AIContextBanner>{set.aiContext}</AIContextBanner>

    {/* Queued */}
    <SubLabel text="Coming up next — in order" />
    {set.queued.map((w, i) => (
      <QueuedWordRow key={i} {...w} isLast={i === set.queued.length - 1} />
    ))}
  </div>
);

/* ─── Last Week Set Card (collapsible) ─── */
const LastWeekSetCard = ({ set }) => {
  const [open, setOpen] = useState(false);
  const introWords = set.words.filter(w => w.emoji === '🌱');
  const carriedWords = set.words.filter(w => w.emoji === '🌿');

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
          <span style={{ fontFamily: 'Inter', fontSize: 11, color: C.muted }}>· {set.wordCount} words appeared</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 10, background: C.doneBg, color: C.sage }}>{set.gradChip}</span>
          <span style={{
            transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            fontSize: 12, color: C.muted,
          }}>▼</span>
        </div>
      </div>

      {open && (
        <div>
          {/* Graduated */}
          <SubLabel text="✓ Graduated" />
          <div style={{
            display: 'grid', gridTemplateColumns: '20px 1fr auto', padding: '10px 20px', gap: 10,
            background: C.sageMist,
          }}>
            <div style={{
              width: 15, height: 15, borderRadius: '50%', background: C.sage, color: '#fff',
              fontFamily: 'Inter', fontSize: 9, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>✓</div>
            <div>
              <span style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 600, color: C.sageMid }}>{set.graduated.word}</span>
              <div style={{ fontFamily: 'Inter', fontSize: 11, color: C.muted, lineHeight: 1.4 }}>Completed 5 days · won't return to this set</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
              <Pips filled={5} graduated />
            </div>
          </div>

          {/* Still in progress */}
          <SubLabel text="Still in progress — carries into this week" />
          {introWords.map((w, i) => (
            <ActiveWordRow key={`i${i}`} {...w} isLast={i === introWords.length - 1 && carriedWords.length === 0} />
          ))}
          {carriedWords.map((w, i) => (
            <ActiveWordRow key={`c${i}`} {...w} isLast={i === carriedWords.length - 1} />
          ))}
        </div>
      )}
    </div>
  );
};

/* ─── Legend Bar ─── */
const LegendBar = () => (
  <div style={{
    display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center',
    background: C.sageMist, border: `1px solid ${C.stone}`, borderRadius: 8,
    padding: '12px 18px', marginTop: 4,
  }}>
    {[
      { icon: '🌱', label: 'Sprouting' },
      { icon: '🌿', label: 'Growing' },
      { icon: '🌳', label: 'Graduated' },
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
    <div style={{ display: 'flex', gap: 5, alignItems: 'center', fontFamily: 'Inter', fontSize: 11, color: C.muted }}>
      <div style={{ width: 3, height: 14, background: C.sage, borderRadius: 2 }} />
      AI queue
    </div>
    <div style={{ display: 'flex', gap: 5, alignItems: 'center', fontFamily: 'Inter', fontSize: 11, color: C.muted }}>
      <SpokenChip text="word" />
      Alexander is saying this
    </div>
  </div>
);

/* ─── Section Header ─── */
const SectionHeader = ({ title, right }) => (
  <>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
      <h2 style={{ fontFamily: "'Playfair Display'", fontSize: 20, fontWeight: 600, color: C.charcoal, margin: 0 }}>{title}</h2>
      <span style={{ fontFamily: 'Inter', fontSize: 12, color: C.muted }}>{right}</span>
    </div>
    <div style={{ height: 1, background: C.stoneMid, marginBottom: 14 }} />
  </>
);

/* ─── MAIN PAGE ─── */
const WordPlannerPage = () => {
  return (
    <>
      {/* Google Fonts */}
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

      <div style={{
        background: C.cream, minHeight: '100vh',
        WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale',
      }}>
        <StickyNav />

        <div style={{ maxWidth: 580, margin: '0 auto', padding: '20px 24px 120px' }}>
          <TodayLaunchpad />
          <LastWeekCheckin />

          {/* This Week's Plan */}
          <SectionHeader title="This Week's Plan" right="24 Feb – 2 Mar" />
          <p style={{ fontFamily: 'Inter', fontSize: 13, color: C.muted, lineHeight: 1.6, marginBottom: 14, marginTop: 0 }}>
            Words carry over from last week — nothing resets. Each day you flash, the oldest word in each set graduates and one new word enters.
          </p>
          {thisWeekSets.map((s, i) => <ThisWeekSetCard key={i} set={s} />)}

          {/* Legend */}
          <LegendBar />

          {/* Spacer */}
          <div style={{ height: 32 }} />

          {/* Last Week's Words */}
          <SectionHeader title="Last Week's Words" right="17–23 Feb" />
          <p style={{ fontFamily: 'Inter', fontSize: 13, color: C.muted, lineHeight: 1.6, marginBottom: 14, marginTop: 0 }}>
            A record of what appeared and what graduated. Tap any set to expand.
          </p>
          {lastWeekSets.map((s, i) => <LastWeekSetCard key={i} set={s} />)}
        </div>

        {/* Fixed CTA Bar */}
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
          background: `linear-gradient(to top, ${C.cream} 60%, transparent)`,
          padding: '16px 24px 28px',
          display: 'flex', justifyContent: 'center', gap: 10,
        }}>
          <button style={{
            background: C.sage, color: '#fff', border: 'none', borderRadius: 8,
            padding: '13px 28px', fontFamily: 'Inter', fontSize: 14, fontWeight: 600,
            boxShadow: shadow.primary, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            Confirm this week's plan
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><polygon points="2,0 12,6 2,12" fill="#fff"/></svg>
          </button>
          <button style={{
            background: 'none', border: `1px solid ${C.stoneMid}`, borderRadius: 8,
            padding: '13px 18px', fontFamily: 'Inter', fontSize: 13, fontWeight: 500,
            color: C.muted, cursor: 'pointer',
          }}>
            Swap a word
          </button>
        </div>
      </div>

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 580px) {
          .set-sub { display: none !important; }
        }
      `}</style>
    </>
  );
};

export default WordPlannerPage;
