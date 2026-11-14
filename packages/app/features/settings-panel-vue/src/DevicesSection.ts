/**
 * Vue devices section: the user's registered device list and its revoke flow.
 *
 * Vue counterpart of `@molecule/app-settings-panel-react`'s
 * `DevicesSection` — the same DOM, callbacks and service calls.
 *
 * @module
 */

import { defineComponent, h, onMounted, type PropType, type Ref, ref, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Button, Flex, Icon, Spinner } from '@molecule/app-ui-vue'
import { useHttpClient, useTranslation } from '@molecule/app-vue'

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
 * @returns The devices section component.
 */
export const DevicesSection = defineComponent({
  name: 'DevicesSection',
  props: {
    /**
     * Replaces each row's built-in trailing control with the node it returns
     * for that device (`() => null` suppresses the control entirely).
     */
    renderRowIcon: {
      type: Function as PropType<(device: Device) => VNodeChild>,
      required: false,
      default: undefined,
    },
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const http = useHttpClient()
    const devices: Ref<Device[]> = ref([])
    const loading: Ref<boolean> = ref(true)
    const confirmingId: Ref<string | null> = ref(null)
    const revokingId: Ref<string | null> = ref(null)

    /** Loads the device list; the section renders empty when unavailable. */
    const load = async (): Promise<void> => {
      try {
        // GET /api/devices responds with the ARRAY itself (see the device
        // resource's query handler) — response.data IS the rows. This used to
        // read `response.data.data`, which is always undefined for that shape,
        // so the section rendered "No devices" for everyone.
        const response = await http.get<Device[]>('/api/devices')
        devices.value = Array.isArray(response.data) ? response.data : []
      } catch (_error) {
        // Devices endpoint is optional; the section renders empty when unavailable.
      } finally {
        loading.value = false
      }
    }

    onMounted(() => {
      void load()
    })

    /**
     * Revokes (signs out) a device and reloads the list; a failure keeps the
     * row so the user can retry.
     *
     * @param id - The device row's id.
     */
    const revoke = async (id: string): Promise<void> => {
      revokingId.value = id
      try {
        await http.delete(`/api/devices/${id}`)
        confirmingId.value = null
        await load()
      } catch (_error) {
        // Best-effort — keep the row so the user can retry the revoke.
      } finally {
        revokingId.value = null
      }
    }

    /**
     * Builds a row's trailing element: the caller's renderer, the
     * current-device chevron, the confirm/cancel pair, or the revoke trigger.
     *
     * @param device - The row's device.
     * @returns The trailing node, or null when suppressed.
     */
    const trailing = (device: Device): VNodeChild => {
      if (props.renderRowIcon) return props.renderRowIcon(device)
      if (device.isCurrent) {
        return h(Icon, { name: 'chevron-right', size: 16, className: cm.textSubtle })
      }
      if (confirmingId.value === device.id) {
        return h(Flex, { align: 'center', gap: 'sm' }, () => [
          h(
            Button,
            {
              variant: 'ghost',
              size: 'sm',
              disabled: revokingId.value === device.id,
              onClick: () => (confirmingId.value = null),
            },
            () => [t('common.cancel', undefined, { defaultValue: 'Cancel' })],
          ),
          h(
            Button,
            {
              color: 'error',
              size: 'sm',
              loading: revokingId.value === device.id,
              onClick: () => void revoke(device.id),
              'data-mol-id': 'device-revoke-confirm',
            },
            () => [t('settings.signOutDevice', undefined, { defaultValue: 'Sign out' })],
          ),
        ])
      }
      return h(
        Button,
        {
          variant: 'ghost',
          size: 'sm',
          onClick: () => (confirmingId.value = device.id),
          'data-mol-id': 'device-revoke',
        },
        () => [t('settings.signOutDevice', undefined, { defaultValue: 'Sign out' })],
      )
    }

    return (): VNodeChild =>
      h('section', [
        h(Flex, { align: 'center', gap: 'sm', className: cm.sp('mb', 3) }, () => [
          h('h3', { class: cm.sectionHeading }, [
            t('settings.devices', undefined, { defaultValue: 'Devices' }),
          ]),
          loading.value ? h(Spinner, { size: 'xs' }) : null,
        ]),
        devices.value.length > 0
          ? h(
              'ul',
              { class: cm.stack(2) },
              devices.value.map((device) =>
                h('li', { key: device.id }, [
                  h(
                    Flex,
                    {
                      align: 'center',
                      justify: 'between',
                      className: cm.cn(cm.textSize('sm'), cm.sp('py', 1)),
                    },
                    () => [
                      h('span', [
                        device.name || device.platform,
                        device.isCurrent
                          ? h(
                              'span',
                              { class: cm.cn(cm.textSize('xs'), cm.textSubtle, cm.sp('ml', 2)) },
                              [
                                t('settings.thisDevice', undefined, {
                                  defaultValue: 'This Device',
                                }),
                              ],
                            )
                          : null,
                      ]),
                      trailing(device),
                    ],
                  ),
                  confirmingId.value === device.id
                    ? h('p', { class: cm.cn(cm.textSize('xs'), cm.textMuted, cm.sp('mt', 1)) }, [
                        t('settings.revokeDeviceWarning', undefined, {
                          defaultValue:
                            "This device's access will be revoked shortly. Sign it out?",
                        }),
                      ])
                    : null,
                ]),
              ),
            )
          : !loading.value
            ? h('p', { class: cm.cn(cm.textSize('sm'), cm.textMuted) }, [
                t('settings.noDevices', undefined, { defaultValue: 'No devices found' }),
              ])
            : null,
      ])
  },
})
