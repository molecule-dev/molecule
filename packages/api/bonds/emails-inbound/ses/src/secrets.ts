/**
 * AWS SES inbound-email secret definitions — self-registered at import time so the
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

/** Secret definitions required by the AWS SES inbound-email bond. */
export const emailsInboundSesSecretDefinitions: SecretDefinition[] = [
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
    key: 'AWS_SES_REGION',
    description:
      'AWS SES region — The AWS region where SES is set up (and out of sandbox for production sending).',
    required: true,
    example: 'us-east-1',
  },
  {
    key: 'AWS_SES_INBOUND_TOPIC_ARN',
    description:
      'SES inbound SNS topic ARN — ARN of the SNS topic your SES receipt rule publishes inbound mail to.',
    helpUrl: 'https://console.aws.amazon.com/ses/',
    required: false,
    example: 'arn:aws:sns:us-east-1:123456789012:ses-inbound',
  },
  {
    key: 'AWS_SNS_SIGNING_CERT_HOSTNAME_SUFFIXES',
    description:
      'SNS signing-cert hostname allowlist — Comma-separated hostname suffixes allowed for SNS signature certificates; the default (.amazonaws.com) is fine.',
    required: false,
    example: '.amazonaws.com',
    default: '.amazonaws.com',
  },
]

registerSecrets(emailsInboundSesSecretDefinitions)
