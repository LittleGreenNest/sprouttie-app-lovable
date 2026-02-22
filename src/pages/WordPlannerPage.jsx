import React, { useState } from 'react';
import { useWordPlannerData } from '@/hooks/useWordPlannerData';

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

const TodayLaunchpad = ({ todaySessions, dayLabel, dayInWeek, totalSets, totalActive }) => {
  const sessionLabels = [1, 2, 3].map(n => {
    if (n <= todaySessions) return { label: `✓ Session ${n}`, bg: 'rgba(255,255,255,.88)', color: C.sage, border: 'none' };
    if (n === todaySessions + 1) return { label: `▶ Session ${n}`, bg: 'rgba(255,255,255,.28)', color: '#fff', border: '1px solid rgba(255,255,255,.45)' };
    return { label: `Session ${n}`, bg: 'rgba(255,255,255,.1)', color: 'rgba(255,255,255,.45)', border: 'none' };
  });

  return (
    <div style={{ background: C.sage, borderRadius: 16, overflow: 'hidden', boxShadow: shadow.today, marginBottom: 12 }}>
      <div style={{ padding: '20px 24px 18px', display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: 'rgba(255,255,255,.6)', marginBottom: 4 }}>
            Today · {dayLabel}
          </div>
          <div style={{ fontFamily: "'Playfair Display'", fontSize: 22, color: '#fff', letterSpacing: -0.2, marginBottom: 5 }}>
            Session {Math.min(todaySessions + 1, 3)} of 3
          </div>
          <div style={{ fontFamily: 'Inter', fontSize: 13, color: 'rgba(255,255,255,.72)' }}>
            Day {dayInWeek} of 5 · {totalSets} sets · {totalActive} words ready
          </div>
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
        {sessionLabels.map((s, i) => (
          <span key={i} style={{
            fontFamily: 'Inter', fontSize: 11, fontWeight: 600,
            padding: '4px 11px', borderRadius: 20,
            background: s.bg, color: s.color, border: s.border || 'none',
          }}>{s.label}</span>
        ))}
      </div>
    </div>
  );
};

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

