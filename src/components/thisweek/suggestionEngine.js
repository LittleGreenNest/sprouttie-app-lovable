/**
 * Suggestion engine for the weekly plan.
 *
 * Replaces the previous rule ("sort by review_count ascending, take 8"), which
 * ignored every signal the app already stores. This reads three tables the
 * planner was never looking at:
 *
 *   flashcards      what the parent owns
 *   spoken_words    what the child actually says, and at what stage
 *   daily_tracking  whether sessions happened and how engaged the child was
 *
 * Pure functions, no React and no network. Everything here is deterministic so
 * it can be reasoned about (and later tested) without a Supabase round trip.
 *
 * Five rules, applied as additive score weights rather than hard filters, so a
 * thin deck or a brand new account still produces a full plan instead of an
 * empty one:
 *
 *   1. Interest carrier   favour the category the child already talks about
 *   2. Level match        single words or phrases, based on what he produces
 *   3. Language balance   favour the language that is falling behind
 *   4. Novelty            skip owned cards, push down recently flashed ones
 *   5. Ramp               set count follows last fortnight's engagement
 */

export const SET_SIZE = 5;
export const MAX_SETS = 5;
export const MIN_SETS = 1;

/* ─── text helpers ─── */

const CJK = /[㐀-䶿一-鿿]/;

export const hasCJK = (s) => CJK.test(s || '');

