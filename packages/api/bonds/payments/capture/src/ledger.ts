/**
 * The in-memory ledger the payments capture provider records into.
 *
 * @module
 */

import type { CapturedPayments, PaymentsCaptureLedgerStore } from './types.js'

/**
 * Returns an empty set of record lists.
 *
 * @returns Fresh, empty {@link CapturedPayments}.
 */
const emptyRecords = (): CapturedPayments => ({
  customers: [],
  checkoutSessions: [],
  subscriptions: [],
  setupIntents: [],
  paymentMethods: [],
  refunds: [],
  portalSessions: [],
  webhookEvents: [],
  webhookDeliveries: [],
  operations: [],
})

/**
 * In-memory store of everything the simulated vendor has done.
 *
 * Ids are deterministic: each prefix has its own counter, so a fresh ledger
 * always issues `cus_capture_000001`, then `cus_capture_000002`, and `clear()`
 * starts the sequence again. The `_capture_` infix makes a simulated id
 * recognisable anywhere it ends up (logs, a dev database), while the leading
 * vendor prefix (`cs_`, `sub_`, `cus_`) keeps app code that branches on it
 * working unchanged.
 */
export class PaymentsCaptureLedger implements PaymentsCaptureLedgerStore {
  /** Mutable record lists. Read them through {@link PaymentsCaptureLedger.snapshot}. */
  readonly records: CapturedPayments = emptyRecords()

  private counters = new Map<string, number>()

  /**
   * Issues the next id for a prefix.
   *
   * @param prefix - Vendor prefix without the underscore (`sub`, `cs`, `cus`).
   * @returns The id, e.g. `sub_capture_000001`.
   */
  nextId(prefix: string): string {
    const next = (this.counters.get(prefix) ?? 0) + 1
    this.counters.set(prefix, next)
    return `${prefix}_capture_${String(next).padStart(6, '0')}`
  }

  /**
   * Returns a deep copy of every record, safe to hold or mutate.
   *
   * @returns The snapshot.
   */
  snapshot(): CapturedPayments {
    return structuredClone(this.records)
  }

  /** Removes every record and resets every id counter. */
  clear(): void {
    for (const key of Object.keys(this.records) as Array<keyof CapturedPayments>) {
      this.records[key].length = 0
    }
    this.counters.clear()
  }
}

/** The ledger shared by the default `provider` and the module-level helpers. */
export const defaultPaymentsCaptureLedger = new PaymentsCaptureLedger()

/**
 * Returns a deep copy of everything captured in the shared ledger (or the one
 * given) — for tests and a dev UI.
 *
 * @param ledger - Ledger to read. Defaults to the shared ledger.
 * @returns The captured records.
 */
export const getCapturedPayments = (
  ledger: PaymentsCaptureLedgerStore = defaultPaymentsCaptureLedger,
): CapturedPayments => ledger.snapshot()

/**
 * Empties the shared ledger (or the one given) and resets its id counters.
 *
 * @param ledger - Ledger to clear. Defaults to the shared ledger.
 */
export const clearCapturedPayments = (
  ledger: PaymentsCaptureLedgerStore = defaultPaymentsCaptureLedger,
): void => {
  ledger.clear()
}
