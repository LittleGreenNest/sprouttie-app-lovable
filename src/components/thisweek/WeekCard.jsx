import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import { useFlashcards } from '../../context/FlashcardContext';
import { DAYS_TO_FINISH } from '@/utils/cardDays';
import { useCardDays } from '../tracking/useCardDays';
import { useWeeklyReview } from '../review/useWeeklyReview';
import { useWeekState } from './useWeekState';
import { splitSuggestedWord } from './weekWords';
import NoticeLogSheet from './NoticeLogSheet';

// Brand palette (sprouttie-brand): cream ground, mint panel, Daisy Yellow CTA
// with dark ink text, never white on yellow.
const Shell = ({ variant, label, title, sub, children }) => (
  <section
    className={`${variant === 'home' ? 'mx-4 mb-3' : ''} rounded-2xl overflow-hidden border border-[#E4D6BF] bg-white`}
  >
    <div className="bg-[#ECF3F0] px-4 py-3">
      <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[#296549] m-0">{label}</p>
      {title && (
        <h2 className="font-display text-[20px] leading-tight text-[#263136] mt-1 mb-0">{title}</h2>
      )}
      {sub && <p className="text-[12px] text-[#66737A] mt-1 mb-0 leading-snug">{sub}</p>}
    </div>
    <div className="px-4 py-3 space-y-3">{children}</div>
  </section>
);

const PrimaryButton = ({ children, ...props }) => (
  <button
    type="button"
    {...props}
    className="w-full rounded-xl py-3 text-sm font-semibold disabled:opacity-60 active:scale-[0.99] transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-[#42946E]"
    style={{ background: '#F0C040', color: '#1A1A1A' }}
  >
    {children}
  </button>
);

const TextLink = ({ children, ...props }) => (
  <button
    type="button"
    {...props}
    className="text-[12px] font-semibold text-[#296549] hover:underline disabled:opacity-50 bg-transparent border-0 p-0 cursor-pointer"
  >
    {children}
  </button>
);

const MiniLabel = ({ children }) => (
  <p className="text-[10px] font-semibold tracking-[0.1em] uppercase text-[#66737A] m-0">{children}</p>
);

const Spinner = () => (
  <div className="flex justify-center py-4">
    <Loader2 className="w-5 h-5 animate-spin text-[#42946E]" />
  </div>
);

const withFullStop = (s) => {
  const t = String(s || '').trim().replace(/[.!?]+$/, '');
  return t ? `${t}.` : '';
};

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

const norm = (s) => String(s || '').trim().toLowerCase();

/** The parent's cards by their characters, so a suggested word can be matched to one. */
const useCardsByFront = () => {
  const { flashcards } = useFlashcards() || {};
  return React.useMemo(() => {
    const map = new Map();
    (flashcards || []).forEach((c) => {
      const key = norm(splitSuggestedWord(c.front).front);
      if (key && (!map.has(key) || c.set_number)) map.set(key, c);
    });
    return map;
  }, [flashcards]);
};

/** The picker opens a reason this way when the word came from something the parent logged. */
const sourceLabel = (reason) => {
  if (/^you noted/i.test(reason || '')) return 'From your notes';
  if (/^your child said/i.test(reason || '')) return 'From words said';
  return null;
};

const acceptedMessage = ({ placed = [], queued = 0 }) => {
  const joined = placed.map((p) => `${plural(p.count, 'word')} joined Set ${p.setNumber}`).join(', ');
  const waiting = queued ? `${plural(queued, 'word')} ${queued === 1 ? 'is' : 'are'} waiting for a free slot.` : '';
  if (!joined && !waiting) return 'These words are already in your sets.';
  return [joined && `${joined}.`, waiting].filter(Boolean).join(' ');
};

/* ─── Plan: this week's words, not yet accepted ─── */

const PlanState = ({ variant, week, navigate }) => {
  const [openSwap, setOpenSwap] = useState(null);
  const { pending, generating, accepting, error } = week;
  const cardsByFront = useCardsByFront();

  if (generating) {
    return (
      <Shell variant={variant} label="This week" title="Picking this week's words." sub="This takes a few seconds.">
        <Spinner />
      </Shell>
    );
  }

  if (pending.length === 0) {
    return (
      <Shell
        variant={variant}
        label="This week"
        title="Nothing planned yet."
        sub={error || "Sprouttie picks 5 words from what your child is into."}
      >
        <PrimaryButton onClick={week.generate}>Pick this week's words</PrimaryButton>
        <div className="text-center">
          <TextLink onClick={() => navigate('/word-planner')}>See full plan</TextLink>
        </div>
      </Shell>
    );
  }

  const theme = pending.find((s) => s.theme)?.theme;

  const handleAccept = async () => {
    const res = await week.accept();
    if (!res.ok) return;
    toast.success(acceptedMessage(res));
  };

  return (
    <Shell
      variant={variant}
      label={`This week · ${plural(pending.length, 'word')}`}
      title={withFullStop(theme || `${plural(pending.length, 'word')} for this week`)}
      sub="Tap Swap on any word you'd rather skip."
    >
      <ul className="divide-y divide-[#E4D6BF] m-0 p-0 list-none">
        {pending.map((s) => {
          const { front, pinyin, english } = splitSuggestedWord(s.word);
          const alts = week.alternatives[s.id];
          const open = openSwap === s.id;
          const known = cardsByFront.get(norm(front));
          const knownLabel = !known
            ? null
            : known.set_number
            ? `Already in Set ${known.set_number}`
            : known.card_status === 'retired' || known.date_retired
            ? 'Flashed before'
            : 'Already in your cards';
          return (
            <li key={s.id} className="py-2">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] text-[#263136] leading-tight m-0">
                    {front}
                    {pinyin && <span className="ml-2 text-[12px] text-[#66737A]">{pinyin}</span>}
                    {english && <span className="ml-2 text-[12px] text-[#66737A]">· {english}</span>}
                  </p>
                  {sourceLabel(s.reason) && (
                    <span className="inline-block mt-1 mr-1 rounded-full bg-[#ECF3F0] text-[#296549] px-2 py-px text-[11px] font-semibold">
                      {sourceLabel(s.reason)}
                    </span>
                  )}
                  {knownLabel && (
                    <span className="inline-block mt-1 rounded-full bg-[#FBF1CF] text-[#263136] px-2 py-px text-[11px] font-semibold">
                      {knownLabel}
                    </span>
                  )}
                  {s.reason && (
                    <p className="text-[12px] text-[#66737A] leading-snug mt-0.5 mb-0 line-clamp-2">{s.reason}</p>
                  )}
                </div>
                <TextLink
                  disabled={accepting}
                  onClick={() => {
                    setOpenSwap(open ? null : s.id);
                    if (!open) week.loadAlternatives(s);
                  }}
                >
                  {open ? 'Close' : 'Swap'}
                </TextLink>
              </div>
              {open && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {week.loadingAlternatives === s.id && (
                    <span className="text-[12px] text-[#66737A]">Finding alternatives…</span>
                  )}
                  {(alts || []).map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={async () => {
                        if (await week.swap(s.id, a)) setOpenSwap(null);
                      }}
                      className="text-[13px] px-3 py-1 rounded-full bg-[#F4EDE1] text-[#263136] border-0 cursor-pointer"
                    >
                      {a}
                    </button>
                  ))}
                  {alts && alts.length === 0 && week.loadingAlternatives !== s.id && (
                    <span className="text-[12px] text-[#66737A]">No alternatives found.</span>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {error && <p className="text-[12px] text-[#9A4A36] m-0">{error}</p>}

      <PrimaryButton onClick={handleAccept} disabled={accepting}>
        {accepting ? 'Adding to your sets…' : `Use these ${pending.length}`}
      </PrimaryButton>
      <div className="flex justify-between">
        <TextLink onClick={week.generate} disabled={accepting}>Different words</TextLink>
        <TextLink onClick={() => navigate('/word-planner')}>See full plan</TextLink>
      </div>
    </Shell>
  );
};

/* ─── Doing: words accepted, the week is running ─── */

const DoingState = ({ variant, week, navigate }) => {
  const [sheetOpen, setSheetOpen] = useState(false);
  const { accepted, practisedDays, reviewed } = week;
  const theme = accepted.find((s) => s.theme)?.theme;
  const tips = accepted.filter((s) => s.activity_tip);
  const { flashcards } = useFlashcards() || {};
  const cardsByFront = useCardsByFront();
  const { days } = useCardDays(flashcards);
  const dayNote = (word) => {
    const card = cardsByFront.get(norm(splitSuggestedWord(word).front));
    if (!card) return null;
    if (!card.set_number) return card.card_status === 'queued' ? 'waiting' : null;
    const n = days.get(card.id) || 0;
    return n >= DAYS_TO_FINISH ? 'done' : `day ${n} of ${DAYS_TO_FINISH}`;
  };
  const tip = tips.length ? tips[new Date().getDay() % tips.length] : null;

  return (
    <Shell
      variant={variant}
      label={theme ? `This week · ${theme}` : 'This week'}
      title={`Practised ${practisedDays} of the last 7 days.`}
    >
      <div className="flex gap-1" aria-hidden="true">
        {Array.from({ length: 7 }).map((_, i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full ${i < practisedDays ? 'bg-[#42946E]' : 'bg-[#E4D6BF]'}`} />
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {accepted.map((s) => (
          <span key={s.id} className="text-[14px] px-2.5 py-0.5 rounded-full bg-[#F4EDE1] text-[#263136]">
            {splitSuggestedWord(s.word).front}
            {dayNote(s.word) && <span className="ml-1.5 text-[11px] text-[#66737A]">{dayNote(s.word)}</span>}
          </span>
        ))}
      </div>

      <PrimaryButton onClick={() => navigate('/daily-tracking')}>Start today's flash</PrimaryButton>

      {tip && (
        <div className="rounded-xl bg-[#F4EDE1] px-3 py-2 space-y-1">
          <MiniLabel>Say it today</MiniLabel>
          <p className="text-[13px] text-[#263136] m-0 leading-snug">
            <span className="font-semibold">{splitSuggestedWord(tip.word).front}</span>: {tip.activity_tip}
          </p>
          <TextLink onClick={() => navigate('/pronunciation')}>Hear it</TextLink>
        </div>
      )}

      <button
        type="button"
        onClick={() => navigate('/book-recommendations')}
        className="w-full text-left rounded-xl bg-[#F4EDE1] px-3 py-2 space-y-1 border-0 cursor-pointer"
      >
        <MiniLabel>
          Read together{' '}
          <span className="ml-1 rounded bg-[#C2E0D1] text-[#296549] px-1 py-px text-[9px]">Beta</span>
        </MiniLabel>
        <p className="text-[13px] text-[#263136] m-0">Find a book to read together</p>
      </button>

      {reviewed && (
        <p className="text-[12px] text-[#66737A] m-0">Week reviewed. Next week's words arrive on Monday.</p>
      )}

      <div className="flex justify-between">
        <TextLink onClick={() => setSheetOpen(true)}>Note what you noticed</TextLink>
        <TextLink onClick={() => navigate('/word-planner')}>See full plan</TextLink>
      </div>

      {sheetOpen && <NoticeLogSheet onClose={() => setSheetOpen(false)} />}
    </Shell>
  );
};

/* ─── Notice: Saturday and Sunday, one question ─── */

const NoticeState = ({ variant, childName, onDone, onEmpty }) => {
  const { loading, saving, error, items, tappedCount, toggle, submit } = useWeeklyReview();
  const [saved, setSaved] = useState(null);

  useEffect(() => {
    if (!loading && items.length === 0 && saved === null) onEmpty();
  }, [loading, items.length, saved, onEmpty]);

  if (loading) {
    return (
      <Shell variant={variant} label="This week">
        <Spinner />
      </Shell>
    );
  }

  if (saved !== null) {
    return (
      <Shell
        variant={variant}
        label="This week"
        title={saved > 0 ? `${plural(saved, 'word')} moved on.` : 'Noted, thank you.'}
        sub="Next week's words arrive on Monday."
      >
        <PrimaryButton onClick={onDone}>Done</PrimaryButton>
      </Shell>
    );
  }

  if (items.length === 0) return null;

  return (
    <Shell
      variant={variant}
      label="This week · 30 seconds"
      title={`Did ${childName || 'your child'} say any of these?`}
      sub="Tap the ones you heard. Skip the rest."
    >
      <div className="grid grid-cols-3 gap-2">
        {items.map((item) => {
          const { front } = splitSuggestedWord(item.word);
          return (
            <button
              key={item.cardId}
              type="button"
              aria-pressed={item.tapped}
              onClick={() => toggle(item.cardId)}
              className={`rounded-xl border px-1 py-2 flex flex-col items-center cursor-pointer ${
                item.tapped ? 'border-[#42946E] bg-[#ECF3F0]' : 'border-[#E4D6BF] bg-white'
              }`}
            >
              <span className="text-[16px] text-[#263136] leading-tight text-center break-words">{front}</span>
              {item.translation && item.translation !== item.word && (
                <span className="text-[11px] text-[#66737A] text-center leading-tight">{item.translation}</span>
              )}
            </button>
          );
        })}
      </div>

      {error && <p className="text-[12px] text-[#9A4A36] m-0">{error}</p>}

      <PrimaryButton
        disabled={saving}
        onClick={async () => {
          const res = await submit();
          if (res.ok) setSaved(res.count);
        }}
      >
        {saving ? 'Saving…' : tappedCount > 0 ? `Save ${plural(tappedCount, 'word')}` : 'None of these'}
      </PrimaryButton>
    </Shell>
  );
};

/**
 * The one weekly card. Replaces the This Week wizard, the review nudge and the
 * suggestions card, which each asked about the same week without knowing what
 * the others had done.
 */
const WeekCard = ({ variant = 'home', forceReview = false }) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth() || {};
  const childName = currentUser?.user_metadata?.child_name?.trim() || null;
  const week = useWeekState({ forceReview });
  const [skipNotice, setSkipNotice] = useState(false);

  if (week.loading) {
    return (
      <Shell variant={variant} label="This week">
        <Spinner />
      </Shell>
    );
  }

  const state = week.state === 'notice' && skipNotice
    ? week.accepted.length > 0 ? 'doing' : 'plan'
    : week.state;

  if (state === 'notice') {
    return (
      <NoticeState
        variant={variant}
        childName={childName}
        onDone={week.reload}
        onEmpty={() => setSkipNotice(true)}
      />
    );
  }
  if (state === 'doing') return <DoingState variant={variant} week={week} navigate={navigate} />;
  return <PlanState variant={variant} week={week} navigate={navigate} />;
};

export default WeekCard;
