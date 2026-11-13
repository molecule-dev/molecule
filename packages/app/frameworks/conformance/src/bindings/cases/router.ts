/**
 * Cases for the router hooks.
 *
 * The memory router is seeded through `context.routes` (so `useParams` has
 * patterns to match) and `context.route` (the initial entry). `location.key`
 * is random per entry and dropped by the kit; `navigate(to, { state })` is
 * observable both in `useRouter().location` and through `getLocation` on the
 * raw router instance.
 *
 * @module
 */

import type { HookCases } from '../spec.js'

/** `useLocation()`: the router's current location. */
export const useLocationCases: HookCases = {
  hook: 'useLocation',
  cases: [
    { name: 'initial route with a query', context: { route: '/items?page=2' } },
    {
      name: 'follows navigation',
      steps: [
        { type: 'navigate', to: '/a' },
        { type: 'navigate', to: '/b?x=1' },
      ],
    },
    { name: 'initial route with a hash', context: { route: '/docs/intro#setup' } },
    {
      name: 'follows navigation carrying a hash',
      steps: [
        { type: 'navigate', to: '/a#top' },
        { type: 'navigate', to: '/b?x=1#end' },
      ],
    },
    { name: 'a bare question mark keeps an empty query', context: { route: '/items?' } },
    {
      name: 'a hash-only navigation keeps the path',
      context: { route: '/docs#top' },
      steps: [{ type: 'navigate', to: '/docs#section-two' }],
    },
    {
      name: 'unmount removes the router listener',
      steps: [{ type: 'navigate', to: '/a' }, { type: 'unmount' }, { type: 'navigate', to: '/b' }],
    },
    { name: 'without a router provider', context: { omitServices: ['router'] } },
  ],
}

/** `useNavigate()`: a function that navigates. */
export const useNavigateCases: HookCases = {
  hook: 'useNavigate',
  cases: [
    { name: 'navigates to a path', steps: [{ type: 'call', args: ['/settings'] }] },
    {
      name: 'navigates with query and hash',
      steps: [{ type: 'call', args: ['/search?q=1#top'] }],
    },
    {
      // Whether `replace` actually kept one history entry is pinned by the
      // useRouter cases that call `back` afterwards; here the option must at
      // least be accepted and the route must move.
      name: 'navigates with replace',
      context: { route: '/a' },
      steps: [{ type: 'call', args: ['/b', { replace: true }] }],
    },
    {
      name: 'a path without a leading slash is used as written',
      steps: [{ type: 'call', args: ['about'] }],
    },
    {
      name: 'leaves no listener behind',
      steps: [{ type: 'unmount' }, { type: 'navigate', to: '/after' }],
    },
    { name: 'without a router provider', context: { omitServices: ['router'] } },
  ],
}

/** `useRouterInstance()`: the raw router from context. */
export const useRouterInstanceCases: HookCases = {
  hook: 'useRouterInstance',
  cases: [
    {
      name: 'returns the router from context',
      steps: [
        { type: 'call', method: 'getLocation', args: [] },
        { type: 'call', method: 'isActive', args: ['/', true] },
      ],
    },
    {
      name: 'navigate through the instance carries state',
      steps: [
        { type: 'call', method: 'navigate', args: ['/detail', { state: { from: 'list' } }] },
        { type: 'call', method: 'getLocation', args: [] },
      ],
    },
    {
      name: 'navigateTo a named route through the instance',
      context: { routes: [{ path: '/items/:id', name: 'item' }] },
      steps: [
        {
          type: 'call',
          method: 'navigateTo',
          args: ['item', { id: '9' }, { tab: 'info' }],
        },
      ],
    },
    {
      name: 'navigateTo an unknown name throws',
      context: { routes: [{ path: '/', name: 'home' }] },
      steps: [{ type: 'call', method: 'navigateTo', args: ['missing'] }],
    },
    {
      name: 'reads params, query and hash through the instance',
      context: { routes: [{ path: '/items/:id' }], route: '/items/9?tab=info#notes' },
      steps: [
        { type: 'call', method: 'getParams', args: [] },
        { type: 'call', method: 'getQuery', args: [] },
        { type: 'call', method: 'getHash', args: [] },
      ],
    },
    {
      name: 'back and forward through the instance',
      steps: [
        { type: 'call', method: 'navigate', args: ['/a'] },
        { type: 'call', method: 'navigate', args: ['/b'] },
        { type: 'call', method: 'back', args: [] },
        { type: 'call', method: 'forward', args: [] },
      ],
    },
    { name: 'without a router provider', context: { omitServices: ['router'] } },
  ],
}

