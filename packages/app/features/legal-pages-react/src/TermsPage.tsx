import type { ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import type { SpacingScale } from '@molecule/app-ui'

import { LegalPageLayout } from './LegalPageLayout.js'

interface TermsPageProps {
  /** i18n key for the page heading. Defaults to `terms.title`. */
  titleKey?: string
  /** Default for the heading when the i18n key is missing. Defaults to `"Terms"`. */
  titleDefault?: string
  /** i18n key for the single-paragraph intro (ignored when `children` is passed). */
  introKey?: string
  /** Default intro body when the key is missing. */
  introDefault?: string
  /** Optional override body — use when the page has real content, not boilerplate. */
  children?: ReactNode
  /** Stack gap between body children. */
  stackGap?: SpacingScale
}

/**
 * Default Terms-of-service page scaffold.
 *
 * With no props, renders the canonical boilerplate Terms
 * (`<main><h1>{t('terms.title')}</h1><p>{t('terms.intro')}</p></main>`).
 * Pass `children` to render real content (e.g. `<LegalPageSection>`s).
 * @param root0
 * @param root0.titleKey
 * @param root0.titleDefault
 * @param root0.introKey
 * @param root0.introDefault
 * @param root0.children
 * @param root0.stackGap
 */
export function TermsPage({
  titleKey = 'terms.title',
  titleDefault = 'Terms',
  introKey = 'terms.intro',
  introDefault = 'This is the Terms page. Replace this placeholder with real content.',
  children,
  stackGap,
}: TermsPageProps) {
  const { t } = useTranslation()
  return (
    <LegalPageLayout
      dataMolId="page-terms"
      title={t(titleKey, {}, { defaultValue: titleDefault })}
      stackGap={stackGap}
    >
      {children ?? <p>{t(introKey, {}, { defaultValue: introDefault })}</p>}
    </LegalPageLayout>
  )
}
