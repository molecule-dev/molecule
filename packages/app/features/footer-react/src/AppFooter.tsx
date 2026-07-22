import { useState } from 'react'
import { Link } from 'react-router-dom'

import { useTranslation, useVersion } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Icon, Modal } from '@molecule/app-ui-react'

/** Props for the AppFooter component. */
export interface AppFooterProps {
  /** Display name interpolated into the "About {{appName}}" link. */
  appName: string
  /**
   * URL or path for the About link. URLs starting with `http`/`https` are
   * rendered as `<a target="_blank">`; other values are rendered as a
   * `react-router-dom` `<Link>`.
   */
  aboutHref: string
  /**
   * How privacy/terms surfaces are presented:
   * - `'modal'` (default) — buttons that open in-place modals with HTML pulled
   *   from the bonded i18n catalog (`content.privacyPolicy` / `content.termsOfService`).
   *   Pass `loadContent` to lazy-load the catalog body before opening.
   * - `'route'` — `<Link to="/privacy">` / `<Link to="/terms">` for apps that
   *   render the legal pages on their own routes.
   */
  legalMode?: 'modal' | 'route'
  /**
   * Optional preloader called immediately before the privacy/terms modals
   * open. Only used when `legalMode === 'modal'`. Apps that lazy-load their
   * legal HTML pass `loadContent` from their config; apps that ship the
   * content statically can omit this.
   */
  loadContent?: (key: 'privacyPolicy' | 'termsOfService') => Promise<void> | void
  /** Path for the Privacy Policy route. Only used when `legalMode === 'route'`. Default: `/privacy`. */
  privacyTo?: string
  /** Path for the Terms of Service route. Only used when `legalMode === 'route'`. Default: `/terms`. */
  termsTo?: string
  /** Extra className on the outer `<footer>` (composed with `cm.footerBar`). */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}

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
 */
export function AppFooter({
  appName,
  aboutHref,
  legalMode = 'modal',
  loadContent,
  privacyTo = '/privacy',
  termsTo = '/terms',
  className,
  dataMolId,
}: AppFooterProps): React.JSX.Element {
  const cm = getClassMap()
  const { t, locale, setLocale, locales } = useTranslation()
  const { state: versionState } = useVersion()
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [termsOpen, setTermsOpen] = useState(false)
  const [languageOpen, setLanguageOpen] = useState(false)

  const version = t(
    'footer.version',
    { version: versionState.version || '1.0.0' },
    { defaultValue: 'v{{version}}' },
  )

  const aboutLabel = t('footer.about', { appName }, { defaultValue: 'About {{appName}}' })

  const legalNotConfigured = t(
    'footer.legalNotConfigured',
    {},
    {
      defaultValue: 'This content has not been configured yet. The app owner must provide it.',
    },
  )

  /**
   * Render legal HTML from the i18n catalog, or — when the app has registered
   * none (the bond ships `content.*` empty by design) — a clear placeholder.
   * Never a silently-blank modal, and never fabricated legal text.
   */
  const renderLegal = (html: string): React.JSX.Element =>
    html.trim() ? (
      <div className={cm.prose} dangerouslySetInnerHTML={{ __html: html }} />
    ) : (
      <p className={cm.prose}>{legalNotConfigured}</p>
    )

  const openPrivacy = async (): Promise<void> => {
    if (loadContent) await loadContent('privacyPolicy')
    setPrivacyOpen(true)
  }

  const openTerms = async (): Promise<void> => {
    if (loadContent) await loadContent('termsOfService')
    setTermsOpen(true)
  }

  return (
    <>
      {/* `<footer>` (contentinfo landmark), not a bare <section> — axe's
          `region` rule requires all page content inside landmarks, and
          screen-reader users jump to the footer by landmark. */}
      <footer className={cm.cn(cm.footerBar, className)} data-mol-id={dataMolId}>
        {isExternalHref(aboutHref) ? (
          <a href={aboutHref} target="_blank" rel="noopener noreferrer" className={cm.footerLink}>
            {aboutLabel}
          </a>
        ) : (
          <Link to={aboutHref} className={cm.footerLink}>
            {aboutLabel}
          </Link>
        )}
        {legalMode === 'modal' ? (
          <>
            <button type="button" onClick={openPrivacy} className={cm.footerButton}>
              {t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
            </button>
            <button type="button" onClick={openTerms} className={cm.footerButton}>
              {t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
            </button>
          </>
        ) : (
          <>
            <Link to={privacyTo} className={cm.footerButton}>
              {t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
            </Link>
            <Link to={termsTo} className={cm.footerButton}>
              {t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
            </Link>
          </>
        )}
        <button
          type="button"
          onClick={() => setLanguageOpen(true)}
          className={cm.footerButton}
          aria-label={t('footer.language', {}, { defaultValue: 'Language' })}
        >
          <Icon name="globe" size={14} /> {locales.find((l) => l.code === locale)?.name}
        </button>
        <span className={cm.footerLink}>{version}</span>
      </footer>
      {legalMode === 'modal' && (
        <>
          <Modal
            open={privacyOpen}
            onClose={() => setPrivacyOpen(false)}
            title={t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
            size="lg"
          >
            {renderLegal(t('content.privacyPolicy', { appName }, { defaultValue: '' }))}
          </Modal>
          <Modal
            open={termsOpen}
            onClose={() => setTermsOpen(false)}
            title={t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
            size="lg"
          >
            {renderLegal(t('content.termsOfService', { appName }, { defaultValue: '' }))}
          </Modal>
        </>
      )}
      <Modal
        open={languageOpen}
        onClose={() => setLanguageOpen(false)}
        title={t('footer.language', {}, { defaultValue: 'Language' })}
        size="lg"
      >
        <div className={cm.languageGrid}>
          {locales
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={async () => {
                  await setLocale(l.code)
                  setLanguageOpen(false)
                }}
                className={l.code === locale ? cm.languageActive : cm.languageOption}
              >
                {l.name}
              </button>
            ))}
        </div>
      </Modal>
    </>
  )
}
