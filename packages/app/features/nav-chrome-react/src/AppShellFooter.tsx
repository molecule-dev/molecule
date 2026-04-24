import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

/**
 *
 */
export interface FooterLink {
  label: ReactNode
  to?: string
}

interface AppShellFooterProps {
  /** Optional brand / logo. */
  logo?: ReactNode
  /** Optional copyright text. */
  copyright?: ReactNode
  /** Footer links — rendered in a row. */
  links?: FooterLink[]
  /** Optional right-side slot (locale picker, social icons). */
  right?: ReactNode
  /** Extra classes. */
  className?: string
}

/**
 * Bottom page footer shell. All content is optional — apps mix and match
 * logo / copyright / links / right-slot as the design demands.
 * @param root0
 * @param root0.logo
 * @param root0.copyright
 * @param root0.links
 * @param root0.right
 * @param root0.className
 */
export function AppShellFooter({ logo, copyright, links, right, className }: AppShellFooterProps) {
  const cm = getClassMap()
  return (
    <footer
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between', gap: 'md', wrap: 'wrap' }),
        cm.sp('px', 4),
        cm.sp('py', 4),
        className,
      )}
    >
      <div className={cm.flex({ align: 'center', gap: 'sm' })}>
        {logo}
        {copyright && <span className={cm.textSize('xs')}>{copyright}</span>}
      </div>
      {links && links.length > 0 && (
        <nav aria-label="Footer" className={cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' })}>
          {links.map((l, i) => (
            <a key={i} href={l.to ?? '#'} className={cm.cn(cm.textSize('sm'), cm.link)}>
              {l.label}
            </a>
          ))}
        </nav>
      )}
      {right}
    </footer>
  )
}
