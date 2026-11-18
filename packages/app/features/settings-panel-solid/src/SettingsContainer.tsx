/**
 * The settings container.
 *
 * @module
 */

import type { JSX } from 'solid-js'

import { getClassMap } from '@molecule/app-ui'

import { SettingsPanelContext } from './context.js'
import type { SettingsPanelContextValue } from './types.js'

/** Props for {@link SettingsContainer}. */
export interface SettingsContainerProps {
  /** Dismiss-the-panel handler, published to every section through context. */
  onClose: () => void
  /** The section sub-components to host. */
  children?: JSX.Element
}

/**
 * Outer settings-panel layout: padded vertical stack that hosts the
 * section sub-components. Publishes `onClose` to descendants via
 * context so `<LogOutDeleteSection>` etc. can dismiss the panel
 * after an action without explicit prop threading.
 *
 * @param props - The component props.
 * @returns The settings panel container.
 */
export function SettingsContainer(props: SettingsContainerProps): JSX.Element {
  const cm = getClassMap()
  // Read the CURRENT prop, so a changed handler reaches descendants the way
  // React's memoized context value does after a re-render.
  const value: SettingsPanelContextValue = {
    get onClose(): () => void {
      return props.onClose
    },
  }
  return (
    <SettingsPanelContext.Provider value={value}>
      <div class={cm.cn(cm.sp('p', 6), cm.stack(6))}>{props.children}</div>
    </SettingsPanelContext.Provider>
  )
}
