import { useState } from 'react'

import { usePush, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Flex, Switch } from '@molecule/app-ui-react'

/**
 * Push-notification toggle section. Requests browser permission +
 * registers/unregisters the push subscription via `@molecule/app-push`.
 */
export function NotificationsSection() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { permission, requestPermission, register, unregister } = usePush()
  const [enabled, setEnabled] = useState(permission === 'granted')

  const handleToggle = async (next: boolean) => {
    try {
      if (next) {
        await requestPermission()
        await register()
        setEnabled(true)
      } else {
        await unregister()
        setEnabled(false)
      }
    } catch {
      // Permission may be denied
    }
  }

  return (
    <section>
      <h3 className={cm.cn(cm.sectionHeading, cm.sp('mb', 3))}>{t('settings.notifications')}</h3>
      <Flex align="center" justify="between">
        <span className={cm.textSize('sm')}>{t('settings.pushNotifications')}</span>
        <Switch
          checked={enabled}
          onChange={(e) => handleToggle((e.target as HTMLInputElement).checked)}
          size="sm"
        />
      </Flex>
    </section>
  )
}
