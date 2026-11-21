/**
 * Vue standalone Privacy / Terms page that renders the bonded legal HTML the
 * footer modal shows, inside the branded `ContentPageShell`.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, watch } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import { ContentPageShell } from './ContentPageShell.js'
import type { LegalContentPageProps, LegalKind } from './types.js'
import { escapeHtml, nodeOrSlot } from './utilities.js'

/** The bonded i18n key holding each document's HTML. */
const CONTENT_KEY: Record<LegalKind, string> = {
  privacy: 'content.privacyPolicy',
  terms: 'content.termsOfService',
}

/** The i18n key + default for each document's page title. */
const TITLE: Record<LegalKind, { key: string; def: string }> = {
  privacy: { key: 'footer.privacyPolicy', def: 'Privacy Policy' },
  terms: { key: 'footer.termsOfService', def: 'Terms of Service' },
}

/** The locale-module key each document's lazy loader receives. */
const MODULE: Record<LegalKind, 'privacyPolicy' | 'termsOfService'> = {
  privacy: 'privacyPolicy',
  terms: 'termsOfService',
}

/**
 * Standalone Privacy / Terms page that renders the **same** bonded legal
 * HTML the footer modal shows (`content.privacyPolicy` /
 * `content.termsOfService` from `@molecule/app-locales-legal-default`),
 * wrapped in the branded `ContentPageShell`.
 *
 * This keeps the in-place footer modal and the standalone `/privacy`,
 * `/terms` routes perfectly in sync — one source of legal copy, two
 * surfaces. Drop one of these into each app's `pages/Privacy.ts` /
 * `pages/Terms.ts`, passing the app's own header/footer chrome.
 *
 * Vue counterpart of `@molecule/app-legal-pages-react`'s `LegalContentPage` —
 * the same props (React names), the same DOM for the same input.
 *
 * @param props - Component props (see {@link LegalContentPageProps}).
 * @returns The legal content page component.
 */
export const LegalContentPage = defineComponent({
  name: 'LegalContentPage',
  props: {
    kind: {
      type: String as PropType<LegalKind>,
      required: true,
    },
    appName: String,
    loadContent: {
      type: Function as PropType<(key: 'privacyPolicy' | 'termsOfService') => Promise<void> | void>,
      default: undefined,
    },
    header: null,
    footer: null,
    eyebrowKey: {
      type: String,
      default: 'nav.legal',
    },
    eyebrowDefault: {
      type: String,
      default: 'Legal',
    },
  },
  setup(props: LegalContentPageProps, { slots }) {
    const cm = getClassMap()
    const { t } = useTranslation()

    // React's `useEffect` dependency list is `[loadContent, kind]`: the loader
    // runs once on mount and again whenever either changes.
    const load = (): void => {
      Promise.resolve(props.loadContent?.(MODULE[props.kind])).then(
        () => undefined,
        // A loader failure is not this page's to report: React's effect ignores
        // it the same way, and the bonded content that did register renders.
        (_error) => undefined,
      )
    }
    // `immediate` covers the mount call, the getters cover prop changes; a
    // setup-scoped watcher stops with the component.
    watch(() => [props.loadContent, props.kind] as const, load, { immediate: true })

    return (): VNode => {
      const html = t(
        CONTENT_KEY[props.kind],
        props.appName ? { appName: escapeHtml(props.appName) } : {},
        { defaultValue: '' },
      )

      return h(
        ContentPageShell,
        {
          dataMolId: `page-${props.kind}`,
          eyebrow: t(
            props.eyebrowKey ?? 'nav.legal',
            {},
            {
              defaultValue: props.eyebrowDefault ?? 'Legal',
            },
          ),
          title: t(TITLE[props.kind].key, {}, { defaultValue: TITLE[props.kind].def }),
        },
        {
          header: () => nodeOrSlot(slots.header, props.header),
          footer: () => nodeOrSlot(slots.footer, props.footer),
          default: () => [h('div', { class: cm.prose, innerHTML: html })],
        },
      )
    }
  },
})
