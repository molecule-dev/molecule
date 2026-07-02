/**
 * Telegram secret definitions — self-registered at import time so the
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

/** Secret definitions required by the Telegram channel bond. */
export const channelTelegramSecretDefinitions: SecretDefinition[] = [
  {
    key: 'CHANNEL_TELEGRAM_BOT_TOKEN',
    description:
      'Telegram bot token — Create a bot with @BotFather in Telegram (/newbot) and copy the token.',
    helpUrl: 'https://t.me/BotFather',
    required: true,
    example: '123456789:ABC-DEF...',
  },
  {
    key: 'CHANNEL_TELEGRAM_WEBHOOK_SECRET',
    description:
      'Telegram webhook secret — Secret token passed to setWebhook so Telegram signs updates. Auto-generated at scaffold — no manual setup needed.',
    required: false,
  },
]

registerSecrets(channelTelegramSecretDefinitions)
