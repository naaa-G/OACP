import { formatFleetSectionLabel, type CatalogFleetId } from '../utils/fleet-catalog.js';
import { orbitalBandForFleet } from './showcase-fleet-bands.js';
import styles from './ShowcaseFleetLegend.module.css';

export interface ShowcaseFleetLegendProps {
  readonly fleets: readonly CatalogFleetId[];
  readonly filterFleet: CatalogFleetId | null;
  readonly onFilterFleetChange: (fleet: CatalogFleetId | null) => void;
}

/** Showcase overlay legend with fleet filter chips (Day 42). */
export function ShowcaseFleetLegend({
  fleets,
  filterFleet,
  onFilterFleetChange,
}: ShowcaseFleetLegendProps) {
  if (fleets.length === 0) {
    return null;
  }

  return (
    <div
      className={styles.root}
      data-testid="showcase-fleet-legend"
      role="toolbar"
      aria-label="Showcase fleet legend"
      data-showcase-fleet-filter={filterFleet ?? 'all'}
    >
      <span className={styles.title}>Fleets</span>
      <button
        type="button"
        className={styles.chip}
        data-testid="showcase-fleet-filter-all"
        aria-pressed={filterFleet === null}
        onClick={() => {
          onFilterFleetChange(null);
        }}
      >
        All
      </button>
      {fleets.map((fleetId) => {
        const band = orbitalBandForFleet(fleetId);
        return (
          <button
            key={fleetId}
            type="button"
            className={styles.chip}
            data-testid={`showcase-fleet-filter-${fleetId}`}
            aria-pressed={filterFleet === fleetId}
            style={{ ['--showcase-fleet-color' as string]: band.color }}
            onClick={() => {
              onFilterFleetChange(filterFleet === fleetId ? null : fleetId);
            }}
          >
            <span className={styles.swatch} aria-hidden />
            {formatFleetSectionLabel(fleetId)}
          </button>
        );
      })}
    </div>
  );
}
