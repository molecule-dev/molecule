import { type ReactElement, type ReactNode, useMemo } from 'react'

import { getClassMap } from '@molecule/app-ui'

import { SettingsPanelContext } from './context.js'

/** Props for {@link SettingsContainer}. */
export interface SettingsContainerProps {
  /** Dismiss-the-panel handler, published to every section through context. */
  onClose: () => void
  /** The section sub-components to host. */
  children: ReactNode
}

/**
 * Outer settings-panel layout: padded vertical stack that hosts the
 * section sub-components. Publishes `onClose` to descendants via
 * context so `<LogOutDeleteSection>` etc. can dismiss the panel
 * after an action without explicit prop threading.
 *
 * @param props - Component props.
 * @returns The settings panel container.
 */
export function SettingsContainer({ onClose, children }: SettingsContainerProps): ReactElement {
  // One context value per handler, so consumers re-render only when `onClose`
  // changes. Created before `cm`: the compiler cannot tell the class map is never
  // mutated, and a memo created while it is live would lose its memoization.
  const value = useMemo(() => ({ onClose }), [onClose])
  const cm = getClassMap()
  return (
    <SettingsPanelContext.Provider value={value}>
      <div className={cm.cn(cm.sp('p', 6), cm.stack(6))}>{children}</div>
    </SettingsPanelContext.Provider>
  )
}
