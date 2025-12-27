import React from 'react';

export const Skeleton = ({ className = '', ...props }) => {
  return (
    <div
      className={`animate-pulse rounded-md bg-muted ${className}`}
      {...props}
    />
  );
};

export const SetCardSkeleton = () => (
  <div className="bg-card rounded-xl border border-border p-4 space-y-3">
    {/* Header row */}
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <Skeleton className="h-8 w-20 rounded-md" />
    </div>
    
    {/* Round chips */}
    <div className="flex gap-2 mt-3">
      <Skeleton className="h-8 w-16 rounded-full" />
      <Skeleton className="h-8 w-16 rounded-full" />
      <Skeleton className="h-8 w-16 rounded-full" />
    </div>
    
    {/* Word badges */}
    <div className="flex flex-wrap gap-2 mt-2">
      <Skeleton className="h-6 w-12 rounded-md" />
      <Skeleton className="h-6 w-16 rounded-md" />
      <Skeleton className="h-6 w-10 rounded-md" />
      <Skeleton className="h-6 w-14 rounded-md" />
    </div>
  </div>
);

export const DailyTrackerSkeleton = () => (
  <div className="space-y-6">
    {/* Header skeleton */}
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>
      <Skeleton className="h-10 w-24 rounded-md" />
    </div>
    
    {/* Progress bar */}
    <div className="space-y-2">
      <div className="flex justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-12" />
      </div>
      <Skeleton className="h-3 w-full rounded-full" />
    </div>
    
    {/* Stats row */}
    <div className="grid grid-cols-3 gap-3">
      <div className="bg-card rounded-lg p-3 border border-border">
        <Skeleton className="h-3 w-16 mb-2" />
        <Skeleton className="h-6 w-8" />
      </div>
      <div className="bg-card rounded-lg p-3 border border-border">
        <Skeleton className="h-3 w-16 mb-2" />
        <Skeleton className="h-6 w-8" />
      </div>
      <div className="bg-card rounded-lg p-3 border border-border">
        <Skeleton className="h-3 w-16 mb-2" />
        <Skeleton className="h-6 w-8" />
      </div>
    </div>
    
    {/* Set cards */}
    <div className="space-y-4">
      <SetCardSkeleton />
      <SetCardSkeleton />
      <SetCardSkeleton />
    </div>
  </div>
);

export default Skeleton;
