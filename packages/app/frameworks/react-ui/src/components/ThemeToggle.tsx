import type { ButtonHTMLAttributes, JSX } from 'react'

import { useTheme, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { Icon } from './Icon.js'

/**
 * Props for {@link ThemeToggle}.
 *
 * Extends standard `<button>` attributes so callers can pass any extra
 * `data-*`, `aria-*`, event handler, or `style` prop without forking the
 * component. The handful of explicitly named props below let apps swap
 * the icon glyphs, label, or size without spreading attribute concerns.
 */
export interface ThemeToggleProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'aria-label' | 'aria-pressed' | 'onClick' | 'type'
> {
  /** i18n key for the `aria-label`. Defaults to `'theme.toggle'`. */
  ariaLabelKey?: string
  /** Fallback `aria-label` if the i18n key is missing. Defaults to `'Toggle theme'`. */
  ariaLabelDefault?: string
  /** Icon name to render in dark mode. Defaults to `'moon'`. */
  darkIcon?: string
  /** Icon name to render in light mode. Defaults to `'sun'`. */
  lightIcon?: string
  /** Pixel size for the rendered icon. Defaults to `20`. */
  iconSize?: number
}

/**
 * Button that flips the wired theme bond between light and dark.
 *
 * Reads `mode` and `toggleTheme` from `useTheme()` and shows the
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
export function ThemeToggle({
  ariaLabelKey = 'theme.toggle',
  ariaLabelDefault = 'Toggle theme',
  darkIcon = 'moon',
  lightIcon = 'sun',
  iconSize = 20,
  className,
  ...rest
}: ThemeToggleProps = {}): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { mode, toggleTheme } = useTheme()

  return (
    <button
      type="button"
      data-mol-id="theme-toggle"
      data-mode={mode}
      aria-pressed={mode === 'dark'}
      aria-label={t(ariaLabelKey, {}, { defaultValue: ariaLabelDefault })}
      onClick={toggleTheme}
      className={cm.cn(cm.themeToggleButton, className)}
      {...rest}
    >
      {mode === 'dark' ? (
        <Icon name={darkIcon} size={iconSize} />
      ) : (
        <Icon name={lightIcon} size={iconSize} />
      )}
    </button>
  )
}
