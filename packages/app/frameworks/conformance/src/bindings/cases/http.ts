/**
 * Cases for the HTTP hooks.
 *
 * @module
 */

import type { HookCases } from '../spec.js'

/**
 * `useHttpClient()`: the HTTP client the provider gave, with every request
 * recorded by the scripted client.
 */
export const useHttpClientCases: HookCases = {
  hook: 'useHttpClient',
  cases: [
    {
      name: 'sends a request through the client from the provider',
      context: { http: [{ method: 'GET', url: '/who', data: { name: 'Ada' } }] },
      steps: [{ type: 'call', method: 'get', args: ['/who'] }],
    },
    {
      name: 'a failing request through the client rejects with the HTTP error',
      steps: [{ type: 'call', method: 'get', args: ['/missing'] }],
    },
    {
      name: 'without an http provider the hook throws',
      context: { omitServices: ['http'] },
    },
  ],
}

/** `useHttp(method, url, options)`: request state plus `execute` and `reset`. */
export const useHttpCases: HookCases = {
  hook: 'useHttp',
  cases: [
    {
      name: 'manual by default: no request and no loading until execute runs',
      args: ['GET', '/items'],
    },
    {
      name: 'execute sends the request and stores the data',
      args: ['GET', '/items'],
      context: { http: [{ method: 'GET', url: '/items', data: { items: [1] } }] },
      steps: [{ type: 'call', method: 'execute' }],
    },
    {
      name: 'a status error stores the HttpError and execute resolves null',
      args: ['GET', '/items'],
      context: { http: [{ method: 'GET', url: '/items', status: 500 }] },
      steps: [{ type: 'call', method: 'execute' }],
    },
    {
      name: 'a network error has status 0',
      args: ['GET', '/items'],
      context: { http: [{ method: 'GET', url: '/items', networkError: 'connection refused' }] },
      steps: [{ type: 'call', method: 'execute' }],
    },
    {
      name: 'an unscripted url answers 404',
      args: ['GET', '/none'],
      steps: [{ type: 'call', method: 'execute' }],
    },
    {
      name: 'a deferred request stays loading until it is answered',
      args: ['GET', '/items'],
      context: { http: [{ method: 'GET', url: '/items', defer: true }] },
      steps: [
        { type: 'call', method: 'execute' },
        { type: 'http', method: 'GET', url: '/items', data: { ok: true } },
      ],
    },
    {
      name: 'onSuccess reports each answered request',
      args: ['GET', '/items', { onSuccess: { $fn: 'ok' } }],
      context: { http: [{ method: 'GET', url: '/items', defer: true }] },
      steps: [
        { type: 'call', method: 'execute' },
        { type: 'http', method: 'GET', url: '/items', data: { done: true } },
      ],
    },
    {
      name: 'onError reports a failed request',
      args: ['GET', '/items', { onError: { $fn: 'fail' } }],
      context: { http: [{ method: 'GET', url: '/items', status: 410 }] },
      steps: [{ type: 'call', method: 'execute' }],
    },
    {
      name: 'a second request while the first is pending owns the state',
      args: ['GET', '/items'],
      context: {
        http: [
          { method: 'GET', url: '/items', defer: true },
          { method: 'GET', url: '/items', defer: true },
        ],
      },
      steps: [
        { type: 'call', method: 'execute' },
        { type: 'call', method: 'execute' },
        { type: 'http', method: 'GET', url: '/items', data: { who: 'first' } },
        { type: 'http', method: 'GET', url: '/items', data: { who: 'second' } },
      ],
    },
    {
      name: 'reset supersedes a pending request and clears the state',
      args: ['GET', '/items', { onSuccess: { $fn: 'ok' } }],
      context: { http: [{ method: 'GET', url: '/items', defer: true }] },
      steps: [
        { type: 'call', method: 'execute' },
        { type: 'call', method: 'reset' },
        { type: 'http', method: 'GET', url: '/items', data: { late: true } },
      ],
    },
    {
      name: 'reset clears a stored error',
      args: ['GET', '/items'],
      context: { http: [{ method: 'GET', url: '/items', status: 500 }] },
      steps: [
        { type: 'call', method: 'execute' },
        { type: 'call', method: 'reset' },
      ],
    },
    {
      name: 'an older request answering after a newer one does not overwrite it',
      // Depends on React keeping the first request pending across the argument
      // change: a binding that re-mounts on `args` loses the pending /items/a
      // request and cannot answer it.
      args: ['GET', '/items/a', { onSuccess: { $fn: 'ok' } }],
      context: {
        http: [
          { method: 'GET', url: '/items/a', defer: true },
          { method: 'GET', url: '/items/b', defer: true },
        ],
      },
      steps: [
        { type: 'call', method: 'execute' },
        { type: 'args', args: ['GET', '/items/b', { onSuccess: { $fn: 'ok' } }] },
        { type: 'call', method: 'execute' },
        { type: 'http', method: 'GET', url: '/items/b', data: { who: 'b' } },
        { type: 'http', method: 'GET', url: '/items/a', data: { who: 'a' } },
      ],
    },
    {
      name: 'immediate fetches on mount',
      args: ['GET', '/now', { immediate: true }],
      context: { http: [{ method: 'GET', url: '/now', data: { when: 'now' } }] },
    },
    {
      name: 'immediate stays pending until the deferred answer',
      args: ['GET', '/now', { immediate: true }],
      context: { http: [{ method: 'GET', url: '/now', defer: true }] },
      steps: [{ type: 'http', method: 'GET', url: '/now', data: { when: 'later' } }],
    },
    {
      name: 'an immediate fetch does not repeat when the url changes',
      // Pins the documented mount-only contract of `immediate`: React runs it
      // once per mount, so the /later script is never consumed. A binding that
      // re-mounts the host on `args` fires twice and must track mounts to
      // match.
      args: ['GET', '/first', { immediate: true }],
      context: {
        http: [
          { method: 'GET', url: '/first', data: { v: 1 } },
          { method: 'GET', url: '/later', data: { v: 2 } },
        ],
      },
      steps: [{ type: 'args', args: ['GET', '/later', { immediate: true }] }],
    },
    {
      name: 'request options reach the client: params and config',
      // The scripted client records url, data and params; headers and timeout
      // travel in the same config but are not part of the recorded contract.
      args: [
        'GET',
        '/search',
        { params: { page: 2 }, headers: { accept: 'application/json' }, timeout: 250 },
      ],
      context: { http: [{ method: 'GET', url: '/search', data: { page: 2 } }] },
      steps: [{ type: 'call', method: 'execute' }],
    },
    {
      name: 'an unsupported method fails without sending a request',
      args: ['TRACE', '/items'],
      steps: [{ type: 'call', method: 'execute' }],
    },
    {
      name: 'execute keeps one identity across its own loading and data updates',
      // useHttp documents execute as identity-stable while method, url and the
      // client stay the same — the contract that makes it safe as a useEffect
      // dependency. The stable steps pin it across the hook's own re-renders
      // (no argument change, which would re-mount in other frameworks).
      args: ['GET', '/items'],
      context: {
        http: [
          { method: 'GET', url: '/items', data: { v: 1 } },
          { method: 'GET', url: '/items', data: { v: 2 } },
        ],
      },
      steps: [
        { type: 'stable', methods: ['execute', 'reset'] },
        { type: 'call', method: 'execute' },
        { type: 'stable', methods: ['execute', 'reset'] },
        { type: 'call', method: 'execute' },
        { type: 'stable', methods: ['execute', 'reset'] },
      ],
    },
    {
      name: 'unmount while pending: the late answer changes nothing and warns nobody',
      args: ['GET', '/items', { onSuccess: { $fn: 'ok' } }],
      context: { http: [{ method: 'GET', url: '/items', defer: true }] },
      steps: [
        { type: 'call', method: 'execute' },
        { type: 'unmount' },
        { type: 'http', method: 'GET', url: '/items', data: { late: true } },
      ],
    },
    {
      name: 'without an http provider the hook throws',
      context: { omitServices: ['http'] },
    },
  ],
}

