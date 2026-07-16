import type { JSX, ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'
import { Container } from '@molecule/app-ui-react'

/** Props accepted by the {@link AppShellLayout} component. */
export interface AppShellLayoutProps {
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
  /**
   * Extra classes on the inner `<main>` element. Apps that need
   * vertical rhythm around the routed content (e.g. `cm.sp('py', 8)`)
   * pass it here instead of forking the shell. Omitted by default so
   * the `<main>` carries no padding.
   */
  mainClassName?: string
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
 * @param props - Component props (see {@link AppShellLayoutProps}).
 */
export function AppShellLayout({
  header,
  footer,
  children,
  maxWidth = 'xl',
  className,
  mainClassName,
  dataMolId,
}: AppShellLayoutProps): JSX.Element {
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.page, cm.appLayout, className)} data-mol-id={dataMolId}>
      {header}
      <main className={mainClassName}>
        <Container maxWidth={maxWidth}>{children}</Container>
      </main>
      {footer}
    </div>
  )
}
