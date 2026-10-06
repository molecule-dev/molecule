/**
 * The mock server, in the browser: a `fetch` that answers `/api/*` from a
 * bundled fixture set through the shared fixture router, so a static build of
 * an app runs on its sample data with no server at all.
 *
 * On top of the stateless fixture router it keeps an in-memory overlay so the
 * app feels alive: a POST to a list endpoint adds a record the next GET of
 * that list returns, PUT/PATCH merge into the record, DELETE removes it, and
 * a detail GET (`/api/posts/:id`) returns the record with THAT id rather than
 * the router's first record. Nothing persists — a reload starts from the
 * fixtures again.
 *
 * Browser-safe: no `node:` imports.
 */

import {
  compileFixtureRoutes,
  type FixtureResponse,
  fixtureResponse,
  type FixtureRoute,
  matchFixtureRoute,
  type RoutableFixture,
  type SerializedFixtureSet,
  unmatchedFixtureResponse,
} from '../router/router.js'
import type { HttpMethod } from '../types.js'

/** A JSON object record. */
type JsonRecord = Record<string, unknown>

/** The endpoints a demo session answers itself (paths include the `/api` prefix). */
export interface FixtureAuthEndpoints {
  /** GET endpoints that return the signed-in user (e.g. `/api/users/me`). */
  currentUser: string[]
  /** POST endpoints that sign in (any credentials succeed). */
  login: string[]
  /** POST endpoints that register (any input succeeds). */
  register: string[]
  /** POST endpoints that sign out. */
  logout: string[]
  /** POST endpoints that refresh the session. */
  refresh: string[]
}

/**
 * The auth endpoint paths the molecule auth client and the flagship templates
 * use. Paths not present in an app are simply never requested.
 */
export const DEFAULT_FIXTURE_AUTH_ENDPOINTS: FixtureAuthEndpoints = {
  currentUser: ['/api/users/me', '/api/auth/me', '/api/auth/profile', '/api/me'],
  login: ['/api/users/log-in', '/api/users/login', '/api/auth/login'],
  register: ['/api/users', '/api/auth/register', '/api/users/sign-up', '/api/users/signup'],
  logout: ['/api/users/log-out', '/api/users/logout', '/api/auth/logout'],
  refresh: ['/api/auth/refresh', '/api/users/refresh'],
}

/** Options for {@link createFixtureFetch}. */
export interface FixtureFetchOptions {
  /** The serialized fixture set to answer from. */
  fixtures: SerializedFixtureSet
  /** The signed-in demo user. Defaults to the first `users` fixture record. */
  persona?: JsonRecord
  /** Override the auth endpoints the demo session answers. */
  auth?: Partial<FixtureAuthEndpoints>
  /** Called when the demo session signs in or out (e.g. to set a cookie hint). */
  onSessionChange?: (signedIn: boolean) => void
  /** Start signed in (default `true`). */
  signedIn?: boolean
  /** Path prefix that marks an API request (default `/api`). */
  apiPrefix?: string
  /** Same-origin check base; defaults to `location.origin` in a browser. */
  origin?: string
  /** Clock for generated timestamps (tests). */
  now?: () => Date
}

/** A `fetch`-compatible function plus the demo session state it keeps. */
export interface FixtureFetch {
  /** Answer one request (same signature as `fetch`). */
  (input: RequestInfo | URL, init?: RequestInit): Promise<Response>
  /** Whether the demo session is signed in. */
  isSignedIn(): boolean
  /** The persona returned by the current-user endpoints. */
  persona: JsonRecord
}

/**
 * A request the fixture fetch should answer, or `null` when it is not an API
 * request (another origin, or outside `apiPrefix`).
 * @param input - The fetch input.
 * @param init - The fetch init.
 * @param origin - The page origin.
 * @param apiPrefix - The API path prefix.
 * @returns The method, path and body source, or `null`.
 */
