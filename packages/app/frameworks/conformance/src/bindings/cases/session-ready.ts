/**
 * Cases for `SessionReady`, the component that holds its children until the
 * auth client has decided the session.
 *
 * @module
 */

import type { HookCases } from '../spec.js'

const slots = { children: 'Page content', fallback: 'Restoring session' }

/** `<SessionReady fallback>`: the fallback while the session is loading, the children once it is decided. */
export const SessionReadyCases: HookCases = {
  hook: 'SessionReady',
  render: 'text',
  cases: [
    {
      name: 'a loading session renders the fallback',
      args: [slots],
      context: { auth: { status: 'loading' } },
    },
    {
      name: 'a loading session without a fallback renders nothing',
      args: [{ children: 'Page content' }],
      context: { auth: { status: 'loading' } },
    },
    {
      name: 'a signed-in session renders the children',
      args: [slots],
      context: { auth: { status: 'authenticated', user: { id: 'u1' } } },
    },
    {
      name: 'a signed-out session renders the children',
      args: [slots],
      context: { auth: { status: 'unauthenticated' } },
    },
    {
      name: 'an unavailable session renders the children',
      args: [slots],
      context: { auth: { status: 'unavailable' } },
    },
    {
      name: 'the children replace the fallback once the session is decided',
      args: [slots],
      context: { auth: { status: 'loading' } },
      steps: [{ type: 'auth', status: 'authenticated', user: { id: 'u1' } }],
    },
    {
      name: 'the children stay through a later sign-in and sign-out',
      args: [slots],
      context: { auth: { status: 'unauthenticated' } },
      steps: [
        { type: 'auth', status: 'authenticated', user: { id: 'u1' } },
        { type: 'auth', status: 'unauthenticated' },
      ],
    },
  ],
}
