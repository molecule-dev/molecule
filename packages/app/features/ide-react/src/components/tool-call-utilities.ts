/**
 * Pure utility functions for tool call display.
 *
 * Extracted from ToolCallCard for testability — these functions have no
 * React dependencies and can be unit-tested directly.
 *
 * @module
 */

import { t } from '@molecule/app-i18n'

type Inp = Record<string, unknown>

/** Raw tool output shape. */
export type ToolOutput = Record<string, unknown> | string | null | undefined

/**
 * Read a model-supplied field as a string.
 *
 * Tool input is authored by a language model. Its schema says a field is a string; that
 * is a request, and models miss it — `{ label: 'x' }` where a string was declared is the
 * shape that blanked production on 2026-08-14. `as string` on one of these fields is a
 * lie the compiler cannot catch, so every field this module reads goes through here
 * instead: anything that isn't string-like becomes `undefined` and each call site's
 * existing empty-value handling takes over.
 *
 * @param value - The raw field value.
 * @returns The string, or `undefined` when the value cannot be one.
 */
export function str(value: unknown): string | undefined {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return undefined
}

/**
 * Read a model-supplied field as a number.
 *
 * The numeric twin of {@link str}, and it hides in the same way: `out.exitCode as number`
 * on an object passes `!= null` and `!== 0`, so the guard reads as satisfied and the
 * object goes straight into JSX. Numeric-looking strings are accepted because providers
 * routinely send them.
 *
 * @param value - The raw field value.
 * @returns The number, or `undefined` when the value cannot be one.
 */
export function num(value: unknown): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

/**
 * Extracts the last path segment from a file path (e.g. "a/b/c.ts" → "c.ts").
 * @param path - The file path to extract the basename from.
 * @returns The basename string, or empty string if path is undefined.
 */
export function basename(path: string | undefined): string {
  if (!path) return ''
  return path.split('/').pop() ?? path
}

/**
 * Path of a `@molecule/*` package's MOLECULE.md inside the sandbox, where every
 * package is pre-installed. Used by the find_package / read_molecule_doc cards
 * so clicking a package opens its docs in the editor.
 * @param packageName - The package name, with or without the `@molecule/` prefix.
 * @returns The absolute sandbox path to the package's MOLECULE.md, or null for
 * a name that isn't a plain molecule package slug.
 */
