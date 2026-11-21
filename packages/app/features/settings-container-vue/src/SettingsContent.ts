/**
 * Vue wrapper for the right-hand column of the settings layout.
 *
 * Vue counterpart of `@molecule/app-settings-container-react`'s
 * `SettingsContent` — the same props (React names) and the same DOM for the
 * same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode } from 'vue'

import { getClassMap } from '@molecule/app-ui'

import type { SettingsContentProps } from './types.js'

/**
 * Wrapper for the right-hand column of `<SettingsLayout>`. Just a
 * vertically-stacked container for one or more `<SettingsSection>`s — useful
 * as a semantic landmark and for consistent spacing.
 *
 * @param props - Component props (see {@link SettingsContentProps}).
 * @returns The settings content component.
 */
export const SettingsContent = defineComponent({
  name: 'SettingsContent',
  props: {
    className: String as PropType<SettingsContentProps['className']>,
  },
  setup(props, { slots }) {
    const cm = getClassMap()

    return (): VNode => h('div', { class: cm.cn(cm.stack(6), props.className) }, slots.default?.())
  },
})