function toApiRequest(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  origin: string,
  apiPrefix: string,
): { method: string; pathname: string; request: Request | null; body: BodyInit | null } | null {
  const request = typeof Request !== 'undefined' && input instanceof Request ? input : null
  const raw = request ? request.url : input instanceof URL ? input.href : String(input)
  let url: URL
  try {
    url = new URL(raw, origin)
  } catch (_error) {
    // Not a URL the page could fetch either — let the real fetch report it.
    return null
  }
  if (url.origin !== origin) return null
  if (url.pathname !== apiPrefix && !url.pathname.startsWith(`${apiPrefix}/`)) return null
  const method = (init?.method ?? request?.method ?? 'GET').toUpperCase()
  return {
    method,
    pathname: url.pathname.replace(/\/+$/, '') || '/',
    request,
    body: init?.body ?? null,
  }
}

/**
 * Read a request body as a plain object: JSON, form data (files become
 * `{ name, size, type, url }` with an object URL), or url-encoded text.
 * @param body - The `init.body`, if any.
 * @param request - The `Request` input, if any.
 * @returns The parsed fields (`{}` when there is no readable body).
 */
async function readBody(body: BodyInit | null, request: Request | null): Promise<JsonRecord> {
  let source: unknown = body
  if (source == null && request && request.body) {
    try {
      source = await request.clone().text()
    } catch (_error) {
      // An already-consumed or unreadable body has no fields to merge.
      return {}
    }
  }
  if (source == null) return {}
  if (typeof FormData !== 'undefined' && source instanceof FormData) {
    const out: JsonRecord = {}
    source.forEach((value, key) => {
      out[key] =
        typeof value === 'string'
          ? value
          : {
              name: value.name,
              size: value.size,
              type: value.type,
              url: typeof URL.createObjectURL === 'function' ? URL.createObjectURL(value) : '',
            }
    })
    return out
  }
  if (typeof URLSearchParams !== 'undefined' && source instanceof URLSearchParams) {
    return Object.fromEntries(source.entries())
  }
  if (typeof source === 'string') {
    try {
      const parsed: unknown = JSON.parse(source)
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as JsonRecord)
        : {}
    } catch (_error) {
      // Not JSON (e.g. url-encoded text) — read it as form fields.
      return Object.fromEntries(new URLSearchParams(source).entries())
    }
  }
  return {}
}

/**
 * A JSON `Response`.
 * @param response - Status and body.
 * @param headers - Extra headers.
 * @returns The response.
 */
function toResponse(response: FixtureResponse, headers: Record<string, string> = {}): Response {
  if (response.body === null || response.status === 204) {
    return new Response(null, { status: response.status, headers })
  }
  return new Response(JSON.stringify(response.body), {
    status: response.status,
    headers: { 'content-type': 'application/json', ...headers },
  })
}

/** A list collection held in the overlay. */
interface Collection {
  /** The current records. */
  items: JsonRecord[]
  /** Rebuild the list response body around `items` (bare array or envelope). */
  wrap: (items: JsonRecord[]) => unknown
}

/**
 * Pull the record array out of a list response body: a bare array, or an
 * envelope whose `data`/`items`/`results` (or sole array field) holds it.
 * @param body - A GET list success body.
 * @returns The records and a function that rebuilds the body, or `null`.
 */
function asCollection(body: unknown): Collection | null {
  const isRecords = (v: unknown): v is JsonRecord[] =>
    Array.isArray(v) && v.every((x) => x !== null && typeof x === 'object' && !Array.isArray(x))
  if (isRecords(body)) {
    return { items: structuredClone(body), wrap: (items) => items }
  }
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    const env = body as JsonRecord
    const keys = Object.keys(env).filter((k) => isRecords(env[k]))
    const key =
      ['data', 'items', 'results'].find((k) => keys.includes(k)) ??
      (keys.length === 1 ? keys[0] : undefined)
    if (!key) return null
    return {
      items: structuredClone(env[key] as JsonRecord[]),
      wrap: (items) => ({
        ...env,
        [key]: items,
        ...('total' in env ? { total: items.length } : {}),
      }),
    }
  }
  return null
}

/**
 * Whether a record has the given id (compared as strings, also by `slug`).
 * @param record - A fixture record.
 * @param id - The path id.
 * @returns `true` on a match.
 */
function hasId(record: JsonRecord, id: string): boolean {
  return (
    (record.id !== undefined && String(record.id) === id) ||
    (record.slug !== undefined && String(record.slug) === id)
  )
}

/**
 * Create a fixture-answering `fetch`. Requests outside the API prefix (or to
 * another origin) go to `realFetch` unchanged.
 * @param options - Fixtures, persona and session options.
 * @param realFetch - The fetch to delegate non-API requests to.
 * @returns The fetch function with its demo-session state.
 */
