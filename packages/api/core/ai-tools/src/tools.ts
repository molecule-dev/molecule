/**
 * Tool factory — builds AITool[] from schemas + ExecutionBackend.
 *
 * Each tool's execute() delegates to the backend for I/O,
 * with shared validation, path resolution, and output formatting.
 *
 * @module
 */

import type { AITool } from '@molecule/api-ai'

import { guardToolExecute, missingParamError } from './input-normalizer.js'
import { TOOL_SCHEMAS } from './schemas.js'
import type { ExecutionBackend, ToolBuildConfig } from './types.js'
import {
  checkBlockedCommand,
  declaredBudgetSeconds,
  DEFAULT_SEARCH_EXCLUDED_DIRS,
  directoryReadHint,
  isEnvFilePath,
  isValidGlob,
  MAX_BATCH_READ_BYTES,
  MAX_BATCH_READ_FILES,
  MAX_FIND_RESULTS,
  MAX_OUTPUT_SIZE,
  MAX_READ_RETURN_CHARS,
  MAX_READ_SIZE,
  MAX_SEARCH_CONTEXT_LINES,
  MAX_SEARCH_RESULTS,
  MAX_WRITE_SIZE,
  outputIsWithheldUntilExit,
  pathArgError,
  redactSecrets,
  redactSecretsInCode,
  resolvePath,
  shellQuote,
  sliceLines,
  stripControlChars,
  truncateMiddle,
  whitespaceTolerantReplace,
} from './utilities.js'

/**
 * Build a complete set of AI agent tools bound to an execution backend.
 *
 * @param backend - The execution environment (sandbox or local filesystem)
 * @param config - Optional configuration for security, callbacks, and tool selection
 * @returns Array of AITool objects ready to pass to an AI provider
 */
