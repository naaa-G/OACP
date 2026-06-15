/** Agent lifecycle states. */
export const AGENT_LIFECYCLE_STATES = {
  CREATED: 'created',
  RUNNING: 'running',
  STOPPED: 'stopped',
} as const;

export type AgentLifecycleState =
  (typeof AGENT_LIFECYCLE_STATES)[keyof typeof AGENT_LIFECYCLE_STATES];

/** Valid lifecycle transitions for enterprise state enforcement. */
export const LIFECYCLE_TRANSITIONS: Readonly<
  Record<AgentLifecycleState, readonly AgentLifecycleState[]>
> = {
  created: ['running'],
  running: ['stopped'],
  stopped: [],
};

export function canTransition(from: AgentLifecycleState, to: AgentLifecycleState): boolean {
  return LIFECYCLE_TRANSITIONS[from].includes(to);
}
