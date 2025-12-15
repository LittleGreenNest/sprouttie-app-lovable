import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../context/AuthContext';
import { Plus, Trash2, Calendar, Video, Square, Play, X } from 'lucide-react';
import { toast } from 'react-toastify';

const SpokenWords = () => {
  const { currentUser } = useAuth();
  const [spokenWords, setSpokenWords] = useState([]);
  const [newWord, setNewWord] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideo, setRecordedVideo] = useState(null);
  const [playingVideoId, setPlayingVideoId] = useState(null);
  const mediaRecorderRef = useRef(null);
  const videoPreviewRef = useRef(null);
  const chunksRef = useRef([]);

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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' }, 
        audio: true 
      });
      
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.play();
      }
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        setRecordedVideo(blob);
        stream.getTracks().forEach(track => track.stop());
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = null;
          videoPreviewRef.current.src = URL.createObjectURL(blob);
        }
      };
      
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Could not access camera');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const clearRecording = () => {
    setRecordedVideo(null);
    if (videoPreviewRef.current) {
      videoPreviewRef.current.src = '';
    }
  };

  const addSpokenWord = async (e) => {
    e.preventDefault();
    if (!newWord.trim()) return;

    try {
      let videoUrl = null;
      
      if (recordedVideo) {
        const fileName = `${currentUser.id}/${Date.now()}.webm`;
        const { error: uploadError } = await supabase.storage
          .from('spoken-word-videos')
          .upload(fileName, recordedVideo);
        
        if (uploadError) throw uploadError;
        
        const { data: urlData } = supabase.storage
          .from('spoken-word-videos')
          .getPublicUrl(fileName);
        
        videoUrl = urlData.publicUrl;
      }

      const { error } = await supabase
        .from('spoken_words')
        .insert({
          user_id: currentUser.id,
          word: newWord.trim(),
          notes: notes.trim() || null,
          video_url: videoUrl,
        });

      if (error) throw error;

      toast.success('Word added!');
      setNewWord('');
      setNotes('');
      setRecordedVideo(null);
      if (videoPreviewRef.current) videoPreviewRef.current.src = '';
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
            
            {/* Video Recording Section */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Video (optional)
              </label>
              <div className="space-y-3">
                <video 
                  ref={videoPreviewRef} 
                  className={`w-full rounded-lg bg-muted ${recordedVideo || isRecording ? 'block' : 'hidden'}`}
                  muted={isRecording}
                  controls={!!recordedVideo && !isRecording}
                  playsInline
                />
                <div className="flex gap-2">
                  {!isRecording && !recordedVideo && (
                    <button
                      type="button"
                      onClick={startRecording}
                      className="flex-1 bg-secondary hover:bg-secondary/80 text-secondary-foreground font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Video size={18} />
                      Record Video
                    </button>
                  )}
                  {isRecording && (
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Square size={18} />
                      Stop Recording
                    </button>
                  )}
                  {recordedVideo && !isRecording && (
                    <>
                      <button
                        type="button"
                        onClick={startRecording}
                        className="flex-1 bg-secondary hover:bg-secondary/80 text-secondary-foreground font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <Video size={18} />
                        Re-record
                      </button>
                      <button
                        type="button"
                        onClick={clearRecording}
                        className="bg-muted hover:bg-muted/80 text-muted-foreground font-medium py-2 px-4 rounded-lg transition-colors"
                      >
                        <X size={18} />
                      </button>
                    </>
                  )}
                </div>
              </div>
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
                      {word.video_url && (
                        <div className="mt-2">
                          {playingVideoId === word.id ? (
                            <video 
                              src={word.video_url} 
                              controls 
                              autoPlay
                              className="w-full max-w-sm rounded-lg"
                              onEnded={() => setPlayingVideoId(null)}
                            />
                          ) : (
                            <button
                              onClick={() => setPlayingVideoId(word.id)}
                              className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
                            >
                              <Play size={16} />
                              Watch video
                            </button>
                          )}
                        </div>
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
