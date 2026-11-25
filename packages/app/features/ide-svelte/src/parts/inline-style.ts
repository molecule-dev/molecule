import { reactStyle } from '@molecule/app-ui-svelte'

/**
 * Splits an inline style string into declarations, respecting quoted
 * strings and parentheses (so a `font-family` list or a `var(--x, y)` value
 * is never split).
 *
 * @param text - The CSS text.
 * @returns The declarations, in source order.
 */
function parseDeclarations(text: string): Record<string, string> {
  const entries: [string, string][] = []
  let current = ''
  let quote: '"' | "'" | null = null
  let depth = 0

  /** Flushes the pending declaration. */
  const push = (): void => {
    const trimmed = current.trim()
    current = ''
    if (!trimmed) return
    const colon = trimmed.indexOf(':')
    if (colon < 0) return
    entries.push([trimmed.slice(0, colon).trim(), trimmed.slice(colon + 1).trim()])
  }

  for (const char of text) {
    if (quote) {
      if (char === quote) quote = null
      current += char
      continue
    }
    if (char === '"' || char === "'") {
      quote = char
      current += char
      continue
    }
    if (char === '(') depth += 1
    else if (char === ')') depth = Math.max(0, depth - 1)
    if (char === ';' && depth === 0) {
      push()
      continue
    }
    current += char
  }
  push()
  return Object.fromEntries(entries)
}

/**
 * Applies an IDE-authored CSS string using the Svelte UI kit’s per-property action.
 *
 * @param node - The element the action styles.
 * @param text - The CSS declarations.
 * @returns The action’s update and cleanup hooks.
 */
export function styleText(
  node: ElementCSSInlineStyle,
  text: string | null | undefined,
): { update: (next: string | null | undefined) => void; destroy: () => void } {
  const styles = reactStyle(node, parseDeclarations(text ?? ''))
  return {
    update: (next: string | null | undefined) => styles.update(parseDeclarations(next ?? '')),
    destroy: styles.destroy,
  }
}
