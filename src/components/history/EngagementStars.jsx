import React from 'react';

const EngagementStars = ({ level }) => {
  const getStars = () => {
    const filledStars = Math.round(level);
    const stars = [];
    
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span 
          key={i} 
          className={i <= filledStars ? 'text-[hsl(45,90%,55%)]' : 'text-[hsl(var(--muted))]'}
        >
          {i <= filledStars ? '⭐' : '☆'}
        </span>
      );
    }
    
    return stars;
  };

  const getLabel = () => {
    if (level >= 4.5) return 'Blooming';
    if (level >= 3) return 'Thriving';
    if (level >= 1.5) return 'Growing';
    return 'Sprouting';
  };

  return (
    <div className="flex flex-col items-start">
      <div className="flex gap-0.5 text-lg">
        {getStars()}
      </div>
      <div className="text-xs font-medium text-[hsl(var(--muted-foreground))] mt-1">
        {getLabel()}
      </div>
    </div>
  );
};

export default EngagementStars;
