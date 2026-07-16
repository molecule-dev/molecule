/**
 * SQS queue secret definitions — self-registered at import time so the
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

/** Secret definitions required by the SQS queue bond. */
export const queueSqsSecretDefinitions: SecretDefinition[] = [
  {
    key: 'AWS_REGION',
    description: 'AWS region — The AWS region your resources live in.',
    required: true,
    example: 'us-east-1',
    default: 'us-east-1',
  },
  {
    key: 'AWS_ACCESS_KEY_ID',
    description:
      'AWS access key ID — Create an IAM user with the needed policy (SES/S3/SQS) and create an access key under Security credentials.',
    helpUrl: 'https://console.aws.amazon.com/iam/',
    required: true,
    example: 'AKIA...',
  },
  {
    key: 'AWS_SECRET_ACCESS_KEY',
    description:
      'AWS secret access key — Shown once when creating the IAM access key — store it immediately.',
    helpUrl: 'https://console.aws.amazon.com/iam/',
    required: true,
  },
  {
    key: 'SQS_ENDPOINT',
    description:
      'SQS endpoint override — Only for LocalStack or a custom SQS-compatible endpoint. Leave unset for real AWS — queues are addressed by NAME (the queue must exist, or pass { autoCreateQueues: true } to createProvider()).',
    required: false,
    example: 'http://localhost:4566',
  },
]

registerSecrets(queueSqsSecretDefinitions)
