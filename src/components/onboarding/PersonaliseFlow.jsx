import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '../../context/AuthContext';
import GeneratedPlanView from '../planner/GeneratedPlanView';
import { useNavigate } from 'react-router-dom';

export default function PersonaliseFlow({ onComplete }) {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({ child_age_band: '', target_language: 'mandarin', speech_level: '', reply_pattern: 'english', child_interests: '', daily_time_commitment: '1-2', words: '' });
  const [saving, setSaving] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const [error, setError] = useState('');
  const field = (key) => ({ value: answers[key], onChange: (e) => setAnswers({ ...answers, [key]: e.target.value }) });
  const save = async (event) => {
    event.preventDefault(); setSaving(true); setError('');
    try {
      const { words, ...profile } = answers;
      const { error: saveError } = await supabase.from('profiles').update(profile).eq('id', currentUser.id);
      if (saveError) throw saveError;
      const known = [...new Set(words.split(',').map(w => w.trim()).filter(Boolean))].slice(0, 5);
      if (known.length) {
        const { error: wordError } = await supabase.from('spoken_words').insert(known.map(word => ({ user_id: currentUser.id, word })));
        if (wordError) throw wordError;
      }
      // Keep onboarding mounted until the parent has actually seen the plan.
      setShowPlan(true);
    } catch { setError('Could not save your setup. Your answers are still here. Please try again.'); }
    finally { setSaving(false); }
  };
  const finish = async () => {
    setSaving(true); setError('');
    const { error: saveError } = await supabase.from('profiles').update({ onboarding_completed: true }).eq('id', currentUser.id);
    if (saveError) { setSaving(false); setError('Could not finish setup. Please try again.'); return; }
    await onComplete?.();
    navigate('/daily-tracking');
  };
  if (showPlan) return <><GeneratedPlanView isFirstPlan onStartWeek={finish} onBack={() => setShowPlan(false)} />{error && <p role="alert" className="p-4 text-red-700">{error}</p>}</>;
  const select = (key, label, options) => <label className="block mb-5 text-sm font-medium">{label}<select required {...field(key)} className="block mt-2 w-full rounded-xl border border-[#E4D6BF] bg-white p-3">{options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>;
  return <main className="max-w-md mx-auto px-5 py-8 text-[#263136]">
    <p className="text-sm text-[#296549] mb-2">Step {step + 1} of 2</p>
    <h1 className="font-display text-3xl mb-3">A small start for your family.</h1>
    <p className="text-sm mb-6">Tell us where your child is now. Sprouttie will suggest five words for your week.</p>
    <form onSubmit={step === 0 ? (e) => { e.preventDefault(); setStep(1); } : save}>
      {step === 0 ? <>
        {select('child_age_band', 'How old is your child?', [['','Choose an age'],['0-1','Under 1'],['1-2','1 to 2'],['2-3','2 to 3'],['3-5','3 to 5']])}
        {select('target_language', 'Which language would you like to use more?', [['mandarin','Mandarin'],['english','English'],['cantonese','Cantonese'],['malay','Malay'],['tamil','Tamil'],['other','Another language']])}
        {select('speech_level', 'What does your child say at the moment?', [['','Choose a starting point'],['not_yet','No words yet'],['few_single','A few single words'],['many_single','Many single words'],['short_phrases','Short phrases']])}
      </> : <>
        {select('reply_pattern', 'When you use that language, your child usually:', [['english','Replies in English'],['mixes','Mixes languages'],['target','Replies in that language'],['rarely','Does not reply yet']])}
        <label className="block mb-5 text-sm font-medium">What are they interested in? (optional)<input {...field('child_interests')} maxLength={300} placeholder="For example: buses, blueberries, the cat" className="block mt-2 w-full rounded-xl border p-3" /></label>
        {answers.speech_level !== 'not_yet' && <label className="block mb-5 text-sm font-medium">A few words they already say, in any language (optional)<input {...field('words')} maxLength={200} placeholder="For example: bus, 猫, more" className="block mt-2 w-full rounded-xl border p-3" /></label>}
        <p className="text-sm mb-5">We will start small. You can change your preferences later.</p>
      </>}
      {error && <p role="alert" className="mb-4 text-red-700 text-sm">{error}</p>}
      <button disabled={saving} className="btn-primary w-full rounded-xl p-3 font-semibold">{saving ? 'Saving…' : step === 0 ? 'Next' : "See this week's five words"}</button>
      {step === 1 && <button type="button" onClick={() => setStep(0)} className="w-full mt-3 p-3 text-sm">Back</button>}
    </form>
  </main>;
}
