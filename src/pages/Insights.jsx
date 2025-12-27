import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen, Brain, RefreshCw, Monitor, Globe2, Lightbulb, Palette, Eye, Type, Layers } from 'lucide-react';

const Insights = () => {
  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.5 }
  };

  const PracticeBox = ({ children }) => (
    <div className="bg-sprouttie-mint/30 border-l-4 border-sprouttie-green rounded-r-lg p-4 my-6">
      <p className="text-sm font-medium text-sprouttie-green-dark mb-2">What this means in practice</p>
      <div className="text-gray-700 text-sm space-y-1">{children}</div>
    </div>
  );

  const SectionDivider = () => (
    <div className="flex items-center justify-center py-8">
      <div className="w-16 h-px bg-gray-200" />
      <div className="w-2 h-2 bg-sprouttie-green/30 rounded-full mx-4" />
      <div className="w-16 h-px bg-gray-200" />
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img 
              src="/images/sprouttie-mascot.png" 
              alt="Sprouttie" 
              className="h-8 w-8"
            />
            <span className="text-lg font-semibold text-gray-800">Sprouttie</span>
          </Link>
          <Link
            to="/"
            className="flex items-center gap-2 text-gray-600 hover:text-sprouttie-green-dark transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </nav>

      {/* Header */}
      <header className="pt-28 pb-12 px-4 sm:px-6 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-3xl mx-auto">
          <motion.div {...fadeInUp}>
            <p className="text-sm text-gray-500 uppercase tracking-wide mb-4">Research & Insights</p>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight mb-4">
              Learning Consistency, Cognitive Load, and Early Retention: Key Insights Behind Sprouttie
            </h1>
            <p className="text-lg text-gray-600">
              A practical summary of research that informs how Sprouttie is designed.
            </p>
          </motion.div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 sm:px-6 pb-16">
        <article className="max-w-3xl mx-auto">
          
          {/* Section 1: Introduction */}
          <motion.section {...fadeInUp} className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-gray-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Why This Page Exists</h2>
            </div>
            
            <div className="text-gray-700 space-y-4">
              <p>
                Sprouttie is built around observed friction in real households — the everyday challenges parents face when trying to maintain learning routines alongside work, caregiving, and daily life.
              </p>
              <p>
                This page summarizes research and widely accepted findings that support a consistency-first, low-friction approach to early learning. The goal here is understanding, not persuasion.
              </p>
              <p>
                We hope this serves as a useful reference for parents, educators, and anyone interested in the thinking behind Sprouttie's design choices.
              </p>
            </div>
          </motion.section>

          <SectionDivider />

          {/* Section 2: Consistency vs Intensity */}
          <motion.section {...fadeInUp} className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-amber-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Consistency vs Intensity in Early Learning</h2>
            </div>
            
            <div className="text-gray-700 space-y-4">
              <p>
                Research in learning science consistently shows that repeated exposure over time leads to better retention than long, infrequent sessions. This principle applies to learners of all ages.
              </p>
              <p>
                Spaced repetition — the practice of reviewing material at increasing intervals — has been shown to improve recall and support long-term memory formation. This effect has been documented in studies involving both children and adults across various types of learning material.
              </p>
              <p>
                Short sessions, often as brief as one to five minutes, can be effective when repeated regularly. The key factor is not the length of any single session, but the cumulative effect of consistent, distributed practice.
              </p>
              
              <blockquote className="border-l-4 border-gray-200 pl-4 italic text-gray-600 my-6">
                "Across multiple studies in learning science, frequency and spacing consistently outperform duration."
              </blockquote>
            </div>

            <PracticeBox>
              <p>• Missing days does not erase progress</p>
              <p>• Restarting matters more than maintaining streaks</p>
              <p>• Brief, regular sessions compound over time</p>
            </PracticeBox>
          </motion.section>

          <SectionDivider />

          {/* Section 3: Cognitive Load and Decision Fatigue */}
          <motion.section {...fadeInUp} className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-violet-50 rounded-lg flex items-center justify-center">
                <Brain className="w-5 h-5 text-violet-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Cognitive Load and Decision Fatigue in Parents</h2>
            </div>
            
            <div className="text-gray-700 space-y-4">
              <p>
                Decision fatigue is a well-documented phenomenon where the quality of decisions deteriorates after making many choices. For parents managing households, this effect is particularly relevant.
              </p>
              <p>
                Parents make hundreds of decisions daily — about meals, schedules, safety, emotional needs, logistics, and more. This accumulates significant cognitive load, leaving less mental energy for activities that require planning or setup.
              </p>
              <p>
                Tools that require extensive configuration, ongoing choices, or regular decision-making are more likely to be abandoned. The effort required to use them becomes a barrier, even when the tool itself is valuable.
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-5 my-6">
              <p className="text-sm font-medium text-gray-900 mb-3">Key observations from research:</p>
              <ul className="text-gray-700 text-sm space-y-2">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                  Parents report significantly higher daily decision burden compared to non-parents
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                  Higher cognitive load correlates with lower habit consistency
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                  Simplicity in tools is a predictor of sustained use
                </li>
              </ul>
            </div>

            <PracticeBox>
              <p>• Systems should reduce choices, not add them</p>
              <p>• Simpler tools are more likely to be reused</p>
              <p>• Low-friction design respects limited mental bandwidth</p>
            </PracticeBox>
          </motion.section>

          <SectionDivider />

          {/* Section 4: Habit Formation and Restartability */}
          <motion.section {...fadeInUp} className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-emerald-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Habit Formation and Restartability</h2>
            </div>
            
            <div className="text-gray-700 space-y-4">
              <p>
                Habit formation is a non-linear process. Contrary to popular claims about fixed timelines (such as "21 days to form a habit"), research suggests that habit development varies widely between individuals and behaviors.
              </p>
              <p>
                Gaps and breaks are normal parts of any long-term practice. Systems that accommodate these interruptions — rather than penalizing them — tend to support more sustainable behavior over time.
              </p>
              <p>
                Guilt and perceived "failure" have been shown to reduce re-engagement. When someone feels they have "broken" a streak or fallen behind, they are less likely to return to the practice. This creates a paradox where streak-based motivation can ultimately undermine consistency.
              </p>
              <p>
                Restart-friendly systems, which make it easy to pick up where you left off without judgment, have been associated with higher long-term engagement in behavioral studies.
              </p>
            </div>

            <div className="bg-sprouttie-mint/20 rounded-lg p-5 my-6">
              <p className="text-sm font-medium text-gray-900 mb-2">How this informs Sprouttie's design:</p>
              <ul className="text-gray-700 text-sm space-y-2">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-sprouttie-green rounded-full mt-2 flex-shrink-0" />
                  No streak pressure
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-sprouttie-green rounded-full mt-2 flex-shrink-0" />
                  No penalty for stopping
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-sprouttie-green rounded-full mt-2 flex-shrink-0" />
                  Neutral, calm interaction model
                </li>
              </ul>
            </div>
          </motion.section>

          <SectionDivider />

          {/* Section 5: Screen Time and Learning Context */}
          <motion.section {...fadeInUp} className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-sky-50 rounded-lg flex items-center justify-center">
                <Monitor className="w-5 h-5 text-sky-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Screen Time and Learning Context</h2>
            </div>
            
            <div className="text-gray-700 space-y-4">
              <p>
                Research and pediatric guidance generally distinguish between passive screen exposure and guided, interactive, or physical learning experiences. These contexts appear to support different types of engagement and development.
              </p>
              <p>
                Printed or physical materials have been associated with shared attention and interpersonal interaction — particularly valuable in early learning settings where caregiver involvement enhances outcomes.
              </p>
              <p>
                Many parents express a preference for low-screen tools when it comes to early learning, seeking alternatives that do not require extended device use by their children.
              </p>
            </div>

            <PracticeBox>
              <p>• Sprouttie is not anti-technology</p>
              <p>• Technology is used to reduce preparation effort, not replace human interaction</p>
              <p>• The output is physical cards for offline, shared learning moments</p>
            </PracticeBox>
          </motion.section>

          <SectionDivider />

          {/* Section 6: Multilingual Exposure */}
          <motion.section {...fadeInUp} className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                <Globe2 className="w-5 h-5 text-orange-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Multilingual Exposure and Early Language Familiarity</h2>
            </div>
            
            <div className="text-gray-700 space-y-4">
              <p>
                Research in early language development suggests that exposure to multiple languages during early childhood supports phonetic awareness — the ability to distinguish and recognize the sounds of different languages.
              </p>
              <p>
                This familiarity does not require mastery or formal instruction. Even brief, consistent exposure can contribute to long-term language confidence and reduced inhibition around unfamiliar languages later in life.
              </p>
              <p>
                Flashcards and similar tools support recognition and familiarity, not fluency. They are one part of a broader, cumulative, and contextual process of language learning.
              </p>
            </div>

            <PracticeBox>
              <p>• Early exposure builds comfort, not necessarily fluency</p>
              <p>• Language learning is cumulative over years, not weeks</p>
              <p>• Flashcards support recognition as part of a larger ecosystem</p>
            </PracticeBox>
          </motion.section>

          <SectionDivider />

          {/* Section 7: Summary */}
          <motion.section {...fadeInUp} className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-sprouttie-green-light rounded-lg flex items-center justify-center">
                <Lightbulb className="w-5 h-5 text-sprouttie-green-dark" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Summary: Design Principles Informed by Research</h2>
            </div>
            
            <div className="text-gray-700 space-y-4">
              <p>
                The research summarized on this page points toward a set of principles that inform how Sprouttie is designed:
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-6 my-6">
              <ul className="space-y-4">
                {[
                  { title: 'Consistency over intensity', desc: 'Regular, brief sessions are more effective than occasional long ones' },
                  { title: 'Reduced cognitive load', desc: 'Fewer decisions means more sustainable use' },
                  { title: 'Restartability over perfection', desc: 'Easy re-entry matters more than unbroken streaks' },
                  { title: 'Calm tools support long-term use', desc: 'Neutral, non-judgmental interfaces encourage return' },
                  { title: 'Learning environments matter', desc: 'Context and interaction are as important as content' }
                ].map((item, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="w-6 h-6 bg-sprouttie-green/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="w-2 h-2 bg-sprouttie-green rounded-full" />
                    </span>
                    <div>
                      <span className="font-medium text-gray-900">{item.title}</span>
                      <span className="text-gray-600"> — {item.desc}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-gray-700 text-center italic mt-8">
              "Sprouttie is designed around these principles, not as rules — but as support."
            </p>
          </motion.section>

          <SectionDivider />

          {/* Appendix: Colour & Visual Design */}
          <motion.section {...fadeInUp} className="mb-8">
            <div className="bg-gray-50 rounded-xl p-6 mb-6">
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Appendix</p>
              <h2 className="text-2xl font-semibold text-gray-900">
                Colour & Visual Design Rationale in Early Learning Materials
              </h2>
              <p className="text-gray-600 mt-2 text-sm">
                This appendix explains the visual and colour-related considerations that inform Sprouttie's design options. It is intended as a reference for parents, educators, and practitioners who want to understand how colour, contrast, and visual simplicity interact with early learning and attention.
              </p>
            </div>

            {/* A. Why Visual Design Matters */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-pink-50 rounded-lg flex items-center justify-center">
                  <Eye className="w-4 h-4 text-pink-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">A. Why Visual Design Matters in Early Learning</h3>
              </div>
              
              <div className="text-gray-700 space-y-4">
                <p>
                  Before children understand symbols as language, they process them as visual information. Early learning relies heavily on:
                </p>
                <ul className="space-y-2 ml-4">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                    Attention capture
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                    Visual discrimination
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                    Pattern recognition
                  </li>
                </ul>
                <p>
                  At this stage, how information looks can influence whether it is noticed at all. Visual design does not create learning on its own, but it can support attention, reduce visual noise, and make exposure more repeatable.
                </p>
              </div>
            </div>

            {/* B. Colour, Contrast, and Visual Salience */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
                  <Layers className="w-4 h-4 text-indigo-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">B. Colour, Contrast, and Visual Salience</h3>
              </div>
              
              <div className="text-gray-700 space-y-4">
                <p>
                  <strong>What is visual salience?</strong> Visual salience refers to how strongly an object stands out from its background. In early development, the visual system responds more readily to:
                </p>
                <ul className="space-y-2 ml-4">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                    High contrast
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                    Clear edges
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                    Strong colour differentiation
                  </li>
                </ul>
                <p>
                  This is especially relevant for infants and toddlers whose visual acuity is still developing.
                </p>
              </div>
            </div>

            {/* C. Why Red Text Is Often Used */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
                  <Type className="w-4 h-4 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">C. Why Red Text Is Often Used in Early Exposure</h3>
              </div>
              
              <div className="text-gray-700 space-y-4">
                <p>
                  Research in early visual perception and developmental psychology suggests that bright, high-contrast colours are detected earlier than darker tones. Red, in particular, is visually salient against light backgrounds. Strong colour contrast can draw attention before symbolic meaning is understood.
                </p>
                <p>
                  In early stages, colour acts as a perceptual cue, helping children notice shapes and patterns that later become associated with meaning.
                </p>
              </div>

              <div className="bg-amber-50 border-l-4 border-amber-400 rounded-r-lg p-4 my-4">
                <p className="text-sm font-medium text-amber-800 mb-1">Important clarification</p>
                <ul className="text-amber-700 text-sm space-y-1">
                  <li>• Red text does not "teach" reading</li>
                  <li>• It supports attention and recognition, which precede reading</li>
                </ul>
              </div>
            </div>

            {/* D. The Role of Black Text */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Type className="w-4 h-4 text-gray-700" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">D. The Role of Black Text in Later Recall</h3>
              </div>
              
              <div className="text-gray-700 space-y-4">
                <p>
                  As children develop, visual acuity improves, symbol recognition becomes more abstract, and cognitive processing shifts from perceptual cues to meaning-based interpretation.
                </p>
                <p>
                  At this stage, black text becomes more effective for recall. Reduced colour variation lowers distraction, and text presentation more closely resembles real-world reading materials.
                </p>
                <p>
                  Black text supports transfer of recognition to books and signs, generalisation beyond learning materials, and recall based on meaning rather than visual novelty.
                </p>
                <p className="italic text-gray-600">
                  This transition is not tied to a fixed age. It depends on the child's developmental readiness and familiarity with symbols.
                </p>
              </div>
            </div>

            {/* E. Exposure First, Fluency Later */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-teal-50 rounded-lg flex items-center justify-center">
                  <Layers className="w-4 h-4 text-teal-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">E. Exposure First, Fluency Later</h3>
              </div>
              
              <div className="text-gray-700 space-y-4">
                <p>
                  From a learning design perspective, colour and visual simplicity support different phases:
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 my-4">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <p className="font-medium text-gray-900 mb-2">Early phase</p>
                  <p className="text-sm text-gray-600 mb-2"><strong>Goal:</strong> Familiarity and recognition</p>
                  <p className="text-sm text-gray-600"><strong>Helpful features:</strong> High contrast, visual clarity</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <p className="font-medium text-gray-900 mb-2">Later phase</p>
                  <p className="text-sm text-gray-600 mb-2"><strong>Goal:</strong> Recall and generalisation</p>
                  <p className="text-sm text-gray-600"><strong>Helpful features:</strong> Neutral presentation, reduced cues</p>
                </div>
              </div>

              <p className="text-gray-700">
                The purpose of early materials is not fluency, but comfort and familiarity with symbols.
              </p>
            </div>

            {/* F. Avoiding Overstimulation */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
                  <Eye className="w-4 h-4 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">F. Avoiding Overstimulation</h3>
              </div>
              
              <div className="text-gray-700 space-y-4">
                <p>
                  While colour can support attention, excessive visual elements can increase cognitive load, reduce focus, and make materials harder to reuse.
                </p>
                <p>
                  Effective early learning materials tend to share these traits:
                </p>
                <ul className="space-y-2 ml-4">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                    Limited colour palette
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                    Clear typography
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                    Minimal decoration
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                    Consistent layout
                  </li>
                </ul>
                <p>
                  Visual calm supports repeat use and shared attention between adult and child.
                </p>
              </div>
            </div>

            {/* G. Sprouttie's Design Position */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-sprouttie-green-light rounded-lg flex items-center justify-center">
                  <Palette className="w-4 h-4 text-sprouttie-green-dark" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">G. Sprouttie's Design Position</h3>
              </div>
              
              <div className="text-gray-700 space-y-4">
                <p>
                  Sprouttie does not enforce a single visual standard. Instead, it is designed to:
                </p>
                <ul className="space-y-2 ml-4">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-sprouttie-green rounded-full mt-2 flex-shrink-0" />
                    Allow flexibility in presentation
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-sprouttie-green rounded-full mt-2 flex-shrink-0" />
                    Support different stages of development
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-sprouttie-green rounded-full mt-2 flex-shrink-0" />
                    Let parents adjust materials as familiarity grows
                  </li>
                </ul>
                <p>
                  The system focuses on clarity over decoration, simplicity over novelty, and adaptability over prescription. This reflects the broader principle that learning tools should adapt to families, not the other way around.
                </p>
              </div>
            </div>

            {/* H. Key Takeaways */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">H. Key Takeaways</h3>
              <ul className="space-y-3">
                {[
                  'Colour supports attention, not learning by itself',
                  'Red and high-contrast visuals can aid early recognition',
                  'Black text supports later recall and transfer',
                  'Visual simplicity reduces cognitive load',
                  'Flexibility allows materials to grow with the child'
                ].map((item, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="w-6 h-6 bg-sprouttie-green/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="w-2 h-2 bg-sprouttie-green rounded-full" />
                    </span>
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
              <p className="text-gray-600 text-sm mt-6 italic">
                This appendix exists to clarify design intent, not to prescribe usage. Parents and educators are encouraged to observe, adjust, and respond to each child's needs over time.
              </p>
            </div>
          </motion.section>

        </article>
      </main>

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-6 border-t border-gray-100 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
            <p>© {new Date().getFullYear()} Sprouttie. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <Link to="/about" className="hover:text-gray-700 transition-colors">About</Link>
              <Link to="/terms" className="hover:text-gray-700 transition-colors">Terms</Link>
              <Link to="/privacy" className="hover:text-gray-700 transition-colors">Privacy</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Insights;
