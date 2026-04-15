import React, { useState, useRef, useCallback } from 'react';
import { Camera, Upload, X, Check, AlertTriangle, Loader2, RotateCcw, Plus, Globe, ScanText, Eye, FileText } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useFlashcards } from '@/context/FlashcardContext';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const STEPS = { UPLOAD: 'upload', SCANNING: 'scanning', REVIEW: 'review', DONE: 'done' };
const MODES = { TEXT: 'text', IDENTIFY: 'identify' };

const PhotoScanner = () => {
  const navigate = useNavigate();
  const { flashcards, addFlashcard, categories, addCategory, sets, getFlashcardsForSet } = useFlashcards();
  const fileInputRef = useRef(null);

  const [step, setStep] = useState(STEPS.UPLOAD);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [detectedWords, setDetectedWords] = useState([]);
  const [selectedWords, setSelectedWords] = useState({});
  // Track which language version to save: 'english' keeps EN front, 'chinese' keeps CN front, 'both' saves two cards
  const [cardLanguage, setCardLanguage] = useState({});
  const [adding, setAdding] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  const [scanMode, setScanMode] = useState(MODES.TEXT);
  const [scanningProgress, setScanningProgress] = useState('');
  const [wordCategories, setWordCategories] = useState({}); // { [wordId]: categoryName }
  const [setFilter, setSetFilter] = useState('all'); // 'all', 'in-set', 'not-in-set', or a set id

  const existingWordsSet = new Set(flashcards.map(fc => fc.word || fc.front));

  const pdfPageToBase64 = async (page) => {
    const scale = 2;
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    return dataUrl.split(',')[1]; // return base64 only
  };

  const scanImage = async (base64, mimeType) => {
    const { data, error } = await supabase.functions.invoke('scan-flashcards', {
      body: { imageBase64: base64, mimeType, mode: scanMode === MODES.IDENTIFY ? 'identify' : 'text' },
    });
    if (error) throw error;
    return data;
  };

  const handleFile = useCallback(async (file) => {
    if (!file) return;

    const isPdf = file.type === 'application/pdf';
    const url = URL.createObjectURL(file);
    setPreviewUrl(isPdf ? null : url);
    setStep(STEPS.SCANNING);
    setAiMessage('');
    setScanningProgress(isPdf ? 'Loading PDF...' : '');

    try {
      let allWords = [];
      let message = '';

      if (isPdf) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const totalPages = Math.min(pdf.numPages, 10); // cap at 10 pages

        for (let i = 1; i <= totalPages; i++) {
          setScanningProgress(`Scanning page ${i} of ${totalPages}...`);
          const page = await pdf.getPage(i);
          const base64 = await pdfPageToBase64(page);
          const data = await scanImage(base64, 'image/jpeg');
          if (data.message && !message) message = data.message;
          if (data.words?.length) {
            allWords.push(...data.words);
          }
        }
      } else {
        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);
        const data = await scanImage(base64, file.type || 'image/jpeg');
        if (data.message) message = data.message;
        allWords = data.words || [];
      }

      if (message) setAiMessage(message);

      // Deduplicate by chinese character
      const seen = new Set();
      const uniqueWords = allWords.filter(w => {
        if (seen.has(w.chinese)) return false;
        seen.add(w.chinese);
        return true;
      });

      const words = uniqueWords.map((w, i) => ({
        ...w,
        id: `scan-${i}`,
        isDuplicate: existingWordsSet.has(w.chinese) || existingWordsSet.has(w.english),
        originalLanguage: w.originalLanguage || 'chinese',
      }));

      setDetectedWords(words);

      const sel = {};
      const lang = {};
      words.forEach(w => {
        if (!w.isDuplicate) sel[w.id] = true;
        lang[w.id] = w.originalLanguage === 'english' ? 'english' : 'chinese';
      });
      setSelectedWords(sel);
      setCardLanguage(lang);
      setStep(STEPS.REVIEW);
    } catch (err) {
      console.error('Scan error:', err);
      toast.error(isPdf ? 'Failed to scan PDF. Please try again.' : 'Failed to scan image. Please try again.');
      setStep(STEPS.UPLOAD);
    } finally {
      setScanningProgress('');
    }
  }, [existingWordsSet, scanMode]);

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
          {/* Mode toggle */}
          <div className="flex bg-slate-100 rounded-xl p-1">
            <button
              onClick={() => setScanMode(MODES.TEXT)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                scanMode === MODES.TEXT
                  ? 'bg-white text-[hsl(var(--sprouttie-ink))] shadow-sm'
                  : 'text-slate-500'
              }`}
            >
              <ScanText className="w-4 h-4" />
              Scan Text
            </button>
            <button
              onClick={() => setScanMode(MODES.IDENTIFY)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                scanMode === MODES.IDENTIFY
                  ? 'bg-white text-[hsl(var(--sprouttie-ink))] shadow-sm'
                  : 'text-slate-500'
              }`}
            >
              <Eye className="w-4 h-4" />
              What's this?
            </button>
          </div>

          {/* 3-step explainer strip */}
          <div className="flex items-center justify-between gap-2 bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
            {(scanMode === MODES.TEXT
              ? [
                  { emoji: '📸', label: 'Take a photo of anything that has words' },
                  { emoji: '🔍', label: 'We read the characters' },
                  { emoji: '✅', label: 'Added to your set instantly' },
                ]
              : [
                  { emoji: '📸', label: 'Snap any object' },
                  { emoji: '🧠', label: 'AI identifies it' },
                  { emoji: '✅', label: 'Get the Chinese word' },
                ]
            ).map((s, i) => (
              <React.Fragment key={i}>
                <div className="flex flex-col items-center text-center flex-1 gap-1.5">
                  <span className="text-2xl">{s.emoji}</span>
                  <span className="text-[11px] font-medium text-slate-600 leading-tight">{s.label}</span>
                </div>
                {i < 2 && <div className="w-4 h-px bg-slate-200 flex-shrink-0" />}
              </React.Fragment>
            ))}
          </div>

          <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center space-y-4 bg-slate-50/50">
            <div className="w-16 h-16 rounded-full bg-[hsl(var(--sprouttie-green)/0.1)] flex items-center justify-center mx-auto">
              {scanMode === MODES.IDENTIFY
                ? <Eye className="w-8 h-8 text-[hsl(var(--sprouttie-green))]" />
                : <Camera className="w-8 h-8 text-[hsl(var(--sprouttie-green))]" />
              }
            </div>
            <div>
              <p className="font-semibold text-[hsl(var(--sprouttie-ink))]">
                {scanMode === MODES.IDENTIFY
                  ? "Snap a photo of any object"
                  : "Snap anything with Chinese or English words"
                }
              </p>
              <p className="text-sm text-slate-500 mt-1">
                {scanMode === MODES.IDENTIFY
                  ? "Point at a toy, fruit, animal — we'll tell you the Chinese word"
                  : "Flashcards, toys, posters, books — we'll detect and translate up to 20 words at once"
                }
              </p>
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[hsl(var(--sprouttie-green))] text-white font-semibold text-sm shadow-sm hover:opacity-90 transition mx-auto"
            >
              <Upload className="w-4 h-4" />
              Upload Photo or PDF
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={e => handleFile(e.target.files?.[0])}
          />

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
            {scanMode === MODES.IDENTIFY
              ? <><strong>Tip:</strong> Get close to the object with good lighting. Works best with single items — toys, fruit, animals, household objects.</>
              : <><strong>Tip:</strong> Use good lighting and lay items flat. You can also upload a PDF (up to 10 pages). Works with up to 20 items at once.</>
            }
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
            <p className="font-semibold text-[hsl(var(--sprouttie-ink))]">
              {scanMode === MODES.IDENTIFY ? 'Identifying objects...' : 'Scanning for words...'}
            </p>
            <p className="text-sm text-slate-500">
              {scanningProgress || (scanMode === MODES.IDENTIFY ? 'Looking at the photo and finding the Chinese words' : 'Detecting Chinese & English words and generating translations')}
            </p>
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
