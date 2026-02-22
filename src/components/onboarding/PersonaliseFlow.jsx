import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '../../context/AuthContext';
import GeneratedPlanView from '../planner/GeneratedPlanView';
import { useNavigate } from 'react-router-dom';
import sprouttielogo from '@/assets/sprouttie-logo.png';

const STEPS = [
  {
    key: 'child_age_band',
    title: "How old is your child?",
    subtitle: "This helps us pick the right vocabulary complexity.",
    options: [
      { value: '0-1', label: '0–1', emoji: '👶' },
      { value: '1-2', label: '1–2', emoji: '🧒' },
      { value: '2-3', label: '2–3', emoji: '🗣️' },
      { value: '3-5', label: '3–5', emoji: '📖' },
    ],
  },
  {
    key: 'target_language',
    title: "What language(s) are you strengthening?",
    subtitle: "Select all that apply. Tap again to deselect.",
    multi: true,
    options: [
      { value: 'english', label: 'English', emoji: '🇬🇧' },
      { value: 'mandarin', label: 'Mandarin', emoji: '🇨🇳' },
      { value: 'cantonese', label: 'Cantonese', emoji: '🇭🇰' },
      { value: 'malay', label: 'Malay', emoji: '🇲🇾' },
      { value: 'tamil', label: 'Tamil', emoji: '🇮🇳' },
      { value: 'other', label: 'Other', emoji: '🌏' },
    ],
  },
  {
    key: 'speech_level',
    title: "Does your child say any words yet?",
    subtitle: "This helps us know where to start.",
    options: [
      { value: 'not_yet', label: 'Not yet', emoji: '🌱' },
      { value: 'few_single', label: 'A few single words', emoji: '🌿' },
      { value: 'many_single', label: 'Many single words', emoji: '🌳' },
      { value: 'short_phrases', label: 'Short phrases', emoji: '💬' },
    ],
  },
  {
    key: 'caregivers',
    title: "Who does your child spend the most time with?",
    subtitle: "This helps us pick the right family vocabulary.",
    multi: true,
    options: [
      { value: 'parents', label: 'Parents', emoji: '👨‍👩‍👧' },
      { value: 'grandparents', label: 'Grandparents', emoji: '👴👵' },
      { value: 'nanny_helper', label: 'Nanny / Helper', emoji: '🤱' },
      { value: 'siblings', label: 'Siblings', emoji: '👧👦' },
    ],
  },
  {
    key: 'pets_and_toys',
    title: "Any pets or favourite toys right now?",
    subtitle: "We'll weave these into the first words. Type freely.",
    freeText: true,
    placeholder: "e.g. a dog named Coco, toy cars, a stuffed bunny",
  },
  {
    key: 'daily_activities',
    title: "What fills your child's day?",
    subtitle: "Select what's most common. These shape the first words.",
    multi: true,
    options: [
      { value: 'meals', label: 'Mealtimes', emoji: '🍽️' },
      { value: 'bath', label: 'Bath time', emoji: '🛁' },
      { value: 'park', label: 'Park / Outdoors', emoji: '🌳' },
      { value: 'playgroup', label: 'Playgroup / School', emoji: '🏫' },
      { value: 'reading', label: 'Reading books', emoji: '📚' },
      { value: 'screen', label: 'Screen time', emoji: '📺' },
    ],
  },
  {
    key: 'reply_pattern',
    titleFn: (answers) => {
      const langLabel = {
        english: 'English', mandarin: 'Mandarin', cantonese: 'Cantonese', malay: 'Malay',
        tamil: 'Tamil', other: 'the target language',
      };
      const langs = Array.isArray(answers.target_language) ? answers.target_language : [answers.target_language];
      const names = langs.map(l => langLabel[l] || l).filter(Boolean);
      const lang = names.length > 1 ? names.slice(0, -1).join(', ') + ' or ' + names[names.length - 1] : (names[0] || 'the target language');
      return `When you speak in ${lang}, your child usually:`;
    },
    subtitle: "This helps us prioritise the right approach.",
    options: [
      { value: 'english', label: 'Replies in English', emoji: '🔄' },
      { value: 'mixes', label: 'Mixes languages', emoji: '🔀' },
      { value: 'target', label: 'Replies in target language', emoji: '✅' },
      { value: 'rarely', label: 'Rarely replies', emoji: '🤫' },
    ],
  },
  {
    key: 'daily_time_commitment',
    title: "How many minutes a day can you realistically commit?",
    subtitle: "Be honest — even 1 minute counts.",
    options: [
      { value: '1-2', label: '1–2 minutes', emoji: '⏱️' },
      { value: '3-5', label: '3–5 minutes', emoji: '⏲️' },
      { value: '5-10', label: '5–10 minutes', emoji: '🕐' },
    ],
  },
];