export function createFixtureFetch(
  options: FixtureFetchOptions,
  realFetch: typeof fetch = globalThis.fetch.bind(globalThis),
): FixtureFetch {
  const apiPrefix = options.apiPrefix ?? '/api'
  const origin =
    options.origin ?? (typeof location !== 'undefined' ? location.origin : 'http://localhost')
  const now = options.now ?? (() => new Date())
  const auth: FixtureAuthEndpoints = { ...DEFAULT_FIXTURE_AUTH_ENDPOINTS, ...options.auth }
  const routes: Array<FixtureRoute<RoutableFixture>> = compileFixtureRoutes(
    options.fixtures.endpoints,
  )
  const lists = new Map<string, FixtureRoute<RoutableFixture>>()
  for (const route of routes) {
    if (
      route.method === 'GET' &&
      route.paramNames.length === 0 &&
      !lists.has(route.path.toLowerCase())
    ) {
      lists.set(route.path.toLowerCase(), route)
    }
  }
  const collections = new Map<string, Collection | null>()
  let signedIn = options.signedIn ?? true
  let seq = 0

  const persona: JsonRecord = options.persona ?? defaultPersona(options.fixtures)

  /** The overlay collection for a list path, created from its fixture on first use. */
  const collectionFor = (listPath: string): Collection | null => {
    const key = listPath.toLowerCase()
    if (collections.has(key)) return collections.get(key) ?? null
    const route = lists.get(key)
    const collection = route ? asCollection(route.fixture.successResponse) : null
    collections.set(key, collection)
    return collection
  }

  /** Split `/api/posts/42` into the list `/api/posts` and id `42`, when that list exists. */
  const splitDetail = (pathname: string): { list: string; id: string } | null => {
    const cut = pathname.lastIndexOf('/')
    if (cut <= 0) return null
    const list = pathname.slice(0, cut)
    if (!lists.has(list.toLowerCase())) return null
    return { list, id: decodeURIComponent(pathname.slice(cut + 1)) }
  }

  /**
   * Whether the fixture for a write answers with the list body itself (a cart
   * returns the whole cart from POST/DELETE) rather than a single record.
   */
  const answersWithList = (method: string, pathname: string, listPath: string): boolean => {
    const write = matchFixtureRoute(routes, method, pathname)?.route.fixture.successResponse
    const list = lists.get(listPath.toLowerCase())?.fixture.successResponse
    if (write === null || write === undefined || !isPlainObject(write) || list === undefined)
      return false
    const writeKeys = Object.keys(write).sort().join()
    return writeKeys !== '' && isPlainObject(list) && writeKeys === Object.keys(list).sort().join()
  }

  const setSession = (value: boolean): void => {
    signedIn = value
    options.onSessionChange?.(value)
  }

  const userBody = (): JsonRecord => ({ ...persona, user: persona })
  const sessionBody = (): JsonRecord => ({
    user: persona,
    accessToken: 'static-preview-token',
    token: 'static-preview-token',
  })

  const answer = async (
    method: string,
    pathname: string,
    body: () => Promise<JsonRecord>,
  ): Promise<FixtureResponse> => {
    const lower = pathname.toLowerCase()
    const isAuth = (paths: string[]): boolean => paths.some((p) => p.toLowerCase() === lower)

    // Demo session.
    if (method === 'GET' && isAuth(auth.currentUser)) {
      return signedIn
        ? { status: 200, body: userBody() }
        : { status: 401, body: { error: 'Unauthorized' } }
    }
    if (
      method === 'POST' &&
      (isAuth(auth.login) || isAuth(auth.register) || isAuth(auth.refresh))
    ) {
      if (isAuth(auth.refresh) && !signedIn) return { status: 401, body: { error: 'Unauthorized' } }
      setSession(true)
      return { status: 200, body: sessionBody() }
    }
    if (method === 'POST' && isAuth(auth.logout)) {
      setSession(false)
      return { status: 200, body: {} }
    }

    // Overlay: lists and their records.
    if (method === 'GET' && lists.has(lower)) {
      const collection = collectionFor(pathname)
      if (collection) return { status: 200, body: collection.wrap(collection.items) }
    }
    const detail = splitDetail(pathname)
    if (detail) {
      const collection = collectionFor(detail.list)
      const index = collection ? collection.items.findIndex((r) => hasId(r, detail.id)) : -1
      if (collection && index >= 0) {
        if (method === 'GET') return { status: 200, body: collection.items[index] }
        if (method === 'PUT' || method === 'PATCH') {
          const merged = {
            ...collection.items[index],
            ...(await body()),
            id: collection.items[index].id,
            updatedAt: now().toISOString(),
          }
          collection.items[index] = merged
          return { status: 200, body: merged }
        }
        if (method === 'DELETE') {
          collection.items.splice(index, 1)
          // An endpoint whose fixture answers a DELETE with the updated list
          // (a cart) gets the overlay list back; a plain resource gets 204.
          return answersWithList('DELETE', pathname, detail.list)
            ? { status: 200, body: collection.wrap(collection.items) }
            : { status: 204, body: null }
        }
      }
    }
    if (method === 'POST' && lists.has(lower)) {
      const collection = collectionFor(pathname)
      if (collection) {
        const stamp = now().toISOString()
        const template = collection.items[0] ?? {}
        const created: JsonRecord = {
          ...blankLike(template),
          ...(await body()),
          id:
            typeof template.id === 'number'
              ? Date.now() + seq++
              : `preview-${Date.now().toString(36)}-${seq++}`,
          createdAt: stamp,
          updatedAt: stamp,
        }
        collection.items.unshift(created)
        return {
          status: 201,
          body: answersWithList('POST', pathname, pathname)
            ? collection.wrap(collection.items)
            : created,
        }
      }
    }

    // Everything else: the fixture router, exactly as the mock server serves it.
    const match = matchFixtureRoute(routes, method, pathname)
    if (!match) return unmatchedFixtureResponse(method, undefined)
    const response = fixtureResponse(match.route.fixture, match.route.method as HttpMethod, {
      state: 'success',
    })
    if (
      (method === 'POST' || method === 'PUT' || method === 'PATCH') &&
      isPlainObject(response.body)
    ) {
      return { status: response.status, body: { ...response.body, ...(await body()) } }
    }
    return response
  }

  const fixtureFetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const request = toApiRequest(input, init, origin, apiPrefix)
    if (!request) return realFetch(input as RequestInfo, init)
    const response = await answer(request.method, request.pathname, () =>
      readBody(request.body, request.request),
    )
    return toResponse(response, { 'x-static-preview': 'true' })
  }) as FixtureFetch
  fixtureFetch.isSignedIn = () => signedIn
  fixtureFetch.persona = persona
  return fixtureFetch
}

