import React from 'react';
import { getPrimaryText, getSecondaryText } from '@/utils/wordLabel';

// Shows a card as "蜗牛 snail" rather than 蜗牛 alone. The second half is muted
// so the word being taught still reads as the main item in a dense chip list.
const WordLabel = ({ card, secondaryStyle }) => {
  const primary = getPrimaryText(card);
  const secondary = getSecondaryText(card);
  const pinyin = (card?.pinyin || '').trim();

  return (
    <span title={pinyin ? `${primary} · ${pinyin}` : primary}>
      {primary}
      {secondary && (
        <span
          style={{
            marginLeft: '5px',
            opacity: 0.6,
            fontWeight: 400,
            ...secondaryStyle,
          }}
        >
          {secondary}
        </span>
      )}
    </span>
  );
};

export default WordLabel;
