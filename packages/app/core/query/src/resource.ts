/**
 * One API resource on the shared query cache: its list and detail reads as query options (what
 * `useQuery` takes in every framework's query package), and its writes as functions that put the
 * server's answer into the cache. Framework-neutral: `@molecule/app-query-react`, `-vue`,
 * `-solid`, `-svelte` and `-angular` re-export this same function.
 *
 * @module
 */

import { hashQueryKey } from './keys.js'
import { getQueryClient } from './provider.js'
import type { QueryClient, QueryKey, QueryOptions } from './types.js'

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
  /** Changes part of the record at `path`. */
  patch(path: string, body?: unknown): Promise<ResourceResponse>
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
  /** The HTTP method the API updates a record with. Defaults to `'put'`. */
  updateMethod?: 'put' | 'patch'
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
   * One record per URL identity, retaining the first occurrence. Equal values without an
   * addressable id remain separate. Writes already refresh the collection.
   */
  list(viewer: string, params?: Record<string, unknown>): QueryOptions<T[]>
  /**
   * Options for a collection's whole page (rows plus totals), or a filtered collection path.
   * Reads share this resource's mutation refresh and viewer isolation. `readPage` reads the
   * canonical page response for `path`; row-only `list` reads keep a separate cache entry.
   * Supply `removeFromPage` for opaque page envelopes to remove acknowledged deletions
   * immediately and keep stale list responses from restoring them.
   */
  listPage<Page>(
    viewer: string,
    params: Record<string, unknown>,
    readPage: (response: ResourceResponse) => Page,
    path?: string,
    removeFromPage?: (page: Page, id: string) => Page,
  ): QueryOptions<Page>
  /**
   * `useQuery` options for one record, or null while `id` is not known yet (`useQuery(null)`
   * observes nothing). An empty ID is also unknown. A missing record resolves to null.
   */
  detail(viewer: string, id: string | null | undefined): QueryOptions<T | null> | null
  /** Creates a record, shows it in the cache and refreshes the lists on screen. */
  create(viewer: string, input: Create): Promise<T>
  /** Updates a record, shows the saved record in the cache and refreshes the lists on screen. */
  update(viewer: string, id: string, input: Update): Promise<T>
  /** Removes a record from detail and tracked row lists, then refreshes those lists. */
  remove(viewer: string, id: string): Promise<void>
  /**
   * Switches a flag the API models as a sub-path: `POST path/id/action` turns it on and
   * `DELETE path/id/action` turns it off. Resolves with the saved record, so it is the `commit`
   * of `useOptimisticValue`. Rejects an absent or empty record ID before sending a request.
   * The saved detail is published before tracked lists finish refreshing; this promise waits
   * for those refreshes. Render the shared controller's value and let it queue inverse clicks
   * during that interval. A page-local busy guard can drop a click on the newly changed label.
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
 * re-solve the same problems on every screen: a late answer for the previous page lands
 * over the current one, and a list still shows what it showed before a comment was added.
 * Here the reads are `useQuery` options (one key per
 * viewer, page and filter; the previous rows stay until the next answer) and every write puts
 * the server's own record into the cache and fetches the lists on screen again.
 *
 * The factory supplies data operations. Mount a keyed
 * control inside `QueryContent` (your framework's query package: `@molecule/app-query-react`,
 * `-vue`, …) so it receives a loaded record and stays mounted during refresh.
 * For a server-backed toggle, use `useOptimisticValue` from your framework binding
 * (`@molecule/app-react`, `@molecule/app-vue`, …), or `OptimisticToggleButton` from its UI
 * package (`@molecule/app-ui-react`, …) for a boolean. Pass `toggle` as its
 * commit adapter, return the saved flag/count, and render the controller's value for the action
 * label too. Do not block clicks while that commit is pending. The resource example in
 * `@molecule/app-query-react` composes these APIs; a custom handler must provide the same
 * readiness and ordering itself.
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
  const one = (id: string): string => {
    if (id == null || id === '') throw new Error(`${config.name}: a record ID is required`)
    return `${base}/${encodeURIComponent(id)}`
  }
  const detailKey = (viewer: string, id: string): QueryKey => [config.name, viewer, 'detail', id]
  // The lists handed out most recently, newest last: the ones a write fetches again. A list
  // nobody reads any more costs one request and is then dropped by the next ones.
  const recent = new Map<
    string,
    {
      viewer: string
      key: QueryKey
      fetch: (client: QueryClient) => Promise<unknown>
      remove?: (page: unknown, id: string) => unknown
    }
  >()
  const removed = new Map<string, Set<string>>()
  const removals = (viewer: string): Set<string> => removed.get(viewer) ?? new Set()
  const recordId = (record: T): string | undefined => {
    const id = record != null ? (record as Record<string, unknown>)[idField] : undefined
    return typeof id === 'string' || typeof id === 'number' ? String(id) : undefined
  }
  const withoutRemoved = (viewer: string, rows: T[]): T[] => {
    const ids = removed.get(viewer)
    return ids?.size ? rows.filter((record) => !ids.has(recordId(record) ?? '')) : rows
  }
  const normalizeRows = (viewer: string, rows: T[]): T[] => {
    const seen = new Set<string>()
    const kept = rows.filter((record) => {
      const id = recordId(record)
      if (id === undefined) return true
      if (seen.has(id) || removals(viewer).has(id)) return false
      seen.add(id)
      return true
    })
    // Preserve referential equality when the list already satisfies its contract.
    return kept.length === rows.length ? rows : kept
  }
  const projectPage = <Page>(
    viewer: string,
    page: Page,
    remove?: (page: Page, id: string) => Page,
  ): Page => {
    if (!remove) return page
    for (const id of removals(viewer)) page = remove(page, id)
    return page
  }

  const track = <Page>(
    viewer: string,
    options: QueryOptions<Page>,
    remove?: (page: Page, id: string) => Page,
  ): QueryOptions<Page> => {
    const hash = hashQueryKey(options.key)
    recent.delete(hash)
    recent.set(hash, {
      viewer,
      key: options.key,
      fetch: (client) => client.fetch(options),
      ...(remove ? { remove: (page, id) => remove(page as Page, id) } : {}),
    })
    for (const stale of [...recent.keys()].slice(0, -REFRESHED_LISTS)) recent.delete(stale)
    return options
  }

  const list = (viewer: string, params: Record<string, unknown> = {}): QueryOptions<T[]> => {
    const options: QueryOptions<T[]> = {
      key: [config.name, viewer, 'list', params],
      principal: viewer,
      keepPreviousData: true,
      normalizeData: (rows) => normalizeRows(viewer, rows),
      fetch: async (signal) =>
        normalizeRows(viewer, readList(await config.http().get(base, { signal, params }))),
    }
    return track(viewer, options, (rows) => withoutRemoved(viewer, rows))
  }

  const refresh = async (viewer: string): Promise<void> => {
    const client = getQueryClient()
    client.invalidate([config.name, viewer, 'list'])
    await Promise.all(
      [...recent.values()]
        .filter((entry) => entry.viewer === viewer)
        .map(async (entry) => {
          // fetch() deduplicates an existing request. It may have read before this write,
          // so joining it alone cannot refresh the list after the mutation.
          const pending = client.getState(entry.key).isFetching
          const fetch = (): Promise<unknown> =>
            entry.fetch(client).catch((_error) => {
              // The mounted query presents its own failure; the mutation already succeeded.
            })
          await fetch()
          if (pending) {
            client.invalidate(entry.key)
            await fetch()
          }
        }),
    )
  }

  const saved = async (viewer: string, response: ResourceResponse, created = false): Promise<T> => {
    const record = readOne(response)
    if (record == null) throw new Error(`${config.name}: the response held no record`)
    const id = recordId(record)
    if (id !== undefined) {
      if (created) removed.get(viewer)?.delete(id)
      if (!removals(viewer).has(id)) getQueryClient().set(detailKey(viewer, id), record)
    }
    await refresh(viewer)
    return record
  }

  return {
    list,
    listPage: (viewer, params, readPage, path = base, removeFromPage) =>
      track(
        viewer,
        {
          key: [config.name, viewer, 'list', 'page', path, params],
          principal: viewer,
          keepPreviousData: true,
          fetch: async (signal) =>
            projectPage(
              viewer,
              readPage(await config.http().get(path, { signal, params })),
              removeFromPage,
            ),
        },
        removeFromPage,
      ),
    detail: (viewer, id) =>
      id == null || id === ''
        ? null
        : {
            key: detailKey(viewer, id),
            principal: viewer,
            fetch: async (signal) => {
              if (removals(viewer).has(id)) return null
              try {
                const record = readOne(await config.http().get(one(id), { signal }))
                return removals(viewer).has(id) ? null : record
              } catch (error) {
                // A record that does not exist is an answer, not a failed load.
                if ((error as { status?: unknown } | null)?.status === 404) return null
                throw error
              }
            },
          },
    create: async (viewer, input) => saved(viewer, await config.http().post(base, input), true),
    update: async (viewer, id, input) => {
      const path = one(id)
      return saved(viewer, await config.http()[config.updateMethod ?? 'put'](path, input))
    },
    remove: async (viewer, id) => {
      const path = one(id)
      await config.http().delete(path)
      const ids = removed.get(viewer) ?? new Set<string>()
      ids.add(id)
      removed.set(viewer, ids)
      const client = getQueryClient()
      client.set<T | null>(detailKey(viewer, id), null)
      for (const entry of recent.values()) {
        if (entry.viewer !== viewer || !entry.remove) continue
        const page = client.getState(entry.key).data
        if (page !== undefined) client.set(entry.key, entry.remove(page, id))
      }
      await refresh(viewer)
    },
    toggle: async (viewer, id, action, on) => {
      const path = `${one(id)}/${action.replace(/^\/+/, '')}`
      return saved(viewer, on ? await config.http().post(path) : await config.http().delete(path))
    },
    refresh,
  }
}
