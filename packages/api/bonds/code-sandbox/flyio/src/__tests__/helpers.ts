/**
 * Shared test doubles for the Fly.io sandbox provider suite.
 *
 * @module
 */

import { vi } from 'vitest'

/** One recorded outbound request. */
export interface RecordedCall {
  method: string
  url: string
  /** Path with the base URL stripped, e.g. `/apps/foo/machines`. */
  path: string
  body: unknown
}

/** A queued canned response. */
export interface CannedResponse {
  status?: number
  body?: unknown
  /** Raw body text; takes precedence over `body`. */
  text?: string
  headers?: Record<string, string>
}

/** A route matcher: `METHOD /path/prefix`, matched by method + path prefix. */
export type RouteKey = string

/** A fetch double that records calls and answers from per-route queues. */
export interface FetchDouble {
  fetch: typeof fetch
  calls: RecordedCall[]
  /** Queue one response for the next matching request. */
  on(route: RouteKey, response: CannedResponse): FetchDouble
  /** Set the fallback response for anything unqueued. */
  fallback(response: CannedResponse): FetchDouble
  /** Every recorded call whose route matches. */
  matching(route: RouteKey): RecordedCall[]
}

const BASE = 'https://api.machines.dev/v1'

/**
 * Splits a route key into its method and path prefix.
 * @param route - A route key such as `POST /apps/x/machines`.
 * @returns The method and path prefix.
 */
function splitRoute(route: RouteKey): { method: string; prefix: string } {
  const index = route.indexOf(' ')
  return { method: route.slice(0, index).toUpperCase(), prefix: route.slice(index + 1) }
}

/**
 * Reports whether a recorded call matches a route key.
 * @param call - The recorded call.
 * @param route - The route key.
 * @returns `true` on a method + path-prefix match.
 */
function matches(call: { method: string; path: string }, route: RouteKey): boolean {
  const { method, prefix } = splitRoute(route)
  return call.method === method && call.path.startsWith(prefix)
}

/**
 * Creates a fetch double for the Fly Machines API.
 * @param baseUrl - Base URL to strip from recorded paths.
 * @returns The fetch double.
 */
export function createFetchDouble(baseUrl = BASE): FetchDouble {
  const calls: RecordedCall[] = []
  const queues = new Map<RouteKey, CannedResponse[]>()
  let fallbackResponse: CannedResponse = { status: 200, body: {} }

  const build = (canned: CannedResponse): Response => {
    const text = canned.text ?? JSON.stringify(canned.body ?? {})
    const headers = new Map(Object.entries(canned.headers ?? {}))
    return {
      status: canned.status ?? 200,
      headers: { get: (name: string) => headers.get(name.toLowerCase()) ?? null },
      text: async () => text,
    } as unknown as Response
  }

  const fetchImpl = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input)
    const call: RecordedCall = {
      method: (init?.method ?? 'GET').toUpperCase(),
      url,
      path: url.startsWith(baseUrl) ? url.slice(baseUrl.length) : url,
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    }
    calls.push(call)

    for (const [route, queue] of queues) {
      if (queue.length && matches(call, route)) return build(queue.shift() as CannedResponse)
    }
    return build(fallbackResponse)
  }) as unknown as typeof fetch

  const double: FetchDouble = {
    fetch: fetchImpl,
    calls,
    on(route, response) {
      const queue = queues.get(route) ?? []
      queue.push(response)
      queues.set(route, queue)
      return double
    },
    fallback(response) {
      fallbackResponse = response
      return double
    },
    matching(route) {
      return calls.filter((call) => matches(call, route))
    },
  }
  return double
}

/** A logger double matching the `@molecule/api-bond` logger shape. */
export const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
}
