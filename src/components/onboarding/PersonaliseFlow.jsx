import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '../../context/AuthContext';
import GeneratedPlanView from '../planner/GeneratedPlanView';
import { useNavigate } from 'react-router-dom';
import sprouttielogo from '@/assets/sprouttie-logo.png';

// ── Screen definitions ──────────────────────────────────────────────

const SCREENS = [
  // 1 — Emotional Hook
  {
    type: 'intro',
    key: 'hook',
    emoji: '🌱',
    title: 'Tiny moments.\nBig learning.',
    subtitle: 'Turn 3 minutes a day into meaningful learning with your child.',
    cta: 'Start in 30 seconds',
  },

  // 2 — Parent Pain (no DB)
  {
    type: 'multi-no-save',
    key: 'pain',
    title: "What feels hardest right now?",
    subtitle: 'Select all that apply.',
    options: [
      { value: 'no_time', label: "I don't have time to teach consistently", emoji: '⏳' },
      { value: 'forgets', label: 'My child forgets what they learn', emoji: '🧠' },
      { value: 'what_teach', label: "I don't know what to teach", emoji: '🤷' },
      { value: 'screen_time', label: 'Screen time feels unproductive', emoji: '📱' },
    ],
  },

  // 3 — Desired Outcome (no DB)
  {
    type: 'multi-no-save',
    key: 'outcome',
    title: 'What would you love instead?',
    subtitle: 'Select all that apply.',
    options: [
      { value: 'routine', label: 'A simple daily routine', emoji: '🔁' },
      { value: 'remembers', label: 'My child remembers better', emoji: '💡' },
      { value: 'fits', label: 'Learning that fits into our day', emoji: '🧩' },
      { value: 'together', label: 'More meaningful time together', emoji: '❤️' },
    ],
  },

  // 4a — Age
  {
    type: 'quiz',
    key: 'child_age_band',
    title: 'How old is your child?',
    subtitle: 'This helps us pick the right vocabulary complexity.',
    options: [
      { value: '0-1', label: '0–1', emoji: '👶' },
      { value: '1-2', label: '1–2', emoji: '🧒' },
      { value: '2-3', label: '2–3', emoji: '🗣️' },
      { value: '3-5', label: '3–5', emoji: '📖' },
    ],
  },

  // 4b — Language (multi)
  {
    type: 'quiz',
    key: 'target_language',
    multi: true,
    title: "What language(s) are you strengthening?",
    subtitle: 'Select all that apply. Tap again to deselect.',
    options: [
      { value: 'english', label: 'English', emoji: '🇬🇧' },
      { value: 'mandarin', label: 'Mandarin', emoji: '🇨🇳' },
      { value: 'cantonese', label: 'Cantonese', emoji: '🇭🇰' },
      { value: 'malay', label: 'Malay', emoji: '🇲🇾' },
      { value: 'tamil', label: 'Tamil', emoji: '🇮🇳' },
      { value: 'other', label: 'Other', emoji: '🌏' },
    ],
  },

  // 4c — Speech level
  {
    type: 'quiz',
    key: 'speech_level',
    title: 'Does your child say any words yet?',
    subtitle: 'This helps us know where to start.',
    options: [
      { value: 'not_yet', label: 'Not yet', emoji: '🌱' },
      { value: 'few_single', label: 'A few single words', emoji: '🌿' },
      { value: 'many_single', label: 'Many single words', emoji: '🌳' },
      { value: 'short_phrases', label: 'Short phrases', emoji: '💬' },
    ],
  },

  // 4d — Reply pattern (dynamic title)
  {
    type: 'quiz',
    key: 'reply_pattern',
    titleFn: (answers) => {
      const langLabel = {
        english: 'English', mandarin: 'Mandarin', cantonese: 'Cantonese',
        malay: 'Malay', tamil: 'Tamil', other: 'the target language',
      };
      const langs = Array.isArray(answers.target_language)
        ? answers.target_language
        : [answers.target_language];
      const names = langs.map(l => langLabel[l] || l).filter(Boolean);
      const lang = names.length > 1
        ? names.slice(0, -1).join(', ') + ' or ' + names[names.length - 1]
        : (names[0] || 'the target language');
      return `When you speak in ${lang}, your child usually:`;
    },
    subtitle: 'This helps us prioritise the right approach.',
    options: [
      { value: 'english', label: 'Replies in English', emoji: '🔄' },
      { value: 'mixes', label: 'Mixes languages', emoji: '🔀' },
      { value: 'target', label: 'Replies in target language', emoji: '✅' },
      { value: 'rarely', label: 'Rarely replies', emoji: '🤫' },
    ],
  },

  // 4e — Daily time
  {
    type: 'quiz',
    key: 'daily_time_commitment',
    title: 'How many minutes a day can you realistically commit?',
    subtitle: 'Be honest — even 1 minute counts.',
    options: [
      { value: '1-2', label: '1–2 minutes', emoji: '⏱️' },
      { value: '3-5', label: '3–5 minutes', emoji: '⏲️' },
      { value: '5-10', label: '5–10 minutes', emoji: '🕐' },
    ],
  },

  // 5 — Meet Sprouttie
  {
    type: 'intro',
    key: 'meet',
    showLogo: true,
    title: 'Meet Sprouttie 🌱',
    subtitle: 'Your tiny learning companion — helping you turn everyday moments into learning moments.',
    footnote: '✨ Choose how Sprouttie speaks at home — from clear Mandarin to local flavours (coming soon)',
    cta: 'Next',
  },

  // 6 — System overview (merged screen 7) with video placeholder
  {
    type: 'system',
    key: 'system',
    title: 'A system that grows with your child',
    steps: [
      { num: '1', label: 'Add words (or use ready sets)', desc: "Quickly input what matters to your child's daily life" },
      { num: '2', label: 'Capture their voice', desc: 'Record what they say — watch their progress over time' },
      { num: '3', label: 'Continue what works', desc: "Reuse, repeat, or let Sprouttie suggest next week's words" },
    ],
    closeLine: 'Less time prepping.\nMore time connecting.',
    cta: 'Next',
  },

  // 7 — Reassurance Close
  {
    type: 'close',
    key: 'close',
    title: "You're already doing enough.",
    subtitle: 'Sprouttie just helps you make it count.',
    cta: 'Start your 3-minute routine',
  },
];


