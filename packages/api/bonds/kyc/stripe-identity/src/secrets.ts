/**
 * Stripe Identity secret definitions — self-registered at import time so
 * the runtime secrets registry (`@molecule/api-secrets`) can drive
 * boot-time configuration reports and actionable "not configured" errors.
 *
 * Content is derived MECHANICALLY from this package's mlcl registry
 * secrets entry (label/instructions/setupUrl/example) via the fleet
 * formula, so packages sharing a key (STRIPE_SECRET_KEY with the Stripe
 * payments bond) register byte-identical definitions and registration
 * order never matters.
 *
 * @module
 */

import type { SecretDefinition } from '@molecule/api-secrets'
import { registerSecrets } from '@molecule/api-secrets'

/** Secret definitions required by the Stripe Identity KYC bond. */
export const kycStripeIdentitySecretDefinitions: SecretDefinition[] = [
  {
    key: 'STRIPE_SECRET_KEY',
    description:
      'Stripe secret key — Stripe Dashboard → Developers → API keys; use the sk_test_ key in test mode, sk_live_ in production.',
    helpUrl: 'https://dashboard.stripe.com/apikeys',
    required: true,
    example: 'sk_test_...',
  },
  {
    key: 'STRIPE_IDENTITY_WEBHOOK_SECRET',
    description:
      'Stripe Identity webhook signing secret — Add a webhook endpoint for Identity events in the Stripe Dashboard and copy its signing secret.',
    helpUrl: 'https://dashboard.stripe.com/webhooks',
    required: true,
    example: 'whsec_...',
  },
]

registerSecrets(kycStripeIdentitySecretDefinitions)
