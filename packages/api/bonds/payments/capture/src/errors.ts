/**
 * Typed errors thrown by the payments capture provider.
 *
 * @module
 */

import type { TaggedError } from '@molecule/api-payments'

/**
 * Machine-readable keys carried by {@link PaymentsCaptureError}.
 *
 * - `'payments.capture.unsupported'` (501) — the method belongs to a flow this
 *   simulator cannot reproduce honestly (App Store / Play receipts and their
 *   server notifications are signed by Apple/Google).
 * - `'payments.capture.notFound'` (404) — a ledger helper was given an id the
 *   ledger never issued.
 * - `'payments.capture.invalidState'` (409) — a ledger helper was asked to do
 *   something the record's current state does not allow (completing a checkout
 *   twice, renewing a canceled subscription).
 */
export type PaymentsCaptureErrorKey =
  'payments.capture.unsupported' | 'payments.capture.notFound' | 'payments.capture.invalidState'

const STATUS_BY_KEY: Record<PaymentsCaptureErrorKey, number> = {
  'payments.capture.unsupported': 501,
  'payments.capture.notFound': 404,
  'payments.capture.invalidState': 409,
}

/**
 * Error thrown by the capture provider and its ledger helpers.
 *
 * Carries `statusCode` + `errorKey` (the {@link TaggedError} convention from
 * `@molecule/api-payments`) so a route can surface the real cause.
 */
export class PaymentsCaptureError extends Error implements TaggedError {
  /** HTTP status the error should be reported with. */
  readonly statusCode: number

  /** Machine-readable key naming the cause. */
  readonly errorKey: PaymentsCaptureErrorKey

  /**
   * Creates a capture error.
   *
   * @param errorKey - Which kind of failure this is.
   * @param message - A sentence naming what failed and why.
   */
  constructor(errorKey: PaymentsCaptureErrorKey, message: string) {
    super(message)
    this.name = 'PaymentsCaptureError'
    this.errorKey = errorKey
    this.statusCode = STATUS_BY_KEY[errorKey]
  }
}

/**
 * Checks whether a caught value is a {@link PaymentsCaptureError}, optionally
 * of one specific kind.
 *
 * @param error - The caught value.
 * @param errorKey - When given, the error must carry this key.
 * @returns `true` when `error` is a capture error (of that kind).
 */
export const isPaymentsCaptureError = (
  error: unknown,
  errorKey?: PaymentsCaptureErrorKey,
): error is PaymentsCaptureError =>
  error instanceof PaymentsCaptureError && (errorKey === undefined || error.errorKey === errorKey)
