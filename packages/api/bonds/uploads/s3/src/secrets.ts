/**
 * S3 uploads secret definitions — self-registered at import time so the
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

/** Secret definitions required by the S3 uploads bond. */
export const uploadsS3SecretDefinitions: SecretDefinition[] = [
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
    key: 'AWS_S3_BUCKET',
    description:
      'S3 bucket name — Name of the S3 bucket to store uploads in (create one in the S3 console).',
    helpUrl: 'https://console.aws.amazon.com/s3/',
    required: true,
    example: 'my-app-uploads',
  },
  {
    key: 'AWS_S3_REGION',
    description: 'S3 bucket region — The AWS region of your uploads bucket.',
    required: false,
    example: 'us-east-1',
    default: 'us-east-1',
  },
]

registerSecrets(uploadsS3SecretDefinitions)
