import type { TraceTimelineEvent } from '@oacp/observability-client';

export type TimelineExportFormat = 'jsonl' | 'csv';

const CSV_COLUMNS = [
  'index',
  'timestamp',
  'type',
  'from',
  'to',
  'capability',
  'status',
  'message_id',
  'summary',
] as const;

function sanitizeTraceId(traceId: string | undefined): string {
  const raw = traceId?.trim() || 'unselected-trace';
  return raw.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'trace';
}

function csvCell(value: unknown): string {
  if (value === undefined || value === null) {
    return '';
  }

  const text =
    typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
      ? String(value)
      : JSON.stringify(value);
  if (!/[",\r\n]/.test(text)) {
    return text;
  }

  return `"${text.replace(/"/g, '""')}"`;
}

export function buildTimelineExportFilename(
  traceId: string | undefined,
  format: TimelineExportFormat,
): string {
  const extension = format === 'jsonl' ? 'jsonl' : 'csv';
  return `oacp-timeline-${sanitizeTraceId(traceId)}.${extension}`;
}

export function serializeTimelineAsJsonl(events: readonly TraceTimelineEvent[]): string {
  return events.map((event) => JSON.stringify(event)).join('\n');
}

export function serializeTimelineAsCsv(events: readonly TraceTimelineEvent[]): string {
  const header = CSV_COLUMNS.join(',');
  const rows = events.map((event) => CSV_COLUMNS.map((column) => csvCell(event[column])).join(','));

  return [header, ...rows].join('\n');
}

export function serializeTimelineExport(
  events: readonly TraceTimelineEvent[],
  format: TimelineExportFormat,
): string {
  return format === 'jsonl' ? serializeTimelineAsJsonl(events) : serializeTimelineAsCsv(events);
}

export function downloadTimelineExport(
  events: readonly TraceTimelineEvent[],
  traceId: string | undefined,
  format: TimelineExportFormat,
): void {
  const body = serializeTimelineExport(events, format);
  const type = format === 'jsonl' ? 'application/x-ndjson' : 'text/csv';
  const blob = new Blob([body], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = buildTimelineExportFilename(traceId, format);
  link.rel = 'noopener';
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
