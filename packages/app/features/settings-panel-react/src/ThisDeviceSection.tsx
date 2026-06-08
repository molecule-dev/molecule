import type { JSX } from 'react'

import { useDevice, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Flex } from '@molecule/app-ui-react'

/**
 * "This device" detail strip — OS, browser, online/offline.
 *
 * Reads from `@molecule/app-device` (useDevice hook) + browser
 * `navigator.onLine`. No side effects, no app-specific state.
 */
export function ThisDeviceSection(): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { deviceInfo } = useDevice()
  return (
    <section>
      <h3 className={cm.cn(cm.sectionHeading, cm.sp('mb', 3))}>{t('settings.thisDevice')}</h3>
      <dl className={cm.cn(cm.stack(1), cm.textSize('sm'))}>
        <Flex justify="between">
          <dt className={cm.textMuted}>{t('settings.platform')}</dt>
          <dd>{deviceInfo.os.name || t('settings.unknown')}</dd>
        </Flex>
        <Flex justify="between">
          <dt className={cm.textMuted}>{t('settings.browser')}</dt>
          <dd>{deviceInfo.browser.name || t('settings.unknown')}</dd>
        </Flex>
        <Flex justify="between">
          <dt className={cm.textMuted}>{t('settings.network')}</dt>
          <dd>{navigator.onLine ? t('settings.online') : t('settings.offline')}</dd>
        </Flex>
      </dl>
    </section>
  )
}