export function buildTools(backend: ExecutionBackend, config?: ToolBuildConfig): AITool[] {
  const {
    include,
    exclude,
    pathGuards = true,
    symlinkGuards = false,
    redactSecrets: doRedact = true,
    blockDangerousCommands = false,
    blockCommand,
    execTimeoutMs = 120_000,
    commandBudgetMs,
    searchExcludedDirs,
    onAfterWrite,
    onFileDiff,
    onFileChange,
  } = config ?? {}

  const root = backend.projectRoot

  // A host-filesystem backend with escape guards off is the combination the
  // audit flagged: `pathGuards` off lets `..` paths out of the workspace,
  // and `symlinkGuards` off lets a workspace SYMLINK redirect reads/writes
  // anywhere on the host (npm-workspace layouts are full of such symlinks).
  // Defaults are deliberately unchanged — but the state must be LOUD, not
  // silent: one warn per buildTools() call, naming the exact gaps.
  if (backend.hostFs && (!pathGuards || !symlinkGuards)) {
    const off = [!pathGuards ? '`pathGuards`' : null, !symlinkGuards ? '`symlinkGuards`' : null]
      .filter(Boolean)
      .join(' and ')
    console.warn(
      `[ai-tools] ${off} disabled on a LOCAL-HOST backend (root ${backend.projectRoot}) — ` +
        'model-driven file operations can escape the workspace via `..` paths or symlinks ' +
        'into the host filesystem. Contained agent runs should use the sandbox backend; ' +
        'host runs should enable both guards.',
    )
  }

  // One synchronized excluded-dir set for BOTH search tools (VS Code
  // `search.exclude` semantics). Names are validated defensively — they are
  // interpolated into shell commands, so anything outside the safe charset is
  // dropped rather than quoted around.
  const excludedDirs = (
    searchExcludedDirs && searchExcludedDirs.length > 0
      ? searchExcludedDirs
      : DEFAULT_SEARCH_EXCLUDED_DIRS
  ).filter((d) => /^[A-Za-z0-9._-]+$/.test(d))
  const grepExcludeArgs = excludedDirs.map((d) => `--exclude-dir=${shellQuote(d)}`).join(' ')
  const findExcludeArgs = excludedDirs.map((d) => `-not -path ${shellQuote(`*/${d}/*`)}`).join(' ')

  // ── Path helpers ───────────────────────────────────────────────

  /**
   * Resolve a workspace-relative path using optional path guards.
   *
   * @param path - Relative or absolute path requested by the tool input.
   * @returns A normalized path honoring `pathGuards` and the backend root.
   */
  function resolve(path: string): string {
    return pathGuards ? resolvePath(path, root) : path
  }

  /**
   * Verify that `path` does not symlink outside the project root when guards are enabled.
   *
   * @param path - Candidate filesystem path after `resolve()`.
   * @returns An error message when unsafe, otherwise `null`.
   */
  async function checkSymlink(path: string): Promise<string | null> {
    if (!symlinkGuards) return null
    try {
      const result = await backend.run(
        `readlink -f ${shellQuote(path)} 2>/dev/null || echo ${shellQuote(path)}`,
        { timeout: 5000 },
      )
      const realPath = result.stdout.trim()
      if (realPath && realPath !== root && !realPath.startsWith(root + '/')) {
        return 'Access denied: path resolves outside the project workspace'
      }
      return null
    } catch (_error) {
      // readlink unavailable or timed out — deny access conservatively
      return 'Unable to verify path safety — access denied'
    }
  }

  /**
   * Strip control characters and optionally redact secrets from tool output.
   *
   * @param s - Raw stdout/stderr or file contents to sanitize.
   * @returns A sanitized string safe to return to the model or UI.
   */
  function sanitizeOutput(s: string): string {
    let result = stripControlChars(s)
    if (doRedact) result = redactSecrets(result)
    return result
  }

  /**
   * Sanitize FILE CONTENT for return to the model. Unlike {@link sanitizeOutput},
   * this uses the code-safe redactor for ordinary source files — the name-keyed
   * JSON passes destroy legitimate code, and the agent writes back what it reads,
   * so an over-redacted read corrupts the user's project on the next write. Env
   * files still get the full env-dump treatment, since that is where the shape
   * those passes detect actually indicates a credential.
   *
   * @param s - Raw file contents.
   * @param path - The file's path, used to decide the redaction grade.
   * @returns Content safe to return to the model, with code preserved verbatim.
   */
  function sanitizeFileContent(s: string, path: string): string {
    let result = stripControlChars(s)
    if (doRedact) result = isEnvFilePath(path) ? redactSecrets(result) : redactSecretsInCode(result)
    return result
  }

  // ── Empty-read verification ────────────────────────────────────

  /**
   * The file's size in bytes as the backend's own shell reports it, or `null`
   * when that could not be established (the probe failed, timed out, or printed
   * something unparseable).
   *
   * `null` means "I could not look" and is deliberately DISTINCT from `0` ("I
   * looked and the file is empty") — conflating the two is the very failure this
   * probe exists to prevent. The last integer in stdout is taken rather than the
   * whole string, so a consumer that wraps commands in environment sourcing
   * cannot break the parse with stray output.
   *
   * @param path - The already-resolved, symlink-checked path.
   * @returns The byte count, or null when it could not be determined.
   */
  async function probeFileSize(path: string): Promise<number | null> {
    try {
      const result = await backend.run(`wc -c < ${shellQuote(path)}`, { timeout: 10_000 })
      if (result.exitCode !== 0) return null
      const match = /(\d+)\s*$/.exec(result.stdout)
      if (!match) return null
      const bytes = Number.parseInt(match[1], 10)
      return Number.isFinite(bytes) ? bytes : null
    } catch (_error) {
      // The probe is the cross-check for an ALREADY-suspect read; if it cannot
      // run we must report "unverified", never "empty" — returning 0 here would
      // reintroduce exactly the conflation this function exists to remove.
      return null
    }
  }

  /**
   * Decide what an EMPTY string from `backend.readFile` actually means.
   *
   * A backend read can come back empty without throwing: a sandbox exec whose
   * output stream ends early still reports the process's own exit code, an HTTP
   * file read can return a 200 with no body, and a concurrent writer can be
   * observed mid-truncate. Observed in production on 2026-09-16 (X0 rehearsal
   * 84): several `read_file` calls on two real components returned no content
   * while an exec shell showed both files present at 3,617 and 25,746 bytes; a
   * later read of the same paths succeeded, so the failure was transient.
   *
   * Returning `{ content: '' }` for that is indistinguishable from a successful
   * read of an empty file — and a model that believes a file is empty writes it
   * from scratch, destroying work it never saw. So an empty read is verified
   * against the file's real size before it is reported as content: genuinely
   * empty is returned as empty and SAID so; non-empty is retried once and then
   * reported as a FAILED read; unverifiable is also a failure, never an empty
   * file.
   *
   * @param path - The already-resolved, symlink-checked path.
   * @param tool - The calling tool's name, for the error message.
   * @returns The file's real content (possibly empty, with a note), or an error.
   */
  async function classifyEmptyRead(
    path: string,
    tool: string,
  ): Promise<{ content: string; note?: string } | { error: string }> {
    const bytes = await probeFileSize(path)
    if (bytes === 0) {
      return {
        content: '',
        note: `${path} exists and is EMPTY (0 bytes) — that is the file's real content, not a failed read.`,
      }
    }
    if (bytes === null) {
      return {
        error:
          `${tool} obtained NO CONTENT for ${path}, and could not confirm the file's size ` +
          `(the \`wc -c ${path}\` probe failed), so this may be a FAILED read rather than an ` +
          `empty file. Do NOT write or edit ${path} from memory or from the plan — that would ` +
          `overwrite a file you have never seen. Call read_file again, or run \`cat ${path}\` ` +
          `with exec_command, and only proceed once you actually have its contents.`,
      }
    }
    // Non-empty on disk: the read failed, and the observed failure is transient —
    // so retry it once here rather than spending an executor turn on it.
    try {
      const retry = await backend.readFile(path)
      if (typeof retry === 'string' && retry !== '') {
        return {
          content: retry,
          note: `The first read of ${path} returned nothing; this content came from an immediate retry.`,
        }
      }
    } catch (_error) {
      // The retry's own failure adds nothing to the message below — the size
      // probe is the authoritative fact, and it already said the file has bytes.
    }
    return {
      error:
        `${tool} obtained NO CONTENT for ${path}, but the file is ${bytes} bytes on disk — the ` +
        `read FAILED, this is not an empty file (a retry returned nothing either). Do NOT write ` +
        `or edit ${path} from memory or from the plan — that would overwrite a file you have ` +
        `never seen. Call read_file again, or run \`cat ${path}\` with exec_command, and only ` +
        `proceed once you actually have its contents.`,
    }
  }

  // ── Diff computation ───────────────────────────────────────────

  /**
   * Compute a lightweight diff summary for telemetry and UI badges.
   *
   * @param oldContent - Previous file contents, or `null` when creating a file.
   * @param newContent - Replacement file contents after a write/edit.
   * @returns Counts describing whether the file was created or modified.
   */
  function computeDiff(
    oldContent: string | null,
    newContent: string,
  ): { type: 'created' | 'modified'; linesAdded: number; linesRemoved: number } {
    if (oldContent === null) {
      return { type: 'created', linesAdded: newContent.split('\n').length, linesRemoved: 0 }
    }
    const oldLines = oldContent.split('\n')
    const newLines = newContent.split('\n')
    return {
      type: 'modified',
      linesAdded: Math.max(0, newLines.length - oldLines.length),
      linesRemoved: Math.max(0, oldLines.length - newLines.length),
    }
  }

  // ── Tool implementations ───────────────────────────────────────

  /**
   * Read ONE file with every DWIM behavior read_file offers (directory
   * listing, ENOENT parent listing, empty-read classification). Shared by the
   * single-path and batched forms of the tool.
   *
   * @param rawPath - The path as the model sent it.
   * @returns The same result shape read_file returns for one file.
   */
  /** How many leading lines of `content` fit in `chars` (at least one). */
  function linesWithin(content: string, chars: number): number {
    let used = 0
    let lines = 0
    for (const line of content.split('\n')) {
      used += line.length + 1
      if (used > chars && lines > 0) break
      lines++
    }
    return Math.max(1, lines)
  }

  /**
   *
   */
  async function readOneFile(
    rawPath: unknown,
    window?: { offset?: unknown; limit?: unknown },
  ): Promise<unknown> {
    const argErr = pathArgError(rawPath, 'read_file')
    if (argErr) return { error: argErr }
    const path = resolve(rawPath as string)
    const symlinkErr = await checkSymlink(path)
    if (symlinkErr) return { error: symlinkErr }
    try {
      const content = await backend.readFile(path)
      // A read that produced no usable text is verified against the file's real
      // size before it can be reported as content (see classifyEmptyRead). The
      // non-string arm covers a backend whose transport handed back an empty
      // body as `undefined`; `content.length` below would otherwise raise an
      // unactionable "Cannot read properties of undefined".
      if (typeof content !== 'string' || content === '') {
        const verdict = await classifyEmptyRead(path, 'read_file')
        if ('error' in verdict) return verdict
        return {
          path,
          content: sanitizeFileContent(verdict.content, path),
          ...(verdict.content === '' ? { empty: true } : {}),
          ...(verdict.note ? { note: verdict.note } : {}),
        }
      }
      if (content.length > MAX_READ_SIZE)
        return {
          error: `File too large (${Math.round(content.length / 1024)}KB). Maximum is ${MAX_READ_SIZE / 1024 / 1024}MB.`,
        }
      // No window asked for and the file is bigger than one call should hand
      // back: return its first window, sized to the ceiling, and say so. The
      // model can read on with offset/limit; it cannot un-send 300k tokens.
      const effectiveWindow =
        !sliceLines(content, window) && content.length > MAX_READ_RETURN_CHARS
          ? { offset: 1, limit: linesWithin(content, MAX_READ_RETURN_CHARS) }
          : window
      const windowed = sliceLines(content, effectiveWindow)
      if (windowed) {
        return {
          path,
          content: sanitizeFileContent(windowed.text, path),
          offset: windowed.offset,
          lines: windowed.lines,
          totalLines: windowed.totalLines,
          ...(windowed.truncated
            ? {
                note:
                  `Lines ${windowed.offset}-${windowed.offset + windowed.lines - 1} of ` +
                  `${windowed.totalLines}. Read another window with offset/limit.`,
              }
            : {}),
        }
      }
      return { path, content: sanitizeFileContent(content, path) }
    } catch (e: unknown) {
      // Backends (e.g. the docker provider's `cat`) already prefix "Failed to read <path>: ";
      // strip it so the wrap below doesn't stutter ("Failed to read X: Failed to read X: …").
      const rawMessage = (e as Error).message
      const prefix = `Failed to read ${path}: `
      const message = rawMessage.startsWith(prefix) ? rawMessage.slice(prefix.length) : rawMessage
      // A weak model often read_file's a directory (handlers/, migrations/). Rather than
      // erroring and costing it a retry loop (observed: 3 such misses + follow-up
      // list_files in one custom build), DWIM: return the directory's listing — what it
      // almost certainly wanted — with a note so it read_file's a specific entry next.
      if (directoryReadHint(message, path)) {
        try {
          const entries = await backend.readDir(path)
          return {
            path,
            isDirectory: true,
            note: `${path} is a directory, not a file — returning its contents. read_file a specific entry inside it to see that file's content.`,
            entries: entries.map((entry) => ({ name: entry.name, type: entry.type })),
          }
        } catch (_dirErr) {
          // readDir also failed — fall through to the steer-to-list_files hint below.
        }
      }
      // ENOENT DWIM: a weak model GUESSES paths from framework priors (observed: 65 of 89
      // reads in one imported-app build were misses on files that never existed). Return
      // ground truth in the SAME result — what the parent directory actually contains — so
      // the next read uses a real name instead of another guess.
      if (/No such file or directory/i.test(message)) {
        const parent = path.replace(/\/[^/]*$/, '') || '/'
        let listing: string
        try {
          const entries = await backend.readDir(parent)
          const names = entries
            .slice(0, 40)
            .map((entry) => entry.name + (entry.type === 'directory' ? '/' : ''))
          listing = names.length
            ? `The directory ${parent} exists and contains: ${names.join(', ')}${entries.length > 40 ? ', …' : ''}.`
            : `The directory ${parent} exists but is EMPTY.`
        } catch (_parentErr) {
          // Parent listing failed too — most usefully because it doesn't exist either.
          listing = `The directory ${parent} does not exist either.`
        }
        return {
          error: `No such file: ${path}. ${listing} Read one of the real entries (or use find_files) — do not guess paths.`,
        }
      }
      return { error: directoryReadHint(message, path) ?? `Failed to read ${path}: ${message}` }
    }
  }

  const toolImpls: Record<string, (input: Record<string, unknown>) => Promise<unknown>> = {
    async list_files(input) {
      const path = resolve((input.path as string) || '')
      const symlinkErr = await checkSymlink(path)
      if (symlinkErr) return { error: symlinkErr }
      try {
        const entries = await backend.readDir(path)
        return { path, entries: entries.map((e) => ({ name: e.name, type: e.type })) }
      } catch (e: unknown) {
        return { error: `Failed to list ${path}: ${(e as Error).message}` }
      }
    },

    async read_file(input) {
      // Several paths in ONE call. The executor issues one tool call per model
      // round-trip 89% of the time (X0: 464 assistant messages, 515 tool calls,
      // a ~10s mean gap), so a turn's wall clock IS its round-trip count — and
      // the largest single block measured was a systematic scaffold survey:
      // 121 sequential read_file calls, 108 of them in the first ten minutes,
      // across 93 distinct files. The same reads batched cost the same tokens
      // and a tenth of the latency.
      if (Array.isArray(input.paths)) {
        const requested = (input.paths as unknown[]).map((p) => String(p ?? '')).filter(Boolean)
        if (requested.length === 0) {
          return {
            error:
              'read_file got an empty "paths" array. Pass "path" for one file, or "paths" with at ' +
              'least one path for several.',
          }
        }
        const files: unknown[] = []
        let budget = MAX_BATCH_READ_BYTES
        let stoppedAt: string | null = null
        for (const [index, requestedPath] of requested.entries()) {
          if (index >= MAX_BATCH_READ_FILES || budget <= 0) {
            stoppedAt = requestedPath
            break
          }
          const one = (await readOneFile(requestedPath, input)) as { content?: unknown }
          files.push(one)
          if (typeof one.content === 'string') budget -= one.content.length
        }
        return {
          files,
          ...(stoppedAt
            ? {
                note:
                  `Stopped after ${files.length} of ${requested.length} files (limit: ${MAX_BATCH_READ_FILES} ` +
                  `files or ${Math.round(MAX_BATCH_READ_BYTES / 1024)}KB per call). Call read_file again ` +
                  `starting at ${stoppedAt}.`,
              }
            : {}),
        }
      }
      return readOneFile(input.path, input)
    },

    async write_file(input) {
      const argErr = pathArgError(input.path, 'write_file')
      if (argErr) return { error: argErr }
      const path = resolve(input.path as string)
      const content = input.content as string
      if (content.length > MAX_WRITE_SIZE)
        return {
          error: `Content too large (${Math.round(content.length / 1024)}KB). Maximum is ${MAX_WRITE_SIZE / 1024 / 1024}MB.`,
        }
      const symlinkErr = await checkSymlink(path)
      if (symlinkErr) return { error: symlinkErr }
      try {
        let oldContent: string | null = null
        try {
          oldContent = await backend.readFile(path)
        } catch (_error) {
          /* file doesn't exist yet — oldContent stays null */
        }

        if (onFileDiff) onFileDiff({ path, oldContent, newContent: content })

        await backend.writeFile(path, content)
        if (onAfterWrite) await onAfterWrite(path).catch(() => {})

        const finalContent = await backend.readFile(path).catch(() => content)
        const diff = computeDiff(oldContent, finalContent)

        if (onFileChange) onFileChange({ type: oldContent === null ? 'created' : 'modified', path })

        return { path, ok: true, diff }
      } catch (e: unknown) {
        return { error: `Failed to write ${path}: ${(e as Error).message}` }
      }
    },

    async edit_file(input) {
      const argErr = pathArgError(input.path, 'edit_file')
      if (argErr) return { error: argErr }
      const path = resolve(input.path as string)
      // Support both formats: { replacements: [...] } (batch) and { old_string, new_string } (single, backwards-compatible)
      let replacements = input.replacements as
        Array<{ old_string: string; new_string: string }> | undefined
      // Accept the single format when BOTH are strings — `typeof` (not truthy) so
      // a deletion (new_string: "") is honoured rather than falling through to
      // "No replacements provided".
      if (
        !replacements?.length &&
        typeof input.old_string === 'string' &&
        typeof input.new_string === 'string'
      ) {
        replacements = [{ old_string: input.old_string, new_string: input.new_string }]
      }
      if (!replacements?.length)
        return {
          error:
            'No replacements provided. Use { replacements: [{ old_string, new_string }] } or { old_string, new_string }.',
        }
      const symlinkErr = await checkSymlink(path)
      if (symlinkErr) return { error: symlinkErr }
      try {
        let content = await backend.readFile(path)
        // A transiently-empty read here made every old_string "not found", which
        // steers the model to re-read and then rewrite a file it never saw. Same
        // verification as read_file: empty is only believed once it is confirmed.
        if (typeof content !== 'string' || content === '') {
          const verdict = await classifyEmptyRead(path, 'edit_file')
          if ('error' in verdict) return verdict
          content = verdict.content
        }
        const oldContent = content

        for (const { old_string: oldString, new_string: newString } of replacements) {
          // Validate each replacement is well-formed BEFORE touching content. A
          // weak model sometimes emits a batch element missing a field or with a
          // non-string value; left unchecked that either crashes (`undefined`
          // method access) or silently inserts the literal "undefined" (a missing
          // new_string). Fail fast with an actionable message instead.
          if (typeof oldString !== 'string' || oldString === '' || typeof newString !== 'string') {
            return {
              error: `edit_file: each replacement needs a non-empty string old_string and a string new_string (got old_string: ${oldString === '' ? 'empty' : typeof oldString}, new_string: ${typeof newString}). To delete text, pass new_string: "".`,
            }
          }
          const count = content.split(oldString).length - 1
          if (count === 0) {
            // A bare "old_string not found" gives the model nothing to correct, so
            // it retries blindly (the #1 edit_file failure mode). Diagnose WHY the
            // match failed and hand back the file's actual content so it fixes in
            // one retry instead of many.
            if (oldString.includes('\\n')) {
              return {
                error: `old_string not found in ${path} (hint: old_string contains literal "\\n" — use actual newlines in JSON strings, not escaped \\n)`,
              }
            }
            // Whitespace-only mismatch: the text is there but indentation/spacing
            // differs (tabs vs spaces, trailing whitespace). If a UNIQUE line-run
            // matches ignoring per-line whitespace, APPLY it instead of bouncing
            // the (weak) executor into a re-read/retry loop — the #1 edit_file
            // churn source. Uniqueness keeps this safe; ambiguous matches error.
            const fuzzy = whitespaceTolerantReplace(content, oldString, newString)
            if (fuzzy !== null) {
              content = fuzzy
              continue
            }
            const normalize = (s: string): string => s.replace(/\s+/g, ' ').trim()
            const normOld = normalize(oldString)
            if (normOld && normalize(content).includes(normOld)) {
              return {
                error: `old_string not found in ${path} — a match exists but whitespace/indentation differs and is not unique enough to apply automatically. Re-read the file and copy the exact text (tabs vs spaces, trailing spaces, blank lines must match), or include more surrounding context.`,
              }
            }
            // Anchor probe: locate the target region by the most DISTINCTIVE line
            // of old_string (longest non-trivial line first, requiring a UNIQUE
            // file match), not just the first line. The first line is often a
            // generic token (`return (`, `<div>`, `}`) that either matches nowhere
            // or everywhere; when the model mis-remembers that line but a later,
            // more specific line (a JSX prop, an identifier) is intact, anchoring
            // on the distinctive line still finds the region. Show the file's real
            // content there so the model copies exact text in ONE retry. Only show
            // a UNIQUE match so the snippet is reliably the right place.
            const fileLines = content.split('\n')
            const showSnippet = (idx: number): { error: string } => {
              const start = Math.max(0, idx - 3)
              const snippet = fileLines
                .slice(start, idx + 8)
                .map((l, i) => `${start + i + 1}: ${l}`)
                .join('\n')
              return {
                error: `old_string not found in ${path}. The file's ACTUAL content near your target (copy the exact text from here):\n${snippet}`,
              }
            }
            const distinctiveLines = [
              ...new Set(
                oldString
                  .split('\n')
                  .map((l) => l.trim())
                  .filter((l) => l.length >= 8),
              ),
            ].sort((a, b) => b.length - a.length)
            for (const anchor of distinctiveLines) {
              const hits = fileLines.reduce<number[]>((acc, l, i) => {
                if (l.includes(anchor)) acc.push(i)
                return acc
              }, [])
              if (hits.length === 1) return showSnippet(hits[0])
            }
            // Fallback: the first non-blank line, even if not unique (better than a
            // bare "re-read" when the model just needs to see nearby real content).
            const firstLine = oldString
              .split('\n')
              .find((l) => l.trim().length > 0)
              ?.trim()
            if (firstLine) {
              const idx = fileLines.findIndex((l) => l.includes(firstLine))
              if (idx >= 0) return showSnippet(idx)
            }
            // Nothing anchored. Say WHICH of the two situations this is — they
            // call for different next moves, and the old message implied the
            // first while being returned for both. Measured across six agent
            // runs, `old_string not found` was the largest remaining tool-error
            // class (15 of 64) and every one of these fell through to a bare
            // "re-read and copy the exact text", which is wrong advice when the
            // text is not in the file at all.
            const anchorsPresent = distinctiveLines.some((anchor) =>
              fileLines.some((l) => l.includes(anchor)),
            )
            if (!anchorsPresent) {
              return {
                error:
                  `old_string not found in ${path} — and NONE of its lines appear anywhere in ` +
                  `that file, so this is not a whitespace problem. Either the edit was already ` +
                  `applied, or this is the wrong file. read_file it and look before trying ` +
                  `again; do not retry the same old_string.`,
              }
            }
            return {
              error:
                `old_string not found in ${path}. Parts of it ARE in the file but no single ` +
                `line is distinctive enough to locate the target. read_file the region you ` +
                `mean and copy old_string verbatim from what it returns — including ` +
                `indentation — or include more surrounding context to make it unique.`,
            }
          }
          if (count > 1)
            return {
              error: `old_string found ${count} times in ${path} — must be unique. Include more surrounding context.`,
            }
          // Splice by index rather than `content.replace(oldString, newString)`:
          // String.replace treats `$&`, `$$`, `` $` ``, `$'` in the REPLACEMENT as
          // special patterns, so a new_string containing regex-replacement code
          // (`'$&!'`) or literal dollars (`"$$$"`) would be silently corrupted —
          // a self-inflicted syntax error written with ok:true that the executor
          // then can't locate. count === 1 here, so indexOf is the unique site.
          const at = content.indexOf(oldString)
          content = content.slice(0, at) + newString + content.slice(at + oldString.length)
        }

        if (onFileDiff) onFileDiff({ path, oldContent, newContent: content })

        await backend.writeFile(path, content)
        if (onAfterWrite) await onAfterWrite(path).catch(() => {})

        if (onFileChange) onFileChange({ type: 'modified', path })

        return { path, ok: true, replacementsApplied: replacements.length }
      } catch (e: unknown) {
        return { error: `Failed to edit ${path}: ${(e as Error).message}` }
      }
    },

    async search_files(input) {
      const pattern = input.pattern as string
      const path = resolve((input.path as string) || '')
      const include = input.include as string | undefined
      // Lines of surrounding context per match. The executor reaches for
      // `grep -A 20` through the shell because this tool could not express it;
      // bounded so a broad pattern cannot pull the whole tree into the reply.
      const rawContext = Number(input.contextLines ?? input.context)
      const contextLines = Number.isFinite(rawContext)
        ? Math.min(Math.max(Math.trunc(rawContext), 0), MAX_SEARCH_CONTEXT_LINES)
        : 0

      if (include && !isValidGlob(include))
        return {
          error: 'Invalid include glob pattern. Allowed: alphanumeric and @ * ? . _ - / [ ] ( ).',
        }

      const symlinkErr = await checkSymlink(path)
      if (symlinkErr) return { error: symlinkErr }
      try {
        const globArg = include ? `--include=${shellQuote(include)}` : ''
        // With context, grep emits `file-line-content` for context lines and
        // `file:line:content` for matches, plus `--` group separators. Both
        // shapes are parsed below; without context the output is unchanged.
        const contextArg = contextLines > 0 ? `-C ${contextLines}` : ''
        const result = await backend.run(
          `grep -rn ${globArg} ${contextArg} ${grepExcludeArgs} --max-count=${MAX_SEARCH_RESULTS} -- ${shellQuote(pattern)} ${shellQuote(path)} 2>/dev/null || true`,
          { timeout: 10000 },
        )
        // grep emits `<file>:<line>:<content>`, so redaction runs PER MATCH on the
        // content alone: the file prefix would otherwise hide an env assignment from
        // the line-anchored env pattern, and knowing each match's own path is what
        // lets a hit inside a .env get full treatment while source stays verbatim.
        const output = stripControlChars(result.stdout.trim())
        if (!output) return { pattern, path, matches: [] }

        const cap =
          contextLines > 0 ? MAX_SEARCH_RESULTS * (contextLines * 2 + 2) : MAX_SEARCH_RESULTS
        const matches = output
          .split('\n')
          .slice(0, cap)
          .filter((line) => line !== '--')
          .map((line) => {
            const hit = line.match(/^(.+?):(\d+):(.*)$/)
            if (hit) {
              return {
                file: hit[1],
                line: parseInt(hit[2]),
                content: sanitizeFileContent(hit[3], hit[1]),
                ...(contextLines > 0 ? { match: true } : {}),
              }
            }
            const ctx = contextLines > 0 ? line.match(/^(.+?)-(\d+)-(.*)$/) : null
            if (ctx) {
              return {
                file: ctx[1],
                line: parseInt(ctx[2]),
                content: sanitizeFileContent(ctx[3], ctx[1]),
                match: false,
              }
            }
            return { file: '', line: 0, content: sanitizeFileContent(line, '') }
          })
        return { pattern, path, matches }
      } catch (e: unknown) {
        return { error: `Search failed: ${(e as Error).message}` }
      }
    },

    async find_files(input) {
      const pattern = input.pattern as string
      const path = resolve((input.path as string) || '')

      // A missing/empty pattern would otherwise reach shellQuote(undefined) and throw
      // the cryptic "Cannot read properties of undefined (reading 'replace')" — give the
      // executor a clear, actionable error so it can retry instead of losing the call.
      if (typeof pattern !== 'string' || pattern.trim() === '')
        return {
          error:
            'find_files requires a non-empty "pattern" argument (a filename or glob, e.g. "*.tsx" or "index.ts").',
        }
      if (!isValidGlob(pattern))
        return {
          error:
            'Invalid pattern. Allowed: alphanumeric and @ * ? . _ - / [ ] ( ) ' +
            '(brackets/parens support Next.js route dirs like [id] or (group)).',
        }

      const symlinkErr = await checkSymlink(path)
      if (symlinkErr) return { error: symlinkErr }
      try {
        const result = await backend.run(
          `find ${shellQuote(path)} -name ${shellQuote(pattern)} ${findExcludeArgs} 2>/dev/null | head -${MAX_FIND_RESULTS}`,
          { timeout: 10000 },
        )
        const files = result.stdout.trim().split('\n').filter(Boolean)
        return { pattern, path, files }
      } catch (e: unknown) {
        return { error: `Find failed: ${(e as Error).message}` }
      }
    },

    async create_directory(input) {
      const path = resolve(input.path as string)
      const parentPath = path.substring(0, path.lastIndexOf('/')) || root
      const symlinkErr = await checkSymlink(parentPath)
      if (symlinkErr) return { error: symlinkErr }
      try {
        await backend.run(`mkdir -p ${shellQuote(path)}`)
        if (onFileChange) onFileChange({ type: 'created', path })
        return { path, ok: true }
      } catch (e: unknown) {
        return { error: `Failed to create directory ${path}: ${(e as Error).message}` }
      }
    },

    async rename_file(input) {
      const oldPath = resolve(input.old_path as string)
      const newPath = resolve(input.new_path as string)
      const oldSymlinkErr = await checkSymlink(oldPath)
      if (oldSymlinkErr) return { error: oldSymlinkErr }
      const newParent = newPath.substring(0, newPath.lastIndexOf('/')) || root
      const newSymlinkErr = await checkSymlink(newParent)
      if (newSymlinkErr) return { error: newSymlinkErr }
      try {
        await backend.run(`mkdir -p ${shellQuote(newPath.substring(0, newPath.lastIndexOf('/')))}`)
        await backend.run(`mv ${shellQuote(oldPath)} ${shellQuote(newPath)}`)
        if (onFileChange) {
          onFileChange({ type: 'deleted', path: oldPath })
          onFileChange({ type: 'created', path: newPath })
        }
        return { old_path: oldPath, new_path: newPath, ok: true }
      } catch (e: unknown) {
        return { error: `Failed to rename ${oldPath}: ${(e as Error).message}` }
      }
    },

    async delete_file(input) {
      const path = resolve(input.path as string)
      const symlinkErr = await checkSymlink(path)
      if (symlinkErr) return { error: symlinkErr }
      try {
        await backend.deleteFile(path)
        if (onFileChange) onFileChange({ type: 'deleted', path })
        return { path, ok: true }
      } catch (e: unknown) {
        return { error: `Failed to delete ${path}: ${(e as Error).message}` }
      }
    },

    async exec_command(input) {
      const command = input.command as string
      const cwd = input.cwd ? resolve(input.cwd as string) : root

      // A model that sent the command under another name (`cmd`, `script`, …)
      // has already been normalized by guardToolExecute; reaching here with
      // nothing means there is genuinely no command. Say so in the terms that
      // let the model fix it. It used to fall through to
      // checkBlockedCommand(undefined) and die with "Cannot read properties of
      // undefined (reading 'match')" — the executor read that as a broken shell,
      // stopped verifying, and ended the turn claiming all checks passed while
      // seven acceptance checks failed (X0 rehearsal 83, 2026-09-16).
      if (typeof command !== 'string' || command.trim() === '') {
        return { error: missingParamError(TOOL_SCHEMAS.exec_command, input, ['command']) }
      }

      if (blockDangerousCommands) {
        const blocked = checkBlockedCommand(command)
        if (blocked) return { error: blocked }
      }

      // Consumer-specific guard (see ToolBuildConfig.blockCommand) — an environment can
      // veto commands the generic dangerous-command check can't know about.
      if (blockCommand) {
        const blocked = blockCommand(command, cwd)
        if (blocked) return { error: blocked }
      }

      // Detached: start it, hand back a handle, let the turn continue. A
      // command that outlives the tool's ceiling is otherwise simply lost —
      // measured across six agent runs, ten of them were killed at the
      // ceiling for 49 minutes, 11% of all wall clock, every one returning
      // nothing because it was piped through tail/grep. A full test suite or a
      // slow production build could not be run at all, so the executor ran
      // smaller and smaller pieces, or reported a result it never saw.
      //
      // Output goes to a file the executor reads with read_file (which takes
      // offset/limit, so a long log is cheap to follow), and an `.exit` file
      // appears when it finishes — so "is it done?" is a read, not a poll that
      // blocks a turn.
      if (input.run_in_background === true) {
        const id = `mol-bg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
        const log = `/tmp/${id}.log`
        const exitFile = `/tmp/${id}.exit`
        const script = `/tmp/${id}.sh`
        try {
          // The command goes to a FILE rather than through nested quoting:
          // an executor's commands routinely carry quotes, heredocs and
          // newlines, and re-quoting them into a detached `sh -c` is how a
          // background runner corrupts the very thing it is running.
          await backend.writeFile(script, `${command}\n`)
          await backend.run(
            `nohup sh -c ${shellQuote(`sh ${script} > ${log} 2>&1; echo $? > ${exitFile}`)} ` +
              `> /dev/null 2>&1 &`,
            { cwd, timeout: 15_000 },
          )
          return {
            taskId: id,
            log,
            exitFile,
            note:
              `Started in the background. Its output is being written to ${log} — read it with ` +
              `read_file (use offset/limit to follow a long one). When it finishes, ${exitFile} ` +
              `appears and holds the exit code. If you have other work, do it and check back. If ` +
              `you need this result before you can continue, call wait_for_task with this taskId — ` +
              `never sleep and read the log by hand.`,
          }
        } catch (e: unknown) {
          return {
            error: `Could not start the background command: ${(e as Error).message}`,
          }
        }
      }

      // A command that declares its OWN budget larger than this tool's ceiling,
      // and whose output is withheld until the pipeline ends, cannot produce
      // anything: it will be stopped at the ceiling having printed nothing.
      // Measured across six agent runs, that combination was ten commands and
      // 49 minutes — 11% of all wall clock — each returning a few hundred bytes.
      // Refusing in five seconds, naming both ways out, is strictly better than
      // spending the ceiling to say the same thing afterwards. A command that
      // declares nothing still RUNS: partial output survives an overrun, so
      // there is something to learn either way.
      if (commandBudgetMs) {
        const ceiling = Math.max(1, Math.round(commandBudgetMs / 1000))
        const declared = declaredBudgetSeconds(command, input.timeout)
        if (declared > ceiling && outputIsWithheldUntilExit(command)) {
          return {
            error:
              `This command asks for ${declared}s and this tool stops at ${ceiling}s — and its output ` +
              'is piped into tail/head/grep, which print nothing until the pipeline ends, so it ' +
              'would spend the whole budget and hand you back nothing. Either run a smaller unit ' +
              '(one spec file, one build step) that finishes inside the limit, or drop the pipe ' +
              'and use a streaming reporter so the output survives being stopped. Nothing was run.',
          }
        }
      }

      try {
        // exec_command runs installs/builds/tests — the old 30s hardcap killed
        // those spuriously; use the (generous, caller-configurable) budget.
        // With a command budget, the BACKEND runs the command under `timeout` in
        // its own shell (after any environment a consumer sources around it): an
        // overrun is stopped there, the whole process group, and everything
        // printed until then comes back with exit code 124 — instead of an outer
        // timeout discarding the run and its output together.
        const budgetSeconds = commandBudgetMs ? Math.max(1, Math.round(commandBudgetMs / 1000)) : 0

        // A requested budget is honored DOWNWARD only. The model used to send
        // `timeout: 900000` for a test suite, the field was not declared so it
        // was silently dropped, and the command was killed at the ceiling with
        // no hint that a ceiling existed — costing a full budget per attempt
        // before the overrun message could teach anything (X0 R83/R84). Now the
        // ceiling is reported the FIRST time a larger one is asked for.
        const requestedMs = Number(input.timeout)
        const wantsMore =
          Number.isFinite(requestedMs) && requestedMs > 0 && requestedMs > (commandBudgetMs ?? 0)
        const effectiveBudgetMs =
          Number.isFinite(requestedMs) && requestedMs > 0 && commandBudgetMs
            ? Math.min(requestedMs, commandBudgetMs)
            : commandBudgetMs
        const ceilingNote =
          wantsMore && budgetSeconds
            ? `You asked for ${Math.round(requestedMs / 1000)}s; this tool's ceiling is ${budgetSeconds}s. ` +
              'Split the work into smaller commands (one test file, one build step) rather than ' +
              're-running the same long one.'
            : null

        const result = await backend.run(command, {
          cwd,
          timeout: execTimeoutMs,
          ...(effectiveBudgetMs ? { budgetMs: effectiveBudgetMs } : {}),
        })
        // truncateMiddle (not truncate): a failing build/test/migration puts its
        // error at the TAIL, so keep the head AND the tail — head-only truncation
        // strands the executor with passing progress and no failure reason.
        const stdout = sanitizeOutput(truncateMiddle(result.stdout, MAX_OUTPUT_SIZE))
        const stderr = sanitizeOutput(truncateMiddle(result.stderr, MAX_OUTPUT_SIZE))
        if (budgetSeconds && result.exitCode === 124) {
          return {
            stdout,
            stderr,
            exitCode: result.exitCode,
            error:
              `The command was stopped after ${budgetSeconds}s, this tool's limit; the output above is ` +
              'everything it printed until then' +
              (/\|\s*(tail|head)\b/.test(command)
                ? ' — and a pipe through tail/head holds everything back until the command ends, so it printed nothing: run it without the pipe (use a line reporter and let the output stream)'
                : '') +
              '. Run a smaller unit per command (one test file, one build step) instead of chaining ' +
              'a build and a whole suite.',
          }
        }
        return {
          stdout,
          stderr,
          exitCode: result.exitCode,
          ...(ceilingNote ? { note: ceilingNote } : {}),
        }
      } catch (e: unknown) {
        return { error: `Command failed: ${(e as Error).message}` }
      }
    },

    async load_skill(input) {
      const name = input.name as string
      if (!name) return { error: 'Skill name is required.' }

      // Try direct path first (if name looks like a path)
      if (name.includes('/')) {
        const path = resolve(name)
        // Same workspace-confinement guard every other file-read tool enforces: a planted
        // symlink must not let load_skill read outside the workspace (no-op unless symlinkGuards).
        const symlinkErr = await checkSymlink(path)
        if (symlinkErr) return { error: symlinkErr }
        try {
          const content = await backend.readFile(path)
          return { name, path, content: sanitizeFileContent(content, path) }
        } catch (_error) {
          // File not present at the given path — fall through to the error return below
          return { error: `Skill not found at path: ${name}` }
        }
      }

      // Search standard skill directories
      const searchDirs = ['.agents/skills', '.claude/skills']
      for (const dir of searchDirs) {
        const skillPath = `${root}/${dir}/${name}/SKILL.md`
        // Skip (treat as not-found) any candidate whose realpath escapes the workspace via a
        // symlink — never read an out-of-workspace target.
        if (await checkSymlink(skillPath)) continue
        try {
          const content = await backend.readFile(skillPath)
          return {
            name,
            path: `${dir}/${name}/SKILL.md`,
            content: sanitizeFileContent(content, skillPath),
          }
        } catch (_error) {
          // Skill file not present in this directory — try the next candidate
          continue
        }
      }

      return {
        error: `Skill '${name}' not found. Searched .agents/skills/${name}/SKILL.md and .claude/skills/${name}/SKILL.md`,
      }
    },

    // The other half of run_in_background. A handle is only useful if the
    // executor has other work to do while the command runs; when it needs the
    // result to continue — a build before the tests, tests before "done" — it
    // has nothing to do but wait, and without this it waited by calling
    // `sleep 75; cat <log>` in exec_command, one round trip per poll, each at
    // the full context. Observed on X0 run x1 (2026-09-22): the first two
    // background builds were each followed by a sleep-and-cat call. Waiting
    // server-side costs no round trip and no context.
    async wait_for_task(input) {
      const taskId = typeof input.taskId === 'string' ? input.taskId.trim() : ''
      // The id names files under /tmp; only an id this tool minted may be used
      // to read them, so a crafted id cannot turn this into a file reader.
      if (!/^mol-bg-[a-z0-9]+-[a-z0-9]+$/.test(taskId)) {
        return {
          error:
            'taskId must be the id a run_in_background command returned (it looks like ' +
            '`mol-bg-…`).',
        }
      }
      const log = `/tmp/${taskId}.log`
      const exitFile = `/tmp/${taskId}.exit`
      // Leave the outer tool ceiling a margin so this returns a result rather
      // than being killed by it.
      const ceiling = Math.max(5_000, (commandBudgetMs ?? 290_000) - 10_000)
      const requested = Number(input.timeout)
      const budgetMs =
        Number.isFinite(requested) && requested > 0 ? Math.min(requested, ceiling) : ceiling
      const startedAt = Date.now()
      const readExit = async (): Promise<number | null> => {
        try {
          const raw = await backend.readFile(exitFile)
          const code = Number.parseInt(raw.trim(), 10)
          return Number.isFinite(code) ? code : 0
        } catch (_error) {
          // No exit file yet — the command is still running. Not an error.
          return null
        }
      }
      let exitCode = await readExit()
      while (exitCode === null && Date.now() - startedAt < budgetMs) {
        await new Promise((r) =>
          setTimeout(r, Math.min(2_000, budgetMs - (Date.now() - startedAt))),
        )
        exitCode = await readExit()
      }
      const waitedMs = Date.now() - startedAt
      if (exitCode === null) {
        return {
          taskId,
          status: 'running',
          waitedMs,
          note:
            `Still running after ${Math.round(waitedMs / 1000)}s. Call wait_for_task again to ` +
            `keep waiting, or read ${log} for its output so far.`,
        }
      }
      let output: string
      try {
        output = await backend.readFile(log)
      } catch (_error) {
        // The command finished but wrote nothing (or the log was removed);
        // an empty output with a real exit code is still a result.
        output = ''
      }
      // Same shaping as a foreground exec result, so the executor reads both
      // the same way.
      return {
        taskId,
        exitCode,
        waitedMs,
        stdout: sanitizeOutput(truncateMiddle(output, MAX_OUTPUT_SIZE)),
        ...(output.length > MAX_OUTPUT_SIZE ? { truncated: true, fullOutput: log } : {}),
      }
    },

    async save_plan(input) {
      const name = input.name as string
      // The schema field is `content`, but a weak executor frequently sends the plan under
      // `body`/`plan`/`markdown` instead. Reading only `content` then left it undefined, and
      // the checklist regex below (run on "undefined") failed — so a perfectly valid
      // checklist got the "not a checklist" error, the model kept "fixing" the FORMAT (never
      // the real problem, the field name), and the whole plan phase looped for turns. Accept
      // the common aliases so a field-name slip is not misdiagnosed as a format error.
      const content = (input.content ??
        input.body ??
        input.plan ??
        input.markdown ??
        input.text) as string

      // Genuinely empty content (wrong/missing field) — name the fix, don't blame the format.
      if (typeof content !== 'string' || content.trim() === '') {
        return {
          error:
            'save_plan received no plan text. Put the full markdown plan in the `content` field — ' +
            'a checklist with every actionable step as a `- [ ]` checkbox.',
        }
      }

      // The plan is executed step-by-step with each step checked off in the file as it
      // completes, so it must be a checklist — reject prose-only plans and let the
      // model resend the same plan reformatted with checkboxes.
      if (!/^\s*[-*] \[[ xX]\]/m.test(content)) {
        return {
          error:
            'Plan rejected: it must be a markdown checklist. Resend the SAME plan with every actionable step as a `- [ ]` checkbox line (grouped under short headings) so each step can be marked `- [x]` as it is completed.',
        }
      }

      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .slice(0, 60)
      const date = new Date().toISOString().split('T')[0]
      const plansDir = `${root}/.agents/plans`

      try {
        await backend.run(`mkdir -p ${shellQuote(plansDir)}`)

        // Find next sequence number
        let nextNum = 1
        try {
          const entries = await backend.readDir(plansDir)
          for (const e of entries) {
            const m = e.name.match(/^(\d+)-/)
            if (m) nextNum = Math.max(nextNum, parseInt(m[1]) + 1)
          }
        } catch (_error) {
          /* plans dir may not exist yet — start sequence at 1 */
        }

        const filename = `${String(nextNum).padStart(2, '0')}-${slug}-${date}.md`
        const planPath = `${plansDir}/${filename}`
        await backend.writeFile(planPath, content)
        return { path: planPath, ok: true, content, name }
      } catch (e: unknown) {
        return { error: `Failed to save plan: ${(e as Error).message}` }
      }
    },
  }

  // ── Assembly ───────────────────────────────────────────────────

  const allTools: AITool[] = []

  for (const [name, schema] of Object.entries(TOOL_SCHEMAS)) {
    // Filter by include/exclude
    if (include && !include.includes(name)) continue
    if (exclude?.includes(name)) continue

    const impl = toolImpls[name]
    if (!impl) continue

    allTools.push({
      name: schema.name,
      description: schema.description,
      parameters: schema.parameters,
      // Every tool goes through the same guard: parameter aliases are moved onto
      // the declared names, a missing required one returns a model-actionable
      // error instead of reaching a handler as `undefined`, and a handler that
      // throws returns an error rather than a bare internal message. See
      // input-normalizer.ts for why (X0 R83: `{ cmd }` instead of
      // `{ command }` crashed exec_command and the executor stopped verifying).
      execute: guardToolExecute(
        schema,
        impl as (input: Record<string, unknown>) => Promise<unknown>,
      ),
    })
  }

  return allTools
}
