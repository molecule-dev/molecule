import type { JSX } from 'react'

import { useDevice, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Flex } from '@molecule/app-ui-react'
import { Box, Text } from '@molecule/app-ui-react/elements'

/**
 * "This device" detail strip — OS, browser, online/offline.
 *
 * Reads everything from `@molecule/app-device` through the `useDevice` hook
 * (`deviceInfo` and `isOnline()`), so the bonded device provider decides what
 * it shows. No side effects, no app-specific state.
 */
export function ThisDeviceSection(): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { deviceInfo, isOnline } = useDevice()
  return (
    <Box as="section">
      <Text as="h3" className={cm.cn(cm.sectionHeading, cm.sp('mb', 3))}>
        {t('settings.thisDevice', undefined, { defaultValue: 'This Device' })}
      </Text>
      <Box as="dl" className={cm.cn(cm.stack(1), cm.textSize('sm'))}>
        <Flex justify="between">
          <Text as="dt" className={cm.textMuted}>
            {t('settings.platform', undefined, { defaultValue: 'Platform' })}
          </Text>
          <Text as="dd">
            {deviceInfo.os.name || t('settings.unknown', undefined, { defaultValue: 'Unknown' })}
          </Text>
        </Flex>
        <Flex justify="between">
          <Text as="dt" className={cm.textMuted}>
            {t('settings.browser', undefined, { defaultValue: 'Browser' })}
          </Text>
          <Text as="dd">
            {deviceInfo.browser.name ||
              t('settings.unknown', undefined, { defaultValue: 'Unknown' })}
          </Text>
        </Flex>
        <Flex justify="between">
          <Text as="dt" className={cm.textMuted}>
            {t('settings.network', undefined, { defaultValue: 'Network' })}
          </Text>
          <Text as="dd">
            {isOnline()
              ? t('settings.online', undefined, { defaultValue: 'Online' })
              : t('settings.offline', undefined, { defaultValue: 'Offline' })}
          </Text>
        </Flex>
      </Box>
    </Box>
  )
}