export function moleculeDocPath(packageName: string | undefined): string | null {
  if (!packageName) return null
  const bare = packageName.trim().replace(/^@molecule\//, '')
  if (!/^[a-z0-9-]+$/.test(bare)) return null
  return `/workspace/node_modules/@molecule/${bare}/MOLECULE.md`
}

/** Truncate a string to `max` characters with a trailing ellipsis. */
function truncate(value: string, max = 60): string {
  return value.length > max ? `${value.slice(0, max)}…` : value
}

/**
 * Human-readable label for a tool call (e.g. "Edit `ChatPanel.tsx`").
 * @param name - The tool name (e.g. "write_file", "exec_command").
 * @param input - The raw tool input payload.
 * @returns A formatted label string with backtick-wrapped filenames.
 */
export function toolLabel(name: string, input: unknown): string {
  const inp = (input ?? {}) as Inp
  const path = str(inp.path)
  const cmd = str(inp.command)
  const pattern = str(inp.pattern)
  const url = str(inp.url)

  // Wrap a value in a leading-space + backticks, or return '' when it's empty.
  // While a tool call streams, its input arrives a beat after the block is
  // created, so path/pattern/command are briefly undefined — emitting `Read ``
  // (empty backticks) flashed before the real filename. Drop the backticks
  // entirely until there's a value, so the label reads "Read" then "Read `x.ts`".
  const code = (value: string): string => (value ? ` \`${value}\`` : '')

  switch (name) {
    case 'list_files':
      return `List${code(basename(path) || 'project')}`
    case 'read_file':
      return `Read${code(basename(path))}`
    case 'write_file':
      return `Write${code(basename(path))}`
    case 'edit_file':
      return `Edit${code(basename(path))}`
    case 'search_files':
      return `Search${code(pattern ?? '')}`
    case 'create_directory':
      return `Create dir${code(basename(path))}`
    case 'rename_file':
      return `Rename${code(basename(str(inp.old_path)))}`
    case 'delete_file':
      return `Delete${code(basename(path))}`
    case 'find_files':
      return `Find${code(pattern ?? '')}`
    case 'load_skill':
      return `Load skill${code(str(inp.name) ?? '')}`
    case 'find_package': {
      const query = str(inp.query) ?? str(inp.category)
      return `Find package${code(query ?? '')}`
    }
    case 'read_molecule_doc': {
      const pkg = str(inp.name)
        ?.trim()
        .replace(/^@molecule\//, '')
      return `Read docs${code(pkg ? `@molecule/${pkg}` : '')}`
    }
    case 'web_fetch': {
      try {
        return `Fetch ${new URL(url ?? '').hostname}`
      } catch (_error) {
        // URL parsing failed (malformed/empty URL) — fall back to raw URL string, safe to ignore.
        return `Fetch ${url ?? ''}`
      }
    }
    case 'exec_command': {
      // A detached command has no result to show here — the card would read as
      // finished the moment it started. Say which it is.
      return inp.run_in_background === true
        ? `Bash (background)${code(truncate(cmd ?? ''))}`
        : `Bash${code(truncate(cmd ?? ''))}`
    }
    case 'sandbox_fetch': {
      // The interesting part is WHICH endpoint (usually one the model just built) —
      // show method + protocol-stripped URL, e.g. "GET `localhost:4000/api/todos`".
      const method = (str(inp.method) ?? 'GET').toUpperCase()
      const compact = (url ?? '').replace(/^https?:\/\//, '').replace(/\/$/, '')
      return `${method}${code(truncate(compact))}`
    }
    case 'navigate_preview':
      return `Go to${code(str(inp.path) ?? '')}`
    case 'open_file':
      return `Open${code(basename(path))}`
    case 'reload_preview':
      return 'Reload preview'
    case 'restart_preview':
      return inp.restart === true ? 'Restart preview servers' : 'Start preview servers'
    case 'read_preview_ui':
      return 'Inspect preview'
    case 'interact_preview': {
      // Target priority mirrors the tool's own: molId is canonical, text is the
      // visible name (usually the most readable), selector is the last resort.
      // Deliberately NEVER show `value` — fill routinely types credentials.
      const target = str(inp.text) ?? str(inp.molId) ?? str(inp.selector) ?? ''
      const verb = { click: 'Click', fill: 'Fill', select: 'Select', waitFor: 'Wait for' }[
        str(inp.action) ?? ''
      ]
      return verb ? `${verb}${code(truncate(target, 40))}` : `Interact${code(truncate(target, 40))}`
    }
    case 'get_ide_state':
      return 'Check IDE status'
    case 'read_logs': {
      const source = str(inp.source) ?? ''
      const filter = str(inp.filter) ?? ''
      const which = source && source !== 'all' ? `Read ${source} logs` : 'Read logs'
      return `${which}${code(truncate(filter, 30))}`
    }
    case 'find_example':
      return `Find example${code(truncate(str(inp.query) ?? '', 40))}`
    case 'save_script':
      return `Save script${code(str(inp.name) ?? '')}`
    case 'request_repo_import':
      return 'Import repository'
    case 'web_search':
      return `Search web${code(truncate(str(inp.query) ?? '', 40))}`
    case 'save_plan': {
      const planName = str(inp.name) ?? ''
      return planName ? `Save plan \`${planName}\`` : 'Save plan'
    }
    case 'set_mode': {
      const targetMode = str(inp.mode) ?? ''
      return targetMode ? `Switch to ${targetMode} mode` : 'Switch mode'
    }
    case 'ask_user':
      return normalizeAskUserInput(inp).question || 'Question'
    case 'spawn_agent': {
      const kind = str(inp.type) ?? ''
      return kind === 'judge' ? 'Subagent — acceptance judge' : 'Subagent — research'
    }
    case 'update_task_list': {
      const rows = normalizeTaskListInput(inp)
      return rows.length > 0 ? `Working plan — ${rows.length} tasks` : 'Working plan'
    }
    default: {
      const label = name.replace(/_/g, ' ')
      // Salient-argument fallback for tools without an explicit case: nearly every
      // tool has ONE short string input that carries its intent — show the first
      // one present so a new tool never renders as a bare name. Never dump JSON.
      const salient = [path, url, inp.query, inp.name, pattern, cmd, inp.source, inp.text].find(
        (v): v is string => typeof v === 'string' && v.trim() !== '',
      )
      return (
        label.charAt(0).toUpperCase() + label.slice(1) + code(salient ? truncate(salient, 40) : '')
      )
    }
  }
}

/**
 * Whether a tool result says the PERSON skipped this call.
 *
 * It is the honest third outcome, and it has to be recognisable on sight:
 * a skipped call did not fail (nothing went wrong) and it did not succeed
 * (the work never happened). Reading it as either one is the lie this
 * predicate exists to prevent — so the summary word, the status dot, and the
 * card's error handling all ask here rather than each deciding for themselves.
 *
 * @param output - The raw tool output payload.
 * @returns True when the call was skipped by the user.
 */
export function isSkippedByUser(output: unknown): boolean {
  if (typeof output !== 'object' || output === null) return false
  return (output as { status?: unknown }).status === 'skipped_by_user'
}

/**
 * One-line result summary shown beneath the label.
 * @param name - The tool name.
 * @param output - The raw tool output payload.
 * @param status - The execution status (pending, running, done, error).
 * @returns A brief summary string describing the result.
 */
export function toolSummary(name: string, output: ToolOutput, status: string): string {
  if (status === 'pending') return ''
  if (status === 'running')
    return t('ide.toolCall.statusRunning', undefined, { defaultValue: 'Running' })
  // Checked BEFORE every per-tool branch: a skipped `exec_command` carries no
  // exit code and a skipped `write_file` no diff, so the branches below would
  // fall through to the empty summary that means "it worked".
  if (isSkippedByUser(output))
    return t('ide.toolCall.statusSkipped', undefined, { defaultValue: 'Skipped' })

  const out = output as Inp | undefined
  const hasError = typeof out === 'object' && out !== null && 'error' in out

  if (hasError) {
    const msg = (str((out as { error: unknown }).error) ?? '').toLowerCase()
    if (msg.includes('not found') || msg.includes('no such file'))
      return t('ide.toolCall.statusNotFound', undefined, { defaultValue: 'Not found' })
    if (msg.includes('permission') || msg.includes('access denied'))
      return t('ide.toolCall.statusPermissionDenied', undefined, {
        defaultValue: 'Permission denied',
      })
    return t('ide.toolCall.statusFailed', undefined, { defaultValue: 'Failed' })
  }

  switch (name) {
    case 'write_file': {
      const diff = (out as { diff?: { type: string; linesAdded: number; linesRemoved: number } })
        ?.diff
      if (!diff) return ''
      if (diff.type === 'unchanged')
        return t('ide.toolCall.statusUnchanged', undefined, { defaultValue: 'Unchanged' })
      return ''
    }
    case 'edit_file':
      return ''
    case 'list_files': {
      const entries = (out as { entries?: unknown[] })?.entries
      return entries != null
        ? t(
            'ide.toolCall.entryCount',
            { count: entries.length },
            {
              defaultValue: '{{count}} entries',
            },
          )
        : ''
    }
    case 'read_file':
      return ''
    case 'search_files': {
      const matches = (out as { matches?: unknown[] })?.matches
      return matches != null
        ? t(
            'ide.toolCall.matchCount',
            { count: matches.length },
            {
              defaultValue: '{{count}} matches',
            },
          )
        : ''
    }
    case 'find_files': {
      const files = (out as { files?: unknown[] })?.files
      return files != null
        ? t(
            'ide.toolCall.fileCount',
            { count: files.length },
            {
              defaultValue: '{{count}} files',
            },
          )
        : ''
    }
    case 'create_directory':
      return ''
    case 'rename_file':
      return ''
    case 'delete_file':
      return ''
    case 'web_fetch':
    case 'sandbox_fetch': {
      const status_ = (out as { status?: number })?.status
      if (status_ == null) return ''
      if (status_ >= 200 && status_ < 300) return ''
      if (status_ === 404)
        return t('ide.toolCall.statusNotFound', undefined, { defaultValue: 'Not found' })
      if (status_ >= 400 && status_ < 500)
        return t('ide.toolCall.statusFailed', undefined, { defaultValue: 'Failed' })
      if (status_ >= 500)
        return t('ide.toolCall.statusServerError', undefined, { defaultValue: 'Server error' })
      return ''
    }
    case 'navigate_preview':
    case 'interact_preview': {
      // The snapshot's url is where the app actually landed — an auth-guard
      // redirect is exactly what the user wants to see at a glance.
      const landed = (out as { url?: string })?.url
      if (typeof landed !== 'string' || !landed) return ''
      try {
        const u = new URL(landed)
        return u.pathname + u.search
      } catch (_error) {
        // Not an absolute URL (already a path or malformed) — show it as-is.
        return landed
      }
    }
    case 'exec_command': {
      // The handle a background command returns is not an outcome: the command
      // is still running, and the strip above the composer owns its real status.
      if ((out as { taskId?: unknown })?.taskId != null) {
        return t('ide.toolCall.startedInBackground', undefined, {
          defaultValue: 'Running in the background',
        })
      }
      const exitCode = (out as { exitCode?: number })?.exitCode
      return exitCode != null && exitCode !== 0
        ? t('ide.toolCall.statusFailed', undefined, { defaultValue: 'Failed' })
        : ''
    }
    case 'find_package': {
      const found = (out as { found?: number })?.found
      if (found == null) return ''
      if (found === 0) return t('ide.toolCall.noMatches', undefined, { defaultValue: 'No matches' })
      return t(
        'ide.toolCall.packageCount',
        { count: found },
        { defaultValue: '{{count}} packages' },
      )
    }
    case 'ask_user': {
      if (typeof out === 'string') return out
      const askOut = out as { status?: string } | undefined
      if (askOut?.status === 'awaiting_response') return ''
      return ''
    }
    default:
      return ''
  }
}

/**
 * The keys a model reaches for when it ignores a `string` schema and hands back an
 * option object instead (`{ label }`, `{ value }`, `{ title }`, `{ text }`, `{ name }`).
 * Ordered by how likely each is to hold the human-readable text.
 */
const OPTION_TEXT_KEYS = ['label', 'text', 'title', 'value', 'name', 'option'] as const

/**
 * Coerce one model-authored value into a plain string safe to render as a React child.
 *
 * Tool input is authored by an LLM, not by us: a schema saying `type: 'string'` is a
 * request, never a guarantee. A non-string reaching JSX throws React error #31 and —
 * because the throw happens during render — takes down the whole app, not just the card.
 *
 * @param value - The raw value from the tool input.
 * @returns The best human-readable string, or `''` when there is nothing to show.
 */
function coerceToText(value: unknown): string {
  if (typeof value === 'string') {
    // Weak models also send option OBJECTS pre-serialized as strings —
    // observed live 2026-08-15: options: ['{"key": "build-new", "label":
    // "Build a new app"}'] rendered its raw JSON as the button label. A string
    // that parses to an object/array gets the same key-extraction treatment as
    // a real object; any other string renders untouched.
    const trimmed = value.trim()
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      const tryParse = (candidate: string): unknown => {
        try {
          const parsed: unknown = JSON.parse(candidate)
          return parsed !== null && typeof parsed === 'object' ? parsed : null
        } catch (_error) {
          // Not parseable — the caller falls through to the next recovery step.
          return null
        }
      }
      const textKeyOf = (obj: unknown): string | null => {
        if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) return null
        const record = obj as Record<string, unknown>
        for (const key of OPTION_TEXT_KEYS) {
          const candidate = record[key]
          if (typeof candidate === 'string' && candidate.trim() !== '') return candidate
        }
        return null
      }
      // The model also emits MANGLED pseudo-JSON with mixed escaping — observed
      // live: '{"key": "dev\\", \\"label\\": \\"I\'m a developer…"}'. That
      // string PARSES as valid JSON into a label-less object (the stray \\"
      // swallows the rest into the first value), so a direct parse alone is not
      // enough: prefer whichever parse (direct, or with the stray escapes
      // collapsed) actually yields a recognised text key.
      const direct = tryParse(trimmed)
      const directText = textKeyOf(direct)
      if (directText) return directText
      const unescaped = tryParse(trimmed.replace(/\\"/g, '"'))
      const unescapedText = textKeyOf(unescaped)
      if (unescapedText) return unescapedText
      // Last resort for un-parseable wreckage: pull a text key out with a
      // regex — better a recovered label than raw pseudo-JSON as a caption.
      for (const key of OPTION_TEXT_KEYS) {
        const m = trimmed.match(
          new RegExp(`\\\\?"${key}\\\\?"\\s*:\\s*\\\\?"((?:[^"\\\\]|\\\\.)*)`),
        )
        if (m?.[1]) return m[1].replace(/\\"/g, '"').replace(/\\$/, '')
      }
      // A well-formed object/array with no text key (or an array): recurse into
      // the generic coercion so arrays flatten and objects stringify once.
      if (direct) return coerceToText(direct)
    }
    return value
  }
  if (value == null) return ''
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return value.map(coerceToText).filter(Boolean).join(' ')
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    for (const key of OPTION_TEXT_KEYS) {
      const candidate = record[key]
      if (typeof candidate === 'string' && candidate.trim() !== '') return candidate
    }
    // No recognisable text key — show the JSON rather than dropping the option
    // silently, so the user can still pick it and we can see what the model sent.
    try {
      return JSON.stringify(value)
    } catch (_error) {
      // Circular structure — nothing renderable is recoverable from it.
      return ''
    }
  }
  return ''
}

/** A single `ask_user` option after coercion — label is always safe as a React child. */
export interface AskUserOption {
  /** The clickable answer text — also the string sent back as the response. */
  label: string
  /** One-line explanation rendered under the label (rich options only). */
  description?: string
  /** Markdown artifact shown side-by-side for comparing options (rich options only). */
  preview?: string
}

/** The `ask_user` tool input, after coercion — every field safe to render. */
export interface AskUserInput {
  /** The question text (markdown). */
  question: string
  /** Clickable answers; a plain string or a rich { label, description?, preview? }. */
  options: AskUserOption[]
  /** Checkboxes — several options may be chosen at once. */
  multiSelect: boolean
  /** Whether the free-text box is offered. `undefined` means "model didn't say" (defaults on). */
  allowFreeText: boolean | undefined
  /** Optional hint shown under the options. */
  hint: string
  /** Present only on the plan-approval card — renders the rich review layout. */
  planReview: AskUserPlanReview | undefined
}

/** Plan-review metadata carried by the plan-approval ask_user card. */
export interface AskUserPlanReview {
  /** Plan file path relative to the workspace (clickable in the card). */
  path: string | null
  /** The plan's display name, when the model gave one. */
  name: string | null
  /** Total checklist steps in the plan. */
  steps: number
  /** First few checklist step texts, for the in-card preview. */
  preview: string[]
}

/** Coerce the plan-approval card's `planReview` payload (hostile-safe). */
function normalizePlanReview(raw: unknown): AskUserPlanReview | undefined {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return undefined
  const record = raw as Record<string, unknown>
  const path = typeof record.path === 'string' && record.path.trim() ? record.path : null
  const name = typeof record.name === 'string' && record.name.trim() ? record.name : null
  const steps = Number.isFinite(Number(record.steps)) ? Math.max(0, Number(record.steps)) : 0
  const preview = Array.isArray(record.preview)
    ? record.preview
        .map((line) => coerceToText(line).slice(0, 160))
        .filter((line) => line.trim() !== '')
        .slice(0, 8)
    : []
  if (!path && !name && steps === 0) return undefined
  return { path, name, steps, preview }
}

/**
 * Normalize one raw option (string or object) into an `AskUserOption`.
 *
 * The object form is the schema-sanctioned rich option, but the same recovery
 * rules as `coerceToText` apply — a malformed object without a `label` still
 * yields SOMETHING clickable (via the known text keys, or the JSON dump) rather
 * than being dropped, so the user is never left with fewer answers than the
 * model meant to offer.
 */
function normalizeAskUserOption(raw: unknown): AskUserOption | null {
  if (raw != null && typeof raw === 'object' && !Array.isArray(raw)) {
    const record = raw as Record<string, unknown>
    const label = coerceToText(record.label).trim()
      ? coerceToText(record.label)
      : coerceToText(record)
    if (!label.trim()) return null
    return {
      label,
      description: coerceToText(record.description).trim()
        ? coerceToText(record.description)
        : undefined,
      preview: coerceToText(record.preview).trim() ? coerceToText(record.preview) : undefined,
    }
  }
  const label = coerceToText(raw)
  return label.trim() ? { label } : null
}

/**
 * Normalize raw `ask_user` tool input into renderable strings.
 *
 * The model is told `options` is a list of strings or `{ label, description?,
 * preview? }` objects, and weaker models routinely send stranger shapes —
 * `[{ label, value }]`, nested arrays, quote-escaped pseudo-JSON. Rendering one
 * of those directly is React error #31, which crashes the entire IDE at the
 * moment the user submits their first prompt. Everything the card renders goes
 * through here.
 *
 * @param input - The raw tool input, straight off the model.
 * @returns The same fields, coerced so each is safe as a React child.
 */
export function normalizeAskUserInput(input: unknown): AskUserInput {
  const raw = (input ?? {}) as Inp
  const rawOptions = Array.isArray(raw.options) ? raw.options : []
  return {
    question: coerceToText(raw.question),
    options: rawOptions
      .map(normalizeAskUserOption)
      .filter((option): option is AskUserOption => option !== null),
    multiSelect: typeof raw.multiSelect === 'boolean' ? raw.multiSelect : false,
    allowFreeText: typeof raw.allowFreeText === 'boolean' ? raw.allowFreeText : undefined,
    hint: coerceToText(raw.hint),
    planReview: normalizePlanReview(raw.planReview),
  }
}

/** One row of an `update_task_list` call, after coercion — safe to render. */
export interface TaskListRow {
  content: string
  status: 'pending' | 'in_progress' | 'completed'
  priority?: 'high' | 'medium' | 'low'
}

/**
 * Coerce raw `update_task_list` input into renderable rows. The input comes
 * straight off the model — every field is degraded to a safe default rather
 * than rendered raw (same contract as `normalizeAskUserInput`).
 *
 * @param input - The raw tool input.
 * @returns The rows worth rendering; empty when the model sent nothing usable.
 */
export function normalizeTaskListInput(input: unknown): TaskListRow[] {
  const raw = (input ?? {}) as Inp
  if (!Array.isArray(raw.todos)) return []
  const rows: TaskListRow[] = []
  for (const entry of raw.todos.slice(0, 50)) {
    if (entry == null || typeof entry !== 'object' || Array.isArray(entry)) continue
    const record = entry as Record<string, unknown>
    const content = coerceToText(record.content)
    if (!content.trim()) continue
    const status =
      record.status === 'in_progress' || record.status === 'completed'
        ? record.status
        : ('pending' as const)
    const priority =
      record.priority === 'high' || record.priority === 'medium' || record.priority === 'low'
        ? record.priority
        : undefined
    rows.push({ content: content.slice(0, 200), status, priority })
  }
  return rows
}

/** A parsed judge-subagent verdict. */
export interface JudgeVerdict {
  verdict: 'PASS' | 'FAIL'
  /** Concrete failure lines (the `- one line per failure` block under ISSUES:). */
  issues: string[]
  /** The report with the verdict scaffold stripped, for the expandable body. */
  rest: string
}

/**
 * Parse a judge subagent's report into a structured verdict.
 *
 * The judge system prompt fixes the shape (`VERDICT: PASS|FAIL` then optional
 * `ISSUES:` bullets then per-criterion evidence), but the model is the author —
 * parse defensively (case-insensitive, leading whitespace tolerated) and return
 * `null` when no verdict line is present so the card renders the plain report.
 *
 * @param report - The judge subagent's final report text.
 * @returns The structured verdict, or null when the report carries none.
 */
export function parseJudgeVerdict(report: string): JudgeVerdict | null {
  const verdictMatch = report.match(/^\s*VERDICT:\s*(PASS|FAIL)\b/im)
  if (!verdictMatch) return null
  const verdict = verdictMatch[1].toUpperCase() as 'PASS' | 'FAIL'
  const withoutVerdict = report
    .slice(verdictMatch.index! + verdictMatch[0].length)
    .replace(/^\s*VERDICT:\s*(?:PASS|FAIL)\b.*$/im, '')
  const issuesBlock = withoutVerdict.match(/ISSUES:\s*\n?([\s\S]*?)(?=\n\s*\n|\n[A-Z]|\n-[^-]|$)/i)
  const issues = (issuesBlock?.[1] ?? '')
    .split('\n')
    .map((line) => line.replace(/^\s*[-•*]\s*/, '').trim())
    .filter((line) => line.length > 0)
    .slice(0, 12)
  const rest = withoutVerdict.replace(/^\s*ISSUES:\s*\n?/i, '').trim()
  return { verdict, issues, rest }
}

/**
 * Count truly added/removed lines between two line arrays using LCS.
 * @param oldLines - The original lines array.
 * @param modifiedLines - The modified lines array.
 * @returns An object with the number of added and removed lines.
 */
export function diffLineCount(
  oldLines: string[],
  newLines: string[],
): { added: number; removed: number } {
  const n = oldLines.length
  const m = newLines.length
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0) as number[])
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      dp[i][j] =
        oldLines[i - 1] === newLines[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1])
    }
  }
  const common = dp[n][m]
  return { added: m - common, removed: n - common }
}

