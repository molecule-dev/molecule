import type { JSX, ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

/** Props accepted by the {@link SettingsLayout} component. */
export interface SettingsLayoutProps {
  /** Left-side navigation (typically `<SettingsSidebar>`). */
  sidebar: ReactNode
  /** Main content area (usually one or more `<SettingsSection>`s). */
  children: ReactNode
  /**
   * Optional header (breadcrumb, title, save button) rendered above both
   * columns. NOT sticky — apply your own sticky positioning if needed.
   */
  header?: ReactNode
  /** Extra classes on the outer wrapper. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}

/**
 * Two-column Settings page scaffold: sidebar on the left, content on the
 * right, optional (non-sticky) header above both.
 * @param props - Component props (see {@link SettingsLayoutProps}).
 */
export function SettingsLayout({
  sidebar,
  children,
  header,
  className,
  dataMolId,
}: SettingsLayoutProps): JSX.Element {
  const cm = getClassMap()
  return (
    <div data-mol-id={dataMolId} className={cm.cn(cm.stack(4), className)}>
      {header}
      <div className={cm.flex({ align: 'start', gap: 'lg' })}>
        <aside className={cm.shrink0}>{sidebar}</aside>
        <main className={cm.flex1}>
          <div className={cm.stack(6)}>{children}</div>
        </main>
      </div>
    </div>
  )
}
