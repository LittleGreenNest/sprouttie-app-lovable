import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PLAN_NAMES, PLAN_FEATURES } from '../../hooks/usePlanAccess';

// Feature descriptions for each plan
const PLAN_UNLOCKS = {
  print: [
    { icon: '♾️', title: 'Unlimited Flashcards', description: 'Create as many flashcards as your little one needs' },
    { icon: '📄', title: 'PDF Export', description: 'Print beautiful flashcard PDFs for offline learning' },
    { icon: '📁', title: 'Multiple Export Formats', description: 'Choose from various layouts and styles' },
    { icon: '💾', title: 'Full History Tracking', description: 'Track all your learning progress over time' },
  ],
  pro: [
    { icon: '♾️', title: 'Unlimited Flashcards', description: 'Create as many flashcards as your little one needs' },
    { icon: '📄', title: 'PDF Export', description: 'Print beautiful flashcard PDFs for offline learning' },
    { icon: '🤖', title: 'AI Story Generation', description: 'Create unlimited personalized stories' },
    { icon: '🎤', title: 'Voice Training', description: 'Practice pronunciation with audio guidance' },
    { icon: '👨‍👩‍👧‍👦', title: 'Multi-Child Profiles', description: 'Manage learning for your whole family' },
    { icon: '⚡', title: 'Priority Support', description: 'Get help faster when you need it' },
  ],
};

export default function UpgradeSuccess() {
  const [searchParams] = useSearchParams();
  const plan = searchParams.get('plan') || 'print';
  
  const planName = PLAN_NAMES[plan] || 'Print Plan';
  const unlocks = PLAN_UNLOCKS[plan] || PLAN_UNLOCKS.print;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Success Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
            <span className="text-4xl">🎉</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Welcome to {planName}!
          </h1>
          <p className="text-lg text-gray-600">
            Your subscription is now active. Here's what you've unlocked:
          </p>
        </div>

        {/* Unlocked Features Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 mb-8">
          <div className="flex items-center gap-2 mb-6">
            <span className="text-green-600 text-xl">✓</span>
            <h2 className="text-xl font-semibold text-gray-900">Features Unlocked</h2>
          </div>
          
          <div className="space-y-4">
            {unlocks.map((feature, index) => (
              <div 
                key={index}
                className="flex items-start gap-4 p-4 bg-green-50 rounded-xl border border-green-100"
              >
                <span className="text-2xl flex-shrink-0">{feature.icon}</span>
                <div>
                  <h3 className="font-medium text-gray-900">{feature.title}</h3>
                  <p className="text-sm text-gray-600">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Start Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Get Started</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-gray-700">
              <span className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-sm font-medium text-green-700">1</span>
              <span>Head to your flashcards and start creating</span>
            </div>
            <div className="flex items-center gap-3 text-gray-700">
              <span className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-sm font-medium text-green-700">2</span>
              <span>Try the PDF export for beautiful printable cards</span>
            </div>
            <div className="flex items-center gap-3 text-gray-700">
              <span className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-sm font-medium text-green-700">3</span>
              <span>Track your child's progress on the dashboard</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Link 
            to="/manage-flashcards" 
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-lg text-center transition-colors"
          >
            Start Creating Flashcards
          </Link>
          <Link 
            to="/dashboard" 
            className="flex-1 border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-3 px-6 rounded-lg text-center transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>

        {/* Support Note */}
        <p className="text-center text-sm text-gray-500 mt-8">
          Questions? Visit our <Link to="/support" className="text-green-600 hover:underline">support page</Link> or email us anytime.
        </p>
      </div>
    </div>
  );
}
