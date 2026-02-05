 import React, { useState, useRef } from 'react';
 import { motion, AnimatePresence } from 'framer-motion';
 import { Upload, X, FileSpreadsheet, Check, AlertCircle, Download } from 'lucide-react';
 import Papa from 'papaparse';
 import { supabase } from '@/integrations/supabase/client';
 import { useAuth } from '../../context/AuthContext';
 import { logActivity, ACTIVITY_TYPES } from '../../utils/activityLogger';
 
 const CSVImport = ({ isOpen, onClose, onImportComplete }) => {
   const { currentUser } = useAuth();
   const fileInputRef = useRef(null);
   const [file, setFile] = useState(null);
   const [parsedData, setParsedData] = useState(null);
   const [importing, setImporting] = useState(false);
   const [importResults, setImportResults] = useState(null);
   const [error, setError] = useState(null);
   const [duplicateHandling, setDuplicateHandling] = useState('skip');
  const [parsing, setParsing] = useState(false);
 
   const handleFileSelect = (e) => {
     const selectedFile = e.target.files[0];
     if (!selectedFile) return;
 
     const validExtensions = ['.csv', '.xlsx', '.xls'];
     const fileExt = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();
     
     if (!validExtensions.includes(fileExt)) {
       setError('Please select a CSV or Excel file');
       return;
     }
 
     setFile(selectedFile);
     setError(null);
     setImportResults(null);
     setParsedData(null);
    setParsing(true);
 
     // Parse CSV
     Papa.parse(selectedFile, {
       header: true,
       skipEmptyLines: true,
       complete: (results) => {
        setParsing(false);
         if (results.errors.length > 0) {
           setError('Error parsing file: ' + results.errors[0].message);
           return;
         }
 
         // Normalize column names (case-insensitive matching)
         const normalizedData = results.data.map(row => {
           const normalized = {};
           Object.keys(row).forEach(key => {
             const lowerKey = key.toLowerCase().trim();
             // Map various column names to standard fields
             if (['word', 'chinese', 'hanzi', 'front', 'text', '中文', '词'].includes(lowerKey)) {
               normalized.word = row[key]?.trim() || '';
             } else if (['english', 'meaning', 'translation', 'back', '英文', '意思'].includes(lowerKey)) {
               normalized.english = row[key]?.trim() || '';
             } else if (['category', 'folder', 'group', 'type', '类别', '分类'].includes(lowerKey)) {
               normalized.category = row[key]?.trim() || 'Imported';
             } else if (['card_type', 'cardtype', 'word_type'].includes(lowerKey)) {
               normalized.card_type = row[key]?.trim() || 'word';
             } else if (['phrase_group', 'phrasegroup'].includes(lowerKey)) {
               normalized.phrase_group = row[key]?.trim() || null;
             } else if (['status', 'card_status'].includes(lowerKey)) {
               normalized.card_status = row[key]?.trim() || 'waiting';
             } else if (['set', 'set_number'].includes(lowerKey)) {
               const setNum = parseInt(row[key]);
               normalized.set_number = isNaN(setNum) ? null : setNum;
             }
           });
           
           // Set defaults
           if (!normalized.category) normalized.category = 'Imported';
           if (!normalized.card_type) normalized.card_type = 'word';
           if (!normalized.card_status) normalized.card_status = 'waiting';
           
           return normalized;
         }).filter(row => row.word && row.word.trim() !== '');
 
         if (normalizedData.length === 0) {
           setError('No valid data found. Make sure your file has a "Word" column.');
           return;
         }
 
         setParsedData(normalizedData);
       },
       error: (err) => {
        setParsing(false);
         setError('Failed to parse file: ' + err.message);
       }
     });
   };
 
   const handleImport = async () => {
     if (!parsedData || !currentUser) return;
 
     setImporting(true);
     setError(null);
 
     try {
       const { data: existingCards, error: fetchError } = await supabase
         .from('flashcards')
         .select('front, folder')
         .eq('user_id', currentUser.id);
 
       if (fetchError) throw fetchError;
 
       const existingSet = new Set(
         existingCards.map(c => `${c.front}::${c.folder}`.toLowerCase())
       );
 
       const results = {
         total: parsedData.length,
         imported: 0,
         skipped: 0,
         replaced: 0,
         errors: 0,
       };
 
       const flashcardsToInsert = [];
 
       for (const card of parsedData) {
         const word = card.word || '';
         const category = card.category || 'Imported';
         const key = `${word}::${category}`.toLowerCase();
 
         if (existingSet.has(key)) {
           if (duplicateHandling === 'skip') {
             results.skipped++;
             continue;
           } else if (duplicateHandling === 'replace') {
             await supabase
               .from('flashcards')
               .delete()
               .eq('user_id', currentUser.id)
               .ilike('front', word)
               .ilike('folder', category);
             results.replaced++;
           }
         }
 
         flashcardsToInsert.push({
           user_id: currentUser.id,
           front: word,
           back: card.english || '',
           folder: category,
           card_type: card.card_type || 'word',
           phrase_group: card.phrase_group || null,
           card_status: card.card_status || 'waiting',
           mastery_level: 0,
           active_day_count: 0,
           set_number: card.set_number || null,
         });
       }
 
       // Batch insert
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
 
       await logActivity(ACTIVITY_TYPES.CSV_IMPORT, `Imported ${results.imported} flashcards from CSV`, {
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
 
   const downloadTemplate = () => {
     const template = 'Word,English,Category,Type,Status,Set\n妈妈,Mom,Family,word,waiting,1\n爸爸,Dad,Family,word,waiting,1\n我爱你,I love you,Phrases,phrase,waiting,';
     const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
     const url = URL.createObjectURL(blob);
     const link = document.createElement('a');
     link.href = url;
     link.download = 'sprouttie-template.csv';
     document.body.appendChild(link);
     link.click();
     document.body.removeChild(link);
     URL.revokeObjectURL(url);
   };
 
   const resetState = () => {
     setFile(null);
     setParsedData(null);
     setImportResults(null);
     setError(null);
    setParsing(false);
   };
 
   const handleClose = () => {
     resetState();
     onClose();
   };
 
   const categories = parsedData ? [...new Set(parsedData.map(c => c.category))] : [];
 
   return (
    <AnimatePresence mode="wait">
      {isOpen && (
       <motion.div
         initial={{ opacity: 0 }}
         animate={{ opacity: 1 }}
         exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4"
         onClick={(e) => e.target === e.currentTarget && handleClose()}
       >
         <motion.div
           initial={{ scale: 0.9, opacity: 0 }}
           animate={{ scale: 1, opacity: 1 }}
           exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto relative"
         >
           {/* Header */}
           <div className="flex items-center justify-between mb-6">
             <div className="flex items-center gap-3">
               <div className="p-2 bg-emerald-100 rounded-xl">
                 <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
               </div>
               <div>
                 <h2 className="text-xl font-bold text-slate-800">Import Flashcards</h2>
                 <p className="text-sm text-slate-500">From CSV or Excel file</p>
               </div>
             </div>
             <button
               onClick={handleClose}
               className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
             >
               <X className="w-5 h-5 text-slate-500" />
             </button>
           </div>
 
           {/* Template Download */}
           <button
             onClick={downloadTemplate}
             className="w-full mb-4 px-4 py-3 border border-dashed border-slate-300 rounded-xl text-sm text-slate-600 hover:bg-slate-50 hover:border-emerald-400 transition-all flex items-center justify-center gap-2"
           >
             <Download className="w-4 h-4" />
             Download template CSV
           </button>
 
           {/* Error Message */}
           {error && (
             <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
               <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
               <div className="text-sm text-red-700">
                 <p>{error}</p>
                 <p className="mt-2 text-xs">Required column: <strong>Word</strong>. Optional: English, Category, Type, Status, Set</p>
               </div>
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
                 {importResults.skipped > 0 && <li>⏭ {importResults.skipped} duplicates skipped</li>}
                 {importResults.replaced > 0 && <li>🔄 {importResults.replaced} duplicates replaced</li>}
                 {importResults.errors > 0 && <li className="text-red-600">⚠ {importResults.errors} errors</li>}
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
                   accept=".csv,.xlsx,.xls"
                   onChange={handleFileSelect}
                   className="hidden"
                 />
                 <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                {parsing ? (
                  <div className="flex flex-col items-center">
                    <div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mb-2" />
                    <p className="text-sm text-slate-600">Parsing file...</p>
                  </div>
                ) : file ? (
                   <p className="text-sm font-medium text-emerald-600">{file.name}</p>
                 ) : (
                   <>
                     <p className="text-sm font-medium text-slate-700">Click to select your file</p>
                     <p className="text-xs text-slate-500 mt-1">CSV or Excel format</p>
                   </>
                 )}
               </div>
 
               {/* Preview */}
               {parsedData && (
                 <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                   <h3 className="font-semibold text-slate-800 mb-2">Preview</h3>
                   <div className="grid grid-cols-2 gap-2 text-sm">
                     <div className="p-2 bg-white rounded-lg">
                       <span className="text-slate-500">Total:</span>
                       <span className="ml-2 font-medium text-slate-800">{parsedData.length}</span>
                     </div>
                     <div className="p-2 bg-white rounded-lg">
                       <span className="text-slate-500">Categories:</span>
                       <span className="ml-2 font-medium text-slate-800">{categories.length}</span>
                     </div>
                   </div>
                   
                   <div className="mt-3 pt-3 border-t border-slate-200">
                     <p className="text-xs text-slate-500 mb-2">Sample entries:</p>
                     <div className="flex flex-wrap gap-1">
                       {parsedData.slice(0, 8).map((card, idx) => (
                         <span key={idx} className="text-xs px-2 py-1 bg-white border border-slate-200 rounded-md">
                           {card.word}
                         </span>
                       ))}
                       {parsedData.length > 8 && (
                         <span className="text-xs px-2 py-1 text-slate-500">+{parsedData.length - 8} more</span>
                       )}
                     </div>
                   </div>
                 </div>
               )}
 
               {/* Duplicate Handling */}
               {parsedData && (
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
               {parsedData && (
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
                         Import {parsedData.length} Flashcards
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
      )}
     </AnimatePresence>
   );
 };
 
 export default CSVImport;