/**
 * Memcached secret definitions — self-registered at import time so the
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

/** Secret definitions required by the Memcached cache bond. */
export const cacheMemcachedSecretDefinitions: SecretDefinition[] = [
  {
    key: 'MEMCACHED_SERVERS',
    description: 'Memcached servers — Comma-separated host:port list of memcached servers.',
    required: true,
    example: 'localhost:11211',
    default: 'localhost:11211',
  },
]

registerSecrets(cacheMemcachedSecretDefinitions)
