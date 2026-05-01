/**
 * Convert a `RouteDefinition` (zod or JSON-Schema based) into an
 * OpenAPI 3.1 Operation object. Path/query/header parameters are
 * derived from the `request.params` / `request.query` /
 * `request.headers` schemas; the body becomes a `requestBody` object.
 *
 * @module
 */

import type {
  JsonSchema,
  OpenApiOperation,
  OpenApiParameter,
  OpenApiRequestBody,
  OpenApiResponse,
  ResponseInput,
  RouteDefinition,
  SchemaInput,
} from './types.js'
import { isJsonSchema, isZodSchema } from './utilities.js'
import { zodToJsonSchema } from './zodToJsonSchema.js'

/**
 * Convert a `RouteDefinition` to an OpenAPI Operation object. The
 * caller is responsible for mounting the result on a path item — see
 * `addRouteToDoc()` in `./defineOpenApi.js` for that step.
 *
 * @param route - Route definition with optional zod / JSON-Schema slots.
 * @returns OpenAPI Operation object.
 */
export const routeToOperation = (route: RouteDefinition): OpenApiOperation => {
  const operation: OpenApiOperation = {
    responses: buildResponses(route.response),
  }

  if (route.summary) operation.summary = route.summary
  if (route.description) operation.description = route.description
  if (route.operationId) operation.operationId = route.operationId
  if (route.tags?.length) operation.tags = [...route.tags]
  if (route.deprecated) operation.deprecated = true
  if (route.security) operation.security = route.security

  const parameters: OpenApiParameter[] = []
  if (route.request?.params) {
    parameters.push(...schemaToParameters(route.request.params, 'path', { required: true }))
  }
  if (route.request?.query) {
    parameters.push(...schemaToParameters(route.request.query, 'query'))
  }
  if (route.request?.headers) {
    parameters.push(...schemaToParameters(route.request.headers, 'header'))
  }
  if (parameters.length) operation.parameters = parameters

  if (route.request?.body) {
    operation.requestBody = buildRequestBody(
      route.request.body,
      route.request.bodyContentType ?? 'application/json',
      route.request.bodyDescription,
    )
  }

  return operation
}

/**
 * Convert a schema describing a flat object of parameters (path,
 * query, or header) into an array of `OpenApiParameter` records — one
 * per top-level property.
 *
 * @param input - Schema describing the parameter object.
 * @param location - Where the parameters live (`path`/`query`/`header`).
 * @param defaults - Defaults to apply when the schema doesn't pin a
 *                   value (path params force `required: true`).
 * @returns Array of OpenAPI parameter objects.
 */
const schemaToParameters = (
  input: SchemaInput,
  location: 'path' | 'query' | 'header',
  defaults: { required?: boolean } = {},
): OpenApiParameter[] => {
  if (!input) return []
  const json = toJsonSchema(input)
  if (json.type !== 'object' || !json.properties) return []
  const required = new Set(json.required ?? [])
  const result: OpenApiParameter[] = []
  for (const [name, propSchema] of Object.entries(json.properties)) {
    result.push({
      name,
      in: location,
      required: defaults.required || required.has(name),
      schema: propSchema,
      ...(typeof propSchema.description === 'string'
        ? { description: propSchema.description }
        : {}),
    })
  }
  return result
}

/**
 * Build a `requestBody` object from a schema input.
 *
 * @param input - Schema for the body.
 * @param contentType - MIME type the body is encoded with.
 * @param description - Optional description.
 * @returns OpenAPI request body object.
 */
const buildRequestBody = (
  input: SchemaInput,
  contentType: string,
  description?: string,
): OpenApiRequestBody => {
  const schema = toJsonSchema(input)
  return {
    required: true,
    ...(description ? { description } : {}),
    content: { [contentType]: { schema } },
  }
}

/**
 * Build the `responses` object from the route's response map. If the
 * caller didn't supply any response, a default `200: { description }`
 * is emitted so the spec stays valid (OpenAPI requires at least one
 * response per operation).
 *
 * @param responses - Map of status code → schema or response input.
 * @returns OpenAPI responses map.
 */
const buildResponses = (
  responses: RouteDefinition['response'],
): Record<string, OpenApiResponse> => {
  if (!responses || Object.keys(responses).length === 0) {
    return { '200': { description: 'OK' } }
  }
  const out: Record<string, OpenApiResponse> = {}
  for (const [code, value] of Object.entries(responses)) {
    out[code] = buildResponse(value)
  }
  return out
}

/**
 * Build a single OpenAPI response from a schema or `ResponseInput`.
 * Bare schemas get a default description of `OK` for 2xx-style codes
 * and the schema is mounted at `application/json`.
 *
 * @param value - Schema or response input.
 * @returns OpenAPI response object.
 */
const buildResponse = (value: SchemaInput | ResponseInput): OpenApiResponse => {
  if (value === undefined) return { description: 'OK' }
  if (isZodSchema(value)) {
    return {
      description: 'OK',
      content: { 'application/json': { schema: toJsonSchema(value) } },
    }
  }
  if (isJsonSchema(value)) {
    return {
      description: 'OK',
      content: { 'application/json': { schema: toJsonSchema(value) } },
    }
  }
  if (isResponseInput(value)) {
    const v = value
    const out: OpenApiResponse = { description: v.description ?? 'OK' }
    if (v.body) {
      const schema = toJsonSchema(v.body)
      out.content = { [v.contentType ?? 'application/json']: { schema } }
    }
    if (v.headers) out.headers = v.headers
    return out
  }
  return { description: 'OK' }
}

/**
 * Detect a `ResponseInput` envelope vs a bare schema. Anything with
 * `body`, `description`, `contentType`, or `headers` keys (and not a
 * zod schema) is treated as `ResponseInput`.
 */
const isResponseInput = (value: unknown): value is ResponseInput => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const v = value as Record<string, unknown>
  return 'body' in v || 'description' in v || 'contentType' in v || 'headers' in v
}

/**
 * Internal: best-effort coercion to JSON Schema. Throws when the
 * input isn't a zod schema or a recognizable JSON Schema fragment.
 *
 * @param input - Schema input slot.
 * @returns JSON Schema.
 */
const toJsonSchema = (input: SchemaInput): JsonSchema => {
  if (!input) return {}
  if (isZodSchema(input)) return zodToJsonSchema(input)
  if (isJsonSchema(input)) return input
  return {}
}
