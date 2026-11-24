/**
 * Solid Card-wrapped settings section: heading, optional description, body and
 * optional footer action row.
 *
 * Solid counterpart of `@molecule/app-settings-container-react`'s
 * `SettingsSection` — the same props (React names), the same ClassMap tokens,
 * and the same DOM for the same input.
 *
 * @module
 */

import type { Component } from 'solid-js'

import { PresentWhileNode } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Card } from '@molecule/app-ui-solid'

import type { SettingsSectionProps } from './types.js'

/**
 * One configuration section inside a Settings page — Card-wrapped, with
 * title / description header, body slot, and optional footer action row.
 *
 * @param props - Component props (see {@link SettingsSectionProps}).
 * @returns The rendered settings section.
 */
export const SettingsSection: Component<SettingsSectionProps> = (props) => {
  const cm = getClassMap()
  return (
    <Card className={props.className} data-mol-id={props.dataMolId}>
      <div class={cm.stack(4)}>
        <header class={cm.stack(1)}>
          <h2 class={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>{props.title}</h2>
          <PresentWhileNode node={props.description}>
            {(description) => <p class={cm.textSize('sm')}>{description()}</p>}
          </PresentWhileNode>
        </header>
        <div>{props.children}</div>
        <PresentWhileNode node={props.footer}>
          {(footer) => (
            <footer class={cm.flex({ justify: 'end', align: 'center', gap: 'sm' })}>
              {footer()}
            </footer>
          )}
        </PresentWhileNode>
      </div>
    </Card>
  )
}
