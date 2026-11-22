/**
 * Solid properties-panel chrome: title row with close button, scrollable body,
 * sticky footer for the save bar + status messages.
 *
 * Solid counterpart of `@molecule/app-node-editor-panel-react`'s
 * `NodeEditorPanel` — the same props (React names), the same ClassMap tokens
 * and the same DOM for the same input.
 *
 * @module
 */

import type { Component } from 'solid-js'
import { Show } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type { NodeEditorPanelProps } from './types.js'
import { renders } from './utilities.js'

/**
 * Properties panel chrome — the Solid counterpart of
 * `@molecule/app-node-editor-panel-react`'s `NodeEditorPanel`.
 *
 * @param props - The title, body and footer, plus the close handler.
 * @returns The rendered panel chrome.
 */
export const NodeEditorPanel: Component<NodeEditorPanelProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <aside
      class={cm.cn(
        cm.flex({ direction: 'col' }),
        props.widthClass ? props.widthClass : cm.w(80),
        cm.nodeEditorPanelAside,
      )}
    >
      <div
        class={cm.cn(
          cm.sp('p', 6),
          cm.flex({ align: 'center', justify: 'between' }),
          cm.nodeEditorPanelHeader,
        )}
      >
        <h2 class={cm.cn(cm.fontWeight('bold'), cm.nodeEditorPanelTitle)}>{props.title}</h2>
        <Show when={props.onClose}>
          <button
            type="button"
            data-mol-id="node-editor-panel-close"
            class={cm.cn(cm.dialogClose, cm.touchTarget)}
            aria-label={
              props.closeAriaLabel ??
              t('nodeEditorPanel.close', {}, { defaultValue: 'Close panel' })
            }
            onClick={(event: MouseEvent) => props.onClose?.(event)}
          >
            <span class={cm.iconGlyphFont}>close</span>
          </button>
        </Show>
      </div>
      <div class={cm.cn(cm.flex1, cm.sp('p', 6), cm.stack(8), cm.nodeEditorPanelBody)}>
        {props.children}
      </div>
      <Show when={renders(props.footer)}>
        <div class={cm.cn(cm.sp('p', 6), cm.nodeEditorPanelFooter)}>{props.footer}</div>
      </Show>
    </aside>
  )
}
