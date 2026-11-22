import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWordChoices } from '../src/components/thisweek/wordChoices.js';
import { preparePrintCards } from '../src/utils/preparePrintCards.js';
import { writeFlashcardPages } from '../src/utils/flashcardPdf.js';

test('replacement choices exclude current plan, deduplicate Chinese variants and preserve saved translations', () => {
  const choices = buildWordChoices(['train (火车 huǒ chē)', 'bus (巴士 bā shì)'], [{ front: '火车', back: 'train', pinyin: 'huǒ chē' }, { front: '飞机', back: 'aeroplane', pinyin: 'fēi jī' }], ['巴士']);
  assert.deepEqual(choices.map(c => c.front), ['火车', '飞机']);
  assert.equal(choices[1].english, 'aeroplane');
  assert.equal(choices[1].pinyin, 'fēi jī');
});

test('printing waits for pinyin, preserves saved fields and retries failed lookups', async () => {
  let resolve;
  const result = preparePrintCards([{ word: '兔子' }, { word: '熊', pinyin: 'parent pronunciation' }], () => new Promise(r => { resolve = r; }));
  let done = false;
  result.then(() => { done = true; });
  await Promise.resolve();
  assert.equal(done, false);
  resolve('tù zi');
  const cards = await result;
  assert.equal(cards[0].pinyin, 'tù zi');
  assert.equal(cards[1].pinyin, 'parent pronunciation');
  const cache = {};
  await preparePrintCards([{ word: '兔子' }], async () => { throw Error('busy'); }, cache);
  assert.equal((await preparePrintCards([{ word: '兔子' }], async () => 'tù zi', cache))[0].pinyin, 'tù zi');
});

test('PDF has Chinese-only fronts and English with tone-marked pinyin on matching backs', () => {
  const pages = [[]];
  const doc = { internal: { pageSize: { getWidth: () => 297, getHeight: () => 210 } }, getFontList: () => ({}), setFont() {}, setFontSize() {}, setTextColor() {}, setDrawColor() {}, setLineWidth() {}, line() {}, text: text => pages.at(-1).push(text), addPage: () => pages.push([]), viewerPreferences() {} };
  writeFlashcardPages(doc, [[{ word: '兔子', english: 'rabbit', pinyin: 'tù zi', fontSize: 250 }]], { includeBack: true });
  assert.deepEqual(pages[0], ['兔子']);
  assert.ok(pages[1].includes('English: rabbit'));
  assert.ok(pages[1].includes('Pinyin: tù zi'));
});
