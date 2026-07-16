import type { JSX, ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

/** A single navigable link rendered in the footer link row. */
export interface FooterLink {
  label: ReactNode
  to?: string
}

export interface AppShellFooterProps {
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
 * @param props - Component props (see {@link AppShellFooterProps}).
 */
export function AppShellFooter({
  logo,
  copyright,
  links,
  right,
  className,
}: AppShellFooterProps): JSX.Element {
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
