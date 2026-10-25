/**
 * A run whose own command piped its output through `tail`/`head`/`grep`/`sed`/`awk`/`cut`, so the
 * failure the runner printed is not in what came back.
 *
 * A command sent `hurl --variable uid=… --test /tmp/t.hurl 2>&1 | tail -6`.
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

import {
  type CommandSegment,
  type LocatedCommandSegment,
  locatedCommandSegments,
} from './command-position.js'

/**
 * The programs whose job is to re-shape what an earlier stage printed and that can DROP lines —
 * the reader's own cut, never part of the run. `tee`, `sort` and `wc` are output plumbing too, but
 * they do not hide a failure, so they are not read as the cause of a missing one.
 */
const CUTTING_FILTERS: ReadonlySet<string> = new Set(['awk', 'cut', 'grep', 'head', 'sed', 'tail'])

/** A cutting stage that follows the runner, and the command with the whole pipe removed. */
export interface RunnerOutputFilter {
  /**
   * The stage exactly as the runner's command wrote it — `tail -6`. When several cutting filters
   * follow the runner, this is the whole trailing chain as written, pipes included:
   * `grep -E "Failure|actual" | head -40`.
   */
  stage: string
  /** The pipe as a sentence names it — `| tail -6`, or the whole chain `| grep … | head -40`. */
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
 * Only stages of the runner's OWN pipeline count (their separator is `|`), and they are read as
 * one trailing CHAIN: `| grep … | head -40` is two cuts, and removing only the first would leave
 * the run piped into the second. Every stage after the runner must be a cutting filter and the
 * chain must run to the pipeline's end — a pipeline that continues into `wc -l` is not answered
 * here, because removing the cutting stages alone would still leave the failure hidden. A filter
 * before the runner (`cat run.log | tail -20 && hurl …`) reads something else's output and is not
 * this.
 *
 * @param command - The command as the executor sent it.
 * @param runs - Whether a segment is the runner this run is about (the caller knows its own kind:
 *   {@link CommandSegment.program} is the program, once wrapper words like `timeout 280` and
 *   `npx` are taken away).
 * @param occurrence - Which runner invocation the output belongs to, 1-based. A command can run
 *   the same runner more than once (the suite bare, then with `HOST=…`),
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
  if (runnerAt === undefined) return null
  const runner = entries[runnerAt]
  if (!runner || runner.end === null) return null
  // The chain is every stage fed by the runner's own pipe, until the pipeline ends. Each one has
  // to be a cutting filter: a stage that does not drop lines ends the chain, and the chain then
  // stops before the pipeline's end — which is not answerable (`| grep … | wc -l` would still
  // hide the assertion in a count).
  const chain: LocatedCommandSegment[] = []
  for (let index = runnerAt + 1; index < entries.length; index++) {
    const entry = entries[index]
    if (!entry || entry.separator.trim() !== '|') break
    if (!entry.segment || !CUTTING_FILTERS.has(entry.segment.program)) break
    chain.push(entry)
    if (entry.terminator.trim() !== '|') break
  }
  const first = chain[0]
  const last = chain[chain.length - 1]
  if (!first || !last) return null
  // A pipeline that continues past the chain means a non-cutting stage sits after it.
  if (last.terminator.trim() === '|') return null
  if (first.start === null || last.end === null) return null
  const stage = command.slice(first.start, last.end)
  return {
    stage,
    pipe: `| ${stage}`,
    command: `${command.slice(0, runner.end)}${command.slice(last.end)}`,
  }
}
