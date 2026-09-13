// Parent-stated interests, as saved by InterestsCard: chips and free text
// joined into one string, e.g. "🚚 Trucks, 🦖 Dinosaurs, tractors".
//
// The engine used to hand that whole string to the model as a single
// category, and only when every other signal was empty. With 100+ logged
// words another signal always existed, so what the parent said their child
// loves was never used.

const EMOJI = /[\p{Extended_Pictographic}\p{Emoji_Modifier}\u{1F1E6}-\u{1F1FF}‍️⃣]/gu;

export const MAX_STATED_INTERESTS = 5;

export function parseStatedInterests(raw?: string | null): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of String(raw).split(/[,;\n]/)) {
    const label = part.replace(EMOJI, "").replace(/\s+/g, " ").trim();
    const key = label.toLowerCase();
    if (!label || seen.has(key)) continue;
    seen.add(key);
    out.push(label);
  }
  return out.slice(0, MAX_STATED_INTERESTS);
}

export type CategorySignal = { label: string; source: string };

/** Stated interests lead. Observed categories follow as backing. */
export function withStatedInterestsFirst(
  stated: string[],
  observed: CategorySignal[],
  max = 8,
): CategorySignal[] {
  return [
    ...stated.map((interest) => ({
      label: `${interest} (the parent told us)`,
      source: "profile_interests",
    })),
    ...observed,
  ].slice(0, max);
}
