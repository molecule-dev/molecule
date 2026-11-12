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
  if (
    segment.program === 'sed' &&
    segment.args.some((arg) => /^(?:--in-place\b|-[A-Za-z]*i)/.test(arg))
  )
    return false
  if (segment.program === 'awk' || segment.program === 'sed') {
    const program = segment.args.map((arg) => arg.replace(/^['"]|['"]$/g, '')).join(' ')
    if (/\bsystem\s*\(|>|\bw\s+\S/.test(program)) return false
  }
  return true
}
