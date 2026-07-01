import type { HighlightRange } from '../utils/agent-search.js';
import styles from './SearchHighlight.module.css';

export interface SearchHighlightProps {
  readonly text: string;
  readonly ranges: readonly HighlightRange[];
}

export function SearchHighlight({ text, ranges }: SearchHighlightProps) {
  if (ranges.length === 0) {
    return <>{text}</>;
  }

  const segments: Array<{ readonly text: string; readonly highlighted: boolean }> = [];
  let cursor = 0;

  for (const range of ranges) {
    if (range.start > cursor) {
      segments.push({ text: text.slice(cursor, range.start), highlighted: false });
    }

    segments.push({
      text: text.slice(range.start, range.end),
      highlighted: true,
    });
    cursor = range.end;
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), highlighted: false });
  }

  return (
    <>
      {segments.map((segment, index) =>
        segment.highlighted ? (
          <mark key={index} className={styles.mark}>
            {segment.text}
          </mark>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </>
  );
}
