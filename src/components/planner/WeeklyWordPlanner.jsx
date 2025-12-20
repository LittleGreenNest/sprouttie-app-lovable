import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-toastify';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Trash2, 
  GripVertical,
  Calendar,
  List,
  Tag
} from 'lucide-react';

const WeeklyWordPlanner = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [wordPlans, setWordPlans] = useState([]);
  const [themes, setThemes] = useState([]);
  const [currentWeekStart, setCurrentWeekStart] = useState(getWeekStart(new Date()));
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' or 'list'
  const [newWord, setNewWord] = useState({ word: '', pinyin: '', theme: '', notes: '' });
  const [showAddForm, setShowAddForm] = useState(false);
  const [draggedWord, setDraggedWord] = useState(null);

  // Get Monday of the current week
  function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  // Format date as YYYY-MM-DD
  const formatDate = (date) => {
    return date.toISOString().split('T')[0];
  };

  // Get day name
  const getDayName = (date) => {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  // Get formatted date
  const getFormattedDate = (date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Generate week days array
  const getWeekDays = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(currentWeekStart);
      day.setDate(day.getDate() + i);
      days.push(day);
    }
    return days;
  };

  // Load word plans for current week
  const loadWordPlans = useCallback(async () => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const { data, error } = await supabase
        .from('word_plans')
        .select('*')
        .eq('user_id', currentUser.id)
        .gte('planned_week_start', formatDate(currentWeekStart))
        .lte('planned_week_start', formatDate(weekEnd))
        .order('display_order', { ascending: true });

      if (error) throw error;
      
      setWordPlans(data || []);
      
      // Extract unique themes
      const uniqueThemes = [...new Set((data || []).map(w => w.theme).filter(Boolean))];
      setThemes(uniqueThemes);
    } catch (error) {
      console.error('Error loading word plans:', error);
      toast.error('Failed to load word plans');
    } finally {
      setLoading(false);
    }
  }, [currentUser, currentWeekStart]);

  useEffect(() => {
    loadWordPlans();
  }, [loadWordPlans]);

  // Navigate weeks
  const goToPreviousWeek = () => {
    const newWeek = new Date(currentWeekStart);
    newWeek.setDate(newWeek.getDate() - 7);
    setCurrentWeekStart(newWeek);
  };

  const goToNextWeek = () => {
    const newWeek = new Date(currentWeekStart);
    newWeek.setDate(newWeek.getDate() + 7);
    setCurrentWeekStart(newWeek);
  };

  const goToCurrentWeek = () => {
    setCurrentWeekStart(getWeekStart(new Date()));
  };

  // Add new word
  const handleAddWord = async (targetDate = null) => {
    if (!newWord.word.trim()) {
      toast.error('Please enter a word');
      return;
    }

    try {
      const { error } = await supabase
        .from('word_plans')
        .insert({
          user_id: currentUser.id,
          word: newWord.word.trim(),
          pinyin: newWord.pinyin.trim() || null,
          theme: newWord.theme.trim() || null,
          planned_week_start: formatDate(currentWeekStart),
          planned_date: targetDate,
          notes: newWord.notes.trim() || null,
          display_order: wordPlans.length
        });

      if (error) throw error;

      toast.success('Word added to plan!');
      setNewWord({ word: '', pinyin: '', theme: '', notes: '' });
      setShowAddForm(false);
      loadWordPlans();
    } catch (error) {
      console.error('Error adding word:', error);
      toast.error('Failed to add word');
    }
  };

  // Delete word
  const handleDeleteWord = async (id) => {
    try {
      const { error } = await supabase
        .from('word_plans')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Word removed from plan');
      loadWordPlans();
    } catch (error) {
      console.error('Error deleting word:', error);
      toast.error('Failed to delete word');
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e, word) => {
    setDraggedWord(word);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, targetDate) => {
    e.preventDefault();
    if (!draggedWord) return;

    try {
      const { error } = await supabase
        .from('word_plans')
        .update({ planned_date: targetDate })
        .eq('id', draggedWord.id);

      if (error) throw error;
      
      loadWordPlans();
    } catch (error) {
      console.error('Error moving word:', error);
      toast.error('Failed to move word');
    }
    
    setDraggedWord(null);
  };

  // Get words for a specific date
  const getWordsForDate = (date) => {
    const dateStr = formatDate(date);
    return wordPlans.filter(w => w.planned_date === dateStr);
  };

  // Get unscheduled words
  const getUnscheduledWords = () => {
    return wordPlans.filter(w => !w.planned_date);
  };

  // Get week range string
  const getWeekRangeString = () => {
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    return `${getFormattedDate(currentWeekStart)} - ${getFormattedDate(weekEnd)}`;
  };

  // Check if current week
  const isCurrentWeek = () => {
    const today = getWeekStart(new Date());
    return formatDate(today) === formatDate(currentWeekStart);
  };

  if (loading && wordPlans.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Weekly Word Planner</h1>
          <p className="text-muted-foreground">Plan your flashcard words by theme and week</p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex bg-muted rounded-lg p-1">
            <button
              onClick={() => setViewMode('calendar')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'calendar' 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Calendar className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'list' 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Word
          </button>
        </div>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between bg-card border border-border rounded-xl p-4">
        <button
          onClick={goToPreviousWeek}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-4">
          <span className="text-lg font-semibold">{getWeekRangeString()}</span>
          {!isCurrentWeek() && (
            <button
              onClick={goToCurrentWeek}
              className="text-sm text-primary hover:underline"
            >
              Today
            </button>
          )}
        </div>

        <button
          onClick={goToNextWeek}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Add Word Form */}
      {showAddForm && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h3 className="font-semibold text-foreground">Add New Word</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="Word (Chinese)"
              value={newWord.word}
              onChange={(e) => setNewWord({ ...newWord, word: e.target.value })}
              className="px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              type="text"
              placeholder="Pinyin (optional)"
              value={newWord.pinyin}
              onChange={(e) => setNewWord({ ...newWord, pinyin: e.target.value })}
              className="px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              type="text"
              placeholder="Theme (e.g., Animals, Colors)"
              value={newWord.theme}
              onChange={(e) => setNewWord({ ...newWord, theme: e.target.value })}
              className="px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              list="themes-list"
            />
            <datalist id="themes-list">
              {themes.map(theme => (
                <option key={theme} value={theme} />
              ))}
            </datalist>
            <input
              type="text"
              placeholder="Notes (optional)"
              value={newWord.notes}
              onChange={(e) => setNewWord({ ...newWord, notes: e.target.value })}
              className="px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleAddWord(null)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Add to Backlog
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Theme Tags */}
      {themes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {themes.map(theme => (
            <span
              key={theme}
              className="flex items-center gap-1 px-3 py-1 bg-accent/20 text-accent-foreground rounded-full text-sm"
            >
              <Tag className="w-3 h-3" />
              {theme}
            </span>
          ))}
        </div>
      )}

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <div className="grid grid-cols-7 gap-2">
          {/* Day Headers */}
          {getWeekDays().map((day) => (
            <div
              key={formatDate(day)}
              className="text-center py-2 font-medium text-muted-foreground"
            >
              <div className="text-xs">{getDayName(day)}</div>
              <div className="text-lg">{day.getDate()}</div>
            </div>
          ))}

          {/* Day Columns */}
          {getWeekDays().map((day) => {
            const dayWords = getWordsForDate(day);
            const isToday = formatDate(day) === formatDate(new Date());
            
            return (
              <div
                key={`col-${formatDate(day)}`}
                className={`min-h-[200px] bg-card border rounded-xl p-2 transition-colors ${
                  isToday ? 'border-primary bg-primary/5' : 'border-border'
                } ${draggedWord ? 'hover:bg-accent/10' : ''}`}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, formatDate(day))}
              >
                <div className="space-y-2">
                  {dayWords.map((word) => (
                    <WordCard
                      key={word.id}
                      word={word}
                      onDelete={handleDeleteWord}
                      onDragStart={handleDragStart}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          {getWeekDays().map((day) => {
            const dayWords = getWordsForDate(day);
            const isToday = formatDate(day) === formatDate(new Date());
            
            return (
              <div
                key={formatDate(day)}
                className={`bg-card border rounded-xl p-4 ${
                  isToday ? 'border-primary' : 'border-border'
                }`}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, formatDate(day))}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">
                    {getDayName(day)}, {getFormattedDate(day)}
                    {isToday && <span className="ml-2 text-primary text-sm">(Today)</span>}
                  </h3>
                  <span className="text-sm text-muted-foreground">
                    {dayWords.length} word{dayWords.length !== 1 ? 's' : ''}
                  </span>
                </div>
                
                {dayWords.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {dayWords.map((word) => (
                      <WordCard
                        key={word.id}
                        word={word}
                        onDelete={handleDeleteWord}
                        onDragStart={handleDragStart}
                        compact
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No words planned</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Unscheduled Words (Backlog) */}
      {getUnscheduledWords().length > 0 && (
        <div className="bg-card border border-dashed border-border rounded-xl p-4">
          <h3 className="font-semibold mb-3 text-foreground">
            📋 Backlog ({getUnscheduledWords().length} words)
          </h3>
          <p className="text-sm text-muted-foreground mb-3">
            Drag words to schedule them for specific days
          </p>
          <div className="flex flex-wrap gap-2">
            {getUnscheduledWords().map((word) => (
              <WordCard
                key={word.id}
                word={word}
                onDelete={handleDeleteWord}
                onDragStart={handleDragStart}
                compact
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {wordPlans.length === 0 && !loading && (
        <div className="text-center py-12 bg-card border border-border rounded-xl">
          <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No words planned for this week</h3>
          <p className="text-muted-foreground mb-4">
            Start planning your flashcard words by clicking "Add Word"
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Add Your First Word
          </button>
        </div>
      )}
    </div>
  );
};

// Word Card Component
const WordCard = ({ word, onDelete, onDragStart, compact = false }) => {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, word)}
      className={`group bg-background border border-border rounded-lg cursor-grab active:cursor-grabbing transition-all hover:shadow-md ${
        compact ? 'px-3 py-2' : 'p-3'
      }`}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">{word.word}</span>
            {word.pinyin && (
              <span className="text-sm text-muted-foreground">({word.pinyin})</span>
            )}
          </div>
          
          {!compact && word.theme && (
            <span className="inline-block mt-1 px-2 py-0.5 bg-accent/20 text-accent-foreground rounded text-xs">
              {word.theme}
            </span>
          )}
          
          {!compact && word.notes && (
            <p className="mt-1 text-xs text-muted-foreground truncate">{word.notes}</p>
          )}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(word.id);
          }}
          className="p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

export default WeeklyWordPlanner;
