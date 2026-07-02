/**
 * LiveKit video-rooms bond secret definitions — self-registered at import time so the
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

import { registerSecrets } from '@molecule/api-secrets'
import type { SecretDefinition } from '@molecule/api-secrets'

/** Secret definitions required by the LiveKit video-rooms bond. */
export const videoRoomsLivekitSecretDefinitions: SecretDefinition[] = [
  {
    key: 'LIVEKIT_URL',
    description: 'LiveKit server URL — Your LiveKit Cloud project URL (or self-hosted wss:// URL).',
    helpUrl: 'https://cloud.livekit.io/',
    required: true,
    example: 'wss://your-app.livekit.cloud',
  },
  {
    key: 'LIVEKIT_API_KEY',
    description: 'LiveKit API key — LiveKit Cloud → project → Settings → Keys.',
    helpUrl: 'https://cloud.livekit.io/',
    required: true,
  },
  {
    key: 'LIVEKIT_API_SECRET',
    description: 'LiveKit API secret — Shown when creating the key in LiveKit Cloud.',
    helpUrl: 'https://cloud.livekit.io/',
    required: true,
  },
]

registerSecrets(videoRoomsLivekitSecretDefinitions)
