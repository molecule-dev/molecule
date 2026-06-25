import { type JSX, type ReactNode, useEffect, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ContentPageShell } from './ContentPageShell.js'

/** Which legal document a {@link LegalContentPage} renders. */
export type LegalKind = 'privacy' | 'terms'

const CONTENT_KEY: Record<LegalKind, string> = {
  privacy: 'content.privacyPolicy',
  terms: 'content.termsOfService',
}

const TITLE: Record<LegalKind, { key: string; def: string }> = {
  privacy: { key: 'footer.privacyPolicy', def: 'Privacy Policy' },
  terms: { key: 'footer.termsOfService', def: 'Terms of Service' },
}

const MODULE: Record<LegalKind, 'privacyPolicy' | 'termsOfService'> = {
  privacy: 'privacyPolicy',
  terms: 'termsOfService',
}

/**
 * Props for {@link LegalContentPage}.
 */
export interface LegalContentPageProps {
  /** Which legal document to render. */
  kind: LegalKind
  /** App name interpolated into the policy body (privacy uses `{{appName}}`). */
  appName?: string
  /**
   * Lazy-loader for the legal HTML (pass `loadContent` from the app's
   * `src/config.ts`, which re-exports it from
   * `@molecule/app-locales-legal-default`). Called once on mount so the
   * standalone page shows the **same** bonded content as the footer modal.
   */
  loadContent?: (key: 'privacyPolicy' | 'termsOfService') => Promise<void> | void
  /** App-specific top navigation, rendered above the hero. */
  header?: ReactNode
  /** App-specific footer, rendered below the content. */
  footer?: ReactNode
  /** i18n key for the small uppercase eyebrow. Defaults to `nav.legal`. */
  eyebrowKey?: string
  /** Default eyebrow text. Defaults to `Legal`. */
  eyebrowDefault?: string
}

/**
 * Standalone Privacy / Terms page that renders the **same** bonded legal
 * HTML the footer modal shows (`content.privacyPolicy` /
 * `content.termsOfService` from `@molecule/app-locales-legal-default`),
 * wrapped in the branded {@link ContentPageShell}.
 *
 * This keeps the in-place footer modal and the standalone `/privacy`,
 * `/terms` routes perfectly in sync — one source of legal copy, two
 * surfaces. Drop one of these into each app's `pages/Privacy.tsx` /
 * `pages/Terms.tsx`, passing the app's own header/footer chrome.
 *
 * @param props - See {@link LegalContentPageProps}.
 * @returns The rendered legal content page.
 */
export function LegalContentPage({
  kind,
  appName,
  loadContent,
  header,
  footer,
  eyebrowKey = 'nav.legal',
  eyebrowDefault = 'Legal',
}: LegalContentPageProps): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  // Re-render once the bonded content has been registered for the
  // current locale so `t(content.*)` resolves to the real HTML.
  const [, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    const done = (): void => {
      if (!cancelled) setReady(true)
    }
    Promise.resolve(loadContent?.(MODULE[kind])).then(done, done)
    return () => {
      cancelled = true
    }
  }, [loadContent, kind])

  const html = t(CONTENT_KEY[kind], appName ? { appName } : {}, { defaultValue: '' })

  return (
    <ContentPageShell
      dataMolId={`page-${kind}`}
      header={header}
      footer={footer}
      eyebrow={t(eyebrowKey, {}, { defaultValue: eyebrowDefault })}
      title={t(TITLE[kind].key, {}, { defaultValue: TITLE[kind].def })}
    >
      <div className={cm.prose} dangerouslySetInnerHTML={{ __html: html }} />
    </ContentPageShell>
  )
}
