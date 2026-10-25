/**
 * Command execution on a Fly Machine, including the detach-and-poll path that
 * works around Fly's 60-second exec ceiling.
 *
 * **The constraint.** `POST /v1/apps/{app}/machines/{id}/exec` is a
 * request/response call whose `timeout` field is capped by Fly at 60 seconds —
 * a longer value is rejected outright with
 * `{"error":"timeout must not exceed 60 seconds"}`
 * (https://community.fly.io/t/extending-timeout-of-execute-command-machines-api-endpoint/26074).
 * A sandbox routinely runs commands far past that (`npm install`, a production
 * build), so a provider that only ever calls exec directly would fail every one
 * of them. That is not an acceptable gap — it is the common case.
 *
 * **The mapping.** Commands whose budget fits inside the ceiling run directly.
 * Anything longer is written to a script file inside the Machine, launched
 * detached with its stdout/stderr redirected to files and its exit status
 * written to a third file, and then POLLED with short direct execs until the
 * status file appears. The caller sees one `ExecResult` either way; the only
 * observable difference is that output arrives at the end rather than streaming
 * (which the core `exec` contract does not offer anyway).
 *
 * @module
 */

import { getLogger } from '@molecule/api-bond'
import type { ExecOptions, ExecResult } from '@molecule/api-code-sandbox'
import { t } from '@molecule/api-i18n'

import type { FlyExecResponse } from './types.js'
import { renderEnvExports, shellQuote } from './utilities.js'

const logger = getLogger()

/**
 * Fly's hard ceiling on the exec endpoint's `timeout` field, in seconds.
 * Verified against Fly staff guidance (see the module docs); a larger value is
 * rejected by the API rather than clamped.
 */
export const FLY_EXEC_MAX_TIMEOUT_SECONDS = 60

/**
 * Largest budget still run as a single direct exec, in seconds. Kept below
 * {@link FLY_EXEC_MAX_TIMEOUT_SECONDS} so the API's own timeout is never the
 * thing that fires first — the caller's timeout should be.
 */
export const DIRECT_EXEC_BUDGET_SECONDS = 55

/** Timeout applied to the short bookkeeping execs (launch, poll, collect), in seconds. */
const CONTROL_EXEC_TIMEOUT_SECONDS = 30

/** Interval between status-file polls for a detached command, in ms. */
const POLL_INTERVAL_MS = 2000

/** Default wall-clock budget for a command with no `opts.timeout`, in ms. */
const DEFAULT_TIMEOUT_MS = 600_000

/**
 * Cap on captured stdout/stderr per detached command, in bytes. The exec
 * response carries output inline as JSON, so an unbounded `cat` of a build log
 * would try to materialize the whole thing in one response body.
 */
export const MAX_CAPTURED_OUTPUT_BYTES = 5 * 1024 * 1024

/**
 * Decoded bytes read per exec call when collecting a detached command's output.
 *
 * Fly documents NO output ceiling for the Machines API: the exec response's
 * `flydv1.ExecResponse` schema types `stdout` and `stderr` as plain,
 * unconstrained strings (https://docs.machines.dev/openapi.json). The live API
 * still returns SHORT output with `exit_code: 0` once a response is large: one
 * read of a 1,421,432-byte database file came back 897,144 bytes long, exactly
 * one 512 KiB slice missing, with no error at all. So the collector asks for no
 * more than this per response and checks every response's decoded length
 * against what it asked for, shrinking the request when the transport cuts it.
 */
const COLLECT_CHUNK_BYTES = 128 * 1024

/** Smallest chunk a shortened response is re-read with, before giving up. */
const MIN_COLLECT_CHUNK_BYTES = 16 * 1024

/** Read attempts per chunk before the collection is reported as truncated. */
const COLLECT_ATTEMPTS = 4

/**
 * Base64 chunk size for spilling a large script to a file, comfortably under
 * {@link FLY_EXEC_MAX_ARG_BYTES} once the `printf … | base64 -d` wrapper is added.
 */
const SCRIPT_SPILL_CHUNK_BASE64 = 12_000

