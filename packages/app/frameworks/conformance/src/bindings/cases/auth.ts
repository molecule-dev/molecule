/**
 * Cases for the auth hooks.
 *
 * @module
 */

import type { HookCases } from '../spec.js'

/** `useAuth()`: auth state plus the auth actions. */
export const useAuthCases: HookCases = {
  hook: 'useAuth',
  cases: [
    { name: 'signed out' },
    {
      name: 'signed in',
      context: { auth: { status: 'authenticated', user: { id: 'u1', email: 'a@b.c' } } },
    },
    {
      name: 'login signs in',
      steps: [{ type: 'call', method: 'login', args: [{ email: 'a@b.c', password: 'pw' }] }],
    },
    {
      name: 'a failed login rejects',
      context: { authErrors: { login: 'Invalid credentials' } },
      steps: [{ type: 'call', method: 'login', args: [{ email: 'a@b.c', password: 'bad' }] }],
    },
    {
      name: 'logout signs out',
      context: { auth: { status: 'authenticated', user: { id: 'u1' } } },
      steps: [{ type: 'call', method: 'logout' }],
    },
    {
      name: 'follows a session change made elsewhere',
      steps: [
        { type: 'auth', status: 'authenticated', user: { id: 'u2' } },
        { type: 'auth', status: 'unauthenticated' },
      ],
    },
    {
      name: 'updateProfile merges the profile',
      context: { auth: { status: 'authenticated', user: { id: 'u1', name: 'A' } } },
      steps: [{ type: 'call', method: 'updateProfile', args: [{ name: 'B' }] }],
    },
    {
      name: 'loading is undecided',
      context: { auth: { status: 'loading' } },
      steps: [{ type: 'auth', status: 'unauthenticated' }],
    },
    {
      name: 'unavailable keeps the candidate user for retry',
      context: { auth: { status: 'unavailable', user: { id: 'u1', email: 'a@b.c' } } },
      steps: [{ type: 'auth', status: 'authenticated', user: { id: 'u1', email: 'a@b.c' } }],
    },
    {
      name: 'register signs in without the password',
      steps: [
        { type: 'call', method: 'register', args: [{ email: 'a@b.c', password: 'pw', name: 'A' }] },
      ],
    },
    {
      name: 'a failed register rejects and keeps the visitor signed out',
      context: { authErrors: { register: 'Email taken' } },
      steps: [{ type: 'call', method: 'register', args: [{ email: 'a@b.c', password: 'pw' }] }],
    },
    {
      name: 'refresh resolves the current session without changing it',
      context: { auth: { status: 'authenticated', user: { id: 'u1' } } },
      steps: [{ type: 'call', method: 'refresh' }],
    },
    {
      name: 'a failed refresh rejects',
      context: { authErrors: { refresh: 'Session expired' } },
      steps: [{ type: 'call', method: 'refresh' }],
    },
    {
      name: 'a failed logout rejects and keeps the session',
      context: {
        auth: { status: 'authenticated', user: { id: 'u1' } },
        authErrors: { logout: 'Offline' },
      },
      steps: [{ type: 'call', method: 'logout' }],
    },
    {
      name: 'a failed updateProfile keeps the user',
      context: {
        auth: { status: 'authenticated', user: { id: 'u1', name: 'A' } },
        authErrors: { updateProfile: 'Validation failed' },
      },
      steps: [{ type: 'call', method: 'updateProfile', args: [{ name: 'B' }] }],
    },
    {
      name: 'setUser caches a user without signing in',
      steps: [{ type: 'call', method: 'setUser', args: [{ id: 'u9', name: 'Guest' }] }],
    },
    {
      name: 'setSession adopts a session in one call',
      steps: [
        {
          type: 'call',
          method: 'setSession',
          args: [{ accessToken: 'tok-2', user: { id: 'u2', email: 'b@b.c' } }],
        },
      ],
    },
    {
      name: 'login with an empty email still signs in',
      steps: [{ type: 'call', method: 'login', args: [{ email: '', password: '' }] }],
    },
    {
      name: 'autoRefresh probes once on mount when signed out',
      args: [{ autoRefresh: true }],
    },
    {
      name: 'autoRefresh swallows a failing probe',
      args: [{ autoRefresh: true }],
      context: { authErrors: { refresh: 'No session' } },
    },
    {
      name: 'autoRefresh skips the probe while the session is loading or signed in',
      args: [{ autoRefresh: true }],
      context: { auth: { status: 'loading' } },
      steps: [{ type: 'auth', status: 'authenticated', user: { id: 'u1' } }],
    },
    {
      // Turning autoRefresh on through a re-render probes once; a framework
      // that re-mounts the host on new arguments probes once on its mount too.
      name: 'autoRefresh arriving through new arguments probes',
      steps: [
        { type: 'args', args: [{ autoRefresh: true }] },
        { type: 'args', args: [{ autoRefresh: false }] },
      ],
    },
    {
      // None of the actions depends on anything a locale switch changes, so
      // they must keep their identity across the re-render it causes.
      name: 'the actions keep their identity across an unrelated re-render',
      steps: [
        {
          type: 'stable',
          methods: [
            'login',
            'logout',
            'register',
            'refresh',
            'updateProfile',
            'setUser',
            'setSession',
          ],
        },
        { type: 'locale', locale: 'fr' },
        {
          type: 'stable',
          methods: [
            'login',
            'logout',
            'register',
            'refresh',
            'updateProfile',
            'setUser',
            'setSession',
          ],
        },
      ],
    },
    {
      name: 'unmount unsubscribes from the session',
      steps: [
        { type: 'auth', status: 'authenticated', user: { id: 'u2' } },
        { type: 'unmount' },
        { type: 'auth', status: 'unauthenticated' },
      ],
    },
    {
      // No AuthProvider: the hook itself throws on every render, which the
      // result records as `{ $threw }` — every framework must throw here too.
      name: 'throws without the auth provider',
      context: { omitServices: ['auth'] },
    },
  ],
}

