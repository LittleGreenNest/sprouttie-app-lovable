import React, { useState, useRef } from 'react';
import { Upload, X, Check, Loader2, AlertCircle, Video } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

/**
 * Extract audio from a video file using MediaRecorder.
 * Returns a Blob (webm/opus) that's typically 1-3MB even for long videos.
 */
const extractAudioFromVideo = (file) => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.muted = false;
    video.preload = 'auto';
    video.src = URL.createObjectURL(file);

    video.onloadedmetadata = () => {
      // Cap at 5 minutes to keep size reasonable
      const maxDuration = Math.min(video.duration, 300);

      const stream = video.captureStream();
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        reject(new Error('No audio track found in video'));
        return;
      }

      const audioStream = new MediaStream(audioTracks);
      const recorder = new MediaRecorder(audioStream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
        audioBitsPerSecond: 64000, // 64kbps — plenty for speech
      });

      const chunks = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        video.pause();
        URL.revokeObjectURL(video.src);
        const blob = new Blob(chunks, { type: recorder.mimeType });
        resolve(blob);
      };

      recorder.onerror = (e) => reject(e.error || new Error('Recording failed'));

      recorder.start();
      video.currentTime = 0;
      video.play().catch(reject);

      // Stop after maxDuration
      setTimeout(() => {
        if (recorder.state === 'recording') recorder.stop();
        video.pause();
      }, maxDuration * 1000 + 500);

      video.onended = () => {
        if (recorder.state === 'recording') recorder.stop();
      };
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video'));
    };
  });
};

