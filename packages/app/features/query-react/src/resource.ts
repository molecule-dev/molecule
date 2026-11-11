/**
 * One API resource on the shared query cache: its list and detail reads as `useQuery` options,
 * and its writes as functions that put the server's answer into the cache.
 *
 * @module
 */

import type { QueryKey, QueryOptions } from '@molecule/app-query'
import { getQueryClient, hashQueryKey } from '@molecule/app-query'

/** The part of an HTTP response a resource reads. */
export interface ResourceResponse {
  /** The parsed response body. */
  data: unknown
}

/**
 * The HTTP client a resource calls: the app's own bonded client (`getClient()` from
 * `@molecule/app-http`) has this shape. Only what a resource uses is named here.
 */
export interface ResourceHttp {
  /** Reads `path`; `signal` cancels it and `params` become the query string. */
  get(
    path: string,
    options?: { signal?: AbortSignal; params?: Record<string, unknown> },
  ): Promise<ResourceResponse>
  /** Creates at `path`. */
  post(path: string, body?: unknown): Promise<ResourceResponse>
  /** Replaces at `path`. */
  put(path: string, body?: unknown): Promise<ResourceResponse>
  /** Removes at `path`. */
  delete(path: string): Promise<ResourceResponse>
}

/** What {@link createQueryResource} needs to know about one resource. */
export interface QueryResourceConfig<T> {
  /** The first element of every cache key of this resource, e.g. `'invoices'`. */
  name: string
  /** The collection's path under the API base, e.g. `'/invoices'`. */
  path: string
  /** The app's HTTP client, read on every call so a client bonded later is the one used. */
  http: () => ResourceHttp
  /** The field a record is addressed by in a URL. Defaults to `'id'`. */
  id?: keyof T & string
  /** Reads the records out of a list response. Defaults to the body itself. */
  readList?: (response: ResourceResponse) => T[]
  /** Reads the record out of a detail or write response. Defaults to the body itself. */
  readOne?: (response: ResourceResponse) => T | null
}

/** The reads and writes {@link createQueryResource} returns. */
export interface QueryResource<T, Create = Partial<T>, Update = Partial<T>> {
  /**
   * `useQuery` options for the collection. `viewer` is who the answer is for (the signed-in id,
   * or `'anonymous'`); a page or filter change keeps the rows on screen until the next answer.
   */
  list(viewer: string, params?: Record<string, unknown>): QueryOptions<T[]>
  /**
   * `useQuery` options for one record, or null while `id` is not known yet (`useQuery(null)`
   * observes nothing). A missing record resolves to null, not to an error.
   */
  detail(viewer: string, id: string | null | undefined): QueryOptions<T | null> | null
  /** Creates a record, shows it in the cache and refreshes the lists on screen. */
  create(viewer: string, input: Create): Promise<T>
  /** Updates a record, shows the saved record in the cache and refreshes the lists on screen. */
  update(viewer: string, id: string, input: Update): Promise<T>
  /** Removes a record, drops it from the cache and refreshes the lists on screen. */
  remove(viewer: string, id: string): Promise<void>
  /**
   * Switches a flag the API models as a sub-path: `POST path/id/action` turns it on and
   * `DELETE path/id/action` turns it off. Resolves with the saved record, so it is the `commit`
   * of `useOptimisticValue`.
   */
  toggle(viewer: string, id: string, action: string, on: boolean): Promise<T>
  /** Fetches the lists on screen again, after a change this resource did not make itself. */
  refresh(viewer: string): Promise<void>
}

/** How many of a viewer's most recent lists a write fetches again. */
const REFRESHED_LISTS = 4

