/**
 * Discord secret definitions — self-registered at import time so the
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

/** Secret definitions required by the Discord channel bond. */
export const channelDiscordSecretDefinitions: SecretDefinition[] = [
  {
    key: 'CHANNEL_DISCORD_BOT_TOKEN',
    description:
      'Discord bot token — Create an application → Bot → Reset Token, then copy the bot token.',
    helpUrl: 'https://discord.com/developers/applications',
    required: true,
  },
  {
    key: 'CHANNEL_DISCORD_PUBLIC_KEY',
    description:
      'Discord public key — Your application → General Information → Public Key (verifies interaction signatures).',
    helpUrl: 'https://discord.com/developers/applications',
    required: true,
  },
]

registerSecrets(channelDiscordSecretDefinitions)
