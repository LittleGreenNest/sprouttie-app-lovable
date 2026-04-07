import React, { useMemo } from 'react';

const SET_COLORS = {
  1: '#8B5CF6', // purple
  2: '#F59E0B', // amber
  3: '#3B82F6', // blue
  4: '#10B981', // green
  5: '#F43F5E', // rose
};

const highlightMatch = (text, query) => {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 rounded-sm px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
};

const WordPill = ({ card, isFlashed, sets, searchQuery, onEdit }) => {
  // Determine set membership for active border
  const setNumber = useMemo(() => {
    if (!sets || !card.rawData) return null;
    const sn = card.rawData.set_number;
    if (sn && card.rawData.card_status === 'active') return sn;
    return null;
  }, [sets, card]);

  const isRetired = card.rawData?.card_status === 'retired';

  // Build pill classes
  let bgClass = 'bg-white';
  let borderStyle = '0.5px solid #E5E7EB';
  let textClass = 'text-[#374151]';
  let leftBorder = null;

  if (isRetired) {
    bgClass = 'bg-[#F9FAFB]';
    textClass = 'text-[#9CA3AF]';
  } else if (isFlashed) {
    bgClass = 'bg-[#F0FDF4]';
    borderStyle = '0.5px solid #86EFAC';
    textClass = 'text-[#166534]';
  }

  if (setNumber && SET_COLORS[setNumber]) {
    leftBorder = `3px solid ${SET_COLORS[setNumber]}`;
  }

  const primary = card.label;
  const secondary = card.title;

  return (
    <button
      onClick={() => onEdit(card)}
      className={`${bgClass} ${textClass} inline-flex items-center gap-1 rounded-[20px] py-1 px-2.5 text-xs font-medium min-h-[32px] transition-colors hover:shadow-sm`}
      style={{
        border: borderStyle,
        borderLeft: leftBorder || borderStyle,
      }}
    >
      {isRetired && <span className="text-[#9CA3AF] mr-0.5">✓</span>}
      <span className="leading-tight">
        {highlightMatch(primary, searchQuery)}
        {secondary && (
          <span className="text-[#9CA3AF] font-normal ml-1">· {highlightMatch(secondary, searchQuery)}</span>
        )}
      </span>
    </button>
  );
};

const GridView = ({
  categories,
  flashcardsByCategory,
  flashedIds,
  getFilteredWords,
  searchQuery,
  sets,
  onEditCard,
}) => {
  return (
    <div className="space-y-4">
      {categories.map((category) => {
        const allWords = flashcardsByCategory[category] || [];
        const filteredWords = getFilteredWords(allWords);
        
        if (searchQuery && filteredWords.length === 0) return null;

        const flashedCount = allWords.filter(w => flashedIds.has(w.id)).length;
        const totalCount = allWords.length;
        const pct = totalCount > 0 ? (flashedCount / totalCount) * 100 : 0;

        return (
          <div key={category} className="bg-white rounded-2xl border border-[#E5E7EB] p-4">
            {/* Category header */}
            <div className="mb-3">
              <div className="flex items-baseline gap-2 mb-1.5">
                <h3 className="text-[13px] font-semibold text-[#1F2937]">{category}</h3>
                <span className="text-xs text-[#9CA3AF]">({totalCount} words)</span>
              </div>
              <div className="w-full h-1 bg-[#E5E7EB] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#52B788] rounded-full transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            {/* Word pills */}
            <div className="flex flex-wrap gap-2">
              {filteredWords.map((card) => (
                <WordPill
                  key={card.id}
                  card={card}
                  isFlashed={flashedIds.has(card.id)}
                  sets={sets}
                  searchQuery={searchQuery}
                  onEdit={(c) => onEditCard(c, category)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default GridView;
