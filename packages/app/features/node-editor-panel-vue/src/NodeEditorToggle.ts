/**
 * Vue iOS-style switch row used for feature toggles (knowledge-base on/off,
 * structured mode, etc.) with an optional leading icon tile.
 *
 * Vue counterpart of `@molecule/app-node-editor-panel-react`'s
 * `NodeEditorToggle` — the same props (React names), the same ClassMap tokens
 * and the same DOM for the same input. The switch is the `<Switch>` from
 * `@molecule/app-ui-vue`.
 *
 * @module
 */

import { defineComponent, h, type PropType, useId, type VNode } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Switch } from '@molecule/app-ui-vue'

import type { NodeEditorToggleProps } from './types.js'
import { slotOrProp } from './utilities.js'

/**
 * Toggle row — the Vue counterpart of
 * `@molecule/app-node-editor-panel-react`'s `NodeEditorToggle`.
 *
 * @param props - The title, subtitle, icon, checked state and change handler.
 * @returns The toggle row.
 */
export const NodeEditorToggle = defineComponent({
  name: 'NodeEditorToggle',
  props: {
    title: null,
    subtitle: null,
    icon: String,
    checked: { type: Boolean, required: true },
    onChange: {
      type: Function as PropType<NodeEditorToggleProps['onChange']>,
      required: true,
    },
    ariaLabel: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()
    // The switch is named by the title, and described by the subtitle when one
    // renders. Both ids are consumed unconditionally, as React's two `useId()`
    // calls are.
    const titleId = useId()
    const subtitleId = useId()

    return (): VNode => {
      const subtitleNodes = slotOrProp(slots.subtitle, props.subtitle)
      const hasSubtitle = subtitleNodes.length > 0
      // React renders `aria-label` only for a given `ariaLabel`, else names the
      // switch by the title paragraph.
      const labelAttrs =
        props.ariaLabel !== undefined
          ? { 'aria-label': props.ariaLabel }
          : { 'aria-labelledby': titleId }

      return h(
        'div',
        {
          class: cm.cn(
            cm.sp('p', 4),
            cm.flex({ align: 'center', justify: 'between' }),
            cm.nodeEditorPanelToggleRow,
          ),
        },
        [
          h('div', { class: cm.cn(cm.flex({ align: 'center' }), cm.nodeEditorPanelToggleGroup) }, [
            props.icon
              ? h('div', { class: cm.cn(cm.sp('p', 2), cm.nodeEditorPanelToggleIconTile) }, [
                  h('span', { class: cm.cn(cm.textSize('sm'), cm.iconGlyphFont) }, props.icon),
                ])
              : null,
            h('div', [
              h(
                'p',
                {
                  id: titleId,
                  class: cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    cm.nodeEditorPanelToggleTitle,
                  ),
                },
                slotOrProp(slots.title, props.title),
              ),
              hasSubtitle
                ? h(
                    'p',
                    { id: subtitleId, class: cm.cn(cm.nodeEditorPanelToggleSubtitle) },
                    subtitleNodes,
                  )
                : null,
            ]),
          ]),
          h(Switch, {
            size: 'sm',
            checked: props.checked,
            ...labelAttrs,
            'aria-describedby': hasSubtitle ? subtitleId : undefined,
            'data-mol-id': 'node-editor-toggle',
            onChange: (event: Event) => props.onChange((event.target as HTMLInputElement).checked),
          }),
        ],
      )
    }
  },
})
