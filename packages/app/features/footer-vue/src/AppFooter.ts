/**
 * Vue app-shell footer — About link, Privacy/Terms modals, language picker,
 * version.
 *
 * @module
 */

import { defineComponent, h, type PropType, ref, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Icon, Modal } from '@molecule/app-ui-vue'
import { Link, useTranslation, useVersion } from '@molecule/app-vue'

/**
 * HTML-escapes an interpolation value before it enters a translation whose
 * result is rendered as HTML (`innerHTML`). Vue escapes text children
 * automatically but NOT values interpolated into HTML strings — an `appName`
 * containing markup would otherwise execute inside the legal content.
 *
 * @param value - The raw interpolation value.
 * @returns The escaped value.
 */
const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

/**
 * Whether an href is an external URL (rendered as a plain `target="_blank"`
 * anchor) rather than an in-app path (rendered as a router link).
 *
 * @param href - The href to test.
 * @returns True for `http`/`https` URLs.
 */
const isExternalHref = (href: string): boolean => /^https?:\/\//i.test(href)

/**
 * App-shell footer — About link, Privacy/Terms modals, language picker, version.
 *
 * Reproduces the Footer pattern that appears in 9 flagship apps with one line
 * of variation (external WEBSITE_URL vs internal /about). Privacy/Terms HTML
 * is loaded lazily through the `loadContent` callback when supplied, then
 * rendered from the bonded i18n catalog (`content.privacyPolicy`,
 * `content.termsOfService`). Those keys are EMPTY by default (the app supplies
 * its real legal HTML); until it does, the modal shows a clear
 * `footer.legalNotConfigured` placeholder rather than a silently-blank modal.
 *
 * Vue counterpart of `@molecule/app-footer-react`'s `AppFooter` — the same
 * props (React names), the same DOM for the same input.
 *
 * @param props - Component props (see {@link AppFooterProps}).
 * @returns The footer component.
 */
