/**
 * OpenAPI 3.1 typed surface used by `@molecule/api-openapi`. Only the
 * subset of the spec we actually emit/consume is modeled — enough to
 * build a Swagger-UI-compatible document for any molecule API app.
 *
 * The shapes are intentionally permissive (e.g. `JsonSchema` is open)
 * so that handcrafted schemas or schemas converted from zod can both
 * flow through the builder unchanged.
 *
 * @module
 */

/**
 * Permissive JSON Schema shape used inside OpenAPI components and
 * operations. `properties`, `items`, `allOf`, `oneOf`, `anyOf`, etc.
 * are all `JsonSchema` so that nested schemas keep the same type.
 */
export interface JsonSchema {
  /** Type tag — matches OpenAPI 3.1 / JSON Schema draft 2020-12. */
  type?: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object' | 'null'
  /** Reference to a component schema (e.g. `#/components/schemas/User`). */
  $ref?: string
  /** Constant string format (e.g. `email`, `uuid`, `date-time`). */
  format?: string
  /** Property map for object schemas. */
  properties?: Record<string, JsonSchema>
  /** Required property names for object schemas. */
  required?: string[]
  /** Item schema for array schemas. */
  items?: JsonSchema
  /** Enum of allowed literal values. */
  enum?: Array<string | number | boolean | null>
  /** Constant value (single allowed value). */
  const?: string | number | boolean | null
  /** Composition keywords. */
  allOf?: JsonSchema[]
  oneOf?: JsonSchema[]
  anyOf?: JsonSchema[]
  /** Whether properties besides those listed are allowed. */
  additionalProperties?: boolean | JsonSchema
  /** Description for documentation. */
  description?: string
  /** Default value. */
  default?: unknown
  /** Numeric constraints. */
  minimum?: number
  maximum?: number
  exclusiveMinimum?: number
  exclusiveMaximum?: number
  /** String length constraints. */
  minLength?: number
  maxLength?: number
  /** Regex pattern for string schemas. */
  pattern?: string
  /** Array length constraints. */
  minItems?: number
  maxItems?: number
  /** Whether `null` is a permitted value (OpenAPI 3.0 compat shim). */
  nullable?: boolean
  /** Example value(s). */
  example?: unknown
  examples?: unknown[]
  /** Allow extra OpenAPI / JSON Schema keywords without losing the type. */
  [key: string]: unknown
}

/**
 * OpenAPI Info object — the top-level metadata block describing the API.
 */
export interface OpenApiInfo {
  /** Required title of the API. */
  title: string
  /** Required semantic version of the API contract (not the runtime). */
  version: string
  /** Optional human-readable description. */
  description?: string
  /** Optional terms of service URL. */
  termsOfService?: string
  /** Optional contact block. */
  contact?: { name?: string; url?: string; email?: string }
  /** Optional license block. */
  license?: { name: string; url?: string; identifier?: string }
}

/** OpenAPI Server object describing a base URL the API is served from. */
export interface OpenApiServer {
  /** URL of the server (may contain `{variable}` placeholders). */
  url: string
  /** Free-text description. */
  description?: string
  /** Variable substitutions for `{var}` segments in `url`. */
  variables?: Record<string, { default: string; enum?: string[]; description?: string }>
}

/** OpenAPI Parameter object (`in`: query, header, path, cookie). */
export interface OpenApiParameter {
  name: string
  in: 'query' | 'header' | 'path' | 'cookie'
  description?: string
  required?: boolean
  schema?: JsonSchema
  example?: unknown
}

/** OpenAPI Request Body object. */
export interface OpenApiRequestBody {
  description?: string
  required?: boolean
  content: Record<string, { schema: JsonSchema; example?: unknown }>
}

/** OpenAPI Response object. */
export interface OpenApiResponse {
  description: string
  content?: Record<string, { schema: JsonSchema; example?: unknown }>
  headers?: Record<string, { description?: string; schema?: JsonSchema }>
}

/** Security requirement block — references a security scheme by name. */
export type OpenApiSecurityRequirement = Record<string, string[]>

/** OpenAPI Operation object — a single HTTP method on a path. */
export interface OpenApiOperation {
  operationId?: string
  tags?: string[]
  summary?: string
  description?: string
  parameters?: OpenApiParameter[]
  requestBody?: OpenApiRequestBody
  responses: Record<string, OpenApiResponse>
  security?: OpenApiSecurityRequirement[]
  deprecated?: boolean
}

/** Lowercase HTTP methods OpenAPI exposes on a path item. */
export type HttpMethod = 'get' | 'put' | 'post' | 'delete' | 'options' | 'head' | 'patch' | 'trace'

/** OpenAPI Path Item object — operations indexed by HTTP method. */
export type OpenApiPathItem = {
  [K in HttpMethod]?: OpenApiOperation
} & {
  summary?: string
  description?: string
  parameters?: OpenApiParameter[]
}

/** Components container (reusable schemas, security schemes, etc.). */
export interface OpenApiComponents {
  schemas?: Record<string, JsonSchema>
  parameters?: Record<string, OpenApiParameter>
  responses?: Record<string, OpenApiResponse>
  requestBodies?: Record<string, OpenApiRequestBody>
  securitySchemes?: Record<string, OpenApiSecurityScheme>
}

