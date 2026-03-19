// components/PrintFlashcards.js
import React, { useState, useEffect } from 'react';
import { useFlashcards } from '../context/FlashcardContext';
import { jsPDF } from 'jspdf';
import { usePlanAccess, UpgradePrompt } from '../hooks/usePlanAccess';
import { supabase } from '@/integrations/supabase/client';

// CJK range + Latin Extended/combining marks (covers ā á ǎ à, etc.)
const needsNotoCJK = (s='') => /[\u4E00-\u9FFF]/.test(s);
const needsLatinDiacritics = (s='') => /[\u0100-\u036F]/.test(s);

// CJK + Latin-diacritics auto font switch
const setAutoFont = (doc, s, weight = 'normal') => {
  if (needsNotoCJK(s) && doc.getFontList()?.['NotoSansSC-Regular']) {
    // Always use normal for Noto SC; no bold variant registered
    doc.setFont('NotoSansSC-Regular', 'normal');
  } else if (needsLatinDiacritics(s) && doc.getFontList()?.['NotoSans-Regular']) {
    // Always use normal for Noto Latin; tone marks render correctly
    doc.setFont('NotoSans-Regular', 'normal');
  } else {
    // ASCII: Helvetica can use the requested weight
    doc.setFont('helvetica', weight);
  }
};

