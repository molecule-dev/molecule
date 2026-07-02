/**
 * Zoom video-meetings bond secret definitions — self-registered at import time so the
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

/** Secret definitions required by the Zoom video-meetings bond. */
export const videoMeetingsZoomSecretDefinitions: SecretDefinition[] = [
  {
    key: 'ZOOM_ACCOUNT_ID',
    description:
      'Zoom account ID — Create a Server-to-Server OAuth app in the Zoom App Marketplace; copy the Account ID.',
    helpUrl: 'https://marketplace.zoom.us/',
    required: true,
  },
  {
    key: 'ZOOM_CLIENT_ID',
    description: 'Zoom client ID — From your Server-to-Server OAuth app credentials.',
    helpUrl: 'https://marketplace.zoom.us/',
    required: true,
  },
  {
    key: 'ZOOM_CLIENT_SECRET',
    description: 'Zoom client secret — From your Server-to-Server OAuth app credentials.',
    helpUrl: 'https://marketplace.zoom.us/',
    required: true,
  },
]

registerSecrets(videoMeetingsZoomSecretDefinitions)