/** `useRouter()`: location, params, query and the navigation actions. */
export const useRouterCases: HookCases = {
  hook: 'useRouter',
  cases: [
    {
      name: 'reads the location, params and query together',
      context: {
        routes: [{ path: '/items/:id', name: 'item' }],
        route: '/items/42?tab=info&tag=a&tag=b',
      },
    },
    {
      name: 'navigate updates all three',
      context: {
        routes: [{ path: '/items/:id', name: 'item' }],
        route: '/items/42?tab=info&tag=a&tag=b',
      },
      steps: [{ type: 'call', method: 'navigate', args: ['/items/43?tab=log'] }],
    },
    {
      name: 'navigate with state carries it on the location',
      steps: [
        { type: 'call', method: 'navigate', args: ['/detail', { state: { from: 'list' } }] },
        { type: 'call', method: 'navigate', args: ['/other'] },
        { type: 'call', method: 'back', args: [] },
      ],
    },
    {
      name: 'navigate with replace keeps the previous entry unreachable',
      context: { route: '/a' },
      steps: [
        { type: 'call', method: 'navigate', args: ['/b', { replace: true }] },
        { type: 'call', method: 'back', args: [] },
      ],
    },
    {
      name: 'navigate without replace leaves the previous entry',
      context: { route: '/a' },
      steps: [
        { type: 'call', method: 'navigate', args: ['/b'] },
        { type: 'call', method: 'back', args: [] },
        { type: 'call', method: 'forward', args: [] },
      ],
    },
    {
      name: 'navigating twice to the same path pushes two entries',
      steps: [
        { type: 'call', method: 'navigate', args: ['/same'] },
        { type: 'call', method: 'navigate', args: ['/same'] },
        { type: 'call', method: 'back', args: [] },
      ],
    },
    {
      name: 'navigate with a hash',
      steps: [{ type: 'call', method: 'navigate', args: ['/docs#setup'] }],
    },
    {
      name: 'navigateTo builds the path from a named route',
      context: { routes: [{ path: '/items/:id', name: 'item' }] },
      steps: [
        { type: 'call', method: 'navigateTo', args: ['item', { id: '7' }, { sort: 'name' }] },
      ],
    },
    {
      name: 'navigateTo with replace keeps one entry',
      context: { routes: [{ path: '/items/:id', name: 'item' }] },
      steps: [
        {
          type: 'call',
          method: 'navigateTo',
          args: ['item', { id: '7' }, undefined, { replace: true }],
        },
        { type: 'call', method: 'back', args: [] },
      ],
    },
    {
      name: 'navigateTo an unknown route name throws',
      context: { routes: [{ path: '/', name: 'home' }] },
      steps: [{ type: 'call', method: 'navigateTo', args: ['missing'] }],
    },
    {
      name: 'isActive reports prefix and exact matches',
      context: { route: '/items/42' },
      steps: [
        { type: 'call', method: 'isActive', args: ['/items'] },
        { type: 'call', method: 'isActive', args: ['/items', true] },
        { type: 'call', method: 'isActive', args: ['/items/42'] },
        { type: 'call', method: 'isActive', args: ['/items/42', true] },
      ],
    },
    {
      // A binding must forward to the core matcher, not startsWith: only a
      // full leading segment counts, and a trailing slash does not match.
      name: 'isActive matches only at a segment boundary',
      context: { route: '/items/42' },
      steps: [
        { type: 'call', method: 'isActive', args: ['/item'] },
        { type: 'call', method: 'isActive', args: ['/items/4'] },
        { type: 'call', method: 'isActive', args: ['/items/42/'] },
      ],
    },
    {
      name: 'params are empty when nothing matches',
      context: { routes: [{ path: '/items/:id' }], route: '/users' },
      steps: [{ type: 'navigate', to: '/items/9' }],
    },
    {
      name: 'unmount removes the router listener',
      steps: [{ type: 'navigate', to: '/a' }, { type: 'unmount' }, { type: 'navigate', to: '/b' }],
    },
    { name: 'without a router provider', context: { omitServices: ['router'] } },
  ],
}

