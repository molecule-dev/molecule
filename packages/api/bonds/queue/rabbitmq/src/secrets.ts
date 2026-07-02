/**
 * RabbitMQ secret definitions — self-registered at import time so the
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

/** Secret definitions required by the RabbitMQ queue bond. */
export const queueRabbitmqSecretDefinitions: SecretDefinition[] = [
  {
    key: 'RABBITMQ_URL',
    description: 'RabbitMQ connection URL — AMQP connection URL of your RabbitMQ instance.',
    required: true,
    example: 'amqp://guest:guest@localhost:5672',
    default: 'amqp://localhost',
  },
]

registerSecrets(queueRabbitmqSecretDefinitions)
