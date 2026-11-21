/**
 * Vue Card-wrapped settings section: heading, optional description, body and
 * optional footer action row.
 *
 * Vue counterpart of `@molecule/app-settings-container-react`'s
 * `SettingsSection` — the same props (React names), the same ClassMap tokens,
 * and the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Card } from '@molecule/app-ui-vue'

import { hasNode, nodeValue } from './nodes.js'
import type { SettingsSectionProps } from './types.js'

/**
 * One configuration section inside a Settings page — Card-wrapped, with
 * title / description header, body slot, and optional footer action row.
 *
 * @param props - Component props (see {@link SettingsSectionProps}).
 * @returns The settings section component.
 */
export const SettingsSection = defineComponent({
  name: 'SettingsSection',
  props: {
    // Node-valued props: declared with `null` (any runtime type, no
    // validation — a VNode, a string, or `null` to omit).
    title: null,
    description: null,
    footer: null,
    className: String as PropType<SettingsSectionProps['className']>,
    dataMolId: String as PropType<SettingsSectionProps['dataMolId']>,
  },
  setup(props, { slots }) {
    const cm = getClassMap()

    return (): VNode =>
      h(
        Card,
        {
          className: props.className,
          'data-mol-id': props.dataMolId,
        },
        {
          default: () => [
            h('div', { class: cm.stack(4) }, [
              h('header', { class: cm.stack(1 as const) }, [
                h(
                  'h2',
                  { class: cm.cn(cm.textSize('lg'), cm.fontWeight('semibold')) },
                  nodeValue(props.title, slots.title),
                ),
                hasNode(props.description, slots.description)
                  ? h(
                      'p',
                      { class: cm.textSize('sm') },
                      nodeValue(props.description, slots.description),
                    )
                  : null,
              ]),
              h('div', null, nodeValue(undefined, slots.default)),
              hasNode(props.footer, slots.footer)
                ? h(
                    'footer',
                    { class: cm.flex({ justify: 'end', align: 'center', gap: 'sm' }) },
                    nodeValue(props.footer, slots.footer),
                  )
                : null,
            ]),
          ],
        },
      )
  },
})
