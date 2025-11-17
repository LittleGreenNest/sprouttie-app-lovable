import React, { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../context/AuthContext';
import { Plus, Trash2, Calendar } from 'lucide-react';
import { toast } from 'react-toastify';

const SpokenWords = () => {
  const { currentUser } = useAuth();
  const [spokenWords, setSpokenWords] = useState([]);
  const [newWord, setNewWord] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser) {
      fetchSpokenWords();
    }
  }, [currentUser]);

  const fetchSpokenWords = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('spoken_words')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('started_saying_at', { ascending: false });

      if (error) throw error;
      setSpokenWords(data || []);
    } catch (error) {
      console.error('Error fetching spoken words:', error);
      toast.error('Failed to load spoken words');
    } finally {
      setLoading(false);
    }
  };

  const addSpokenWord = async (e) => {
    e.preventDefault();
    if (!newWord.trim()) return;

    try {
      const { error } = await supabase
        .from('spoken_words')
        .insert({
          user_id: currentUser.id,
          word: newWord.trim(),
          notes: notes.trim() || null,
        });

      if (error) throw error;

      toast.success('Word added!');
      setNewWord('');
      setNotes('');
      fetchSpokenWords();
    } catch (error) {
      console.error('Error adding spoken word:', error);
      toast.error('Failed to add word');
    }
  };

  const deleteSpokenWord = async (id) => {
    try {
      const { error } = await supabase
        .from('spoken_words')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Word removed');
      fetchSpokenWords();
    } catch (error) {
      console.error('Error deleting spoken word:', error);
      toast.error('Failed to remove word');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Words & Phrases He's Saying</h1>
          <p className="text-muted-foreground">Track the words and phrases your son knows and uses</p>
        </div>

        {/* Add New Word Form */}
        <div className="bg-card rounded-lg shadow-lg p-6 border border-border">
          <form onSubmit={addSpokenWord} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Word or Phrase
              </label>
              <input
                type="text"
                value={newWord}
                onChange={(e) => setNewWord(e.target.value)}
                placeholder="Enter a word or phrase..."
                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-foreground"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Notes (optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="When/where he said it, context..."
                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-foreground"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={20} />
              Add Word/Phrase
            </button>
          </form>
        </div>

        {/* Words List */}
        <div className="bg-card rounded-lg shadow-lg p-6 border border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground">
              Active Vocabulary ({spokenWords.length})
            </h2>
          </div>

          {spokenWords.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No words or phrases added yet. Start tracking what your son is saying!
            </div>
          ) : (
            <div className="space-y-3">
              {spokenWords.map((word) => (
                <div
                  key={word.id}
                  className="bg-background/50 rounded-lg p-4 border border-border hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-lg font-semibold text-foreground">
                          {word.word}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar size={12} />
                          Started saying {formatDate(word.started_saying_at)}
                        </span>
                      </div>
                      {word.notes && (
                        <p className="text-sm text-muted-foreground">{word.notes}</p>
                      )}
                    </div>
                    <button
                      onClick={() => deleteSpokenWord(word.id)}
                      className="text-destructive hover:text-destructive/80 p-2 rounded-lg hover:bg-destructive/10 transition-colors"
                      title="Remove word"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SpokenWords;
