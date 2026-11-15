// Preserve the published title in every language, including subtitles.
export const bookSearchUrl = ({ title, author }) => {
  const query = [title, author]
    .filter(value => typeof value === 'string')
    .map(value => value.trim())
    .filter(Boolean)
    .join(' ');
  return `https://www.amazon.com/s?k=${encodeURIComponent(query)}&i=stripbooks`;
};
