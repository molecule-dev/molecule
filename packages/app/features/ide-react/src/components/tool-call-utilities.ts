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
 * Extracts the last path segment from a file path (e.g. "a/b/c.ts" → "c.ts").
 * @param path - The file path to extract the basename from.
 * @returns The basename string, or empty string if path is undefined.
 */
export function basename(path: string | undefined): string {
  if (!path) return ''
  return path.split('/').pop() ?? path
}

/**
 * Path of a @molecule/* package's MOLECULE.md inside the sandbox, where every
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
  const path = inp.path as string | undefined
  const cmd = inp.command as string | undefined
  const pattern = inp.pattern as string | undefined
  const url = inp.url as string | undefined

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
      return `Rename${code(basename(inp.old_path as string | undefined))}`
    case 'delete_file':
      return `Delete${code(basename(path))}`
    case 'find_files':
      return `Find${code(pattern ?? '')}`
    case 'load_skill':
      return `Load skill${code((inp.name as string | undefined) ?? '')}`
    case 'find_package': {
      const query = (inp.query as string | undefined) ?? (inp.category as string | undefined)
      return `Find package${code(query ?? '')}`
    }
    case 'read_molecule_doc': {
      const pkg = (inp.name as string | undefined)?.trim().replace(/^@molecule\//, '')
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
      return `Bash${code(truncate(cmd ?? ''))}`
    }
    case 'sandbox_fetch': {
      // The interesting part is WHICH endpoint (usually one the model just built) —
      // show method + protocol-stripped URL, e.g. "GET `localhost:4000/api/todos`".
      const method = ((inp.method as string | undefined) ?? 'GET').toUpperCase()
      const compact = (url ?? '').replace(/^https?:\/\//, '').replace(/\/$/, '')
      return `${method}${code(truncate(compact))}`
    }
    case 'navigate_preview':
      return `Go to${code((inp.path as string | undefined) ?? '')}`
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
      const target =
        (inp.text as string | undefined) ??
        (inp.molId as string | undefined) ??
        (inp.selector as string | undefined) ??
        ''
      const verb = { click: 'Click', fill: 'Fill', select: 'Select', waitFor: 'Wait for' }[
        inp.action as string
      ]
      return verb ? `${verb}${code(truncate(target, 40))}` : `Interact${code(truncate(target, 40))}`
    }
    case 'get_ide_state':
      return 'Check IDE status'
    case 'read_logs': {
      const source = (inp.source as string | undefined) ?? ''
      const filter = (inp.filter as string | undefined) ?? ''
      const which = source && source !== 'all' ? `Read ${source} logs` : 'Read logs'
      return `${which}${code(truncate(filter, 30))}`
    }
    case 'find_example':
      return `Find example${code(truncate((inp.query as string | undefined) ?? '', 40))}`
    case 'save_script':
      return `Save script${code((inp.name as string | undefined) ?? '')}`
    case 'request_repo_import':
      return 'Import repository'
    case 'web_search':
      return `Search web${code(truncate((inp.query as string | undefined) ?? '', 40))}`
    case 'save_plan': {
      const planName = (inp.name as string) ?? ''
      return planName ? `Save plan \`${planName}\`` : 'Save plan'
    }
    case 'set_mode': {
      const targetMode = (inp.mode as string) ?? ''
      return targetMode ? `Switch to ${targetMode} mode` : 'Switch mode'
    }
    case 'ask_user':
      return (inp.question as string) ?? 'Question'
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

  const out = output as Inp | undefined
  const hasError = typeof out === 'object' && out !== null && 'error' in out

  if (hasError) {
    const msg = ((out as { error: string }).error ?? '').toLowerCase()
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
 * Count truly added/removed lines between two line arrays using LCS.
 * @param oldLines - The original lines array.
 * @param newLines - The modified lines array.
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
      | { type: string; linesAdded: number; linesRemoved: number }
      | undefined
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
      return (inp.path as string) || null
    case 'rename_file':
      return (inp.new_path as string) || null
    case 'read_molecule_doc':
      // Clicking the card opens the package's MOLECULE.md (pre-installed in the sandbox).
      return moleculeDocPath(inp.name as string | undefined)
    default:
      return null
  }
}
