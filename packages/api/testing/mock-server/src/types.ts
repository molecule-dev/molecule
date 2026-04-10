/**
 * Core type definitions for the mock API server.
 * @module
 */

/* ------------------------------------------------------------------ */
/*  Scanner Types                                                      */
/* ------------------------------------------------------------------ */

/** HTTP methods supported by the mock server */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

/** Hints about the response shape extracted from handler analysis */
export interface ResponseHint {
  /** Whether the response is an array (list endpoint) */
  isList: boolean
  /** Whether the response is paginated ({ data, total, page, limit }) */
  isPaginated: boolean
  /** Whether the response includes nested resources */
  hasNestedResources: boolean
  /** Resource name (e.g. 'accounts', 'transactions') */
  resourceName: string
}

/** Serialized Zod schema definition for fixture generation */
export interface ZodSchemaDefinition {
  /** Schema type name (e.g. 'ZodObject', 'ZodString') */
  type: string
  /** Schema shape for objects: field name -> nested schema def */
  shape?: Record<string, ZodSchemaDefinition>
  /** Enum values if applicable */
  enumValues?: string[]
  /** Default value if specified */
  defaultValue?: unknown
  /** Inner type for optional/nullable wrappers */
  innerType?: ZodSchemaDefinition
  /** Element type for arrays */
  elementType?: ZodSchemaDefinition
  /** Constraints (min, max, positive, int, etc.) */
  constraints?: {
    min?: number
    max?: number
    positive?: boolean
    int?: boolean
    minLength?: number
    maxLength?: number
  }
}

/** A single discovered endpoint from handler scanning */
export interface EndpointDefinition {
  /** HTTP method (GET, POST, PUT, DELETE) */
  method: HttpMethod
  /** Full route path (e.g. '/accounts', '/accounts/:id', '/reports/net-worth') */
  path: string
  /** Zod schema for request body (if any) */
  bodySchema?: ZodSchemaDefinition
  /** Whether the endpoint requires authentication */
  requiresAuth: boolean
  /** Expected response shape hints */
  responseHints: ResponseHint
}

/** Result of scanning all handlers for an app type */
export interface HandlerScanResult {
  /** App type (e.g. 'personal-finance', 'online-store') */
  appType: string
  /** All discovered endpoints */
  endpoints: EndpointDefinition[]
  /** Resource names discovered (accounts, transactions, etc.) */
  resources: string[]
}

/* ------------------------------------------------------------------ */
/*  Fixture Types                                                      */
/* ------------------------------------------------------------------ */

/** Configuration for fixture generation */
export interface FixtureConfig {
  /** Number of items to generate for list endpoints */
  listCount?: number
  /** Seed override (default: derived from app type + path) */
  seed?: number
  /** App type for domain-specific data pools */
  appType?: string
}

/** A semantic rule for generating realistic values based on field names */
export interface SemanticRule {
  /** Field name pattern (regex) */
  pattern: RegExp
  /** Generator function that produces a realistic value */
  generate: (rng: () => number, index: number) => unknown
}

/** Fixture data for a single endpoint */
export interface EndpointFixture {
  /** The endpoint definition */
  endpoint: EndpointDefinition
  /** Success response body */
  successResponse: unknown
  /** Empty state response body */
  emptyResponse: unknown
  /** Error response */
  errorResponse: { error: string }
}

/** Fixture set for an entire app type */
export interface AppFixtureSet {
  /** App type name */
  appType: string
  /** Endpoint key -> fixture data */
  endpoints: Map<string, EndpointFixture>
}

/* ------------------------------------------------------------------ */
/*  Server Types                                                       */
/* ------------------------------------------------------------------ */

/** Response state for controlling mock behavior */
export interface ResponseState {
  /** The state of the response */
  state: 'success' | 'empty' | 'error' | 'unauthorized'
  /** Additional delay in ms before responding */
  delay?: number
  /** Custom status code override */
  statusCode?: number
}

/** Configuration for the mock HTTP server */
export interface MockServerConfig {
  /** App type to serve fixtures for (used for display and handler resolution) */
  appType: string
  /** Path to a directory of JSON fixture files (takes priority over appType for data) */
  fixturesPath?: string
  /** Port to listen on (default 4000) */
  port?: number
  /** Default response delay in ms (default 0) */
  defaultDelay?: number
  /** Default state for all endpoints */
  defaultState?: 'success' | 'empty' | 'error' | 'unauthorized'
  /** Per-endpoint state overrides (key: "METHOD /path") */
  endpointStates?: Record<string, ResponseState>
  /** Path to handler templates directory (auto-detected from appType) */
  handlersPath?: string
  /** Custom fixture data to use instead of auto-generated */
  customFixtures?: AppFixtureSet
  /** Whether to log requests (default true) */
  logging?: boolean
}

/** Running mock server instance with control methods */
export interface MockServer {
  /** The port the server is listening on */
  port: number
  /** The app type being served */
  appType: string
  /** Set the state for a specific endpoint */
  setState: (endpointKey: string, state: ResponseState) => void
  /** Set the default state for all endpoints */
  setDefaultState: (state: 'success' | 'empty' | 'error' | 'unauthorized') => void
  /** Get the fixture set being served */
  getFixtures: () => AppFixtureSet
  /** Close the server */
  close: () => Promise<void>
}

/* ------------------------------------------------------------------ */
/*  App Fixture Data Types                                             */
/* ------------------------------------------------------------------ */

/** Pre-built fixture record for a specific resource */
export interface FixtureRecord {
  [key: string]: unknown
}

/** App-specific fixture data pools */
export interface AppDataPool {
  /** App type name */
  appType: string
  /** Resource-keyed fixture data: resource name -> array of records */
  resources: Record<string, FixtureRecord[]>
  /** Report endpoints: endpoint path suffix -> response data */
  reports?: Record<string, unknown>
}
