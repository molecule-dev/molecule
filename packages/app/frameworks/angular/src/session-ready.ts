/**
 * A component that holds its content until the auth client has decided the
 * session, mirroring `SessionReady` from `@molecule/app-react`.
 *
 * @module
 */

import { Component } from '@angular/core'

import { useAuth } from './hooks/use-auth.js'

/**
 * Renders its content once `useAuth().status` has left `'loading'` (signed in,
 * signed out, or `'unavailable'`), and the `[slot=fallback]` content until
 * then. It never redirects. An unavailable session is unconfirmed and may
 * still have `user === null`; handle that status separately from sign-out.
 *
 * After a full page load a returning visitor's session is restored by one
 * request. Until it answers, `useAuth().user` is `null` everywhere, so a
 * public page that renders a signed-in action at once lets that action run
 * against "signed out": a Follow button whose handler starts with
 * `if (!user) return` ignores the click, one that redirects to `/login` signs
 * the visitor out of the flow. Wrapping the routes (or passing `awaitSession`
 * to `provideMolecule`) makes every page's first render read the restored user
 * when restoration succeeds.
 *
 * A visitor with no session to restore settles in microtasks without a
 * request. Must render inside the auth registration (`provideMolecule` with
 * `auth`). A client that nobody initialized starts its restore on this first
 * read. The bundled JWT client bounds each auth request (default 10 seconds)
 * and settles a timeout as `'unavailable'`. Custom clients must also settle
 * their initial session status.
 *
 * Route-level redirects for signed-in-only pages stay with the app's own
 * guards.
 *
 * @example
 * ```html
 * <mol-session-ready>
 *   <router-outlet />
 *   <span slot="fallback">Restoring session…</span>
 * </mol-session-ready>
 * ```
 */
@Component({
  selector: 'mol-session-ready',
  standalone: true,
  template: `
    @if (status() === 'loading') {
      <ng-content select="[slot=fallback]" />
    } @else {
      <ng-content />
    }
  `,
})
export class SessionReady {
  /** The auth status this component holds on (`'loading'` shows the fallback). */
  readonly status = useAuth().status
}
