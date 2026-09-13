import React from 'react';
import { useSearchParams } from 'react-router-dom';
import WeekCard from '../components/thisweek/WeekCard';

/** The weekly card, full screen. Explore → This week, and old /weekly-review links. */
const ThisWeekPage = () => {
  const [params] = useSearchParams();

  return (
    <div className="max-w-md mx-auto pt-2 pb-28 space-y-4">
      <h1 className="font-display text-2xl text-[hsl(var(--sprouttie-ink))] m-0">This week</h1>
      <WeekCard variant="page" forceReview={params.get('review') === '1'} />
    </div>
  );
};

export default ThisWeekPage;
