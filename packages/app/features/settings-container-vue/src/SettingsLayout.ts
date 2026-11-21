/**
 * Vue two-column settings-page scaffold: optional header, sidebar on the left,
 * content on the right.
 *
 * Vue counterpart of `@molecule/app-settings-container-react`'s
 * `SettingsLayout` — the same props (React names), the same ClassMap tokens,
 * and the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode } from 'vue'

import { getClassMap } from '@molecule/app-ui'

import { nodeValue } from './nodes.js'
import type { SettingsLayoutProps } from './types.js'

/**
 * Two-column Settings page scaffold: sidebar on the left, content on the
 * right, optional (non-sticky) header above both.
 *
 * @param props - Component props (see {@link SettingsLayoutProps}).
 * @returns The settings layout component.
 */
export const SettingsLayout = defineComponent({
  name: 'SettingsLayout',
  props: {
    // Node-valued props: declared with `null` (any runtime type, no
    // validation — a VNode, a string, or `null` to omit).
    sidebar: null,
    header: null,
    className: String as PropType<SettingsLayoutProps['className']>,
    dataMolId: String as PropType<SettingsLayoutProps['dataMolId']>,
  },
  setup(props, { slots }) {
    const cm = getClassMap()

    return (): VNode =>
      h(
        'div',
        {
          'data-mol-id': props.dataMolId,
          class: cm.cn(cm.stack(4), props.className),
        },
        [
          ...nodeValue(props.header, slots.header),
          h('div', { class: cm.flex({ align: 'start', gap: 'lg' }) }, [
            h('aside', { class: cm.shrink0 }, nodeValue(props.sidebar, slots.sidebar)),
            h('main', { class: cm.flex1 }, [
              h('div', { class: cm.stack(6) }, nodeValue(undefined, slots.default)),
            ]),
          ]),
        ],
      )
  },
})
