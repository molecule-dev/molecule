/**
 * `@molecule/app-auth-modal-react` — the shared in-app login / signup / upgrade
 * flow. Mount {@link AuthModalMount} once and every in-app auth/upgrade CTA stays
 * in place: no navigation, no reload, no lost work.
 *
 * @module
 */

export * from './AuthModal.js'
export * from './AuthModalMount.js'
export * from './cta-intercept.js'