/**
 * Describe one API resource once and get its reads and writes on the shared cache.
 *
 * A page that loads with `fetch` inside an effect and mirrors the answer into `useState` has to
 * re-solve the same three problems on every screen: a late answer for the previous page lands
 * over the current one, a list still shows what it showed before a comment was added, and a
 * button is live before its record exists. Here the reads are `useQuery` options (one key per
 * viewer, page and filter; the previous rows stay until the next answer) and every write puts
 * the server's own record into the cache and fetches the lists on screen again.
 *
 * Markup, labels and routes stay in the app. The factory has no vendor in it: the HTTP client
 * and the query provider are whatever the app bonded.
 *
 * @param config - The resource's name, path, HTTP client and response readers.
 * @returns List and detail query options, and create, update, remove, toggle and refresh.
 * @throws {Error} When a write's response holds no record.
 */
export function createQueryResource<T, Create = Partial<T>, Update = Partial<T>>(
  config: QueryResourceConfig<T>,
): QueryResource<T, Create, Update> {
  const readList = config.readList ?? ((response: ResourceResponse) => response.data as T[])
  const readOne = config.readOne ?? ((response: ResourceResponse) => response.data as T | null)
  const idField = config.id ?? 'id'
  const base = config.path.replace(/\/+$/, '')
  const one = (id: string): string => `${base}/${encodeURIComponent(id)}`
  const detailKey = (viewer: string, id: string): QueryKey => [config.name, viewer, 'detail', id]
  // The lists handed out most recently, newest last: the ones a write fetches again. A list
  // nobody reads any more costs one request and is then dropped by the next ones.
  const recent = new Map<string, { viewer: string; options: QueryOptions<T[]> }>()

  const list = (viewer: string, params: Record<string, unknown> = {}): QueryOptions<T[]> => {
    const options: QueryOptions<T[]> = {
      key: [config.name, viewer, 'list', params],
      principal: viewer,
      keepPreviousData: true,
      fetch: async (signal) => readList(await config.http().get(base, { signal, params })),
    }
    const hash = hashQueryKey(options.key)
    recent.delete(hash)
    recent.set(hash, { viewer, options })
    for (const stale of [...recent.keys()].slice(0, -REFRESHED_LISTS)) recent.delete(stale)
    return options
  }

  const refresh = async (viewer: string): Promise<void> => {
    const client = getQueryClient()
    client.invalidate([config.name, viewer, 'list'])
    await Promise.all(
      [...recent.values()]
        .filter((entry) => entry.viewer === viewer)
        .map((entry) =>
          client.fetch(entry.options).catch((_error) => {
            // The mounted `useQuery` of that list presents its own failure as `status: 'error'`;
            // the write that asked for this refresh succeeded and must not reject over it.
          }),
        ),
    )
  }

  const saved = async (viewer: string, response: ResourceResponse): Promise<T> => {
    const record = readOne(response)
    if (record == null) throw new Error(`${config.name}: the response held no record`)
    const id = (record as Record<string, unknown>)[idField]
    if (typeof id === 'string' || typeof id === 'number')
      getQueryClient().set(detailKey(viewer, String(id)), record)
    await refresh(viewer)
    return record
  }

  return {
    list,
    detail: (viewer, id) =>
      id == null || id === ''
        ? null
        : {
            key: detailKey(viewer, id),
            principal: viewer,
            fetch: async (signal) => {
              try {
                return readOne(await config.http().get(one(id), { signal }))
              } catch (error) {
                // A record that does not exist is an answer, not a failed load.
                if ((error as { status?: unknown } | null)?.status === 404) return null
                throw error
              }
            },
          },
    create: async (viewer, input) => saved(viewer, await config.http().post(base, input)),
    update: async (viewer, id, input) => saved(viewer, await config.http().put(one(id), input)),
    remove: async (viewer, id) => {
      await config.http().delete(one(id))
      getQueryClient().set<T | null>(detailKey(viewer, id), null)
      await refresh(viewer)
    },
    toggle: async (viewer, id, action, on) => {
      const path = `${one(id)}/${action.replace(/^\/+/, '')}`
      return saved(viewer, on ? await config.http().post(path) : await config.http().delete(path))
    },
    refresh,
  }
}
