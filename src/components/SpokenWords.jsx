import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../context/AuthContext';
import { Plus, Trash2, Calendar, Video, Square, X, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'react-toastify';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';

// Stage config — single source of truth for emoji, labels, copy, sort order
const STAGES = {
  growing: {
    key: 'growing',
    emoji: '🌿',
    label: 'Growing',
    sectionLabel: '🌿 Growing — update these',
    toastLabel: 'Moved to 🌿 Growing!',
    sortOrder: 0,
  },
  new: {
    key: 'new',
    emoji: '🌱',
    label: 'New',
    sectionLabel: '🌱 New — just sprouting',
    toastLabel: 'Moved to 🌱 New!',
    sortOrder: 1,
  },
  owned: {
    key: 'owned',
    emoji: '🌳',
    label: 'Owned',
    sectionLabel: '🌳 Owned — he\'s got these',
    toastLabel: 'Moved to 🌳 Owned!',
    sortOrder: 2,
  },
};

const STAGE_ORDER = ['growing', 'new', 'owned'];

// ── Word Card ────────────────────────────────────────────────────────────────
const SWIPE_THRESHOLD = 68;

const WordCard = ({ word, onStageChange, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const [playingVideo, setPlayingVideo] = useState(false);

  const x = useMotionValue(0);
  const stage = STAGES[word.word_stage] || STAGES.new;
  const stageIndex = STAGE_ORDER.indexOf(word.word_stage);
  const nextStage = stageIndex < STAGE_ORDER.length - 1 ? STAGE_ORDER[stageIndex + 1] : null;
  const prevStage = stageIndex > 0 ? STAGE_ORDER[stageIndex - 1] : null;

  // Reveal layers animate in as user drags
  const rightOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
  const leftOpacity  = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0]);
  const rightScale   = useTransform(x, [0, SWIPE_THRESHOLD], [0.6, 1]);
  const leftScale    = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0.6]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor(Math.abs(now - date) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
    return date.toLocaleDateString();
  };

  const snapBack = () => animate(x, 0, { type: 'spring', stiffness: 500, damping: 38 });

  const handleDragEnd = (_, info) => {
    const offset = info.offset.x;
    if (offset > SWIPE_THRESHOLD && nextStage) {
      onStageChange(word.id, nextStage);
      snapBack();
    } else if (offset < -SWIPE_THRESHOLD && prevStage) {
      onStageChange(word.id, prevStage);
      snapBack();
    } else {
      snapBack();
    }
  };

  return (
    <div className="relative rounded-xl overflow-hidden">
      {/* ── Reveal: right side (advance) ── */}
      {nextStage && (
        <motion.div
          style={{ opacity: rightOpacity }}
          className="absolute inset-0 flex items-center justify-end pr-5 bg-primary/15 rounded-xl"
        >
          <motion.div style={{ scale: rightScale }} className="flex flex-col items-center gap-0.5">
            <span className="text-2xl">{STAGES[nextStage].emoji}</span>
            <span className="text-xs font-bold text-primary">{STAGES[nextStage].label}</span>
          </motion.div>
        </motion.div>
      )}

      {/* ── Reveal: left side (go back) ── */}
      {prevStage && (
        <motion.div
          style={{ opacity: leftOpacity }}
          className="absolute inset-0 flex items-center pl-5 bg-muted/70 rounded-xl"
        >
          <motion.div style={{ scale: leftScale }} className="flex flex-col items-center gap-0.5">
            <span className="text-2xl">{STAGES[prevStage].emoji}</span>
            <span className="text-xs font-bold text-muted-foreground">{STAGES[prevStage].label}</span>
          </motion.div>
        </motion.div>
      )}

      {/* ── Draggable card ── */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.12}
        dragMomentum={false}
        style={{ x }}
        onDragEnd={handleDragEnd}
        className="relative bg-card rounded-xl border border-border overflow-hidden cursor-grab active:cursor-grabbing select-none touch-pan-y"
      >
        {/* Header — always visible */}
        <button
          className="w-full text-left px-4 py-3.5 flex items-center justify-between gap-3"
          onClick={() => setExpanded(e => !e)}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xl leading-none">{stage.emoji}</span>
            <span className="font-semibold text-foreground truncate text-base">{word.word}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground hidden sm:flex items-center gap-1">
              <Calendar size={11} />
              {formatDate(word.started_saying_at)}
            </span>
            {expanded
              ? <ChevronUp size={16} className="text-muted-foreground" />
              : <ChevronDown size={16} className="text-muted-foreground" />}
          </div>
        </button>

        {/* Expanded panel */}
        {expanded && (
          <div className="border-t border-border px-4 py-3 space-y-3 bg-background/40">

            {/* Notes */}
            {word.notes && (
              <p className="text-sm text-muted-foreground italic">"{word.notes}"</p>
            )}

            {/* Date on mobile */}
            <p className="text-xs text-muted-foreground flex items-center gap-1 sm:hidden">
              <Calendar size={11} />
              Started saying {formatDate(word.started_saying_at)}
            </p>

            {/* Video */}
            {word.video_url && (
              <div>
                {playingVideo ? (
                  <video
                    src={word.video_url}
                    controls
                    autoPlay
                    className="w-full max-w-xs rounded-lg"
                    onEnded={() => setPlayingVideo(false)}
                  />
                ) : (
                  <button
                    onClick={() => setPlayingVideo(true)}
                    className="text-sm text-primary hover:text-primary/80 underline underline-offset-2"
                  >
                    Watch video clip
                  </button>
                )}
              </div>
            )}

            {/* Delete */}
            <div className="flex justify-end pt-1">
              <button
                onClick={() => onDelete(word.id)}
                className="flex items-center gap-1.5 text-xs text-destructive hover:text-destructive/80 transition-colors"
              >
                <Trash2 size={13} />
                Remove
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

// ── Add Word Form ─────────────────────────────────────────────────────────────
const AddWordForm = ({ currentUser, onWordAdded }) => {
  const [newWord, setNewWord] = useState('');
  const [notes, setNotes] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideo, setRecordedVideo] = useState(null);
  const mediaRecorderRef = useRef(null);
  const videoPreviewRef = useRef(null);
  const chunksRef = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: true });
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.play();
      }
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        setRecordedVideo(blob);
        stream.getTracks().forEach(t => t.stop());
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = null;
          videoPreviewRef.current.src = URL.createObjectURL(blob);
        }
      };
      mediaRecorder.start();
      setIsRecording(true);
    } catch {
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
    if (videoPreviewRef.current) videoPreviewRef.current.src = '';
  };

  const handleSubmit = async (e) => {
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
        const { data: urlData } = supabase.storage.from('spoken-word-videos').getPublicUrl(fileName);
        videoUrl = urlData.publicUrl;
      }

      const { error } = await supabase.from('spoken_words').insert({
        user_id: currentUser.id,
        word: newWord.trim(),
        notes: notes.trim() || null,
        video_url: videoUrl,
        word_stage: 'new',
      });

      if (error) throw error;

      toast.success('Word added! 🌱');
      setNewWord('');
      setNotes('');
      setRecordedVideo(null);
      if (videoPreviewRef.current) videoPreviewRef.current.src = '';
      onWordAdded();
    } catch (err) {
      console.error(err);
      toast.error('Failed to add word');
    }
  };

  return (
    <div className="bg-card rounded-xl shadow-sm p-5 border border-border">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Word or phrase</label>
          <input
            type="text"
            value={newWord}
            onChange={(e) => setNewWord(e.target.value)}
            placeholder="e.g. 'more', 'all done', 'mama'…"
            className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-foreground text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Context <span className="text-muted-foreground font-normal">(optional)</span></label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="When or where you noticed it…"
            className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-foreground text-sm"
          />
        </div>

        {/* Video */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Video clip <span className="text-muted-foreground font-normal">(optional)</span></label>
          <div className="space-y-2">
            <video
              ref={videoPreviewRef}
              className={`w-full rounded-lg bg-muted ${recordedVideo || isRecording ? 'block' : 'hidden'}`}
              muted={isRecording}
              controls={!!recordedVideo && !isRecording}
              playsInline
            />
            <div className="flex gap-2">
              {!isRecording && !recordedVideo && (
                <button type="button" onClick={startRecording}
                  className="flex-1 bg-secondary hover:bg-secondary/80 text-secondary-foreground text-sm font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2">
                  <Video size={16} /> Record clip
                </button>
              )}
              {isRecording && (
                <button type="button" onClick={stopRecording}
                  className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground text-sm font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2">
                  <Square size={16} /> Stop
                </button>
              )}
              {recordedVideo && !isRecording && (
                <>
                  <button type="button" onClick={startRecording}
                    className="flex-1 bg-secondary hover:bg-secondary/80 text-secondary-foreground text-sm font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2">
                    <Video size={16} /> Re-record
                  </button>
                  <button type="button" onClick={clearRecording}
                    className="bg-muted hover:bg-muted/80 text-muted-foreground py-2 px-3 rounded-lg transition-colors">
                    <X size={16} />
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
          <Plus size={18} />
          Add a word he said
        </button>
      </form>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const SpokenWords = () => {
  const { currentUser } = useAuth();
  const [spokenWords, setSpokenWords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser) fetchSpokenWords();
  }, [currentUser]);

  const fetchSpokenWords = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('spoken_words')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('stage_updated_at', { ascending: false });

      if (error) throw error;
      setSpokenWords(data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load words');
    } finally {
      setLoading(false);
    }
  };

  const handleStageChange = async (wordId, newStage) => {
    // Optimistic update
    setSpokenWords(prev =>
      prev.map(w => w.id === wordId
        ? { ...w, word_stage: newStage, stage_updated_at: new Date().toISOString() }
        : w
      )
    );

    try {
      const { error } = await supabase
        .from('spoken_words')
        .update({ word_stage: newStage, stage_updated_at: new Date().toISOString() })
        .eq('id', wordId)
        .eq('user_id', currentUser.id);

      if (error) throw error;
      toast.success(STAGES[newStage].toastLabel, { autoClose: 1800 });
    } catch (err) {
      console.error(err);
      toast.error('Could not update stage');
      fetchSpokenWords(); // revert
    }
  };

  const handleDelete = async (wordId) => {
    setSpokenWords(prev => prev.filter(w => w.id !== wordId));
    try {
      const { error } = await supabase
        .from('spoken_words')
        .delete()
        .eq('id', wordId)
        .eq('user_id', currentUser.id);
      if (error) throw error;
      toast.success('Word removed');
    } catch (err) {
      console.error(err);
      toast.error('Failed to remove word');
      fetchSpokenWords();
    }
  };

  // Sort: growing → new → owned, then by stage_updated_at desc within each group
  const sortedWords = [...spokenWords].sort((a, b) => {
    const stageA = STAGES[a.word_stage]?.sortOrder ?? 1;
    const stageB = STAGES[b.word_stage]?.sortOrder ?? 1;
    if (stageA !== stageB) return stageA - stageB;
    return new Date(b.stage_updated_at) - new Date(a.stage_updated_at);
  });

  // Stage counts
  const stageCounts = STAGE_ORDER.reduce((acc, key) => {
    acc[key] = spokenWords.filter(w => w.word_stage === key).length;
    return acc;
  }, {});

  // Group by stage for section labels
  const grouped = STAGE_ORDER.map(stageKey => ({
    stageKey,
    words: sortedWords.filter(w => w.word_stage === stageKey),
  })).filter(g => g.words.length > 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-6 flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Loading…</div>
      </div>
    );
  }

  const totalWords = spokenWords.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-24">
      <div className="max-w-xl mx-auto px-4 pt-6 space-y-5">

        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground">Words He's Saying</h1>
          <p className="text-sm text-muted-foreground">
            A gentle record of what you notice — not a test, just observations.
          </p>
          <p className="text-xs text-muted-foreground/60 tracking-wide mt-1">
            ← swipe cards to change stage →
          </p>
        </div>

        {/* Summary pills */}
        {totalWords > 0 && (
          <div className="flex gap-2 flex-wrap">
            {STAGE_ORDER.map(key => {
              const s = STAGES[key];
              const count = stageCounts[key];
              return (
                <span
                  key={key}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-card border border-border text-sm font-medium text-foreground"
                >
                  <span>{s.emoji}</span>
                  <span className="font-bold">{count}</span>
                  <span className="text-muted-foreground font-normal">{s.label}</span>
                </span>
              );
            })}
          </div>
        )}

        {/* Add word form */}
        <AddWordForm currentUser={currentUser} onWordAdded={fetchSpokenWords} />

        {/* Word list */}
        {totalWords === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm space-y-1">
            <p className="text-2xl">🌱</p>
            <p>No words added yet.</p>
            <p>Start by adding the first word or phrase you've heard him say.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {grouped.map(({ stageKey, words }) => (
              <div key={stageKey} className="space-y-2">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
                  {STAGES[stageKey].sectionLabel}
                </h2>
                <div className="space-y-2">
                  {words.map(word => (
                    <WordCard
                      key={word.id}
                      word={word}
                      onStageChange={handleStageChange}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SpokenWords;
