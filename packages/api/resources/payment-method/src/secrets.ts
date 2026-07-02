/**
 * Payment-method resource secret definitions — self-registered at import time
 * so the runtime secrets registry (`@molecule/api-secrets`) can drive boot-time
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

/** Secret definitions required by the payment-method resource. */
export const resourcePaymentMethodSecretDefinitions: SecretDefinition[] = [
  {
    key: 'STRIPE_SECRET_KEY',
    description:
      'Stripe secret key — Stripe Dashboard → Developers → API keys; use the sk_test_ key in test mode, sk_live_ in production.',
    helpUrl: 'https://dashboard.stripe.com/apikeys',
    required: true,
    example: 'sk_test_...',
  },
]

registerSecrets(resourcePaymentMethodSecretDefinitions)
