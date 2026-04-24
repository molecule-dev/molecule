import type { ReactNode } from 'react'

import type { SpacingScale } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

interface LegalPageSectionProps {
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
 * @param root0
 * @param root0.title
 * @param root0.children
 * @param root0.stackGap
 */
export function LegalPageSection({ title, children, stackGap = 2 }: LegalPageSectionProps) {
  const cm = getClassMap()
  return (
    <section className={cm.stack(stackGap)}>
      <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('semibold'))}>{title}</h2>
      {children}
    </section>
  )
}
