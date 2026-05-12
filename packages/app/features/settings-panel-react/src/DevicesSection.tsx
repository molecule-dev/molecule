import { type ReactNode, useCallback, useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Flex, Spinner } from '@molecule/app-ui-react'

/** A user's registered device (subset rendered in the settings list). */
export interface Device {
  id: string
  name: string
  platform: string
  lastSeen?: string
}

/**
 * Devices section — lists the user's registered devices.
 *
 * Apps that want to show an icon next to each row can pass `renderRowIcon`
 * (kept optional so the default — no icon — matches the canonical fleet
 * apps with the smallest possible compound API surface).
 */
export function DevicesSection({
  renderRowIcon,
}: {
  renderRowIcon?: (device: Device) => ReactNode
} = {}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const response = await http.get<{ data: Device[] }>('/devices')
      setDevices(response.data.data || [])
    } catch {
      // Devices may not be available
    } finally {
      setLoading(false)
    }
  }, [http])

  useEffect(() => {
    load()
  }, [load])

  return (
    <section>
      <Flex align="center" gap="sm" className={cm.sp('mb', 3)}>
        <h3 className={cm.sectionHeading}>{t('settings.devices')}</h3>
        {loading && <Spinner size="xs" />}
      </Flex>
      {devices.length > 0 ? (
        <ul className={cm.stack(2)}>
          {devices.map((device) => (
            <li key={device.id}>
              <Flex
                align="center"
                justify="between"
                className={cm.cn(cm.textSize('sm'), cm.sp('py', 1))}
              >
                <span>{device.name || device.platform}</span>
                {renderRowIcon?.(device)}
              </Flex>
            </li>
          ))}
        </ul>
      ) : (
        !loading && (
          <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>{t('settings.noDevices')}</p>
        )
      )}
    </section>
  )
}
