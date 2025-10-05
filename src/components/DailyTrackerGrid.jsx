import React, { useState, useEffect } from 'react';
import { useFlashcards } from '../context/FlashcardContext';
import { supabase } from '../integrations/supabase/client';
import { toast } from 'react-toastify';

const DailyTrackerGrid = () => {
  const { categories, flashcards, getFlashcardsByCategory } = useFlashcards();
  const [flashedCards, setFlashedCards] = useState(new Set());
  const [familyMembers, setFamilyMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState('');
  const [engagement, setEngagement] = useState(0);
  const [timeOfDay, setTimeOfDay] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    loadTodayTracking();
    loadFamilyMembers();
  }, []);

  const loadFamilyMembers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get unique family members from tracking history
      const { data, error } = await supabase
        .from('daily_tracking')
        .select('flashed_by')
        .eq('user_id', user.id)
        .not('flashed_by', 'is', null);

      if (error) throw error;

      const members = [...new Set(data?.map(d => d.flashed_by) || [])];
      setFamilyMembers(members);
      
      // Set default to first member or prompt to add
      if (members.length > 0) {
        setSelectedMember(members[0]);
      }
    } catch (error) {
      console.error('Error loading family members:', error);
    }
  };

  const loadTodayTracking = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('daily_tracking')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today);

      if (error) throw error;

      if (data && data.length > 0) {
        const flashed = new Set(data.map(d => d.flashcard_id));
        setFlashedCards(flashed);
        
        // Load engagement and notes from first record (they should be the same for the day)
        if (data[0]) {
          setEngagement(data[0].engagement || 0);
          setTimeOfDay(data[0].time_of_day || '');
          setNotes(data[0].notes || '');
        }
      }
    } catch (error) {
      console.error('Error loading tracking:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFlashcard = async (flashcardId) => {
    if (!selectedMember) {
      toast.error('Please enter your name first');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const newFlashedCards = new Set(flashedCards);
      
      if (newFlashedCards.has(flashcardId)) {
        // Remove from tracking
        newFlashedCards.delete(flashcardId);
        
        const { error } = await supabase
          .from('daily_tracking')
          .delete()
          .eq('user_id', user.id)
          .eq('flashcard_id', flashcardId)
          .eq('date', today);

        if (error) throw error;
      } else {
        // Add to tracking
        newFlashedCards.add(flashcardId);
        
        const { error } = await supabase
          .from('daily_tracking')
          .insert({
            user_id: user.id,
            flashcard_id: flashcardId,
            date: today,
            flashed_by: selectedMember,
            engagement,
            time_of_day: timeOfDay,
            notes
          });

        if (error) throw error;
      }

      setFlashedCards(newFlashedCards);
    } catch (error) {
      console.error('Error toggling flashcard:', error);
      toast.error('Failed to update tracking');
    }
  };

  const saveMetadata = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Update all today's records with new metadata
      const { error } = await supabase
        .from('daily_tracking')
        .update({
          engagement,
          time_of_day: timeOfDay,
          notes
        })
        .eq('user_id', user.id)
        .eq('date', today);

      if (error) throw error;
      
      toast.success('Saved successfully!');
    } catch (error) {
      console.error('Error saving metadata:', error);
      toast.error('Failed to save');
    }
  };

  const addNewMember = () => {
    const name = prompt('Enter family member name:');
    if (name && name.trim()) {
      setFamilyMembers([...familyMembers, name.trim()]);
      setSelectedMember(name.trim());
    }
  };

  const getCategoryStats = (categoryId) => {
    const categoryCards = getFlashcardsByCategory(categoryId);
    const flashed = categoryCards.filter(card => flashedCards.has(card.id)).length;
    const total = categoryCards.length;
    return { flashed, total, percentage: total > 0 ? Math.round((flashed / total) * 100) : 0 };
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium mb-2">Who's flashing today?</label>
            <div className="flex gap-2">
              <select
                value={selectedMember}
                onChange={(e) => setSelectedMember(e.target.value)}
                className="flex-1 border rounded-md px-3 py-2"
              >
                <option value="">Select member</option>
                {familyMembers.map(member => (
                  <option key={member} value={member}>{member}</option>
                ))}
              </select>
              <button
                onClick={addNewMember}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                + Add
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Engagement</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  onClick={() => setEngagement(rating)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                    rating <= engagement
                      ? 'bg-yellow-400 text-white'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {rating <= 2 ? '😐' : rating <= 4 ? '😊' : '😃'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Time</label>
            <div className="flex gap-2">
              {['Morning', 'Afternoon', 'Evening', 'Night'].map((time) => (
                <button
                  key={time}
                  onClick={() => setTimeOfDay(time)}
                  className={`px-3 py-2 rounded-md text-sm ${
                    timeOfDay === time
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {time === 'Morning' ? '🌅' : time === 'Afternoon' ? '☀️' : time === 'Evening' ? '🌆' : '🌙'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium mb-2">Notes</label>
          <div className="flex gap-2">
            <textarea
              rows="2"
              className="flex-1 border rounded-md p-2 text-sm"
              placeholder="Record observations, special moments..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <button
              onClick={saveMetadata}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 self-start"
            >
              Save
            </button>
          </div>
        </div>
      </div>

      {/* Progress Summary */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="font-medium mb-4">Today's Progress</h3>
        <div className="flex flex-wrap gap-4">
          {categories.map(category => {
            const stats = getCategoryStats(category.id);
            return (
              <div key={category.id} className="flex items-center gap-2">
                <div className="text-sm font-medium">{category.name}:</div>
                <div className="text-sm text-gray-600">
                  {stats.flashed}/{stats.total} ({stats.percentage}%)
                </div>
                <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 transition-all"
                    style={{ width: `${stats.percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Grid View - All Flashcards by Category */}
      <div className="space-y-6">
        {categories.map(category => {
          const categoryCards = getFlashcardsByCategory(category.id);
          if (categoryCards.length === 0) return null;

          return (
            <div key={category.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              {/* Category Header (Yellow Bar) */}
              <div className="bg-yellow-400 px-6 py-3">
                <h3 className="font-bold text-lg text-gray-800">{category.name}</h3>
              </div>

              {/* Flashcard Grid */}
              <div className="p-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                  {categoryCards.map(card => {
                    const isFlashed = flashedCards.has(card.id);
                    return (
                      <button
                        key={card.id}
                        onClick={() => toggleFlashcard(card.id)}
                        className={`p-3 rounded-lg border-2 transition-all hover:scale-105 ${
                          isFlashed
                            ? 'bg-green-100 border-green-500 text-green-900'
                            : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-gray-400'
                        }`}
                      >
                        <div className="text-center">
                          <div className="font-medium text-sm mb-1">{card.word}</div>
                          {card.english && (
                            <div className="text-xs text-gray-500">{card.english}</div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DailyTrackerGrid;