/**
 * Hard cap on the `sh -c <script>` argument SENT to Fly's exec endpoint. This is
 * NOT the OS `MAX_ARG_STRLEN` (128 KB) — the Fly Machines exec API rejects a
 * command well below that, and does so INVISIBLY: it answers `200` with
 * `exit_code: 0` and an `Unhandled rejection: Rejection([PayloadTooLarge…])`
 * body, so the command never runs yet reads as success. Measured against the
 * live API: ~15.8 KB scripts run, ~23.7 KB are rejected. 15 KB is the safe
 * ceiling; callers that move bulk data (writeFile, importFiles) chunk beneath it.
 */
export const FLY_EXEC_MAX_ARG_BYTES = 15_000

/**
 * Marker Fly puts in an exec response body when it REJECTS the command instead
 * of running it (most often {@link FLY_EXEC_MAX_ARG_BYTES} exceeded). Detected so
 * a rejection becomes a loud failure instead of a silent `exit_code: 0`.
 */
const FLY_EXEC_REJECTION = 'Rejection(['

/** Directory inside the Machine holding detached-command bookkeeping files. */
const WORK_DIR = '/tmp/.mol-exec'

/**
 * Exit code reported when a command's outcome is genuinely unknown — it was
 * still running when the caller's budget expired, or Fly returned no status.
 * Distinct from every real shell exit status (0-255), matching the Docker
 * provider's convention so callers can tell "unfinished" from "failed".
 */
export const INDETERMINATE_EXIT_CODE = -1

/** Runs one exec call against a Machine. Injected so this module stays transport-free. */
export type RawExec = (command: string[], timeoutSeconds: number) => Promise<FlyExecResponse>

/**
 * Normalizes a Fly exec response into the core `ExecResult`.
 *
 * Fly reports `exit_signal` separately from `exit_code`; a signalled process has
 * no meaningful exit code, so it is rendered the way a POSIX shell does, as
 * `128 + signal`.
 * @param response - The raw Fly exec response.
 * @returns The normalized result.
 */
export function toExecResult(response: FlyExecResponse): ExecResult {
  const stdout = response.stdout ?? ''
  const stderr = response.stderr ?? ''
  // Fly answers a REJECTED command (over-limit payload, bad method) with a 200,
  // `exit_code: 0`, and a rejection body — the command never ran. Trusting that
  // 0 silently dropped every oversized write. Surface it as a failure so
  // exit-code checks catch it instead of reporting phantom success.
  if (stderr.includes(FLY_EXEC_REJECTION) || stdout.includes(FLY_EXEC_REJECTION)) {
    return { stdout, stderr, exitCode: INDETERMINATE_EXIT_CODE }
  }
  const exitCode =
    typeof response.exit_code === 'number'
      ? response.exit_code
      : typeof response.exit_signal === 'number' && response.exit_signal > 0
        ? 128 + response.exit_signal
        : INDETERMINATE_EXIT_CODE
  return { stdout, stderr, exitCode }
}

/**
 * Builds the shell script body for a command: change directory, export the
 * requested environment, then run the command.
 * @param command - The shell command to run.
 * @param opts - Optional cwd and environment.
 * @param defaultCwd - Directory used when `opts.cwd` is unset.
 * @returns The script source, newline separated.
 */
export function buildScript(
  command: string,
  opts: ExecOptions | undefined,
  defaultCwd: string,
): string {
  const cwd = opts?.cwd ?? defaultCwd
  return [`cd ${shellQuote(cwd)} || exit 127`, ...renderEnvExports(opts?.env), command].join('\n')
}

/**
 * Generates an id for one detached run's bookkeeping files. Hex only, so it is
 * always safe to interpolate into a shell command unquoted.
 * @returns A 16-character hex id.
 */
function newRunId(): string {
  let id = ''
  while (id.length < 16) id += Math.floor(Math.random() * 0xffffffff).toString(16)
  return id.slice(0, 16)
}

