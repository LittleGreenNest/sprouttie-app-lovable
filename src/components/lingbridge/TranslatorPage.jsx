 import React, { useState } from 'react';
 import { motion, AnimatePresence } from 'framer-motion';
 import { Languages, ArrowRight, Volume2, Plus, Loader2, ChevronDown, BookOpen } from 'lucide-react';
 import { supabase } from '@/integrations/supabase/client';
 import { useAuth } from '../../context/AuthContext';
 import { useFlashcards } from '../../context/FlashcardContext';
 import { toast } from 'react-toastify';
 
 const TranslatorPage = () => {
   const { currentUser } = useAuth();
   const { addFlashcard, categories } = useFlashcards();
   const [inputText, setInputText] = useState('');
   const [sourceLanguage, setSourceLanguage] = useState('english');
   const [translations, setTranslations] = useState([]);
   const [isLoading, setIsLoading] = useState(false);
   const [error, setError] = useState(null);
   const [expandedIndex, setExpandedIndex] = useState(0);
 
   const handleTranslate = async () => {
     if (!inputText.trim()) {
       toast.warning('Please enter text to translate');
       return;
     }
 
     setIsLoading(true);
     setError(null);
     setTranslations([]);
 
     try {
       const response = await fetch(
         `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/translate-hokkien`,
         {
           method: 'POST',
           headers: {
             'Content-Type': 'application/json',
             Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
           },
           body: JSON.stringify({ text: inputText, sourceLanguage }),
         }
       );
 
       if (!response.ok) {
         const errorData = await response.json();
         throw new Error(errorData.error || 'Translation failed');
       }
 
       const data = await response.json();
       setTranslations(data.translations || []);
       setExpandedIndex(0);
     } catch (err) {
       console.error('Translation error:', err);
       setError(err.message);
       toast.error(err.message || 'Translation failed');
     } finally {
       setIsLoading(false);
     }
   };
 
   const handleAddToFlashcards = async (translation) => {
     if (!currentUser) {
       toast.warning('Please log in to add flashcards');
       return;
     }
 
     try {
       // Find or create a Hokkien category
       let hokkienCategory = categories.find(
         (c) => c.name?.toLowerCase().includes('hokkien') || c.id?.toLowerCase().includes('hokkien')
       );
 
       const categoryId = hokkienCategory?.id || 'Hokkien';
 
       await addFlashcard(
         translation.hanzi,
         categoryId,
         translation.english,
         translation.tailo,
         'word',
         null
       );
 
       // Also save to lexicon table for future reference
       await supabase.from('lexicon').insert({
         user_id: currentUser.id,
         hanzi: translation.hanzi,
         tailo: translation.tailo,
         poj: translation.poj,
         english: translation.english,
         language: 'hokkien',
         variant: 'tw',
         tone_pattern: translation.syllables?.map((s) => String(s.tone)) || [],
         source: 'translator',
       });
 
       toast.success(`Added "${translation.hanzi}" to your flashcards!`);
     } catch (err) {
       console.error('Error adding to flashcards:', err);
       toast.error('Failed to add flashcard');
     }
   };
 
   const playAudio = (tailo) => {
     // For now, use browser speech synthesis as placeholder
     // In future, integrate with TTS edge function
     if ('speechSynthesis' in window) {
       const utterance = new SpeechSynthesisUtterance(tailo);
       utterance.lang = 'zh-TW';
       utterance.rate = 0.8;
       speechSynthesis.speak(utterance);
     } else {
       toast.info('Audio playback coming soon!');
     }
   };
 
   return (
     <div className="max-w-4xl mx-auto space-y-6">
       {/* Header */}
       <div className="flex items-center gap-3 mb-6">
         <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
           <Languages className="w-6 h-6 text-primary" />
         </div>
         <div>
           <h1 className="text-2xl font-semibold text-foreground">Hokkien Translator</h1>
           <p className="text-sm text-muted-foreground">
             Translate English or Mandarin to Taiwanese Hokkien
           </p>
         </div>
       </div>
 
       {/* Input Section */}
       <motion.div
         initial={{ opacity: 0, y: 20 }}
         animate={{ opacity: 1, y: 0 }}
         className="bg-card rounded-2xl border border-border p-6 shadow-sm"
       >
         {/* Language Selector */}
         <div className="flex items-center gap-4 mb-4">
           <select
             value={sourceLanguage}
             onChange={(e) => setSourceLanguage(e.target.value)}
             className="px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
           >
             <option value="english">English</option>
             <option value="mandarin">Mandarin (中文)</option>
           </select>
           <ArrowRight className="w-5 h-5 text-muted-foreground" />
           <div className="px-4 py-2 rounded-lg bg-primary/10 text-primary font-medium">
             Hokkien (臺語)
           </div>
         </div>
 
         {/* Input Textarea */}
         <textarea
           value={inputText}
           onChange={(e) => setInputText(e.target.value)}
           placeholder={
             sourceLanguage === 'english'
               ? 'Enter English text to translate...'
               : '輸入中文翻譯...'
           }
           className="w-full h-32 px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground resize-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
           onKeyDown={(e) => {
             if (e.key === 'Enter' && e.ctrlKey) {
               handleTranslate();
             }
           }}
         />
 
         {/* Translate Button */}
         <div className="flex justify-end mt-4">
           <button
             onClick={handleTranslate}
             disabled={isLoading || !inputText.trim()}
             className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 flex items-center gap-2"
           >
             {isLoading ? (
               <>
                 <Loader2 className="w-4 h-4 animate-spin" />
                 Translating...
               </>
             ) : (
               <>
                 <Languages className="w-4 h-4" />
                 Translate
               </>
             )}
           </button>
         </div>
         <p className="text-xs text-muted-foreground mt-2 text-right">
           Press Ctrl+Enter to translate
         </p>
       </motion.div>
 
       {/* Error Display */}
       {error && (
         <motion.div
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive"
         >
           {error}
         </motion.div>
       )}
 
       {/* Results Section */}
       <AnimatePresence mode="wait">
         {translations.length > 0 && (
           <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             exit={{ opacity: 0, y: -20 }}
             className="space-y-4"
           >
             <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
               <BookOpen className="w-5 h-5 text-primary" />
               Translations
             </h2>
 
             {translations.map((translation, index) => (
               <motion.div
                 key={index}
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: index * 0.1 }}
                 className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm"
               >
                 {/* Main Translation Card */}
                 <div
                   className="p-6 cursor-pointer"
                   onClick={() => setExpandedIndex(expandedIndex === index ? -1 : index)}
                 >
                   <div className="flex items-start justify-between gap-4">
                     <div className="flex-1 space-y-2">
                       {/* Hanzi */}
                       <div className="text-3xl font-medium text-foreground">
                         {translation.hanzi}
                       </div>
 
                       {/* Romanizations */}
                       <div className="flex flex-wrap items-center gap-3 text-sm">
                         <span className="px-2 py-1 rounded bg-primary/10 text-primary font-mono">
                           {translation.tailo}
                         </span>
                         {translation.poj && translation.poj !== translation.tailo && (
                           <span className="px-2 py-1 rounded bg-muted text-muted-foreground font-mono">
                             POJ: {translation.poj}
                           </span>
                         )}
                       </div>
 
                       {/* English */}
                       <div className="text-muted-foreground">{translation.english}</div>
                     </div>
 
                     {/* Action Buttons */}
                     <div className="flex flex-col gap-2">
                       <button
                         onClick={(e) => {
                           e.stopPropagation();
                           playAudio(translation.tailo);
                         }}
                         className="p-2.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                         title="Play pronunciation"
                       >
                         <Volume2 className="w-5 h-5" />
                       </button>
                       <button
                         onClick={(e) => {
                           e.stopPropagation();
                           handleAddToFlashcards(translation);
                         }}
                         className="p-2.5 rounded-lg bg-accent/20 text-accent-foreground hover:bg-accent/30 transition-colors"
                         title="Add to flashcards"
                       >
                         <Plus className="w-5 h-5" />
                       </button>
                     </div>
                   </div>
 
                   {/* Expand indicator */}
                   <div className="flex justify-center mt-4">
                     <ChevronDown
                       className={`w-5 h-5 text-muted-foreground transition-transform ${
                         expandedIndex === index ? 'rotate-180' : ''
                       }`}
                     />
                   </div>
                 </div>
 
                 {/* Expanded Details */}
                 <AnimatePresence>
                   {expandedIndex === index && (
                     <motion.div
                       initial={{ height: 0, opacity: 0 }}
                       animate={{ height: 'auto', opacity: 1 }}
                       exit={{ height: 0, opacity: 0 }}
                       className="overflow-hidden"
                     >
                       <div className="px-6 pb-6 pt-2 border-t border-border space-y-4">
                         {/* Syllable Breakdown */}
                         {translation.syllables && translation.syllables.length > 0 && (
                           <div>
                             <h4 className="text-sm font-medium text-foreground mb-2">
                               Syllable Breakdown
                             </h4>
                             <div className="flex flex-wrap gap-2">
                               {translation.syllables.map((syllable, sIdx) => (
                                 <div
                                   key={sIdx}
                                   className="px-3 py-2 rounded-lg bg-muted text-center"
                                 >
                                   <div className="text-lg font-medium">{syllable.hanzi}</div>
                                   <div className="text-xs text-primary font-mono">
                                     {syllable.tailo}
                                   </div>
                                   <div className="text-xs text-muted-foreground">
                                     Tone {syllable.tone}
                                   </div>
                                 </div>
                               ))}
                             </div>
                           </div>
                         )}
 
                         {/* Literal Translation */}
                         {translation.literal && translation.literal !== translation.english && (
                           <div>
                             <h4 className="text-sm font-medium text-foreground mb-1">
                               Literal Meaning
                             </h4>
                             <p className="text-sm text-muted-foreground">{translation.literal}</p>
                           </div>
                         )}
 
                         {/* Notes */}
                         {translation.notes && (
                           <div>
                             <h4 className="text-sm font-medium text-foreground mb-1">Notes</h4>
                             <p className="text-sm text-muted-foreground">{translation.notes}</p>
                           </div>
                         )}
                       </div>
                     </motion.div>
                   )}
                 </AnimatePresence>
               </motion.div>
             ))}
           </motion.div>
         )}
       </AnimatePresence>
 
       {/* Empty State */}
       {!isLoading && translations.length === 0 && !error && (
         <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           className="text-center py-12 text-muted-foreground"
         >
           <Languages className="w-12 h-12 mx-auto mb-4 opacity-30" />
           <p>Enter text above to translate to Hokkien</p>
           <p className="text-sm mt-1">
             Results will include characters, romanization, and pronunciation
           </p>
         </motion.div>
       )}
     </div>
   );
 };
 
 export default TranslatorPage;