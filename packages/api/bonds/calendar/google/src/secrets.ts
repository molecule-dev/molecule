/**
 * Google Calendar secret definitions — self-registered at import time so the
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

/** Secret definitions required by the Google calendar bond. */
export const calendarGoogleSecretDefinitions: SecretDefinition[] = [
  {
    key: 'OAUTH_GOOGLE_CLIENT_ID',
    description:
      'Google OAuth client ID — Google Cloud Console → APIs & Services → Credentials → Create OAuth 2.0 Client ID (Web application); add your app origin and {apiUrl}/api/users/log-in/oauth as an authorized redirect URI.',
    helpUrl: 'https://console.cloud.google.com/apis/credentials',
    required: true,
    example: '1234567890-abc.apps.googleusercontent.com',
  },
  {
    key: 'OAUTH_GOOGLE_CLIENT_SECRET',
    description:
      'Google OAuth client secret — Shown when creating the OAuth 2.0 Client ID in Google Cloud Console.',
    helpUrl: 'https://console.cloud.google.com/apis/credentials',
    required: true,
    example: 'GOCSPX-...',
  },
]

registerSecrets(calendarGoogleSecretDefinitions)
