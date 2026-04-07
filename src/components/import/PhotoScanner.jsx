import React, { useState, useRef, useCallback } from 'react';
import { Camera, Upload, X, Check, AlertTriangle, Loader2, RotateCcw, Plus, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useFlashcards } from '@/context/FlashcardContext';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const STEPS = { UPLOAD: 'upload', SCANNING: 'scanning', REVIEW: 'review', DONE: 'done' };

const PhotoScanner = () => {
  const navigate = useNavigate();
  const { flashcards, addFlashcard, categories, addCategory } = useFlashcards();
  const fileInputRef = useRef(null);

  const [step, setStep] = useState(STEPS.UPLOAD);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [detectedWords, setDetectedWords] = useState([]);
  const [selectedWords, setSelectedWords] = useState({});
  // Track which language version to save: 'english' keeps EN front, 'chinese' keeps CN front, 'both' saves two cards
  const [cardLanguage, setCardLanguage] = useState({});
  const [adding, setAdding] = useState(false);
  const [aiMessage, setAiMessage] = useState('');

  const existingWordsSet = new Set(flashcards.map(fc => fc.word || fc.front));

  const handleFile = useCallback(async (file) => {
    if (!file) return;

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setStep(STEPS.SCANNING);
    setAiMessage('');

    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);

      const { data, error } = await supabase.functions.invoke('scan-flashcards', {
        body: { imageBase64: base64, mimeType: file.type || 'image/jpeg' },
      });

      if (error) throw error;

      if (data.message) {
        setAiMessage(data.message);
      }

      const words = (data.words || []).map((w, i) => ({
        ...w,
        id: `scan-${i}`,
        isDuplicate: existingWordsSet.has(w.chinese) || existingWordsSet.has(w.english),
        originalLanguage: w.originalLanguage || 'chinese',
      }));

      setDetectedWords(words);

      // Auto-select non-duplicates, set default language based on original
      const sel = {};
      const lang = {};
      words.forEach(w => {
        if (!w.isDuplicate) sel[w.id] = true;
        // Default: keep the original language as the flashcard front
        lang[w.id] = w.originalLanguage === 'english' ? 'english' : 'chinese';
      });
      setSelectedWords(sel);
      setCardLanguage(lang);
      setStep(STEPS.REVIEW);
    } catch (err) {
      console.error('Scan error:', err);
      toast.error('Failed to scan image. Please try again.');
      setStep(STEPS.UPLOAD);
    }
  }, [existingWordsSet]);

  const toggleWord = (id) => {
    setSelectedWords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const cycleLanguage = (id, e) => {
    e.stopPropagation();
    setCardLanguage(prev => {
      const current = prev[id] || 'chinese';
      // Cycle: english → chinese → both → english
      const next = current === 'english' ? 'chinese' : current === 'chinese' ? 'both' : 'english';
      return { ...prev, [id]: next };
    });
  };

  const handleApprove = async () => {
    const wordsToAdd = detectedWords.filter(w => selectedWords[w.id]);
    if (wordsToAdd.length === 0) {
      toast.info('No words selected');
      return;
    }

    setAdding(true);
    let added = 0;

    try {
      for (const word of wordsToAdd) {
        const catExists = categories.some(
          c => c.name === word.category || c.id === word.category
        );
        if (!catExists && word.category) {
          await addCategory(word.category);
        }

        const lang = cardLanguage[word.id] || 'chinese';

        if (lang === 'english' || lang === 'both') {
          // English front card: front=English, back=Chinese + pinyin
          await addFlashcard(
            word.english,
            word.category || 'default',
            `${word.chinese} (${word.pinyin})`,
            word.pinyin || '',
            'word',
            null
          );
          added++;
        }

        if (lang === 'chinese' || lang === 'both') {
          // Chinese front card: front=Chinese, back=English
          await addFlashcard(
            word.chinese,
            word.category || 'default',
            word.english || '',
            word.pinyin || '',
            'word',
            null
          );
          added++;
        }
      }

      toast.success(`Added ${added} flashcard${added !== 1 ? 's' : ''}! 🎉`);
      setStep(STEPS.DONE);
    } catch (err) {
      console.error('Error adding flashcards:', err);
      toast.error(`Added ${added} cards, but an error occurred.`);
    } finally {
      setAdding(false);
    }
  };

  const reset = () => {
    setStep(STEPS.UPLOAD);
    setPreviewUrl(null);
    setDetectedWords([]);
    setSelectedWords({});
    setCardLanguage({});
    setAiMessage('');
  };

  const getLangLabel = (lang) => {
    if (lang === 'english') return 'EN';
    if (lang === 'both') return 'Both';
    return 'CN';
  };

  const getLangColor = (lang) => {
    if (lang === 'english') return 'bg-blue-100 text-blue-700';
    if (lang === 'both') return 'bg-purple-100 text-purple-700';
    return 'bg-red-100 text-red-700';
  };

  // Count total cards that will be created
  const totalCardsToAdd = detectedWords.filter(w => selectedWords[w.id]).reduce((sum, w) => {
    const lang = cardLanguage[w.id] || 'chinese';
    return sum + (lang === 'both' ? 2 : 1);
  }, 0);

  return (
    <div className="max-w-lg mx-auto pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl bg-[hsl(var(--sprouttie-green)/0.12)] flex items-center justify-center">
          <Camera className="w-5 h-5 text-[hsl(var(--sprouttie-green-dark))]" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-[hsl(var(--sprouttie-ink))]">Scan Words</h2>
          <p className="text-xs text-slate-500">Snap a photo of flashcards, toys, or anything with Chinese or English words</p>
        </div>
      </div>

      {/* UPLOAD STEP */}
      {step === STEPS.UPLOAD && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* 3-step explainer strip */}
          <div className="flex items-center justify-between gap-2 bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
            {[
              { emoji: '📸', label: 'Lay cards out flat' },
              { emoji: '🔍', label: 'We read the characters' },
              { emoji: '✅', label: 'Added to your set instantly' },
            ].map((step, i) => (
              <React.Fragment key={i}>
                <div className="flex flex-col items-center text-center flex-1 gap-1.5">
                  <span className="text-2xl">{step.emoji}</span>
                  <span className="text-[11px] font-medium text-slate-600 leading-tight">{step.label}</span>
                </div>
                {i < 2 && <div className="w-4 h-px bg-slate-200 flex-shrink-0" />}
              </React.Fragment>
            ))}
          </div>

          <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center space-y-4 bg-slate-50/50">
            <div className="w-16 h-16 rounded-full bg-[hsl(var(--sprouttie-green)/0.1)] flex items-center justify-center mx-auto">
              <Camera className="w-8 h-8 text-[hsl(var(--sprouttie-green))]" />
            </div>
            <div>
              <p className="font-semibold text-[hsl(var(--sprouttie-ink))]">
                Snap anything with Chinese or English words
              </p>
              <p className="text-sm text-slate-500 mt-1">
                Flashcards, toys, posters, books — we'll detect and translate up to 20 words at once
              </p>
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[hsl(var(--sprouttie-green))] text-white font-semibold text-sm shadow-sm hover:opacity-90 transition mx-auto"
            >
              <Upload className="w-4 h-4" />
              Upload or Take Photo
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => handleFile(e.target.files?.[0])}
          />

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
            <strong>Tip:</strong> Use good lighting and lay items flat. On iPhone, tap the button then choose "Take Photo". Works with up to 20 items at once.
          </div>
        </motion.div>
      )}

      {/* SCANNING STEP */}
      {step === STEPS.SCANNING && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          {previewUrl && (
            <div className="rounded-2xl overflow-hidden border border-slate-200">
              <img src={previewUrl} alt="Scanned words" className="w-full max-h-64 object-cover" />
            </div>
          )}
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="w-10 h-10 text-[hsl(var(--sprouttie-green))] animate-spin" />
            <p className="font-semibold text-[hsl(var(--sprouttie-ink))]">Scanning for words...</p>
            <p className="text-sm text-slate-500">Detecting Chinese & English words and generating translations</p>
          </div>
        </motion.div>
      )}

      {/* REVIEW STEP */}
      {step === STEPS.REVIEW && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {previewUrl && (
            <div className="rounded-2xl overflow-hidden border border-slate-200">
              <img src={previewUrl} alt="Scanned words" className="w-full max-h-40 object-cover" />
            </div>
          )}

          {aiMessage && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
              {aiMessage}
            </div>
          )}

          {detectedWords.length === 0 ? (
            <div className="text-center py-8 space-y-3">
              <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
              <p className="font-semibold text-[hsl(var(--sprouttie-ink))]">No words detected</p>
              <p className="text-sm text-slate-500">Try again with better lighting or clearer text</p>
              <button onClick={reset} className="text-[hsl(var(--sprouttie-green))] font-semibold text-sm mt-2">
                Try Again
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-[hsl(var(--sprouttie-ink))]">
                  Found {detectedWords.length} word{detectedWords.length !== 1 ? 's' : ''}
                </p>
                <button
                  onClick={() => {
                    const allSelected = detectedWords.every(w => selectedWords[w.id]);
                    const sel = {};
                    if (!allSelected) detectedWords.forEach(w => (sel[w.id] = true));
                    setSelectedWords(sel);
                  }}
                  className="text-xs text-[hsl(var(--sprouttie-green-dark))] font-semibold"
                >
                  {detectedWords.every(w => selectedWords[w.id]) ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              {/* Language hint */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-2.5 text-xs text-blue-700">
                <strong>Tap the language badge</strong> to cycle: <span className="font-semibold">EN</span> (English front) → <span className="font-semibold">CN</span> (Chinese front) → <span className="font-semibold">Both</span> (saves two cards)
              </div>

              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                {detectedWords.map(word => {
                  const lang = cardLanguage[word.id] || 'chinese';
                  return (
                    <motion.div
                      key={word.id}
                      layout
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                        selectedWords[word.id]
                          ? 'border-[hsl(var(--sprouttie-green)/0.4)] bg-[hsl(var(--sprouttie-green)/0.05)]'
                          : 'border-slate-100 bg-white'
                      } ${word.isDuplicate ? 'opacity-70' : ''}`}
                      onClick={() => toggleWord(word.id)}
                    >
                      {/* Checkbox */}
                      <div
                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition ${
                          selectedWords[word.id]
                            ? 'bg-[hsl(var(--sprouttie-green))] border-[hsl(var(--sprouttie-green))]'
                            : 'border-slate-300'
                        }`}
                      >
                        {selectedWords[word.id] && <Check className="w-3 h-3 text-white" />}
                      </div>

                      {/* Word info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-[hsl(var(--sprouttie-ink))]">
                            {word.chinese}
                          </span>
                          {word.originalLanguage === 'english' && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600">
                              FROM EN
                            </span>
                          )}
                          {word.isDuplicate && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                              EXISTS
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span>{word.pinyin}</span>
                          <span>·</span>
                          <span>{word.english}</span>
                        </div>
                      </div>

                      {/* Language toggle badge */}
                      <button
                        onClick={(e) => cycleLanguage(word.id, e)}
                        className={`text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0 transition-colors ${getLangColor(lang)}`}
                        title="Tap to change: EN / CN / Both"
                      >
                        {getLangLabel(lang)}
                      </button>

                      {/* Category badge */}
                      <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-slate-100 text-slate-600 flex-shrink-0">
                        {word.category}
                      </span>
                    </motion.div>
                  );
                })}
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={reset}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition"
                >
                  <RotateCcw className="w-4 h-4" />
                  Rescan
                </button>
                <button
                  onClick={handleApprove}
                  disabled={adding || totalCardsToAdd === 0}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[hsl(var(--sprouttie-green))] text-white font-semibold text-sm shadow-sm hover:opacity-90 transition disabled:opacity-50"
                >
                  {adding ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Add {totalCardsToAdd} Card{totalCardsToAdd !== 1 ? 's' : ''}
                </button>
              </div>
            </>
          )}
        </motion.div>
      )}

      {/* DONE STEP */}
      {step === STEPS.DONE && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-12 space-y-4"
        >
          <div className="w-16 h-16 rounded-full bg-[hsl(var(--sprouttie-green)/0.12)] flex items-center justify-center mx-auto">
            <Check className="w-8 h-8 text-[hsl(var(--sprouttie-green))]" />
          </div>
          <h3 className="text-xl font-bold text-[hsl(var(--sprouttie-ink))]">Cards Added!</h3>
          <p className="text-sm text-slate-500">Your scanned flashcards have been saved</p>
          <div className="flex gap-3 justify-center pt-4">
            <button
              onClick={reset}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition"
            >
              <Camera className="w-4 h-4" />
              Scan More
            </button>
            <button
              onClick={() => navigate('/manage-flashcards')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[hsl(var(--sprouttie-green))] text-white font-semibold text-sm shadow-sm hover:opacity-90 transition"
            >
              View Cards
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default PhotoScanner;
