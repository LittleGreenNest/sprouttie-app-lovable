 import React, { useState, useRef } from 'react';
 import { motion, AnimatePresence } from 'framer-motion';
 import { Upload, X, FileJson, Check, AlertCircle } from 'lucide-react';
 import { supabase } from '@/integrations/supabase/client';
 import { useAuth } from '../../context/AuthContext';
 import { logActivity, ACTIVITY_TYPES } from '../../utils/activityLogger';
 
 const JSONImport = ({ isOpen, onClose, onImportComplete }) => {
   const { currentUser } = useAuth();
   const fileInputRef = useRef(null);
   const [file, setFile] = useState(null);
   const [importData, setImportData] = useState(null);
   const [importing, setImporting] = useState(false);
   const [importResults, setImportResults] = useState(null);
   const [error, setError] = useState(null);
   const [duplicateHandling, setDuplicateHandling] = useState('skip'); // 'skip' | 'replace' | 'keep_both'
 
   const handleFileSelect = (e) => {
     const selectedFile = e.target.files[0];
     if (!selectedFile) return;
 
     if (!selectedFile.name.endsWith('.json')) {
       setError('Please select a JSON file');
       return;
     }
 
     setFile(selectedFile);
     setError(null);
     setImportResults(null);
 
     const reader = new FileReader();
     reader.onload = (event) => {
       try {
         const data = JSON.parse(event.target.result);
         
         // Validate the export format
         if (!data.appName || data.appName !== 'Sprouttie') {
           setError('This file does not appear to be a Sprouttie export');
           return;
         }
         
         if (!data.data || !data.data.flashcards) {
           setError('Invalid export format: missing flashcard data');
           return;
         }
 
         setImportData(data);
       } catch (err) {
         setError('Failed to parse JSON file: ' + err.message);
       }
     };
     reader.readAsText(selectedFile);
   };
 
   const handleImport = async () => {
     if (!importData || !currentUser) return;
 
     setImporting(true);
     setError(null);
 
     try {
       // Fetch existing flashcards to check for duplicates
       const { data: existingCards, error: fetchError } = await supabase
         .from('flashcards')
         .select('front, folder')
         .eq('user_id', currentUser.id);
 
       if (fetchError) throw fetchError;
 
       const existingSet = new Set(
         existingCards.map(c => `${c.front}::${c.folder}`.toLowerCase())
       );
 
       const results = {
         total: importData.data.flashcards.length,
         imported: 0,
         skipped: 0,
         replaced: 0,
         errors: 0,
       };
 
       const flashcardsToInsert = [];
 
       for (const card of importData.data.flashcards) {
         const word = card.word || '';
         const category = card.category || 'Imported';
         const key = `${word}::${category}`.toLowerCase();
 
         if (existingSet.has(key)) {
           if (duplicateHandling === 'skip') {
             results.skipped++;
             continue;
           } else if (duplicateHandling === 'replace') {
             // Delete existing and add new
             await supabase
               .from('flashcards')
               .delete()
               .eq('user_id', currentUser.id)
               .ilike('front', word)
               .ilike('folder', category);
             results.replaced++;
           }
           // 'keep_both' falls through to insert
         }
 
         flashcardsToInsert.push({
           user_id: currentUser.id,
           front: word,
           back: card.english || '',
           folder: category,
           card_type: card.card_type || 'word',
           phrase_group: card.phrase_group || null,
           card_status: card.card_status || 'waiting',
           mastery_level: card.mastery_level || 0,
           active_day_count: card.active_day_count || 0,
           set_number: card.set_number || null,
           date_introduced: card.date_introduced || null,
           date_retired: card.date_retired || null,
         });
       }
 
       // Batch insert in chunks of 100
       const chunkSize = 100;
       for (let i = 0; i < flashcardsToInsert.length; i += chunkSize) {
         const chunk = flashcardsToInsert.slice(i, i + chunkSize);
         const { error: insertError } = await supabase
           .from('flashcards')
           .insert(chunk);
 
         if (insertError) {
           console.error('Insert error:', insertError);
           results.errors += chunk.length;
         } else {
           results.imported += chunk.length;
         }
       }
 
       // Log the import activity
       await logActivity(ACTIVITY_TYPES.CSV_IMPORT, `Imported ${results.imported} flashcards from JSON`, {
         total: results.total,
         imported: results.imported,
         skipped: results.skipped,
         replaced: results.replaced,
       });
 
       setImportResults(results);
 
       if (onImportComplete) {
         onImportComplete();
       }
     } catch (err) {
       console.error('Import error:', err);
       setError('Failed to import: ' + err.message);
     } finally {
       setImporting(false);
     }
   };
 
   const resetState = () => {
     setFile(null);
     setImportData(null);
     setImportResults(null);
     setError(null);
   };
 
   const handleClose = () => {
     resetState();
     onClose();
   };
 
   if (!isOpen) return null;
 
   return (
     <AnimatePresence>
       <motion.div
         initial={{ opacity: 0 }}
         animate={{ opacity: 1 }}
         exit={{ opacity: 0 }}
         className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
         onClick={(e) => e.target === e.currentTarget && handleClose()}
       >
         <motion.div
           initial={{ scale: 0.9, opacity: 0 }}
           animate={{ scale: 1, opacity: 1 }}
           exit={{ scale: 0.9, opacity: 0 }}
           className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto"
         >
           {/* Header */}
           <div className="flex items-center justify-between mb-6">
             <div className="flex items-center gap-3">
               <div className="p-2 bg-emerald-100 rounded-xl">
                 <FileJson className="w-6 h-6 text-emerald-600" />
               </div>
               <div>
                 <h2 className="text-xl font-bold text-slate-800">Import Flashcards</h2>
                 <p className="text-sm text-slate-500">From Sprouttie JSON export</p>
               </div>
             </div>
             <button
               onClick={handleClose}
               className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
             >
               <X className="w-5 h-5 text-slate-500" />
             </button>
           </div>
 
           {/* Error Message */}
           {error && (
             <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
               <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
               <p className="text-sm text-red-700">{error}</p>
             </div>
           )}
 
           {/* Import Success */}
           {importResults && (
             <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
               <div className="flex items-center gap-2 mb-3">
                 <Check className="w-5 h-5 text-emerald-600" />
                 <h3 className="font-semibold text-emerald-800">Import Complete!</h3>
               </div>
               <ul className="text-sm text-emerald-700 space-y-1">
                 <li>✓ {importResults.imported} flashcards imported</li>
                 {importResults.skipped > 0 && (
                   <li>⏭ {importResults.skipped} duplicates skipped</li>
                 )}
                 {importResults.replaced > 0 && (
                   <li>🔄 {importResults.replaced} duplicates replaced</li>
                 )}
                 {importResults.errors > 0 && (
                   <li className="text-red-600">⚠ {importResults.errors} errors</li>
                 )}
               </ul>
               <button
                 onClick={handleClose}
                 className="mt-4 w-full px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium"
               >
                 Done
               </button>
             </div>
           )}
 
           {/* File Upload Area */}
           {!importResults && (
             <>
               <div
                 onClick={() => fileInputRef.current?.click()}
                 className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/50 transition-all"
               >
                 <input
                   ref={fileInputRef}
                   type="file"
                   accept=".json"
                   onChange={handleFileSelect}
                   className="hidden"
                 />
                 <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                 {file ? (
                   <p className="text-sm font-medium text-emerald-600">{file.name}</p>
                 ) : (
                   <>
                     <p className="text-sm font-medium text-slate-700">
                       Click to select a Sprouttie export file
                     </p>
                     <p className="text-xs text-slate-500 mt-1">JSON format only</p>
                   </>
                 )}
               </div>
 
               {/* Preview */}
               {importData && (
                 <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                   <h3 className="font-semibold text-slate-800 mb-2">Preview</h3>
                   <div className="grid grid-cols-2 gap-2 text-sm">
                     <div className="p-2 bg-white rounded-lg">
                       <span className="text-slate-500">Categories:</span>
                       <span className="ml-2 font-medium text-slate-800">
                         {importData.summary?.totalCategories || importData.data.categories?.length || 0}
                       </span>
                     </div>
                     <div className="p-2 bg-white rounded-lg">
                       <span className="text-slate-500">Flashcards:</span>
                       <span className="ml-2 font-medium text-slate-800">
                         {importData.summary?.totalFlashcards || importData.data.flashcards?.length || 0}
                       </span>
                     </div>
                     <div className="p-2 bg-white rounded-lg">
                       <span className="text-slate-500">Words:</span>
                       <span className="ml-2 font-medium text-slate-800">
                         {importData.summary?.totalWords || 0}
                       </span>
                     </div>
                     <div className="p-2 bg-white rounded-lg">
                       <span className="text-slate-500">Phrases:</span>
                       <span className="ml-2 font-medium text-slate-800">
                         {importData.summary?.totalPhrases || 0}
                       </span>
                     </div>
                   </div>
                   <p className="text-xs text-slate-500 mt-2">
                     Exported: {new Date(importData.exportedAt).toLocaleDateString()}
                   </p>
                 </div>
               )}
 
               {/* Duplicate Handling */}
               {importData && (
                 <div className="mt-4">
                   <label className="block text-sm font-medium text-slate-700 mb-2">
                     If duplicates are found:
                   </label>
                   <select
                     value={duplicateHandling}
                     onChange={(e) => setDuplicateHandling(e.target.value)}
                     className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                   >
                     <option value="skip">Skip duplicates</option>
                     <option value="replace">Replace existing</option>
                     <option value="keep_both">Keep both</option>
                   </select>
                 </div>
               )}
 
               {/* Actions */}
               {importData && (
                 <div className="mt-6 flex gap-3">
                   <button
                     onClick={handleImport}
                     disabled={importing}
                     className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors font-medium flex items-center justify-center gap-2"
                   >
                     {importing ? (
                       <>
                         <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                         Importing...
                       </>
                     ) : (
                       <>
                         <Upload className="w-4 h-4" />
                         Import {importData.data.flashcards?.length || 0} Flashcards
                       </>
                     )}
                   </button>
                   <button
                     onClick={resetState}
                     disabled={importing}
                     className="px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium"
                   >
                     Cancel
                   </button>
                 </div>
               )}
             </>
           )}
         </motion.div>
       </motion.div>
     </AnimatePresence>
   );
 };
 
 export default JSONImport;