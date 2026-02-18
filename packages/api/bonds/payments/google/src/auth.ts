/**
 * Google API authentication utilities.
 *
 * @module
 */

import { google } from 'googleapis'

import { getLogger } from '@molecule/api-bond'
const logger = getLogger()
import { t } from '@molecule/api-i18n'

/**
 * Parse the service key object from environment variable.
 */
let serviceKeyObject: Record<string, unknown> | null = null

try {
  if (process.env.GOOGLE_API_SERVICE_KEY_OBJECT) {
    serviceKeyObject = JSON.parse(process.env.GOOGLE_API_SERVICE_KEY_OBJECT)
  }
} catch (error) {
  logger.error(
    t('payments.google.error.parseServiceKey', undefined, {
      defaultValue: 'Error parsing Google API service key object:',
    }),
    error,
  )
}

/**
 * Creates a JWT auth client for the Google Android Publisher API using the service account
 * credentials from `GOOGLE_API_SERVICE_KEY_OBJECT`. Throws if the env var is missing or unparseable.
 * @returns A `google.auth.JWT` instance scoped to `androidpublisher`.
 */
export const getAuthClient = (): InstanceType<typeof google.auth.JWT> => {
  if (!serviceKeyObject) {
    throw new Error(
      t('payments.google.error.serviceKeyNotConfigured', undefined, {
        defaultValue: 'Google API service key object not configured',
      }),
    )
  }

  return new google.auth.JWT({
    email: serviceKeyObject.client_email as string,
    key: serviceKeyObject.private_key as string,
    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
  })
}

/**
 * Returns an authenticated Android Publisher API client (v3) for verifying and acknowledging
 * Google Play purchases. Creates a fresh JWT auth client on each call.
 * @returns A `google.androidpublisher` client instance.
 */
export const getPublisher = (): ReturnType<typeof google.androidpublisher> => {
  const auth = getAuthClient()
  return google.androidpublisher({ version: 'v3', auth })
}
