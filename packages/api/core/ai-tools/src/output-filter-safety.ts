/** The common safety check for pipeline filters the tool may remove. */
import type { CommandSegment } from './command-position.js'

const OUTPUT_ONLY_FILTERS: ReadonlySet<string> = new Set([
  'awk',
  'cat',
  'column',
  'cut',
  'egrep',
  'fgrep',
  'fmt',
  'fold',
  'grep',
  'head',
  'jq',
  'nl',
  'rg',
  'sed',
  'sort',
  'tail',
  'tr',
  'uniq',
  'wc',
])

/** Output to a file; joining stderr with stdout is not a file write. */
const OUTPUT_REDIRECT = /^(?:\d*|&)>>?(?!&)/

/**
 * Whether dropping a pipeline stage can only change what is printed. A redirect, in-place
 * edit or a filter program that writes or executes another command must retain its pipeline.
 * @param segment - One stage from the shared shell reader.
 * @returns True for a filter with no known write or execution effects.
 */
export function isOutputOnlyFilter(segment: CommandSegment): boolean {
  if (!OUTPUT_ONLY_FILTERS.has(segment.program)) return false
  if (segment.args.some((arg) => OUTPUT_REDIRECT.test(arg))) return false
  // Filter arguments can run commands before the filter starts. Keep opaque expansions
  // rather than erase their effects; a quoted literal containing the same syntax may stay too.
  if (segment.args.some((arg) => /\$\(|`|[<>]\(/.test(arg))) return false
  if (
    segment.args.some((arg) => {
      if (/^'[^']*'$/.test(arg)) return false
      const word = arg.endsWith('"') ? arg.slice(0, -1) : arg
      return /\$[A-Za-z0-9_('"{?$!#*@-]/.test(word) || word.includes('$[')
    })
  )
    return false
  if (
    segment.program === 'sed' &&
    segment.args.some((arg) => /^(?:--in-place\b|-[A-Za-z]*i)/.test(arg))
  )
    return false
  if (segment.program === 'awk' || segment.program === 'sed') {
    // Implementation-specific awk options can load code or write auxiliary files. Only the
    // ordinary field-separator/variable options are understood here; preserve all other flags.
    if (
      segment.program === 'awk' &&
      segment.args.some(
        (arg) =>
          arg.startsWith('-') && !/^(?:-[Fv]|--(?:field-separator|assign)(?:=|$)|--$)/.test(arg),
      )
    )
      return false
    // External programs cannot be proved output-only from this invocation's text.
    if (segment.args.some((arg) => /^(?:-[fEiIl]|--(?:file|include|load))(?:=|$|[^-])/.test(arg)))
      return false
    const program = segment.args.map((arg) => arg.replace(/^['"]|['"]$/g, '')).join(' ')
    if (/\bsystem\s*\(|>|\bw\s+\S/.test(program)) return false
    // awk can execute a pipe through getline without system(). sed can execute or write text.
    // Keep ambiguous sed command letters rather than parse its language here.
    if (segment.program === 'awk' && /\||@/.test(program)) return false
    if (segment.program === 'sed' && /[ewW]/.test(program)) return false
  }
  return true
}