export const AppFooter = defineComponent({
  name: 'AppFooter',
  props: {
    appName: {
      type: String,
      required: true,
    },
    aboutHref: {
      type: String,
      required: true,
    },
    legalMode: {
      type: String as PropType<'modal' | 'route'>,
      default: 'modal',
    },
    loadContent: {
      type: Function as PropType<(key: 'privacyPolicy' | 'termsOfService') => Promise<void> | void>,
      default: undefined,
    },
    privacyTo: {
      type: String,
      default: '/privacy',
    },
    termsTo: {
      type: String,
      default: '/terms',
    },
    className: String,
    dataMolId: String,
  },
  setup(props) {
    const cm = getClassMap()
    const { t, locale, setLocale, locales } = useTranslation()
    const { state: versionState } = useVersion()
    const privacyOpen = ref(false)
    const termsOpen = ref(false)
    const languageOpen = ref(false)

    /**
     * Runs the app's `loadContent` preloader (when given) and opens the
     * privacy modal.
     */
    const openPrivacy = async (): Promise<void> => {
      if (props.loadContent) await props.loadContent('privacyPolicy')
      privacyOpen.value = true
    }

    /**
     * Runs the app's `loadContent` preloader (when given) and opens the
     * terms modal.
     */
    const openTerms = async (): Promise<void> => {
      if (props.loadContent) await props.loadContent('termsOfService')
      termsOpen.value = true
    }

    /**
     * Switches the locale, then closes the language picker.
     *
     * @param code - The locale code to switch to.
     */
    const selectLocale = async (code: string): Promise<void> => {
      await setLocale(code)
      languageOpen.value = false
    }

    return (): VNodeChild => {
      const version = t(
        'footer.version',
        { version: versionState.value.version || '1.0.0' },
        { defaultValue: 'v{{version}}' },
      )

      const aboutLabel = t(
        'footer.about',
        { appName: props.appName },
        {
          defaultValue: 'About {{appName}}',
        },
      )

      const legalNotConfigured = t(
        'footer.legalNotConfigured',
        {},
        {
          defaultValue: 'This content has not been configured yet. The app owner must provide it.',
        },
      )

      const privacyLabel = t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })
      const termsLabel = t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })
      const languageLabel = t('footer.language', {}, { defaultValue: 'Language' })

      /**
       * Renders legal HTML from the i18n catalog, or — when the app has
       * registered none (the bond ships `content.*` empty by design) — a clear
       * placeholder. Never a silently-blank modal, and never fabricated legal
       * text. The catalog is app-supplied, so the HTML is inserted raw — the
       * same trust model as React's `dangerouslySetInnerHTML`.
       *
       * @param html - The legal HTML from the catalog.
       * @returns The modal-body node.
       */
      const renderLegal = (html: string): VNodeChild =>
        html.trim()
          ? h('div', { class: cm.prose, innerHTML: html })
          : h('p', { class: cm.prose }, legalNotConfigured)

      const legalLinks =
        props.legalMode === 'modal'
          ? [
              h('button', { type: 'button', onClick: openPrivacy, class: cm.footerButton }, [
                privacyLabel,
              ]),
              h('button', { type: 'button', onClick: openTerms, class: cm.footerButton }, [
                termsLabel,
              ]),
            ]
          : [
              h(Link, { to: props.privacyTo, class: cm.footerButton }, () => privacyLabel),
              h(Link, { to: props.termsTo, class: cm.footerButton }, () => termsLabel),
            ]

      // A fragment, exactly like React's `<>…</>`: the footer, the privacy /
      // terms modals and the language modal are SIBLINGS — no wrapper element.
      return [
        // `<footer>` (contentinfo landmark), not a bare <section> — axe's
        // `region` rule requires all page content inside landmarks, and
        // screen-reader users jump to the footer by landmark.
        h(
          'footer',
          { class: cm.cn(cm.footerBar, props.className), 'data-mol-id': props.dataMolId },
          [
            isExternalHref(props.aboutHref)
              ? h(
                  'a',
                  {
                    href: props.aboutHref,
                    target: '_blank',
                    rel: 'noopener noreferrer',
                    class: cm.footerLink,
                  },
                  aboutLabel,
                )
              : h(Link, { to: props.aboutHref, class: cm.footerLink }, () => aboutLabel),
            ...legalLinks,
            h(
              'button',
              {
                type: 'button',
                onClick: () => {
                  languageOpen.value = true
                },
                class: cm.footerButton,
                'aria-label': languageLabel,
              },
              [
                h(Icon, { name: 'globe', size: 14 }),
                ' ',
                locales.value.find((l) => l.code === locale.value)?.name,
              ],
            ),
            h('span', { class: cm.footerLink }, version),
          ],
        ),
        ...(props.legalMode === 'modal'
          ? [
              h(
                Modal,
                {
                  open: privacyOpen.value,
                  onClose: () => {
                    privacyOpen.value = false
                  },
                  title: privacyLabel,
                  size: 'lg',
                },
                {
                  default: () => [
                    renderLegal(
                      t(
                        'content.privacyPolicy',
                        { appName: escapeHtml(props.appName) },
                        {
                          defaultValue: '',
                        },
                      ),
                    ),
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
                  title: termsLabel,
                  size: 'lg',
                },
                {
                  default: () => [
                    renderLegal(
                      t(
                        'content.termsOfService',
                        { appName: escapeHtml(props.appName) },
                        {
                          defaultValue: '',
                        },
                      ),
                    ),
                  ],
                },
              ),
            ]
          : []),
        h(
          Modal,
          {
            open: languageOpen.value,
            onClose: () => {
              languageOpen.value = false
            },
            title: languageLabel,
            size: 'lg',
          },
          {
            default: () => [
              h(
                'div',
                { class: cm.languageGrid },
                [...locales.value]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((l) =>
                    h(
                      'button',
                      {
                        key: l.code,
                        type: 'button',
                        onClick: () => selectLocale(l.code),
                        class: l.code === locale.value ? cm.languageActive : cm.languageOption,
                      },
                      l.name,
                    ),
                  ),
              ),
            ],
          },
        ),
      ]
    }
  },
})
