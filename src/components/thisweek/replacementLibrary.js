// A small reviewed starter library keeps Swap usable without a model request.
// These are choices for the parent, not claims about the child's interests.
import { commonWordGroups as groups } from '../../../supabase/functions/_shared/commonMandarin.js';

export function replacementLibrary(suggestion = {}) {
  const mandarin = /[㐀-鿿]/.test(suggestion.word || '');
  const context = `${suggestion.category || ''} ${suggestion.word || ''}`.toLowerCase();
  const ranked = groups.map(([tags, words], index) => ({ words, index,
    score: tags.split(' ').filter(tag => new RegExp(`\\b${tag}\\b`).test(context)).length +
      words.filter(([zh,, en]) => context.includes(zh) || new RegExp(`\\b${en}\\b`).test(context)).length,
  })).sort((a,b) => b.score-a.score || a.index-b.index);
  return ranked.flatMap(({words}) => words.map(([zh,pinyin,english]) => mandarin ? `${english} (${zh} ${pinyin})` : english));
}
