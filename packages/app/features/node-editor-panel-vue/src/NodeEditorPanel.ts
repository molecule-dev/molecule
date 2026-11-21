/**
 * Vue properties-panel chrome: title row with close button, scrollable body,
 * sticky footer for the save bar + status messages.
 *
 * Vue counterpart of `@molecule/app-node-editor-panel-react`'s
 * `NodeEditorPanel` — the same props (React names), the same ClassMap tokens
 * and the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode } from 'vue'

import { getClassMap } from '@molecule/app-ui'

import type { NodeEditorPanelProps } from './types.js'
import { renders, slotOrProp } from './utilities.js'

/**
 * Properties panel chrome — the Vue counterpart of
 * `@molecule/app-node-editor-panel-react`'s `NodeEditorPanel`.
 *
 * @param props - The title, body and footer slots plus the close handler.
 * @returns The panel chrome.
 */
export const NodeEditorPanel = defineComponent({
  name: 'NodeEditorPanel',
  props: {
    title: null,
    children: null,
    footer: null,
    onClose: Function as PropType<NodeEditorPanelProps['onClose']>,
    closeAriaLabel: { type: String, default: 'Close panel' },
    widthClass: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()

    return (): VNode =>
      h(
        'aside',
        {
          class: cm.cn(
            cm.flex({ direction: 'col' }),
            props.widthClass ? props.widthClass : cm.w(80),
            cm.nodeEditorPanelAside,
          ),
        },
        [
          h(
            'div',
            {
              class: cm.cn(
                cm.sp('p', 6),
                cm.flex({ align: 'center', justify: 'between' }),
                cm.nodeEditorPanelHeader,
              ),
            },
            [
              h(
                'h2',
                { class: cm.cn(cm.fontWeight('bold'), cm.nodeEditorPanelTitle) },
                slotOrProp(slots.title, props.title),
              ),
              props.onClose
                ? h(
                    'button',
                    {
                      type: 'button',
                      'data-mol-id': 'node-editor-panel-close',
                      class: cm.cn(cm.dialogClose, cm.touchTarget),
                      'aria-label': props.closeAriaLabel,
                      onClick: (event: MouseEvent) => props.onClose?.(event),
                    },
                    [h('span', { class: cm.iconGlyphFont }, 'close')],
                  )
                : null,
            ],
          ),
          h(
            'div',
            {
              class: cm.cn(cm.flex1, cm.sp('p', 6), cm.stack(8), cm.nodeEditorPanelBody),
            },
            slotOrProp(slots.default, props.children),
          ),
          renders(slots.footer, props.footer)
            ? h(
                'div',
                { class: cm.cn(cm.sp('p', 6), cm.nodeEditorPanelFooter) },
                slotOrProp(slots.footer, props.footer),
              )
            : null,
        ],
      )
  },
})
