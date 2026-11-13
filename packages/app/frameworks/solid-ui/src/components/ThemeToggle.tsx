import { type Component, type JSX, Show, splitProps } from 'solid-js'

import type { IconName } from '@molecule/app-icons'
import { getThemeProvider, useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import { toStyleProps } from '../utilities/dom.js'
import { createThemeState } from '../utilities/services.js'
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
  const provider = getThemeProvider()
  const theme = createThemeState()

  const ariaLabelKey = (): string => local.ariaLabelKey ?? 'theme.toggle'
  const ariaLabelDefault = (): string => local.ariaLabelDefault ?? 'Toggle theme'
  const darkIcon = (): IconName => local.darkIcon ?? 'moon'
  const lightIcon = (): IconName => local.lightIcon ?? 'sun'
  const iconSize = (): number => local.iconSize ?? 20

  // The button is icon-only chrome: its accessible name is the aria-label,
  // so the mode icon itself stays decorative.
  const mode = (): 'light' | 'dark' => theme().mode

  const toggleTheme = (): void => {
    // Prefer the provider's purpose-built light/dark toggle. `toggleMode`
    // is a required `ThemeProvider` method and the semantically correct
    // action for a light/dark toggle — unlike `getThemes()`, which is
    // optional, so the index-cycle below silently no-ops for providers
    // that don't implement it. The index-cycle is kept only as a fallback
    // for non-conforming providers that predate `toggleMode`.
    if (typeof provider.toggleMode === 'function') {
      provider.toggleMode()
      return
    }
    const themes = provider.getThemes?.() ?? []
    if (themes.length === 0) return
    const currentName =
      typeof (provider as unknown as Record<string, () => string>).getThemeName === 'function'
        ? (provider as unknown as Record<string, () => string>).getThemeName()
        : provider.getTheme().name
    const currentIndex = themes.findIndex((theme) =>
      typeof theme === 'string' ? theme === currentName : theme.name === currentName,
    )
    const next = themes[(currentIndex + 1) % themes.length]
    provider.setTheme(typeof next === 'string' ? next : next.name)
  }

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
