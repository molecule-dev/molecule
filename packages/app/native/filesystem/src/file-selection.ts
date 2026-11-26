/**
 * Metadata filters for ordered file selections.
 *
 * @module
 */

import type { FileSelectionOptions, PickedFile } from './types.js'

/**
 * Finds the files to deliver and the files rejected by the type or size filter.
 * Both batches preserve the order of the input.
 *
 * @param files - Files to check, in selection order.
 * @param options - Accepted file types, size and count.
 * @returns Accepted and rejected batches of the original values.
 */
export function filterPickedFiles<F extends Pick<PickedFile, 'name' | 'type' | 'size'>>(
  files: readonly F[],
  { accept, multiple, maxSize }: FileSelectionOptions,
): { accepted: F[]; rejected: F[] } {
  const tokens = accept
    ?.toLowerCase()
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean)
  const accepted: F[] = []
  const rejected: F[] = []

  for (const file of files) {
    const matchesType =
      !tokens?.length ||
      tokens.some((token) => {
        if (token === '*') return true
        if (token.startsWith('.')) return file.name.toLowerCase().endsWith(token)
        const mime = file.type.toLowerCase()
        if (token === '*/*') return mime.includes('/')
        if (token.endsWith('/*')) return mime.startsWith(token.slice(0, -1))
        return token === mime
      })
    if (!matchesType || (maxSize !== undefined && file.size > maxSize)) {
      rejected.push(file)
    } else if (multiple || accepted.length === 0) {
      accepted.push(file)
    }
  }

  return { accepted, rejected }
}
