/**
 * Webhook notifications secret definitions — self-registered at import
 * time so the runtime secrets registry (`@molecule/api-secrets`) can drive
 * boot-time configuration reports and actionable "not configured" errors.
 *
 * Content is derived MECHANICALLY from this package's mlcl registry
 * secrets entry (label/instructions/setupUrl/example) via the fleet
 * formula, so packages sharing a key register byte-identical definitions
 * and registration order never matters.
 *
 * @module
 */

import type { SecretDefinition } from '@molecule/api-secrets'
import { registerSecrets } from '@molecule/api-secrets'

/** Secret definitions required by the webhook notifications bond. */
export const notificationsWebhookSecretDefinitions: SecretDefinition[] = [
  {
    key: 'NOTIFICATIONS_WEBHOOK_URL',
    description:
      'Notification webhook URL — HTTPS endpoint that receives notification POSTs from your app.',
    required: true,
    example: 'https://example.com/hooks/notify',
  },
  {
    key: 'NOTIFICATIONS_WEBHOOK_SECRET',
    description:
      'Notification webhook signing secret — Shared secret used to HMAC-sign webhook payloads so the receiver can verify them; share it with the receiving service. Auto-generated at scaffold — no manual setup needed.',
    required: false,
  },
]

registerSecrets(notificationsWebhookSecretDefinitions)