const PersonaliseFlow = ({ onComplete }) => {
  const { currentUser, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [saving, setSaving] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const [direction, setDirection] = useState(1);

  const current = STEPS[step];
  const title = current?.titleFn ? current.titleFn(answers) : current?.title;
  const totalSteps = STEPS.length;

  const handleSelect = async (value) => {
    // Multi-select: toggle values in an array
    if (current.multi) {
      const prev = answers[current.key] || [];
      const next = prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value];
      setAnswers({ ...answers, [current.key]: next });
      return;
    }

    const updated = { ...answers, [current.key]: value };
    setAnswers(updated);

    if (step < totalSteps - 1) {
      setDirection(1);
      setTimeout(() => setStep(step + 1), 200);
    } else {
      await saveAndFinish(updated);
    }
  };

  const handleMultiNext = async () => {
    const selected = answers[current.key] || [];
    if (selected.length === 0) return;

    if (step < totalSteps - 1) {
      setDirection(1);
      setStep(step + 1);
    } else {
      await saveAndFinish(answers);
    }
  };

  const handleFreeTextNext = async () => {
    if (step < totalSteps - 1) {
      setDirection(1);
      setStep(step + 1);
    } else {
      await saveAndFinish(answers);
    }
  };

  const saveAndFinish = async (finalAnswers) => {
    setSaving(true);
    try {
      // For multi-select, join as comma-separated string for DB storage
      const targetLang = Array.isArray(finalAnswers.target_language)
        ? finalAnswers.target_language.join(',')
        : finalAnswers.target_language;

      const caregivers = Array.isArray(finalAnswers.caregivers)
        ? finalAnswers.caregivers.join(',')
        : finalAnswers.caregivers || null;

      const dailyActivities = Array.isArray(finalAnswers.daily_activities)
        ? finalAnswers.daily_activities.join(',')
        : finalAnswers.daily_activities || null;

      const { error } = await supabase
        .from('profiles')
        .update({
          child_age_band: finalAnswers.child_age_band,
          target_language: targetLang,
          speech_level: finalAnswers.speech_level,
          reply_pattern: finalAnswers.reply_pattern,
          daily_time_commitment: finalAnswers.daily_time_commitment,
          caregivers: caregivers,
          pets_and_toys: finalAnswers.pets_and_toys || null,
          daily_activities: dailyActivities,
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

  const handleBack = () => {
    if (step > 0) {
      setDirection(-1);
      setStep(step - 1);
    }
  };

  const handleStartWeek = () => {
    onComplete?.();
    navigate('/daily-tracking');
  };

  const variants = {
    enter: (dir) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir) => ({ x: dir > 0 ? -80 : 80, opacity: 0 }),
  };

  // Show generated plan after onboarding
  if (showPlan) {
    return (
      <GeneratedPlanView
        isFirstPlan={true}
        onStartWeek={handleStartWeek}
      />
    );
  }

  // Saving / transition state
  if (saving) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[hsl(var(--background))] px-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <img src={sprouttielogo} alt="Sprouttie" className="h-20 mx-auto mb-6 -scale-x-100" />
          <h2 className="text-2xl font-display font-bold text-[hsl(var(--foreground))] mb-2">
            Your structured plan is ready.
          </h2>
          <p className="text-[hsl(var(--muted-foreground))] text-sm">
            Building your first week…
          </p>
          <div className="mt-6 animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[hsl(var(--sprouttie-green))] mx-auto"></div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[hsl(var(--background))] px-6 py-8">
      {/* Header */}
      <div className="text-center mb-2">
        <img src={sprouttielogo} alt="Sprouttie" className="h-14 mx-auto mb-4 -scale-x-100" />
        {step === 0 && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-base font-medium text-[hsl(var(--foreground))] mb-1"
          >
            Let's personalise Sprouttie for your child.
          </motion.p>
        )}
      </div>

      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i <= step
                ? 'w-8 bg-[hsl(var(--sprouttie-green))]'
                : 'w-4 bg-[hsl(var(--muted))]'
            }`}
          />
        ))}
        <span className="ml-2 text-xs text-[hsl(var(--muted-foreground))]">
          {step + 1} of {totalSteps}
        </span>
      </div>

      {/* Question */}
      <div className="flex-1 flex flex-col max-w-md mx-auto w-full">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="flex-1"
          >
            <h2 className="text-xl font-display font-bold text-[hsl(var(--foreground))] mb-1 text-center">
              {title}
            </h2>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6 text-center">
              {current.subtitle}
            </p>

            {/* Free text input step */}
            {current.freeText ? (
              <div className="space-y-4">
                <textarea
                  value={answers[current.key] || ''}
                  onChange={(e) => setAnswers({ ...answers, [current.key]: e.target.value })}
                  placeholder={current.placeholder}
                  maxLength={300}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border-2 border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] text-base font-medium resize-none focus:border-[hsl(var(--sprouttie-green))] focus:outline-none transition-colors"
                />
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={handleFreeTextNext}
                  className="w-full py-3 bg-gradient-to-r from-[hsl(var(--sprouttie-green))] to-[hsl(var(--sprouttie-green-dark))] text-white rounded-xl font-semibold transition-all"
                >
                  {(answers[current.key] || '').trim() ? 'Next' : 'Skip'}
                </motion.button>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {current.options.map((option) => {
                    const isSelected = current.multi
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
                        <span className={`text-base font-medium ${
                          isSelected ? 'text-[hsl(var(--sprouttie-green-dark))]' : 'text-[hsl(var(--foreground))]'
                        }`}>
                          {option.label}
                        </span>
                        {current.multi && isSelected && (
                          <span className="ml-auto text-[hsl(var(--sprouttie-green))]">✓</span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                {/* Next button for multi-select steps */}
                {current.multi && (
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: (answers[current.key] || []).length > 0 ? 1 : 0.4 }}
                    onClick={handleMultiNext}
                    disabled={(answers[current.key] || []).length === 0}
                    className="w-full mt-5 py-3 bg-gradient-to-r from-[hsl(var(--sprouttie-green))] to-[hsl(var(--sprouttie-green-dark))] text-white rounded-xl font-semibold transition-all disabled:opacity-40"
                  >
                    Next
                  </motion.button>
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Back button */}
        {step > 0 && (
          <button
            onClick={handleBack}
            className="mt-6 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors self-center"
          >
            ← Back
          </button>
        )}
      </div>
    </div>
  );
};

export default PersonaliseFlow;
