/**
 * Redis queue secret definitions — self-registered at import time so the
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

/** Secret definitions required by the Redis queue bond. */
export const queueRedisSecretDefinitions: SecretDefinition[] = [
  {
    key: 'REDIS_URL',
    description:
      'Redis connection URL — Connection URL of your Redis instance (redis:// or rediss:// for TLS).',
    required: true,
    example: 'redis://localhost:6379',
    default: 'redis://localhost:6379',
  },
]

registerSecrets(queueRedisSecretDefinitions)
