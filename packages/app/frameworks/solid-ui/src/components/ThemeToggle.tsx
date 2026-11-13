import { type Component, type JSX, Show, splitProps } from 'solid-js'

import type { IconName } from '@molecule/app-icons'
import { useTheme, useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import { toStyleProps } from '../utilities/dom.js'
import { Icon } from './Icon.jsx'

/**
 * Props for {@link ThemeToggle}.
 *
 * Extends standard `<button>` attributes so callers can pass any extra
 * `data-*`, `aria-*`, event handler, or `style` prop without forking the
 * component. The handful of explicitly named props below let apps swap
 * the icon glyphs, label, or size without spreading attribute concerns.
 */
export interface ThemeToggleProps extends Omit<
  JSX.ButtonHTMLAttributes<HTMLButtonElement>,
  'aria-label' | 'aria-pressed' | 'onClick' | 'type'
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
  /** Extra classes composed onto the button. */
  className?: string
}

/**
 * Button that flips the wired theme bond between light and dark.
 *
 * Reads the active theme from the theme provider context and shows the
 * configured dark/light icon accordingly. Ships with molecule
 * conventions out of the box:
 *
 * - `data-mol-id="theme-toggle"` for AI-agent / e2e selection
 * - `data-mode={mode}` so tests can assert current state via DOM
 * - `aria-pressed={mode === 'dark'}` for screen-reader state
 * - `aria-label` from the `theme.toggle` i18n key (default `"Toggle theme"`)
 *
 * Every per-app variant the fleet was carrying — extra `data-*` attrs,
 * additional `aria-*` flags, custom event handlers — is now absorbed
 * via the spread of unknown props. Apps that need different icons or
 * label text use the named props.
 *
 * @param props - {@link ThemeToggleProps}
 */
export const ThemeToggle: Component<ThemeToggleProps> = (props) => {
  const [local, rest] = splitProps(props, [
    'ariaLabelKey',
    'ariaLabelDefault',
    'darkIcon',
    'lightIcon',
    'iconSize',
    'className',
    'style',
  ])

  const cm = getClassMap()
  const { t } = useTranslation()
  // `useTheme()` subscribes to the provider and owns the toggle: it calls the
  // provider's `toggleMode()` (a required `ThemeProvider` method), so the
  // light/dark flip is the binding's own behavior, identical to the React
  // reference's `useTheme()`.
  const { mode, toggleTheme } = useTheme()

  const ariaLabelKey = (): string => local.ariaLabelKey ?? 'theme.toggle'
  const ariaLabelDefault = (): string => local.ariaLabelDefault ?? 'Toggle theme'
  const darkIcon = (): IconName => local.darkIcon ?? 'moon'
  const lightIcon = (): IconName => local.lightIcon ?? 'sun'
  const iconSize = (): number => local.iconSize ?? 20

  return (
    <button
      type="button"
      data-mol-id="theme-toggle"
      data-mode={mode()}
      aria-pressed={mode() === 'dark'}
      aria-label={t(ariaLabelKey(), {}, { defaultValue: ariaLabelDefault() })}
      onClick={toggleTheme}
      class={cm.cn(cm.themeToggleButton, local.className)}
      style={toStyleProps(local.style)}
      {...(rest as JSX.ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      <Show when={mode() === 'dark'} fallback={<Icon name={lightIcon()} size={iconSize()} />}>
        <Icon name={darkIcon()} size={iconSize()} />
      </Show>
    </button>
  )
}
