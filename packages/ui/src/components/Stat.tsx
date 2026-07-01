export interface StatProps {
  readonly label: string;
  readonly value: string | number;
  readonly className?: string;
}

/** Metric tile for header stats (agents, traces, messages). */
export function Stat({ label, value, className }: StatProps) {
  return (
    <div className={className ? `oacp-stat ${className}` : 'oacp-stat'}>
      <div className="oacp-stat__label">{label}</div>
      <div className="oacp-stat__value">{value}</div>
    </div>
  );
}
