import { splitSuggestedWord } from './weekWords';

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/**
 * Prints the proposed words as a plain one-page list (no plan gate, no cards
 * needed, since proposed words are not cards yet). Uses a hidden iframe so a
 * popup blocker cannot stop it.
 */
export function printWeekWords(suggestions, theme, subtitle) {
  const rows = (suggestions || [])
    .map((s) => {
      const { front, pinyin, english } = splitSuggestedWord(s.word);
      return `<tr>
        <td class="box"></td>
        <td class="zh">${esc(front)}</td>
        <td class="py">${esc(pinyin)}</td>
        <td class="en">${esc(english)}</td>
      </tr>`;
    })
    .join('');

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>This week's words</title>
<style>
  @page { size: A4; margin: 18mm; }
  body { font-family: "Noto Sans SC", "PingFang SC", "Helvetica Neue", Arial, sans-serif; color: #263136; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  p.sub { font-size: 12px; color: #66737A; margin: 0 0 16px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 10px 6px; border-bottom: 1px solid #E4D6BF; vertical-align: middle; }
  .box { width: 22px; } .box::before { content: ""; display: block; width: 14px; height: 14px; border: 1.5px solid #66737A; border-radius: 3px; }
  .zh { font-size: 26px; width: 30%; } .py { font-size: 14px; color: #66737A; width: 25%; } .en { font-size: 14px; }
</style></head><body>
<h1>${esc(theme || "This week's words")}</h1>
<p class="sub">${esc(subtitle || `${(suggestions || []).length} proposed words from Sprouttie. Tick the ones you want.`)}</p>
<table>${rows}</table>
</body></html>`;

  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  document.body.appendChild(frame);
  const doc = frame.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();
  const cleanup = () => setTimeout(() => frame.remove(), 1000);
  frame.contentWindow.onafterprint = cleanup;
  setTimeout(() => {
    frame.contentWindow.focus();
    frame.contentWindow.print();
    setTimeout(cleanup, 60000);
  }, 250);
}
