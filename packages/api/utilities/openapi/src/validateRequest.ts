/**
 * Runtime validator that checks an incoming request payload against
 * an `OpenApiOperation`'s parameter and body schemas. Internally
 * stores the original (pre-conversion) zod schemas on a hidden marker
 * so `safeParse` can be reused for accurate error reporting; falls
 * back to a small JSON-Schema validator for handcrafted shapes.
 *
 * @module
 */

import type {
  JsonSchema,
  OpenApiOperation,
  OpenApiParameter,
  RequestPayload,
  RouteDefinition,
  ValidationIssue,
  ValidationResult,
  ZodLikeSchema,
} from './types.js'
import { isJsonSchema, isZodSchema, resolveRef } from './utilities.js'

/** Hidden marker used to attach the original zod schemas to an operation. */
const SOURCE_KEY = '__moleculeOpenApiSource__'

/** Internal: shape stored at `operation[SOURCE_KEY]`. */
interface OperationSource {
  params?: ZodLikeSchema | JsonSchema
  query?: ZodLikeSchema | JsonSchema
  headers?: ZodLikeSchema | JsonSchema
  body?: ZodLikeSchema | JsonSchema
  /** Document the operation was generated under, for `$ref` resolution. */
  root?: unknown
}

/**
 * Attach the unconverted (zod) schemas to an operation so that
 * `validateRequest` can hand them back to zod for accurate errors.
 * Called by `routeToOperationWithValidation()` — internal helper.
 *
 * @param operation - Operation to annotate.
 * @param source - Source schemas to remember.
 * @returns The same `operation` reference.
 */
export const attachOperationSource = (
  operation: OpenApiOperation,
  source: OperationSource,
): OpenApiOperation => {
  Object.defineProperty(operation, SOURCE_KEY, {
    value: source,
    enumerable: false,
    writable: true,
    configurable: true,
  })
  return operation
}

/**
 * Read the attached source schemas from an operation, or `undefined`
 * if `attachOperationSource()` was never called.
 *
 * @param operation - Operation to inspect.
 * @returns The previously attached source, or `undefined`.
 */
export const getOperationSource = (operation: OpenApiOperation): OperationSource | undefined => {
  return (operation as unknown as Record<string, OperationSource | undefined>)[SOURCE_KEY]
}

/**
 * Convenience wrapper around `routeToOperation()` that also remembers
 * the original schemas for use by `validateRequest()`. Importing this
 * keeps the validator decoupled from how the operation was built.
 *
 * @param route - Route definition.
 * @param operation - Operation already produced by `routeToOperation`.
 * @param root - Optional root document for `$ref` resolution during
 *               validation.
 * @returns The same operation, with sources attached.
 */
export const annotateOperation = (
  route: RouteDefinition,
  operation: OpenApiOperation,
  root?: unknown,
): OpenApiOperation => {
  return attachOperationSource(operation, {
    params: route.request?.params as OperationSource['params'],
    query: route.request?.query as OperationSource['query'],
    headers: route.request?.headers as OperationSource['headers'],
    body: route.request?.body as OperationSource['body'],
    root,
  })
}

/**
 * Validate an incoming request payload against an OpenAPI operation.
 *
 * If the operation has source zod schemas attached (via
 * `annotateOperation`), each section is validated by zod's
 * `safeParse` — issue paths and messages come straight from zod. For
 * operations that only carry the JSON-Schema form (e.g. handcrafted
 * specs), a built-in mini-validator runs against the operation's own
 * `parameters` / `requestBody` definitions.
 *
 * @param operation - Operation describing the expected shape.
 * @param payload - Incoming payload — `params`, `query`, `headers`, `body`.
 * @returns Discriminated union: `success: true` with parsed data, or
 *          `success: false` with an array of `ValidationIssue`s.
 */
export const validateRequest = (
  operation: OpenApiOperation,
  payload: RequestPayload,
): ValidationResult => {
  const source = getOperationSource(operation)
  const issues: ValidationIssue[] = []
  const data: {
    params?: Record<string, unknown>
    query?: Record<string, unknown>
    headers?: Record<string, unknown>
    body?: unknown
  } = {}

  // Each section validates independently. If a zod schema was supplied
  // we let zod do the heavy lifting; otherwise fall back to schema-
  // driven validation against the operation's parameter list / body.
  validateSection(
    'params',
    payload.params,
    source?.params,
    () => collectParameterSchema(operation.parameters, 'path'),
    source?.root,
    issues,
    data,
  )
  validateSection(
    'query',
    payload.query,
    source?.query,
    () => collectParameterSchema(operation.parameters, 'query'),
    source?.root,
    issues,
    data,
  )
  validateSection(
    'headers',
    payload.headers,
    source?.headers,
    () => collectParameterSchema(operation.parameters, 'header'),
    source?.root,
    issues,
    data,
  )
  validateBody(payload.body, source?.body, operation, source?.root, issues, data)

  if (issues.length > 0) return { success: false, errors: issues }
  return { success: true, data }
}

