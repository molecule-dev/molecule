/**
 * Fixture route matching — the ONE implementation of "which fixture answers
 * this request, and with what status and body".
 *
 * Browser-safe on purpose: no `node:` imports, no Express. The Express mock
 * server dispatches through it, and a static build answers `fetch` from the
 * same code over a serialized fixture set (`@molecule/api-mock-server/router`),
 * so the two can never disagree about routing, precedence or response shape.
 *
 * Matching follows the Express 5 rules the server used to delegate to:
 * `:param` matches one non-empty path segment (decoded), a trailing slash is
 * optional, and matching is case-insensitive. Static paths win over
 * parameterized siblings (`GET /profile/me` before `GET /profile/:id`); within
 * the same parameter count, insertion order decides.
 */

import { getResponseBody, getStatusCode } from '../states/states.js'
import type { HttpMethod, ResponseState } from '../types.js'

/**
 * The minimal shape the router needs from an endpoint fixture. Both a full
 * `EndpointFixture` and a JSON-serialized one (see {@link SerializedFixtureSet})
 * satisfy it.
 */
export interface RoutableFixture {
  /** The endpoint this fixture answers. */
  endpoint: { method: HttpMethod; path: string }
  /** Body served in the `success` state. */
  successResponse: unknown
  /** Body served in the `empty` state. */
  emptyResponse: unknown
  /** Body served in the `error` state. */
  errorResponse: { error: string }
}

/**
 * A fixture set flattened to plain JSON — what a static build bundles.
 * `endpoints` keeps the server's key → fixture pairs in registration order.
 */
export interface SerializedFixtureSet {
  /** App type label the set was built for. */
  appType: string
  /** `[key, fixture]` pairs, e.g. `['GET /api/posts', { … }]`. */
  endpoints: Array<[string, RoutableFixture]>
}

/** One compiled route. */
export interface FixtureRoute<F extends RoutableFixture = RoutableFixture> {
  /** The fixture-set key this route came from (e.g. `GET /api/posts/:id`). */
  key: string
  /** Upper-case HTTP method. */
  method: HttpMethod
  /** The route path, always under `/api`. */
  path: string
  /** Compiled path matcher. */
  pattern: RegExp
  /** `:param` names in path order. */
  paramNames: string[]
  /** The fixture that answers this route. */
  fixture: F
}

/** A successful match. */
export interface FixtureRouteMatch<F extends RoutableFixture = RoutableFixture> {
  /** The matched route. */
  route: FixtureRoute<F>
  /** Decoded path parameters. */
  params: Record<string, string>
}

/** A status + body pair; `body === null` means "no body" (e.g. 204). */
export interface FixtureResponse {
  /** HTTP status code. */
  status: number
  /** JSON body, or `null` for an empty response. */
  body: unknown
}

/**
 * Prefix a route path with `/api` unless it already starts with it — the
 * convention the server has always used for scanner-discovered paths.
 * @param path - A route path such as `/posts/:id` or `/api/posts/:id`.
 * @returns The path under `/api`.
 */
export function toApiPath(path: string): string {
  return path.startsWith('/api') ? path : `/api${path}`
}

/**
 * Number of `:param` segments in a route path.
 * @param path - The route path (e.g. `/profile/:id`).
 * @returns The parameter count.
 */
export function paramCount(path: string): number {
  return path.split('/').filter((segment) => segment.startsWith(':')).length
}

/**
 * Compile an Express-style route path into a case-insensitive matcher.
 * Supports `:name` parameters, `*name` wildcards (one or more segments) and
 * `{…}` optional groups.
 * @param path - The route path.
 * @returns The pattern and the parameter names in order.
 */
export function compileRoutePath(path: string): { pattern: RegExp; paramNames: string[] } {
  const paramNames: string[] = []
  let source = ''
  for (let i = 0; i < path.length; i++) {
    const ch = path[i]
    if (ch === ':' || ch === '*') {
      const name = /^[A-Za-z_$][\w$]*/.exec(path.slice(i + 1))?.[0]
      if (name) {
        paramNames.push(name)
        source += ch === ':' ? '([^/]+?)' : '(.+?)'
        i += name.length
        continue
      }
    }
    if (ch === '{') {
      source += '(?:'
      continue
    }
    if (ch === '}') {
      source += ')?'
      continue
    }
    source += ch.replace(/[.+?^$|()[\]\\]/g, '\\$&')
  }
  const trimmed = source.endsWith('/') && source.length > 1 ? source.slice(0, -1) : source
  return { pattern: new RegExp(`^${trimmed}/?$`, 'i'), paramNames }
}

