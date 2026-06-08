import type { JSX } from 'react'
import { useState } from 'react'

import { usePush, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Flex, Switch } from '@molecule/app-ui-react'

/**
 * Push-notification toggle section. Requests browser permission +
 * registers/unregisters the push subscription via `@molecule/app-push`.
 */
export function NotificationsSection(): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { permission, requestPermission, register, unregister } = usePush()
  const [enabled, setEnabled] = useState(permission === 'granted')

  const handleToggle = async (next: boolean): Promise<void> => {
    try {
      if (next) {
        await requestPermission()
        await register()
        setEnabled(true)
      } else {
        await unregister()
        setEnabled(false)
      }
    } catch (_error) {
      // Safe to ignore: browser permission denied or service worker unavailable;
      // the switch simply stays in its previous visual state — no data loss, no broken state.
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
