/**
 * AuthGuard parity cases: the route-element guard for authenticated sections.
 *
 * The harness mounts the guard bare under a memory router, as a guard that
 * wraps the whole route tree: an unauthenticated visitor is redirected to
 * `loginPath` once, and on `loginPath` itself the guard renders its children.
 *
 * @module
 */

import type { UIComponentCases } from '../../spec.js'

/** AuthGuard: loading fallback, authenticated children, onAuthenticated hook. */
export const authGuardCases: UIComponentCases = {
  component: 'AuthGuard',
  cases: [
    {
      name: 'unauthenticated redirects to the login path',
      context: { auth: { status: 'unauthenticated' }, route: '/dashboard' },
      children: ['Routed content'],
    },
    {
      name: 'unauthenticated redirects to a custom login path with a query',
      context: { auth: { status: 'unauthenticated' }, route: '/dashboard?tab=2' },
      props: { loginPath: '/signin?next=%2Fdashboard' },
      children: ['Routed content'],
    },
    {
      name: 'unauthenticated on the login path renders children',
      context: { auth: { status: 'unauthenticated' }, route: '/login' },
      children: ['Login page'],
    },
    {
      name: 'unauthenticated navigation away from the login path redirects back',
      context: { auth: { status: 'unauthenticated' }, route: '/login' },
      children: ['Login page'],
      interactions: [{ type: 'navigate', to: '/settings' }],
    },
    {
      name: 'onAuthenticated stays silent while unauthenticated',
      context: { auth: { status: 'unauthenticated' }, route: '/login' },
      callbacks: ['onAuthenticated'],
      children: ['Login page'],
    },
    {
      name: 'authenticated renders children',
      context: { auth: { status: 'authenticated', user: { id: 'u1', name: 'Ada' } } },
      children: ['Protected page'],
    },
    {
      name: 'authenticated with element children',
      context: { auth: { status: 'authenticated', user: { id: 'u1', name: 'Ada' } } },
      children: [{ tag: 'p', children: ['Protected page'] }],
    },
    {
      name: 'authenticated without children renders the outlet',
      context: { auth: { status: 'authenticated', user: { id: 'u1', name: 'Ada' } } },
    },
    {
      name: 'unavailable still renders children',
      context: { auth: { status: 'unavailable' } },
      children: ['Candidate session page'],
    },
    {
      name: 'loading renders the default loading tag',
      context: { auth: { status: 'loading' } },
    },
    {
      name: 'loading with custom key and default',
      context: { auth: { status: 'loading' } },
      props: { loadingKey: 'common.restoring', loadingDefault: 'Restoring session…' },
    },
    {
      name: 'loading with a custom fallback node',
      context: { auth: { status: 'loading' } },
      slots: {
        loadingFallback: [
          { tag: 'div', attrs: { 'data-mol-id': 'boot-spinner' }, children: ['Booting…'] },
        ],
      },
    },
    {
      name: 'onAuthenticated fires once authenticated',
      context: { auth: { status: 'authenticated', user: { id: 'u1', name: 'Ada' } } },
      callbacks: ['onAuthenticated'],
      children: ['Protected page'],
    },
    {
      name: 'onAuthenticated stays silent while loading',
      context: { auth: { status: 'loading' } },
      callbacks: ['onAuthenticated'],
    },
  ],
}
