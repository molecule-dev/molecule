import type { JSX } from 'react'

import { useDevice, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Flex } from '@molecule/app-ui-react'

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
    <section>
      <h3 className={cm.cn(cm.sectionHeading, cm.sp('mb', 3))}>
        {t('settings.thisDevice', undefined, { defaultValue: 'This Device' })}
      </h3>
      <dl className={cm.cn(cm.stack(1), cm.textSize('sm'))}>
        <Flex justify="between">
          <dt className={cm.textMuted}>
            {t('settings.platform', undefined, { defaultValue: 'Platform' })}
          </dt>
          <dd>
            {deviceInfo.os.name || t('settings.unknown', undefined, { defaultValue: 'Unknown' })}
          </dd>
        </Flex>
        <Flex justify="between">
          <dt className={cm.textMuted}>
            {t('settings.browser', undefined, { defaultValue: 'Browser' })}
          </dt>
          <dd>
            {deviceInfo.browser.name ||
              t('settings.unknown', undefined, { defaultValue: 'Unknown' })}
          </dd>
        </Flex>
        <Flex justify="between">
          <dt className={cm.textMuted}>
            {t('settings.network', undefined, { defaultValue: 'Network' })}
          </dt>
          <dd>
            {isOnline()
              ? t('settings.online', undefined, { defaultValue: 'Online' })
              : t('settings.offline', undefined, { defaultValue: 'Offline' })}
          </dd>
        </Flex>
      </dl>
    </section>
  )
}