/** OpenAPI Security Scheme — http/apiKey/oauth2/openIdConnect/mutualTLS. */
export interface OpenApiSecurityScheme {
  type: 'http' | 'apiKey' | 'oauth2' | 'openIdConnect' | 'mutualTLS'
  description?: string
  /** For `http`: scheme name (`bearer`, `basic`). */
  scheme?: string
  /** For `http` bearer: token format hint (`JWT`). */
  bearerFormat?: string
  /** For `apiKey`: parameter location and name. */
  in?: 'query' | 'header' | 'cookie'
  name?: string
  /** For `openIdConnect`: discovery URL. */
  openIdConnectUrl?: string
  /** For `oauth2`: flows configuration (kept open — rarely emitted). */
  flows?: Record<string, unknown>
}

/**
 * Input to `defineOpenApi()` — what callers pass when constructing a
 * spec. `paths` may be omitted and built up via `routeToOperation()`.
 */
export interface OpenApiSpec {
  info: OpenApiInfo
  servers?: OpenApiServer[]
  paths?: Record<string, OpenApiPathItem>
  components?: OpenApiComponents
  security?: OpenApiSecurityRequirement[]
  tags?: Array<{ name: string; description?: string }>
}

/** A fully-populated OpenAPI 3.1 document, the output of `defineOpenApi()`. */
export interface OpenApiDoc extends OpenApiSpec {
  /** Always `'3.1.0'` for this generator. */
  openapi: '3.1.0'
  paths: Record<string, OpenApiPathItem>
  components: OpenApiComponents
}

/**
 * Caller-facing description of a single route used by `routeToOperation()`.
 * `request.body` and `response.body` accept either a zod schema (auto
 * converted) or a pre-built `JsonSchema` so handcrafted shapes flow
 * through unchanged.
 */
export interface RouteDefinition {
  /** Lowercase HTTP method (`get`, `post`, …). */
  method: HttpMethod
  /** Path with OpenAPI-style placeholders (e.g. `/users/{id}`). */
  path: string
  /** One-line summary for Swagger UI. */
  summary?: string
  /** Long description (markdown allowed by Swagger UI). */
  description?: string
  /** OperationId used by client generators. */
  operationId?: string
  /** Tag(s) used to group operations in Swagger UI. */
  tags?: string[]
  /** Whether the operation is deprecated. */
  deprecated?: boolean
  /** Per-operation security requirements (overrides global). */
  security?: OpenApiSecurityRequirement[]
  /** Request shape — params, query, headers, body. */
  request?: {
    params?: SchemaInput
    query?: SchemaInput
    headers?: SchemaInput
    body?: SchemaInput
    /** Content-type override (default: `application/json`). */
    bodyContentType?: string
    /** Optional human description for the body. */
    bodyDescription?: string
  }
  /** Response shape — keyed by status code. */
  response?: Record<string, SchemaInput | ResponseInput>
}

/**
 * What a caller may pass for a schema slot — either a zod schema, a
 * pre-built JSON Schema, or `undefined`.
 */
export type SchemaInput = ZodLikeSchema | JsonSchema | undefined

/**
 * Richer response slot allowing a description and explicit content
 * type. If the value supplied at a status code is just a schema, it is
 * treated as `{ body: schema, description: 'OK' }`.
 */
export interface ResponseInput {
  description?: string
  body?: SchemaInput
  contentType?: string
  headers?: Record<string, { description?: string; schema?: JsonSchema }>
}

/**
 * Minimal duck-type detection for zod schemas — we don't `import` zod
 * at the type level here, because the converter accepts any object
 * with `_def`/`parse`/`safeParse`. Keeps the package decoupled from a
 * specific zod major version at the consumer boundary.
 */
export interface ZodLikeSchema {
  _def: { typeName?: string; [key: string]: unknown }
  parse: (input: unknown) => unknown
  safeParse: (
    input: unknown,
  ) => { success: true; data: unknown } | { success: false; error: { issues: ZodIssueLike[] } }
}

/** Subset of a zod issue we use when reporting validation failures. */
export interface ZodIssueLike {
  path: Array<string | number>
  message: string
  code?: string
}

/**
 * Result of `validateRequest()` — discriminated union mirroring the
 * shape returned by zod's `safeParse`.
 */
export type ValidationResult =
  | {
      success: true
      data: {
        params?: Record<string, unknown>
        query?: Record<string, unknown>
        headers?: Record<string, unknown>
        body?: unknown
      }
    }
  | {
      success: false
      errors: ValidationIssue[]
    }

/** Single validation failure entry. */
export interface ValidationIssue {
  /** Where the failure occurred — `params`, `query`, `headers`, or `body`. */
  in: 'params' | 'query' | 'headers' | 'body'
  /** Dotted path inside that section, e.g. `user.email`. */
  path: string
  /** Human-readable message (from zod or schema validator). */
  message: string
  /** Optional issue code (`invalid_type`, `too_small`, etc.). */
  code?: string
}

/**
 * Caller-facing payload to `validateRequest()` — every field is
 * optional so partial validation works.
 */
export interface RequestPayload {
  params?: Record<string, unknown>
  query?: Record<string, unknown>
  headers?: Record<string, unknown>
  body?: unknown
}

/** Minimal HTTP-shaped request object accepted by `createOpenApiHandler()`. */
export interface OpenApiHandlerRequest {
  method?: string
}

/** Minimal HTTP-shaped response object accepted by `createOpenApiHandler()`. */
export interface OpenApiHandlerResponse {
  setHeader?: (name: string, value: string) => unknown
  status?: (code: number) => OpenApiHandlerResponse
  statusCode?: number
  json?: (body: unknown) => unknown
  send?: (body: unknown) => unknown
  end?: (body?: unknown) => unknown
}
