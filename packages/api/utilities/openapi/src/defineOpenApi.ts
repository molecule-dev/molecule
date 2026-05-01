/**
 * Typed OpenAPI 3.1 document builder. Normalizes optional fields and
 * fills in defaults so callers can pass a minimal spec and still get
 * a Swagger-UI-compatible document.
 *
 * @module
 */

import type {
  OpenApiComponents,
  OpenApiDoc,
  OpenApiOperation,
  OpenApiPathItem,
  OpenApiSpec,
  RouteDefinition,
} from './types.js'
import { normalizePath } from './utilities.js'

/**
 * Build a complete OpenAPI 3.1 document from a partial spec.
 *
 * `paths`, `components.schemas`, `components.securitySchemes`, etc.
 * are filled with empty objects when omitted so downstream code can
 * mutate them without nil-checks (e.g. `addRouteToDoc`).
 *
 * @param spec - The partial OpenAPI spec to expand.
 * @returns A fully-populated `OpenApiDoc` with `openapi: '3.1.0'`.
 */
export const defineOpenApi = (spec: OpenApiSpec): OpenApiDoc => {
  if (!spec.info?.title || !spec.info?.version) {
    throw new TypeError('defineOpenApi: info.title and info.version are required')
  }
  const components: OpenApiComponents = {
    schemas: {},
    parameters: {},
    responses: {},
    requestBodies: {},
    securitySchemes: {},
    ...(spec.components ?? {}),
  }
  const paths: Record<string, OpenApiPathItem> = {}
  for (const [path, item] of Object.entries(spec.paths ?? {})) {
    paths[normalizePath(path)] = item
  }
  const doc: OpenApiDoc = {
    openapi: '3.1.0',
    info: { ...spec.info },
    ...(spec.servers ? { servers: spec.servers } : {}),
    paths,
    components,
    ...(spec.security ? { security: spec.security } : {}),
    ...(spec.tags ? { tags: spec.tags } : {}),
  }
  return doc
}

/**
 * Add a route's converted operation to an existing OpenAPI document
 * in place. The operation is keyed by `[normalizedPath][method]`,
 * preserving any other operations already on the same path.
 *
 * @param doc - OpenAPI document to mutate.
 * @param route - Route definition to add.
 * @param operation - Pre-converted operation (typically from
 *                    `routeToOperation()`).
 * @returns The same `doc` reference, for chaining.
 */
export const addRouteToDoc = (
  doc: OpenApiDoc,
  route: Pick<RouteDefinition, 'method' | 'path'>,
  operation: OpenApiOperation,
): OpenApiDoc => {
  const path = normalizePath(route.path)
  const existing: OpenApiPathItem = doc.paths[path] ?? {}
  doc.paths[path] = { ...existing, [route.method]: operation }
  return doc
}