/**
 * Run validation for one of `params` / `query` / `headers`. Either
 * uses the attached zod schema or falls back to building a JSON
 * Schema from the operation's parameter list.
 */
const validateSection = (
  section: 'params' | 'query' | 'headers',
  value: Record<string, unknown> | undefined,
  source: OperationSource['params'] | undefined,
  buildJsonSchema: () => JsonSchema | undefined,
  root: unknown,
  issues: ValidationIssue[],
  data: {
    params?: Record<string, unknown>
    query?: Record<string, unknown>
    headers?: Record<string, unknown>
    body?: unknown
  },
): void => {
  const supplied = value ?? {}
  if (isZodSchema(source)) {
    const result = source.safeParse(supplied)
    if (result.success) {
      data[section] = result.data as Record<string, unknown>
    } else {
      for (const issue of result.error.issues) {
        issues.push({
          in: section,
          path: issue.path.map((p) => String(p)).join('.'),
          message: issue.message,
          code: issue.code,
        })
      }
    }
    return
  }
  const schema = (isJsonSchema(source) ? source : buildJsonSchema()) ?? undefined
  if (!schema) {
    data[section] = supplied
    return
  }
  validateAgainstJsonSchema(supplied, schema, [], section, root, issues)
  if (!issues.some((i) => i.in === section)) {
    data[section] = supplied
  }
}

/**
 * Validate the request body slot.
 */
const validateBody = (
  body: unknown,
  source: OperationSource['body'] | undefined,
  operation: OpenApiOperation,
  root: unknown,
  issues: ValidationIssue[],
  data: { body?: unknown },
): void => {
  if (isZodSchema(source)) {
    const result = source.safeParse(body)
    if (result.success) {
      data.body = result.data
    } else {
      for (const issue of result.error.issues) {
        issues.push({
          in: 'body',
          path: issue.path.map((p) => String(p)).join('.'),
          message: issue.message,
          code: issue.code,
        })
      }
    }
    return
  }
  const schema = (isJsonSchema(source) ? source : extractBodySchema(operation)) ?? undefined
  if (!schema) {
    data.body = body
    return
  }
  validateAgainstJsonSchema(body, schema, [], 'body', root, issues)
  if (!issues.some((i) => i.in === 'body')) {
    data.body = body
  }
}

/**
 * Build a synthetic object JSON Schema from the operation's
 * parameters in a particular location.
 */
const collectParameterSchema = (
  parameters: OpenApiParameter[] | undefined,
  location: 'path' | 'query' | 'header',
): JsonSchema | undefined => {
  if (!parameters?.length) return undefined
  const properties: Record<string, JsonSchema> = {}
  const required: string[] = []
  for (const param of parameters) {
    if (param.in !== location) continue
    properties[param.name] = param.schema ?? {}
    if (param.required) required.push(param.name)
  }
  if (Object.keys(properties).length === 0) return undefined
  return { type: 'object', properties, ...(required.length ? { required } : {}) }
}

/** Pull the JSON body schema off the operation's `requestBody`. */
const extractBodySchema = (operation: OpenApiOperation): JsonSchema | undefined => {
  const json = operation.requestBody?.content?.['application/json']?.schema
  return json
}

/**
 * Built-in mini JSON-Schema validator — handles the keywords we emit
 * (`type`, `required`, `properties`, `items`, `enum`, `const`,
 * `pattern`, `minLength`/`maxLength`, `minimum`/`maximum`,
 * `additionalProperties`, `anyOf`/`oneOf`/`allOf`, `$ref`). Anything
 * else is ignored — zod schemas should always be preferred.
 */