/**
 * Writes `script` to `path` on the Machine via chunked base64 execs, each under
 * {@link FLY_EXEC_MAX_ARG_BYTES}.
 *
 * Fly's exec API silently drops a single over-limit `printf %s <base64>`, so a
 * script too large to pass inline (a big `node -e`, a bulk file write) must be
 * delivered in pieces. This is the transport-level equivalent of `docker cp` for
 * a command body — callers never see the limit.
 * @param rawExec - Transport callback issuing one Fly exec call.
 * @param path - Absolute destination path on the Machine.
 * @param script - The script body to stage.
 * @throws {Error} When the work dir or any chunk write fails.
 */
async function writeScriptChunked(rawExec: RawExec, path: string, script: string): Promise<void> {
  const base64 = Buffer.from(script, 'utf8').toString('base64')
  const ensure = toExecResult(
    await rawExec(['sh', '-c', `mkdir -p ${WORK_DIR}`], CONTROL_EXEC_TIMEOUT_SECONDS),
  )
  if (ensure.exitCode !== 0) {
    throw new Error(`Failed to create the Fly exec work dir: ${ensure.stderr || ensure.stdout}`)
  }
  for (let i = 0; i < base64.length; i += SCRIPT_SPILL_CHUNK_BASE64) {
    const op = i === 0 ? '>' : '>>'
    const chunk = base64.slice(i, i + SCRIPT_SPILL_CHUNK_BASE64)
    const written = toExecResult(
      await rawExec(
        ['sh', '-c', `printf %s ${shellQuote(chunk)} | base64 -d ${op} ${path}`],
        CONTROL_EXEC_TIMEOUT_SECONDS,
      ),
    )
    if (written.exitCode !== 0) {
      throw new Error(
        `Failed to stage a Fly exec script chunk: ${written.stderr || written.stdout}`,
      )
    }
  }
}

/**
 * Executes a command on a Machine, choosing the direct or detached strategy
 * based on the caller's time budget.
 *
 * A command too large to pass inline (over {@link FLY_EXEC_MAX_ARG_BYTES}) is
 * spilled to a file via chunked writes and run from there, so there is no size
 * ceiling the caller must respect.
 * @param rawExec - Transport callback issuing one Fly exec call.
 * @param command - The shell command to run.
 * @param opts - Core exec options (cwd, env, timeout in ms).
 * @param defaultCwd - Working directory used when `opts.cwd` is unset.
 * @returns The command's stdout, stderr and exit code.
 * @throws {Error} When staging a large command or the transport itself fails.
 */
export async function execCommand(
  rawExec: RawExec,
  command: string,
  opts: ExecOptions | undefined,
  defaultCwd: string,
): Promise<ExecResult> {
  const budgetMs = opts?.timeout ?? DEFAULT_TIMEOUT_MS
  const script = buildScript(command, opts, defaultCwd)

  if (budgetMs <= DIRECT_EXEC_BUDGET_SECONDS * 1000) {
    const seconds = Math.max(1, Math.min(Math.ceil(budgetMs / 1000), FLY_EXEC_MAX_TIMEOUT_SECONDS))
    // Fly's exec API silently drops a command over FLY_EXEC_MAX_ARG_BYTES. A
    // script that big cannot go inline, so spill it to a file (chunked writes,
    // each under the limit) and run that — matching docker exec, which has no
    // such ceiling. The caller stays unaware of the transport's limit.
    if (script.length > FLY_EXEC_MAX_ARG_BYTES) {
      const path = `${WORK_DIR}/direct-${newRunId()}.sh`
      await writeScriptChunked(rawExec, path, script)
      return toExecResult(
        await rawExec(['sh', '-c', `sh ${path}; ec=$?; rm -f ${path}; exit $ec`], seconds),
      )
    }
    return toExecResult(await rawExec(['sh', '-c', script], seconds))
  }

  return await execDetached(rawExec, script, budgetMs)
}

/**
 * Sizes of a detached run's two output spool files, in bytes. A file the
 * command never created reads as 0.
 * @param rawExec - Transport callback issuing one Fly exec call.
 * @param outPath - Absolute path of the stdout spool.
 * @param errPath - Absolute path of the stderr spool.
 * @returns Both byte counts.
 * @throws {Error} When the sizes cannot be read at all.
 */