// ── Component ────────────────────────────────────────────────────────

const PersonaliseFlow = ({ onComplete }) => {
  const { currentUser, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [saving, setSaving] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const [direction, setDirection] = useState(1);

  const current = SCREENS[step];
  const total = SCREENS.length;
  const title = current?.titleFn ? current.titleFn(answers) : current?.title;

  // ── Handlers ─────────────────────────────────────────────────────

  const goNext = () => {
    if (step < total - 1) {
      setDirection(1);
      setStep(s => s + 1);
    }
  };

  const goBack = () => {
    if (step > 0) {
      setDirection(-1);
      setStep(s => s - 1);
    }
  };

  const handleSelect = (value) => {
    const isMulti = current.multi || current.type === 'multi-no-save';

    if (isMulti) {
      const prev = answers[current.key] || [];
      const next = prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value];
      setAnswers({ ...answers, [current.key]: next });
      return;
    }

    // Single-select: save and advance
    setAnswers({ ...answers, [current.key]: value });
    setTimeout(goNext, 200);
  };

  const handleMultiNext = () => {
    if ((answers[current.key] || []).length === 0) return;
    goNext();
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      const targetLang = Array.isArray(answers.target_language)
        ? answers.target_language.join(',')
        : answers.target_language;

      const { error } = await supabase
        .from('profiles')
        .update({
          child_age_band: answers.child_age_band,
          target_language: targetLang,
          speech_level: answers.speech_level,
          reply_pattern: answers.reply_pattern,
          daily_time_commitment: answers.daily_time_commitment,
          onboarding_completed: true,
        })
        .eq('id', currentUser.id);

      if (error) throw error;
      await refreshProfile(currentUser);
      setShowPlan(true);
    } catch (err) {
      console.error('Failed to save onboarding:', err);
      setSaving(false);
    }
  };

  const handleStartWeek = () => {
    onComplete?.();
    navigate('/daily-tracking');
  };

  // ── Animation variants ────────────────────────────────────────────

  const variants = {
    enter: (dir) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir) => ({ x: dir > 0 ? -80 : 80, opacity: 0 }),
  };

  // ── Post-onboarding states ────────────────────────────────────────

  if (showPlan) {
    return <GeneratedPlanView isFirstPlan={true} onStartWeek={handleStartWeek} />;
  }

  if (saving) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[hsl(var(--background))] px-6">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }} className="text-center">
          <img src={sprouttielogo} alt="Sprouttie" className="h-20 mx-auto mb-6 -scale-x-100" />
          <h2 className="text-2xl font-display font-bold text-[hsl(var(--foreground))] mb-2">Your structured plan is ready.</h2>
          <p className="text-[hsl(var(--muted-foreground))] text-sm">Building your first week…</p>
          <div className="mt-6 animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[hsl(var(--sprouttie-green))] mx-auto" />
        </motion.div>
      </div>
    );
  }

  // ── Render helpers ────────────────────────────────────────────────

  const renderOptionButtons = () => (
    <div className="space-y-3">
      {current.options.map((option) => {
        const isMulti = current.multi || current.type === 'multi-no-save';
        const isSelected = isMulti
          ? (answers[current.key] || []).includes(option.value)
          : answers[current.key] === option.value;
        return (
          <motion.button
            key={option.value}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => handleSelect(option.value)}
            className={`
              w-full flex items-center gap-3 px-5 py-4 rounded-xl text-left
              transition-all duration-200 border-2
              ${isSelected
                ? 'border-[hsl(var(--sprouttie-green))] bg-[hsl(var(--sprouttie-green)/0.08)] shadow-md'
                : 'border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:border-[hsl(var(--sprouttie-green)/0.5)]'
              }
            `}
          >
            <span className="text-2xl">{option.emoji}</span>
            <span className={`text-base font-medium ${isSelected ? 'text-[hsl(var(--sprouttie-green-dark))]' : 'text-[hsl(var(--foreground))]'}`}>
              {option.label}
            </span>
            {isMulti && isSelected && <span className="ml-auto text-[hsl(var(--sprouttie-green))]">✓</span>}
          </motion.button>
        );
      })}
    </div>
  );

  const renderMultiNextButton = () => {
    const isMulti = current.multi || current.type === 'multi-no-save';
    if (!isMulti) return null;
    const count = (answers[current.key] || []).length;
    return (
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: count > 0 ? 1 : 0.4 }}
        onClick={handleMultiNext}
        disabled={count === 0}
        className="w-full mt-5 py-3.5 bg-gradient-to-r from-[hsl(var(--sprouttie-green))] to-[hsl(var(--sprouttie-green-dark))] text-white rounded-xl font-semibold transition-all disabled:opacity-40 text-base"
      >
        Next
      </motion.button>
    );
  };

  // ── Screen renderers ──────────────────────────────────────────────

  const renderIntro = () => (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-2">
      {current.showLogo && (
        <img src={sprouttielogo} alt="Sprouttie" className="h-24 mx-auto mb-4 -scale-x-100" />
      )}
      {current.emoji && !current.showLogo && (
        <span className="text-6xl mb-6">{current.emoji}</span>
      )}
      <h1 className="text-3xl font-display font-bold text-[hsl(var(--foreground))] mb-3 whitespace-pre-line leading-tight">
        {title}
      </h1>
      <p className="text-base text-[hsl(var(--muted-foreground))] mb-8 max-w-xs">
        {current.subtitle}
      </p>
      {current.footnote && (
        <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6 max-w-xs italic">
          {current.footnote}
        </p>
      )}
      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={goNext}
        className="w-full max-w-xs py-3.5 bg-gradient-to-r from-[hsl(var(--sprouttie-green))] to-[hsl(var(--sprouttie-green-dark))] text-white rounded-xl font-semibold text-base shadow-lg"
      >
        {current.cta}
      </motion.button>
    </div>
  );

  const renderSystem = () => (
    <div className="flex-1 flex flex-col text-center px-2">
      <h2 className="text-2xl font-display font-bold text-[hsl(var(--foreground))] mb-6">
        {title}
      </h2>

      {/* Video placeholder */}
      <div className="w-full aspect-video rounded-2xl bg-[hsl(var(--muted))] flex items-center justify-center mb-6 border-2 border-dashed border-[hsl(var(--border))]">
        <div className="text-center">
          <span className="text-4xl">🎬</span>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-2">Video placeholder</p>
        </div>
      </div>

      <div className="space-y-4 text-left mb-6">
        {current.steps.map((s) => (
          <div key={s.num} className="flex gap-3 items-start">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[hsl(var(--sprouttie-green)/0.15)] flex items-center justify-center">
              <span className="text-sm font-bold text-[hsl(var(--sprouttie-green-dark))]">{s.num}</span>
            </div>
            <div>
              <p className="font-semibold text-[hsl(var(--foreground))] text-sm">{s.label}</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-base font-medium text-[hsl(var(--foreground))] whitespace-pre-line mb-6 italic">
        {current.closeLine}
      </p>

      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={goNext}
        className="w-full py-3.5 bg-gradient-to-r from-[hsl(var(--sprouttie-green))] to-[hsl(var(--sprouttie-green-dark))] text-white rounded-xl font-semibold text-base shadow-lg"
      >
        {current.cta}
      </motion.button>
    </div>
  );

  const renderClose = () => (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-2">
      <img src={sprouttielogo} alt="Sprouttie" className="h-20 mx-auto mb-6 -scale-x-100" />
      <h1 className="text-3xl font-display font-bold text-[hsl(var(--foreground))] mb-3">
        {title}
      </h1>
      <p className="text-base text-[hsl(var(--muted-foreground))] mb-8 max-w-xs">
        {current.subtitle}
      </p>
      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={handleFinish}
        className="w-full max-w-xs py-3.5 bg-gradient-to-r from-[hsl(var(--sprouttie-green))] to-[hsl(var(--sprouttie-green-dark))] text-white rounded-xl font-semibold text-base shadow-lg"
      >
        👉 {current.cta}
      </motion.button>
    </div>
  );

  const renderQuizOrMulti = () => (
    <div className="flex-1 flex flex-col max-w-md mx-auto w-full">
      <h2 className="text-xl font-display font-bold text-[hsl(var(--foreground))] mb-1 text-center">
        {title}
      </h2>
      <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6 text-center">
        {current.subtitle}
      </p>
      {renderOptionButtons()}
      {renderMultiNextButton()}
    </div>
  );

  const renderScreenContent = () => {
    switch (current.type) {
      case 'intro': return renderIntro();
      case 'close': return renderClose();
      case 'system': return renderSystem();
      case 'quiz':
      case 'multi-no-save':
      default:
        return renderQuizOrMulti();
    }
  };

  // ── Progress bar — group child context steps ──────────────────────
  // Collapse quiz steps (indices 3-7) into one dot
  const progressSections = [
    { label: 'Hook', indices: [0] },
    { label: 'Pain', indices: [1] },
    { label: 'Outcome', indices: [2] },
    { label: 'Your child', indices: [3, 4, 5, 6, 7] },
    { label: 'Meet', indices: [8] },
    { label: 'System', indices: [9] },
    { label: 'Go', indices: [10] },
  ];

  const getProgressFraction = (section) => {
    if (section.indices.every(i => i < step)) return 1;
    if (section.indices.every(i => i > step)) return 0;
    // Partially through this section
    const completed = section.indices.filter(i => i <= step).length;
    return completed / section.indices.length;
  };

  return (
    <div className="min-h-screen flex flex-col bg-[hsl(var(--background))] px-6 py-8">
      {/* Header (only on first screen) */}
      {step === 0 && (
        <div className="text-center mb-2">
          <img src={sprouttielogo} alt="Sprouttie" className="h-14 mx-auto mb-4 -scale-x-100" />
        </div>
      )}

      {/* Progress bar */}
      {step > 0 && (
        <div className="flex items-center justify-center gap-1.5 mb-6">
          {progressSections.map((section, i) => {
            const frac = getProgressFraction(section);
            return (
              <div key={i} className="relative h-1.5 rounded-full overflow-hidden bg-[hsl(var(--muted))] transition-all duration-300"
                style={{ width: section.indices.length > 1 ? '3rem' : '1.5rem' }}
              >
                <div
                  className="absolute inset-y-0 left-0 bg-[hsl(var(--sprouttie-green))] rounded-full transition-all duration-300"
                  style={{ width: `${frac * 100}%` }}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Animated screen content */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={step}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="flex-1 flex flex-col"
        >
          {renderScreenContent()}
        </motion.div>
      </AnimatePresence>

      {/* Back button */}
      {step > 0 && (
        <button
          onClick={goBack}
          className="mt-4 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors self-center"
        >
          ← Back
        </button>
      )}
    </div>
  );
};

export default PersonaliseFlow;
