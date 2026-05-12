import { type ReactNode, useMemo } from 'react'

import { getClassMap } from '@molecule/app-ui'

import { SettingsPanelContext } from './context.js'

/**
 * Outer settings-panel layout: padded vertical stack that hosts the
 * section sub-components. Publishes `onClose` to descendants via
 * context so `<LogOutDeleteSection>` etc. can dismiss the panel
 * after an action without explicit prop threading.
 */
export function SettingsContainer({
  onClose,
  children,
}: {
  onClose: () => void
  children: ReactNode
}) {
  const cm = getClassMap()
  const value = useMemo(() => ({ onClose }), [onClose])
  return (
    <SettingsPanelContext.Provider value={value}>
      <div className={cm.cn(cm.sp('p', 6), cm.stack(6))}>{children}</div>
    </SettingsPanelContext.Provider>
  )
}
