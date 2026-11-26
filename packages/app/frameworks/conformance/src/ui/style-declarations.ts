/**
 * Splits an inline style at declaration separators, keeping semicolons in quotes and functions.
 *
 * @param value - A style attribute.
 * @returns Its trimmed, non-empty declarations.
 */
export function styleDeclarations(value: string): string[] {
  const out: string[] = []
  let depth = 0
  let quote = ''
  let start = 0
  for (let i = 0; i < value.length; i++) {
    const c = value[i]
    if (quote) {
      if (c === '\\') i++
      else if (c === quote) quote = ''
    } else if (c === '"' || c === "'") quote = c
    else if (c === '(') depth++
    else if (c === ')') depth = Math.max(0, depth - 1)
    else if (c === ';' && depth === 0) {
      out.push(value.slice(start, i))
      start = i + 1
    }
  }
  out.push(value.slice(start))
  return out.map((d) => d.trim()).filter(Boolean)
}
