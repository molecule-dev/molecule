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
  ],
}