/** `useParams()`: the current route's path parameters. */
export const useParamsCases: HookCases = {
  hook: 'useParams',
  cases: [
    { name: 'empty without route definitions', context: { route: '/items/42' } },
    {
      name: 'extracts the dynamic segment',
      context: { routes: [{ path: '/items/:id' }], route: '/items/42' },
    },
    {
      name: 'extracts several dynamic segments',
      context: { routes: [{ path: '/users/:userId/posts/:postId' }], route: '/users/7/posts/3' },
    },
    {
      name: 'follows navigation between param values',
      context: { routes: [{ path: '/items/:id' }], route: '/items/42' },
      steps: [{ type: 'navigate', to: '/items/43' }],
    },
    {
      name: 'empty when nothing matches, filled when it does',
      context: { routes: [{ path: '/items/:id' }], route: '/users' },
      steps: [{ type: 'navigate', to: '/items/9' }],
    },
    {
      name: 'unmount removes the router listener',
      context: { routes: [{ path: '/items/:id' }], route: '/items/42' },
      steps: [
        { type: 'navigate', to: '/items/5' },
        { type: 'unmount' },
        { type: 'navigate', to: '/items/6' },
      ],
    },
    { name: 'without a router provider', context: { omitServices: ['router'] } },
  ],
}

/** `useQuery()`: the parsed query parameters. */
export const useQueryCases: HookCases = {
  hook: 'useQuery',
  cases: [
    { name: 'parses single values', context: { route: '/list?page=2&sort=name' } },
    { name: 'repeated keys become arrays', context: { route: '/list?tag=a&tag=b&tag=c' } },
    { name: 'empty values parse as empty strings', context: { route: '/list?flag=&x=&bare' } },
    { name: 'empty query yields an empty object', context: { route: '/list' } },
    {
      name: 'follows navigation',
      context: { route: '/list?page=2' },
      steps: [{ type: 'navigate', to: '/list?page=3&tag=new' }],
    },
    {
      name: 'unmount removes the router listener',
      context: { route: '/list?x=1' },
      steps: [
        { type: 'navigate', to: '/list?x=2' },
        { type: 'unmount' },
        { type: 'navigate', to: '/list?x=3' },
      ],
    },
    { name: 'without a router provider', context: { omitServices: ['router'] } },
  ],
}

/** `useIsActive(path, exact?)`: whether a path matches the current route. */
export const useIsActiveCases: HookCases = {
  hook: 'useIsActive',
  cases: [
    { name: 'active for a prefix by default', args: ['/items'], context: { route: '/items/42' } },
    {
      name: 'exact requires the full path',
      args: ['/items', true],
      context: { route: '/items/42' },
      steps: [{ type: 'navigate', to: '/items' }],
    },
    { name: 'inactive for a different path', args: ['/users'], context: { route: '/items' } },
    {
      name: 'follows navigation',
      args: ['/items'],
      steps: [
        { type: 'navigate', to: '/other' },
        { type: 'navigate', to: '/items/1' },
      ],
    },
    {
      // The value derives only from the router and the arguments, so a
      // framework that re-mounts the host on an `args` step (the non-React
      // ones do) computes the same booleans.
      name: 'recomputes when the arguments change',
      args: ['/items'],
      context: { route: '/items' },
      steps: [
        { type: 'args', args: ['/users'] },
        { type: 'args', args: ['/items', true] },
      ],
    },
    {
      name: 'unmount removes the router listener',
      args: ['/items'],
      steps: [
        { type: 'navigate', to: '/items/9' },
        { type: 'unmount' },
        { type: 'navigate', to: '/other' },
      ],
    },
    {
      name: 'without a router provider',
      args: ['/items'],
      context: { omitServices: ['router'], route: '/items/42' },
    },
  ],
}

const ARTICLES = { pageSize: 10, filters: { tag: {}, sort: { defaultValue: 'new' } } }

/**
 * A list of orders with a protected 'mine' view.
 *
 * @param status - The auth status.
 * @returns The `useListRoute` options.
 */
const ORDERS = (
  status: 'loading' | 'authenticated' | 'unauthenticated' | 'unavailable',
): Record<string, unknown> => ({
  selections: {
    all: { path: '/orders' },
    mine: { path: '/orders', query: { view: 'mine' }, requiresAuth: true },
  },
  defaultSelection: 'all',
  auth: { status, redirectTo: '/login' },
})

