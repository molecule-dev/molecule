/**
 * The legal-modal hook of `@molecule/app-legal-pages-angular`: the imperative
 * openers and the component that renders the two modals, the Angular shape of
 * React's `useLegalModals()` element pair.
 *
 * @module
 */

import { type ComponentRef, signal, type ViewContainerRef } from '@angular/core'

import { LegalModals } from './legal-modals.component.js'
import type { LegalModalsApi, UseLegalModalsOptions } from './types.js'

/**
 * Headless hook powering in-place Privacy/Terms modals. Use it when the
 * triggers live in different parts of a bespoke footer (or a signup page);
 * render the modals component once and wire `openPrivacy`/`openTerms` to your
 * own links/buttons.
 *
 * The modal body is the SAME bonded HTML the `LegalContentPage` standalone
 * routes render (`content.privacyPolicy` / `content.termsOfService`), so every
 * legal surface stays in sync.
 *
 * Angular counterpart of `@molecule/app-legal-pages-react`'s `useLegalModals` —
 * the same options; the modals are the `LegalModals` component (a template
 * cannot render a component class from a value), placed as
 * `<mol-legal-modals [api]="api" />`.
 *
 * @param options - See {@link UseLegalModalsOptions}.
 * @returns The imperative {@link LegalModalsApi}.
 */
export function useLegalModals(options: UseLegalModalsOptions = {}): LegalModalsApi {
  // Structurally the api's state (its type stays private to the package).
  const state = {
    privacyOpen: signal(false),
    termsOpen: signal(false),
    appName: options.appName,
  }

  /**
   * Opens the privacy modal, lazy-loading its body first.
   * @returns A promise settling once the modal is open.
   */
  const openPrivacy = async (): Promise<void> => {
    if (options.loadContent) await options.loadContent('privacyPolicy')
    state.privacyOpen.set(true)
  }

  /**
   * Opens the terms modal, lazy-loading its body first.
   * @returns A promise settling once the modal is open.
   */
  const openTerms = async (): Promise<void> => {
    if (options.loadContent) await options.loadContent('termsOfService')
    state.termsOpen.set(true)
  }

  /**
   * Creates the two modals in the caller's container (React returns the element
   * pair; a template cannot render a component class held in a value).
   *
   * @param viewContainerRef - The container the modals are inserted into.
   * @returns The created component reference.
   */
  const modals = (viewContainerRef: ViewContainerRef): ComponentRef<unknown> => {
    const ref = viewContainerRef.createComponent(LegalModals)
    ref.setInput('api', { openPrivacy, openTerms, state, modals })
    return ref
  }

  return { openPrivacy, openTerms, state, modals }
}
