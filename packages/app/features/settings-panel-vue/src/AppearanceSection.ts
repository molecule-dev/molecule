/**
 * Vue appearance section: the dark-mode switch wired to the theme bond.
 *
 * Vue counterpart of `@molecule/app-settings-panel-react`'s
 * `AppearanceSection` — the same DOM, callbacks and service calls.
 *
 * @module
 */

import { defineComponent, h, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Flex, Switch } from '@molecule/app-ui-vue'
import { useTheme, useTranslation } from '@molecule/app-vue'

/**
 * Appearance section — dark-mode toggle wired to the theme bond.
 *
 * Apps that expose other appearance knobs (font size, density, etc.)
 * can either add more sub-components to this package or render their
 * own section in line with `<AppearanceSection>` via slots.
 *
 * @returns The appearance section component.
 */
export const AppearanceSection = defineComponent({
  name: 'AppearanceSection',
  setup() {
    const cm = getClassMap()
    const { t } = useTranslation()
    const { mode, toggleTheme } = useTheme()

    return (): VNodeChild =>
      h('section', [
        h('h3', { class: cm.cn(cm.sectionHeading, cm.sp('mb', 3)) }, [
          t('settings.appearance', undefined, { defaultValue: 'Appearance' }),
        ]),
        h(Flex, { align: 'center', justify: 'between' }, () => [
          h('span', { class: cm.textSize('sm') }, [
            t('settings.darkMode', undefined, { defaultValue: 'Dark mode' }),
          ]),
          h(Switch, {
            id: 'settings-theme-toggle',
            'aria-label': t('theme.toggle', undefined, { defaultValue: 'Toggle theme' }),
            checked: mode.value === 'dark',
            onChange: () => toggleTheme(),
            size: 'sm',
          }),
        ]),
      ])
  },
})
