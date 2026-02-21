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
    title: "What language are you strengthening?",
    subtitle: "We'll tailor word suggestions to this language.",
    options: [
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
    key: 'reply_pattern',
    titleFn: (answers) => {
      const langLabel = {
        mandarin: 'Mandarin', cantonese: 'Cantonese', malay: 'Malay',
        tamil: 'Tamil', other: 'the target language',
      };
      const lang = langLabel[answers.target_language] || 'the target language';
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
    const updated = { ...answers, [current.key]: value };
    setAnswers(updated);

    if (step < totalSteps - 1) {
      setDirection(1);
      setTimeout(() => setStep(step + 1), 200);
    } else {
      // Final step — save to database, then show plan
      setSaving(true);
      try {
        const { error } = await supabase
          .from('profiles')
          .update({
            child_age_band: updated.child_age_band,
            target_language: updated.target_language,
            speech_level: updated.speech_level,
            reply_pattern: updated.reply_pattern,
            daily_time_commitment: updated.daily_time_commitment,
            onboarding_completed: true,
          })
          .eq('id', currentUser.id);

        if (error) throw error;
        await refreshProfile(currentUser);
        // Transition to plan view
        setShowPlan(true);
      } catch (err) {
        console.error('Failed to save onboarding:', err);
        setSaving(false);
      }
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

            <div className="space-y-3">
              {current.options.map((option) => {
                const isSelected = answers[current.key] === option.value;
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
                  </motion.button>
                );
              })}
            </div>
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