/** `useListRoute(options)`: URL-backed pagination, filters and views. */
export const useListRouteCases: HookCases = {
  hook: 'useListRoute',
  reactiveArgs: true,
  cases: [
    {
      name: 'reads the page, offset and filters from the URL and builds links',
      context: { route: '/articles?tag=news&page=3#top' },
      args: [ARTICLES],
      steps: [
        { type: 'call', method: 'href', args: [{ page: 4 }] },
        { type: 'call', method: 'href', args: [{ page: 1 }] },
        { type: 'call', method: 'href', args: [{ filters: { tag: 'tech' } }] },
        { type: 'call', method: 'href', args: [{ filters: { sort: 'new' }, page: 2 }] },
      ],
    },
    {
      name: 'a malformed page reads as page one',
      context: { route: '/articles?page=2oops' },
      args: [ARTICLES],
    },
    {
      name: 'setPage, setFilters and navigate move the URL',
      context: { route: '/articles?tag=news&view=grid' },
      args: [ARTICLES],
      steps: [
        { type: 'call', method: 'setPage', args: [2] },
        { type: 'call', method: 'setFilters', args: [{ tag: 'tech' }] },
        { type: 'call', method: 'navigate', args: [{ page: 5, filters: { tag: undefined } }] },
      ],
    },
    {
      name: 'follows navigation from outside',
      context: { route: '/articles' },
      args: [ARTICLES],
      steps: [{ type: 'navigate', to: '/articles?page=7&tag=x' }, { type: 'back' }],
    },
    {
      name: 'a path filter comes from the route pattern',
      context: { route: '/topics/a%20b?page=2' },
      args: [{ path: '/topics/:topic', filters: { topic: { param: 'topic' } } }],
      steps: [{ type: 'call', method: 'href', args: [{ filters: { topic: 'c d' } }] }],
    },
    {
      name: 'selections pick the most specific view',
      context: { route: '/orders?view=mine&page=2' },
      args: [ORDERS('authenticated')],
      steps: [
        { type: 'call', method: 'href', args: [{ selection: 'all' }] },
        { type: 'call', method: 'select', args: ['all'] },
      ],
    },
    {
      name: 'a protected view waits for auth, then redirects a signed-out visitor',
      context: { route: '/orders?view=mine' },
      args: [ORDERS('loading')],
      steps: [{ type: 'args', args: [ORDERS('unauthenticated')] }],
    },
    {
      name: 'an unavailable auth client never redirects',
      context: { route: '/orders?view=mine' },
      args: [ORDERS('unavailable')],
    },
    {
      name: 'unknown names and a bad page throw',
      context: { route: '/orders' },
      args: [ORDERS('authenticated')],
      steps: [
        { type: 'call', method: 'href', args: [{ selection: 'nope' }] },
        { type: 'call', method: 'href', args: [{ page: 0 }] },
      ],
    },
    { name: 'a page size of zero throws', args: [{ pageSize: 0 }] },
    {
      name: 'unmount removes the router listener',
      args: [ARTICLES],
      steps: [{ type: 'navigate', to: '/a' }, { type: 'unmount' }, { type: 'navigate', to: '/b' }],
    },
    { name: 'without a router provider', args: [ARTICLES], context: { omitServices: ['router'] } },
  ],
}

/** `useConsumedSearchParam(name)`: a one-time credential taken out of the URL. */
export const useConsumedSearchParamCases: HookCases = {
  hook: 'useConsumedSearchParam',
  cases: [
    {
      name: 'consumes the parameter and keeps the rest of the URL',
      context: { route: '/reset?token=abc&lang=fr' },
      args: ['token'],
    },
    {
      name: 'keeps the value through query-only navigation and consumes a new one',
      context: { route: '/reset?token=abc' },
      args: ['token'],
      steps: [
        { type: 'navigate', to: '/reset?step=2' },
        { type: 'navigate', to: '/reset?token=def' },
      ],
    },
    {
      name: 'Back restores the value consumed on that entry',
      context: { route: '/start' },
      args: ['token'],
      steps: [
        { type: 'navigate', to: '/reset?token=abc' },
        { type: 'navigate', to: '/reset?token=def' },
        { type: 'back' },
      ],
    },
    {
      name: 'the setter replaces the value',
      context: { route: '/reset?token=abc' },
      args: ['token'],
      steps: [{ type: 'call', method: '1', args: [''] }],
    },
    {
      name: 'empty when the parameter never appeared',
      context: { route: '/reset' },
      args: ['token'],
    },
    {
      name: 'unmount stops consuming',
      context: { route: '/start' },
      args: ['token'],
      steps: [{ type: 'unmount' }, { type: 'navigate', to: '/reset?token=abc' }],
    },
    { name: 'without a router provider', args: ['token'], context: { omitServices: ['router'] } },
  ],
}
