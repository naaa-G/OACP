import type { AgentIdentity } from '../protocol/agent-types.js';
import type { TaskErrorBody } from '../protocol/message-schemas.js';
import type { TaskStatus } from '../protocol/message-types.js';
import type { InMemoryMessageBus } from '../routing/message-bus.js';
import { createTraceId } from './message-factory.js';
import type { AgentRuntime } from './agent-runtime.js';
import { createAgentRuntime } from './agent-runtime.js';

/** One step in a multi-agent pipeline (Day 13). */
export interface PipelineStep {
  /** Stable step identifier for tracing and `mapInput` lookups. */
  readonly id: string;
  readonly capability: string;
  readonly to?: string;
  /** Build step input from pipeline context (defaults to `lastOutput` or `initialInput`). */
  readonly mapInput?: (context: PipelineContext) => Record<string, unknown>;
}

/** Mutable view of pipeline execution state passed to `mapInput`. */
export interface PipelineContext {
  readonly initialInput: Record<string, unknown>;
  readonly traceId: string;
  readonly stepResults: readonly PipelineStepResult[];
  readonly lastOutput?: Record<string, unknown>;
  getStepResult(stepId: string): PipelineStepResult | undefined;
}

export interface PipelineStepResult {
  readonly stepId: string;
  readonly capability: string;
  readonly from: string;
  readonly status: TaskStatus;
  readonly output?: Record<string, unknown>;
  readonly error?: TaskErrorBody;
}

export interface PipelineRunSuccess {
  readonly ok: true;
  readonly traceId: string;
  readonly steps: readonly PipelineStepResult[];
  readonly output?: Record<string, unknown>;
}

export interface PipelineRunFailure {
  readonly ok: false;
  readonly traceId: string;
  readonly failedStepId: string;
  readonly steps: readonly PipelineStepResult[];
  readonly error: PipelineStepResult['error'] | { code: string; message: string };
}

export type PipelineRunResult = PipelineRunSuccess | PipelineRunFailure;

export interface RunPipelineOptions {
  readonly traceId?: string;
  readonly timeoutMs?: number;
}

export interface TaskPipelineOptions {
  readonly bus: InMemoryMessageBus;
  readonly executor: AgentRuntime | AgentIdentity;
  readonly timeoutMs?: number;
}

function buildPipelineContext(
  initialInput: Record<string, unknown>,
  traceId: string,
  stepResults: PipelineStepResult[],
): PipelineContext {
  const last = stepResults.at(-1);
  return {
    initialInput,
    traceId,
    stepResults,
    ...(last?.output !== undefined ? { lastOutput: last.output } : {}),
    getStepResult(stepId: string) {
      return stepResults.find((step) => step.stepId === stepId);
    },
  };
}

function defaultStepInput(context: PipelineContext): Record<string, unknown> {
  if (context.lastOutput !== undefined) {
    return context.lastOutput;
  }
  return context.initialInput;
}

/**
 * Run a sequential multi-agent pipeline on an in-process bus.
 * Each step shares the same `trace_id` for end-to-end observability.
 */
export async function runPipeline(
  executor: AgentRuntime,
  steps: readonly PipelineStep[],
  initialInput: Record<string, unknown>,
  options: RunPipelineOptions = {},
): Promise<PipelineRunResult> {
  const traceId = options.traceId ?? createTraceId();
  const timeoutMs = options.timeoutMs ?? 30_000;
  const stepResults: PipelineStepResult[] = [];

  for (const step of steps) {
    const context = buildPipelineContext(initialInput, traceId, stepResults);
    const input = step.mapInput ? step.mapInput(context) : defaultStepInput(context);

    const outcome = await executor.sendTask({
      capability: step.capability,
      input,
      traceId,
      ...(step.to !== undefined ? { to: step.to } : {}),
      timeoutMs,
    });

    if (!outcome.ok) {
      return {
        ok: false,
        traceId,
        failedStepId: step.id,
        steps: stepResults,
        error: { code: outcome.error.code, message: outcome.error.message },
      };
    }

    const response = outcome.response;
    const status = response?.status ?? 'success';
    const stepResult: PipelineStepResult = {
      stepId: step.id,
      capability: step.capability,
      from: response?.from ?? 'unknown',
      status,
      ...(response?.output !== undefined ? { output: response.output } : {}),
      ...(response?.error !== undefined ? { error: response.error } : {}),
    };

    if (status === 'error') {
      stepResults.push(stepResult);
      return {
        ok: false,
        traceId,
        failedStepId: step.id,
        steps: stepResults,
        error: stepResult.error ?? { code: 'PIPELINE_STEP_ERROR', message: 'Step failed' },
      };
    }

    stepResults.push(stepResult);
  }

  const last = stepResults.at(-1);
  return {
    ok: true,
    traceId,
    steps: stepResults,
    ...(last?.output !== undefined ? { output: last.output } : {}),
  };
}

/** Enterprise pipeline runner with optional internal executor bootstrap. */
export class TaskPipeline {
  private readonly bus: InMemoryMessageBus;
  private readonly executor: AgentRuntime;
  private readonly ownsExecutor: boolean;
  private readonly timeoutMs: number;

  constructor(options: TaskPipelineOptions) {
    this.bus = options.bus;
    this.timeoutMs = options.timeoutMs ?? 30_000;

    if ('start' in options.executor) {
      this.executor = options.executor;
      this.ownsExecutor = false;
    } else {
      this.executor = createAgentRuntime({
        identity: options.executor,
        bus: options.bus,
      });
      this.ownsExecutor = true;
    }
  }

  get traceBus(): InMemoryMessageBus {
    return this.bus;
  }

  start(): void {
    if (!this.executor.isRunning) {
      this.executor.start();
    }
  }

  stop(): void {
    if (this.ownsExecutor) {
      this.executor.stop();
    }
  }

  run(
    steps: readonly PipelineStep[],
    initialInput: Record<string, unknown>,
    options: Omit<RunPipelineOptions, 'timeoutMs'> = {},
  ): Promise<PipelineRunResult> {
    this.start();
    return runPipeline(this.executor, steps, initialInput, {
      ...options,
      timeoutMs: this.timeoutMs,
    });
  }
}