async function spoolSizes(
  rawExec: RawExec,
  outPath: string,
  errPath: string,
): Promise<{ stdout: number; stderr: number }> {
  const sizes = toExecResult(
    await rawExec(
      [
        'sh',
        '-c',
        `stat -c %s ${outPath} 2>/dev/null || echo 0; stat -c %s ${errPath} 2>/dev/null || echo 0`,
      ],
      CONTROL_EXEC_TIMEOUT_SECONDS,
    ),
  )
  if (sizes.exitCode !== 0) {
    throw new Error(
      `Failed to inspect the detached command's output files: ${sizes.stderr || sizes.stdout}`,
    )
  }
  const [out, err] = sizes.stdout
    .trim()
    .split('\n')
    .map((value) => Number(value.trim()))
  return {
    stdout: Number.isFinite(out) ? out : 0,
    stderr: Number.isFinite(err) ? err : 0,
  }
}

/**
 * Reads `size` bytes of a spool file back through exec in LENGTH-CHECKED
 * chunks, shrinking the chunk whenever a response comes back short.
 *
 * One raw `head -c 5 MiB` of the spool is the shape that lost a whole slice of
 * a database in production (see {@link COLLECT_CHUNK_BYTES}): Fly truncated
 * the response and still reported success. Every chunk here is verified against
 * the number of bytes asked for, retried at half the size when it is short (a
 * truncating transport cuts at a response size, so a smaller request survives
 * it), and a chunk that will not arrive whole fails the collection by name
 * instead of returning silently shortened output.
 *
 * The bytes are base64-encoded on the Machine and decoded here as BYTES, so a
 * chunk boundary falling inside a multi-byte UTF-8 character cannot corrupt it.
 * @param rawExec - Transport callback issuing one Fly exec call.
 * @param path - Absolute path of the spool file.
 * @param size - Bytes to collect (already capped by the caller).
 * @returns The collected text.
 * @throws {Error} When a chunk cannot be read whole from the transport.
 */
async function collectSpool(rawExec: RawExec, path: string, size: number): Promise<string> {
  const parts: Buffer[] = []
  let chunkBytes = COLLECT_CHUNK_BYTES
  for (let offset = 0; offset < size;) {
    let received: Buffer | null = null
    let want = 0
    let receivedBytes = 0
    for (let attempt = 1; attempt <= COLLECT_ATTEMPTS; attempt++) {
      want = Math.min(chunkBytes, size - offset)
      const read = toExecResult(
        await rawExec(
          ['sh', '-c', `tail -c +${offset + 1} ${path} 2>/dev/null | head -c ${want} | base64 -w0`],
          CONTROL_EXEC_TIMEOUT_SECONDS,
        ),
      )
      if (read.exitCode !== 0) {
        throw new Error(
          `Failed to read the detached command's output back: ${read.stderr || read.stdout}`,
        )
      }
      const decoded = Buffer.from(read.stdout.trim(), 'base64')
      receivedBytes = decoded.length
      if (decoded.length === want) {
        received = decoded
        break
      }
      // Short: the transport cut this response. Ask for less, so the next
      // attempt fits under whatever its ceiling turns out to be.
      const nextChunkBytes = Math.max(MIN_COLLECT_CHUNK_BYTES, Math.floor(want / 2))
      logger.warn('Fly returned a short output read; retrying in a smaller chunk', {
        path,
        offset,
        want,
        received: decoded.length,
        nextChunkBytes,
        attempt,
      })
      chunkBytes = nextChunkBytes
    }
    if (received === null) {
      throw new Error(
        `The detached command's output could not be collected: the Fly exec transport ` +
          `returned ${receivedBytes} of ${want} bytes at offset ${offset} of ${path}, over ` +
          `${COLLECT_ATTEMPTS} reads with the chunk shrunk to ${chunkBytes} bytes. The command ` +
          'itself finished; this is an output-collection (transport) failure — run it again.',
      )
    }
    parts.push(received)
    offset += want
  }
  return Buffer.concat(parts).toString('utf8')
}

