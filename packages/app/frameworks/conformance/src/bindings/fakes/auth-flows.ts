/**
 * Binding-case fakes for one area: browser location and history, `fetch`, `window.open` popups and `postMessage` for the auth flow hooks (useLogin, useSignup, useChangePassword, usePasswordReset, useOAuth, useProfileForm, useVerifyPaymentReturn).
 *
 * A case seeds this area through `context.areas.authFlows`; `control` steps call
 * the controls registered here (named `authFlows.<action>`). Every call a hook
 * makes on these fakes goes to `record`, so it is compared like any other call.
 *
 * @module
 */

import type { AreaFakesFactory } from '../spec.js'

/** What a case can seed for this area (`context.areas.authFlows`). */
export interface AuthFlowsSeed {
  /** Reserved; this area seeds nothing yet. */
  readonly _?: never
}

/**
 * Builds this area's fakes for one case.
 *
 * @param _context - The case context (`context.areas?.authFlows` is this area's seed).
 * @param _record - Receives every call a hook makes on this area's fakes.
 * @returns The area's services, controls, listener counts and cleanup.
 */
export const createAuthFlowsFakes: AreaFakesFactory = (_context, _record) => ({})
