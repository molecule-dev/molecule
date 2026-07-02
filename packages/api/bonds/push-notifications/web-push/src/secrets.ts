/**
 * Web Push secret definitions — self-registered at import time so the
 * runtime secrets registry (`@molecule/api-secrets`) can drive boot-time
 * configuration reports and actionable "not configured" errors.
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

/** Secret definitions required by the Web Push notifications bond. */
export const pushNotificationsWebPushSecretDefinitions: SecretDefinition[] = [
  {
    key: 'VAPID_PUBLIC_KEY',
    description:
      'Web Push VAPID public key — VAPID public key for Web Push. Auto-generated at scaffold — no manual setup needed.',
    required: true,
  },
  {
    key: 'VAPID_PRIVATE_KEY',
    description:
      'Web Push VAPID private key — VAPID private key matching VAPID_PUBLIC_KEY. Auto-generated at scaffold — no manual setup needed.',
    required: true,
  },
  {
    key: 'VAPID_EMAIL',
    description:
      'Web Push contact email — Contact address sent to push services with each request (mailto: form).',
    required: true,
    example: 'mailto:you@example.com',
  },
]

registerSecrets(pushNotificationsWebPushSecretDefinitions)
