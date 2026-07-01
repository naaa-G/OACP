import { Button } from '@oacp/ui';

import { formatFeedNewMessagesLabel } from '../utils/feed-scroll.js';

import styles from './FeedNewMessagesChip.module.css';

export interface FeedNewMessagesChipProps {
  readonly count: number;
  readonly onClick: () => void;
}

export function FeedNewMessagesChip({ count, onClick }: FeedNewMessagesChipProps) {
  if (count <= 0) {
    return null;
  }

  return (
    <div className={styles.root}>
      <Button
        type="button"
        variant="primary"
        className={styles.chip}
        data-testid="feed-new-messages-chip"
        aria-label={`Scroll to ${count} new message${count === 1 ? '' : 's'}`}
        onClick={onClick}
      >
        {formatFeedNewMessagesLabel(count)}
      </Button>
    </div>
  );
}