function ab2b64(buf) {
  let binary = '';
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

// cache the font across re-renders
let NOTO_SC_B64 = null;     // Noto Sans SC – for Chinese
let NOTO_LAT_B64 = null;    // Noto Sans – for pinyin with tone marks


const FREE_MONTHLY_PRINT_LIMIT = 3;

function PrintFlashcards({ onClose }) {
const { 
categories,
flashcards,
sets,
getFlashcardsForSet
} = useFlashcards();

  const { hasFeature, userPlan, loading: planLoading } = usePlanAccess();

  // State for selection
  const [selectedFlashcards, setSelectedFlashcards] = useState([]);
  const [selectedSets, setSelectedSets] = useState([]);
  const [selectionMode, setSelectionMode] = useState('manual-flashcards');
  const [previewFlashcards, setPreviewFlashcards] = useState([]);
  const [message, setMessage] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // Free print tracking
  const [freePrintsUsed, setFreePrintsUsed] = useState(0);
  const [freePrintsLoading, setFreePrintsLoading] = useState(true);

// NEW: back-side printing & preview toggle
const [includeBack, setIncludeBack] = useState(false);   // whether to add back pages
const [previewSide, setPreviewSide] = useState('front'); // 'front' | 'back'
  
  // State for preview pages - organized how they'll appear on A4 pages
  const [previewPages, setPreviewPages] = useState([]);

// load CJK font for jsPDF
const [fontReady, setFontReady] = useState(false);

useEffect(() => {
  let cancelled = false;
  (async () => {
    try {
      if (!NOTO_SC_B64) {
        const res = await fetch('/fonts/NotoSansSC-Regular.ttf');
        const buf = await res.arrayBuffer();
        NOTO_SC_B64 = ab2b64(buf);
      }
      if (!NOTO_LAT_B64) {
        const res2 = await fetch('/fonts/NotoSans-Regular.ttf');
        const buf2 = await res2.arrayBuffer();
        NOTO_LAT_B64 = ab2b64(buf2);
      }
      if (!cancelled) setFontReady(true);
    } catch (e) {
      console.error('Font loading error:', e);
      if (!cancelled) setFontReady(true);
    }
  })();
  return () => { cancelled = true; };
}, []);

// Load free print usage for current month
useEffect(() => {
  const loadFreePrintCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setFreePrintsLoading(false);
        return;
      }
      
      // Get first day of current month
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      
      const { data, error } = await supabase
        .from('activity_logs')
        .select('id')
        .eq('user_id', user.id)
        .eq('activity_type', 'print_flashcards')
        .gte('created_at', monthStart);
      
      if (!error) {
        setFreePrintsUsed(data?.length || 0);
      }
    } catch (err) {
      console.error('Error loading print count:', err);
    } finally {
      setFreePrintsLoading(false);
    }
  };
  
  loadFreePrintCount();
}, []);

  // Effect to clear selections when changing selection mode
  useEffect(() => {
    // Clear selections when changing modes
    setSelectedFlashcards([]);
    setSelectedSets([]);
    setPreviewFlashcards([]);
    setPreviewPages([]);
  }, [selectionMode]);

  // Get flashcards based on selected category
  const getFilteredFlashcards = () => {
    if (selectedCategory === 'all') {
      return flashcards;
    } else {
      return flashcards.filter(card => card.categoryId === selectedCategory);
    }
  };

  // Toggle flashcard selection
  const toggleFlashcardSelection = (flashcardId) => {
    setSelectedFlashcards(prevSelected => {
      if (prevSelected.includes(flashcardId)) {
        return prevSelected.filter(id => id !== flashcardId);
      } else {
        return [...prevSelected, flashcardId];
      }
    });
  };

  // Toggle set selection
  const toggleSetSelection = (setId) => {
    setSelectedSets(prevSelected => {
      const newSelection = prevSelected.includes(setId)
        ? prevSelected.filter(id => id !== setId)
        : [...prevSelected, setId];
      
      // Update selected flashcards based on selected sets
      const setFlashcards = [];
      newSelection.forEach(selectedSetId => {
        const set = sets.find(s => s.id === selectedSetId);
        if (set) {
          setFlashcards.push(...set.flashcardIds);
        }
      });
      
      setSelectedFlashcards([...new Set(setFlashcards)]); // Remove duplicates
      
      return newSelection;
    });
  };

  // Clear selections
  const clearSelections = () => {
    setSelectedFlashcards([]);
    setSelectedSets([]);
    setPreviewFlashcards([]);
    setPreviewPages([]);
  };

  // Calculate font size for a word that guarantees it fits within the page
  const calculateSafeFontSize = (word, doc, maxWidth) => {
    // Start with ideal 250pt size for all words (Sprouttie recommends maximum size)
    let fontSize = 250;
    
    // Set font size and measure
    doc.setFontSize(fontSize);
    let textWidth = doc.getStringUnitWidth(word) * fontSize / doc.internal.scaleFactor;
    
    // If already too big, reduce
    if (textWidth > maxWidth) {
      // Calculate precise reduction needed
      fontSize = Math.floor((maxWidth / textWidth) * fontSize);
      doc.setFontSize(fontSize);
      textWidth = doc.getStringUnitWidth(word) * fontSize / doc.internal.scaleFactor;
      
      // Fine-tune by single points if needed
      while (textWidth > maxWidth && fontSize > 40) {
        fontSize -= 1;
        doc.setFontSize(fontSize);
        textWidth = doc.getStringUnitWidth(word) * fontSize / doc.internal.scaleFactor;
      }
    }
    
    // Apply minimal safety margins only when necessary
    // Short words (3 letters or less) - keep at max size whenever possible
    if (word.length > 3 && word.length <= 6) {
      // Medium words
      fontSize = Math.floor(fontSize * 0.995);
    } else if (word.length > 6) {
      // Longer words 
      fontSize = Math.floor(fontSize * 0.99);
    }
    
    return fontSize;
  };

  
