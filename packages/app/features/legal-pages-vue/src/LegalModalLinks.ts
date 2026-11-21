/**
 * Vue in-place Privacy/Terms links: trigger buttons that open modals showing
 * the bonded legal HTML, instead of navigating.
 *
 * @module
 */

import { defineComponent, h, type PropType, ref, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Modal } from '@molecule/app-ui-vue'
import { useTranslation } from '@molecule/app-vue'

import type { LegalModalLinksProps, LegalModalsApi, UseLegalModalsOptions } from './types.js'
import { escapeHtml, nodeOrSlot } from './utilities.js'

/**
 * Headless composable powering in-place Privacy/Terms modals. Use it when the
 * triggers live in different parts of a bespoke footer (or a signup page);
 * render `modals` once and wire `openPrivacy`/`openTerms` to your own
 * links/buttons.
 *
 * The modal body is the SAME bonded HTML the `LegalContentPage` standalone
 * routes render (`content.privacyPolicy` / `content.termsOfService`), so every
 * legal surface stays in sync.
 *
 * Vue counterpart of `@molecule/app-legal-pages-react`'s `useLegalModals` —
 * the same options; `modals` is a functional component (React returns the
 * element pair, which is what a Vue app renders with `<component :is>`).
 *
 * @param options - See {@link UseLegalModalsOptions}.
 * @returns The imperative {@link LegalModalsApi}.
 */
export function useLegalModals({
  appName,
  loadContent,
}: UseLegalModalsOptions = {}): LegalModalsApi {
  const cm = getClassMap()
  const { t } = useTranslation()
  const privacyOpen = ref(false)
  const termsOpen = ref(false)

  /**
   * Opens the privacy modal, lazy-loading its body first.
   * @returns A promise settling once the modal is open.
   */
  const openPrivacy = async (): Promise<void> => {
    if (loadContent) await loadContent('privacyPolicy')
    privacyOpen.value = true
  }

  /**
   * Opens the terms modal, lazy-loading its body first.
   * @returns A promise settling once the modal is open.
   */
  const openTerms = async (): Promise<void> => {
    if (loadContent) await loadContent('termsOfService')
    termsOpen.value = true
  }

  /**
   * The two modals as a functional component, so every render re-reads the
   * open state (a static VNode pair would freeze it at creation). It returns
   * the pair as a fragment — the same sibling list React's fragment renders.
   *
   * @returns The modal pair.
   */
  const modals = (): VNodeChild[] => [
    h(
      Modal,
      {
        open: privacyOpen.value,
        onClose: () => {
          privacyOpen.value = false
        },
        title: t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' }),
        size: 'lg',
      },
      {
        default: () => [
          h('div', {
            class: cm.prose,
            innerHTML: t('content.privacyPolicy', appName ? { appName: escapeHtml(appName) } : {}, {
              defaultValue: '',
            }),
          }),
        ],
      },
    ),
    h(
      Modal,
      {
        open: termsOpen.value,
        onClose: () => {
          termsOpen.value = false
        },
        title: t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' }),
        size: 'lg',
      },
      {
        default: () => [
          h('div', {
            class: cm.prose,
            innerHTML: t(
              'content.termsOfService',
              appName ? { appName: escapeHtml(appName) } : {},
              { defaultValue: '' },
            ),
          }),
        ],
      },
    ),
  ]

  return { openPrivacy, openTerms, modals }
}

/**
 * Drop-in Privacy/Terms links that open IN-PLACE modals instead of
 * navigating — for bespoke footers and signup pages.
 *
 * Renders the trigger button(s) + the modals together, so it suits the common
 * case where the two legal links are adjacent. For separated triggers, use
 * `useLegalModals` directly.
 *
 * @param props - Component props (see {@link LegalModalLinksProps}).
 * @returns The trigger button(s) and their modals.
 */
export const LegalModalLinks = defineComponent({
  name: 'LegalModalLinks',
  props: {
    linkClassName: String,
    show: {
      type: String as PropType<'both' | 'privacy' | 'terms'>,
      default: 'both',
    },
    privacyLabel: null,
    termsLabel: null,
    appName: String,
    loadContent: {
      type: Function as PropType<(key: 'privacyPolicy' | 'termsOfService') => Promise<void> | void>,
      default: undefined,
    },
  },
  setup(props: LegalModalLinksProps, { slots }) {
    const { t } = useTranslation()
    const { openPrivacy, openTerms, modals } = useLegalModals({
      appName: props.appName,
      loadContent: props.loadContent,
    })

    return (): VNodeChild[] => {
      const privacyLabel = nodeOrSlot(slots.privacyLabel, props.privacyLabel)
      const termsLabel = nodeOrSlot(slots.termsLabel, props.termsLabel)

      return [
        props.show !== 'terms'
          ? h(
              'button',
              { type: 'button', class: props.linkClassName, onClick: openPrivacy },
              privacyLabel.length > 0
                ? privacyLabel
                : [t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })],
            )
          : null,
        props.show !== 'privacy'
          ? h(
              'button',
              { type: 'button', class: props.linkClassName, onClick: openTerms },
              termsLabel.length > 0
                ? termsLabel
                : [t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })],
            )
          : null,
        h(modals),
      ]
    }
  },
})
