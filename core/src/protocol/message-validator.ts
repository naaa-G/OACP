import {
  CORE_MESSAGE_TYPES,
  MESSAGE_TYPE_SCHEMA_PATH,
  type CoreMessageType,
} from './message-types.js';
import type { OacpMessage, OacpMessageByType } from './message-schemas.js';
import { OacpValidationError, VALIDATION_ERROR_CODES } from './errors.js';
import type { ValidateOutcome, ValidationIssue } from './errors.js';
import {
  SUPPORTED_PROTOCOL_VERSIONS,
  type SupportedProtocolVersion,
  isSupportedProtocolVersion,
} from './versioning.js';
import {
  compileSchemaValidator,
  validateAgainstSchema as runSchemaValidation,
} from './validator.js';
import type { ValidateFunction } from 'ajv/dist/2020.js';

export interface MessageValidatorOptions {
  /** Protocol versions to accept. Defaults to `SUPPORTED_PROTOCOL_VERSIONS`. */
  readonly supportedVersions?: readonly SupportedProtocolVersion[];
}

interface MessageHeader {
  type: CoreMessageType;
  version: SupportedProtocolVersion;
}

const messageValidators = new Map<CoreMessageType, ValidateFunction>();

/** Clear cached per-type message validators (for tests). */
export function resetMessageValidatorCache(): void {
  messageValidators.clear();
}

function getValidatorForType(messageType: CoreMessageType): ValidateFunction {
  let validator = messageValidators.get(messageType);
  if (!validator) {
    validator = compileSchemaValidator(MESSAGE_TYPE_SCHEMA_PATH[messageType]);
    messageValidators.set(messageType, validator);
  }
  return validator;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCoreMessageType(value: unknown): value is CoreMessageType {
  return typeof value === 'string' && (CORE_MESSAGE_TYPES as readonly string[]).includes(value);
}

function extractMessageHeader(
  data: unknown,
  supportedVersions: readonly SupportedProtocolVersion[],
): ValidateOutcome<MessageHeader> {
  if (!isPlainObject(data)) {
    return {
      valid: false,
      error: new OacpValidationError(
        VALIDATION_ERROR_CODES.INVALID_MESSAGE_STRUCTURE,
        'OACP message must be a JSON object',
      ),
    };
  }

  const { type, version } = data;

  if (!isCoreMessageType(type)) {
    const details: ValidationIssue[] =
      typeof type === 'string'
        ? [
            {
              path: '/type',
              message: `Unknown message type "${type}". Supported: ${CORE_MESSAGE_TYPES.join(', ')}`,
            },
          ]
        : [{ path: '/type', message: 'Message type must be a string' }];

    return {
      valid: false,
      error: new OacpValidationError(
        VALIDATION_ERROR_CODES.UNKNOWN_MESSAGE_TYPE,
        'Unknown or unsupported OACP message type',
        details,
      ),
    };
  }

  if (!isSupportedProtocolVersion(version) || !supportedVersions.includes(version)) {
    return {
      valid: false,
      error: new OacpValidationError(
        VALIDATION_ERROR_CODES.UNSUPPORTED_PROTOCOL_VERSION,
        `Unsupported protocol version "${String(version)}"`,
        [
          {
            path: '/version',
            message: `Supported versions: ${supportedVersions.join(', ')}`,
          },
        ],
      ),
    };
  }

  return { valid: true, data: { type, version } };
}

function enforceExpectedType(
  header: MessageHeader,
  expected: CoreMessageType,
): ValidateOutcome<MessageHeader> {
  if (header.type !== expected) {
    return {
      valid: false,
      error: new OacpValidationError(
        VALIDATION_ERROR_CODES.MESSAGE_TYPE_MISMATCH,
        `Expected message type "${expected}" but received "${header.type}"`,
        [{ path: '/type', message: `Expected "${expected}", got "${header.type}"` }],
      ),
    };
  }
  return { valid: true, data: header };
}

function validateWithSchema<T>(
  validate: ValidateFunction,
  data: unknown,
  label: string,
): ValidateOutcome<T> {
  const outcome = runSchemaValidation(validate, data, label);
  if (!outcome.valid) {
    return outcome;
  }
  return { valid: true, data: outcome.data as T };
}

/** Enterprise-grade OACP message validator with version and type enforcement. */
export class MessageValidator {
  private readonly supportedVersions: readonly SupportedProtocolVersion[];

  constructor(options: MessageValidatorOptions = {}) {
    this.supportedVersions = options.supportedVersions ?? SUPPORTED_PROTOCOL_VERSIONS;
  }

  /** Validate any supported OACP message; infers type from the `type` field. */
  validate(data: unknown): ValidateOutcome<OacpMessage> {
    const header = extractMessageHeader(data, this.supportedVersions);
    if (!header.valid) {
      return header;
    }
    return validateWithSchema<OacpMessage>(
      getValidatorForType(header.data.type),
      data,
      `OACP message (${header.data.type})`,
    );
  }

  /** Validate and enforce a specific message type. */
  validateType<T extends CoreMessageType>(
    data: unknown,
    expectedType: T,
  ): ValidateOutcome<OacpMessageByType[T]> {
    const header = extractMessageHeader(data, this.supportedVersions);
    if (!header.valid) {
      return header;
    }

    const typeCheck = enforceExpectedType(header.data, expectedType);
    if (!typeCheck.valid) {
      return typeCheck;
    }

    return validateWithSchema<OacpMessageByType[T]>(
      getValidatorForType(expectedType),
      data,
      `OACP message (${expectedType})`,
    );
  }

  /** Validate or throw `OacpValidationError`. */
  parse(data: unknown): OacpMessage {
    const outcome = this.validate(data);
    if (!outcome.valid) {
      throw outcome.error;
    }
    return outcome.data;
  }

  /** Validate a specific type or throw. */
  parseType<T extends CoreMessageType>(data: unknown, expectedType: T): OacpMessageByType[T] {
    const outcome = this.validateType(data, expectedType);
    if (!outcome.valid) {
      throw outcome.error;
    }
    return outcome.data;
  }
}

/** Default singleton validator for protocol `v0.1`. */
export const defaultMessageValidator = new MessageValidator();

/** Validate any supported OACP message using the default validator. */
export function validateMessage(data: unknown): ValidateOutcome<OacpMessage> {
  return defaultMessageValidator.validate(data);
}

/** Validate a specific message type using the default validator. */
export function validateMessageType<T extends CoreMessageType>(
  data: unknown,
  expectedType: T,
): ValidateOutcome<OacpMessageByType[T]> {
  return defaultMessageValidator.validateType(data, expectedType);
}

/** Parse a message or throw using the default validator. */
export function parseMessage(data: unknown): OacpMessage {
  return defaultMessageValidator.parse(data);
}

/** Parse a typed message or throw using the default validator. */
export function parseMessageType<T extends CoreMessageType>(
  data: unknown,
  expectedType: T,
): OacpMessageByType[T] {
  return defaultMessageValidator.parseType(data, expectedType);
}

/** Type-narrowing helper after successful validation. */
export function isTaskRequestMessage(
  message: OacpMessage,
): message is OacpMessageByType['task_request'] {
  return message.type === 'task_request';
}

export function isTaskResponseMessage(
  message: OacpMessage,
): message is OacpMessageByType['task_response'] {
  return message.type === 'task_response';
}

export function isDelegationMessage(
  message: OacpMessage,
): message is OacpMessageByType['delegation'] {
  return message.type === 'delegation';
}

export function isCapabilityQueryMessage(
  message: OacpMessage,
): message is OacpMessageByType['capability_query'] {
  return message.type === 'capability_query';
}
