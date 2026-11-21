/**
 * Holds rendering until the auth client has decided the session.
 *
 * @module
 */

import { type ParentComponent, Show, untrack } from 'solid-js'

import { createAuth } from './primitives/auth.js'
import type { SessionReadyProps } from './types.js'

/**
 * Renders its children once `createAuth().state().status` has left `'loading'` — the session
 * is decided (signed in, signed out, or `'unavailable'`) — and `fallback` until then. It never
 * redirects. An unavailable session is unconfirmed and may still have a null user.
 *
 * With the bundled JWT client, a stored token AND cached user restore synchronously,
 * so this boundary renders immediately. Token-only and cookie-only sessions need an
 * asynchronous current-user request. Until it answers, `createAuth().user()` is `null`, so a
 * public page that renders a
 * signed-in action at once lets that action run against "signed out": a Follow button whose
 * handler starts with `if (!user()) return` ignores the click, one that redirects to `/login`
 * signs the visitor out of the flow. `MoleculeProvider` given `auth` renders this around the
 * app by default (`awaitSession`), so every page's first render reads the restored user when
 * restoration succeeds.
 *
 * A visitor with no session candidate settles synchronously without a request. Must render
 * inside `MoleculeProvider` with `auth` configured. A client that nobody initialized starts its
 * restore on this first read. The bundled JWT client bounds each auth request (default
 * 10 seconds), then settles as `'unavailable'` on timeout. Custom clients must also settle
 * their initial session status.
 *
 * Route-level redirects for signed-in-only pages stay with `createAuthGuard`
 * (`./primitives/auth.js`).
 *
 * @param props - {@link SessionReadyProps}.
 * @returns The children once the session is decided, otherwise the fallback.
 * @example
 * ```tsx
 * <MoleculeProvider auth={authClient} sessionFallback={<p>Restoring your session…</p>}>
 *   <Routes>…</Routes>
 * </MoleculeProvider>
 * ```
 */
export const SessionReady: ParentComponent<SessionReadyProps> = (props) => {
  const { state } = createAuth()
  // Keep Show's condition and branches lazy, as Solid's JSX compiler does.
  return untrack(() =>
    Show({
      get when() {
        return state().status !== 'loading'
      },
      get fallback() {
        return props.fallback
      },
      get children() {
        return props.children
      },
    }),
  )
}
