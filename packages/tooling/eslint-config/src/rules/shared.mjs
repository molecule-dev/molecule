/**
 * Helpers the prefer-declared-clients rule and the scaffold rules share.
 *
 * @module
 */

/** The API path a scaffolded app calls when its config sets no static `API_BASE_URL`. */
export const DEFAULT_API_BASE = '/api'

/** Test, fixture and end-to-end files, which the client and scaffold rules do not judge. */
export const TEST =
  /(?:^|[/\\])(?:__tests__|__fixtures__|e2e|fixtures)(?:[/\\]|$)|\.(?:test|spec)\.[cm]?[jt]sx?$/

/**
 * The value of a string literal or a template literal with no expressions, else null.
 *
 * @param node - Any expression node.
 * @returns The string, or null when the value is not a static string.
 */
export function literalString(node) {
  if (node?.type === 'Literal' && typeof node.value === 'string') return node.value
  if (node?.type === 'TemplateLiteral' && node.expressions.length === 0)
    return node.quasis[0].value.cooked
  return null
}
