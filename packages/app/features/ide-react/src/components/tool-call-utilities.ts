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

  switch (name) {
    case 'list_files':
      return `List \`${basename(path) || 'project'}\``
    case 'read_file':
      return `Read \`${basename(path)}\``
    case 'write_file':
      return `Write \`${basename(path)}\``
    case 'edit_file':
      return `Edit \`${basename(path)}\``
    case 'search_files':
      return `Search \`${pattern ?? ''}\``
    case 'create_directory':
      return `Create dir \`${basename(path)}\``
    case 'rename_file':
      return `Rename \`${basename(inp.old_path as string | undefined)}\``
    case 'delete_file':
      return `Delete \`${basename(path)}\``
    case 'find_files':
      return `Find \`${pattern ?? ''}\``
    case 'web_fetch': {
      try {
        return `Fetch ${new URL(url ?? '').hostname}`
      } catch {
        return `Fetch ${url ?? ''}`
      }
    }
    case 'exec_command': {
      const short = (cmd ?? '').slice(0, 60)
      return `Bash \`${short}${(cmd ?? '').length > 60 ? '…' : ''}\``
    }
    case 'ask_user':
      return (inp.question as string) ?? 'Question'
    default:
      return name.replace(/_/g, ' ')
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
    return t('ide.toolCall.statusRunning', undefined, { defaultValue: 'Running…' })

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
    case 'web_fetch': {
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
    case 'exec_command': {
      const exitCode = (out as { exitCode?: number })?.exitCode
      return exitCode != null && exitCode !== 0
        ? t('ide.toolCall.statusFailed', undefined, { defaultValue: 'Failed' })
        : ''
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
      return (inp.path as string) || null
    case 'rename_file':
      return (inp.new_path as string) || null
    default:
      return null
  }
}
