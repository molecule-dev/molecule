import type { ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import type { SpacingScale } from '@molecule/app-ui'

import { LegalPageLayout } from './LegalPageLayout.js'

interface PrivacyPageProps {
  /** i18n key for the page heading. Defaults to `privacy.title`. */
  titleKey?: string
  /** Default for the heading when the key is missing. Defaults to `"Privacy"`. */
  titleDefault?: string
  /** i18n key for the single-paragraph intro (ignored when `children` is passed). */
  introKey?: string
  /** Default intro body when the key is missing. */
  introDefault?: string
  /** Optional override body — use when the page has real content. */
  children?: ReactNode
  /** Stack gap between body children. */
  stackGap?: SpacingScale
}

/**
 * Default Privacy-policy page scaffold.
 *
 * With no props, renders the canonical boilerplate Privacy page.
 * Pass `children` to render real content.
 * @param root0
 * @param root0.titleKey
 * @param root0.titleDefault
 * @param root0.introKey
 * @param root0.introDefault
 * @param root0.children
 * @param root0.stackGap
 */
export function PrivacyPage({
  titleKey = 'privacy.title',
  titleDefault = 'Privacy',
  introKey = 'privacy.intro',
  introDefault = 'This is the Privacy page. Replace this placeholder with real content.',
  children,
  stackGap,
}: PrivacyPageProps) {
  const { t } = useTranslation()
  return (
    <LegalPageLayout
      dataMolId="page-privacy"
      title={t(titleKey, {}, { defaultValue: titleDefault })}
      stackGap={stackGap}
    >
      {children ?? <p>{t(introKey, {}, { defaultValue: introDefault })}</p>}
    </LegalPageLayout>
  )
}