/** `useAuthClient()`: the shared auth client from the provider. */
export const useAuthClientCases: HookCases = {
  hook: 'useAuthClient',
  cases: [
    {
      name: 'exposes the client from the provider',
      steps: [{ type: 'call', method: 'getState' }],
    },
    {
      name: 'calling through the exposed client',
      steps: [
        { type: 'call', method: 'getUser' },
        { type: 'call', method: 'login', args: [{ email: 'a@b.c', password: 'pw' }] },
        { type: 'call', method: 'getSessionRevision' },
      ],
    },
    {
      name: 'token accessors pass through the exposed client',
      steps: [
        { type: 'call', method: 'setAccessToken', args: ['tok-9'] },
        { type: 'call', method: 'getAccessToken' },
        { type: 'call', method: 'setAccessToken', args: [null] },
        { type: 'call', method: 'getAccessToken' },
      ],
    },
    {
      name: 'a failing call through the exposed client rejects',
      context: { authErrors: { login: 'Invalid credentials' } },
      steps: [{ type: 'call', method: 'login', args: [{ email: 'a@b.c', password: 'bad' }] }],
    },
    {
      name: 'throws without the auth provider',
      context: { omitServices: ['auth'] },
    },
  ],
}

/** `useUser()`: the authenticated user or null. */
export const useUserCases: HookCases = {
  hook: 'useUser',
  cases: [
    { name: 'null when signed out' },
    {
      name: 'the signed-in user',
      context: { auth: { status: 'authenticated', user: { id: 'u1', name: 'A' } } },
    },
    {
      name: 'follows an external sign-in and sign-out',
      steps: [
        { type: 'auth', status: 'authenticated', user: { id: 'u2' } },
        { type: 'auth', status: 'unauthenticated' },
      ],
    },
    {
      name: 'an authenticated session can have no cached user',
      context: { auth: { status: 'authenticated' } },
    },
    {
      name: 'an unavailable session keeps the candidate user',
      context: { auth: { status: 'unavailable', user: { id: 'u1', name: 'A' } } },
    },
  ],
}

/** `useIsAuthenticated()`: whether a session exists. */
export const useIsAuthenticatedCases: HookCases = {
  hook: 'useIsAuthenticated',
  cases: [
    { name: 'false when signed out' },
    {
      name: 'true when signed in',
      context: { auth: { status: 'authenticated', user: { id: 'u1' } } },
    },
    {
      name: 'follows the session out and back in',
      context: { auth: { status: 'authenticated', user: { id: 'u1' } } },
      steps: [
        { type: 'auth', status: 'unauthenticated' },
        { type: 'auth', status: 'authenticated', user: { id: 'u1' } },
      ],
    },
    {
      // The retained candidate of an `'unavailable'` session is NOT a signed-in
      // session: `isAuthenticated` stays false until the session is confirmed.
      name: 'false while the session is unavailable',
      context: { auth: { status: 'unavailable', user: { id: 'u1' } } },
    },
  ],
}
