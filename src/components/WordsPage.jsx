import React, { useState } from 'react';
import { lazy, Suspense } from 'react';

const SpokenWords = lazy(() => import('./SpokenWords'));
const FlashcardManager = lazy(() => import('./FlashcardManager'));

const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-[200px]">
    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-sprouttie-green"></div>
  </div>
);

const TABS = [
  { id: 'spoken', label: 'Spoken Words' },
  { id: 'flashcards', label: 'Flashcards' },
];

const WordsPage = () => {
  const [activeTab, setActiveTab] = useState('spoken');

  return (
    <div>
      {/* Sub-tab pills */}
      <div className="flex gap-2 mb-5">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-200
              ${activeTab === tab.id
                ? 'bg-gradient-to-r from-[hsl(var(--sprouttie-green))] to-[hsl(var(--sprouttie-green-dark))] text-white shadow-md'
                : 'bg-white text-[hsl(var(--sprouttie-ink))] border-2 border-[hsl(var(--border))] hover:border-[hsl(var(--sprouttie-green))]'
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <Suspense fallback={<LoadingSpinner />}>
        {activeTab === 'spoken' && <SpokenWords />}
        {activeTab === 'flashcards' && <FlashcardManager />}
      </Suspense>
    </div>
  );
};

export default WordsPage;
