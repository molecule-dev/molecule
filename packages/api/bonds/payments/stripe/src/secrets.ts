/**
 * Stripe secret definitions — self-registered at import time so the
 * runtime secrets registry (`@molecule/api-secrets`) can drive boot-time
 * configuration reports and actionable "not configured" errors.
 *
 * @module
 */

import { registerSecrets } from '@molecule/api-secrets'
import type { SecretDefinition } from '@molecule/api-secrets'

/** Secret definitions required by the Stripe payments bond. */
export const stripeSecretDefinitions: SecretDefinition[] = [
  {
    key: 'STRIPE_SECRET_KEY',
    description:
      'Stripe secret API key (sk_test_… / sk_live_…) — powers checkout, subscriptions, and billing.',
    helpUrl: 'https://dashboard.stripe.com/apikeys',
    required: true,
    example: 'sk_test_...',
  },
  {
    key: 'STRIPE_WEBHOOK_SECRET',
    description:
      'Stripe webhook signing secret (whsec_…) — verifies payment notification signatures; without it subscription renewals/cancellations cannot be processed.',
    helpUrl: 'https://dashboard.stripe.com/webhooks',
    required: true,
    example: 'whsec_...',
  },
]

registerSecrets(stripeSecretDefinitions)
