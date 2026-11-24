/**
 * Solid in-place Privacy/Terms links: trigger buttons that open modals showing
 * the bonded legal HTML, instead of navigating.
 *
 * @module
 */

import { type Component, createSignal, Show } from 'solid-js'

import { ResolveNode, useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Modal } from '@molecule/app-ui-solid'

import type { LegalModalLinksProps, LegalModalsApi, UseLegalModalsOptions } from './types.js'
import { escapeHtml } from './utilities.js'

/**
 * Headless hook powering in-place Privacy/Terms modals. Use it when the
 * triggers live in different parts of a bespoke footer (or a signup page);
 * render `{modals}` once and wire `openPrivacy`/`openTerms` to your own
 * links/buttons.
 *
 * The modal body is the SAME bonded HTML the `LegalContentPage` standalone
 * routes render (`content.privacyPolicy` / `content.termsOfService`), so every
 * legal surface stays in sync.
 *
 * Solid counterpart of `@molecule/app-legal-pages-react`'s `useLegalModals` —
 * the same options; the element pair's props stay reactive, so it follows the
 * open state.
 *
 * @param options - See {@link UseLegalModalsOptions}.
 * @returns The imperative {@link LegalModalsApi}.
 */
export function useLegalModals(options: UseLegalModalsOptions = {}): LegalModalsApi {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [privacyOpen, setPrivacyOpen] = createSignal(false)
  const [termsOpen, setTermsOpen] = createSignal(false)

  /**
   * Opens the privacy modal, lazy-loading its body first.
   * @returns A promise settling once the modal is open.
   */
  const openPrivacy = async (): Promise<void> => {
    if (options.loadContent) await options.loadContent('privacyPolicy')
    setPrivacyOpen(true)
  }

  /**
   * Opens the terms modal, lazy-loading its body first.
   * @returns A promise settling once the modal is open.
   */
  const openTerms = async (): Promise<void> => {
    if (options.loadContent) await options.loadContent('termsOfService')
    setTermsOpen(true)
  }

  const modals = [
    <Modal
      open={privacyOpen()}
      onClose={() => setPrivacyOpen(false)}
      title={t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
      size="lg"
    >
      <div
        class={cm.prose}
        innerHTML={t(
          'content.privacyPolicy',
          options.appName ? { appName: escapeHtml(options.appName) } : {},
          { defaultValue: '' },
        )}
      />
    </Modal>,
    <Modal
      open={termsOpen()}
      onClose={() => setTermsOpen(false)}
      title={t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
      size="lg"
    >
      <div
        class={cm.prose}
        innerHTML={t(
          'content.termsOfService',
          options.appName ? { appName: escapeHtml(options.appName) } : {},
          { defaultValue: '' },
        )}
      />
    </Modal>,
  ]

  return { openPrivacy, openTerms, modals }
}

/**
 * Drop-in Privacy/Terms links that open IN-PLACE modals instead of
 * navigating — for bespoke footers and signup pages.
 *
 * Renders the trigger button(s) + the modals together, so it suits the
 * common case where the two legal links are adjacent. For separated
 * triggers, use `useLegalModals` directly.
 *
 * @param props - Component props (see {@link LegalModalLinksProps}).
 * @returns The trigger button(s) and their modals.
 */
export const LegalModalLinks: Component<LegalModalLinksProps> = (props) => {
  const { t } = useTranslation()
  const { openPrivacy, openTerms, modals } = useLegalModals(props)
  const show = (): 'both' | 'privacy' | 'terms' => props.show ?? 'both'
  return (
    <>
      <Show when={show() !== 'terms'}>
        <button type="button" class={props.linkClassName} onClick={openPrivacy}>
          <ResolveNode node={props.privacyLabel}>
            {(privacyLabel, hasPrivacyLabel) => (
              <Show
                when={hasPrivacyLabel()}
                fallback={t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
              >
                {privacyLabel()}
              </Show>
            )}
          </ResolveNode>
        </button>
      </Show>
      <Show when={show() !== 'privacy'}>
        <button type="button" class={props.linkClassName} onClick={openTerms}>
          <ResolveNode node={props.termsLabel}>
            {(termsLabel, hasTermsLabel) => (
              <Show
                when={hasTermsLabel()}
                fallback={t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
              >
                {termsLabel()}
              </Show>
            )}
          </ResolveNode>
        </button>
      </Show>
      {modals}
    </>
  )
}
