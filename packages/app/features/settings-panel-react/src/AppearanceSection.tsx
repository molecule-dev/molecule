import { useTheme, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Flex, Switch } from '@molecule/app-ui-react'

/**
 * Appearance section — dark-mode toggle wired to the theme bond.
 *
 * Apps that expose other appearance knobs (font size, density, etc.)
 * can either add more sub-components to this package or render their
 * own section in line with `<AppearanceSection>` via children.
 */
export function AppearanceSection() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { mode, toggleTheme } = useTheme()

  return (
    <section>
      <h3 className={cm.cn(cm.sectionHeading, cm.sp('mb', 3))}>
        {t('settings.appearance', undefined, { defaultValue: 'Appearance' })}
      </h3>
      <Flex align="center" justify="between">
        <span className={cm.textSize('sm')}>
          {t('settings.darkMode', undefined, { defaultValue: 'Dark mode' })}
        </span>
        <Switch
          id="settings-theme-toggle"
          aria-label={t('theme.toggle', undefined, { defaultValue: 'Toggle theme' })}
          checked={mode === 'dark'}
          onChange={() => toggleTheme()}
          size="sm"
        />
      </Flex>
    </section>
  )
}
