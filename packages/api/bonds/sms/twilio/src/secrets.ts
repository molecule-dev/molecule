/**
 * Twilio secret definitions — self-registered at import time so the
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

/** Secret definitions required by the Twilio SMS bond. */
export const smsTwilioSecretDefinitions: SecretDefinition[] = [
  {
    key: 'TWILIO_ACCOUNT_SID',
    description: 'Twilio account SID — Copy the Account SID from the Twilio Console dashboard.',
    helpUrl: 'https://console.twilio.com/',
    required: true,
    example: 'AC...',
  },
  {
    key: 'TWILIO_AUTH_TOKEN',
    description: 'Twilio auth token — Copy the Auth Token from the Twilio Console dashboard.',
    helpUrl: 'https://console.twilio.com/',
    required: true,
  },
  {
    key: 'TWILIO_FROM_NUMBER',
    description:
      'Twilio from number — Buy or verify a phone number in Twilio and use it in E.164 format.',
    helpUrl: 'https://console.twilio.com/us1/develop/phone-numbers/manage/incoming',
    required: true,
    example: '+15551234567',
  },
]

registerSecrets(smsTwilioSecretDefinitions)
