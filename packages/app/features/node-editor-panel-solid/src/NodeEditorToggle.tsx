/**
 * Solid iOS-style switch row used for feature toggles (knowledge-base on/off,
 * structured mode, etc.) with an optional leading icon tile.
 *
 * Solid counterpart of `@molecule/app-node-editor-panel-react`'s
 * `NodeEditorToggle` — the same props (React names), the same ClassMap tokens
 * and the same DOM for the same input. The switch is the `<Switch>` from
 * `@molecule/app-ui-solid`.
 *
 * @module
 */

import { type Component, createUniqueId, Show } from 'solid-js'

import { ResolveNode } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Switch } from '@molecule/app-ui-solid'

import type { NodeEditorToggleProps } from './types.js'

/**
 * Toggle row — the Solid counterpart of
 * `@molecule/app-node-editor-panel-react`'s `NodeEditorToggle`.
 *
 * @param props - The title, subtitle, icon, checked state and change handler.
 * @returns The rendered toggle row.
 */
export const NodeEditorToggle: Component<NodeEditorToggleProps> = (props) => {
  const cm = getClassMap()

  // The switch is named by the title, and described by the subtitle when one
  // renders. Both ids are consumed unconditionally, as React's two `useId()`
  // calls are.
  const titleId = createUniqueId()
  const subtitleId = createUniqueId()
  return (
    <ResolveNode node={props.subtitle}>
      {(subtitle, hasSubtitle) => (
        <div
          class={cm.cn(
            cm.sp('p', 4),
            cm.flex({ align: 'center', justify: 'between' }),
            cm.nodeEditorPanelToggleRow,
          )}
        >
          <div class={cm.cn(cm.flex({ align: 'center' }), cm.nodeEditorPanelToggleGroup)}>
            <Show when={props.icon}>
              <div class={cm.cn(cm.sp('p', 2), cm.nodeEditorPanelToggleIconTile)}>
                <span class={cm.cn(cm.textSize('sm'), cm.iconGlyphFont)}>{props.icon}</span>
              </div>
            </Show>
            <div>
              <p
                id={titleId}
                class={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  cm.nodeEditorPanelToggleTitle,
                )}
              >
                {props.title}
              </p>
              <Show when={hasSubtitle()}>
                <p id={subtitleId} class={cm.cn(cm.nodeEditorPanelToggleSubtitle)}>
                  {subtitle()}
                </p>
              </Show>
            </div>
          </div>
          <Switch
            size="sm"
            checked={props.checked}
            aria-label={props.ariaLabel}
            aria-labelledby={props.ariaLabel === undefined ? titleId : undefined}
            aria-describedby={hasSubtitle() ? subtitleId : undefined}
            data-mol-id="node-editor-toggle"
            onChange={(event) => props.onChange((event.target as HTMLInputElement).checked)}
          />
        </div>
      )}
    </ResolveNode>
  )
}
