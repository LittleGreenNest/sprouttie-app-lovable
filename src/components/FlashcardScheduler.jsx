import React, { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

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

  useEffect(() => {
    if (currentUser) {
      loadScheduleData();
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
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg p-6">
        <h1 className="text-3xl font-bold mb-2">Flashcard Schedule Manager</h1>
        <p className="text-purple-100">
          Manage your daily rotation of flashcards with 5-day cycles
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <div className="text-sm text-slate-600 mb-1">Active Cards</div>
          <div className="text-3xl font-bold text-slate-900">
            {stats.totalActive} / 25
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <div className="text-sm text-slate-600 mb-1">Cards Introduced Today</div>
          <div className="text-3xl font-bold text-green-600">
            {stats.cardsIntroducedToday}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
          <div className="text-sm text-slate-600 mb-1">Cards Retired Today</div>
          <div className="text-3xl font-bold text-orange-600">
            {stats.cardsRetiredToday}
          </div>
        </div>
      </div>

      {/* Daily Session Recording */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4">
          Today's Flashing Session
        </h2>
        <div className="space-y-4">
          <div>
            <p className="text-slate-700 mb-3">Did a flashing session occur today?</p>
            <div className="flex gap-3">
              <button
                onClick={() => recordSession(true)}
                disabled={sessionOccurred}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  sessionOccurred
                    ? 'bg-green-500 text-white'
                    : 'bg-slate-200 text-slate-700 hover:bg-green-100'
                }`}
              >
                {sessionOccurred ? '✓ Yes (Recorded)' : 'Yes'}
              </button>
              <button
                onClick={() => recordSession(false)}
                disabled={todaySession && !sessionOccurred}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  todaySession && !sessionOccurred
                    ? 'bg-orange-500 text-white'
                    : 'bg-slate-200 text-slate-700 hover:bg-orange-100'
                }`}
              >
                {todaySession && !sessionOccurred ? '✓ No (Skipped)' : 'No'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Session Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about today's session..."
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              rows={3}
            />
          </div>
        </div>
      </div>

      {/* Active Sets Display */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4">
          Active Card Sets ({activeSets.length} sets)
        </h2>
        <div className="space-y-4">
          {activeSets.map((set, index) => (
            <div
              key={set.dateIntroduced}
              className="border border-slate-200 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-slate-900">
                    Set {index + 1}
                  </h3>
                  <p className="text-sm text-slate-600">
                    Introduced: {new Date(set.dateIntroduced).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-slate-600">Active Day Count</div>
                  <div className="text-2xl font-bold text-purple-600">
                    {set.activeCount} / 5
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                {set.cards.map((card) => (
                  <div
                    key={card.id}
                    className="bg-slate-50 rounded p-3 border border-slate-200"
                  >
                    <div className="font-medium text-slate-900 text-sm">
                      {card.front}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {card.back}
                    </div>
                  </div>
                ))}
              </div>
              {set.activeCount === 5 && (
                <div className="mt-3 bg-orange-50 border border-orange-200 rounded p-2 text-sm text-orange-700">
                  ⚠️ This set will be retired on the next flashing day
                </div>
              )}
            </div>
          ))}
          {activeSets.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              No active card sets yet. Record a flashing session to begin!
            </div>
          )}
        </div>
      </div>

      {/* Waiting Cards */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4">
          Waiting Cards ({waitingCards.length})
        </h2>
        <p className="text-slate-600 mb-4">
          These cards will be introduced as active cards are retired (max 5 per day)
        </p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 max-h-64 overflow-y-auto">
          {waitingCards.slice(0, 25).map((card) => (
            <div
              key={card.id}
              className="bg-slate-50 rounded p-2 border border-slate-200 text-sm"
            >
              <div className="font-medium text-slate-900">{card.front}</div>
              <div className="text-xs text-slate-500">{card.back}</div>
            </div>
          ))}
        </div>
        {waitingCards.length > 25 && (
          <p className="text-sm text-slate-500 mt-2">
            ... and {waitingCards.length - 25} more
          </p>
        )}
      </div>

      {/* Info Panel */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-bold text-blue-900 mb-2">How It Works</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li>• Maximum 25 active cards at any time (5 sets of 5 cards)</li>
          <li>• Each card has a 5-day active cycle (5 flashing sessions)</li>
          <li>• Cards are retired after 5 successful flashing days</li>
          <li>• New cards replace retired ones automatically</li>
          <li>• Skipped days don't affect the active day count</li>
          <li>• Up to 5 new cards can be introduced per flashing day</li>
        </ul>
      </div>
    </div>
  );
};

export default FlashcardScheduler;
