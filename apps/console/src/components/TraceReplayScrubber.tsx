import type { TraceReplaySpeed } from '../utils/trace-replay.js';
import styles from './TraceReplayScrubber.module.css';

export interface TraceReplayScrubberProps {
  readonly messageIndex: number;
  readonly maxMessageIndex: number;
  readonly isLive: boolean;
  readonly isPlaying: boolean;
  readonly playbackSpeed: TraceReplaySpeed;
  readonly onMessageIndexChange: (index: number) => void;
  readonly onTogglePlayPause: () => void;
  readonly onGoLive: () => void;
  readonly onPlaybackSpeedChange: (speed: TraceReplaySpeed) => void;
}

export function TraceReplayScrubber({
  messageIndex,
  maxMessageIndex,
  isLive,
  isPlaying,
  playbackSpeed,
  onMessageIndexChange,
  onTogglePlayPause,
  onGoLive,
  onPlaybackSpeedChange,
}: TraceReplayScrubberProps) {
  const displayIndex = isLive ? maxMessageIndex + 1 : messageIndex + 1;
  const totalMessages = maxMessageIndex + 1;

  return (
    <div
      className={styles.root}
      role="group"
      aria-label="Trace replay scrubber"
      data-testid="trace-replay-scrubber"
      data-replay-live={isLive ? 'true' : 'false'}
      data-replay-playing={isPlaying ? 'true' : 'false'}
    >
      <div className={styles.controls}>
        <button
          type="button"
          className={styles.button}
          data-testid={isPlaying ? 'trace-replay-pause' : 'trace-replay-play'}
          aria-label={isPlaying ? 'Pause trace replay' : 'Play trace replay'}
          onClick={onTogglePlayPause}
        >
          {isPlaying ? '⏸ Pause' : '▶ Play'}
        </button>
        <button
          type="button"
          className={styles.button}
          data-testid="trace-replay-speed"
          aria-pressed={playbackSpeed === 2}
          aria-label={`Playback speed ${playbackSpeed}x`}
          title="Toggle playback speed"
          onClick={() => {
            onPlaybackSpeedChange(playbackSpeed === 1 ? 2 : 1);
          }}
        >
          {playbackSpeed}×
        </button>
        {!isLive ? (
          <button
            type="button"
            className={styles.button}
            data-testid="trace-replay-go-live"
            aria-label="Return to live trace view"
            onClick={onGoLive}
          >
            Live
          </button>
        ) : null}
      </div>
      <div className={styles.sliderRow}>
        <input
          type="range"
          className={styles.slider}
          data-testid="trace-replay-slider"
          min={0}
          max={maxMessageIndex}
          step={1}
          value={messageIndex}
          aria-valuemin={0}
          aria-valuemax={maxMessageIndex}
          aria-valuenow={messageIndex}
          aria-label="Trace message index"
          onChange={(event) => {
            onMessageIndexChange(Number.parseInt(event.currentTarget.value, 10));
          }}
        />
        <span className={styles.label} data-testid="trace-replay-label">
          {isLive ? (
            <>
              <span className={styles.liveBadge}>Live</span> · {totalMessages} msgs
            </>
          ) : (
            <>
              Msg {displayIndex}/{totalMessages}
            </>
          )}
        </span>
      </div>
    </div>
  );
}
