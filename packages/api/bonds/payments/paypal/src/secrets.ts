/**
 * PayPal secret definitions — self-registered at import time so the
 * runtime secrets registry (`@molecule/api-secrets`) can drive boot-time
 * configuration reports and actionable "not configured" errors.
 *
 * Content is derived MECHANICALLY from this package's mlcl registry secrets
 * entry (label/instructions/setupUrl/example) via the fleet formula, so
 * packages sharing a key register byte-identical definitions and
 * registration order never matters.
 *
 * @module
 */

import type { SecretDefinition } from '@molecule/api-secrets'
import { registerSecrets } from '@molecule/api-secrets'

/** Secret definitions required by the PayPal payments bond. */
export const paypalSecretDefinitions: SecretDefinition[] = [
  {
    key: 'PAYPAL_CLIENT_ID',
    description:
      'PayPal REST app client ID — PayPal Developer Dashboard → Apps & Credentials → create (or select) a REST app in the Sandbox or Live tab; copy its Client ID.',
    helpUrl: 'https://developer.paypal.com/dashboard/applications/sandbox',
    required: true,
    example: 'AXx...',
  },
  {
    key: 'PAYPAL_CLIENT_SECRET',
    description:
      'PayPal REST app secret — PayPal Developer Dashboard → Apps & Credentials → your REST app; copy the Secret (shown under the Client ID).',
    helpUrl: 'https://developer.paypal.com/dashboard/applications/sandbox',
    required: true,
    example: 'ELx...',
  },
  {
    key: 'PAYPAL_BASE_URL',
    description:
      'PayPal API base URL — Defaults to the sandbox host (https://api-m.sandbox.paypal.com); set to https://api-m.paypal.com for live. Must match the environment your REST app credentials came from.',
    required: false,
    example: 'https://api-m.sandbox.paypal.com',
  },
  {
    key: 'PAYPAL_WEBHOOK_ID',
    description:
      'PayPal webhook ID — PayPal Developer Dashboard → Apps & Credentials → your REST app → Add Webhook pointing at {apiUrl}/api/users/payment-notification/paypal, then copy its webhook ID. Required only for webhook signature verification.',
    helpUrl: 'https://developer.paypal.com/dashboard/applications/sandbox',
    required: false,
    example: '5WH...',
  },
]

registerSecrets(paypalSecretDefinitions)
