/**
 * Sentry secret definitions — self-registered at import time so the
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

/** Secret definitions required by the Sentry error tracking bond. */
export const sentrySecretDefinitions: SecretDefinition[] = [
  {
    key: 'SENTRY_DSN',
    description:
      'Sentry DSN — Sentry → Settings → Projects → your project → Client Keys (DSN); copy the DSN. Until it is set the bond is a no-op (no events are sent).',
    helpUrl: 'https://sentry.io/settings/projects/',
    required: true,
    example: 'https://examplePublicKey@o0.ingest.sentry.io/0',
  },
  {
    key: 'SENTRY_ENVIRONMENT',
    description:
      'Sentry environment — Environment tag applied to every event (e.g. production, staging); defaults to NODE_ENV when unset.',
    required: false,
    example: 'production',
  },
  {
    key: 'SENTRY_TRACES_SAMPLE_RATE',
    description:
      'Sentry traces sample rate — Fraction between 0 and 1 of transactions sampled for performance tracing (e.g. 0.1 = 10%); unset disables tracing.',
    required: false,
    example: '0.1',
  },
]

registerSecrets(sentrySecretDefinitions)