/**
 * Runs a script detached inside the Machine and polls for its completion.
 *
 * The script is delivered base64-encoded so that no amount of quoting in the
 * caller's command can break out of the launcher; the launcher itself only ever
 * interpolates a hex run id.
 * @param rawExec - Transport callback issuing one Fly exec call.
 * @param script - The script body to run.
 * @param budgetMs - Wall-clock budget before the result is reported indeterminate.
 * @returns The command's captured output and exit code.
 * @throws {Error} When the encoded script exceeds the single-argument limit, or
 *   when the launcher itself fails to start.
 */
async function execDetached(
  rawExec: RawExec,
  script: string,
  budgetMs: number,
): Promise<ExecResult> {
  const runId = newRunId()
  const scriptPath = `${WORK_DIR}/${runId}.sh`
  const outPath = `${WORK_DIR}/${runId}.out`
  const errPath = `${WORK_DIR}/${runId}.err`
  const rcPath = `${WORK_DIR}/${runId}.rc`

  // Stage the script via chunked writes (each under the Fly exec arg limit),
  // then launch it. A single `printf %s <base64>` would exceed the limit for a
  // large script and Fly would drop it silently. writeScriptChunked also creates
  // WORK_DIR, so the launcher below only has to background the run.
  await writeScriptChunked(rawExec, scriptPath, script)

  // The `&` must apply to the nohup line ALONE. In POSIX sh, `a && b &`
  // backgrounds the whole AND-list, so these are separate statements.
  const launcher = [
    `nohup sh -c 'sh ${scriptPath} > ${outPath} 2> ${errPath}; printf %s "$?" > ${rcPath}' > /dev/null 2>&1 < /dev/null &`,
    `printf %s ${runId}`,
  ].join('\n')

  const launch = toExecResult(await rawExec(['sh', '-c', launcher], CONTROL_EXEC_TIMEOUT_SECONDS))
  if (launch.exitCode !== 0) {
    throw new Error(
      t(
        'codeSandbox.flyio.error.launchFailed',
        { error: launch.stderr || launch.stdout },
        {
          defaultValue: `Failed to launch detached command on Fly Machine: ${launch.stderr || launch.stdout}`,
        },
      ),
    )
  }

  const deadline = Date.now() + budgetMs
  let rc: string | null = null
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
    const poll = toExecResult(
      await rawExec(
        ['sh', '-c', `cat ${rcPath} 2>/dev/null`],
        Math.max(1, Math.min(CONTROL_EXEC_TIMEOUT_SECONDS, FLY_EXEC_MAX_TIMEOUT_SECONDS)),
      ),
    )
    const value = poll.stdout.trim()
    if (value) {
      rc = value
      break
    }
  }

  // Collect the spools in length-checked chunks BEFORE any cleanup: a single
  // raw read of a large stdout is exactly what came back shortened (exit 0)
  // in production, and the spool is the only copy there is.
  const sizes = await spoolSizes(rawExec, outPath, errPath)
  const stdout = await collectSpool(
    rawExec,
    outPath,
    Math.min(sizes.stdout, MAX_CAPTURED_OUTPUT_BYTES),
  )
  const stderr = await collectSpool(
    rawExec,
    errPath,
    Math.min(sizes.stderr, MAX_CAPTURED_OUTPUT_BYTES),
  )

  if (rc === null) {
    // Still running at the deadline. The bookkeeping files are deliberately NOT
    // removed — the process owns them and will keep writing.
    logger.warn('Fly detached command exceeded its budget and is still running', {
      runId,
      budgetMs,
    })
    return { stdout, stderr, exitCode: INDETERMINATE_EXIT_CODE }
  }

  try {
    await rawExec(['sh', '-c', `rm -f ${WORK_DIR}/${runId}.*`], CONTROL_EXEC_TIMEOUT_SECONDS)
  } catch (error) {
    // Best-effort cleanup of four files under /tmp. The command itself already
    // completed and its result is in hand; failing the call over leftover
    // scratch files would turn a success into an error.
    logger.debug('Failed to clean up Fly detached command scratch files', { runId, error })
  }

  const parsed = Number.parseInt(rc, 10)
  return {
    stdout,
    stderr,
    exitCode: Number.isFinite(parsed) ? parsed : INDETERMINATE_EXIT_CODE,
  }
}
