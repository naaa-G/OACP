import { shortAgentId } from '@oacp/observability-client';

import {
  formatFleetSectionLabel,
  resolveFleetBucket,
  type CatalogFleetId,
} from '../utils/fleet-catalog.js';
import { KNOWN_ROLE_IDS } from '../utils/role-taxonomy.js';

export interface OpsGraphLabelFields {
  readonly agentId: string;
  readonly name: string;
  readonly role?: string | undefined;
  readonly fleet?: string | undefined;
}

export interface OpsGraphLabelView {
  readonly name: string;
  readonly role: string;
  readonly fleet: string;
  readonly agentId: string;
  readonly shortId: string;
}

const ROLE_LABELS: Record<(typeof KNOWN_ROLE_IDS)[number], string> = {
  coordinator: 'Coordinator',
  planner: 'Planner',
  researcher: 'Researcher',
  synthesizer: 'Synthesizer',
  publisher: 'Publisher',
  deliverer: 'Deliverer',
  reviewer: 'Reviewer',
  triager: 'Triager',
  scanner: 'Scanner',
  coder: 'Coder',
  ops: 'Ops',
  client: 'Client',
  architect: 'Architect',
  designer: 'Designer',
  analyst: 'Analyst',
  qa: 'QA',
  pm: 'PM',
};

/** Stable suffix for `data-testid` attributes on graph labels. */
export function opsGraphAgentTestId(agentId: string): string {
  return shortAgentId(agentId).replace(/[^a-zA-Z0-9-_]/g, '-');
}

export function formatOpsGraphRoleLabel(role: string | undefined): string {
  if (role === undefined || role.trim().length === 0) {
    return 'Agent';
  }

  const normalized = role.trim().toLowerCase() as (typeof KNOWN_ROLE_IDS)[number];
  if (KNOWN_ROLE_IDS.includes(normalized)) {
    return ROLE_LABELS[normalized];
  }

  return role
    .split(/[-_]/)
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function formatOpsGraphFleetLabel(fleet: string | undefined): string {
  const bucket: CatalogFleetId = resolveFleetBucket(fleet);
  return formatFleetSectionLabel(bucket);
}

export function buildOpsGraphLabelView(fields: OpsGraphLabelFields): OpsGraphLabelView {
  const trimmedName = fields.name.trim();
  const shortId = shortAgentId(fields.agentId);

  return {
    name: trimmedName.length > 0 ? trimmedName : shortId,
    role: formatOpsGraphRoleLabel(fields.role),
    fleet: formatOpsGraphFleetLabel(fields.fleet),
    agentId: fields.agentId,
    shortId,
  };
}
