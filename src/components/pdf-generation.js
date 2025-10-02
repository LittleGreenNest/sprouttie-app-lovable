// PDF Generation Code for perfectly centered and contained words
// This would be part of the PrintFlashcards.js component

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

    const pageWidth = doc.internal.pageSize.getWidth();  // A4 landscape width (297mm)
    const pageHeight = doc.internal.pageSize.getHeight(); // A4 landscape height (210mm)
    
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
        const yPosition = cardIndex === 0 ? pageHeight / 4 : (pageHeight * 3) / 4;
        
        // Set text properties
        doc.setTextColor(255, 0, 0); // Red color
        doc.setFont('helvetica', 'bold');
        
        // Start with the desired 250px font size
        // Need to convert from px to pt for jsPDF (approximately 0.75 conversion)
        let fontSize = 188; // 250px ≈ 188pt
        doc.setFontSize(fontSize);
        
        // Check if word fits within page width (with appropriate margins)
        // We use 40mm margins (20mm on each side) to ensure words are well contained
        let textWidth = doc.getStringUnitWidth(flashcard.word) * fontSize / doc.internal.scaleFactor;
        const maxWidth = pageWidth - 40; // 40mm margins total
        
        // Reduce font size in 5pt increments if necessary to fit width
        // This ensures we use the largest possible font size while keeping the word contained
        while (textWidth > maxWidth && fontSize > 50) {
          fontSize -= 5;
          doc.setFontSize(fontSize);
          textWidth = doc.getStringUnitWidth(flashcard.word) * fontSize / doc.internal.scaleFactor;
        }
        
        // Add word to page - perfectly centered
        // Using alignCenter ensures the word is horizontally centered
        doc.text(flashcard.word, pageWidth / 2, yPosition, { align: 'center', baseline: 'middle' });
        
        // Add a dividing line between cards (except for single-card pages)
        if (cardIndex === 0 && page.length > 1) {
          doc.setDrawColor(0);
          doc.setLineWidth(0.1);
          doc.line(0, pageHeight / 2, pageWidth, pageHeight / 2);
        }
      });
    });
    
    // Save the PDF
    doc.save('sprouttie-flashcards.pdf');
    
    setMessage('PDF generated successfully! Check your downloads folder.');
    setTimeout(() => setMessage(''), 3000);
  } catch (error) {
    console.error("Error generating PDF:", error);
    setMessage('Error generating PDF. Please try again.');
    setTimeout(() => setMessage(''), 3000);
  }
};