const generatePreview = () => {
  // Create temp document for measuring
  const tempDoc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  
  // Register fonts
  if (NOTO_SC_B64) {
    tempDoc.addFileToVFS('NotoSansSC-Regular.ttf', NOTO_SC_B64);
    tempDoc.addFont('NotoSansSC-Regular.ttf', 'NotoSansSC-Regular', 'normal');
  }
  if (NOTO_LAT_B64) {
    tempDoc.addFileToVFS('NotoSans-Regular.ttf', NOTO_LAT_B64);
    tempDoc.addFont('NotoSans-Regular.ttf', 'NotoSans-Regular', 'normal');
  }
  
  tempDoc.setFontSize(250);
  
  const pageWidth = tempDoc.internal.pageSize.getWidth();
  const marginSize = 8;
  const maxWidth = pageWidth - marginSize * 2;

  // Map flashcards with calculated font sizes
  const flashcardsToPreview = selectedFlashcards.map(id => {
    const flashcard = flashcards.find(card => card.id === id);
    if (!flashcard) return null;

    const category = categories.find(cat => cat.id === flashcard.categoryId);
    const word = flashcard.word;
    
    const text = (word ?? '').toString();
    setAutoFont(tempDoc, text, 'bold');
    const fontSize = calculateSafeFontSize(text, tempDoc, maxWidth);
    return { ...flashcard, categoryName: category ? category.name : 'Unknown', fontSize };
  }).filter(Boolean);

  setPreviewFlashcards(flashcardsToPreview);

  // Paginate (2 cards per page)
  const pages = [];
  for (let i = 0; i < flashcardsToPreview.length; i += 2) {
    const page = [flashcardsToPreview[i]];
    if (i + 1 < flashcardsToPreview.length) page.push(flashcardsToPreview[i + 1]);
    pages.push(page);
  }
  setPreviewPages(pages);
};

   
    

  // Generate and download PDF
  const generatePDF = () => {
    if (previewFlashcards.length === 0) {
      setMessage('Please generate a preview first.');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    try {
      // Create new PDF document in landscape orientation
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      // Register fonts
      if (NOTO_SC_B64) {
        doc.addFileToVFS('NotoSansSC-Regular.ttf', NOTO_SC_B64);
        doc.addFont('NotoSansSC-Regular.ttf', 'NotoSansSC-Regular', 'normal');
      }
      if (NOTO_LAT_B64) {
        doc.addFileToVFS('NotoSans-Regular.ttf', NOTO_LAT_B64);
        doc.addFont('NotoSans-Regular.ttf', 'NotoSans-Regular', 'normal');
      }
      
      doc.setFontSize(250);

      const pageWidth = doc.internal.pageSize.getWidth();    // A4 landscape width (297mm)
      const pageHeight = doc.internal.pageSize.getHeight();  // A4 landscape height (210mm)
      
      // Use 8mm margins as requested
      const marginSize = 8; // 8mm on each side
      const maxWidth = pageWidth - (marginSize * 2);
      
      // Create flashcards for front side (2 per page)
      previewPages.forEach((page, pageIndex) => {
        // Create a new page for every page after the first
        if (pageIndex > 0) {
          doc.addPage();
        }
        
        // Process each flashcard on the page (1 or 2)
        page.forEach((flashcard, cardIndex) => {
          // Calculate position based on which card on the page (top or bottom)
          // Ensure each word is exactly in the vertical center of its half
          // Updated: Use precise vertical center points
          const yPosition = cardIndex === 0 
            ? pageHeight / 4     // Exact center of top half
            : (pageHeight * 3) / 4;  // Exact center of bottom half
          
          // Set text properties
          doc.setTextColor(255, 0, 0); // Bright red color (Sprouttie style - #FF0000)
          
          // Get the word and render it
          const text = (flashcard.word ?? '').toString();
          setAutoFont(doc, text, 'bold');
          doc.setFontSize(flashcard.fontSize);
          doc.text(text, pageWidth / 2, yPosition, { align: 'center', baseline: 'middle' });

          
          // Add a dividing line between cards (except for single-card pages)
          if (cardIndex === 0 && page.length > 1) {
            doc.setDrawColor(0);
            doc.setLineWidth(0.1);
            doc.line(0, pageHeight / 2, pageWidth, pageHeight / 2);
          }
        });
      });
      
      // Save the PDF
      // === BACK PAGES (only if includeBack) ===
      if (includeBack) {
        previewPages.forEach((page) => {
          doc.addPage(); // back side for this corresponding front page

          page.forEach((flashcard, cardIndex) => {
            const baseY = cardIndex === 0 ? 20 : (pageHeight / 2 + 20);
const xRight = pageWidth - 20;

            const cn = (flashcard.word ?? '').toString().trim();
            const en = (flashcard.english ?? '').toString().trim();
            const py = (flashcard.pinyin ?? '').toString().trim();

            doc.setTextColor(0, 0, 0);

            if (en && !/[\u3400-\u9FFF]/.test(cn)) {
              // English-only card: show just English (top-right)
              setAutoFont(doc, en, 'normal');
              doc.setFontSize(16);
              doc.text(en, xRight, baseY, { align: 'right' });
            } else {
              // Chinese card: English / 中文 / Pinyin (top-right stack)
              // English line
              doc.setFontSize(14);
              setAutoFont(doc, 'English:', 'normal');
              const enLabel = 'English: ';
              const enWidth = doc.getStringUnitWidth(enLabel) * 14 / doc.internal.scaleFactor;
              doc.text(enLabel, xRight, baseY, { align: 'right' });
              setAutoFont(doc, en || '—', 'normal');
              doc.text(en || '—', xRight - enWidth, baseY, { align: 'right' });

              // Chinese line - ensure proper font for label
              doc.setFontSize(18);
              setAutoFont(doc, '中文:', 'normal');
              const cnLabel = '中文: ';
              const cnLabelWidth = doc.getStringUnitWidth(cnLabel) * 18 / doc.internal.scaleFactor;
              doc.text(cnLabel, xRight, baseY + 16, { align: 'right' });
              setAutoFont(doc, cn || '—', 'normal');
              doc.text(cn || '—', xRight - cnLabelWidth, baseY + 16, { align: 'right' });

              // Pinyin line
              doc.setFontSize(14);
              setAutoFont(doc, 'Pinyin:', 'normal');
              const pyLabel = 'Pinyin: ';
              const pyWidth = doc.getStringUnitWidth(pyLabel) * 14 / doc.internal.scaleFactor;
              doc.text(pyLabel, xRight, baseY + 32, { align: 'right' });
              setAutoFont(doc, py || '—', 'normal');
              doc.text(py || '—', xRight - pyWidth, baseY + 32, { align: 'right' });
            }

// divider between halves (keep)
if (cardIndex === 0 && page.length > 1) {
  doc.setDrawColor(0);
  doc.setLineWidth(0.1);
  doc.line(0, pageHeight / 2, pageWidth, pageHeight / 2);
}

        });
 });
      }

      doc.save('sprouttie-flashcards.pdf');
      
      // Log activity (fire and forget)
      import('@/utils/activityLogger').then(({ logActivity, ACTIVITY_TYPES }) => {
        logActivity(
          ACTIVITY_TYPES.PRINT_FLASHCARDS,
          `Printed ${previewFlashcards.length} flashcard${previewFlashcards.length !== 1 ? 's' : ''}`,
          { count: previewFlashcards.length, includeBack }
        );
      });
      
      // Update free print counter
      if (userPlan === 'free') {
        setFreePrintsUsed(prev => prev + 1);
      }
      
      setMessage('PDF generated successfully! Check your downloads folder.');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error("Error generating PDF:", error);
      setMessage('Error generating PDF. Please try again.');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  // Determine if user can print: paid plan OR free with prints remaining
  const canPrint = hasFeature('pdfExport') || (userPlan === 'free' && freePrintsUsed < FREE_MONTHLY_PRINT_LIMIT);
  const freePrintsRemaining = FREE_MONTHLY_PRINT_LIMIT - freePrintsUsed;

  // Check if user has access to print feature
  if (planLoading || freePrintsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!canPrint) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <UpgradePrompt
          feature="Print Flashcards"
          requiredPlan="print"
          title="Monthly Free Prints Used"
          description={`You've used all ${FREE_MONTHLY_PRINT_LIMIT} free prints this month. Upgrade to the Print Plan for unlimited printing!`}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24">
      <div className="bg-card rounded-xl border border-border p-4 sm:p-6">
        {/* Free prints remaining banner */}
        {userPlan === 'free' && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            🖨️ <strong>{freePrintsRemaining}</strong> of {FREE_MONTHLY_PRINT_LIMIT} free prints remaining this month.{' '}
            <a href="/plans" className="underline font-medium text-amber-900 hover:text-amber-700">Upgrade for unlimited</a>
          </div>
        )}
        <h3 className="font-semibold text-foreground mb-4">Print Flashcards</h3>
        
        {/* Selection Mode Tabs */}
        <div className="flex mb-6 border-b">
          <button 
            className={`px-4 py-2 ${selectionMode === 'manual-flashcards' ? 'bg-blue-100 border-b-2 border-blue-500 font-medium' : 'hover:bg-gray-100'}`}
            onClick={() => setSelectionMode('manual-flashcards')}
          >
            Select Flashcards
          </button>
          <button 
            className={`px-4 py-2 ${selectionMode === 'next-day-sets' ? 'bg-blue-100 border-b-2 border-blue-500 font-medium' : 'hover:bg-gray-100'}`}
            onClick={() => setSelectionMode('next-day-sets')}
          >
            Next Day Sets
          </button>
        </div>
        
        {/* Selection Area */}
        <div className="mb-6">
          {selectionMode === 'manual-flashcards' && (
            <div>
              {/* Category Filter Dropdown */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Select Category</label>
                <select
                  className="w-full border rounded-md px-3 py-2"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="all">All Flashcards</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <h4 className="text-sm font-medium mb-2">Select flashcards to print:</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-60 overflow-y-auto p-2 border rounded">
                {getFilteredFlashcards().map(flashcard => {
                  const category = categories.find(c => c.id === flashcard.categoryId);
                  return (
                    <div 
                      key={flashcard.id}
                      className={`px-3 py-2 rounded-md border cursor-pointer ${
                        selectedFlashcards.includes(flashcard.id) 
                          ? 'bg-green-100 border-green-300' 
                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                      }`}
                      onClick={() => toggleFlashcardSelection(flashcard.id)}
                    >
                      <div className="font-medium">{flashcard.word}</div>
                      <div className="text-xs text-gray-500">{category ? category.name : 'Unknown'}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {selectionMode === 'next-day-sets' && (
            <div>
              <h4 className="text-sm font-medium mb-2">Select sets:</h4>
              <div className="flex flex-wrap gap-2 mb-4">
                {sets.map(set => (
                  <button
                    key={set.id}
                    onClick={() => toggleSetSelection(set.id)}
                    className={`px-3 py-2 rounded-md text-sm ${
                      selectedSets.includes(set.id)
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {set.name}
                  </button>
                ))}
              </div>
              
              {/* Show selected flashcards */}
              {selectedFlashcards.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Flashcards in selected sets:</h4>
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 border rounded">
                    {selectedFlashcards.map(cardId => {
                      const card = flashcards.find(c => c.id === cardId);
                      if (!card) return null;
                      return (
                        <div 
                          key={cardId}
                          className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm border border-green-300"
                        >
                          {card.word}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Control Buttons - Mobile Responsive */}
        <div className="space-y-3">
          {/* Primary Actions Row */}
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={generatePreview}
              className="flex-1 py-3 px-4 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-all shadow-md disabled:opacity-50 disabled:shadow-none"
              disabled={selectedFlashcards.length === 0}
            >
              Generate Preview
            </button>
            <button
              onClick={generatePDF}
              className="flex-1 py-3 px-4 bg-[hsl(var(--sprouttie-green))] text-white rounded-xl font-semibold hover:opacity-90 transition-all shadow-md disabled:opacity-50 disabled:shadow-none"
              disabled={previewFlashcards.length === 0}
            >
              Download PDF
            </button>
          </div>

          {/* Secondary Controls Row */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={clearSelections}
              className="px-4 py-2 text-muted-foreground border border-border rounded-lg hover:bg-secondary text-sm transition-colors"
            >
              Clear Selections
            </button>

            <label className="inline-flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                className="rounded border-border accent-primary"
                checked={includeBack}
                onChange={(e) => setIncludeBack(e.target.checked)}
              />
              <span>Add back pages</span>
            </label>

            <div className="inline-flex rounded-lg overflow-hidden border border-border">
              <button
                type="button"
                onClick={() => setPreviewSide('front')}
                className={`px-3 py-2 text-sm font-medium transition-colors ${previewSide==='front' ? 'bg-foreground text-background' : 'bg-background text-foreground hover:bg-secondary'}`}
                disabled={previewPages.length === 0}
              >
                Front
              </button>
              <button
                type="button"
                onClick={() => setPreviewSide('back')}
                className={`px-3 py-2 text-sm font-medium transition-colors ${previewSide==='back' ? 'bg-foreground text-background' : 'bg-background text-foreground hover:bg-secondary'}`}
                disabled={!includeBack || previewPages.length === 0}
              >
                Back
              </button>
            </div>
          </div>
        </div>

      </div>
      
      {/* Status Message */}
      {message && (
        <div className={`p-3 rounded ${
          message.includes('Error') 
            ? 'bg-red-100 text-red-700' 
            : message.includes('success') 
              ? 'bg-green-100 text-green-700'
              : 'bg-blue-100 text-blue-700'
        }`}>
          {message}
        </div>
      )}
      
      {/* Updated Preview Section - with PDF-like styling */}
     {previewPages.length > 0 && (
  <div className="bg-white rounded-lg shadow-md p-6">
    <div className="flex justify-between items-center mb-4">
      <h3 className="font-medium">
        Print Preview of selected words ({previewFlashcards.length} flashcards)
      </h3>
      {previewFlashcards.length % 2 !== 0 && (
        <div className="text-yellow-600 text-sm">
          For optimal printing, select an even number of flashcards.
        </div>
      )}
    </div>

    <div className="mb-3 text-sm text-gray-700">
      Each card below represents how it will appear on the A4 landscape page (2 words per page, top and bottom).
    </div>

    {/* Show exact A4 landscape preview grid with PDF-like styling */}
    <div className="flex flex-col space-y-4">
      {previewPages.map((page, pageIndex) => (
        <div
          key={pageIndex}
          className="mx-auto w-full max-w-4xl bg-white border border-gray-300 shadow-md"
          style={{ aspectRatio: '1.414', maxHeight: '400px' }}
        >
          <div className="h-full w-full relative bg-white">
            {/* Dividing line in the middle */}
            <div className="absolute top-1/2 left-0 w-full h-px bg-gray-300"></div>

            {previewSide === 'front' ? (
  <>
    {/* FRONT PREVIEW (top half) */}
    <div className="absolute top-0 left-0 w-full h-1/2 flex items-center justify-center">
      <div
        className="text-red-600 font-bold"
        style={{
          fontSize: `${Math.min(page[0].fontSize / 3, 100)}px`,
          lineHeight: '1',
          margin: '0 8mm',
          padding: '0',
        }}
      >
        {page[0].word}
      </div>
    </div>

    {/* FRONT PREVIEW (bottom half, if exists) */}
    {page.length > 1 && (
      <div className="absolute bottom-0 left-0 w-full h-1/2 flex items-center justify-center">
        <div
          className="text-red-600 font-bold"
          style={{
            fontSize: `${Math.min(page[1].fontSize / 3, 100)}px`,
            lineHeight: '1',
            margin: '0 8mm',
            padding: '0',
          }}
        >
          {page[1].word}
        </div>
      </div>
    )}
  </>
) : (
  <div>
    {/* BACK PREVIEW (top-right text to leave center free) */}
    {page.map((fc, idx) => (
      <div
        key={fc.id}
        className={`absolute ${idx === 0 ? 'top-0' : 'bottom-0'} left-0 w-full h-1/2 flex items-start justify-end p-4`}
      >
        <div className="text-right">
          {fc.english && !/[\u3400-\u9FFF]/.test(fc.word) ? (
            /* English-only card */
            <div className="text-sm font-semibold text-gray-800">
              {fc.english}
            </div>
          ) : (
            /* Chinese card */
            <>
              <div className="text-sm font-semibold text-gray-800">
                English: {fc.english || '—'}
              </div>
              <div className="text-xl text-gray-900 my-1">
                {fc.word || '—'}
              </div>
              <div className="text-sm font-semibold text-gray-700">
                Pinyin: {fc.pinyin || '—'}
              </div>
            </>
          )}
        </div>
      </div>
    ))}

    {/* Page number (for back preview) */}
    <div className="absolute top-2 right-2 bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-bl">
      Page {pageIndex + 1}
    </div>
  </div>
)}
  </div>

          </div>
      ))}
    </div>

                <div className="mt-4 text-sm text-gray-600">
        <p>Notes about PDF output:</p>
        <ul className="list-disc list-inside ml-4">
          <li>Words will be printed in bright red text</li>
          <li>Each A4 landscape page will contain 2 flashcards (top and bottom)</li>
          <li>Short words (like "car", "van") will be displayed at 250pt size</li>
          <li>Longer words will be sized to fill the page width (8mm margins)</li>
          <li><span className="text-yellow-600 font-semibold">Note:</span> 8mm margins may be too narrow for some printers</li>
          <li>Total pages: {previewPages.length}</li>
        </ul>
      </div>
    </div> 
  )}
</div>
);
};

export default PrintFlashcards;
