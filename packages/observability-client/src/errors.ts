export class ObservabilityClientError extends Error {
  readonly status: number;
  readonly code: string | undefined;

  constructor(message: string, options: { status: number; code?: string | undefined }) {
    super(message);
    this.name = 'ObservabilityClientError';
    this.status = options.status;
    this.code = options.code;
  }
}
