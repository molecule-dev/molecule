import type { JSX, ReactNode } from 'react'

import type { SpacingScale } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

export interface LegalPageSectionProps {
  /** Rendered heading text. */
  title: ReactNode
  /** Section body — one or more paragraphs. */
  children: ReactNode
  /** Stack gap between heading and body (ClassMap `stack()`). Defaults to 2. */
  stackGap?: SpacingScale
}

/**
 * One sub-section of a legal page (`h2` + body) styled for use inside
 * `<LegalPageLayout>`.
 * @param props - Component props (see {@link LegalPageSectionProps}).
 */
export function LegalPageSection({
  title,
  children,
  stackGap = 2,
}: LegalPageSectionProps): JSX.Element {
  const cm = getClassMap()
  return (
    <section className={cm.stack(stackGap)}>
      <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('semibold'))}>{title}</h2>
      {children}
    </section>
  )
}
