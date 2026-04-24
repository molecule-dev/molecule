import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

interface SettingsContentProps {
  /** Active section content. */
  children: ReactNode
  /** Extra classes. */
  className?: string
}

/**
 * Wrapper for the right-hand column of `<SettingsLayout>`. Just a
 * vertically-stacked container for one or more `<SettingsSection>`s —
 * useful as a semantic landmark and for consistent spacing.
 * @param root0
 * @param root0.children
 * @param root0.className
 */
export function SettingsContent({ children, className }: SettingsContentProps) {
  const cm = getClassMap()
  return <div className={cm.cn(cm.stack(6), className)}>{children}</div>
}
