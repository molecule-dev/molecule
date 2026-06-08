import { type JSX, type ReactNode, useCallback, useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Flex, Icon, Spinner } from '@molecule/app-ui-react'

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
 * Each row renders a chevron-right icon by default (matching the
 * canonical fleet pattern). Apps that want a different icon can pass
 * a `renderRowIcon` callback; pass `() => null` to suppress entirely.
 */
export function DevicesSection({
  renderRowIcon,
}: {
  renderRowIcon?: (device: Device) => ReactNode
} = {}): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (): Promise<void> => {
    try {
      const response = await http.get<{ data: Device[] }>('/api/devices')
      setDevices(response.data.data || [])
    } catch (_error) {
      // Devices endpoint is optional; the section renders empty when unavailable.
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
                {renderRowIcon ? (
                  renderRowIcon(device)
                ) : (
                  <Icon name="chevron-right" size={16} className={cm.textSubtle} />
                )}
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
