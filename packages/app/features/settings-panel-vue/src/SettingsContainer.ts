/**
 * Vue outer settings-panel layout: a padded vertical stack that hosts the
 * section components and publishes `onClose` through
 * {@link SettingsPanelContext}.
 *
 * Vue counterpart of `@molecule/app-settings-panel-react`'s
 * `SettingsContainer` — the same props (React names), the same DOM.
 *
 * @module
 */

import { defineComponent, h, type PropType, provide, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'

import { SettingsPanelContext } from './context.js'

/**
 * Outer settings-panel layout: padded vertical stack that hosts the
 * section sub-components. Publishes `onClose` to descendants via
 * context so `<LogOutDeleteSection>` etc. can dismiss the panel
 * after an action without explicit prop threading.
 *
 * Children go through the default slot; `onClose` is passed as the
 * `onClose` prop or bound as `@close` — both reach the same listener.
 *
 * @param props - Component props.
 * @returns The container component.
 */
export const SettingsContainer = defineComponent({
  name: 'SettingsContainer',
  props: {
    /** Dismisses the settings panel; published to sections as the panel context. */
    onClose: {
      type: Function as PropType<() => void>,
      required: true,
    },
  },
  emits: ['close'],
  setup(props, { emit, slots }) {
    const cm = getClassMap()
    // React's context value is memoized on [onClose]; the injected object is
    // created once in setup and reads the current listener at call time.
    provide(SettingsPanelContext, {
      onClose: (): void => {
        emit('close')
      },
    })

    return (): VNodeChild =>
      h('div', { class: cm.cn(cm.sp('p', 6), cm.stack(6)) }, slots.default?.())
  },
})
