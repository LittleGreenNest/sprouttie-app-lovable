// Draws printable flashcards into a jsPDF document: A4 landscape, two cards
// per sheet, stacked top and bottom with a thin line across the middle.
//
// Front + matching backs is laid out for ordinary duplex printing with
// "Flip on short edge". Each front page is followed straight away by its back
// page, so the printer pairs page 1 with 2, 3 with 4, and so on.
//
// Why the backs need no swapping: on a landscape sheet the short edges are
// the left and right sides, so flipping on the short edge turns the paper
// over like a book page. Top stays top and only left and right trade places.
// Every card is centred horizontally, so the top card's back lands behind the
// top card and the bottom card's back behind the bottom card. Flip on long
// edge would put each back behind the other card, which is why the app names
// the short-edge setting.

// CJK range + Latin Extended/combining marks (covers ā á ǎ à, etc.)
const needsNotoCJK = (s = '') => /[一-鿿]/.test(s);
const needsLatinDiacritics = (s = '') => /[Ā-ͯ]/.test(s);
const hasHan = (s = '') => /[㐀-鿿]/.test(s);

// CJK + Latin-diacritics auto font switch
export const setAutoFont = (doc, s, weight = 'normal') => {
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

// Vertical centre of the top or bottom half
const cardCentreY = (pageHeight, cardIndex) =>
  cardIndex === 0 ? pageHeight / 4 : (pageHeight * 3) / 4;

const drawDivider = (doc, page, pageWidth, pageHeight) => {
  if (page.length < 2) return;
  doc.setDrawColor(0);
  doc.setLineWidth(0.1);
  doc.line(0, pageHeight / 2, pageWidth, pageHeight / 2);
};

const drawFrontPage = (doc, page, textColor) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  page.forEach((flashcard, cardIndex) => {
    doc.setTextColor(textColor === 'red' ? 255 : 0, 0, 0);
    const text = (flashcard.word ?? '').toString();
    setAutoFont(doc, text, 'bold');
    doc.setFontSize(flashcard.fontSize);
    doc.text(text, pageWidth / 2, cardCentreY(pageHeight, cardIndex), { align: 'center', baseline: 'middle' });
  });
  drawDivider(doc, page, pageWidth, pageHeight);
};

const drawBackPage = (doc, page) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const cx = pageWidth / 2;

  page.forEach((flashcard, cardIndex) => {
    const centerY = cardCentreY(pageHeight, cardIndex);
    const cn = (flashcard.word ?? '').toString().trim();
    const en = (flashcard.english ?? '').toString().trim();
    const py = (flashcard.pinyin ?? '').toString().trim();

    doc.setTextColor(0, 0, 0);

    if (en && !hasHan(cn)) {
      // English-only card: English word centered
      doc.setFontSize(24);
      setAutoFont(doc, en, 'normal');
      doc.text(en, cx, centerY, { align: 'center', baseline: 'middle' });
    } else {
      // Chinese card: three centered lines, English / Chinese / Pinyin
      const line1 = en ? `English: ${en}` : '';
      const line3 = py ? `Pinyin: ${py}` : '';
      const lineGap = 14; // mm between lines

      doc.setFontSize(13);
      setAutoFont(doc, line1, 'normal');
      doc.text(line1, cx, centerY - lineGap, { align: 'center', baseline: 'middle' });

      doc.setFontSize(22);
      setAutoFont(doc, cn, 'normal');
      doc.text(cn, cx, centerY, { align: 'center', baseline: 'middle' });

      doc.setFontSize(13);
      setAutoFont(doc, line3, 'normal');
      doc.text(line3, cx, centerY + lineGap, { align: 'center', baseline: 'middle' });
    }
  });
  drawDivider(doc, page, pageWidth, pageHeight);
};

// pages: arrays of 1 or 2 cards. The doc must already have its fonts
// registered and be on its first, empty page.
export function writeFlashcardPages(doc, pages, { includeBack = false, textColor = 'red' } = {}) {
  pages.forEach((page, pageIndex) => {
    if (pageIndex > 0) doc.addPage();
    drawFrontPage(doc, page, textColor);
    if (includeBack) {
      doc.addPage();
      drawBackPage(doc, page);
    }
  });

  if (includeBack) {
    // Presets the print window to short-edge duplex at actual size in viewers
    // that read PDF print preferences (Acrobat). Browsers and Preview ignore
    // it, which is why the app also tells the parent which setting to pick.
    doc.viewerPreferences({ Duplex: 'DuplexFlipShortEdge', PrintScaling: 'None' });
  }
}
