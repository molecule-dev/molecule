/**
 * WhatsApp secret definitions — self-registered at import time so the
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

/** Secret definitions required by the WhatsApp channel bond. */
export const channelWhatsappSecretDefinitions: SecretDefinition[] = [
  {
    key: 'CHANNEL_WHATSAPP_ACCESS_TOKEN',
    description:
      'WhatsApp access token — Create a Meta app with the WhatsApp product and generate a permanent access token (System User).',
    helpUrl: 'https://developers.facebook.com/apps',
    required: true,
  },
  {
    key: 'CHANNEL_WHATSAPP_PHONE_NUMBER_ID',
    description:
      'WhatsApp phone number ID — WhatsApp → API Setup → Phone number ID (not the phone number itself).',
    helpUrl: 'https://developers.facebook.com/apps',
    required: true,
  },
  {
    key: 'CHANNEL_WHATSAPP_APP_SECRET',
    description:
      'Meta app secret (WhatsApp) — Your Meta app → App settings → Basic → App secret (verifies webhook signatures).',
    helpUrl: 'https://developers.facebook.com/apps',
    required: true,
  },
]

registerSecrets(channelWhatsappSecretDefinitions)
