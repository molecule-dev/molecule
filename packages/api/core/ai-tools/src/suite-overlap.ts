/**
 * The ONE rule that decides whether a suite run may start while another is already walking, and
 * the command readings both sides of it need.
 *
 * Two sites ask "may a second run start now?" about the same pair of runs — the mid-run note that
 * tells the executor what to do next while the suite it is waiting on is still going
 * ({@link ./utilities.js} `repeatingFailureNote`), and the hold that refuses the run when it
 * arrives (molecule-dev's `suite-overlap-hold.ts`) — and until xr-molecule-flash-m89 they answered
 * it separately. That run's +19:59 `wait_for_task` handed over a repeating cause with "the test
 * alone reproduces the first one … start on them now, while the run keeps walking"; 23 s later the
 * executor sent exactly that re-run, and the overlap hold refused it — "A playwright suite is
 * already running against this app and database … Wait for it." Two orders, one run, and the round
 * trip between them was the whole cost.
 *
 * So the rule lives here ({@link suiteRunInTheWay}) and both of them call it: a run may start only
 * when nothing in flight is already measuring the same app and database. What "the same app and
 * database" MEANS lives here too ({@link suiteCommandTarget}) — the note and the hold have to key
 * a command the same way before they can agree on whether two of them collide, and the re-run a
 * note hands over is built from the same reading of the running command
 * ({@link scopedRerunCommand}).
 *
 * @module
 */

/**
 * A command with its heredoc bodies removed: the runs, kills and hosts it names in a file it
 * WRITES are not what the command itself does.
 *
 * The header is kept (`cat > run.sh <<'EOF' …EOF` leaves `cat > run.sh`), which is what the
 * readers here want: everything before the body is still readable as the command's own words.
 *
 * @param command - The shell command.
 * @returns The command without its heredoc bodies.
 */
export function withoutHeredocs(command: string): string {
  return command.replace(/<<-?\s*(['"]?)(\w+)\1[\s\S]*?\n\s*\2\b/g, ' ')
}

/**
 * The server a suite command points at, as a comparable key: the host it names (`HOST=`,
 * `BASE_URL=`, `PLAYWRIGHT_BASE_URL=`, `--variable host=`, or a bare URL), or `local` for a run
 * that names none — a suite run in the sandbox goes to the sandbox's own app unless the command
 * says otherwise. Every localhost spelling collapses to `local` (one sandbox, one app, one
 * database).
 *
 * @param command - The suite command.
 * @returns The target key.
 */
export function suiteCommandTarget(command: string): string {
  const text = withoutHeredocs(command)
  const named =
    /(?:\b(?:HOST|BASE_URL|PLAYWRIGHT_BASE_URL|E2E_BASE_URL)|--variable\s+host)\s*=\s*['"]?([^\s'"|;&]+)/i.exec(
      text,
    )?.[1] ?? /https?:\/\/[^\s'"|;&]+/i.exec(text)?.[0]
  if (!named) return 'local'
  const value = named.trim()
  let host: string
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `http://${value}`)
    host = url.hostname.toLowerCase()
    if (!/^(?:localhost|127\.0\.0\.1|0\.0\.0\.0|::1|\[::1\])$/.test(host))
      return url.port ? `${host}:${url.port}` : host
  } catch (_error) {
    // Not a URL at all (a shell variable the command does not expand): compare
    // the token itself, so the same spelling still reads as the same target.
    return value.toLowerCase()
  }
  return 'local'
}

/**
 * The whole-suite command made scoped to the tests it should re-run instead: the same
 * invocation — same directory, same settings — with the named `file:line`s in place of the whole
 * suite, `--last-failed` dropped (it re-runs the tests that never ran too, X1 flash-m60) and
 * `--retries=0` set (a re-run of a known failure does not need to pay for retries).
 *
 * @param command - The whole-suite run's command.
 * @param locations - The failing `file:line`s to re-run, as the run's own log printed them — or,
 *   for a run that started outside the suite, the absolute form Playwright matches each file
 *   argument against.
 * @returns The scoped command, or the command unchanged when it runs no Playwright suite.
 */
export function scopedRerunCommand(command: string, locations: readonly string[]): string {
  const at = command.search(/\bplaywright\s+test\b/)
  if (at === -1) return command
  const head = command.slice(0, at)
  const rest = command.slice(at)
  // Only the first statement runs the suite; the rest (`| tail -50`, `&& echo done`)
  // is left exactly as it was.
  const end = rest.search(/&&|\|\||;|\|/)
  const statement = end === -1 ? rest : rest.slice(0, end)
  const tail = end === -1 ? '' : rest.slice(end)
  const scoped = statement
    .replace(/\s*--last-failed\b/g, '')
    .replace(/\s*--retries(?:[= ]\d+)?/g, '')
    .replace(/^(playwright\s+test)\b/, `$1 ${locations.join(' ')} --retries=0`)
  return `${head}${scoped}${tail}`
}

/**
 * One suite run, as the rule that decides whether a second may start beside it reads it.
 *
 * Both callers describe the runs in flight the same way and ask the same question of them; what
 * differs is only which runs each one knows about — the hold reads its ledger of background runs,
 * the note reads the one run it is waiting on.
 */
export interface SuiteRunInFlight {
  /** Whether the run invokes a suite at all: a `vitest`/`jest` run is not one, and cannot be. */
  runsSuite: boolean
  /** The app and database the run measures, as {@link suiteCommandTarget} keys it. */
  target: string
  /**
   * Whether the command being judged STOPS this run before starting its own — a kill comes first,
   * so a run the command itself stops is not in the way (xr-molecule-flash-m87's
   * `kill 19408 … ; npx playwright test …`).
   */
  stoppedByCommand?: boolean
}

/**
 * The run in flight that makes a second run a hazard, or null when nothing is in the way.
 *
 * This is the ONE rule the mid-run note and the suite-overlap hold both answer with: a suite run
 * may start only when this returns null, because two suites against one app and database share its
 * rows — the failures one causes the other cannot be told from real ones. A run that invokes no
 * suite is never in the way, and neither is one the candidate command stops first.
 *
 * @param candidate - The run about to start, by the app and database it would measure
 *   ({@link suiteCommandTarget}).
 * @param inFlight - The suite runs already going, in the order the caller found them.
 * @returns The first run in the way, or null.
 */
export function suiteRunInTheWay<T extends SuiteRunInFlight>(
  candidate: { target: string },
  inFlight: readonly T[],
): T | null {
  return (
    inFlight.find(
      (run) => run.runsSuite && run.target === candidate.target && !run.stoppedByCommand,
    ) ?? null
  )
}
