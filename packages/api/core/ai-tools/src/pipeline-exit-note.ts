/**
 * The exit code a hand-run check's result carries is the pipeline's LAST stage's, and a weak
 * executor reads the number as the check's verdict.
 *
 * `npx tsc --noEmit 2>&1 | head -40` reports `head`'s 0 while the output above it carries a type
 * error, and `… | head -40 && tail -30 missing.log` reports `tail`'s 1 while the checker was clean —
 * both are the same reading. A model that trusts the code concludes
 * "clean" and ships a build that does not compile, or hunts an error that is not there. This module
 * says which stage produced the code, and what the output actually carries, in one sentence beside
 * `exitCode`.
 *
 * The parse is the package's own shell reader ({@link locatedCommandSegments}), so a `|` inside
 * quotes or a heredoc is not a stage, and `set -o pipefail` (where it really runs) turns the note
 * off: then the code IS the check's.
 *
 * @module
 */

import { locatedCommandSegments } from './command-position.js'

/** The shells whose `-o pipefail` makes a pipeline report its first failing stage. */
const PIPEFAIL_SHELLS: ReadonlySet<string> = new Set(['ash', 'bash', 'dash', 'ksh', 'sh', 'zsh'])

/**
 * The programs a pipeline may end with when all they do is read what was printed and print it
 * again — the stages that hand back their own status in place of the check's.
 */
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

/** One checker: how a segment is read as running it, and how its output counts failures. */
interface Checker {
  /** The name the note uses (`tsc`). */
  name: string
  /** Whether this segment runs the checker. */
  runs: (program: string, text: string) => boolean
  /** How many failures the checker's output names (0 when it printed a clean run). */
  failures: (output: string) => number
  /** The failures as the note says them (`1 type error`, `3 failing tests`). */
  label: (count: number) => string
}

/** `1 type error` / `2 type errors`. */
const plural = (count: number, one: string, many: string): string =>
  `${count} ${count === 1 ? one : many}`

/**
 * The failure count a runner's tally names. Vitest prints two tallies — `Test Files  1 failed`
 * above `Tests  2 failed` — and the last one is the tests, which is the number the note means.
 *
 * @param output - The runner's output.
 * @returns The count in the last `N failed` tally, or 0.
 */
const failedTally = (output: string): number => {
  const tallies = [...output.matchAll(/\b(\d+) failed\b/g)]
  return Number(tallies.at(-1)?.[1] ?? 0)
}

/** The checkers whose output says pass or fail in text of its own. */
const CHECKERS: readonly Checker[] = [
  {
    name: 'tsc',
    runs: (program) => program === 'tsc' || program === 'vue-tsc',
    failures: (output) => {
      const errors = output.match(/\berror TS\d+/g)?.length ?? 0
      if (errors > 0) return errors
      const found = /\bFound (\d+) errors?/.exec(output)
      return found ? Number(found[1]) : 0
    },
    label: (count) => plural(count, 'type error', 'type errors'),
  },
  {
    name: 'eslint',
    runs: (program) => program === 'eslint',
    failures: (output) => {
      const problems = /✖\s*(\d+)\s+problems?/.exec(output)
      return problems ? Number(problems[1]) : 0
    },
    label: (count) => plural(count, 'lint problem', 'lint problems'),
  },
  {
    name: 'vitest',
    runs: (program) => program === 'vitest',
    failures: failedTally,
    label: (count) => plural(count, 'failing test', 'failing tests'),
  },
  {
    name: 'playwright',
    runs: (_program, text) => /^playwright\s+test\b/.test(text),
    failures: failedTally,
    label: (count) => plural(count, 'failing test', 'failing tests'),
  },
]

/** Whether the command turns on `pipefail`, so a pipeline reports the check's own status. */
function guardedByPipefail(
  segments: ReadonlyArray<{ program: string; args: readonly string[] }>,
): boolean {
  return segments.some(
    ({ program, args }) =>
      (program === 'set' || PIPEFAIL_SHELLS.has(program)) && args.includes('pipefail'),
  )
}

/**
 * The sentence an `exec_command` result carries beside `exitCode` when the code belongs to a
 * pipeline's last stage rather than to the check that printed the output.
 *
 * Two shapes, both from a hand-run check with an unguarded pipe:
 *
 * - the code says 0 and the output carries failures (`tsc | head` reports `head`'s 0);
 * - the code is non-zero and the checker printed no failures (`tsc | head && tail missing.log`
 *   reports `tail`'s 1, and the checker was clean).
 *
 * A command with no pipe, a pipe guarded by `pipefail`, a pipeline where no checker runs, or a
 * code and an output that agree all return null.
 *
 * @param command - The command as the executor sent it.
 * @param exitCode - The code the shell reported (the pipeline's last stage's).
 * @param output - The command's raw stdout and stderr, for the checker's own text.
 * @returns One sentence naming the stage the code came from, or null.
 */
export function pipelineExitCodeNote(
  command: string,
  exitCode: number,
  output: string,
): string | null {
  const running = locatedCommandSegments(command).filter((entry) => entry.segment !== null)
  if (running.length < 2) return null
  if (!running.some((entry) => entry.separator.trim() === '|')) return null
  const segments = running.map((entry) => entry.segment!)
  if (guardedByPipefail(segments)) return null
  let checkerAt = -1
  for (let i = segments.length - 1; i >= 0; i -= 1) {
    const segment = segments[i]!
    if (CHECKERS.some((checker) => checker.runs(segment.program, segment.text))) {
      checkerAt = i
      break
    }
  }
  if (checkerAt < 0) return null
  // The check's own status is lost only when a stage of the SAME pipeline follows it; a `&&` after
  // the check already reports a real failure of its own, and a check followed by nothing reports
  // its own code.
  if (running[checkerAt + 1]?.separator.trim() !== '|') return null
  const checkerSegment = segments[checkerAt]!
  const checker = CHECKERS.find((candidate) =>
    candidate.runs(checkerSegment.program, checkerSegment.text),
  )!
  const last = segments[segments.length - 1]!
  const failures = checker.failures(output)
  if (exitCode === 0 && failures > 0) {
    return (
      `the exit code 0 is the last stage's (${last.program}), not ${checker.name}'s — ` +
      `the output carries ${checker.label(failures)}`
    )
  }
  if (exitCode !== 0 && failures === 0 && OUTPUT_ONLY_FILTERS.has(last.program)) {
    return (
      `the exit code ${exitCode} is the last stage's (${last.program}), not ${checker.name}'s — ` +
      'the checker printed no errors'
    )
  }
  return null
}
