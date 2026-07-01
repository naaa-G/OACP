import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  MESSAGE_TYPES,
  OacpValidationError,
  PROTOCOL_VERSION,
  VALIDATION_ERROR_CODES,
  MessageValidator,
  getSchemasRoot,
  parseMessage,
  parseMessageType,
  resetMessageValidatorCache,
  resetValidatorCache,
  validateMessage,
  validateMessageType,
} from '../src/index.js';

afterEach(() => {
  resetValidatorCache();
  resetMessageValidatorCache();
});

function loadExample(name: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(getSchemasRoot(), 'examples', name), 'utf8')) as Record<
    string,
    unknown
  >;
}

describe('message validator (Day 4)', () => {
  it('validates all Day 2 message examples', () => {
    const examples = [
      'task_request.example.json',
      'task_response.success.example.json',
      'task_response.error.example.json',
      'delegation.example.json',
      'capability_query.example.json',
    ];

    for (const file of examples) {
      const outcome = validateMessage(loadExample(file));
      expect(outcome.valid, `expected ${file} to be valid`).toBe(true);
    }
  });

  it('parses task_request example with type enforcement', () => {
    const message = parseMessageType(loadExample('task_request.example.json'), 'task_request');
    expect(message.type).toBe('task_request');
    expect(message.capability).toBe('text.summarize');
    expect(message.version).toBe(PROTOCOL_VERSION);
  });

  it('parses task_response success and error variants', () => {
    const success = parseMessageType(
      loadExample('task_response.success.example.json'),
      'task_response',
    );
    expect(success.status).toBe('success');
    expect(success.output).toBeDefined();

    const error = parseMessageType(
      loadExample('task_response.error.example.json'),
      'task_response',
    );
    expect(error.status).toBe('error');
    expect(error.error?.code).toBe('TASK_TIMEOUT');
  });

  it('rejects unsupported protocol version', () => {
    const invalid = {
      ...loadExample('task_request.example.json'),
      version: '99.0',
    };
    const outcome = validateMessage(invalid);
    expect(outcome.valid).toBe(false);
    if (!outcome.valid) {
      expect(outcome.error.code).toBe(VALIDATION_ERROR_CODES.UNSUPPORTED_PROTOCOL_VERSION);
    }
  });

  it('rejects unknown message type', () => {
    const invalid = {
      ...loadExample('task_request.example.json'),
      type: 'not_a_real_type',
    };
    const outcome = validateMessage(invalid);
    expect(outcome.valid).toBe(false);
    if (!outcome.valid) {
      expect(outcome.error.code).toBe(VALIDATION_ERROR_CODES.UNKNOWN_MESSAGE_TYPE);
    }
  });

  it('rejects message type mismatch when type is enforced', () => {
    const outcome = validateMessageType(loadExample('task_request.example.json'), 'task_response');
    expect(outcome.valid).toBe(false);
    if (!outcome.valid) {
      expect(outcome.error.code).toBe(VALIDATION_ERROR_CODES.MESSAGE_TYPE_MISMATCH);
    }
  });

  it('rejects invalid message structure', () => {
    expect(validateMessage(null).valid).toBe(false);
    expect(validateMessage('string').valid).toBe(false);
    expect(validateMessage([]).valid).toBe(false);
  });

  it('rejects schema violations with SCHEMA_VALIDATION_FAILED', () => {
    const invalid = {
      ...loadExample('task_request.example.json'),
      message_id: 'not-a-uuid',
    };
    const outcome = validateMessage(invalid);
    expect(outcome.valid).toBe(false);
    if (!outcome.valid) {
      expect(outcome.error.code).toBe(VALIDATION_ERROR_CODES.SCHEMA_VALIDATION_FAILED);
      expect(outcome.error.details.length).toBeGreaterThan(0);
    }
  });

  it('rejects task_response with both output and error', () => {
    const invalid = {
      ...loadExample('task_response.success.example.json'),
      status: 'error',
      error: { code: 'FAIL', message: 'bad' },
      output: { kept: true },
    };
    const outcome = validateMessage(invalid);
    expect(outcome.valid).toBe(false);
  });

  it('throws OacpValidationError from parseMessage', () => {
    expect(() => {
      parseMessage({ type: 'task_request', version: '0.1' });
    }).toThrow(OacpValidationError);
  });

  it('supports custom MessageValidator with version allow-list', () => {
    const validator = new MessageValidator({ supportedVersions: ['1.0'] });
    const outcome = validator.validate(loadExample('task_request.example.json'));
    expect(outcome.valid).toBe(true);
  });

  it('accepts protocol version 0.1 during v1.0 migration read-compat', () => {
    const legacy = {
      ...loadExample('task_request.example.json'),
      version: '0.1',
    };
    expect(validateMessage(legacy).valid).toBe(true);
  });

  it('exports message type constants used by validator', () => {
    expect(MESSAGE_TYPES.TASK_REQUEST).toBe('task_request');
    expect(MESSAGE_TYPES.CAPABILITY_QUERY).toBe('capability_query');
  });
});
