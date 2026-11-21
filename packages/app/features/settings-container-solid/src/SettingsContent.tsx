/**
 * Solid wrapper for the right-hand column of the settings layout.
 *
 * Solid counterpart of `@molecule/app-settings-container-react`'s
 * `SettingsContent` — the same props (React names) and the same DOM for the
 * same input.
 *
 * @module
 */

import type { Component } from 'solid-js'

import { getClassMap } from '@molecule/app-ui'

import type { SettingsContentProps } from './types.js'

/**
 * Wrapper for the right-hand column of `<SettingsLayout>`. Just a
 * vertically-stacked container for one or more `<SettingsSection>`s — useful
 * as a semantic landmark and for consistent spacing.
 *
 * @param props - Component props (see {@link SettingsContentProps}).
 * @returns The rendered settings content.
 */
export const SettingsContent: Component<SettingsContentProps> = (props) => {
  const cm = getClassMap()
  return <div class={cm.cn(cm.stack(6), props.className)}>{props.children}</div>
}
