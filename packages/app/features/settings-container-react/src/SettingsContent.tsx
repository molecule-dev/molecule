import type { JSX, ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

/** Props accepted by the {@link SettingsContent} component. */
export interface SettingsContentProps {
  /** Active section content. */
  children: ReactNode
  /** Extra classes. */
  className?: string
}

/**
 * Wrapper for the right-hand column of `<SettingsLayout>`. Just a
 * vertically-stacked container for one or more `<SettingsSection>`s —
 * useful as a semantic landmark and for consistent spacing.
 * @param props - Component props (see {@link SettingsContentProps}).
 */
export function SettingsContent({ children, className }: SettingsContentProps): JSX.Element {
  const cm = getClassMap()
  return <div className={cm.cn(cm.stack(6), className)}>{children}</div>
}
