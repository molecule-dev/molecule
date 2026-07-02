/**
 * PostHog secret definitions — self-registered at import time so the
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

/** Secret definitions required by the PostHog analytics bond. */
export const analyticsPosthogSecretDefinitions: SecretDefinition[] = [
  {
    key: 'POSTHOG_API_KEY',
    description:
      'PostHog project API key — Copy the Project API key from PostHog → Project settings.',
    helpUrl: 'https://app.posthog.com/settings/project',
    required: true,
    example: 'phc_...',
  },
  {
    key: 'POSTHOG_HOST',
    description:
      'PostHog host — Origin of your PostHog instance (US cloud, EU cloud, or self-hosted).',
    required: false,
    example: 'https://us.i.posthog.com',
    default: 'https://app.posthog.com',
  },
]

registerSecrets(analyticsPosthogSecretDefinitions)
