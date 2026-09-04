/**
 * RevenueCat payments secret definitions — self-registered at import time so
 * the runtime secrets registry (`@molecule/api-secrets`) can drive
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

/**
 * Secret definitions required by the RevenueCat payments bond.
 *
 * The two webhook secrets are marked optional because RevenueCat offers TWO
 * independent webhook authentication mechanisms and only one is needed — but
 * the bond refuses to accept an unauthenticated webhook, so at least one MUST
 * be set for `handleWebhookEvent` to work at all.
 */
export const paymentsRevenueCatSecretDefinitions: SecretDefinition[] = [
  {
    key: 'REVENUECAT_SECRET_API_KEY',
    description:
      'RevenueCat secret API key — RevenueCat dashboard → Project settings → API keys → "Secret API keys" → New; this is the server-only key, NOT the public SDK key that ships inside your app.',
    helpUrl: 'https://app.revenuecat.com/',
    required: true,
    example: 'sk_...',
  },
  {
    key: 'REVENUECAT_WEBHOOK_AUTHORIZATION',
    description:
      'RevenueCat webhook Authorization header value — RevenueCat dashboard → Integrations → Webhooks → point the webhook at {apiUrl}/api/users/payment-notification/revenuecat, set "Authorization header value" to a long random string, and paste the same string here.',
    helpUrl: 'https://app.revenuecat.com/',
    required: false,
    example: 'Bearer ...',
  },
  {
    key: 'REVENUECAT_WEBHOOK_SIGNING_SECRET',
    description:
      'RevenueCat webhook HMAC signing secret — RevenueCat dashboard → Integrations → Webhooks → enable "HMAC webhook signing" and copy the secret; it is shown only at creation or rotation and cannot be retrieved later.',
    helpUrl: 'https://app.revenuecat.com/',
    required: false,
    example: '...',
  },
]

registerSecrets(paymentsRevenueCatSecretDefinitions)
