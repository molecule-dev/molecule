/**
 * Internal context key for the shared auth-form state — the Svelte counterpart
 * of React's `AuthFormStateContext`. Not part of the package's public surface.
 *
 * @module
 */

/** The context key under which `<AuthShell>`/`AuthFormStateProvider` publish the state. */
export const AUTH_FORM_STATE_KEY = Symbol('molecule-auth-form-state')