const VideoWordExtractor = ({ onWordsExtracted, onClose }) => {
  const { currentUser } = useAuth();
  const fileInputRef = useRef(null);

  const [step, setStep] = useState('upload'); // 'upload' | 'compressing' | 'processing' | 'review'
  const [videoFile, setVideoFile] = useState(null);
  const [uploadFile, setUploadFile] = useState(null); // the file we'll actually upload (may be audio-only)
  const [videoPreviewUrl, setVideoPreviewUrl] = useState(null);
  const [extractedWords, setExtractedWords] = useState([]);
  const [selectedWords, setSelectedWords] = useState(new Set());
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [compressed, setCompressed] = useState(false);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      toast.error('Please select a video file.');
      return;
    }

    setVideoFile(file);
    setVideoPreviewUrl(URL.createObjectURL(file));
    setError(null);
    setCompressed(false);

    if (file.size <= MAX_FILE_SIZE) {
      setUploadFile(file);
    } else {
      // Auto-extract audio to shrink below 20MB
      try {
        setStep('compressing');
        const audioBlob = await extractAudioFromVideo(file);
        const audioFile = new File([audioBlob], `audio_${Date.now()}.webm`, { type: audioBlob.type });
        setUploadFile(audioFile);
        setCompressed(true);
        setStep('upload');
        toast.info(`Video was ${(file.size / 1024 / 1024).toFixed(0)}MB, extracted audio only (${(audioFile.size / 1024 / 1024).toFixed(1)}MB)`);
      } catch (err) {
        console.error('Audio extraction failed:', err);
        setStep('upload');
        toast.error('Could not compress video. Try a shorter clip.');
        setVideoFile(null);
        setVideoPreviewUrl(null);
        return;
      }
    }
  };

  const handleProcess = async () => {
    const fileToUpload = uploadFile || videoFile;
    if (!fileToUpload || !currentUser) return;

    setProcessing(true);
    setStep('processing');
    setError(null);

    try {
      // 1. Upload file to storage (may be audio-only if compressed)
      const ext = fileToUpload.name.split('.').pop() || 'mp4';
      const filePath = `${currentUser.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('spoken-word-videos')
        .upload(filePath, fileToUpload, { contentType: fileToUpload.type });

      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

      // 2. Call edge function to extract words
      const { data, error: fnError } = await supabase.functions.invoke('extract-words-from-video', {
        body: { videoPath: filePath },
      });

      // 3. Clean up — delete file from storage (no longer needed)
      supabase.storage.from('spoken-word-videos').remove([filePath]).catch(e =>
        console.warn('Storage cleanup failed (non-critical):', e)
      );

      if (fnError) throw new Error(fnError.message || 'Failed to process video');
      if (data?.error) throw new Error(data.error);

      const words = data?.words || [];

      if (words.length === 0) {
        setError('No words detected in the video. Try a clearer recording with less background noise.');
        setStep('upload');
        return;
      }

      setExtractedWords(words);
      // Pre-select high/medium confidence words
      setSelectedWords(new Set(
        words
          .filter(w => w.confidence !== 'low')
          .map((_, i) => i)
      ));
      setStep('review');
    } catch (err) {
      console.error('Video processing error:', err);
      setError(err.message || 'Failed to process video');
      setStep('upload');
    } finally {
      setProcessing(false);
    }
  };

  const toggleWord = (index) => {
    setSelectedWords(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleSaveWords = async () => {
    if (!currentUser || selectedWords.size === 0) return;

    setSaving(true);
    try {
      // Use the video file's lastModified date as the recording date
      const recordedAt = videoFile
        ? new Date(videoFile.lastModified).toISOString()
        : new Date().toISOString();

      const wordsToSave = extractedWords
        .filter((_, i) => selectedWords.has(i))
        .map(w => ({
          user_id: currentUser.id,
          word: w.word,
          word_stage: 'new',
          started_saying_at: recordedAt,
          notes: w.language !== 'en' ? `Language: ${w.language}` : null,
        }));

      const { error: insertError } = await supabase
        .from('spoken_words')
        .insert(wordsToSave);

      if (insertError) throw insertError;

      toast.success(`${wordsToSave.length} word${wordsToSave.length !== 1 ? 's' : ''} added! 🌱`);
      onWordsExtracted?.();
      onClose();
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Failed to save words');
    } finally {
      setSaving(false);
    }
  };

  const confidenceColor = {
    high: { bg: '#D1FAE5', text: '#065F46', border: '#A7F3D0' },
    medium: { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' },
    low: { bg: '#FEE2E2', text: '#991B1B', border: '#FECACA' },
  };

  const langLabel = { en: 'EN', zh: '中文', other: 'Other' };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md max-h-[85vh] overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100">
            <h3 className="text-base font-bold text-[hsl(var(--sprouttie-ink))]">
              {step === 'upload' && '📹 Upload a Video'}
              {step === 'compressing' && '🗜️ Compressing...'}
              {step === 'processing' && '🔍 Listening...'}
              {step === 'review' && '✅ Review Words'}
            </h3>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          <div className="overflow-y-auto" style={{ maxHeight: 'calc(85vh - 60px)' }}>
            {/* UPLOAD STEP */}
            {step === 'upload' && (
              <div className="p-5 space-y-4">
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  Upload a short clip (under 2 minutes is ideal) of your child speaking. Our AI will listen and extract the words they say, in any language.
                </p>

                {error && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                    <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                {!videoFile ? (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex flex-col items-center justify-center gap-3 py-10 border-2 border-dashed border-slate-200 rounded-2xl hover:border-[hsl(var(--sprouttie-green))] transition-colors"
                  >
                    <div className="w-14 h-14 rounded-full bg-[hsl(var(--sprouttie-green)/0.1)] flex items-center justify-center">
                      <Upload className="w-6 h-6 text-[hsl(var(--sprouttie-green-dark))]" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-[hsl(var(--sprouttie-ink))]">Tap to upload video</p>
                      <p className="text-xs text-slate-400 mt-1">MP4, MOV · ideally under 2 min</p>
                    </div>
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="relative rounded-2xl overflow-hidden bg-black">
                      <video
                        src={videoPreviewUrl}
                        controls
                        className="w-full max-h-48 object-contain"
                      />
                      <button
                        onClick={() => {
                          setVideoFile(null);
                          setUploadFile(null);
                          setVideoPreviewUrl(null);
                          setCompressed(false);
                        }}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {compressed && (
                      <p className="text-xs text-[hsl(var(--muted-foreground))] text-center">
                        ✅ Audio extracted, ready to analyse
                      </p>
                    )}

                    <button
                      onClick={handleProcess}
                      className="w-full py-3 rounded-xl font-medium text-white text-sm"
                      style={{ background: '#2D6A4F' }}
                    >
                      🎧 Extract Words from Video
                    </button>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            )}

            {/* COMPRESSING STEP */}
            {step === 'compressing' && (
              <div className="p-8 flex flex-col items-center gap-4 text-center">
                <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[hsl(var(--sprouttie-ink))]">
                    Extracting audio from video...
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    This keeps only the speech, so the file is much smaller
                  </p>
                </div>
              </div>
            )}

            {/* PROCESSING STEP */}
            {step === 'processing' && (
              <div className="p-8 flex flex-col items-center gap-4 text-center">
                <div className="w-16 h-16 rounded-full bg-[hsl(var(--sprouttie-green)/0.1)] flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-[hsl(var(--sprouttie-green-dark))] animate-spin" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[hsl(var(--sprouttie-ink))]">
                    Listening to your video...
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    This may take 15–30 seconds
                  </p>
                </div>
              </div>
            )}

            {/* REVIEW STEP */}
            {step === 'review' && (
              <div className="p-5 space-y-4">
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  We detected <strong>{extractedWords.length}</strong> word{extractedWords.length !== 1 ? 's' : ''}. 
                  Tap to select/deselect, then save.
                </p>

                {videoFile && (
                  <p className="text-xs text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted)/0.3)] rounded-lg px-3 py-2">
                    📅 Recorded: {new Date(videoFile.lastModified).toLocaleDateString('en', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                )}

                <div className="space-y-2">
                  {extractedWords.map((word, i) => {
                    const selected = selectedWords.has(i);
                    const colors = confidenceColor[word.confidence] || confidenceColor.medium;
                    return (
                      <button
                        key={i}
                        onClick={() => toggleWord(i)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left"
                        style={{
                          background: selected ? '#F0F7F4' : '#fff',
                          borderColor: selected ? '#52B788' : '#E5E7EB',
                        }}
                      >
                        {/* Checkbox */}
                        <div
                          className="w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors"
                          style={{
                            borderColor: selected ? '#52B788' : '#D1D5DB',
                            background: selected ? '#52B788' : 'transparent',
                          }}
                        >
                          {selected && <Check className="w-3 h-3 text-white" />}
                        </div>

                        {/* Word */}
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-[hsl(var(--sprouttie-ink))]">
                            {word.word}
                          </span>
                          {word.notes && (
                            <p className="text-xs text-slate-400 truncate">{word.notes}</p>
                          )}
                        </div>

                        {/* Language badge */}
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                          style={{ background: '#F1F5F9', color: '#64748B' }}
                        >
                          {langLabel[word.language] || word.language}
                        </span>

                        {/* Confidence badge */}
                        <span
                          className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                          style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
                        >
                          {word.confidence}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2 pb-4">
                  <button
                    onClick={() => {
                      setStep('upload');
                      setExtractedWords([]);
                    }}
                    className="flex-1 py-3 rounded-xl text-sm font-medium border border-slate-200 text-slate-600"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={handleSaveWords}
                    disabled={saving || selectedWords.size === 0}
                    className="flex-1 py-3 rounded-xl text-sm font-medium text-white"
                    style={{
                      background: selectedWords.size > 0 ? '#2D6A4F' : '#D1D5DB',
                      opacity: saving ? 0.7 : 1,
                    }}
                  >
                    {saving ? 'Saving...' : `Add ${selectedWords.size} Word${selectedWords.size !== 1 ? 's' : ''}`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default VideoWordExtractor;