/**
 * Whether a value is a plain (non-array) object.
 * @param value - Anything.
 * @returns `true` for a plain object.
 */
function isPlainObject(value: unknown): value is JsonRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/**
 * A copy of a record with every array field emptied and nested records kept,
 * so a created record has the shape list rows read (`tags.map`, `author.name`)
 * without inheriting another record's content.
 * @param record - A sibling record.
 * @returns The blanked shape.
 */
function blankLike(record: JsonRecord): JsonRecord {
  const out: JsonRecord = {}
  for (const [key, value] of Object.entries(record)) {
    if (Array.isArray(value)) out[key] = []
    else if (isPlainObject(value)) out[key] = structuredClone(value)
  }
  return out
}

/**
 * The demo persona: the first record of a `users`-like list fixture, or a
 * neutral sample user when the app has none.
 * @param fixtures - The fixture set.
 * @returns The persona record.
 */
export function defaultPersona(fixtures: SerializedFixtureSet): JsonRecord {
  for (const name of ['/api/users', '/api/members', '/api/profiles', '/api/team']) {
    const entry = fixtures.endpoints.find(
      ([, f]) => f.endpoint.method === 'GET' && f.endpoint.path.toLowerCase() === name,
    )
    const list = entry ? asCollection(entry[1].successResponse) : null
    const first = list?.items[0]
    if (first && (first.email || first.name || first.username)) return structuredClone(first)
  }
  return {
    id: 'preview-user',
    name: 'Alex Morgan',
    username: 'alexmorgan',
    email: 'alex@example.com',
    role: 'admin',
  }
}
