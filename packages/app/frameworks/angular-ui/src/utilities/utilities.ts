/**
 * Utility functions for UI components.
 *
 * @module
 */

/**
 * Merge class names, filtering out falsy values.
 * @param inputs - The inputs.
 * @returns The resulting string.
 */
export function cn(...inputs: (string | undefined | null | false)[]): string {
  return inputs.filter(Boolean).join(' ')
}
