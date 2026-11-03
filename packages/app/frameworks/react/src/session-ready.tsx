/**
 * Hold rendering until the auth client has decided the session.
 *
 * @module
 */

import type { ReactNode } from 'react'

import { useAuth } from './hooks/useAuth.js'
import type { SessionReadyProps } from './types.js'

/**
 * Renders its children once `useAuth().status` has left `'loading'` (signed in, signed out,
 * or `'unavailable'`), and `fallback` until then. It never redirects. An unavailable session
 * is unconfirmed and may still have `user === null`; handle that status separately from sign-out.
 *
 * After a full page load a returning visitor's session is restored by one request. Until it
 * answers, `useAuth().user` is `null` everywhere, so a public page that renders a signed-in action
 * at once lets that action run against "signed out": a Follow button whose handler starts with
 * `if (!user) return` ignores the click, one that redirects to `/login` signs the visitor out of
 * the flow. Wrapping the routes (or passing `awaitSession` to `MoleculeProvider`) makes every
 * page's first render read the restored user when restoration succeeds.
 *
 * A visitor with no session to restore settles in microtasks without a request. Must render
 * inside the auth context (`AuthProvider`, or `MoleculeProvider` with `auth`). A client that
 * nobody initialized starts its restore on this first read.
 * The bundled JWT client bounds each auth request (default 10 seconds) and settles a timeout
 * as `'unavailable'`. Custom clients must also settle their initial session status.
 *
 * Synchronous SSR renders the fallback while a client is loading. Initialize a request-scoped
 * client before rendering to include its decided content, or leave the hold disabled for SSR.
 *
 * Route-level redirects for signed-in-only pages stay with `AuthGuard` (`@molecule/app-ui-react`).
 *
 * @param props - {@link SessionReadyProps}.
 * @returns The children once the session is decided, otherwise the fallback.
 * @example
 * ```tsx
 * <MoleculeProvider auth={authClient} awaitSession>
 *   <Routes>…</Routes>
 * </MoleculeProvider>
 * ```
 */
export function SessionReady({ children, fallback = null }: SessionReadyProps): ReactNode {
  const { status } = useAuth()
  return status === 'loading' ? fallback : children
}