const validateAgainstJsonSchema = (
  value: unknown,
  schema: JsonSchema,
  path: Array<string | number>,
  section: ValidationIssue['in'],
  root: unknown,
  issues: ValidationIssue[],
): void => {
  if (schema.$ref) {
    const resolved = resolveRef(root, schema.$ref) as JsonSchema | undefined
    if (resolved) {
      validateAgainstJsonSchema(value, resolved, path, section, root, issues)
      return
    }
    issues.push({
      in: section,
      path: path.map(String).join('.'),
      message: `unresolvable $ref: ${schema.$ref}`,
      code: 'unresolved_ref',
    })
    return
  }

  if (schema.allOf) {
    for (const sub of schema.allOf) {
      validateAgainstJsonSchema(value, sub, path, section, root, issues)
    }
  }
  if (schema.anyOf) {
    const sub = schema.anyOf
    const subIssues: ValidationIssue[][] = sub.map(() => [])
    sub.forEach((s, i) => validateAgainstJsonSchema(value, s, path, section, root, subIssues[i]!))
    if (!subIssues.some((bag) => bag.length === 0)) {
      issues.push({
        in: section,
        path: path.map(String).join('.'),
        message: 'value did not match any anyOf branch',
        code: 'invalid_union',
      })
    }
    return
  }
  if (schema.oneOf) {
    const sub = schema.oneOf
    const subIssues: ValidationIssue[][] = sub.map(() => [])
    sub.forEach((s, i) => validateAgainstJsonSchema(value, s, path, section, root, subIssues[i]!))
    const matches = subIssues.filter((bag) => bag.length === 0).length
    if (matches !== 1) {
      issues.push({
        in: section,
        path: path.map(String).join('.'),
        message: `value matched ${matches} oneOf branches (expected exactly 1)`,
        code: 'invalid_union',
      })
    }
    return
  }

  if (schema.const !== undefined && value !== schema.const) {
    issues.push({
      in: section,
      path: path.map(String).join('.'),
      message: `expected const ${JSON.stringify(schema.const)}`,
      code: 'invalid_literal',
    })
    return
  }

  if (schema.enum && !schema.enum.includes(value as never)) {
    issues.push({
      in: section,
      path: path.map(String).join('.'),
      message: `expected one of ${schema.enum.join(', ')}`,
      code: 'invalid_enum_value',
    })
    return
  }

  if (schema.type) {
    if (!matchesType(value, schema.type)) {
      issues.push({
        in: section,
        path: path.map(String).join('.'),
        message: `expected type ${schema.type}`,
        code: 'invalid_type',
      })
      return
    }
  }

  if (schema.type === 'object' && value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    if (schema.required) {
      for (const key of schema.required) {
        if (!(key in obj)) {
          issues.push({
            in: section,
            path: [...path, key].map(String).join('.'),
            message: 'required',
            code: 'invalid_type',
          })
        }
      }
    }
    if (schema.properties) {
      for (const [key, sub] of Object.entries(schema.properties)) {
        if (key in obj) {
          validateAgainstJsonSchema(obj[key], sub, [...path, key], section, root, issues)
        }
      }
    }
    if (schema.additionalProperties === false && schema.properties) {
      const allowed = new Set(Object.keys(schema.properties))
      for (const key of Object.keys(obj)) {
        if (!allowed.has(key)) {
          issues.push({
            in: section,
            path: [...path, key].map(String).join('.'),
            message: 'unexpected property',
            code: 'unrecognized_keys',
          })
        }
      }
    }
  }

  if (schema.type === 'array' && Array.isArray(value) && schema.items) {
    value.forEach((item, i) =>
      validateAgainstJsonSchema(
        item,
        schema.items as JsonSchema,
        [...path, i],
        section,
        root,
        issues,
      ),
    )
  }

  if (schema.type === 'string' && typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      issues.push({
        in: section,
        path: path.map(String).join('.'),
        message: `string shorter than ${schema.minLength}`,
        code: 'too_small',
      })
    }
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      issues.push({
        in: section,
        path: path.map(String).join('.'),
        message: `string longer than ${schema.maxLength}`,
        code: 'too_big',
      })
    }
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
      issues.push({
        in: section,
        path: path.map(String).join('.'),
        message: `does not match pattern ${schema.pattern}`,
        code: 'invalid_string',
      })
    }
  }

  if ((schema.type === 'number' || schema.type === 'integer') && typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) {
      issues.push({
        in: section,
        path: path.map(String).join('.'),
        message: `value < minimum ${schema.minimum}`,
        code: 'too_small',
      })
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      issues.push({
        in: section,
        path: path.map(String).join('.'),
        message: `value > maximum ${schema.maximum}`,
        code: 'too_big',
      })
    }
  }
}

/** Match a JS value against a JSON Schema `type` keyword. */
const matchesType = (value: unknown, type: NonNullable<JsonSchema['type']>): boolean => {
  switch (type) {
    case 'string':
      return typeof value === 'string'
    case 'number':
      return typeof value === 'number' && Number.isFinite(value)
    case 'integer':
      return typeof value === 'number' && Number.isInteger(value)
    case 'boolean':
      return typeof value === 'boolean'
    case 'null':
      return value === null
    case 'array':
      return Array.isArray(value)
    case 'object':
      return value !== null && typeof value === 'object' && !Array.isArray(value)
  }
}
