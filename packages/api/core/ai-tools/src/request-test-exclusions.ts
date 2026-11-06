import { locatedCommandSegments, statementArgumentEnd } from './command-position.js'
import { commandRunsNoTests } from './no-test-run.js'

/** Decode a static POSIX shell word without evaluating expansions or substitutions. */
function literalWord(word: string): string | null {
  let quote = ''
  let value = ''
  for (let i = 0; i < word.length; i++) {
    const char = word[i]!
    if (quote === "'") {
      if (char === "'") quote = ''
      else value += char
    } else if (char === '\\') {
      const next = word[++i]
      if (next === undefined) return null
      if (quote === '"' && !['$', '`', '"', '\\', '\n'].includes(next)) value += '\\'
      if (next !== '\n') value += next
    } else if (char === quote) quote = ''
    else if (!quote && (char === "'" || char === '"')) quote = char
    else if (char === '$' || char === '`' || (!quote && /[\s;&|<>()]/.test(char))) return null
    else value += char
  }
  return quote ? null : value
}

/**
 * Combine the request's literal test titles with the runner's existing exclusion.
 * Null means no change, including a dynamic pattern whose value is unavailable.
 * Kept internal to command preparation. Request scope must not depend on the model
 * remembering a CLI flag on its first diagnostic run.
 */
export function requestExclusionPattern(
  args: readonly string[],
  titles: readonly string[],
): string | null {
  const excluded = [...new Set(titles.filter((title) => title.trim().length > 0))]
  if (!excluded.length || args.includes('--')) return null
  let pattern: string | null = ''
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!
    if (arg === '--grep-invert' || arg === '-G') pattern = literalWord(args[++i] ?? '')
    else if (arg.startsWith('--grep-invert='))
      pattern = literalWord(arg.slice('--grep-invert='.length))
    else if (arg.startsWith('-G') && arg.length > 2) pattern = literalWord(arg.slice(2))
  }
  if (pattern === null) return null
  if (pattern) {
    try {
      const regex = new RegExp(pattern)
      if (excluded.every((title) => regex.test(title))) return null
    } catch (_error) {
      return null // preserve the native invalid-pattern diagnostic
    }
  }
  const literal = excluded
    .map((title) => `(?:${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})$`)
    .join('|')
  return pattern ? `(?:${pattern})|(?:${literal})` : literal
}

/** Prepare request scope for either a foreground or a detached native Playwright command. */
export function requestScopedCommand(
  command: string,
  titles: readonly string[],
  quote: (value: string) => string,
): { command: string; note: string | null } {
  if (!titles.length || commandRunsNoTests(command)) return { command, note: null }
  const placements: Array<{ at: number; pattern: string }> = []
  for (const located of locatedCommandSegments(command)) {
    if (located.segment?.program !== 'playwright' || located.segment.args[0] !== 'test') continue
    if (located.start === null || located.end === null) continue
    const pattern = requestExclusionPattern(located.segment.args, titles)
    const at = statementArgumentEnd(command, located.start, located.end)
    if (pattern !== null && at !== null) placements.push({ at, pattern })
  }
  let out = command
  for (const { at, pattern } of placements.sort((a, b) => b.at - a.at))
    out = `${out.slice(0, at)} --grep-invert ${quote(pattern)}${out.slice(at)}`
  return {
    command: out,
    note: placements.length
      ? 'Applied the test titles the request excludes before this walk starts; existing exclusions remain in effect.'
      : null,
  }
}
