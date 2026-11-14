/**
 * Vue "This device" detail strip: the current device's OS, browser and
 * online/offline state.
 *
 * Vue counterpart of `@molecule/app-settings-panel-react`'s
 * `ThisDeviceSection` — the same DOM, callbacks and service calls.
 *
 * @module
 */

import { computed, defineComponent, h, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Flex } from '@molecule/app-ui-vue'
import { useDevice, useTranslation } from '@molecule/app-vue'

/**
 * "This device" detail strip — OS, browser, online/offline.
 *
 * Reads everything from `@molecule/app-device` through the `useDevice`
 * composable (`deviceInfo` and `isOnline()`), so the bonded device provider
 * decides what it shows. No side effects, no app-specific state.
 *
 * @returns The this-device section component.
 */
export const ThisDeviceSection = defineComponent({
  name: 'ThisDeviceSection',
  setup() {
    const cm = getClassMap()
    const { t, locale } = useTranslation()
    const { deviceInfo, isOnline } = useDevice()
    // React reads `isOnline()` during every render. The locale key makes this
    // re-run exactly when the rendered output can change: the binding's mount
    // reconciliation re-reads the SAME locale (the computed keeps its cached
    // answer, so no second provider call), while a locale switch re-runs it.
    const online = computed(() => {
      void locale.value
      return isOnline()
    })

    /** Renders one label/value row of the detail list. */
    const row = (label: string, value: string): VNodeChild =>
      h(Flex, { justify: 'between' }, () => [
        h('dt', { class: cm.textMuted }, [label]),
        h('dd', [value]),
      ])

    return (): VNodeChild =>
      h('section', [
        h('h3', { class: cm.cn(cm.sectionHeading, cm.sp('mb', 3)) }, [
          t('settings.thisDevice', undefined, { defaultValue: 'This Device' }),
        ]),
        h('dl', { class: cm.cn(cm.stack(1), cm.textSize('sm')) }, [
          row(
            t('settings.platform', undefined, { defaultValue: 'Platform' }),
            deviceInfo.os.name || t('settings.unknown', undefined, { defaultValue: 'Unknown' }),
          ),
          row(
            t('settings.browser', undefined, { defaultValue: 'Browser' }),
            deviceInfo.browser.name ||
              t('settings.unknown', undefined, { defaultValue: 'Unknown' }),
          ),
          row(
            t('settings.network', undefined, { defaultValue: 'Network' }),
            online.value
              ? t('settings.online', undefined, { defaultValue: 'Online' })
              : t('settings.offline', undefined, { defaultValue: 'Offline' }),
          ),
        ]),
      ])
  },
})
