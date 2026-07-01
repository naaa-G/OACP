/**
 * Parse optional Console fleet label overrides from Vite env.
 * Format: JSON object, e.g. `{"custom-demo":"Custom demo","acme":"Acme Corp"}`
 */
export function parseConsoleFleetLabels(raw: string | undefined): Readonly<Record<string, string>> {
  if (raw === undefined || raw.trim().length === 0) {
    return {};
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }

    const labels: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'string' && key.trim().length > 0 && value.trim().length > 0) {
        labels[key.trim().toLowerCase()] = value.trim();
      }
    }
    return labels;
  } catch {
    return {};
  }
}

/** Build-time fleet labels from `VITE_OACP_CONSOLE_FLEETS`. */
export const CONSOLE_FLEET_LABELS: Readonly<Record<string, string>> = parseConsoleFleetLabels(
  import.meta.env.VITE_OACP_CONSOLE_FLEETS,
);
