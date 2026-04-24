import type { ReactNode } from 'react'

import type { SpacingScale } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

interface LegalPageLayoutProps {
  /** `data-mol-id` for AI agent selectors. */
  dataMolId?: string
  /** Rendered heading text (usually `t('...')`). */
  title: ReactNode
  /** Body content — paragraphs, `<LegalPageSection>`s, etc. */
  children: ReactNode
  /** ClassMap `container({size})` value. Defaults to `'md'`. */
  containerSize?: 'sm' | 'md' | 'lg' | 'xl'
  /** Stack gap between body children passed to ClassMap `stack()`. Defaults to 4. */
  stackGap?: SpacingScale
  /** Override the main wrapper's className (used by apps with custom chrome). */
  mainClassName?: string
  /** Override the body wrapper's className. */
  bodyClassName?: string
}

/**
 * Canonical Terms / Privacy layout shell.
 *
 * `<main data-mol-id={...} class="container py-12">
 *    <h1>{title}</h1>
 *    <div class="prose stack">{children}</div>
 *  </main>`
 *
 * Use this as the content shell for legal pages. Custom chrome (landing
 * top-nav, admin sidebar, etc.) should wrap the shell at the call site.
 * @param root0
 * @param root0.dataMolId
 * @param root0.title
 * @param root0.children
 * @param root0.containerSize
 * @param root0.stackGap
 * @param root0.mainClassName
 * @param root0.bodyClassName
 */
export function LegalPageLayout({
  dataMolId,
  title,
  children,
  containerSize = 'md',
  stackGap = 4,
  mainClassName,
  bodyClassName,
}: LegalPageLayoutProps) {
  const cm = getClassMap()
  return (
    <main
      data-mol-id={dataMolId}
      className={mainClassName ?? cm.cn(cm.container({ size: containerSize }), cm.sp('py', 12))}
    >
      <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), cm.sp('mb', 6))}>{title}</h1>
      <div className={bodyClassName ?? cm.cn(cm.prose, cm.stack(stackGap))}>{children}</div>
    </main>
  )
}
