/**
 * Apple OAuth secret definitions — self-registered at import time so the
 * runtime secrets registry (`@molecule/api-secrets`) can drive boot-time
 * configuration reports and actionable "not configured" errors.
 *
 * Content is derived MECHANICALLY from this package's mlcl registry
 * secrets entry (label/instructions/setupUrl/example) via the fleet
 * formula, so packages sharing a key register byte-identical definitions
 * and registration order never matters.
 *
 * @module
 */

import type { SecretDefinition } from '@molecule/api-secrets'
import { registerSecrets } from '@molecule/api-secrets'

/** Secret definitions required by the Sign in with Apple OAuth bond. */
export const oauthAppleSecretDefinitions: SecretDefinition[] = [
  {
    key: 'OAUTH_APPLE_CLIENT_ID',
    description:
      'Apple Services ID — Apple Developer → Identifiers → create a Services ID with "Sign in with Apple" enabled.',
    helpUrl: 'https://developer.apple.com/account/resources/identifiers/list/serviceId',
    required: true,
    example: 'com.example.app.signin',
  },
  {
    key: 'OAUTH_APPLE_TEAM_ID',
    description:
      'Apple Team ID — The 10-character Team ID from your Apple Developer membership details.',
    helpUrl: 'https://developer.apple.com/account',
    required: true,
    example: 'A1B2C3D4E5',
  },
  {
    key: 'OAUTH_APPLE_KEY_ID',
    description:
      'Apple key ID — Create a "Sign in with Apple" key under Certificates, Identifiers & Profiles → Keys.',
    helpUrl: 'https://developer.apple.com/account/resources/authkeys/list',
    required: true,
  },
  {
    key: 'OAUTH_APPLE_PRIVATE_KEY',
    description:
      'Apple private key (.p8) — Download the .p8 file when creating the key (one-time download) and paste its PEM contents.',
    helpUrl: 'https://developer.apple.com/account/resources/authkeys/list',
    required: true,
    example: 'contents of AuthKey_ABC123DEF4.p8',
  },
]

registerSecrets(oauthAppleSecretDefinitions)
