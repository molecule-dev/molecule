import { fingerprintError } from './fingerprintError.js'
import type { ErrorGroup, FingerprintInput, FingerprintOptions } from './types.js'

/**
 * Group a batch of errors by fingerprint. Returns one entry per
 * fingerprint, ordered by descending `count` (so the noisiest errors
 * surface first), with a sample of the first error encountered.
 *
 * @param errors - Iterable of error inputs. Order is preserved when
 *   selecting the `sampleError` for each group.
 * @param options - Forwarded to {@link fingerprintError}.
 * @returns One {@link ErrorGroup} per distinct fingerprint, sorted by
 *   `count` (descending). Ties are broken by first-seen order.
 */
export const groupErrors = <T extends FingerprintInput>(
  errors: Iterable<T>,
  options: FingerprintOptions = {},
): ErrorGroup<T>[] => {
  const groups = new Map<string, { group: ErrorGroup<T>; firstIndex: number }>()
  let index = 0

  for (const error of errors) {
    const fingerprint = fingerprintError(error, options)
    const existing = groups.get(fingerprint)
    if (existing) {
      existing.group.count += 1
    } else {
      groups.set(fingerprint, {
        group: {
          fingerprint,
          count: 1,
          sampleError: error,
        },
        firstIndex: index,
      })
    }
    index += 1
  }

  return Array.from(groups.values())
    .sort((a, b) => {
      if (b.group.count !== a.group.count) {
        return b.group.count - a.group.count
      }
      return a.firstIndex - b.firstIndex
    })
    .map((entry) => entry.group)
}
