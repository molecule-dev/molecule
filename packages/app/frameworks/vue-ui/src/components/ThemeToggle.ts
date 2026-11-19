/**
 * Vue ThemeToggle UI component with UIClassMap-driven styling.
 *
 * @module
 */

import { defineComponent, h, type PropType } from 'vue'

import type { IconName } from '@molecule/app-icons'
import { getClassMap, type HTMLElementProps } from '@molecule/app-ui'
import { useTheme, useTranslation } from '@molecule/app-vue'

import { classOf, restAttrs, styleOf } from '../utilities/attrs.js'
import { Icon } from './Icon.js'

/**
 * Props for {@link ThemeToggle}.
 *
 * Vue port of `@molecule/app-ui-react`'s `ThemeToggleProps`: React extends
 * the `<button>` attributes here, so this extends the kit's element props and
 * any other button attribute (`data-*`, `aria-*`, listeners) falls through to
 * the button. `aria-label`, `aria-pressed` and `onClick` are the component's
 * own, exactly as React omits them.
 */
export interface ThemeToggleProps extends Omit<
  HTMLElementProps,
  'aria-label' | 'aria-pressed' | 'onClick'
> {
  /** i18n key for the `aria-label`. Defaults to `'theme.toggle'`. */
  ariaLabelKey?: string
  /** Fallback `aria-label` if the i18n key is missing. Defaults to `'Toggle theme'`. */
  ariaLabelDefault?: string
  /** Icon name to render in dark mode. Defaults to `'moon'`. */
  darkIcon?: IconName
  /** Icon name to render in light mode. Defaults to `'sun'`. */
  lightIcon?: IconName
  /** Pixel size for the rendered icon. Defaults to `20`. */
  iconSize?: number
}

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
      type: String as PropType<ThemeToggleProps['ariaLabelKey']>,
      default: 'theme.toggle',
    },
    ariaLabelDefault: {
      type: String as PropType<ThemeToggleProps['ariaLabelDefault']>,
      default: 'Toggle theme',
    },
    darkIcon: {
      type: String as PropType<ThemeToggleProps['darkIcon']>,
      default: 'moon',
    },
    lightIcon: {
      type: String as PropType<ThemeToggleProps['lightIcon']>,
      default: 'sun',
    },
    iconSize: {
      type: Number as PropType<ThemeToggleProps['iconSize']>,
      default: 20,
    },
    className: String as PropType<ThemeToggleProps['className']>,
    style: [String, Object] as PropType<ThemeToggleProps['style']>,
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
