import { colors, layout, spacing, tokens, typography } from '@oacp/ui';

import styles from './TokenPreview.module.css';

const SEMANTIC_SWATCHES = [
  { name: 'accent', value: colors.accent, label: 'Accent (cyan)' },
  { name: 'blue', value: colors.blue, label: 'Blue (protocol)' },
  { name: 'success', value: colors.success, label: 'Success' },
  { name: 'warning', value: colors.warning, label: 'Warning' },
  { name: 'error', value: colors.error, label: 'Error' },
] as const;

const SURFACE_SWATCHES = [
  { name: 'bg', value: colors.bg, label: 'Background' },
  { name: 'panel', value: colors.panel, label: 'Panel' },
  { name: 'panel2', value: colors.panel2, label: 'Panel 2' },
  { name: 'border', value: colors.border, label: 'Border' },
] as const;

const FLEET_SWATCHES = Object.entries(colors.fleet).map(([name, value]) => ({
  name,
  value,
  label: name,
}));

const SPACING_SAMPLES = ['1', '2', '3', '4', '6', '8'] as const;

/**
 * Day 1 smoke page — verifies @oacp/ui tokens render correctly in the Console app.
 * Replaced by the full Console shell on Day 2.
 */
export function TokenPreview() {
  return (
    <div className={styles.page}>
      <header className={`${styles.header} oacp-glass-panel`}>
        <div>
          <p className={styles.eyebrow}>OACP Console · Day 1</p>
          <h1 className={styles.title}>Design token preview</h1>
          <p className={styles.subtitle}>
            Mission-control HUD theme — source: <code>@oacp/ui</code>
          </p>
        </div>
        <div className={styles.meta}>
          <span className={styles.badgeLive}>Preview</span>
          <span className={styles.metaItem}>
            Accent <code>{tokens.colors.accent}</code>
          </span>
        </div>
      </header>

      <main className={styles.grid}>
        <section className={`${styles.section} oacp-glass-panel`}>
          <h2 className={styles.sectionTitle}>Surfaces</h2>
          <div className={styles.swatchGrid}>
            {SURFACE_SWATCHES.map((swatch) => (
              <div key={swatch.name} className={styles.swatch}>
                <div
                  className={styles.swatchColor}
                  style={{ background: swatch.value }}
                  aria-hidden
                />
                <div className={styles.swatchMeta}>
                  <span className={styles.swatchLabel}>{swatch.label}</span>
                  <code className={styles.swatchValue}>{swatch.value}</code>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={`${styles.section} oacp-glass-panel`}>
          <h2 className={styles.sectionTitle}>Semantic</h2>
          <div className={styles.swatchGrid}>
            {SEMANTIC_SWATCHES.map((swatch) => (
              <div key={swatch.name} className={styles.swatch}>
                <div
                  className={styles.swatchColor}
                  style={{ background: swatch.value }}
                  aria-hidden
                />
                <div className={styles.swatchMeta}>
                  <span className={styles.swatchLabel}>{swatch.label}</span>
                  <code className={styles.swatchValue}>{swatch.value}</code>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={`${styles.section} oacp-glass-panel`}>
          <h2 className={styles.sectionTitle}>Fleet identity</h2>
          <div className={styles.swatchGrid}>
            {FLEET_SWATCHES.map((swatch) => (
              <div key={swatch.name} className={styles.swatch}>
                <div
                  className={styles.swatchColor}
                  style={{
                    background: swatch.value,
                    boxShadow: `0 0 12px ${swatch.value}55`,
                  }}
                  aria-hidden
                />
                <div className={styles.swatchMeta}>
                  <span className={styles.swatchLabel}>{swatch.label}</span>
                  <code className={styles.swatchValue}>{swatch.value}</code>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={`${styles.section} oacp-glass-panel`}>
          <h2 className={styles.sectionTitle}>Typography</h2>
          <div className={styles.typeStack}>
            <p
              style={{
                fontSize: typography.fontSize['2xl'],
                fontWeight: typography.fontWeight.bold,
              }}
            >
              OACP Console
            </p>
            <p style={{ fontSize: typography.fontSize.lg, color: 'var(--oacp-text-muted)' }}>
              Live agent graph, message flow, delegation topology
            </p>
            <p
              className="mono"
              style={{ fontSize: typography.fontSize.sm, color: 'var(--oacp-accent)' }}
            >
              agent://mcplab-planner · trace_id=abeaa66c…
            </p>
          </div>
        </section>

        <section className={`${styles.section} oacp-glass-panel`}>
          <h2 className={styles.sectionTitle}>Spacing scale</h2>
          <div className={styles.spacingList}>
            {SPACING_SAMPLES.map((key) => (
              <div key={key} className={styles.spacingRow}>
                <code>{key}</code>
                <div className={styles.spacingBar} style={{ width: spacing[key] }} />
                <code>{spacing[key]}</code>
              </div>
            ))}
          </div>
        </section>

        <section className={`${styles.section} oacp-glass-panel`}>
          <h2 className={styles.sectionTitle}>Glass panel demo</h2>
          <p className={styles.demoCopy}>
            Panels use <code>.oacp-glass-panel</code> — inset border, subtle cyan glow. Layout
            constants: sidebar {layout.sidebarWidth}, feed {layout.feedWidth}.
          </p>
          <div className={styles.demoGlow}>
            <span className={styles.nodeIdle} />
            <span className={styles.nodeActive} />
            <span className={styles.edge} />
          </div>
          <p className={styles.legend}>
            <span>Idle node</span>
            <span>Active node</span>
            <span>Edge</span>
          </p>
        </section>
      </main>
    </div>
  );
}
