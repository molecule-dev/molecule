/**
 * Solid two-column settings-page scaffold: optional header, sidebar on the
 * left, content on the right.
 *
 * Solid counterpart of `@molecule/app-settings-container-react`'s
 * `SettingsLayout` — the same props (React names), the same ClassMap tokens,
 * and the same DOM for the same input.
 *
 * @module
 */

import type { Component } from 'solid-js'

import { getClassMap } from '@molecule/app-ui'

import type { SettingsLayoutProps } from './types.js'

/**
 * Two-column Settings page scaffold: sidebar on the left, content on the
 * right, optional (non-sticky) header above both.
 *
 * @param props - Component props (see {@link SettingsLayoutProps}).
 * @returns The rendered settings layout.
 */
export const SettingsLayout: Component<SettingsLayoutProps> = (props) => {
  const cm = getClassMap()
  return (
    <div data-mol-id={props.dataMolId} class={cm.cn(cm.stack(4), props.className)}>
      {props.header}
      <div class={cm.flex({ align: 'start', gap: 'lg' })}>
        <aside class={cm.shrink0}>{props.sidebar}</aside>
        <main class={cm.flex1}>
          <div class={cm.stack(6)}>{props.children}</div>
        </main>
      </div>
    </div>
  )
}
