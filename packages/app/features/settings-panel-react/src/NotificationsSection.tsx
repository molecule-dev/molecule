import type { JSX } from 'react'
import { useEffect, useState } from 'react'

import type { PushToggleResult } from '@molecule/app-push'
import {
  disablePushOnCurrentDevice,
  enablePushOnCurrentDevice,
  readCurrentDevicePushEnabled,
} from '@molecule/app-push'
import { useHttpClient, usePush, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Flex, Switch } from '@molecule/app-ui-react'
import { Box, Text } from '@molecule/app-ui-react/elements'

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
 */
export function NotificationsSection(): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { requestPermission, register, unregister } = usePush()
  const [enabled, setEnabled] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    // Server truth for THIS device; resolves false (never throws) when the
    // devices endpoint is unavailable.
    readCurrentDevicePushEnabled(http).then((serverEnabled) => {
      if (!cancelled && serverEnabled) setEnabled(true)
    })
    return () => {
      cancelled = true
    }
  }, [http])

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

  const handleToggle = async (next: boolean): Promise<void> => {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      if (next) {
        const result = await enablePushOnCurrentDevice({ http, requestPermission, register })
        if (result.ok) {
          setEnabled(true)
        } else {
          setError(failureMessage(result))
        }
      } else {
        const result = await disablePushOnCurrentDevice({ http, unregister })
        // The switch goes off locally either way; a failed server clear is
        // still reported so the user knows sends may continue.
        setEnabled(false)
        if (!result.ok) {
          setError(failureMessage(result))
        }
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Box as="section">
      <Text as="h3" className={cm.cn(cm.sectionHeading, cm.sp('mb', 3))}>
        {t('settings.notifications', undefined, { defaultValue: 'Notifications' })}
      </Text>
      <Flex align="center" justify="between">
        <Text as="span" className={cm.textSize('sm')}>
          {t('settings.pushNotifications', undefined, { defaultValue: 'Push notifications' })}
        </Text>
        <Switch
          checked={enabled}
          disabled={busy}
          // The visible text is a SIBLING span, not the Switch's label —
          // without aria-label the control is announced as just "switch".
          aria-label={t('settings.pushNotifications', undefined, {
            defaultValue: 'Push notifications',
          })}
          onChange={() => handleToggle(!enabled)}
          size="sm"
          data-mol-id="settings-push-toggle"
        />
      </Flex>
      {error ? (
        <Text
          as="p"
          className={cm.cn(cm.textSize('xs'), cm.textError, cm.sp('mt', 1))}
          role="alert"
          data-mol-id="settings-push-error"
        >
          {error}
        </Text>
      ) : null}
    </Box>
  )
}
