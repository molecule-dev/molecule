import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

interface SettingsLayoutProps {
  /** Left-side navigation (typically `<SettingsSidebar>`). */
  sidebar: ReactNode
  /** Main content area (usually one or more `<SettingsSection>`s). */
  children: ReactNode
  /** Optional sticky header (breadcrumb, title, save button). */
  header?: ReactNode
  /** Extra classes on the outer wrapper. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}

/**
 * Two-column Settings page scaffold: sidebar on the left, content on the
 * right, optional sticky header above both.
 * @param root0
 * @param root0.sidebar
 * @param root0.children
 * @param root0.header
 * @param root0.className
 * @param root0.dataMolId
 */
export function SettingsLayout({
  sidebar,
  children,
  header,
  className,
  dataMolId,
}: SettingsLayoutProps) {
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
