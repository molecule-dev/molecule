/**
 * Cases for `MoleculeProvider`, the app's composition root: by default it holds the app until
 * the auth client has decided the session, showing `sessionFallback` meanwhile, so no page's
 * first render reads a session that is still being restored.
 *
 * @module
 */

import type { HookCases } from '../spec.js'

const app = { children: 'App content', sessionFallback: 'Restoring session' }

/** `<MoleculeProvider auth sessionFallback>`: the session hold an app gets without asking for it. */
export const MoleculeProviderCases: HookCases = {
  hook: 'MoleculeProvider',
  render: 'root',
  cases: [
    {
      name: 'a loading session shows the fallback by default',
      args: [app],
      context: { auth: { status: 'loading' } },
    },
    {
      name: 'a loading session without a fallback shows nothing',
      args: [{ children: 'App content' }],
      context: { auth: { status: 'loading' } },
    },
    {
      name: 'the app replaces the fallback once the session is decided',
      args: [app],
      context: { auth: { status: 'loading' } },
      steps: [{ type: 'auth', status: 'authenticated', user: { id: 'u1' } }],
    },
    {
      name: 'a signed-in session shows the app at once',
      args: [app],
      context: { auth: { status: 'authenticated', user: { id: 'u1' } } },
    },
    {
      name: 'a signed-out session shows the app at once',
      args: [app],
      context: { auth: { status: 'unauthenticated' } },
    },
    {
      name: 'an unavailable session releases the hold',
      args: [app],
      context: { auth: { status: 'loading' } },
      steps: [{ type: 'auth', status: 'unavailable' }],
    },
    {
      name: 'awaitSession false shows the app while the session loads',
      args: [{ ...app, awaitSession: false }],
      context: { auth: { status: 'loading' } },
    },
    {
      name: 'without an auth client the app shows at once',
      args: [app],
      context: { auth: { status: 'loading' }, omitServices: ['auth'] },
    },
  ],
}
