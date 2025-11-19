import React, { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import PronunciationButton from './pronunciation/PronunciationButton';

const FlashcardScheduler = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeSets, setActiveSets] = useState([]);
  const [waitingCards, setWaitingCards] = useState([]);
  const [todaySession, setTodaySession] = useState(null);
  const [sessionOccurred, setSessionOccurred] = useState(false);
  const [notes, setNotes] = useState('');
  const [stats, setStats] = useState({
    totalActive: 0,
    cardsRetiredToday: 0,
    cardsIntroducedToday: 0
  });
  const [sessions, setSessions] = useState({}); // { setIndex: { round1: {}, round2: {}, round3: {} } }
  const [flashedWords, setFlashedWords] = useState(new Set());
  const [familyMember, setFamilyMember] = useState('');
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (currentUser) {
      loadScheduleData();
      loadTrackingData();
    }
  }, [currentUser]);

  const loadScheduleData = async () => {
    try {
      setLoading(true);
      
      // Load today's session
      const today = new Date().toISOString().split('T')[0];
      const { data: sessionData } = await supabase
        .from('daily_flashing_sessions')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('session_date', today)
        .single();

      setTodaySession(sessionData);
      if (sessionData) {
        setSessionOccurred(sessionData.session_occurred);
        setNotes(sessionData.notes || '');
      }

      // Load active cards grouped by introduction date
      const { data: activeCards } = await supabase
        .from('flashcards')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('card_status', 'active')
        .order('date_introduced', { ascending: true })
        .order('front', { ascending: true });

      // Group by introduction date to form sets
      const sets = {};
      activeCards?.forEach(card => {
        const setKey = card.date_introduced || 'unknown';
        if (!sets[setKey]) {
          sets[setKey] = [];
        }
        sets[setKey].push(card);
      });

      const formattedSets = Object.entries(sets).map(([dateIntroduced, cards]) => ({
        dateIntroduced,
        cards,
        activeCount: cards[0]?.active_day_count || 0
      }));

      setActiveSets(formattedSets);

      // Load waiting cards
      const { data: waiting } = await supabase
        .from('flashcards')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('card_status', 'waiting')
        .order('created_at', { ascending: true });

      setWaitingCards(waiting || []);

      // Calculate stats
      const totalActive = activeCards?.length || 0;
      setStats({
        totalActive,
        cardsRetiredToday: sessionData?.cards_retired || 0,
        cardsIntroducedToday: sessionData?.cards_introduced || 0
      });

    } catch (error) {
      console.error('Error loading schedule data:', error);
      toast.error('Failed to load schedule data');
    } finally {
      setLoading(false);
    }
  };

  const loadTrackingData = async () => {
    try {
      // Load today's tracking data
      const { data: trackingData, error } = await supabase
        .from('daily_tracking')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('date', today);

      if (error) throw error;

      // Organize sessions by set and round
      const sessionsMap = {};
      const flashedWordsSet = new Set();
      
      (trackingData || []).forEach(record => {
        if (record.status === 'flashed' && record.flashcard_id && record.flashcard_id !== 'shared-note') {
          flashedWordsSet.add(record.flashcard_id);
        }
        
        if (record.notes && record.status === 'flashed') {
          try {
            const metadata = JSON.parse(record.notes);
            if (metadata.setIndex !== undefined && metadata.round) {
              if (!sessionsMap[metadata.setIndex]) {
                sessionsMap[metadata.setIndex] = {};
              }
              sessionsMap[metadata.setIndex][metadata.round] = {
                completed: true,
                by: record.flashed_by,
                time: record.time_of_day,
                engagement: record.engagement
              };
            }
          } catch (e) {
            // Not valid JSON, skip
          }
        }
      });

      setSessions(sessionsMap);
      setFlashedWords(flashedWordsSet);
    } catch (error) {
      console.error('Error loading tracking data:', error);
    }
  };

  const toggleCardFlashed = async (card, setIndex, round) => {
    const isFlashed = flashedWords.has(card.id);
    
    if (isFlashed) {
      // Remove from tracking
      setFlashedWords(prev => {
        const newSet = new Set(prev);
        newSet.delete(card.id);
        return newSet;
      });
      
      // Delete from database
      await supabase
        .from('daily_tracking')
        .delete()
        .eq('user_id', currentUser.id)
        .eq('date', today)
        .eq('flashcard_id', card.id);
    } else {
      // Add to tracking
      setFlashedWords(prev => new Set([...prev, card.id]));
      
      // Insert into database
      const metadata = { setIndex, round };
      await supabase
        .from('daily_tracking')
        .insert({
          user_id: currentUser.id,
          date: today,
          flashcard_id: card.id,
          status: 'flashed',
          flashed_by: familyMember || 'Parent',
          time_of_day: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          engagement: 3,
          notes: JSON.stringify(metadata)
        });
    }
    
    loadTrackingData();
  };

  const markRoundComplete = async (setIndex, round) => {
    try {
      const set = activeSets[setIndex];
      if (!set) return;

      // Mark all cards in the set as flashed for this round
      const insertPromises = set.cards.map(card => {
        const metadata = { setIndex, round };
        return supabase
          .from('daily_tracking')
          .insert({
            user_id: currentUser.id,
            date: today,
            flashcard_id: card.id,
            status: 'flashed',
            flashed_by: familyMember || 'Parent',
            time_of_day: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            engagement: 3,
            notes: JSON.stringify(metadata)
          });
      });

      await Promise.all(insertPromises);
      
      // Update sessions state
      setSessions(prev => ({
        ...prev,
        [setIndex]: {
          ...prev[setIndex],
          [round]: {
            completed: true,
            by: familyMember || 'Parent',
            time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            engagement: 3
          }
        }
      }));

      toast.success(`Set ${setIndex + 1} - ${round} completed!`);
      loadTrackingData();
    } catch (error) {
      console.error('Error marking round complete:', error);
      toast.error('Failed to mark round complete');
    }
  };

  const recordSession = async (occurred) => {
    try {
      const today = new Date().toISOString().split('T')[0];

      if (todaySession) {
        // Update existing session
        const { error } = await supabase
          .from('daily_flashing_sessions')
          .update({
            session_occurred: occurred,
            notes: notes
          })
          .eq('id', todaySession.id);

        if (error) throw error;
      } else {
        // Create new session
        const { error } = await supabase
          .from('daily_flashing_sessions')
          .insert({
            user_id: currentUser.id,
            session_date: today,
            session_occurred: occurred,
            notes: notes
          });

        if (error) throw error;
      }

      if (occurred) {
        await processFlashingDay();
      }

      setSessionOccurred(occurred);
      toast.success(`Session ${occurred ? 'recorded' : 'marked as skipped'}`);
      loadScheduleData();
    } catch (error) {
      console.error('Error recording session:', error);
      toast.error('Failed to record session');
    }
  };

  const processFlashingDay = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Task 2: Retire cards with active_day_count = 5
      const { data: cardsToRetire } = await supabase
        .from('flashcards')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('card_status', 'active')
        .eq('active_day_count', 5);

      const retiredCount = cardsToRetire?.length || 0;

      if (retiredCount > 0) {
        const retireIds = cardsToRetire.map(c => c.id);
        await supabase
          .from('flashcards')
          .update({
            card_status: 'retired',
            date_retired: today
          })
          .in('id', retireIds);
      }

      // Task 3: Introduce new cards (equal to retired count)
      // Limit to maintain maximum of 25 active cards
      const currentActiveCount = stats.totalActive - retiredCount;
      const maxNewCards = Math.min(retiredCount, 25 - currentActiveCount, 5); // Max 5 per day
      
      if (maxNewCards > 0 && waitingCards.length > 0) {
        const cardsToIntroduce = waitingCards.slice(0, maxNewCards);
        const introduceIds = cardsToIntroduce.map(c => c.id);
        
        await supabase
          .from('flashcards')
          .update({
            card_status: 'active',
            active_day_count: 1,
            date_introduced: today
          })
          .in('id', introduceIds);
      }

      // Task 4: Update active day count for remaining active cards
      const { data: remainingActive } = await supabase
        .from('flashcards')
        .select('id, active_day_count')
        .eq('user_id', currentUser.id)
        .eq('card_status', 'active')
        .lt('active_day_count', 5);

      if (remainingActive?.length > 0) {
        // Update each card's active_day_count
        for (const card of remainingActive) {
          await supabase
            .from('flashcards')
            .update({
              active_day_count: card.active_day_count + 1
            })
            .eq('id', card.id);
        }
      }

      // Update session record with counts
      await supabase
        .from('daily_flashing_sessions')
        .update({
          cards_retired: retiredCount,
          cards_introduced: maxNewCards
        })
        .eq('user_id', currentUser.id)
        .eq('session_date', today);

    } catch (error) {
      console.error('Error processing flashing day:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-slate-600">Loading schedule...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-lg p-6">
        <h1 className="text-3xl font-bold mb-2">Flashcard Schedule Manager</h1>
        <p className="opacity-90">
          Manage your daily rotation of flashcards with 5-day cycles
        </p>
      </div>

      {/* Rotation Summary */}
      <div className="bg-card rounded-lg shadow border border-border p-6">
        <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
          📊 Rotation Summary
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary mb-1">
              {stats.totalActive} / 25
            </div>
            <div className="text-sm text-muted-foreground">Active Cards</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 mb-1">
              {stats.cardsIntroducedToday}
            </div>
            <div className="text-sm text-muted-foreground">New Today 🌱</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600 mb-1">
              {stats.cardsRetiredToday}
            </div>
            <div className="text-sm text-muted-foreground">Retired Today 🏁</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary mb-1">
              {activeSets.length} / 5
            </div>
            <div className="text-sm text-muted-foreground">Active Sets</div>
          </div>
        </div>
      </div>

      {/* Daily Session Recording */}
      <div className="bg-card rounded-lg shadow border border-border p-6">
        <h2 className="text-xl font-bold text-foreground mb-4">
          📅 Today's Flashing Session
        </h2>
        <div className="space-y-4">
          <div>
            <p className="text-foreground mb-3 font-medium">Did a flashing session occur today?</p>
            {todaySession && !sessionOccurred && (
              <div className="mb-3 bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-700">
                ⏸️ Skipped day — Active Day Counts remain unchanged
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => recordSession(true)}
                disabled={sessionOccurred}
                className={`px-6 py-2 rounded-lg font-medium transition-all ${
                  sessionOccurred
                    ? 'bg-green-500 text-white shadow-md'
                    : 'bg-secondary text-secondary-foreground hover:bg-green-100 hover:shadow'
                }`}
              >
                {sessionOccurred ? '✓ Yes (Session Recorded)' : 'Yes'}
              </button>
              <button
                onClick={() => recordSession(false)}
                disabled={todaySession && !sessionOccurred}
                className={`px-6 py-2 rounded-lg font-medium transition-all ${
                  todaySession && !sessionOccurred
                    ? 'bg-orange-500 text-white shadow-md'
                    : 'bg-secondary text-secondary-foreground hover:bg-orange-100 hover:shadow'
                }`}
              >
                {todaySession && !sessionOccurred ? '✓ No (Day Skipped)' : 'No'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Session Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about today's session..."
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-foreground"
              rows={3}
            />
          </div>
        </div>
      </div>

      {/* Family Member Selector */}
      <div className="bg-card rounded-lg shadow border border-border p-4">
        <label className="block text-sm font-medium text-foreground mb-2">
          👤 Who is flashing today?
        </label>
        <select
          value={familyMember}
          onChange={(e) => setFamilyMember(e.target.value)}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-foreground"
        >
          <option value="Parent">Parent</option>
          <option value="Grandparent">Grandparent</option>
          <option value="Nanny">Nanny</option>
          <option value="Other">Other</option>
        </select>
      </div>

      {/* Active Sets with Tracking */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          📚 Active Card Sets ({activeSets.length} / 5 sets)
        </h2>
        
        {activeSets.map((set, setIndex) => {
          const setSession = sessions[setIndex] || {};
          const roundsCompleted = ['round1', 'round2', 'round3'].filter(r => setSession[r]?.completed).length;
          
          const isNewSet = set.activeCount === 1 && stats.cardsIntroducedToday > 0;
          const isRetiringSet = set.activeCount === 5;
          
          return (
            <div
              key={set.dateIntroduced}
              className="border border-border rounded-lg p-6 bg-card shadow-md transition-all hover:shadow-lg"
            >
              {/* Set Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-bold text-lg text-foreground">
                      Set {setIndex + 1}
                    </h3>
                    {isNewSet && (
                      <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full animate-fade-in">
                        🌱 New Today
                      </span>
                    )}
                    {isRetiringSet && (
                      <span className="px-3 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full">
                        🏁 Retiring Next Session
                      </span>
                    )}
                    <div className="flex gap-1">
                      {['round1', 'round2', 'round3'].map((round, idx) => (
                        <button
                          key={round}
                          onClick={() => markRoundComplete(setIndex, round)}
                          disabled={setSession[round]?.completed}
                          className={`w-8 h-8 rounded-full font-bold text-sm transition-all ${
                            setSession[round]?.completed
                              ? 'bg-green-500 text-white shadow-md scale-110'
                              : 'bg-secondary text-secondary-foreground hover:bg-green-100 hover:shadow'
                          }`}
                          title={`Round ${idx + 1}`}
                        >
                          {idx + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Introduced: {new Date(set.dateIntroduced).toLocaleDateString()} • 
                    Day {set.activeCount} of 5 • 
                    {roundsCompleted}/3 rounds completed today
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Active Day</div>
                  <div className="text-3xl font-bold text-primary">
                    D{set.activeCount}
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500"
                    style={{ width: `${(set.activeCount / 5) * 100}%` }}
                  />
                </div>
              </div>

              {/* Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {set.cards.map((card) => {
                  const isFlashed = flashedWords.has(card.id);
                  
                  return (
                    <div
                      key={card.id}
                      onClick={() => toggleCardFlashed(card, setIndex, 'round1')}
                      className={`rounded-lg p-4 border-2 cursor-pointer transition-all relative ${
                        isFlashed
                          ? 'border-green-500 bg-green-50 shadow-md scale-105'
                          : 'border-border bg-card hover:border-primary hover:shadow'
                      }`}
                    >
                      {/* Day Badge */}
                      <div className="absolute top-2 right-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          set.activeCount === 1 ? 'bg-blue-100 text-blue-700' :
                          set.activeCount === 2 ? 'bg-purple-100 text-purple-700' :
                          set.activeCount === 3 ? 'bg-indigo-100 text-indigo-700' :
                          set.activeCount === 4 ? 'bg-pink-100 text-pink-700' :
                          'bg-orange-100 text-orange-700'
                        }`}>
                          D{set.activeCount}
                        </span>
                      </div>
                      
                      <div className="flex items-start justify-between mb-2 pr-10">
                        <div className="font-medium text-foreground text-lg">
                          {card.front}
                        </div>
                        {isFlashed && (
                          <div className="text-green-500 text-2xl animate-scale-in">✓</div>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground mb-3">
                        {card.back}
                      </div>
                      <PronunciationButton word={card.front} />
                    </div>
                  );
                })}
              </div>

              {/* Set Status Warning */}
              {set.activeCount === 5 && (
                <div className="mt-4 bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-700 flex items-center gap-2">
                  <span className="text-lg">🏁</span>
                  <span>This set will be retired after the next flashing session and replaced with new cards</span>
                </div>
              )}
            </div>
          );
        })}
        
        {activeSets.length === 0 && (
          <div className="text-center py-12 text-muted-foreground bg-card rounded-lg border-2 border-dashed border-border">
            <div className="text-4xl mb-3">📚</div>
            <p className="font-medium text-foreground">No active card sets yet</p>
            <p className="text-sm mt-1">Record a flashing session to begin!</p>
          </div>
        )}
      </div>

      {/* Waiting Cards */}
      <div className="bg-card rounded-lg shadow border border-border p-6">
        <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
          ⏳ Waiting Cards ({waitingCards.length})
        </h2>
        <p className="text-muted-foreground mb-4">
          These cards will be introduced as active cards are retired (max 5 per day)
        </p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 max-h-64 overflow-y-auto">
          {waitingCards.slice(0, 25).map((card) => (
            <div
              key={card.id}
              className="bg-secondary/50 rounded p-2 border border-border text-sm hover:bg-secondary transition-colors"
            >
              <div className="font-medium text-foreground">{card.front}</div>
              <div className="text-xs text-muted-foreground">{card.back}</div>
            </div>
          ))}
        </div>
        {waitingCards.length > 25 && (
          <p className="text-sm text-muted-foreground mt-2">
            ... and {waitingCards.length - 25} more
          </p>
        )}
      </div>

      {/* Info Panel */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
          💡 How the Rotation Works
        </h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li className="flex items-start gap-2">
            <span className="font-bold">•</span>
            <span><strong>5 Active Sets:</strong> Maximum 25 active cards (5 sets × 5 cards)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold">•</span>
            <span><strong>5-Day Cycle:</strong> Each card goes through D1 → D2 → D3 → D4 → D5</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold">•</span>
            <span><strong>Auto Rotation:</strong> D5 cards retire, new cards introduced automatically</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold">•</span>
            <span><strong>Skipped Days:</strong> Day counts freeze — no retirement or introduction</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold">•</span>
            <span><strong>Staggered Start:</strong> Up to 5 new cards per session until 25 cards active</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default FlashcardScheduler;
