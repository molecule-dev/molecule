/**
 * Vue push-notification toggle section: the full receive-side enable chain
 * over the shared current-device push helpers.
 *
 * Vue counterpart of `@molecule/app-settings-panel-react`'s
 * `NotificationsSection` — the same DOM, callbacks and service calls.
 *
 * @module
 */

import { defineComponent, h, onMounted, onUnmounted, type Ref, ref, type VNodeChild } from 'vue'

import type { PushToggleResult } from '@molecule/app-push'
import {
  disablePushOnCurrentDevice,
  enablePushOnCurrentDevice,
  readCurrentDevicePushEnabled,
} from '@molecule/app-push'
import { getClassMap } from '@molecule/app-ui'
import { Flex, Switch } from '@molecule/app-ui-vue'
import { useHttpClient, usePush, useTranslation } from '@molecule/app-vue'

/**
 * Push-notification toggle section — the full receive-side enable chain:
 * browser permission → runtime VAPID public key
 * (`GET /api/devices/push/public-key`) → `pushManager.subscribe` with
 * `applicationServerKey` → PATCH the subscription onto the current device
 * row (`/api/devices/:id { pushSubscription, hasPushSubscription }`), which
 * is where the api-side push fan-outs look for it.
 *
 * Initial state reflects SERVER truth (the current device row's
 * `hasPushSubscription`), and every failure surfaces as an honest inline
 * message — a dev build without a service worker fails fast instead of
 * hanging the switch.
 *
 * @returns The notifications section component.
 */
export const NotificationsSection = defineComponent({
  name: 'NotificationsSection',
  setup() {
    const cm = getClassMap()
    const { t } = useTranslation()
    const http = useHttpClient()
    const { requestPermission, register, unregister } = usePush()
    const enabled: Ref<boolean> = ref(false)
    const busy: Ref<boolean> = ref(false)
    const error: Ref<string | null> = ref(null)

    let cancelled = false
    onMounted(() => {
      // Server truth for THIS device; resolves false (never throws) when the
      // devices endpoint is unavailable.
      void readCurrentDevicePushEnabled(http).then((serverEnabled) => {
        if (!cancelled && serverEnabled) enabled.value = true
      })
    })
    onUnmounted(() => {
      cancelled = true
    })

    /**
     * Maps a failed toggle result to its honest inline message.
     *
     * @param result - The failing toggle result.
     * @returns The message to render under the switch.
     */
    const failureMessage = (result: Extract<PushToggleResult, { ok: false }>): string => {
      switch (result.reason) {
        case 'permission-denied':
          return t('settings.pushPermissionDenied', undefined, {
            defaultValue: 'Notification permission was denied.',
          })
        case 'server-unconfigured':
          return t('settings.pushServerUnavailable', undefined, {
            defaultValue: 'Push notifications are not configured on this server.',
          })
        case 'register-failed':
          // The push provider throws already-localized messages (not supported /
          // no service worker in a dev build / push-service rejection).
          return (
            result.message ||
            t('settings.pushUpdateFailed', undefined, {
              defaultValue: 'Could not update push notification settings.',
            })
          )
        case 'persist-failed':
          // `result.message` here is the HTTP client's error (a status line or a
          // network error), not text written for the user, so it is not shown.
          return t('settings.pushUpdateFailed', undefined, {
            defaultValue: 'Could not update push notification settings.',
          })
      }
    }

    /**
     * Runs the enable or disable chain for the switch's next state.
     *
     * @param next - The state the user toggled to.
     */
    const handleToggle = async (next: boolean): Promise<void> => {
      if (busy.value) return
      busy.value = true
      error.value = null
      try {
        if (next) {
          const result = await enablePushOnCurrentDevice({ http, requestPermission, register })
          if (result.ok) {
            enabled.value = true
          } else {
            error.value = failureMessage(result)
          }
        } else {
          const result = await disablePushOnCurrentDevice({ http, unregister })
          // The switch goes off locally either way; a failed server clear is
          // still reported so the user knows sends may continue.
          enabled.value = false
          if (!result.ok) {
            error.value = failureMessage(result)
          }
        }
      } finally {
        busy.value = false
      }
    }

    return (): VNodeChild =>
      h('section', [
        h('h3', { class: cm.cn(cm.sectionHeading, cm.sp('mb', 3)) }, [
          t('settings.notifications', undefined, { defaultValue: 'Notifications' }),
        ]),
        h(Flex, { align: 'center', justify: 'between' }, () => [
          h('span', { class: cm.textSize('sm') }, [
            t('settings.pushNotifications', undefined, { defaultValue: 'Push notifications' }),
          ]),
          h(Switch, {
            checked: enabled.value,
            disabled: busy.value,
            // The visible text is a SIBLING span, not the Switch's label —
            // without aria-label the control is announced as just "switch".
            'aria-label': t('settings.pushNotifications', undefined, {
              defaultValue: 'Push notifications',
            }),
            onChange: (e: Event) => handleToggle((e.target as HTMLInputElement).checked),
            size: 'sm',
            'data-mol-id': 'settings-push-toggle',
          }),
        ]),
        error.value
          ? h(
              'p',
              {
                class: cm.cn(cm.textSize('xs'), cm.textError, cm.sp('mt', 1)),
                role: 'alert',
                'data-mol-id': 'settings-push-error',
              },
              [error.value],
            )
          : null,
      ])
  },
})
