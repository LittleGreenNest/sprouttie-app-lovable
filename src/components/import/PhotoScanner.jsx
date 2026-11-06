import { FREE_CARD_LIMIT } from '@/utils/planLimits';
import React, { useState, useRef, useCallback } from 'react';
import { Camera, Upload, X, Check, AlertTriangle, Loader2, RotateCcw, Plus, Globe, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useFlashcards } from '@/context/FlashcardContext';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const STEPS = { UPLOAD: 'upload', SCANNING: 'scanning', REVIEW: 'review', DONE: 'done' };

// Resize image only if over 4MB — preserves quality for text/character recognition.
// Resizes to max 2048px and keeps PNG (lossless) for best OCR accuracy.
const resizeImageToBase64 = (file, maxPx = 2048) =>
  new Promise((resolve, reject) => {
    // Skip resizing for small files — send original as-is
    if (file.size < 4 * 1024 * 1024) {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      let { width, height } = img;
      if (width > maxPx || height > maxPx) {
        if (width >= height) { height = Math.round((height / width) * maxPx); width = maxPx; }
        else { width = Math.round((width / height) * maxPx); height = maxPx; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(objectUrl);
      // Use PNG for lossless quality — critical for accurate character recognition
      resolve(canvas.toDataURL('image/png').split(',')[1]);
    };
    img.onerror = reject;
    img.src = objectUrl;
  });
/** One photo per scan; this many words or phrases are kept from it. */
const MAX_WORDS = 30;

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
  const [skipTranslation, setSkipTranslation] = useState(false);
  const [scanningProgress, setScanningProgress] = useState('');
  const [wordCategories, setWordCategories] = useState({}); // { [wordId]: categoryName }
  const [setFilter, setSetFilter] = useState('all'); // 'all', 'in-set', 'not-in-set', or a set id

  const existingWordsSet = new Set(flashcards.map(fc => fc.word || fc.front));

  const scanImage = async (base64, mimeType) => {
    const { data, error } = await supabase.functions.invoke('scan-flashcards', {
      body: {
        imageBase64: base64,
        mimeType,
        mode: 'text',
        skipTranslation,
      },
    });
    if (error) throw error;
    return data;
  };

  const processOneFile = async (file) => {
    // Resize large images before encoding. iPhone photos can be 4-8MB, which
    // strains the edge function body limit.
    const base64 = await resizeImageToBase64(file, 2048);
    const mimeType = file.size < 4 * 1024 * 1024 ? (file.type || 'image/jpeg') : 'image/png';
    const data = await scanImage(base64, mimeType);
    if (data.error) throw new Error(data.error);
    return { words: data.words || [], message: data.message || '' };
  };

  const handleFiles = useCallback(async (files) => {
    if (!files || files.length === 0) return;

    const file = files[0];

    // Show a preview from a data URL (blob URLs can fail in some PWA/browser contexts)
    const reader = new FileReader();
    reader.onload = (e) => setPreviewUrl(e.target.result);
    reader.readAsDataURL(file);
    setStep(STEPS.SCANNING);
    setAiMessage('');
    setScanningProgress('');

    try {
      const result = await processOneFile(file);
      const allWords = result.words;
      const message = result.message;

      if (message) setAiMessage(message);

      // Deduplicate by chinese character, falling back to english for words with no Chinese translation
      // (e.g. skip-translation scans, where every such word would otherwise share the key "")
      const seen = new Set();
      const uniqueWords = allWords.filter(w => {
        const key = w.chinese?.trim() || w.english;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      const words = uniqueWords.slice(0, MAX_WORDS).map((w, i) => ({
        ...w,
        id: `scan-${i}`,
        isDuplicate: existingWordsSet.has(w.chinese) || existingWordsSet.has(w.english),
        originalLanguage: w.originalLanguage || 'chinese',
      }));

      setDetectedWords(words);

      const sel = {};
      const lang = {};
      const cats = {};
      words.forEach(w => {
        if (!w.isDuplicate) sel[w.id] = true;
        lang[w.id] = w.originalLanguage === 'english' ? 'english' : 'chinese';
        cats[w.id] = w.category || 'default';
      });
      setSelectedWords(sel);
      setCardLanguage(lang);
      setWordCategories(cats);
      setStep(STEPS.REVIEW);
    } catch (err) {
      console.error('Scan error:', err);
      const msg = err?.message || err?.error || 'Failed to scan. Please try again.';
      toast.error(msg.length > 120 ? msg.slice(0, 120) + '…' : msg);
      setStep(STEPS.UPLOAD);
    } finally {
      setScanningProgress('');
    }
  }, [existingWordsSet, skipTranslation]);

  const toggleWord = (id) => {
    setSelectedWords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const cycleLanguage = (word, e) => {
    e.stopPropagation();
    // Words with no Chinese translation (skip-translation scans) can only be saved as English
    if (!word.chinese?.trim()) return;
    const id = word.id;
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
        const cat = wordCategories[word.id] || word.category || 'default';
        const catExists = categories.some(c => c.name === cat || c.id === cat);
        if (!catExists && cat) {
          await addCategory(cat);
        }

        const lang = cardLanguage[word.id] || 'chinese';

        if ((lang === 'english' || lang === 'both') && word.english?.trim()) {
          await addFlashcard(
            word.english.trim(),
            cat,
            word.chinese ? `${word.chinese} (${word.pinyin || ''})` : '',
            word.pinyin || '',
            'word',
            null,
            'en'
          );
          added++;
        }

        if ((lang === 'chinese' || lang === 'both') && word.chinese?.trim()) {
          await addFlashcard(
            word.chinese.trim(),
            cat,
            word.english || '',
            word.pinyin || '',
            'word',
            null,
            'zh'
          );
          added++;
        }
      }

      toast.success(`Added ${added} flashcard${added !== 1 ? 's' : ''}! 🎉`);
      setStep(STEPS.DONE);
    } catch (err) {
      if (err?.message === 'FREE_LIMIT_REACHED') {
        toast.error(`You've reached the ${FREE_CARD_LIMIT}-card free limit. Upgrade to add more.`);
        navigate('/plans');
        return;
      }
      toast.error(added > 0 ? `Added ${added} cards, but then hit an error.` : 'Failed to add cards. Please try again.');
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
    setWordCategories({});
    setAiMessage('');
    setSetFilter('all');
  };

  // Build set membership lookup for existing flashcards
  const cardSetMap = React.useMemo(() => {
    const map = {}; // cardFront -> setName
    if (sets) {
      sets.forEach((set, idx) => {
        const setCards = getFlashcardsForSet(set.id);
        setCards.forEach(card => {
          if (card.front) map[card.front.toLowerCase()] = `Set ${idx + 1}`;
        });
      });
    }
    return map;
  }, [sets, getFlashcardsForSet]);

  const getWordSetName = (word) => {
    return cardSetMap[word.chinese?.toLowerCase()] || cardSetMap[word.english?.toLowerCase()] || null;
  };

  // Filter detected words based on set filter
  const filteredDetectedWords = React.useMemo(() => {
    if (setFilter === 'all') return detectedWords;
    if (setFilter === 'in-set') return detectedWords.filter(w => getWordSetName(w));
    if (setFilter === 'not-in-set') return detectedWords.filter(w => !getWordSetName(w));
    return detectedWords;
  }, [detectedWords, setFilter, cardSetMap]);

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
          <p className="text-xs text-slate-500">Snap a photo of anything with words on it</p>
        </div>
      </div>

      {/* UPLOAD STEP */}
      {step === STEPS.UPLOAD && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <label className="flex items-center gap-2 px-1 text-xs text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={skipTranslation}
              onChange={(e) => setSkipTranslation(e.target.checked)}
              className="rounded border-slate-300 text-[hsl(var(--sprouttie-green))] focus:ring-[hsl(var(--sprouttie-green))]"
            />
            Keep English words as English, so "bus" stays "bus" and is not translated to Chinese
          </label>

          {/* 3-step explainer strip */}
          <div className="flex items-center justify-between gap-2 bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
            {[
              { emoji: '📸', label: 'Take one photo of anything that has words' },
              { emoji: '🔍', label: 'We read the words' },
              { emoji: '✅', label: 'You check them, then add' },
            ].map((s, i) => (
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
              <Camera className="w-8 h-8 text-[hsl(var(--sprouttie-green))]" />
            </div>
            <div>
              <p className="font-semibold text-[hsl(var(--sprouttie-ink))]">
                Photograph anything with words on it
              </p>
              <p className="text-sm text-slate-500 mt-1">
                A flashcard spread, a poster, a wooden panel, a book page. We read up to 30 words or phrases from one photo.
              </p>
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn-primary flex items-center gap-2 px-6 py-3 rounded-xl bg-[hsl(var(--sprouttie-green))] text-white font-semibold text-sm shadow-sm hover:opacity-90 transition mx-auto"
            >
              <Upload className="w-4 h-4" />
              Upload a photo
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => {
              handleFiles(e.target.files);
              e.target.value = '';
            }}
          />

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
            <strong>Tip:</strong> The photo needs words in it. Use good lighting, lay items flat and take one photo at a time.
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
              Scanning for words...
            </p>
            <p className="text-sm text-slate-500">
              {skipTranslation ? 'Detecting Chinese & English words' : 'Detecting Chinese & English words and generating translations'}
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
                  {filteredDetectedWords.length !== detectedWords.length && (
                    <span className="text-slate-400 font-normal"> · showing {filteredDetectedWords.length}</span>
                  )}
                </p>
                <button
                  onClick={() => {
                    const allSelected = filteredDetectedWords.every(w => selectedWords[w.id]);
                    const sel = { ...selectedWords };
                    filteredDetectedWords.forEach(w => (sel[w.id] = !allSelected));
                    setSelectedWords(sel);
                  }}
                  className="text-xs text-[hsl(var(--sprouttie-green-dark))] font-semibold"
                >
                  {filteredDetectedWords.every(w => selectedWords[w.id]) ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              {/* Filters row */}
              <div className="flex gap-2 flex-wrap">
                <select
                  value={setFilter}
                  onChange={(e) => setSetFilter(e.target.value)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600"
                  onClick={(e) => e.stopPropagation()}
                >
                  <option value="all">All cards</option>
                  <option value="in-set">In a set</option>
                  <option value="not-in-set">Not in a set</option>
                </select>
              </div>

              {/* Language hint */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-2.5 text-xs text-blue-700">
                <strong>Tap the language badge</strong> to cycle: <span className="font-semibold">EN</span> → <span className="font-semibold">CN</span> → <span className="font-semibold">Both</span>. Tap category to change it.
              </div>

              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                {filteredDetectedWords.map(word => {
                  const lang = cardLanguage[word.id] || 'chinese';
                  const wordSetName = getWordSetName(word);
                  const wordCat = wordCategories[word.id] || word.category || 'default';
                  const hasChinese = !!word.chinese?.trim();
                  return (
                    <motion.div
                      key={word.id}
                      layout
                      className={`p-3 rounded-xl border transition-all ${
                        selectedWords[word.id]
                          ? 'border-[hsl(var(--sprouttie-green)/0.4)] bg-[hsl(var(--sprouttie-green)/0.05)]'
                          : 'border-slate-100 bg-white'
                      } ${word.isDuplicate ? 'opacity-70' : ''}`}
                    >
                      <div className="flex items-center gap-3 cursor-pointer" onClick={() => toggleWord(word.id)}>
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
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-lg font-bold text-[hsl(var(--sprouttie-ink))]">
                              {word.chinese || word.english}
                            </span>
                            {word.originalLanguage === 'english' && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600">
                                {hasChinese ? 'FROM EN' : 'EN ONLY'}
                              </span>
                            )}
                            {word.isDuplicate && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                                EXISTS
                              </span>
                            )}
                            {wordSetName && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700">
                                📦 {wordSetName}
                              </span>
                            )}
                          </div>
                          {hasChinese && (
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <span>{word.pinyin}</span>
                              <span>·</span>
                              <span>{word.english}</span>
                            </div>
                          )}
                        </div>

                        {/* Language toggle badge */}
                        <button
                          onClick={(e) => cycleLanguage(word, e)}
                          disabled={!hasChinese}
                          className={`text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0 transition-colors ${getLangColor(lang)} ${!hasChinese ? 'opacity-60 cursor-default' : ''}`}
                          title={hasChinese ? 'Tap to change: EN / CN / Both' : 'English only, no Chinese translation'}
                        >
                          {getLangLabel(lang)}
                        </button>
                      </div>

                      {/* Category selector row */}
                      <div className="flex items-center gap-2 mt-2 ml-8">
                        <select
                          value={wordCat}
                          onChange={(e) => {
                            e.stopPropagation();
                            setWordCategories(prev => ({ ...prev, [word.id]: e.target.value }));
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="text-[11px] px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 max-w-[160px]"
                        >
                          {categories.map(cat => (
                            <option key={cat.id || cat} value={cat.name || cat}>{cat.name || cat}</option>
                          ))}
                          {!categories.some(c => (c.name || c) === wordCat) && wordCat !== 'default' && (
                            <option value={wordCat}>{wordCat} (new)</option>
                          )}
                        </select>
                      </div>
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
                  className="btn-primary flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[hsl(var(--sprouttie-green))] text-white font-semibold text-sm shadow-sm hover:opacity-90 transition disabled:opacity-50"
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
              onClick={() => navigate('/cards')}
              className="btn-primary flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[hsl(var(--sprouttie-green))] text-white font-semibold text-sm shadow-sm hover:opacity-90 transition"
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
