import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useFlashcards } from '../context/FlashcardContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cardIdFrom } from '@/utils/cardId';
import WeekCard from './thisweek/WeekCard';
import { toast } from 'react-toastify';
import { toLocalDateString } from '@/utils/week';

// ─── Tip data (pulled from existing TipsCarousel) ───
const TIPS = [
  { icon: '⏱', title: 'Timing is key', body: '1 second per card keeps it fun and effective' },
  { icon: '🎈', title: 'Make it fun', body: 'Always stop before your child loses interest' },
  { icon: '🌿', title: 'Short daily sessions grow big results', body: 'Your consistency helps your child bloom!' },
  { icon: '📦', title: 'Introduce new cards gradually', body: 'Rotate ~20 weekly for best results' },
];

const SET_COLORS = ['#7B61FF', '#F59E0B', '#3B82F6', '#10B981', '#F43F5E'];

const Dashboard = () => {
  const { flashcards = [], sets = [] } = useFlashcards() || {};
  const { currentUser, profile } = useAuth() || {};
  const navigate = useNavigate();

  const [trackingData, setTrackingData] = useState([]);
  const [spokenWords, setSpokenWords] = useState([]);
  const [tipIndex, setTipIndex] = useState(0);
  const [weeklyBooks, setWeeklyBooks] = useState([]);
  const [weeklyActivities, setWeeklyActivities] = useState([]);

  // Rotate tip daily based on day-of-year
  useEffect(() => {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    setTipIndex(dayOfYear % TIPS.length);
  }, []);

  // Fetch all home data
  useEffect(() => {
    if (!currentUser?.id) return;
    const uid = currentUser.id;
    const today = toLocalDateString(new Date());

    // Tracking data (last 30 days)
    const thirtyAgo = new Date();
    thirtyAgo.setDate(thirtyAgo.getDate() - 30);
    const thirtyAgoStr = toLocalDateString(thirtyAgo);

    const fetchAll = async () => {
      const [trackingRes, spokenRes, sessionsRes] = await Promise.all([
        supabase.from('daily_tracking').select('*').eq('user_id', uid).gte('date', thirtyAgoStr).order('date', { ascending: false }),
        supabase.from('spoken_words').select('*').eq('user_id', uid),
        supabase.from('daily_flashing_sessions').select('books_read, activities, session_date').eq('user_id', uid).gte('session_date', getWeekStart()),
      ]);
      setTrackingData(trackingRes.data || []);
      setSpokenWords(spokenRes.data || []);

      // Aggregate weekly books & activities
      const sessions = sessionsRes.data || [];
      const allBooks = sessions.flatMap(s => s.books_read || []);
      const uniqueBooks = [...new Set(allBooks)];
      setWeeklyBooks(uniqueBooks);

      const activityMap = {};
      sessions.forEach(s => {
        (s.activities || []).forEach(a => {
          const act = typeof a === 'string' ? { id: a } : a;
          if (!activityMap[act.id]) activityMap[act.id] = 0;
          activityMap[act.id]++;
        });
      });
      setWeeklyActivities(Object.entries(activityMap).map(([id, count]) => ({ id, count })));
    };
    fetchAll();
  }, [currentUser?.id]);

  // ─── Derived data ───
  const today = new Date();
  const todayStr = toLocalDateString(today);
  const firstName = currentUser?.user_metadata?.display_name?.split(' ')[0] || currentUser?.user_metadata?.full_name?.split(' ')[0] || currentUser?.user_metadata?.name?.split(' ')[0] || 'Friend';
  // The child's own name from onboarding. This used to be built from the
  // account holder's first name, which labelled the words "Rena's child's".
  const childName = currentUser?.user_metadata?.child_name?.trim() || 'Your child';

  // Today's rounds from tracking data
  const todayTracking = trackingData.filter(t => t.date === todayStr);
  const todayRoundsDone = countRoundsFromTracking(todayTracking);
  const totalPossibleRounds = sets.filter(s => s.flashcardIds.length > 0).length * 3 || 15;

  // Last session
  const lastSessionDate = trackingData.find(t => t.status === 'flashed')?.date;
  const lastSessionText = getLastSessionText(lastSessionDate, todayStr);

  // Due sets
  const dueSetText = getDueSetText(sets, flashcards, trackingData, todayStr);

  // Spoken word counts
  const spokenNew = spokenWords.filter(w => w.word_stage === 'new').length;
  const spokenGrowing = spokenWords.filter(w => w.word_stage === 'growing').length;
  const spokenOwned = spokenWords.filter(w => w.word_stage === 'owned').length;
  const thisMonthNewWords = spokenWords.filter(w => {
    const d = new Date(w.created_at);
    return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  }).length;

  // Streak
  const streak = profile?.current_streak || 0;

  // Flashed counts per set
  const flashedPerSet = sets.map(set => {
    const setCards = flashcards.filter(c => c.set_number === set.id);
    const flashedCards = setCards.filter(c => {
      return trackingData.some(t => cardIdFrom(t.flashcard_id) === c.id && t.status === 'flashed');
    });
    return { total: setCards.length, flashed: flashedCards.length };
  });
  const totalFlashed = flashedPerSet.reduce((s, x) => s + x.flashed, 0);

  // Tip
  const tip = TIPS[tipIndex];

  // Date formatting
  const dayName = today.toLocaleDateString('en', { weekday: 'long' });
  const shortDay = today.toLocaleDateString('en', { weekday: 'short' });
  const monthDay = today.toLocaleDateString('en', { month: 'short', day: 'numeric' });
  const fullDate = today.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="pb-28">
      {/* 2. Greeting + Date */}
      <div className="pt-2 pb-4">
        <h1 className="text-xl font-medium text-[hsl(var(--sprouttie-ink))] m-0">
          Hi {firstName} 👋
        </h1>
        <p className="text-[13px] text-[hsl(var(--muted-foreground))] mt-0.5">
          {dayName} · {monthDay}
        </p>
      </div>

      {/* This week: plan it, do it, notice it. One card, three states. */}
      <WeekCard variant="home" />

      {/* 3. TODAY'S FOCUS CARD */}
      <div className="mx-4 mb-3" style={{ background: '#2D6A4F', borderRadius: 16, padding: '16px 18px' }}>
        <p style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.06em', color: '#95D5B2', textTransform: 'uppercase', marginBottom: 10 }}>
          TODAY'S FOCUS
        </p>

        {sets.length === 0 ? (
          <>
            <StatusLine dotColor="#95D5B2" text="You're all set up. Add your first flashcard set." />
            <StatusLine dotColor="#52B788" text="Takes less than 2 minutes to get started" />
            <div style={{ marginTop: 14 }}>
              <button
                onClick={() => navigate('/cards')}
                className="w-full active:scale-[0.98] transition-transform"
                style={{
                  background: '#52B788', border: 'none', borderRadius: 10,
                  padding: 12, fontSize: 14, fontWeight: 500, color: 'white', cursor: 'pointer'
                }}
              >
                Add Your First Flashcard Set
              </button>
            </div>
          </>
        ) : (
          <>
            <StatusLine dotColor="#95D5B2" text={dueSetText} />
            <StatusLine dotColor="#95D5B2" text={lastSessionText} />
            <StatusLine dotColor="#52B788" text={
              todayRoundsDone >= totalPossibleRounds && todayRoundsDone > 0
                ? 'All rounds done today ✓'
                : `${todayRoundsDone} / ${totalPossibleRounds} rounds done today`
            } />
            <div style={{ marginTop: 14 }}>
              <button
                onClick={() => navigate('/daily-tracking')}
                className="w-full active:scale-[0.98] transition-transform"
                style={{
                  background: '#52B788', border: 'none', borderRadius: 10,
                  padding: 12, fontSize: 14, fontWeight: 500, color: 'white', cursor: 'pointer'
                }}
              >
                Start Flashcard Session
              </button>
            </div>
          </>
        )}
      </div>

      {/* 4. CHILD'S WORDS CARD */}
      <button
        onClick={() => navigate('/words-said')}
        className="block w-full text-left mx-4 mb-3 active:scale-[0.98] transition-transform"
        style={{
          background: 'white', border: '0.5px solid #E5E7EB', borderRadius: 16,
          padding: '16px 18px', width: 'calc(100% - 32px)', cursor: 'pointer'
        }}
      >
        <div className="flex items-start justify-between">
          <div>
            <p style={{ fontSize: 13, fontWeight: 500, color: '#1F2937', margin: 0 }}>
              {childName}'s words this month
            </p>
            <p style={{ fontSize: 12, fontWeight: 400, color: '#9CA3AF', marginTop: 2 }}>
              Tap to add a word
            </p>
          </div>
          {thisMonthNewWords > 0 && (
            <span style={{
              fontSize: 10, fontWeight: 500, background: '#D1FAE5', color: '#065F46',
              padding: '3px 8px', borderRadius: 20
            }}>
              {thisMonthNewWords} new
            </span>
          )}
        </div>

        <div className="flex gap-2 mt-3">
          <StatTile bg="#F0FDF4" number={spokenNew} label="sprouting" numColor="#2D6A4F" />
          <StatTile bg="#FFFBEB" number={spokenGrowing} label="growing" numColor="#92400E" />
          <StatTile bg="#F0FDF4" number={spokenOwned} label="owned" numColor="#065F46" />
        </div>
      </button>

      {/* 6. FLASHCARD SETS CARD */}
      <button
        onClick={() => navigate('/cards')}
        className="block w-full text-left mx-4 mb-3 active:scale-[0.98] transition-transform"
        style={{
          background: 'white', border: '0.5px solid #E5E7EB', borderRadius: 16,
          padding: '16px 18px', width: 'calc(100% - 32px)', cursor: 'pointer'
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <span style={{ fontSize: 13, fontWeight: 500, color: '#1F2937' }}>Flashcard sets</span>
          <span style={{ fontSize: 11, fontWeight: 400, color: '#9CA3AF' }}>{totalFlashed} words flashed</span>
        </div>

        {sets.length === 0 ? (
          <div className="flex flex-col items-center py-2 gap-2">
            <p style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center' }}>
              No flashcard sets yet
            </p>
            <button
              onClick={(e) => { e.stopPropagation(); navigate('/cards'); }}
              style={{
                fontSize: 12, fontWeight: 500, color: '#2D6A4F',
                background: '#F0FDF4', border: '1px solid #BBF7D0',
                borderRadius: 8, padding: '6px 14px', cursor: 'pointer'
              }}
            >
              Create your first set →
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {sets.map((set, i) => {
              const data = flashedPerSet[i];
              const pct = data.total > 0 ? (data.flashed / data.total) * 100 : 0;
              const isEmpty = data.total === 0;
              return (
                <div key={set.id} className="flex items-center gap-2.5" style={{ opacity: isEmpty ? 0.4 : 1 }}>
                  <div className="flex-shrink-0 flex items-center justify-center rounded-full" style={{
                    width: 18, height: 18, background: SET_COLORS[i], fontSize: 9, fontWeight: 600, color: 'white'
                  }}>
                    {i + 1}
                  </div>
                  <div className="flex-1 rounded-sm overflow-hidden" style={{ height: 4, background: '#E5E7EB' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: '#52B788', borderRadius: 2 }} />
                  </div>
                  <span className="flex-shrink-0" style={{ fontSize: 11, fontWeight: 400, color: '#9CA3AF', minWidth: 28, textAlign: 'right' }}>
                    {data.flashed}/{data.total}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </button>

      {/* 6.5. WEEKLY SUMMARY CARD */}
      {(weeklyBooks.length > 0 || weeklyActivities.length > 0) && (
        <div
          className="mx-4 mb-3"
          style={{
            background: 'white', border: '0.5px solid #E5E7EB', borderRadius: 16,
            padding: '16px 18px'
          }}
        >
          <p style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.06em', color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 10 }}>
            THIS WEEK'S HIGHLIGHTS
          </p>

          {weeklyBooks.length > 0 && (
            <div style={{ marginBottom: weeklyActivities.length > 0 ? 12 : 0 }}>
              <p style={{ fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
                📖 Books read · {weeklyBooks.length}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {weeklyBooks.map((book, i) => (
                  <span key={i} style={{
                    fontSize: 11, background: '#F0F7F4', color: '#1F2937',
                    padding: '3px 10px', borderRadius: 12, border: '0.5px solid #C6E6D4'
                  }}>
                    {book}
                  </span>
                ))}
              </div>
            </div>
          )}

          {weeklyActivities.length > 0 && (
            <div>
              <p style={{ fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
                🎯 Activities · {weeklyActivities.reduce((s, a) => s + a.count, 0)} sessions
              </p>
              <div className="flex flex-wrap gap-1.5">
                {weeklyActivities.map(({ id, count }) => {
                  const label = {
                    art: '🎨 Art', puzzles: '🧩 Puzzles', songs: '🎵 Songs', reading: '📖 Reading',
                    outdoor: '🏃 Outdoor', roleplay: '🎭 Role Play', cooking: '🍳 Cooking', screen: '📺 Screen'
                  }[id] || id;
                  return (
                    <span key={id} style={{
                      fontSize: 11, background: '#FFFBEB', color: '#92400E',
                      padding: '3px 10px', borderRadius: 12, border: '0.5px solid #FDE68A'
                    }}>
                      {label} × {count}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 7. TODAY'S TIP ROW */}
      <button
        onClick={() => setTipIndex((tipIndex + 1) % TIPS.length)}
        className="flex items-center gap-3 w-full text-left mx-4 mb-3 active:scale-[0.98] transition-transform"
        style={{
          background: 'white', border: '0.5px solid #E5E7EB', borderRadius: 16,
          padding: '14px 18px', width: 'calc(100% - 32px)', cursor: 'pointer'
        }}
      >
        <span style={{ fontSize: 14, flexShrink: 0 }}>{tip.icon}</span>
        <div className="flex-1 min-w-0">
          <p style={{ fontSize: 13, fontWeight: 500, color: '#1F2937', margin: 0 }}>{tip.title}</p>
          <p style={{ fontSize: 12, fontWeight: 400, color: '#9CA3AF', margin: 0, marginTop: 1 }}>{tip.body}</p>
        </div>
        <ChevronRight size={12} color="#9CA3AF" className="flex-shrink-0" />
      </button>

      {/* 8. LEARNING GARDEN ROW */}
      <button
        onClick={() => navigate('/garden-guide')}
        className="flex items-center gap-3 w-full text-left mx-4 mb-5 active:scale-[0.98] transition-transform"
        style={{
          background: 'white', border: '0.5px solid #E5E7EB', borderRadius: 16,
          padding: '14px 18px', width: 'calc(100% - 32px)', cursor: 'pointer'
        }}
      >
        <span style={{ fontSize: 14, flexShrink: 0 }}>🌿</span>
        <div className="flex-1 min-w-0">
          <p style={{ fontSize: 13, fontWeight: 500, color: '#1F2937', margin: 0 }}>Your learning garden</p>
          <p style={{ fontSize: 12, fontWeight: 400, color: '#9CA3AF', margin: 0, marginTop: 1 }}>
            {streak > 0 ? `${streak} day streak · Keep growing` : 'Plant your first seed today'}
          </p>
        </div>
        <ChevronRight size={12} color="#9CA3AF" className="flex-shrink-0" />
      </button>


    </div>
  );
};

// ─── Helper components ───

const StatusLine = ({ dotColor, text }) => (
  <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
    <div className="flex-shrink-0 rounded-full" style={{ width: 6, height: 6, background: dotColor }} />
    <span style={{ fontSize: 13, fontWeight: 400, color: '#D8F3DC' }}>{text}</span>
  </div>
);

const StatTile = ({ bg, number, label, numColor }) => (
  <div className="flex-1 text-center" style={{ background: bg, borderRadius: 10, padding: '10px 12px' }}>
    <div style={{ fontSize: 22, fontWeight: 500, color: numColor }}>{number}</div>
    <div style={{ fontSize: 11, fontWeight: 400, color: '#6B7280' }}>{label}</div>
  </div>
);

// ─── Helper functions ───

function getWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const d = new Date(now.getFullYear(), now.getMonth(), diff);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function getLastSessionText(lastDate, todayStr) {
  if (!lastDate) return 'No sessions yet. Start today.';
  if (lastDate === todayStr) return 'Last session: today';
  const diff = Math.floor((new Date(todayStr) - new Date(lastDate)) / 86400000);
  return `Last session: ${diff} day${diff !== 1 ? 's' : ''} ago`;
}

function getDueSetText(sets, flashcards, trackingData, todayStr) {
  if (sets.length === 0) return 'Add your first flashcard set to begin';

  const todayTracking = trackingData.filter(t => t.date === todayStr && t.status === 'flashed');
  const flashedToday = new Set(todayTracking.map(t => cardIdFrom(t.flashcard_id)));

  // Find sets with unflashed cards today
  const dueSets = sets.filter(set => {
    const setCards = flashcards.filter(c => c.set_number === set.id);
    return setCards.length > 0 && setCards.some(c => !flashedToday.has(c.id));
  });

  if (dueSets.length === 0) return 'All sets flashed today ✓';

  const totalDueWords = dueSets.reduce((sum, set) => {
    return sum + flashcards.filter(c => c.set_number === set.id && !flashedToday.has(c.id)).length;
  }, 0);

  const dueWords = `${totalDueWords} word${totalDueWords === 1 ? '' : 's'} due today`;
  if (dueSets.length <= 2) {
    const names = dueSets.map(s => s.name).join(', ');
    return `${names} · ${dueWords}`;
  }
  return `${dueSets.length} sets · ${dueWords}`;
}

function countRoundsFromTracking(todayTracking) {
  // Count unique set-round combos from tracking notes metadata
  const rounds = new Set();
  todayTracking.forEach(t => {
    if (t.notes) {
      try {
        const meta = JSON.parse(t.notes);
        if (meta.setId && meta.round) {
          rounds.add(`${meta.setId}-${meta.round}`);
        }
      } catch {}
    }
  });
  return rounds.size;
}

export default Dashboard;
