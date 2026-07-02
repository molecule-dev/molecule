/**
 * Daily.co video-rooms bond secret definitions — self-registered at import time so the
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

/** Secret definitions required by the Daily.co video-rooms bond. */
export const videoRoomsDailyCoSecretDefinitions: SecretDefinition[] = [
  {
    key: 'DAILY_CO_API_KEY',
    description: 'Daily.co API key — Copy the API key from the Daily dashboard → Developers.',
    helpUrl: 'https://dashboard.daily.co/developers',
    required: true,
  },
]

registerSecrets(videoRoomsDailyCoSecretDefinitions)
