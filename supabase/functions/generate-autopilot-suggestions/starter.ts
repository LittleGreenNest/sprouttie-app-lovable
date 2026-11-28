import { commonWordGroups } from "../_shared/commonMandarin.js";

// Reviewed familiar words, interleaved across categories; no inferred interests
// or rigid developmental milestones. Vehicles are not the blank-profile default.
export function everydayStarterPlan(excluded: (chinese: string, english: string) => boolean) {
  const groups = commonWordGroups.filter(([category]) => !category.includes("vehicles"));
  const candidates: any[] = [];
  for (let row = 0; row < 10; row++) {
    for (const [category, words] of groups) {
      const entry = words[row];
      if (!entry || excluded(entry[0], entry[2])) continue;
      const [chinese, pinyin, english] = entry;
      candidates.push({ word: chinese, chinese, pinyin, english, category,
        reason: "A familiar everyday word to try together; no interests have been added yet.",
        activity_tip: `Name ${english} during an everyday routine or while playing together.`, tier: "reinforce" });
    }
  }
  return { theme: "Everyday first words", words: candidates };
}
