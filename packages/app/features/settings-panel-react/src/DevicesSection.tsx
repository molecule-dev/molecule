import { type JSX, type ReactNode, useCallback, useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button, Flex, Icon, Spinner } from '@molecule/app-ui-react'

/** A user's registered device (subset rendered in the settings list). */
export interface Device {
  id: string
  name: string
  platform: string
  lastSeen?: string
  /** `true` for the device making the current request (the API marks it). */
  isCurrent?: boolean
}

/**
 * Devices section — lists the user's registered devices and lets them
 * revoke (sign out) any device other than the one they're currently using.
 *
 * Revoking deletes the device row (`DELETE /api/devices/:id`). The API's
 * authorization layer enforces server-side revocation: it rejects that
 * device's session the next time it makes a request (within the
 * device-exists cache TTL), so the removed device is actually signed out —
 * not just hidden from the list. The current device is labelled
 * "This device" and is not revocable here (use Sign out for the current
 * session). Recreates molecule v1's device-revocation behaviour.
 *
 * Apps that want a different trailing element per row can pass a
 * `renderRowIcon` callback (which then replaces the built-in revoke
 * control); pass `() => null` to suppress it entirely.
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
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  const load = useCallback(async (): Promise<void> => {
    try {
      // GET /api/devices responds with the ARRAY itself (see the device
      // resource's query handler) — response.data IS the rows. This used to
      // read `response.data.data`, which is always undefined for that shape,
      // so the section rendered "No devices" for everyone.
      const response = await http.get<Device[]>('/api/devices')
      setDevices(Array.isArray(response.data) ? response.data : [])
    } catch (_error) {
      // Devices endpoint is optional; the section renders empty when unavailable.
    } finally {
      setLoading(false)
    }
  }, [http])

  useEffect(() => {
    load()
  }, [load])

  const revoke = async (id: string): Promise<void> => {
    setRevokingId(id)
    try {
      await http.delete(`/api/devices/${id}`)
      setConfirmingId(null)
      await load()
    } catch (_error) {
      // Best-effort — keep the row so the user can retry the revoke.
    } finally {
      setRevokingId(null)
    }
  }

  const trailing = (device: Device): ReactNode => {
    if (renderRowIcon) return renderRowIcon(device)
    if (device.isCurrent) return <Icon name="chevron-right" size={16} className={cm.textSubtle} />
    if (confirmingId === device.id) {
      return (
        <Flex align="center" gap="sm">
          <Button
            variant="ghost"
            size="sm"
            disabled={revokingId === device.id}
            onClick={() => setConfirmingId(null)}
          >
            {t('common.cancel', undefined, { defaultValue: 'Cancel' })}
          </Button>
          <Button
            color="error"
            size="sm"
            loading={revokingId === device.id}
            onClick={() => revoke(device.id)}
            data-mol-id="device-revoke-confirm"
          >
            {t('settings.signOutDevice', undefined, { defaultValue: 'Sign out' })}
          </Button>
        </Flex>
      )
    }
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setConfirmingId(device.id)}
        data-mol-id="device-revoke"
      >
        {t('settings.signOutDevice', undefined, { defaultValue: 'Sign out' })}
      </Button>
    )
  }

  return (
    <section>
      <Flex align="center" gap="sm" className={cm.sp('mb', 3)}>
        <h3 className={cm.sectionHeading}>
          {t('settings.devices', undefined, { defaultValue: 'Devices' })}
        </h3>
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
                <span>
                  {device.name || device.platform}
                  {device.isCurrent ? (
                    <span className={cm.cn(cm.textSize('xs'), cm.textSubtle, cm.sp('ml', 2))}>
                      {t('settings.thisDevice', undefined, { defaultValue: 'This device' })}
                    </span>
                  ) : null}
                </span>
                {trailing(device)}
              </Flex>
              {confirmingId === device.id ? (
                <p className={cm.cn(cm.textSize('xs'), cm.textMuted, cm.sp('mt', 1))}>
                  {t('settings.revokeDeviceWarning', undefined, {
                    defaultValue: "This device's access will be revoked shortly. Sign it out?",
                  })}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        !loading && (
          <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
            {t('settings.noDevices', undefined, { defaultValue: 'No devices' })}
          </p>
        )
      )}
    </section>
  )
}
