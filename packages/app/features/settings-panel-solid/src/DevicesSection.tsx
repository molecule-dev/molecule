/**
 * The devices section.
 *
 * @module
 */

import { createSignal, For, type JSX, onMount, Show } from 'solid-js'

import { useHttpClient, useTranslation } from '@molecule/app-solid'
import { getClassMap, molIdProps } from '@molecule/app-ui'
import { Button, Flex, Icon, Spinner } from '@molecule/app-ui-solid'

import type { Device } from './types.js'

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
 *
 * @param props - Component props.
 * @returns The devices settings section.
 */
export function DevicesSection(props: {
  /** Replaces the built-in revoke control per row; `() => null` suppresses it. */
  renderRowIcon?: (device: Device) => JSX.Element
}): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [devices, setDevices] = createSignal<Device[]>([])
  const [loading, setLoading] = createSignal(true)
  const [confirmingId, setConfirmingId] = createSignal<string | null>(null)
  const [revokingId, setRevokingId] = createSignal<string | null>(null)

  const load = async (): Promise<void> => {
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
  }

  onMount(() => {
    void load()
  })

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

  const trailing = (device: Device): JSX.Element => {
    if (props.renderRowIcon) return props.renderRowIcon(device)
    if (device.isCurrent) return <Icon name="chevron-right" size={16} className={cm.textSubtle} />
    if (confirmingId() === device.id) {
      return (
        <Flex align="center" gap="sm">
          <Button
            variant="ghost"
            size="sm"
            disabled={revokingId() === device.id}
            onClick={() => setConfirmingId(null)}
          >
            {t('common.cancel', undefined, { defaultValue: 'Cancel' })}
          </Button>
          <Button
            color="error"
            size="sm"
            loading={revokingId() === device.id}
            onClick={() => void revoke(device.id)}
            {...molIdProps('device-revoke-confirm')}
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
        {...molIdProps('device-revoke')}
      >
        {t('settings.signOutDevice', undefined, { defaultValue: 'Sign out' })}
      </Button>
    )
  }

  return (
    <section>
      <Flex align="center" gap="sm" className={cm.sp('mb', 3)}>
        <h3 class={cm.sectionHeading}>
          {t('settings.devices', undefined, { defaultValue: 'Devices' })}
        </h3>
        <Show when={loading()}>
          <Spinner size="xs" />
        </Show>
      </Flex>
      <Show
        when={devices().length > 0}
        fallback={
          <Show when={!loading()}>
            <p class={cm.cn(cm.textSize('sm'), cm.textMuted)}>
              {t('settings.noDevices', undefined, { defaultValue: 'No devices found' })}
            </p>
          </Show>
        }
      >
        <ul class={cm.stack(2)}>
          <For each={devices()}>
            {(device) => (
              <li>
                <Flex
                  align="center"
                  justify="between"
                  className={cm.cn(cm.textSize('sm'), cm.sp('py', 1))}
                >
                  <span>
                    {device.name || device.platform}
                    <Show when={device.isCurrent}>
                      <span class={cm.cn(cm.textSize('xs'), cm.textSubtle, cm.sp('ml', 2))}>
                        {t('settings.thisDevice', undefined, { defaultValue: 'This Device' })}
                      </span>
                    </Show>
                  </span>
                  {trailing(device)}
                </Flex>
                <Show when={confirmingId() === device.id}>
                  <p class={cm.cn(cm.textSize('xs'), cm.textMuted, cm.sp('mt', 1))}>
                    {t('settings.revokeDeviceWarning', undefined, {
                      defaultValue: "This device's access will be revoked shortly. Sign it out?",
                    })}
                  </p>
                </Show>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </section>
  )
}
