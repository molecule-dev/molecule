/**
 * Shared test doubles for the Fly.io sandbox provider suite.
 *
 * @module
 */

import { vi } from 'vitest'

import type { ObjectStore, StoredObject } from '../storage.js'

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

/** An in-memory {@link ObjectStore} double with injectable failures. */
export interface StoreDouble extends ObjectStore {
  /** The backing objects, keyed by object key. */
  objects: Map<string, { body: string; lastModified: string }>
  /** Presigned URLs handed out, in order, as `METHOD <key>`. */
  presigned: string[]
  /** Make the next call to one operation reject. */
  failNext(operation: 'list' | 'head' | 'getText' | 'putText' | 'remove', error: Error): void
  /** Write an object directly, bypassing the failure queue. */
  seed(key: string, body: string, lastModified?: string): void
}

/**
 * Creates an in-memory object store double.
 * @param prefix - Key prefix the store reports.
 * @param bucket - Bucket name the store reports.
 * @returns The store double.
 */
export function createStoreDouble(
  prefix = 'molecule-sandbox-templates',
  bucket = 'templates',
): StoreDouble {
  const objects = new Map<string, { body: string; lastModified: string }>()
  const failures = new Map<string, Error>()
  const presigned: string[] = []

  const trip = (operation: string): void => {
    const error = failures.get(operation)
    if (error) {
      failures.delete(operation)
      throw error
    }
  }
  const describeObject = (key: string): StoredObject => {
    const entry = objects.get(key) as { body: string; lastModified: string }
    return { key, size: Buffer.byteLength(entry.body), lastModified: entry.lastModified }
  }

  return {
    describe: `s3://${bucket}/${prefix} (double)`,
    bucket,
    prefix,
    objects,
    presigned,
    failNext(operation, error) {
      failures.set(operation, error)
    },
    seed(key, body, lastModified = new Date().toISOString()) {
      objects.set(key, { body, lastModified })
    },
    async list(searchPrefix) {
      trip('list')
      return [...objects.keys()].filter((key) => key.startsWith(searchPrefix)).map(describeObject)
    },
    async head(key) {
      trip('head')
      return objects.has(key) ? describeObject(key) : null
    },
    async getText(key) {
      trip('getText')
      return objects.get(key)?.body ?? null
    },
    async putText(key, body) {
      trip('putText')
      objects.set(key, { body, lastModified: new Date().toISOString() })
    },
    async remove(keys) {
      trip('remove')
      for (const key of keys) objects.delete(key)
    },
    async presignPut(key) {
      presigned.push(`PUT ${key}`)
      return `https://store.example/${key}?X-Amz-Signature=put`
    },
    async presignGet(key) {
      presigned.push(`GET ${key}`)
      return `https://store.example/${key}?X-Amz-Signature=get`
    },
  }
}

/** A logger double matching the `@molecule/api-bond` logger shape. */
export const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
}
