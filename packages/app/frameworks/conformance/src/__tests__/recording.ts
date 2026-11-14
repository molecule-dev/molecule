/**
 * The guard every goldens recorder runs before it writes.
 *
 * A recorder writes the whole goldens file from what ran in this process, so a
 * run that skipped cases (a `-t` or file filter, an env filter, a case that
 * failed before it recorded) would replace the skipped cases' goldens with
 * nothing, and every framework's suite would then report "no golden" for them.
 *
 * @module
 */

/**
 * The cases a recording run did not record.
 *
 * @param expected - Group (component, hook, package) → the case names it must record.
 * @param recorded - Group → case name → recorded result.
 * @returns `group / case` for each missing case, sorted.
 */
export function missingRecordings(
  expected: Record<string, readonly string[]>,
  recorded: Record<string, Record<string, unknown> | undefined>,
): string[] {
  const missing: string[] = []
  for (const [group, names] of Object.entries(expected))
    for (const name of names)
      if (!recorded[group] || !(name in recorded[group]!)) missing.push(`${group} / ${name}`)
  return missing.sort()
}

/**
 * Throws instead of writing a goldens file that would drop cases.
 *
 * @param missing - What {@link missingRecordings} returned.
 * @param file - The goldens file the run would have written.
 */
export function assertCompleteRecording(missing: string[], file: string): void {
  if (missing.length === 0) return
  throw new Error(
    `RECORD_GOLDENS did not write ${file}: ${missing.length} case(s) did not record ` +
      `(${missing.slice(0, 5).join('; ')}${missing.length > 5 ? '; …' : ''}). Run the whole ` +
      'file with no filter, and fix any failing case first.',
  )
}
