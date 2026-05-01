/**
 * OpenAPI 3.1 schema generator + runtime validator + Swagger-UI-
 * compatible JSON output for any molecule API app.
 *
 * The package is pure — no I/O, no global state, no DB, no clock
 * reads. Everything is a function of `(spec, route, payload)`. That
 * keeps the same code reusable from handlers, fixtures, mock-server
 * setup, and unit tests.
 *
 * Three building blocks:
 *
 * 1. **`defineOpenApi(spec)`** — typed builder that fills in defaults
 *    and returns a fully-populated `OpenApiDoc`.
 * 2. **`routeToOperation(route)`** — converts a route definition
 *    (zod schemas or pre-built JSON Schema) to an OpenAPI Operation.
 * 3. **`validateRequest(operation, payload)`** — runtime validation
 *    against the operation's schemas. When zod sources are attached
 *    via `annotateOperation()`, errors come straight from zod's
 *    `safeParse` for message fidelity.
 *
 * The `createOpenApiHandler()` helper turns a doc into a
 * framework-agnostic `GET /openapi.json` HTTP handler.
 *
 * @example
 * ```ts
 * import { z } from 'zod'
 * import {
 *   defineOpenApi,
 *   routeToOperation,
 *   addRouteToDoc,
 *   annotateOperation,
 *   validateRequest,
 *   createOpenApiHandler,
 * } from '@molecule/api-openapi'
 *
 * const doc = defineOpenApi({ info: { title: 'Demo API', version: '1.0.0' } })
 *
 * const route = {
 *   method: 'post' as const,
 *   path: '/users',
 *   summary: 'Create user',
 *   request: {
 *     body: z.object({ email: z.string().email(), name: z.string().min(1) }),
 *   },
 *   response: { '201': z.object({ id: z.string().uuid() }) },
 * }
 *
 * const operation = routeToOperation(route)
 * annotateOperation(route, operation, doc)
 * addRouteToDoc(doc, route, operation)
 *
 * const result = validateRequest(operation, { body: { email: 'a@b.co', name: 'Ada' } })
 * if (!result.success) console.error(result.errors)
 *
 * const handler = createOpenApiHandler(doc)
 * // app.get('/openapi.json', handler)
 * ```
 *
 * @remarks
 * The validator prefers zod schemas when they're attached via
 * `annotateOperation()` — this gives you zod's full error messages,
 * coercion rules, and refinements. For handcrafted JSON Schemas a
 * built-in mini-validator handles the keywords this package emits
 * (`type`, `required`, `properties`, `items`, `enum`, `const`,
 * `pattern`, length and numeric bounds, `additionalProperties`,
 * `anyOf`/`oneOf`/`allOf`, and local `$ref` resolution).
 *
 * Path parameters in routes can use either Express (`/users/:id`) or
 * OpenAPI (`/users/{id}`) syntax — `routeToOperation` and
 * `addRouteToDoc` normalize them.
 *
 * @module
 */

export * from './defineOpenApi.js'
export * from './handler.js'
export * from './routeToOperation.js'
export * from './types.js'
export * from './utilities.js'
export * from './validateRequest.js'
export * from './zodToJsonSchema.js'
