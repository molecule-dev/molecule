/**
 * Google API authentication utilities.
 *
 * @module
 */

import {
  androidpublisher,
  type androidpublisher_v3,
  auth as googleAuth,
} from '@googleapis/androidpublisher'

// Side-effect import: registers this bond's secret definitions so the
// runtime registry is populated even when auth.js is imported directly
// (not through the package barrel).
import './secrets.js'

import { t } from '@molecule/api-i18n'

/**
 * Cached parse of `GOOGLE_API_SERVICE_KEY_OBJECT`, keyed by the raw env value so
 * a changed key (tests, secret rotation) re-parses instead of serving stale data.
 */
let cachedServiceKey: { raw: string; parsed: Record<string, unknown> } | null = null

/**
 * Reads and parses `GOOGLE_API_SERVICE_KEY_OBJECT` lazily, at CALL time.
 *
 * Reading `process.env` at module load was a trap: ESM import hoisting evaluates
 * this module before any app code runs, so an app that populates env after import
 * (dotenv called in code, a secrets bond, test stubs) would never be seen and every
 * verification failed with "not configured" despite the key being set. The sibling
 * Stripe/Apple bonds already read env lazily — this matches them.
 *
 * Also disambiguates the two failure modes: "not set" vs "set but invalid JSON"
 * (previously the parse failure was logged once at import time and the eventual
 * throw still claimed "not configured").
 *
 * @returns The parsed service account key object.
 * @throws {Error} When the env var is missing, or set but not valid JSON (with `cause`).
 */
const getServiceKeyObject = (): Record<string, unknown> => {
  const raw = process.env.GOOGLE_API_SERVICE_KEY_OBJECT
  if (!raw) {
    throw new Error(
      `${t('payments.google.error.serviceKeyNotConfigured', undefined, {
        defaultValue: 'Google API service key object not configured',
      })} — set GOOGLE_API_SERVICE_KEY_OBJECT to the service account JSON key.`,
    )
  }
  if (cachedServiceKey?.raw === raw) {
    return cachedServiceKey.parsed
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    cachedServiceKey = { raw, parsed }
    return parsed
  } catch (error) {
    throw new Error(
      `${t('payments.google.error.parseServiceKey', undefined, {
        defaultValue: 'Error parsing Google API service key object:',
      })} GOOGLE_API_SERVICE_KEY_OBJECT is set but is not valid JSON.`,
      { cause: error },
    )
  }
}

/**
 * Creates a JWT auth client for the Google Android Publisher API using the service account
 * credentials from `GOOGLE_API_SERVICE_KEY_OBJECT`. Throws if the env var is missing or unparseable.
 * @returns A JWT instance scoped to `androidpublisher`.
 */
export const getAuthClient = (): InstanceType<typeof googleAuth.JWT> => {
  const serviceKeyObject = getServiceKeyObject()

  return new googleAuth.JWT({
    email: serviceKeyObject.client_email as string,
    key: serviceKeyObject.private_key as string,
    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
  })
}

/**
 * Returns an authenticated Android Publisher API client (v3) for verifying and acknowledging
 * Google Play purchases. Creates a fresh JWT auth client on each call.
 * @returns An `androidpublisher` v3 client instance.
 */
export const getPublisher = (): androidpublisher_v3.Androidpublisher => {
  const auth = getAuthClient()
  return androidpublisher({ version: 'v3', auth })
}