/**
 * Compile fixture-set entries into routes, sorted static-before-parameterized
 * (stable, so insertion order is kept within one parameter count).
 * @param entries - `[key, fixture]` pairs (a `Map` or an array).
 * @returns The compiled routes in match order.
 */
export function compileFixtureRoutes<F extends RoutableFixture>(
  entries: Iterable<[string, F]>,
): Array<FixtureRoute<F>> {
  return [...entries]
    .map(([key, fixture]) => {
      const path = toApiPath(fixture.endpoint.path)
      return {
        key,
        method: fixture.endpoint.method.toUpperCase() as HttpMethod,
        path,
        ...compileRoutePath(path),
        fixture,
      }
    })
    .sort((a, b) => paramCount(a.path) - paramCount(b.path))
}

/**
 * Find the route that answers a request.
 * @param routes - Routes from {@link compileFixtureRoutes}.
 * @param method - The request method (any case).
 * @param pathname - The request path, without query string.
 * @returns The match, or `undefined` when no route answers.
 */
export function matchFixtureRoute<F extends RoutableFixture>(
  routes: Array<FixtureRoute<F>>,
  method: string,
  pathname: string,
): FixtureRouteMatch<F> | undefined {
  const upper = method.toUpperCase()
  for (const route of routes) {
    if (route.method !== upper) continue
    const m = route.pattern.exec(pathname)
    if (!m) continue
    const params: Record<string, string> = {}
    route.paramNames.forEach((name, i) => {
      const raw = m[i + 1]
      if (raw === undefined) return
      try {
        params[name] = decodeURIComponent(raw)
      } catch (_error) {
        // A malformed escape (`%E0%A4%A`) is kept raw — Express answers 400
        // there, but a fixture lookup has no use for the distinction.
        params[name] = raw
      }
    })
    return { route, params }
  }
  return undefined
}

/**
 * The status + body a fixture serves in a given state.
 * @param fixture - The matched fixture.
 * @param method - The request method.
 * @param state - The effective response state.
 * @returns The response; `body` is `null` when there is no body to send.
 */
export function fixtureResponse(
  fixture: RoutableFixture,
  method: HttpMethod,
  state: ResponseState,
): FixtureResponse {
  const status = getStatusCode(state, method)
  const body = getResponseBody(state, method, fixture)
  return { status, body: status === 204 ? null : (body ?? null) }
}

/**
 * The response for an `/api/*` request no fixture answers: an empty SUCCESS
 * (`[]` for GET, `204` for DELETE, `{}` otherwise) so pages still render — or
 * the error / unauthorized body when that state was asked for.
 * @param method - The request method.
 * @param state - The effective response state, if any.
 * @returns The response; `body` is `null` for the 204.
 */
export function unmatchedFixtureResponse(
  method: string,
  state: ResponseState | undefined,
): FixtureResponse {
  if (state?.state === 'error') return { status: 500, body: { error: 'Internal server error' } }
  if (state?.state === 'unauthorized') return { status: 401, body: { error: 'Unauthorized' } }
  const upper = method.toUpperCase()
  if (upper === 'GET') return { status: 200, body: [] }
  if (upper === 'DELETE') return { status: 204, body: null }
  return { status: 200, body: {} }
}

/**
 * Flatten a fixture set to plain JSON for bundling into a static build. Each
 * endpoint keeps only what the router reads (method, path and the three
 * response bodies), in the set's own order.
 * @param set - A fixture set, e.g. from `buildMockFixtureSet`.
 * @param set.appType - App type label.
 * @param set.endpoints - Key → fixture map.
 * @returns The JSON-safe set; `JSON.stringify` it into the bundle.
 */
export function serializeFixtureSet(set: {
  appType: string
  endpoints: Map<string, RoutableFixture>
}): SerializedFixtureSet {
  return {
    appType: set.appType,
    endpoints: [...set.endpoints.entries()].map(([key, fixture]) => [
      key,
      {
        endpoint: { method: fixture.endpoint.method, path: fixture.endpoint.path },
        successResponse: fixture.successResponse,
        emptyResponse: fixture.emptyResponse,
        errorResponse: fixture.errorResponse,
      },
    ]),
  }
}
