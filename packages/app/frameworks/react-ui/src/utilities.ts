/**
 * Utility functions for UI components.
 *
 * @module
 */

/**
 * Merge class name strings, filtering out falsy values (undefined, null, false).
 * @param inputs - Class name strings or falsy values to be filtered out.
 * @returns A single space-separated class string.
 */
export function cn(...inputs: (string | undefined | null | false)[]): string {
  return inputs.filter(Boolean).join(' ')
}
