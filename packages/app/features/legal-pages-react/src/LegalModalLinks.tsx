import { type JSX, type ReactNode, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Modal } from '@molecule/app-ui-react'

/** Shared options for the legal-modal hook + component. */
export interface UseLegalModalsOptions {
  /** App name interpolated into the privacy AND terms bodies (`{{appName}}`). */
  appName?: string
  /**
   * Lazy-loader for the legal HTML — pass `loadContent` from the app's
   * `src/config.ts`. Called right before a modal opens so the bonded
   * content is present on first render.
   */
  loadContent?: (key: 'privacyPolicy' | 'termsOfService') => Promise<void> | void
}

/** Imperative API returned by {@link useLegalModals}. */
export interface LegalModalsApi {
  /** Open the Privacy Policy modal (loads content first). */
  openPrivacy: () => Promise<void>
  /** Open the Terms of Service modal (loads content first). */
  openTerms: () => Promise<void>
  /** The two `<Modal>` elements — render once anywhere in the tree. */
  modals: JSX.Element
}

/**
 * Headless hook powering in-place Privacy/Terms modals. Use it when the
 * triggers live in different parts of a bespoke footer (or a signup
 * page); place `{modals}` once and wire `openPrivacy`/`openTerms` to your
 * own links/buttons.
 *
 * The modal body is the SAME bonded HTML the {@link LegalContentPage}
 * standalone routes render (`content.privacyPolicy` /
 * `content.termsOfService`), so every legal surface stays in sync.
 *
 * @param options - See {@link UseLegalModalsOptions}.
 * @returns Imperative {@link LegalModalsApi}.
 */
export function useLegalModals({
  appName,
  loadContent,
}: UseLegalModalsOptions = {}): LegalModalsApi {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [termsOpen, setTermsOpen] = useState(false)

  const openPrivacy = async (): Promise<void> => {
    if (loadContent) await loadContent('privacyPolicy')
    setPrivacyOpen(true)
  }
  const openTerms = async (): Promise<void> => {
    if (loadContent) await loadContent('termsOfService')
    setTermsOpen(true)
  }

  const modals = (
    <>
      <Modal
        open={privacyOpen}
        onClose={() => setPrivacyOpen(false)}
        title={t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
        size="lg"
      >
        <div
          className={cm.prose}
          dangerouslySetInnerHTML={{
            __html: t('content.privacyPolicy', appName ? { appName } : {}, { defaultValue: '' }),
          }}
        />
      </Modal>
      <Modal
        open={termsOpen}
        onClose={() => setTermsOpen(false)}
        title={t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
        size="lg"
      >
        <div
          className={cm.prose}
          dangerouslySetInnerHTML={{
            __html: t('content.termsOfService', appName ? { appName } : {}, { defaultValue: '' }),
          }}
        />
      </Modal>
    </>
  )

  return { openPrivacy, openTerms, modals }
}

/** Props for {@link LegalModalLinks}. */
export interface LegalModalLinksProps extends UseLegalModalsOptions {
  /** className applied to each trigger `<button>` (match the footer's link style). */
  linkClassName?: string
  /** Which links to render. Defaults to `'both'`. */
  show?: 'both' | 'privacy' | 'terms'
  /** Override the Privacy label (defaults to i18n `footer.privacyPolicy`). */
  privacyLabel?: ReactNode
  /** Override the Terms label (defaults to i18n `footer.termsOfService`). */
  termsLabel?: ReactNode
}

/**
 * Drop-in Privacy/Terms links that open IN-PLACE modals instead of
 * navigating — for bespoke footers and signup pages. Replace
 * `<Link to="/privacy">Privacy</Link>` / `<Link to="/terms">Terms</Link>`
 * with `<LegalModalLinks linkClassName={...} appName={APP_NAME} loadContent={loadContent} />`.
 *
 * Renders the trigger button(s) + the modals together, so it suits the
 * common case where the two legal links are adjacent. For separated
 * triggers, use {@link useLegalModals} directly.
 *
 * @param props - See {@link LegalModalLinksProps}.
 * @returns The trigger button(s) and their modals.
 */
export function LegalModalLinks({
  linkClassName,
  show = 'both',
  privacyLabel,
  termsLabel,
  ...opts
}: LegalModalLinksProps): JSX.Element {
  const { t } = useTranslation()
  const { openPrivacy, openTerms, modals } = useLegalModals(opts)
  return (
    <>
      {show !== 'terms' && (
        <button type="button" className={linkClassName} onClick={openPrivacy}>
          {privacyLabel ?? t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
        </button>
      )}
      {show !== 'privacy' && (
        <button type="button" className={linkClassName} onClick={openTerms}>
          {termsLabel ?? t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
        </button>
      )}
      {modals}
    </>
  )
}
