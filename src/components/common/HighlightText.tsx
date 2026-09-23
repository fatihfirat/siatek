import React from 'react';
import { normalizeSearchText } from '../../lib/searchUtils';

interface HighlightTextProps {
  text: string;
  query: string;
  className?: string;
  highlightClassName?: string;
}

export const HighlightText: React.FC<HighlightTextProps> = ({
  text,
  query,
  className = '',
  highlightClassName = 'bg-warning-fill/25 text-warning-text font-bold px-0.5 rounded-xs underline decoration-warning-border',
}) => {
  if (!query || !query.trim() || !text) {
    return <span className={className}>{text}</span>;
  }

  const normQuery = normalizeSearchText(query);
  const queryTokens = normQuery.split(' ').filter(t => t.length > 0);

  if (queryTokens.length === 0) {
    return <span className={className}>{text}</span>;
  }

  // Find all matched character ranges in text
  const normText = normalizeSearchText(text);
  const textChars: string[] = text.split('');
  const matchedIndices = new Set<number>();

  // Map words in text to token matches
  for (const token of queryTokens) {
    if (!token) continue;
    let pos = normText.indexOf(token);
    while (pos !== -1) {
      for (let i = pos; i < pos + token.length && i < text.length; i++) {
        matchedIndices.add(i);
      }
      pos = normText.indexOf(token, pos + 1);
    }
  }

  // If no direct normalized substring found, try word-by-word prefix match
  if (matchedIndices.size === 0) {
    const textWords = text.split(/(\s+)/);
    let currentIdx = 0;

    for (const segment of textWords) {
      const normSegment = normalizeSearchText(segment);
      for (const token of queryTokens) {
        if (normSegment.startsWith(token) || (token.length >= 3 && normSegment.includes(token))) {
          const matchLen = Math.min(token.length, segment.length);
          for (let i = currentIdx; i < currentIdx + matchLen && i < text.length; i++) {
            matchedIndices.add(i);
          }
        }
      }
      currentIdx += segment.length;
    }
  }

  if (matchedIndices.size === 0) {
    return <span className={className}>{text}</span>;
  }

  // Build contiguous highlighted chunks
  const elements: React.ReactNode[] = [];
  let isHighlighted = false;
  let currentChunk = '';

  for (let i = 0; i < textChars.length; i++) {
    const isCharMatched = matchedIndices.has(i);
    const char = textChars[i];

    if (isCharMatched === isHighlighted) {
      currentChunk += char;
    } else {
      if (currentChunk) {
        if (isHighlighted) {
          elements.push(
            <mark key={elements.length} className={highlightClassName}>
              {currentChunk}
            </mark>
          );
        } else {
          elements.push(<span key={elements.length}>{currentChunk}</span>);
        }
      }
      currentChunk = char;
      isHighlighted = isCharMatched;
    }
  }

  if (currentChunk) {
    if (isHighlighted) {
      elements.push(
        <mark key={elements.length} className={highlightClassName}>
          {currentChunk}
        </mark>
      );
    } else {
      elements.push(<span key={elements.length}>{currentChunk}</span>);
    }
  }

  return <span className={className}>{elements}</span>;
};

export default HighlightText;
