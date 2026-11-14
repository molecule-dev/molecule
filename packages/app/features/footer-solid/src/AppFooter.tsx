import type { Component, JSX } from 'solid-js'
import { createSignal, For } from 'solid-js'

import type { LocaleConfig } from '@molecule/app-i18n'
import { Link, useTranslation, useVersion } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Icon, Modal } from '@molecule/app-ui-solid'

import type { AppFooterProps } from './types.js'
import { escapeHtml, isExternalHref } from './utilities.js'

/**
 * App-shell footer — About link, Privacy/Terms modals, language picker,
 * version.
 *
 * Reproduces the Footer pattern that appears in 9 flagship apps with one line
 * of variation (external WEBSITE_URL vs internal /about). Privacy/Terms HTML
 * is loaded lazily through the `loadContent` callback when supplied, then
 * rendered from the bonded i18n catalog (`content.privacyPolicy`,
 * `content.termsOfService`). Those keys are EMPTY by default (the app supplies
 * its real legal HTML); until it does, the modal shows a clear
 * `footer.legalNotConfigured` placeholder rather than a silently-blank modal.
 *
 * This is the Solid counterpart of `@molecule/app-footer-react`: the same
 * props (React names), the same ClassMap tokens, the same i18n keys and
 * English defaults, and the same DOM for the same input.
 *
 * @param props - Component props (see {@link AppFooterProps}).
 * @returns The rendered footer and its modals.
 */
export const AppFooter: Component<AppFooterProps> = (props) => {
  const cm = getClassMap()
  const { t, locale, setLocale, locales } = useTranslation()
  const { state: versionState } = useVersion()
  const [privacyOpen, setPrivacyOpen] = createSignal(false)
  const [termsOpen, setTermsOpen] = createSignal(false)
  const [languageOpen, setLanguageOpen] = createSignal(false)

  const version = (): string =>
    t(
      'footer.version',
      { version: versionState().version || '1.0.0' },
      { defaultValue: 'v{{version}}' },
    )

  const aboutLabel = (): string =>
    t('footer.about', { appName: props.appName }, { defaultValue: 'About {{appName}}' })

  const legalNotConfigured = (): string =>
    t(
      'footer.legalNotConfigured',
      {},
      {
        defaultValue: 'This content has not been configured yet. The app owner must provide it.',
      },
    )

  const legalMode = (): 'modal' | 'route' => props.legalMode ?? 'modal'
  const privacyTo = (): string => props.privacyTo ?? '/privacy'
  const termsTo = (): string => props.termsTo ?? '/terms'

  /** The current locale's display name (the language button's label). */
  const currentLocaleName = (): string | undefined =>
    locales().find((l) => l.code === locale())?.name

  /** The registered locales, name-sorted (the picker's display order). */
  const sortedLocales = (): LocaleConfig[] =>
    [...locales()].sort((a, b) => a.name.localeCompare(b.name))

  /**
   * Render legal HTML from the i18n catalog, or — when the app has registered
   * none (the bond ships `content.*` empty by design) — a clear placeholder.
   * Never a silently-blank modal, and never fabricated legal text. The HTML
   * branch inserts the catalog's markup RAW (`innerHTML`), the exact trust
   * model React's reference renders with through `dangerouslySetInnerHTML`:
   * the catalog is app-supplied, and the `{{appName}}` interpolation is
   * escaped by the caller.
   *
   * @param html - The legal HTML from the i18n catalog.
   * @returns The legal body.
   */
  const renderLegal = (html: string): JSX.Element =>
    html.trim() ? (
      <div class={cm.prose} innerHTML={html} />
    ) : (
      <p class={cm.prose}>{legalNotConfigured()}</p>
    )

  /** The privacy modal's HTML: the catalog body with the app name escaped. */
  const privacyHtml = (): string =>
    t('content.privacyPolicy', { appName: escapeHtml(props.appName) }, { defaultValue: '' })

  /** The terms modal's HTML: the catalog body with the app name escaped. */
  const termsHtml = (): string =>
    t('content.termsOfService', { appName: escapeHtml(props.appName) }, { defaultValue: '' })

  /**
   * Opens the privacy modal, lazy-loading its catalog body first when the
   * app supplies a preloader.
   */
  const openPrivacy = async (): Promise<void> => {
    if (props.loadContent) await props.loadContent('privacyPolicy')
    setPrivacyOpen(true)
  }

  /**
   * Opens the terms modal, lazy-loading its catalog body first when the app
   * supplies a preloader.
   */
  const openTerms = async (): Promise<void> => {
    if (props.loadContent) await props.loadContent('termsOfService')
    setTermsOpen(true)
  }

  /**
   * Switches the locale, then closes the picker once the provider has
   * applied it.
   *
   * @param code - The locale code to switch to.
   */
  const pickLocale = async (code: string): Promise<void> => {
    await setLocale(code)
    setLanguageOpen(false)
  }

  return (
    <>
      {/* `<footer>` (contentinfo landmark), not a bare <section> — axe's
          `region` rule requires all page content inside landmarks, and
          screen-reader users jump to the footer by landmark. */}
      <footer class={cm.cn(cm.footerBar, props.className)} data-mol-id={props.dataMolId}>
        {isExternalHref(props.aboutHref) ? (
          <a href={props.aboutHref} target="_blank" rel="noopener noreferrer" class={cm.footerLink}>
            {aboutLabel()}
          </a>
        ) : (
          <Link to={props.aboutHref} class={cm.footerLink}>
            {aboutLabel()}
          </Link>
        )}
        {legalMode() === 'modal' ? (
          <>
            <button type="button" onClick={openPrivacy} class={cm.footerButton}>
              {t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
            </button>
            <button type="button" onClick={openTerms} class={cm.footerButton}>
              {t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
            </button>
          </>
        ) : (
          <>
            <Link to={privacyTo()} class={cm.footerButton}>
              {t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
            </Link>
            <Link to={termsTo()} class={cm.footerButton}>
              {t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
            </Link>
          </>
        )}
        <button
          type="button"
          onClick={() => setLanguageOpen(true)}
          class={cm.footerButton}
          aria-label={t('footer.language', {}, { defaultValue: 'Language' })}
        >
          <Icon name="globe" size={14} /> {currentLocaleName()}
        </button>
        <span class={cm.footerLink}>{version()}</span>
      </footer>
      {legalMode() === 'modal' && (
        <>
          <Modal
            open={privacyOpen()}
            onClose={() => setPrivacyOpen(false)}
            title={t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
            size="lg"
          >
            {renderLegal(privacyHtml())}
          </Modal>
          <Modal
            open={termsOpen()}
            onClose={() => setTermsOpen(false)}
            title={t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
            size="lg"
          >
            {renderLegal(termsHtml())}
          </Modal>
        </>
      )}
      <Modal
        open={languageOpen()}
        onClose={() => setLanguageOpen(false)}
        title={t('footer.language', {}, { defaultValue: 'Language' })}
        size="lg"
      >
        <div class={cm.languageGrid}>
          <For each={sortedLocales()}>
            {(l) => (
              <button
                type="button"
                onClick={() => pickLocale(l.code)}
                class={l.code === locale() ? cm.languageActive : cm.languageOption}
              >
                {l.name}
              </button>
            )}
          </For>
        </div>
      </Modal>
    </>
  )
}