const LastWeekCheckin = ({ checkinDays, fullDays }) => {
  const [pace, setPace] = useState(3);
  const weekLabel = fullDays >= 5 ? '✓ Strong week' : fullDays >= 3 ? '✓ Steady week' : 'Room to grow';

  return (
    <div style={{ background: C.white, border: `1px solid ${C.stone}`, borderRadius: 12, overflow: 'hidden', marginBottom: 28, boxShadow: shadow.card }}>
      <div style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: 600, letterSpacing: 1.2, textTransform: 'uppercase', color: C.muted }}>Last Week Check-in</span>
          <span style={{ background: C.sagePale, color: C.sage, fontFamily: 'Inter', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20 }}>{weekLabel}</span>
        </div>
        <p style={{ fontFamily: 'Inter', fontSize: 14, color: C.ink, lineHeight: 1.55, marginBottom: 14, margin: 0 }}>
          Your child completed <strong style={{ color: C.sage }}>{fullDays} full day{fullDays !== 1 ? 's' : ''}</strong> last week — ideally 3 sessions each.
          {fullDays >= 5 ? " That's a consistent week." : fullDays >= 3 ? ' A steady effort.' : ' Every session counts — keep going!'}
        </p>
        <div style={{ display: 'flex', gap: 5, marginBottom: 8, marginTop: 14 }}>
          {checkinDays.map((d, i) => (
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

/* ─── Word Rows ─── */
const ActiveWordRow = ({ word, emoji, meta, day, phrase, isLast }) => (
  <div style={{
    display: 'grid', gridTemplateColumns: '20px 1fr auto', padding: '10px 20px', gap: 10,
    borderBottom: isLast ? 'none' : '1px solid rgba(232,227,216,.5)',
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

const QueuedWordRow = ({ rank, word, tags, ai, isLast }) => {
  const borderColor = rank === 1 ? C.sage : rank === 2 ? C.sageMid : C.sageLight;
  const badgeBg = rank === 1 ? C.sage : rank === 2 ? C.sageMid : C.sageLight;
  const badgeColor = rank <= 2 ? '#fff' : C.charcoal;

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '20px 1fr auto', padding: '10px 20px', paddingLeft: 17, gap: 10,
      background: '#FAFDF9', borderLeft: `3px solid ${borderColor}`,
      borderBottom: isLast ? 'none' : '1px solid rgba(232,227,216,.5)',
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
        {ai && <div style={{ fontFamily: 'Inter', fontSize: 11, color: C.sageMid, fontStyle: 'italic', lineHeight: 1.4 }}>{ai}</div>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
        <Pips filled={0} />
        <span style={{ fontFamily: 'Inter', fontSize: 10, color: C.faint, whiteSpace: 'nowrap' }}>queued</span>
      </div>
    </div>
  );
};

/* ─── AI Context Banner ─── */
const AIContextBanner = ({ spokenWords }) => {
  if (!spokenWords || spokenWords.length === 0) return null;
  return (
    <div style={{
      background: C.sageMist, borderTop: `1px solid ${C.stone}`, borderBottom: `1px solid ${C.stone}`,
      padding: '11px 20px', display: 'flex', gap: 9, alignItems: 'flex-start',
    }}>
      <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>🤖</span>
      <span style={{ fontFamily: 'Inter', fontSize: 12, color: C.ink, lineHeight: 1.6 }}>
        Your child is saying {spokenWords.map((sw, i) => (
          <React.Fragment key={sw.id}>
            {i > 0 && (i === spokenWords.length - 1 ? ' and ' : ', ')}
            <SpokenChip text={sw.word} />
          </React.Fragment>
        ))} — the next words build on what they're already using.
      </span>
    </div>
  );
};

const SubLabel = ({ text }) => (
  <div style={{
    padding: '7px 20px 5px', fontFamily: 'Inter', fontSize: 10, fontWeight: 700,
    letterSpacing: 1, textTransform: 'uppercase', color: C.muted,
    background: C.cream, borderTop: `1px solid ${C.stone}`, borderBottom: `1px solid ${C.stone}`,
  }}>{text}</div>
);

/* ─── Set Cards ─── */
const ThisWeekSetCard = ({ set }) => (
  <div style={{ background: C.white, border: `1px solid ${C.stone}`, borderRadius: 16, overflow: 'hidden', marginBottom: 10, boxShadow: shadow.card }}>
    <div style={{
      padding: '13px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      background: C.cream, borderBottom: `1px solid ${C.stone}`,
    }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
        <span style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: 700, color: C.charcoal }}>{set.name}</span>
        <span className="set-sub" style={{ fontFamily: 'Inter', fontSize: 11, color: C.muted }}>· {set.activeCount} words, flashed every session</span>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <span style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 10, background: C.stone, color: C.muted }}>{set.activeCount} active</span>
        {set.queuedCount > 0 && (
          <span style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 10, background: C.sagePale, color: C.sage }}>{set.queuedCount} queued</span>
        )}
      </div>
    </div>

    {set.active.length > 0 && (
      <>
        <SubLabel text="Flashing this week" />
        {set.active.map((w, i) => (
          <ActiveWordRow key={w.id || i} {...w} isLast={i === set.active.length - 1} />
        ))}
      </>
    )}

    <AIContextBanner spokenWords={set.relevantSpoken} />

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
          {set.gradChip && (
            <span style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 10, background: C.doneBg, color: C.sage }}>{set.gradChip}</span>
          )}
          <span style={{
            transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            fontSize: 12, color: C.muted,
          }}>▼</span>
        </div>
      </div>

      {open && (
        <div>
          {set.graduated && (
            <>
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
            </>
          )}

          {set.words.length > 0 && (
            <>
              <SubLabel text="Still in progress — carries into this week" />
              {introWords.map((w, i) => (
                <ActiveWordRow key={`i${i}`} {...w} isLast={i === introWords.length - 1 && carriedWords.length === 0} />
              ))}
              {carriedWords.map((w, i) => (
                <ActiveWordRow key={`c${i}`} {...w} isLast={i === carriedWords.length - 1} />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
};

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
      Your child is saying this
    </div>
  </div>
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

/* ─── Empty State ─── */
const EmptyState = () => (
  <div style={{
    background: C.white, border: `1px solid ${C.stone}`, borderRadius: 16,
    padding: '40px 24px', textAlign: 'center', boxShadow: shadow.card,
  }}>
    <div style={{ fontSize: 48, marginBottom: 16 }}>🌱</div>
    <h2 style={{ fontFamily: "'Playfair Display'", fontSize: 22, color: C.charcoal, marginBottom: 8 }}>No words in your plan yet</h2>
    <p style={{ fontFamily: 'Inter', fontSize: 14, color: C.muted, lineHeight: 1.6, maxWidth: 360, margin: '0 auto' }}>
      Add flashcards and assign them to sets from the Session Log to see your weekly activation plan here.
    </p>
  </div>
);

/* ─── Loading ─── */
const LoadingState = () => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minHeight: '60vh', fontFamily: 'Inter', fontSize: 14, color: C.muted,
  }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 32, marginBottom: 12, animation: 'spin 1s linear infinite' }}>🌱</div>
      <span>Loading your plan…</span>
    </div>
  </div>
);

/* ─── MAIN PAGE ─── */
const WordPlannerPage = () => {
  const { loading, data, error } = useWordPlannerData();

  if (loading) {
    return (
      <>
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <div style={{ background: C.cream, minHeight: '100vh', WebkitFontSmoothing: 'antialiased' }}>
          <StickyNav />
          <LoadingState />
        </div>
      </>
    );
  }

  const hasActiveData = data?.activeSets?.some(s => s.activeCount > 0);

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

      <div style={{
        background: C.cream, minHeight: '100vh',
        WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale',
      }}>
        <StickyNav />

        <div style={{ maxWidth: 580, margin: '0 auto', padding: '20px 24px 120px' }}>
          {hasActiveData ? (
            <>
              <TodayLaunchpad
                todaySessions={data.todaySessions}
                dayLabel={data.today.dayMonth}
                dayInWeek={data.dayInWeek}
                totalSets={data.totalSets}
                totalActive={data.totalActive}
              />

              <LastWeekCheckin
                checkinDays={data.checkinDays}
                fullDays={data.fullDays}
              />

              <SectionHeader title="This Week's Plan" right={data.thisWeekRange} />
              <p style={{ fontFamily: 'Inter', fontSize: 13, color: C.muted, lineHeight: 1.6, marginBottom: 14, marginTop: 0 }}>
                Words carry over from last week — nothing resets. Each day you flash, the oldest word in each set graduates and one new word enters.
              </p>
              {data.activeSets.map((s, i) => <ThisWeekSetCard key={i} set={s} />)}

              <LegendBar />
              <div style={{ height: 32 }} />

              {data.lastWeekSets.length > 0 && (
                <>
                  <SectionHeader title="Last Week's Words" right={data.lastWeekRange} />
                  <p style={{ fontFamily: 'Inter', fontSize: 13, color: C.muted, lineHeight: 1.6, marginBottom: 14, marginTop: 0 }}>
                    A record of what appeared and what graduated. Tap any set to expand.
                  </p>
                  {data.lastWeekSets.map((s, i) => <LastWeekSetCard key={i} set={s} />)}
                </>
              )}
            </>
          ) : (
            <EmptyState />
          )}
        </div>

        {hasActiveData && (
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
        )}
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