/**
 * Compute lines added/removed from a file-changing tool call.
 * @param name - The tool name (edit_file or write_file).
 * @param input - The raw tool input payload.
 * @param output - The raw tool output payload.
 * @returns Diff stats with added and removed line counts, or null if not applicable.
 */
export function fileDiffStats(
  name: string,
  input: unknown,
  output: unknown,
): { added: number; removed: number } | null {
  if (name === 'edit_file') {
    const inp = (input ?? {}) as Inp
    const replacements = Array.isArray(inp.replacements)
      ? (inp.replacements as Array<{ old_string: string; new_string: string }>)
      : []
    if (replacements.length === 0) return null
    let added = 0
    let removed = 0
    for (const r of replacements) {
      if (typeof r.old_string !== 'string' || typeof r.new_string !== 'string') continue
      const d = diffLineCount(r.old_string.split('\n'), r.new_string.split('\n'))
      added += d.added
      removed += d.removed
    }
    return { added, removed }
  }
  if (name === 'write_file') {
    const diff = (output as Inp)?.diff as
      { type: string; linesAdded: number; linesRemoved: number } | undefined
    if (!diff || diff.type === 'unchanged') return null
    if (diff.type === 'new') return { added: diff.linesAdded, removed: 0 }
    return { added: diff.linesAdded, removed: diff.linesRemoved }
  }
  return null
}

/**
 * Extracts the primary file path from a tool's input, if it operates on a single file.
 * @param name - The tool name.
 * @param input - The raw tool input payload.
 * @returns The file path string, or null if the tool doesn't target a single file.
 */
export function extractFilePath(name: string, input: unknown): string | null {
  const inp = (input ?? {}) as Record<string, unknown>
  switch (name) {
    case 'read_file':
    case 'write_file':
    case 'edit_file':
    case 'open_file':
      return str(inp.path) || null
    case 'rename_file':
      return str(inp.new_path) || null
    case 'read_molecule_doc':
      // Clicking the card opens the package's MOLECULE.md (pre-installed in the sandbox).
      return moleculeDocPath(str(inp.name))
    default:
      return null
  }
}
