import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'
import { Container } from '@molecule/app-ui-react'

interface AppShellLayoutProps {
  /** Slot for the header (typically the app's `<Header />`). */
  header?: ReactNode
  /** Slot for the footer (typically the app's `<Footer />`). */
  footer?: ReactNode
  /** Main content. Pass `<Outlet />` from `react-router-dom` for routed apps. */
  children: ReactNode
  /** Container max-width for the main content. Defaults to `'xl'`. */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full' | string
  /** Extra classes on the outer wrapper. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}

/**
 * Top-level page scaffold: header → main (constrained by Container) → footer.
 *
 * The page frame uses ClassMap tokens (`cm.page`, `cm.appLayout`) so the
 * styling library can be swapped without touching consumers. The header and
 * footer are slot props so consumers retain full control over branding,
 * navigation, and footer copy.
 *
 * @param root0
 * @param root0.header
 * @param root0.footer
 * @param root0.children
 * @param root0.maxWidth
 * @param root0.className
 * @param root0.dataMolId
 */
export function AppShellLayout({
  header,
  footer,
  children,
  maxWidth = 'xl',
  className,
  dataMolId,
}: AppShellLayoutProps) {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(cm.page, cm.appLayout, className)}
      data-mol-id={dataMolId}
    >
      {header}
      <main>
        <Container maxWidth={maxWidth}>
          {children}
        </Container>
      </main>
      {footer}
    </div>
  )
}
