import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen, Brain, RefreshCw, Monitor, Globe2, Lightbulb, Eye } from 'lucide-react';

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
              Key Insights Behind Sprouttie
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
          
          {/* Section 1: Why This Page Exists */}
          <motion.section {...fadeInUp} className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-gray-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">1. Why This Page Exists</h2>
            </div>
            
            <div className="text-gray-700 space-y-4">
              <p>
                Sprouttie was built after observing a recurring pattern in real households: parents care deeply about learning, but struggle to sustain routines amid work, caregiving, and competing demands.
              </p>
              <p>
                This page summarises widely accepted findings from early learning research, habit formation, and cognitive psychology that support a consistency-first, low-friction approach to learning tools.
              </p>
              <p>
                The purpose of this page is understanding, not persuasion. It explains the principles that inform Sprouttie's design so parents, educators, and future consultation clients can evaluate them thoughtfully.
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
              <h2 className="text-xl font-semibold text-gray-900">2. Consistency vs Intensity in Early Learning</h2>
            </div>
            
            <div className="text-gray-700 space-y-4">
              <p>
                Across learning science, one finding appears repeatedly:
              </p>
              <p className="font-medium text-gray-900">
                Short, repeated exposure over time leads to stronger retention than long, infrequent sessions.
              </p>
              <p>Key insights include:</p>
              <ul className="space-y-2 ml-4">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                  Repetition spaced across days improves long-term recall
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                  Learning benefits from frequency more than duration
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                  Even brief exposure (1–5 minutes) can be effective when repeated
                </li>
              </ul>
              <p>
                This pattern is observed in both children and adults, across language learning, reading recognition, and memory formation.
              </p>
            </div>

            <PracticeBox>
              <p>• Missing days does not erase progress</p>
              <p>• Restarting matters more than maintaining perfect streaks</p>
              <p>• Sustainable learning depends on how easily a routine can resume</p>
            </PracticeBox>
          </motion.section>

          <SectionDivider />

          {/* Section 3: Cognitive Load and Decision Fatigue */}
          <motion.section {...fadeInUp} className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-violet-50 rounded-lg flex items-center justify-center">
                <Brain className="w-5 h-5 text-violet-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">3. Cognitive Load and Decision Fatigue in Parents</h2>
            </div>
            
            <div className="text-gray-700 space-y-4">
              <p>
                Cognitive psychology shows that decision fatigue reduces follow-through — especially in routine-based activities.
              </p>
              <p>Parents:</p>
              <ul className="space-y-2 ml-4">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                  Make hundreds of decisions daily
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                  Carry higher ongoing cognitive load than non-parents
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                  Are more likely to abandon routines that require planning, configuration, or constant choice
                </li>
              </ul>
              <p>Tools that demand:</p>
              <ul className="space-y-2 ml-4">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                  Scheduling decisions
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                  Daily optimisation
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                  Complex setup
                </li>
              </ul>
              <p>are more likely to be discontinued over time.</p>
            </div>

            <PracticeBox>
              <p>• Systems should reduce decisions, not add them</p>
              <p>• Simpler tools are more likely to be reused</p>
              <p>• Familiar, repeatable formats lower mental resistance</p>
            </PracticeBox>
          </motion.section>

          <SectionDivider />

          {/* Section 4: Habit Formation and Restartability */}
          <motion.section {...fadeInUp} className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-emerald-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">4. Habit Formation and Restartability</h2>
            </div>
            
            <div className="text-gray-700 space-y-4">
              <p>
                Research on habit formation consistently shows that:
              </p>
              <ul className="space-y-2 ml-4">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                  Habits are non-linear
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                  Breaks are normal
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                  Long-term consistency depends on how easily a habit can restart
                </li>
              </ul>
              <p>When systems rely on:</p>
              <ul className="space-y-2 ml-4">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                  Streaks
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                  Penalties
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                  Binary success/failure framing
                </li>
              </ul>
              <p>users experience guilt after lapses, which reduces re-engagement.</p>
              <p>Restart-friendly systems perform better over time because they:</p>
              <ul className="space-y-2 ml-4">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                  Remove emotional friction
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                  Lower the cost of returning
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                  Emphasise continuation over perfection
                </li>
              </ul>
            </div>

            <div className="bg-sprouttie-mint/20 rounded-lg p-5 my-6">
              <p className="text-sm font-medium text-gray-900 mb-2">Sprouttie reflects this by:</p>
              <ul className="text-gray-700 text-sm space-y-2">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-sprouttie-green rounded-full mt-2 flex-shrink-0" />
                  Avoiding streak pressure
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-sprouttie-green rounded-full mt-2 flex-shrink-0" />
                  Treating pauses as neutral
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-sprouttie-green rounded-full mt-2 flex-shrink-0" />
                  Supporting flexible, parent-led pacing
                </li>
              </ul>
            </div>
          </motion.section>

          <SectionDivider />

          {/* Section 5: Visual Salience and Early Word Recognition */}
          <motion.section {...fadeInUp} className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                <Eye className="w-5 h-5 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">5. Visual Salience and Early Word Recognition</h2>
            </div>
            
            <p className="text-sm text-gray-500 mb-4">(Why Colour Matters)</p>

            <div className="text-gray-700 space-y-4">
              <p>
                Early visual processing research shows that colour contrast and salience affect attention and recognition in young children.
              </p>
              
              <h3 className="text-lg font-medium text-gray-900 mt-6 mb-3">Red words and early recognition</h3>
              <p>
                Findings from visual cognition and early literacy studies suggest:
              </p>
              <ul className="space-y-2 ml-4">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                  High-contrast colours, especially red on white, are more visually salient to infants and toddlers
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                  Red is detected earlier by the developing visual system than darker colours
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                  Bright colours draw attention and support early recognition before full symbolic understanding develops
                </li>
              </ul>
              <p>
                For very young children, colour acts as a perceptual cue, helping them notice and differentiate symbols before meaning is fully formed.
              </p>
              <p className="italic text-gray-600">
                This does not mean colour causes learning — it supports attention and exposure, which are prerequisites for learning.
              </p>

              <h3 className="text-lg font-medium text-gray-900 mt-6 mb-3">Transition to black text and recall</h3>
              <p>As children grow:</p>
              <ul className="space-y-2 ml-4">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                  Visual acuity improves
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                  Symbol recognition becomes more abstract
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                  Cognitive processing shifts from perceptual cues to symbolic meaning
                </li>
              </ul>
              <p>Research and classroom observations indicate that:</p>
              <ul className="space-y-2 ml-4">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                  Black text becomes more effective for recall once children begin associating symbols with meaning, not just visual contrast
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                  This transition often aligns with emerging reading readiness, rather than a fixed age
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                  Black text reduces distraction and supports generalisation to real-world reading materials
                </li>
              </ul>
            </div>

            <PracticeBox>
              <p>• Colour can support early exposure</p>
              <p>• Black text supports later recall and transfer</p>
              <p>• The goal is familiarity first, fluency later</p>
            </PracticeBox>

            <p className="text-gray-700 mt-4">
              Sprouttie accommodates this progression by allowing flexible presentation choices rather than enforcing a single format.
            </p>
          </motion.section>

          <SectionDivider />

          {/* Section 6: Screen Time and Learning Context */}
          <motion.section {...fadeInUp} className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-sky-50 rounded-lg flex items-center justify-center">
                <Monitor className="w-5 h-5 text-sky-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">6. Screen Time and Learning Context</h2>
            </div>
            
            <div className="text-gray-700 space-y-4">
              <p>
                Widely accepted guidance distinguishes between:
              </p>
              <ul className="space-y-2 ml-4">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                  Passive screen exposure
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                  Guided, physical, or interpersonal learning
                </li>
              </ul>
              <p>Printed and physical materials:</p>
              <ul className="space-y-2 ml-4">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                  Support shared attention
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                  Encourage interaction
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                  Reduce sensory overload
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                  Fit more naturally into daily routines
                </li>
              </ul>
              <p>
                Sprouttie is not anti-technology. Technology is used to reduce preparation effort, not replace human interaction.
              </p>
              <p>The learning moment remains:</p>
              <ul className="space-y-2 ml-4">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                  Parent-led
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                  Contextual
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                  Relational
                </li>
              </ul>
            </div>
          </motion.section>

          <SectionDivider />

          {/* Section 7: Multilingual Exposure */}
          <motion.section {...fadeInUp} className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                <Globe2 className="w-5 h-5 text-orange-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">7. Multilingual Exposure and Early Language Familiarity</h2>
            </div>
            
            <div className="text-gray-700 space-y-4">
              <p>
                Research on multilingual development shows:
              </p>
              <ul className="space-y-2 ml-4">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                  Early exposure supports phonetic awareness
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                  Familiarity does not require formal instruction or mastery
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                  Brief, consistent exposure supports long-term language confidence
                </li>
              </ul>
              <p>Important distinctions:</p>
              <ul className="space-y-2 ml-4">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                  Recognition ≠ fluency
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                  Exposure ≠ instruction
                </li>
              </ul>
              <p>
                Flashcards support recognition and familiarity, which form the groundwork for later language use.
              </p>
              <p>Language learning is:</p>
              <ul className="space-y-2 ml-4">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                  Cumulative
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                  Contextual
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                  Reinforced through repetition over time
                </li>
              </ul>
            </div>
          </motion.section>

          <SectionDivider />

          {/* Section 8: Summary */}
          <motion.section {...fadeInUp} className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-sprouttie-green-light rounded-lg flex items-center justify-center">
                <Lightbulb className="w-5 h-5 text-sprouttie-green-dark" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">8. Summary: Design Principles Informed by Research</h2>
            </div>
            
            <div className="text-gray-700 space-y-4">
              <p>
                The insights above consistently point to the same conclusions:
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-6 my-6">
              <ul className="space-y-4">
                {[
                  'Consistency matters more than intensity',
                  'Reduced cognitive load supports follow-through',
                  'Restartability enables long-term use',
                  'Calm systems outlast rigid ones',
                  'Learning environments matter as much as content'
                ].map((item, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="w-6 h-6 bg-sprouttie-green/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="w-2 h-2 bg-sprouttie-green rounded-full" />
                    </span>
                    <span className="font-medium text-gray-900">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-gray-700 text-center italic mt-8">
              Sprouttie is designed around these principles — not as rules, but as support.
            </p>
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
