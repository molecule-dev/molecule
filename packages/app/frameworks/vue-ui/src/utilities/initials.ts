/**
 * Initials derivation for avatar fallbacks.
 *
 * @module
 */

/**
 * Compute up-to-two-letter initials from a display name or email.
 *
 * @param value - The name or email to derive initials from.
 * @returns The uppercased initials, or `'?'` when no usable input is given.
 */
export function getInitials(value: string | null | undefined): string {
  if (!value) return '?'
  const cleaned = value.includes('@') ? value.split('@')[0] : value
  const parts = cleaned.split(/[\s._-]+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return (first + last).toUpperCase().slice(0, 2) || '?'
}
