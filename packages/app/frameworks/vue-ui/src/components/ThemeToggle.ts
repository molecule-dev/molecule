/**
 * Vue ThemeToggle UI component with UIClassMap-driven styling.
 *
 * @module
 */

import { defineComponent, h, type PropType } from 'vue'

import type { IconName } from '@molecule/app-icons'
import { getClassMap } from '@molecule/app-ui'

import { useTheme } from '../hooks/useTheme.js'
import { useTranslation } from '../hooks/useTranslation.js'
import { classOf, restAttrs, styleOf } from '../utilities/attrs.js'
import { Icon } from './Icon.js'

/**
 * Vue ThemeToggle UI component with UIClassMap-driven styling.
 *
 * Faithful port of `@molecule/app-ui-react`'s ThemeToggle: a button that
 * flips the wired theme bond between light and dark, reading `mode` and
 * `toggleTheme` from the theme provider and showing the configured dark/light
 * icon accordingly. Ships with molecule conventions out of the box:
 * `data-mol-id="theme-toggle"`, `data-mode`, `aria-pressed`, and an
 * `aria-label` from the `theme.toggle` i18n key. Every extra attribute a
 * caller passes travels through the rest spread onto the button.
 */
export const ThemeToggle = defineComponent({
  name: 'MThemeToggle',
  inheritAttrs: false,
  props: {
    ariaLabelKey: {
      type: String,
      default: 'theme.toggle',
    },
    ariaLabelDefault: {
      type: String,
      default: 'Toggle theme',
    },
    darkIcon: {
      type: String as PropType<IconName>,
      default: 'moon',
    },
    lightIcon: {
      type: String as PropType<IconName>,
      default: 'sun',
    },
    iconSize: {
      type: Number,
      default: 20,
    },
    className: String,
    style: [String, Object] as PropType<Record<string, string | number> | string>,
  },
  setup(props, { attrs }) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const { mode, toggleTheme } = useTheme()

    return () =>
      h(
        'button',
        {
          type: 'button',
          'data-mol-id': 'theme-toggle',
          'data-mode': mode.value,
          'aria-pressed': mode.value === 'dark',
          'aria-label': t(props.ariaLabelKey, {}, { defaultValue: props.ariaLabelDefault }),
          onClick: toggleTheme,
          class: cm.cn(cm.themeToggleButton, ...classOf(props.className, attrs)),
          style: styleOf(props.style, attrs),
          ...restAttrs(attrs),
        },
        h(Icon, {
          name: mode.value === 'dark' ? props.darkIcon : props.lightIcon,
          size: props.iconSize,
        }),
      )
  },
})
