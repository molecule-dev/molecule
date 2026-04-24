import { useTheme, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { Icon } from './Icon.js'

/**
 * Button that flips the wired theme bond between light and dark.
 *
 * Reads `mode` and `toggleTheme` from `useTheme()` and shows a
 * sun / moon icon accordingly. Aria-label is provided by the
 * `theme.toggle` i18n key (default `"Toggle theme"`).
 */
export function ThemeToggle() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { mode, toggleTheme } = useTheme()

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={t('theme.toggle', {}, { defaultValue: 'Toggle theme' })}
      className={cm.themeToggleButton}
    >
      {mode === 'dark' ? <Icon name="moon" size={20} /> : <Icon name="sun" size={20} />}
    </button>
  )
}
