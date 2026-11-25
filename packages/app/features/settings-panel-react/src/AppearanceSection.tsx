import type { JSX } from 'react'

import { useTheme, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Flex, Switch } from '@molecule/app-ui-react'
import { Box, Text } from '@molecule/app-ui-react/elements'

/**
 * Appearance section — dark-mode toggle wired to the theme bond.
 *
 * Apps that expose other appearance knobs (font size, density, etc.)
 * can either add more sub-components to this package or render their
 * own section in line with `<AppearanceSection>` via children.
 */
export function AppearanceSection(): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { mode, toggleTheme } = useTheme()

  return (
    <Box as="section">
      <Text as="h3" className={cm.cn(cm.sectionHeading, cm.sp('mb', 3))}>
        {t('settings.appearance', undefined, { defaultValue: 'Appearance' })}
      </Text>
      <Flex align="center" justify="between">
        <Text as="span" className={cm.textSize('sm')}>
          {t('settings.darkMode', undefined, { defaultValue: 'Dark mode' })}
        </Text>
        <Switch
          id="settings-theme-toggle"
          aria-label={t('theme.toggle', undefined, { defaultValue: 'Toggle theme' })}
          checked={mode === 'dark'}
          onChange={() => toggleTheme()}
          size="sm"
        />
      </Flex>
    </Box>
  )
}
