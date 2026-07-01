import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from '@playwright/test/reporter';

interface E2eFailureRecord {
  readonly file: string;
  readonly title: string;
  readonly status: TestResult['status'];
  readonly durationMs: number;
  readonly retry: number;
  readonly errorMessage: string;
  readonly errorStack?: string;
  readonly location?: string;
}

/** Writes `test-results/e2e-errors.{json,md}` for CI artifact download. */
export default class ErrorLogReporter implements Reporter {
  private readonly failureByTestId = new Map<string, E2eFailureRecord>();
  private outputDir = 'test-results';

  onBegin(_config: FullConfig, _suite: Suite): void {
    this.outputDir = process.env.PLAYWRIGHT_ERROR_LOG_DIR ?? 'test-results';
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    if (result.status === 'passed' || result.status === 'skipped') {
      this.failureByTestId.delete(test.id);
      return;
    }

    const error = result.errors[0];
    const location = error?.location
      ? `${error.location.file}:${error.location.line}:${error.location.column}`
      : `${test.location.file}:${test.location.line}:${test.location.column}`;

    this.failureByTestId.set(test.id, {
      file: test.location.file,
      title: test.titlePath().join(' › '),
      status: result.status,
      durationMs: result.duration,
      retry: result.retry,
      errorMessage: error?.message ?? `Test ended with status: ${result.status}`,
      ...(error?.stack !== undefined ? { errorStack: error.stack } : {}),
      location,
    });
  }

  onEnd(result: FullResult): void {
    mkdirSync(this.outputDir, { recursive: true });

    const failures = [...this.failureByTestId.values()];
    const summary = {
      status: result.status,
      startedAt: result.startTime.toISOString(),
      durationMs: result.duration,
      failureCount: failures.length,
      failures,
    };

    writeFileSync(
      join(this.outputDir, 'e2e-errors.json'),
      `${JSON.stringify(summary, null, 2)}\n`,
      'utf8',
    );

    const lines = [
      '# Console E2E failure log',
      '',
      `- **Run status:** ${result.status}`,
      `- **Failures:** ${failures.length}`,
      `- **Duration:** ${Math.round(result.duration / 1000)}s`,
      '',
    ];

    if (failures.length === 0) {
      lines.push('No failing tests recorded.');
    } else {
      for (const [index, failure] of failures.entries()) {
        lines.push(`## ${index + 1}. ${failure.title}`);
        lines.push('');
        lines.push(`- **File:** \`${failure.file}\``);
        lines.push(`- **Status:** ${failure.status}`);
        lines.push(`- **Location:** \`${failure.location}\``);
        if (failure.retry > 0) {
          lines.push(`- **Retry:** ${failure.retry}`);
        }
        lines.push('');
        lines.push('```');
        lines.push(failure.errorMessage);
        lines.push('```');
        if (failure.errorStack !== undefined) {
          lines.push('');
          lines.push('### Stack trace');
          lines.push('');
          lines.push('```');
          lines.push(failure.errorStack);
          lines.push('```');
        }
        lines.push('');
      }
    }

    writeFileSync(join(this.outputDir, 'e2e-errors.md'), `${lines.join('\n')}\n`, 'utf8');
  }
}