const normalise = (s) =>
  (s || '')
    .toLowerCase()
    .replace(/[.,!?;:'"()[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const tokens = (s) => {
  const n = normalise(s);
  if (!n) return [];
  // Chinese does not space-delimit, so treat each character as a token.
  return hasCJK(n) ? n.replace(/\s/g, '').split('') : n.split(' ');
};

/** English word count, used for level matching. Chinese is counted by character. */
const lengthUnits = (s) => tokens(s).length;

const daysSince = (value) => {
  if (!value) return Infinity;
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return Infinity;
  return (Date.now() - t) / 86400000;
};

const cardFace = (card) => card?.front || card?.word || '';

/**
 * Decks split the same real-world category across languages: "Vehicles" and
 * "Vehicles (cn)" are two folders but one interest. A child obsessed with
 * trucks is obsessed with them in both languages, so interest is measured on
 * the language-stripped name and only the card picking uses the raw folder.
 */
export const interestKey = (folder) =>
  (folder || 'General')
    .replace(/[（(]\s*(cn|zh|chinese|中文|en|eng|english)\s*[)）]/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase() || 'general';

/* ─── rule 1: what is he interested in ─── */

/**
 * Credits a folder every time a spoken word matches a card in it. Spoken words
 * carry no category of their own, so the deck is used as the lookup table.
 * Matching is on shared tokens, which catches "combine harvester" against a
 * card that just says "harvester".
 */
/** A card counts as matched when the spoken word covers most of its words. */
export const COVERAGE = 0.6;

export const deriveInterests = (flashcards = [], spokenWords = []) => {
  // Index cards by token, purely to shortlist candidates for comparison.
  const byToken = new Map();
  const cardTokens = new Map();
  flashcards.forEach((card) => {
    const toks = tokens(cardFace(card)).filter((t) => t.length >= 2 || hasCJK(t));
    if (!toks.length) return;
    cardTokens.set(card, toks);
    new Set(toks).forEach((tok) => {
      if (!byToken.has(tok)) byToken.set(tok, []);
      byToken.get(tok).push(card);
    });
  });

  const counts = {};
  let matched = 0;
  spokenWords.forEach((sw) => {
    const spoken = new Set(tokens(sw.word));
    if (!spoken.size) return;

    // Compare whole card against whole utterance rather than crediting any
    // shared token. A single token in common is not evidence of interest:
    // "Yellow bathtub" shares "yellow" with the card "yellow banana", and
    // on real data that alone made Food look like his second obsession.
    // Requiring the utterance to cover most of the card's words fixes it,
    // because "Cement mixer truck" still covers all of "cement mixer".
    const keys = new Set();
    const seen = new Set();
    spoken.forEach((tok) => {
      (byToken.get(tok) || []).forEach((card) => {
        if (seen.has(card)) return;
        seen.add(card);
        const toks = cardTokens.get(card);
        const hit = toks.filter((t) => spoken.has(t)).length;
        if (hit / toks.length >= COVERAGE) keys.add(interestKey(card.folder));
      });
    });

    if (!keys.size) return;
    matched += 1;
    // Every spoken word contributes exactly one vote in total, split when it
    // legitimately matches cards in more than one category.
    keys.forEach((k) => {
      counts[k] = (counts[k] || 0) + 1 / keys.size;
    });
  });

  const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const total = ranked.reduce((sum, [, n]) => sum + n, 0);

  // Share of matched speech per folder. Proportional rather than winner takes
  // all, so a clear second interest still outranks a folder he never mentions.
  const share = {};
  ranked.forEach(([folder, n]) => {
    share[folder] = total ? n / total : 0;
  });

  return {
    counts,
    share,
    matched,
    // Below 3 matches the distribution is noise, so the rule stands down.
    confident: matched >= 3,
    top: ranked.length ? ranked[0][0] : null,
    topShare: total ? ranked[0][1] / total : 0,
  };
};

/* ─── rule 2: what level is he producing at ─── */

/**
 * Level is computed per language, because a bilingual child is rarely at the
 * same stage in both, and because the units are not comparable: English counts
 * words, Chinese counts characters, and a two-character Chinese noun like 芒果
 * is one word, not a phrase.
 */
const levelFor = (words, isZh) => {
  if (!words.length) return { mean: 0, prefer: 'any', confident: false, n: 0 };
  const mean = words.reduce((sum, w) => sum + lengthUnits(w), 0) / words.length;
  // Chinese: a phrase is 4+ characters, since most nouns are 2 or 3.
  const phraseAt = isZh ? 4 : 2;
  const wordAt = isZh ? 3 : 1.3;

  let prefer = 'any';
  if (mean >= phraseAt) prefer = 'phrase';
  else if (mean < wordAt) prefer = 'word';

  return { mean, prefer, confident: words.length >= 5, n: words.length, phraseAt };
};

export const deriveLevel = (spokenWords = [], windowDays = 90) => {
  // Window per language, not before the split. Applying it first wipes out a
  // language the child has not produced lately: on real data the last 90 days
  // held 16 English entries and zero Chinese, so Chinese level came back empty
  // even though the log has Chinese words in it.
  const pick = (isZh) => {
    const all = spokenWords.filter((sw) => hasCJK(sw.word) === isZh);
    const recent = all.filter(
      (sw) => daysSince(sw.started_saying_at || sw.created_at) <= windowDays
    );
    return (recent.length >= 5 ? recent : all).map((sw) => sw.word);
  };

  return { zh: levelFor(pick(true), true), en: levelFor(pick(false), false) };
};

/* ─── rule 3: which language is behind ─── */

export const deriveLanguageBalance = (spokenWords = [], flashcards = []) => {
  let zh = 0;
  let en = 0;
  spokenWords.forEach((sw) => (hasCJK(sw.word) ? (zh += 1) : (en += 1)));

  const deckHas = { zh: false, en: false };
  flashcards.forEach((c) => {
    const lang = c.card_language || (hasCJK(cardFace(c)) ? 'zh' : 'en');
    deckHas[lang] = true;
  });

  const total = zh + en;
  if (!total) return { zh, en, behind: null, gap: 0 };

  const zhShare = zh / total;
  const gap = Math.abs(0.5 - zhShare) * 2; // 0 balanced, 1 entirely one language
  let behind = zhShare < 0.5 ? 'zh' : 'en';

  // No point favouring a language the deck cannot serve.
  if (!deckHas[behind]) behind = null;
  // Under a 15 point split there is nothing worth correcting.
  if (gap < 0.15) behind = null;

  return { zh, en, zhShare, gap, behind };
};

/* ─── rule 5: how many sets this week ─── */

export const deriveRamp = (tracking = [], flashcards = [], today = new Date()) => {
  const dayOf = (row) => row.user_local_date || row.date;
  const within = (row, days) => {
    const d = dayOf(row);
    if (!d) return false;
    return (today.getTime() - new Date(d).getTime()) / 86400000 <= days;
  };

  const last14 = tracking.filter((r) => within(r, 14));
  const last7 = tracking.filter((r) => within(r, 7));
  const activeDays = new Set(last7.map(dayOf)).size;

  const scores = last14
    .map((r) => r.engagement)
    .filter((e) => typeof e === 'number');
  const meanEngagement = scores.length
    ? scores.reduce((a, b) => a + b, 0) / scores.length
    : null;

  // What is running now. Sets are defined by flashcards.set_number, which is
  // what the Log page and the dashboard both derive from, so that is the only
  // honest definition of "how many sets are running". An earlier version also
  // required card_status === 'active', which is not reliably maintained, so a
  // deck with five populated sets reported zero and the ramp silently fell
  // back to its default.
  const activeSets = new Set(
    flashcards
      .filter(
        (c) =>
          c.set_number != null &&
          !['retired', 'graduated', 'owned'].includes(c.card_status)
      )
      .map((c) => c.set_number)
  ).size;
  const current = activeSets || 2;

  if (!last14.length) {
    return {
      sets: Math.min(current, 2),
      reason:
        activeSets > 2
          ? 'Coming back after a break, so starting at 2 sets rather than where you left off.'
          : 'No sessions logged recently, so starting gently at 2 sets.',
      meanEngagement,
      activeDays,
      state: 'restart',
    };
  }

  if (meanEngagement !== null && meanEngagement <= 2.5) {
    return {
      sets: Math.max(MIN_SETS, current - 1),
      reason: `Engagement averaged ${meanEngagement.toFixed(1)} out of 5, so this week is lighter, not heavier.`,
      meanEngagement,
      activeDays,
      state: 'ease',
    };
  }

  if (meanEngagement !== null && meanEngagement >= 4 && activeDays >= 5) {
    return {
      sets: Math.min(MAX_SETS, current + 1),
      reason: `${activeDays} days of sessions and engagement at ${meanEngagement.toFixed(1)}, so you have room for one more set.`,
      meanEngagement,
      activeDays,
      state: 'grow',
    };
  }

  return {
    sets: current,
    reason: 'Holding at the same number of sets while the rhythm settles.',
    meanEngagement,
    activeDays,
    state: 'hold',
  };
};

/* ─── scoring ─── */

const WEIGHT = {
  interest: 3.0,
  level: 1.5,
  language: 2.0,
  unseen: 1.2,
  recency: -2.5,
  reviewed: -0.6,
};

const buildOwnedSet = (spokenWords = []) => {
  const owned = new Set();
  spokenWords.forEach((sw) => {
    if (sw.word_stage === 'owned') owned.add(normalise(sw.word));
  });
  return owned;
};

/**
 * daily_tracking.flashcard_id is not a plain card id. The column was widened
 * from UUID to TEXT in June 2026 and the session tracker now writes a
 * composite key, "<card uuid>:R<round>", plus per-set sentinel rows such as
 * "set-1-sentinel" that reference no card at all. Keying on the raw value
 * silently matches nothing, which would leave the recency rule permanently
 * inert. Strip the round suffix and drop the sentinels.
 */
const buildLastFlashed = (tracking = []) => {
  const map = new Map();
  tracking.forEach((r) => {
    if (!r.flashcard_id) return;
    const id = String(r.flashcard_id).split(':')[0];
    if (!id || id.includes('sentinel')) return;
    const d = r.user_local_date || r.date;
    if (!d) return;
    const prev = map.get(id);
    if (!prev || new Date(d) > new Date(prev)) map.set(id, d);
  });
  return map;
};

/**
 * Scores one card and records why, so the plan can explain itself. The reason
 * text is the point: a generated plan a parent does not trust just gets
 * second-guessed, which is the work we are trying to remove.
 */
const scoreCard = (card, ctx) => {
  const { interests, level, balance, owned, lastFlashed } = ctx;
  const face = cardFace(card);
  const folder = card.folder || 'General';
  const lang = card.card_language || (hasCJK(face) ? 'zh' : 'en');
  const reasons = [];
  let score = 0;

  const key = interestKey(folder);
  const share = interests.share?.[key] || 0;
  if (interests.confident && share > 0) {
    score += WEIGHT.interest * share;
    if (key === interests.top) {
      reasons.push(`${key}, the category he talks about most`);
    } else if (share >= 0.15) {
      reasons.push(`${key}, which he already talks about`);
    }
  }

  const lvl = level[lang] || { prefer: 'any', confident: false };
  if (lvl.confident && lvl.prefer !== 'any') {
    const isPhrase =
      card.card_type === 'phrase' || lengthUnits(face) >= (lvl.phraseAt || 2);
    if (lvl.prefer === 'phrase' && isPhrase) {
      score += WEIGHT.level;
      reasons.push('a phrase, which is where his speech is now');
    } else if (lvl.prefer === 'word' && !isPhrase) {
      score += WEIGHT.level;
      reasons.push('a single word, which matches his stage');
    } else if (lvl.prefer === 'phrase' && !isPhrase) {
      score -= WEIGHT.level * 0.5;
    }
  }

  if (balance.behind && lang === balance.behind) {
    score += WEIGHT.language;
    reasons.push(
      balance.behind === 'zh'
        ? 'Chinese, which is behind his English'
        : 'English, which is behind his Chinese'
    );
  }

  if (!card.review_count) {
    score += WEIGHT.unseen;
    reasons.push('never flashed');
  } else {
    score += WEIGHT.reviewed * Math.min(card.review_count, 6);
  }

  const flashedAgo = daysSince(lastFlashed.get(card.id) || card.last_reviewed_at);
  if (flashedAgo <= 7) {
    // Full penalty today, tapering off across the week.
    score += WEIGHT.recency * (1 - flashedAgo / 7);
  }

  return {
    score,
    lang,
    folder,
    ownedAlready: owned.has(normalise(face)),
    // Two reasons at most. A parent scanning a list of fifteen will not read
    // a four-clause sentence on every row.
    reason: reasons.length
      ? reasons.slice(0, 2).join(', ')
      : 'keeping the rotation moving',
  };
};

/* ─── main entry ─── */

/**
 * @param {object} input
 * @param {Array}  input.flashcards
 * @param {Array}  input.spokenWords
 * @param {Array}  input.tracking     daily_tracking rows
 * @returns {{ suggestions: Array, sets: Array, setCount: number, signals: object }}
 */
export const buildWeeklyPlan = ({
  flashcards = [],
  spokenWords = [],
  tracking = [],
  today = new Date(),
} = {}) => {
  const interests = deriveInterests(flashcards, spokenWords);
  const level = deriveLevel(spokenWords);
  const balance = deriveLanguageBalance(spokenWords, flashcards);
  const ramp = deriveRamp(tracking, flashcards, today);
  const owned = buildOwnedSet(spokenWords);
  const lastFlashed = buildLastFlashed(tracking);

  const ctx = { interests, level, balance, owned, lastFlashed };

  // A card belongs to exactly one set, so proposing a card that currently sits
  // in a set this plan will not replace would quietly empty that set. Applying
  // a 2-set plan once pulled four cards out of Set 3, taking it from six cards
  // to two, while the screen promised only Sets 1 and 2 would change. Cards in
  // sets 1..ramp.sets are fair game because they are being replaced anyway.
  const protectedSet = (c) => c.set_number != null && c.set_number > ramp.sets;

  const eligible = flashcards
    .filter((c) => !['retired', 'graduated', 'owned'].includes(c.card_status))
    .filter((c) => !protectedSet(c))
    .map((card) => ({ card, ...scoreCard(card, ctx) }))
    .filter((s) => !s.ownedAlready)
    .sort((a, b) => b.score - a.score);

  const target = ramp.sets * SET_SIZE;

  // A Doman set is one category in one language, so group on both. A folder
  // deep enough for two sets supplies two: the previous version visited each
  // folder once, which pushed an 11-card Vehicles folder aside after five
  // cards and filled set two with whatever unrelated folder was next.
  const groups = new Map();
  eligible.forEach((s) => {
    const key = `${s.folder} ${s.lang}`;
    if (!groups.has(key)) groups.set(key, { folder: s.folder, lang: s.lang, items: [] });
    groups.get(key).items.push(s);
  });

  const candidates = [];
  groups.forEach(({ folder, lang, items }) => {
    for (let i = 0; i < items.length; i += SET_SIZE) {
      const chunk = items.slice(i, i + SET_SIZE);
      candidates.push({
        folder,
        lang,
        items: chunk,
        // Mean beats max here: one strong card should not drag in four weak
        // ones. Part-filled chunks rank below full ones.
        rank:
          (chunk.reduce((sum, s) => sum + s.score, 0) / chunk.length) *
          (chunk.length / SET_SIZE),
      });
    }
  });

  // Greedy selection with a diversity penalty. Ranking once and taking the top
  // N gives a week of five near-identical sets: on real data the top two were
  // both chunks of Chinese vehicles, ten cards of the same thing. A session
  // should vary, so each pick discounts what looks like it.
  const sets = [];
  const used = new Set();
  const usedKeys = new Map(); // interest key -> times chosen
  const usedPairs = new Set(); // "key|lang" already chosen
  const nameCount = new Map();

  const alreadyNamed = (folder) => /[（(]\s*(cn|zh|chinese|中文)\s*[)）]/i.test(folder || '');

  while (sets.length < ramp.sets) {
    let best = null;
    let bestScore = -Infinity;

    candidates.forEach((cand) => {
      const picked = cand.items.filter((s) => !used.has(s.card.id));
      if (!picked.length) return;
      const key = interestKey(cand.folder);
      let adjusted = cand.rank * (picked.length / SET_SIZE);
      if (usedPairs.has(`${key}|${cand.lang}`)) adjusted *= 0.3;
      else if (usedKeys.has(key)) adjusted *= 0.6;
      if (adjusted > bestScore) {
        bestScore = adjusted;
        best = { ...cand, picked, key };
      }
    });

    if (!best) break;

    best.picked.forEach((s) => used.add(s.card.id));
    usedKeys.set(best.key, (usedKeys.get(best.key) || 0) + 1);
    usedPairs.add(`${best.key}|${best.lang}`);

    const base =
      best.lang === 'zh' && !alreadyNamed(best.folder)
        ? `${best.folder} (中文)`
        : best.folder;
    const n = (nameCount.get(base) || 0) + 1;
    nameCount.set(base, n);
    sets.push({
      name: n > 1 ? `${base} ${n}` : base,
      language: best.lang,
      reason: best.picked[0].reason,
      items: best.picked,
    });
  }

  // If the deck was too thin to fill every set, top up the part-filled ones.
  if (used.size < target) {
    const leftovers = eligible.filter((s) => !used.has(s.card.id));
    let i = 0;
    while (used.size < target && i < leftovers.length) {
      const s = leftovers[i++];
      const bucket = sets.find((x) => x.items.length < SET_SIZE);
      if (!bucket) break;
      used.add(s.card.id);
      bucket.items.push(s);
    }
  }

  const suggestions = sets.flatMap((set, setIndex) =>
    set.items.map((s) => ({
      id: s.card.id,
      word: cardFace(s.card),
      translation: s.card.back || '',
      pinyin: s.card.pinyin || '',
      category: s.folder,
      language: s.lang,
      reason: s.reason,
      setIndex,
      setName: set.name,
      score: s.score,
      accepted: true,
    }))
  );

  return {
    suggestions,
    sets,
    setCount: sets.length,
    signals: { interests, level, balance, ramp },
  };
};

/**
 * One line the parent reads before deciding whether to trust the plan.
 */
export const planHeadline = (signals, setCount) => {
  if (!signals) return '';
  const { interests, balance, ramp } = signals;
  const parts = [`${setCount} ${setCount === 1 ? 'set' : 'sets'} of ${SET_SIZE}`];
  if (interests?.confident && interests.top) parts.push(`led by ${interests.top.toLowerCase()}`);
  if (balance?.behind)
    parts.push(balance.behind === 'zh' ? 'weighted to Chinese' : 'weighted to English');
  return `${parts.join(', ')}. ${ramp?.reason || ''}`.trim();
};