/** `useGet(url, options)`: the GET spelling of `useHttp`. */
export const useGetCases: HookCases = {
  hook: 'useGet',
  cases: [
    {
      name: 'fetches immediately on mount',
      args: ['/items', { immediate: true }],
      context: { http: [{ method: 'GET', url: '/items', data: { items: [1, 2] } }] },
    },
    {
      name: 'a refetch takes over with the next answer',
      args: ['/items', { immediate: true }],
      context: {
        http: [
          { method: 'GET', url: '/items', data: { v: 1 } },
          { method: 'GET', url: '/items', data: { v: 2 } },
        ],
      },
      steps: [{ type: 'call', method: 'execute' }],
    },
    {
      name: 'a 404 on the initial load shows the error',
      args: ['/missing', { immediate: true }],
    },
  ],
}

/** `usePost(url, options)`: the POST spelling, with the body in `options.data`. */
export const usePostCases: HookCases = {
  hook: 'usePost',
  cases: [
    {
      name: 'execute sends the body with the request',
      args: ['/save', { data: { name: 'Ada' } }],
      context: { http: [{ method: 'POST', url: '/save', data: { saved: true } }] },
      steps: [{ type: 'call', method: 'execute' }],
    },
    {
      name: 'immediate posts the body on mount',
      args: ['/save', { immediate: true, data: { name: 'Ada' } }],
      context: { http: [{ method: 'POST', url: '/save', data: { saved: true } }] },
    },
  ],
}

/** `usePut(url, options)`: the PUT spelling, with the replacement body. */
export const usePutCases: HookCases = {
  hook: 'usePut',
  cases: [
    {
      name: 'execute sends the replacement body',
      args: ['/items/3', { data: { name: 'Renamed' } }],
      context: { http: [{ method: 'PUT', url: '/items/3', data: { updated: true } }] },
      steps: [{ type: 'call', method: 'execute' }],
    },
  ],
}

/** `usePatch(url, options)`: the PATCH spelling, with the partial body. */
export const usePatchCases: HookCases = {
  hook: 'usePatch',
  cases: [
    {
      name: 'execute sends the partial body',
      args: ['/items/3', { data: { name: 'Patched' } }],
      context: { http: [{ method: 'PATCH', url: '/items/3', data: { patched: true } }] },
      steps: [{ type: 'call', method: 'execute' }],
    },
  ],
}

/** `useDelete(url, options)`: the DELETE spelling; a body travels in `options.data`. */
export const useDeleteCases: HookCases = {
  hook: 'useDelete',
  cases: [
    {
      name: 'a body and params passed to useDelete reach the client',
      args: ['/items/3', { data: { reason: 'spam' }, params: { hard: true } }],
      context: { http: [{ method: 'DELETE', url: '/items/3', data: { deleted: true } }] },
      steps: [{ type: 'call', method: 'execute' }],
    },
    {
      name: 'a failed delete stores the error',
      args: ['/items/3'],
      context: { http: [{ method: 'DELETE', url: '/items/3', status: 409 }] },
      steps: [{ type: 'call', method: 'execute' }],
    },
  ],
}
