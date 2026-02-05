 // Export utility for flashcards data
 
 /**
  * Export flashcards data to JSON format for import into another Sprouttie app
  * @param {Array} flashcards - Array of flashcard objects
  * @param {Array} categories - Array of category objects
  * @returns {Object} - Export data object
  */
 export const generateExportData = (flashcards, categories) => {
   const exportData = {
     version: '1.0',
     exportedAt: new Date().toISOString(),
     appName: 'Sprouttie',
     data: {
       categories: categories.map(cat => ({
         id: cat.id,
         name: cat.name || cat.id,
       })),
       flashcards: flashcards.map(card => ({
         word: card.word || card.front || card.label,
         english: card.english || card.back || card.title || '',
         category: card.categoryId || card.folder || 'Uncategorized',
         card_type: card.card_type || 'word',
         phrase_group: card.phrase_group || null,
         card_status: card.card_status || 'waiting',
         mastery_level: card.mastery_level || 0,
         active_day_count: card.active_day_count || 0,
         date_introduced: card.date_introduced || null,
         date_retired: card.date_retired || null,
         set_number: card.set_number || null,
       })),
     },
     summary: {
       totalCategories: categories.length,
       totalFlashcards: flashcards.length,
       totalPhrases: flashcards.filter(c => c.card_type === 'phrase').length,
       totalWords: flashcards.filter(c => c.card_type !== 'phrase').length,
     }
   };
   
   return exportData;
 };
 
 /**
  * Download export data as a JSON file
  * @param {Object} exportData - The data to export
  * @param {string} filename - Optional custom filename
  */
 export const downloadExportFile = (exportData, filename = null) => {
   const date = new Date().toISOString().split('T')[0];
   const defaultFilename = `sprouttie-export-${date}.json`;
   
   const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
     type: 'application/json' 
   });
   
   const url = URL.createObjectURL(blob);
   const link = document.createElement('a');
   link.href = url;
   link.download = filename || defaultFilename;
   document.body.appendChild(link);
   link.click();
   document.body.removeChild(link);
   URL.revokeObjectURL(url);
 };
 
 /**
  * Export flashcards to CSV format
  * @param {Array} flashcards - Array of flashcard objects  
  * @returns {string} - CSV content
  */
 export const generateCSVExport = (flashcards) => {
   const headers = ['Word', 'English', 'Category', 'Type', 'Phrase Group', 'Status', 'Set'];
   const rows = flashcards.map(card => [
     card.word || card.front || card.label || '',
     card.english || card.back || card.title || '',
     card.categoryId || card.folder || 'Uncategorized',
     card.card_type || 'word',
     card.phrase_group || '',
     card.card_status || 'waiting',
     card.set_number || '',
   ]);
   
   const csvContent = [
     headers.join(','),
     ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
   ].join('\n');
   
   return csvContent;
 };
 
 /**
  * Download CSV export
  * @param {string} csvContent - CSV content string
  * @param {string} filename - Optional custom filename
  */
 export const downloadCSVFile = (csvContent, filename = null) => {
   const date = new Date().toISOString().split('T')[0];
   const defaultFilename = `sprouttie-export-${date}.csv`;
   
   const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
   const url = URL.createObjectURL(blob);
   const link = document.createElement('a');
   link.href = url;
   link.download = filename || defaultFilename;
   document.body.appendChild(link);
   link.click();
   document.body.removeChild(link);
   URL.revokeObjectURL(url);
 };