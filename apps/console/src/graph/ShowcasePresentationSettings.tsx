import {
  SHOWCASE_BLOOM_INTENSITY_ORDER,
  showcaseBloomIntensityLabel,
  type ShowcaseBloomIntensity,
} from './showcase-bloom-settings.js';
import styles from './ShowcasePresentationSettings.module.css';

export interface ShowcasePresentationSettingsProps {
  readonly bloomIntensity: ShowcaseBloomIntensity;
  readonly effectiveBloomIntensity: ShowcaseBloomIntensity;
  readonly gpuProfileLabel: string;
  readonly onBloomIntensityChange: (intensity: ShowcaseBloomIntensity) => void;
}

/** Showcase presentation controls — bloom intensity (Day 41). */
export function ShowcasePresentationSettings({
  bloomIntensity,
  effectiveBloomIntensity,
  gpuProfileLabel,
  onBloomIntensityChange,
}: ShowcasePresentationSettingsProps) {
  return (
    <div
      className={styles.toolbar}
      role="toolbar"
      aria-label="Showcase presentation settings"
      data-testid="showcase-presentation-settings"
      data-showcase-gpu-profile-label={gpuProfileLabel}
      data-showcase-bloom-effective={effectiveBloomIntensity}
    >
      <span className={styles.label}>Bloom</span>
      {SHOWCASE_BLOOM_INTENSITY_ORDER.map((option) => (
        <button
          key={option}
          type="button"
          className={styles.button}
          data-testid={`showcase-bloom-${option}`}
          aria-pressed={bloomIntensity === option}
          title={
            option !== effectiveBloomIntensity && bloomIntensity === option
              ? `Capped to ${showcaseBloomIntensityLabel(effectiveBloomIntensity)} on ${gpuProfileLabel}`
              : undefined
          }
          onClick={() => {
            onBloomIntensityChange(option);
          }}
        >
          {showcaseBloomIntensityLabel(option)}
        </button>
      ))}
    </div>
  );
}
