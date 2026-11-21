/**
 * The legal-modal hook of `@molecule/app-legal-pages-svelte`: the imperative
 * openers and the component that renders the two modals, the Svelte shape of
 * React's `useLegalModals()` element pair.
 *
 * @module
 */

import LegalModals from './LegalModals.svelte'
import type { LegalModalsApi, UseLegalModalsOptions } from './types.js'

/**
 * Headless hook powering in-place Privacy/Terms modals. Use it when the
 * triggers live in different parts of a bespoke footer (or a signup page);
 * render `modals` once and wire `openPrivacy`/`openTerms` to your own
 * links/buttons.
 *
 * The modal body is the SAME bonded HTML the `LegalContentPage` standalone
 * routes render (`content.privacyPolicy` / `content.termsOfService`), so every
 * legal surface stays in sync.
 *
 * Svelte counterpart of `@molecule/app-legal-pages-react`'s `useLegalModals` —
 * the same options; the modal pair is the `LegalModals` component (a snippet
 * cannot be created outside a component), rendered as
 * `@const Modals = api.modals` then `<Modals {api} />`.
 *
 * @param options - See {@link UseLegalModalsOptions}.
 * @returns The imperative {@link LegalModalsApi}.
 */
export function useLegalModals(options: UseLegalModalsOptions = {}): LegalModalsApi {
  // Structurally the api's state (its type stays private to the package).
  const state = $state({
    privacyOpen: false,
    termsOpen: false,
    appName: options.appName,
  })

  /**
   * Opens the privacy modal, lazy-loading its body first.
   * @returns A promise settling once the modal is open.
   */
  const openPrivacy = async (): Promise<void> => {
    if (options.loadContent) await options.loadContent('privacyPolicy')
    state.privacyOpen = true
  }

  /**
   * Opens the terms modal, lazy-loading its body first.
   * @returns A promise settling once the modal is open.
   */
  const openTerms = async (): Promise<void> => {
    if (options.loadContent) await options.loadContent('termsOfService')
    state.termsOpen = true
  }

  return { openPrivacy, openTerms, state, modals: LegalModals }
}
