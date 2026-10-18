/**
 * A run whose own command piped its output through `tail`/`head`/`grep`/`sed`/`awk`/`cut`, so the
 * failure the runner printed is not in what came back.
 *
 * xr-molecule-flash-m147 (+10:12) sent `hurl --variable uid=… --test /tmp/t.hurl 2>&1 | tail -6`.
 * The six lines that survived are Hurl's closing tally; the failed assertion was above the cut.
 * The platform, seeing a red run with no assertion block, said the cause was "the transport or the
 * run itself" — a sentence that sends the reader at the network for a status assertion it never
 * saw. The command was in the platform's hands the whole time: the pipe is the reader's own filter,
 * not a fact about the run.
 *
 * This module answers the one question that lets a caller say so: is an output-slicing stage of
 * THIS command's pipeline sitting after the runner, and what is the command without it? The parse
 * is the package's own shell reader ({@link locatedCommandSegments}), so a `|` inside quotes or a
 * heredoc is not a stage, and only a stage of the runner's own pipeline is considered.
 *
 * @module
 */

import { type CommandSegment, locatedCommandSegments } from './command-position.js'

/**
 * The programs whose job is to re-shape what an earlier stage printed and that can DROP lines —
 * the reader's own cut, never part of the run. `tee`, `sort` and `wc` are output plumbing too, but
 * they do not hide a failure, so they are not read as the cause of a missing one.
 */
const CUTTING_FILTERS: ReadonlySet<string> = new Set(['awk', 'cut', 'grep', 'head', 'sed', 'tail'])

/** A cutting stage that follows the runner, and the command with the whole pipe removed. */
export interface RunnerOutputFilter {
  /** The stage exactly as the runner's command wrote it — `tail -6`. */
  stage: string
  /** The pipe as a sentence names it — `| tail -6`. */
  pipe: string
  /**
   * The command with the pipe and the stage removed — `hurl --variable uid=… --test /tmp/t.hurl
   * 2>&1`. This is a command to send again as written, not a re-typing of it: it is a slice of the
   * original with the filter's own range cut out, so every other word, quote and redirect stays.
   */
  command: string
}

/**
 * The output filter that follows the runner in `command`, or null when there is none.
 *
 * Only a stage of the runner's OWN pipeline counts (its separator is `|`), and only when it is the
 * LAST stage of that pipeline: a `| grep … | wc -l` chain would leave a dangling pipe if the
 * middle stage were cut out, so a chain is not answered here at all. A filter before the runner
 * (`cat run.log | tail -20 && hurl …`) reads something else's output and is not this.
 *
 * @param command - The command as the executor sent it.
 * @param runs - Whether a segment is the runner this run is about (the caller knows its own kind:
 *   {@link CommandSegment.program} is the program, once wrapper words like `timeout 280` and
 *   `npx` are taken away).
 * @param occurrence - Which runner invocation the output belongs to, 1-based. A command can run
 *   the same runner more than once (xr-molecule-flash-m170: the suite bare, then with `HOST=…`),
 *   and each invocation carries its OWN pipe; a reader judging the second walk must name the
 *   second walk's cut, never the first's.
 * @returns The filter and the unfiltered command, or null.
 */
export function outputFilterAfterRunner(
  command: string,
  runs: (segment: CommandSegment) => boolean,
  occurrence = 1,
): RunnerOutputFilter | null {
  if (typeof command !== 'string' || command.trim() === '') return null
  const entries = locatedCommandSegments(command)
  const runners: number[] = []
  entries.forEach((entry, index) => {
    if (entry.segment !== null && runs(entry.segment)) runners.push(index)
  })
  const runnerAt = runners[occurrence - 1]
  if (runnerAt === undefined || runnerAt + 1 >= entries.length) return null
  const runner = entries[runnerAt]
  const filter = entries[runnerAt + 1]
  // The stage must be fed by the runner's own pipe, and nothing may be piped out of the filter:
  // those are the two positions where cutting it out leaves a command that still runs the run.
  if (!runner || !filter || filter.separator.trim() !== '|') return null
  if (!filter.segment || !CUTTING_FILTERS.has(filter.segment.program)) return null
  if (filter.terminator.trim() === '|') return null
  if (runner.end === null || filter.start === null || filter.end === null) return null
  return {
    stage: command.slice(filter.start, filter.end),
    pipe: `| ${command.slice(filter.start, filter.end)}`,
    command: `${command.slice(0, runner.end)}${command.slice(filter.end)}`,
  }
}
