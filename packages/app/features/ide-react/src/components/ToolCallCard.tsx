/**
 * Tool call display row — compact, Claude Code-style.
 *
 * Shows a colored status dot, a human-readable action label, and a
 * one-line result summary. Expands on click to reveal formatted IN / OUT
 * sections: diffs for file edits, terminal output for commands, etc.
 *
 * A call that is still RUNNING carries a **Skip** (when the host serves one):
 * it drops that one tool call without ending the turn, so a person does not
 * have to sit through a command they already know they do not want. The result
 * comes back as `skipped_by_user`, and this card renders it as **Skipped** with
 * a gray dot — never as a success, never as a failure.
 *
 * @module
 */

import type { JSX, ReactNode } from 'react'
import { memo, useCallback, useMemo, useState } from 'react'

import { t } from '@molecule/app-i18n'
import { useThemeMode } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { useCoarsePointer, useNarrowViewport } from '../hooks/useViewport.js'
import type { ToolCallCardProps } from '../types.js'
import { MarkdownContent } from './MarkdownContent.js'
import type { ToolOutput } from './tool-call-utilities.js'
import {
  basename,
  extractFilePath,
  fileDiffStats,
  isSkippedByUser,
  moleculeDocPath,
  normalizeAskUserInput,
  normalizeTaskListInput,
  num,
  parseJudgeVerdict,
  str,
  toolLabel,
  toolSummary,
} from './tool-call-utilities.js'

type Inp = Record<string, unknown>
type Out = ToolOutput

/**
 * Normalize a model-authored string for display: models sometimes double-escape
 * tool arguments, so a literal "\n"/"\t"/"\r" (backslash + letter) ends up in
 * the text instead of a real control character. Convert those back so markdown
 * line breaks render correctly.
 *
 * @param s - The raw string.
 * @returns The string with literal escape sequences turned into real ones.
 */
function unescapeLiterals(s: string): string {
  return s.replace(/\\r\\n|\\n|\\r/g, '\n').replace(/\\t/g, '\t')
}

// ---------------------------------------------------------------------------
// Label renderer — turns `backtick` segments into inline <code> spans
// ---------------------------------------------------------------------------

const CODE_STYLE: React.CSSProperties = {
  fontFamily: '"SF Mono", Menlo, Consolas, "Courier New", monospace',
  fontSize: 'inherit',
}

/**
 * Clickable filename code — single click opens preview, double click pins tab.
 * @param props - Component props.
 * @returns The rendered clickable code element.
 */
function FileCodeLink({
  filePath,
  onFileOpen,
  onFileDoubleClick,
  children,
}: {
  filePath: string
  onFileOpen: (path: string) => void
  onFileDoubleClick?: (path: string) => void
  children: React.ReactNode
}): JSX.Element {
  return (
    <code
      style={{ ...CODE_STYLE, cursor: 'pointer', opacity: 0.75, transition: 'opacity 100ms' }}
      onClick={(e) => {
        e.stopPropagation()
        onFileOpen(filePath)
      }}
      onDoubleClick={(e) => {
        e.stopPropagation()
        onFileDoubleClick?.(filePath)
      }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLElement).style.opacity = '1'
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLElement).style.opacity = '0.75'
      }}
    >
      {children}
    </code>
  )
}

/**
 * Renders a tool label with backtick segments converted to clickable code spans.
 * @param name - The tool name.
 * @param input - The raw tool input payload.
 * @param filePath - The primary file path for clickable code links, or null.
 * @param onFileOpen - Callback to preview a file on single click.
 * @param onFileDoubleClick - Callback to pin a file tab on double click.
 * @returns A ReactNode with formatted label text and clickable file references.
 */
function renderLabel(
  name: string,
  input: unknown,
  filePath: string | null,
  onFileOpen?: (path: string) => void,
  onFileDoubleClick?: (path: string) => void,
): ReactNode {
  const text = toolLabel(name, input)
  const parts = text.split(new RegExp('`([^`]+)`'))
  if (parts.length === 1) return text
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 0 ? (
          part
        ) : filePath && onFileOpen ? (
          <FileCodeLink
            key={i}
            filePath={filePath}
            onFileOpen={onFileOpen}
            onFileDoubleClick={onFileDoubleClick}
          >
            {part}
          </FileCodeLink>
        ) : (
          <code key={i} style={{ ...CODE_STYLE, opacity: 0.75 }}>
            {part}
          </code>
        ),
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// find_package results
// ---------------------------------------------------------------------------

interface PackageResult {
  name: string
  label?: string
  category?: string
}

/**
 * Extract the package matches from a find_package output. Prefers the
 * structured `results` array; falls back to parsing package names out of the
 * model-facing `packages` markdown (conversations recorded before `results`
 * existed).
 * @param output - The raw find_package output payload.
 * @returns The package results, possibly empty.
 */
function packageResults(output: unknown): PackageResult[] {
  const out = (output ?? {}) as {
    results?: PackageResult[]
    packages?: string
  }
  if (Array.isArray(out.results)) {
    return out.results.filter((r): r is PackageResult => typeof r?.name === 'string')
  }
  if (typeof out.packages === 'string') {
    return [...out.packages.matchAll(/^### `([^`]+)`(?: — (.+))?$/gm)].map((m) => ({
      name: m[1],
      label: m[2],
    }))
  }
  return []
}

/**
 * Clickable rows for find_package matches — each opens the package's
 * MOLECULE.md in the editor.
 * @param props - Component props.
 * @returns The rendered result rows.
 */
function PackageResultRows({
  results,
  onFileOpen,
}: {
  results: PackageResult[]
  onFileOpen?: (path: string) => void
}): JSX.Element {
  const isCoarse = useCoarsePointer()
  if (results.length === 0) {
    return (
      <span style={{ opacity: 0.5 }}>
        {t('ide.toolCall.noMatches', undefined, { defaultValue: 'No matches' })}
      </span>
    )
  }
  return (
    <div style={{ fontFamily: PRE.fontFamily, fontSize: '11px', lineHeight: 1.7 }}>
      {results.map((r, i) => {
        const docPath = moleculeDocPath(r.name)
        const clickable = docPath != null && onFileOpen != null
        return (
          <div
            key={i}
            role={clickable ? 'button' : undefined}
            tabIndex={clickable ? 0 : undefined}
            data-mol-id={`find-package-result-${i}`}
            title={
              clickable
                ? t('ide.toolCall.openPackageDoc', undefined, {
                    defaultValue: 'Open package docs',
                  })
                : undefined
            }
            onClick={
              clickable
                ? (e) => {
                    e.stopPropagation()
                    onFileOpen(docPath)
                  }
                : undefined
            }
            onKeyDown={
              clickable
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      e.stopPropagation()
                      onFileOpen(docPath)
                    }
                  }
                : undefined
            }
            onMouseEnter={(e) => {
              if (clickable) e.currentTarget.style.opacity = '1'
            }}
            onMouseLeave={(e) => {
              if (clickable) e.currentTarget.style.opacity = '0.8'
            }}
            style={{
              display: 'flex',
              gap: '8px',
              alignItems: 'baseline',
              // Touch: ~19px result rows are untappable — 32px dense-row floor.
              ...(isCoarse && clickable ? { minHeight: 32, alignItems: 'center' } : {}),
              cursor: clickable ? 'pointer' : 'default',
              opacity: clickable ? 0.8 : 1,
              transition: 'opacity 100ms',
            }}
          >
            <span style={{ whiteSpace: 'nowrap' }}>{r.name}</span>
            {r.label && (
              <span
                style={{
                  opacity: 0.55,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {r.label}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Detail renderers — IN and OUT panes
// ---------------------------------------------------------------------------

const PRE: React.CSSProperties = {
  margin: 0,
  whiteSpace: 'pre',
  overflowX: 'auto',
  fontFamily: '"SF Mono", Menlo, Consolas, "Courier New", monospace',
  fontSize: '11px',
  lineHeight: 1.5,
}

/**
 * Render the input section for a tool call.
 * @param name - The tool name.
 * @param input - The raw tool input payload.
 * @returns A ReactNode showing the formatted input content.
 */
function renderIn(name: string, input: unknown): ReactNode {
  const inp = (input ?? {}) as Inp

  switch (name) {
    case 'exec_command':
      return (
        <pre style={PRE}>
          <span style={{ opacity: 0.5 }}>$ </span>
          {str(inp.command) ?? ''}
        </pre>
      )

    case 'write_file':
      // Full file content is too noisy — show only the path
      return <pre style={PRE}>{str(inp.path) ?? ''}</pre>

    case 'edit_file': {
      // `replacements` is model-authored: entries can be missing, or carry non-string
      // old/new values. Reading them through `str` keeps a malformed edit renderable
      // instead of throwing on `.split` mid-render.
      const replacements = (Array.isArray(inp.replacements) ? inp.replacements : []).map(
        (entry) => {
          const record = (entry ?? {}) as Inp
          return {
            old_string: str(record.old_string) ?? '',
            new_string: str(record.new_string) ?? '',
          }
        },
      )
      const nodes: React.ReactNode[] = []
      replacements.forEach((r, i) => {
        if (i > 0) nodes.push('\n\n')
        r.old_string.split('\n').forEach((line, li) => {
          if (li > 0) nodes.push('\n')
          nodes.push(
            <span key={`r${i}-${li}`} style={{ color: '#f47067', fontFamily: 'inherit' }}>
              {'- '}
              {line}
            </span>,
          )
        })
        nodes.push('\n')
        r.new_string.split('\n').forEach((line, li) => {
          if (li > 0) nodes.push('\n')
          nodes.push(
            <span key={`a${i}-${li}`} style={{ color: '#57ab5a', fontFamily: 'inherit' }}>
              {'+ '}
              {line}
            </span>,
          )
        })
      })
      return <pre style={PRE}>{nodes}</pre>
    }

    case 'search_files':
      return (
        <pre style={PRE}>
          {`/${str(inp.pattern) ?? ''}/`}
          {str(inp.path) ? ` in ${str(inp.path)}` : ''}
          {str(inp.include) ? ` (${str(inp.include)})` : ''}
        </pre>
      )

    case 'find_files':
      return (
        <pre style={PRE}>
          {str(inp.pattern) ?? ''}
          {str(inp.path) ? ` in ${str(inp.path)}` : ''}
        </pre>
      )

    case 'read_file':
    case 'delete_file':
    case 'list_files':
    case 'create_directory':
      return <pre style={PRE}>{str(inp.path) ?? ''}</pre>

    case 'rename_file':
      return (
        <pre style={PRE}>
          {str(inp.old_path) ?? ''} → {str(inp.new_path) ?? ''}
        </pre>
      )

    case 'web_fetch':
      return (
        <pre style={PRE}>
          {str(inp.method) ?? 'GET'} {str(inp.url) ?? ''}
        </pre>
      )

    default:
      return <pre style={PRE}>{JSON.stringify(input, null, 2)}</pre>
  }
}

/**
 * Render the output section for a tool call.
 * @param name - The tool name.
 * @param output - The raw tool output payload.
 * @returns A ReactNode showing the formatted output content.
 */
function renderOut(name: string, output: unknown): ReactNode {
  const out = (output ?? {}) as Inp

  if (typeof out === 'object' && out !== null && 'error' in out) {
    return (
      <pre style={{ ...PRE, color: '#f47067' }}>{str(out.error) ?? JSON.stringify(out.error)}</pre>
    )
  }

  switch (name) {
    case 'exec_command': {
      const stdout = (str(out.stdout) ?? '').trimEnd()
      const stderr = (str(out.stderr) ?? '').trimEnd()
      const exitCode = num(out.exitCode)
      return (
        <div>
          {stdout && <pre style={PRE}>{stdout}</pre>}
          {stderr && (
            <pre style={{ ...PRE, color: '#f47067', marginTop: stdout ? '4px' : 0 }}>{stderr}</pre>
          )}
          {exitCode != null && exitCode !== 0 && (
            <div style={{ marginTop: '4px', color: '#f47067', fontSize: '10px' }}>
              exit code {exitCode}
            </div>
          )}
          {!stdout && !stderr && (
            <span style={{ opacity: 0.5 }}>
              {t('ide.toolCall.noOutput', undefined, { defaultValue: '(no output)' })}
            </span>
          )}
        </div>
      )
    }

    case 'write_file': {
      const diff = out.diff as
        { type: string; linesAdded: number; linesRemoved: number } | undefined
      if (!diff)
        return (
          <span style={{ opacity: 0.6 }}>
            {t('ide.toolCall.written', undefined, { defaultValue: 'Written' })}
          </span>
        )
      if (diff.type === 'unchanged')
        return (
          <span style={{ opacity: 0.6 }}>
            {t('ide.toolCall.statusUnchanged', undefined, { defaultValue: 'Unchanged' })}
          </span>
        )
      return (
        <div style={{ fontFamily: PRE.fontFamily, fontSize: '11px' }}>
          {diff.type === 'new' && (
            <div style={{ color: '#57ab5a' }}>
              {t(
                'ide.toolCall.newFileLines',
                { count: diff.linesAdded },
                { defaultValue: 'new file, {{count}} lines' },
              )}
            </div>
          )}
          {diff.type === 'modified' && (
            <>
              {diff.linesAdded > 0 && (
                <div style={{ color: '#57ab5a' }}>
                  {t(
                    'ide.toolCall.linesAdded',
                    { count: diff.linesAdded },
                    { defaultValue: '+{{count}} lines' },
                  )}
                </div>
              )}
              {diff.linesRemoved > 0 && (
                <div style={{ color: '#f47067' }}>
                  {t(
                    'ide.toolCall.linesRemoved',
                    { count: diff.linesRemoved },
                    { defaultValue: '−{{count}} lines' },
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )
    }

    case 'edit_file': {
      const n = num(out.replacementsApplied)
      return (
        <span style={{ opacity: 0.6, fontSize: '11px' }}>
          {n != null
            ? t(
                'ide.toolCall.changesApplied',
                { count: n },
                { defaultValue: '{{count}} changes applied' },
              )
            : t('ide.toolCall.applied', undefined, { defaultValue: 'Applied' })}
        </span>
      )
    }

    case 'read_file': {
      const content = str(out.content)
      if (!content)
        return (
          <span style={{ opacity: 0.5 }}>
            {t('ide.toolCall.empty', undefined, { defaultValue: '(empty)' })}
          </span>
        )
      const truncated = content.length > 3000
      return (
        <pre style={PRE}>
          {truncated
            ? content.slice(0, 3000) +
              '\n' +
              t('ide.toolCall.truncated', undefined, { defaultValue: '… (truncated)' })
            : content}
        </pre>
      )
    }

    case 'list_files': {
      const entries = out.entries as Array<{ name: string; type: string }> | undefined
      if (!entries?.length)
        return (
          <span style={{ opacity: 0.5 }}>
            {t('ide.toolCall.empty', undefined, { defaultValue: '(empty)' })}
          </span>
        )
      return (
        <div style={{ fontFamily: PRE.fontFamily, fontSize: '11px', lineHeight: 1.6 }}>
          {entries.map((e, i) => (
            <div key={i} style={{ display: 'flex', gap: '6px' }}>
              <span style={{ opacity: 0.4, width: '10px', flexShrink: 0 }}>
                {e.type === 'directory' ? '▶' : ''}
              </span>
              <span>
                {e.name}
                {e.type === 'directory' ? '/' : ''}
              </span>
            </div>
          ))}
        </div>
      )
    }

    case 'find_files': {
      const files = Array.isArray(out.files)
        ? out.files.map((file) => str(file)).filter((file): file is string => file !== undefined)
        : undefined
      if (!files?.length)
        return (
          <span style={{ opacity: 0.5 }}>
            {t('ide.toolCall.noFilesFound', undefined, { defaultValue: 'No files found' })}
          </span>
        )
      return (
        <div style={{ fontFamily: PRE.fontFamily, fontSize: '11px', lineHeight: 1.6 }}>
          {files.map((f, i) => (
            <div key={i}>{f}</div>
          ))}
        </div>
      )
    }

    case 'search_files': {
      const matches = Array.isArray(out.matches)
        ? out.matches.map((match) => {
            const record = (match ?? {}) as Inp
            return {
              file: str(record.file) ?? '',
              line: str(record.line) ?? '',
              content: str(record.content) ?? '',
            }
          })
        : undefined
      if (!matches?.length)
        return (
          <span style={{ opacity: 0.5 }}>
            {t('ide.toolCall.noMatches', undefined, { defaultValue: 'No matches' })}
          </span>
        )
      return (
        <div style={{ fontFamily: PRE.fontFamily, fontSize: '11px', lineHeight: 1.6 }}>
          {matches.slice(0, 30).map((m, i) => (
            <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '2px' }}>
              <span style={{ opacity: 0.5, flexShrink: 0, whiteSpace: 'nowrap' }}>
                {basename(m.file)}:{m.line}
              </span>
              <span style={{ whiteSpace: 'pre' }}>{m.content.trim()}</span>
            </div>
          ))}
          {matches.length > 30 && (
            <div style={{ opacity: 0.5, marginTop: '4px' }}>
              {t(
                'ide.toolCall.andMore',
                { count: matches.length - 30 },
                { defaultValue: '… and {{count}} more' },
              )}
            </div>
          )}
        </div>
      )
    }

    case 'web_fetch': {
      const status = num(out.status)
      const body = str(out.body)
      const ok = status != null && status >= 200 && status < 300
      return (
        <div>
          {status != null && (
            <div
              style={{
                color: ok ? '#57ab5a' : '#f47067',
                marginBottom: body ? '4px' : 0,
                fontSize: '11px',
              }}
            >
              HTTP {status}
            </div>
          )}
          {body && (
            <pre style={PRE}>
              {body.length > 2000
                ? body.slice(0, 2000) +
                  '\n' +
                  t('ide.toolCall.truncated', undefined, { defaultValue: '… (truncated)' })
                : body}
            </pre>
          )}
        </div>
      )
    }

    default:
      return <pre style={PRE}>{JSON.stringify(output, null, 2)}</pre>
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Compact tool-call row with status dot, label, summary, and expandable detail pane.
 * @param props - Component props.
 * @returns The rendered tool call card element.
 */
export const ToolCallCard = memo(function ToolCallCard({
  id,
  name,
  input,
  output,
  status,
  fileDiff,
  isUndone: isUndoneProp,
  onUndoToggle,
  onFileOpen,
  onFileDoubleClick,
  onFileDiff,
  onFileRevert,
  onAskUserResponse,
  onSkip,
  skipDisabledReason,
  className,
}: ToolCallCardProps): JSX.Element | null {
  const cm = getClassMap()
  const isLight = useThemeMode() === 'light'
  // Touch/phone branches (called unconditionally, before the per-tool early
  // returns, so the hook order stays stable): hover-revealed controls become
  // visible-by-default and compact hit areas grow; fine-pointer desktop
  // rendering is unchanged.
  const isCoarse = useCoarsePointer()
  const isNarrow = useNarrowViewport()
  const [expanded, setExpanded] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isUndoneLocal, setIsUndoneLocal] = useState(false)
  const isUndone = isUndoneProp ?? isUndoneLocal
  const [isReverting, setIsReverting] = useState(false)
  const [skipRequested, setSkipRequested] = useState(false)

  // The person skipped this call. It is neither a success nor a failure, and
  // the row has to say so — a green dot on a command that never ran is exactly
  // the kind of quiet lie the honesty rule exists to stop.
  const wasSkipped = isSkippedByUser(output)

  const hasError = (() => {
    if (wasSkipped) return false
    if (status === 'error') return true
    if (typeof output !== 'object' || output === null) return false
    const out = output as Record<string, unknown>
    if ('error' in out) return true
    if (name === 'exec_command') {
      const exitCode = num(out.exitCode)
      return exitCode != null && exitCode !== 0
    }
    if (name === 'web_fetch') {
      const s = num(out.status)
      return s != null && s >= 400
    }
    return false
  })()

  // gray → orange → green or red; a skipped call stays gray, because it did
  // not happen.
  const dotColor =
    status === 'pending' || wasSkipped
      ? '#888888'
      : status === 'running'
        ? '#e8a000'
        : hasError
          ? '#f04040'
          : '#3fb950'

  const summary = toolSummary(name, output as Out, status)

  // File path for the clickable filename <code> in the label. For load_skill the
  // path isn't in the input — the loaded skill's SKILL.md path comes back in the
  // output ({ name, path, content }) — so clicking the skill name opens its markdown.
  const filePath =
    name === 'load_skill'
      ? (((output as Out as { path?: string } | null)?.path ?? null) as string | null)
      : extractFilePath(name, input)

  // New files open directly (no diff to show); edits/modifications open the diff viewer.
  const isNewFile =
    name === 'write_file' && ((output as Inp)?.diff as { type?: string })?.type === 'new'
  const isFileDiff =
    !isNewFile &&
    (name === 'edit_file' || name === 'write_file') &&
    filePath != null &&
    onFileDiff != null

  // Memoize the expensive O(n*m) LCS diff computation so it only re-runs when inputs change.
  const diffStats = useMemo(() => fileDiffStats(name, input, output), [name, input, output])

  // Undo/redo: available for file modifications (not new files) when a snapshot exists.
  const canRevert =
    !isNewFile &&
    (name === 'edit_file' || name === 'write_file') &&
    filePath != null &&
    fileDiff != null &&
    onFileRevert != null

  const handleRevert = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation()
      if (!canRevert || isReverting) return
      const content = isUndone ? fileDiff!.modified : fileDiff!.original
      setIsReverting(true)
      try {
        await onFileRevert!(filePath!, content)
        const newUndone = !isUndone
        setIsUndoneLocal(newUndone)
        onUndoToggle?.(id, newUndone)
      } finally {
        setIsReverting(false)
      }
    },
    [canRevert, isReverting, isUndone, fileDiff, filePath, onFileRevert, onUndoToggle, id],
  )

  // Skip this call while it is still running — the turn keeps going, the model
  // is told the command did not run. A host that answers `false` means the call
  // had already finished (the stale-button race), which is not an error: the
  // button simply returns to its resting state.
  const canSkip = status === 'running' && onSkip != null
  const handleSkip = useCallback(async (): Promise<void> => {
    if (!onSkip || skipRequested || skipDisabledReason) return
    setSkipRequested(true)
    try {
      const accepted = await onSkip(id)
      if (accepted === false) setSkipRequested(false)
    } catch (_error) {
      // Deliberate noop: the host already logs whatever went wrong on its side,
      // and there is nothing for the PERSON to do here — the call is still
      // running, so the honest UI is the button back at rest to try again.
      setSkipRequested(false)
    }
  }, [onSkip, skipRequested, skipDisabledReason, id])

  // Tools that expand to show details inline.
  const EXPANDABLE = new Set([
    'exec_command',
    'web_fetch',
    'rename_file',
    'list_files',
    'find_files',
    'search_files',
    'find_package',
  ])
  const hasDetails = EXPANDABLE.has(name) && (input !== undefined || output !== undefined)

  // read_molecule_doc: clicking the row opens the package's MOLECULE.md in the
  // editor (filePath is derived from the input's package name).
  const isDocOpen = name === 'read_molecule_doc' && filePath != null && onFileOpen != null

  // Only exec_command and web_fetch get the labeled IN / OUT pane treatment.
  const showInOut = name === 'exec_command' || name === 'web_fetch'
  const inContent = showInOut && input !== undefined ? renderIn(name, input) : null
  const outContent = showInOut && output !== undefined ? renderOut(name, output) : null

  const handleClick =
    (isNewFile || isDocOpen) && filePath && onFileOpen
      ? () => {
          onFileOpen(filePath)
        }
      : isFileDiff
        ? () => {
            onFileDiff!(filePath!, fileDiff)
          }
        : hasDetails
          ? () => {
              setExpanded((e) => !e)
            }
          : undefined

  // ── update_task_list: the working checklist the user watches ───────────────
  if (name === 'update_task_list') {
    const todos = normalizeTaskListInput(input)
    const completed = todos.filter((todo) => todo.status === 'completed').length
    const borderClr = isLight ? '#d0d7de' : '#3d444d'
    const statusGlyph = (status: string): string =>
      status === 'completed' ? '✓' : status === 'in_progress' ? '◐' : '○'
    const statusColor = (status: string): string =>
      status === 'completed'
        ? '#3fb950'
        : status === 'in_progress'
          ? isLight
            ? '#2563eb'
            : '#60a5fa'
          : isLight
            ? '#848d97'
            : '#6e7681'

    return (
      <div
        className={className}
        data-mol-id="task-list-card"
        style={{
          marginBottom: '8px',
          marginTop: '8px',
          borderRadius: '8px',
          border: `1px solid ${borderClr}`,
          background: isLight ? '#f6f8fa' : 'rgba(255,255,255,0.04)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            padding: '6px 12px',
            borderBottom: todos.length > 0 ? `1px solid ${borderClr}` : 'none',
            fontSize: '12px',
            fontWeight: 600,
          }}
        >
          <span>{t('ide.chat.taskListTitle', undefined, { defaultValue: 'Working plan' })}</span>
          {todos.length > 0 && (
            <span style={{ fontWeight: 400, opacity: 0.65 }}>
              {t(
                'ide.chat.taskListProgress',
                { done: completed, total: todos.length },
                {
                  defaultValue: '{{done}} of {{total}} done',
                },
              )}
            </span>
          )}
        </div>
        {todos.map((todo, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              padding: '4px 12px',
              borderTop:
                i > 0 ? `1px solid ${isLight ? '#eaeef2' : 'rgba(255,255,255,0.06)'}` : 'none',
              fontSize: '12.5px',
              ...(todo.status === 'completed'
                ? { opacity: 0.55, textDecoration: 'line-through' }
                : {}),
            }}
          >
            <span
              aria-hidden
              style={{
                flexShrink: 0,
                width: 16,
                fontSize: '12px',
                lineHeight: '17px',
                color: statusColor(todo.status),
                fontWeight: 600,
              }}
            >
              {statusGlyph(todo.status)}
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              {todo.priority === 'high' && todo.status !== 'completed' && (
                <span
                  style={{
                    color: isLight ? '#d63a2f' : '#f87171',
                    fontWeight: 600,
                    marginRight: '4px',
                  }}
                >
                  !
                </span>
              )}
              {todo.content}
            </span>
          </div>
        ))}
      </div>
    )
  }

  // ── spawn_agent: subagent card — explore report / judge verdict ─────────────
  if (name === 'spawn_agent') {
    const inp = (input ?? {}) as Inp
    const kind = inp.type === 'judge' ? 'judge' : 'explore'
    const out = (output ?? {}) as { report?: unknown; error?: unknown }
    const errorText = typeof out.error === 'string' ? out.error : ''
    const report = typeof out.report === 'string' ? out.report : ''
    const verdict = kind === 'judge' ? parseJudgeVerdict(report) : null
    const [expanded, setExpanded] = useState(false)
    const borderClr = isLight ? '#d0d7de' : '#3d444d'
    const verdictTint = isLight ? 'rgba(63,185,80,0.08)' : 'rgba(63,185,80,0.12)'
    const failTint = isLight ? 'rgba(248,81,73,0.08)' : 'rgba(248,81,73,0.14)'
    const verdictColor = verdict?.verdict === 'PASS' ? '#3fb950' : '#f8554f'
    const bodyText = verdict ? verdict.rest : report

    return (
      <div
        className={className}
        data-mol-id="subagent-card"
        style={{
          marginBottom: '8px',
          marginTop: '8px',
          borderRadius: '8px',
          border: `1px solid ${borderClr}`,
          background: isLight ? '#f6f8fa' : 'rgba(255,255,255,0.04)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            fontSize: '12px',
            fontWeight: 600,
            borderBottom: report || errorText ? `1px solid ${borderClr}` : 'none',
          }}
        >
          <span
            aria-hidden
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              flexShrink: 0,
              background:
                status === 'error' || errorText
                  ? '#f04040'
                  : status === 'done'
                    ? '#3fb950'
                    : status === 'running'
                      ? '#e8a000'
                      : '#888888',
            }}
          />
          <span>
            {kind === 'judge'
              ? t('ide.chat.subagent.judge', undefined, { defaultValue: 'Acceptance judge' })
              : t('ide.chat.subagent.explore', undefined, { defaultValue: 'Research subagent' })}
          </span>
          {status === 'running' && (
            <span style={{ fontWeight: 400, opacity: 0.6 }}>
              {t('ide.chat.subagent.working', undefined, { defaultValue: 'working…' })}
            </span>
          )}
        </div>

        {errorText && (
          <div
            style={{
              padding: '8px 12px',
              fontSize: '12px',
              color: '#f8554f',
              borderBottom: `1px solid ${borderClr}`,
            }}
          >
            {errorText}
          </div>
        )}

        {verdict && (
          <div
            data-mol-id="subagent-verdict"
            style={{
              padding: '8px 12px',
              background: verdict.verdict === 'PASS' ? verdictTint : failTint,
              borderBottom: `1px solid ${borderClr}`,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                fontWeight: 700,
                color: verdictColor,
              }}
            >
              {verdict.verdict === 'PASS' ? '✓' : '✕'}
              {verdict.verdict === 'PASS'
                ? t('ide.chat.subagent.verdictPass', undefined, { defaultValue: 'PASS' })
                : t('ide.chat.subagent.verdictFail', undefined, { defaultValue: 'FAIL' })}
            </div>
            {verdict.issues.length > 0 && (
              <ul
                style={{
                  margin: '6px 0 0',
                  paddingLeft: '18px',
                  fontSize: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  opacity: 0.9,
                }}
              >
                {verdict.issues.map((issue, i) => (
                  <li key={i}>{issue}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {bodyText && (
          <div style={{ padding: '8px 12px' }}>
            <div
              style={{
                fontSize: '12px',
                whiteSpace: 'pre-wrap',
                maxHeight: expanded ? undefined : 150,
                overflow: 'hidden',
                opacity: 0.9,
              }}
            >
              {bodyText}
            </div>
            {bodyText.length > 600 && (
              <button
                type="button"
                data-mol-id="subagent-report-toggle"
                className={cm.button({ variant: 'link', color: 'primary', size: 'xs' })}
                onClick={() => setExpanded((e) => !e)}
                style={{ marginTop: '4px' }}
              >
                {expanded
                  ? t('ide.chat.subagent.hideReport', undefined, {
                      defaultValue: 'Show less',
                    })
                  : t('ide.chat.subagent.showReport', undefined, {
                      defaultValue: 'Show full report',
                    })}
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  // ── save_plan: clickable row that opens the plan file in the editor ──────────
  if (name === 'save_plan') {
    const planOutput = (output ?? {}) as { path?: string }
    const planPath = planOutput.path ?? null

    // Render as a standard tool card row — click opens the plan file
    const planHandleClick =
      planPath && onFileOpen
        ? () => {
            onFileOpen(planPath)
          }
        : undefined

    return (
      <div className={className} style={{ marginBottom: '4px' }}>
        <button
          type="button"
          onClick={planHandleClick}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '6px',
            background: 'none',
            border: 'none',
            cursor: planHandleClick ? 'pointer' : 'default',
            color: 'inherit',
            textAlign: 'left',
            padding: '2px 0',
            // Touch: ~20px rows are untappable — 32px is the dense-row floor.
            ...(isCoarse ? { minHeight: 32 } : {}),
            width: '100%',
          }}
        >
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="10" height="10" viewBox="0 0 10 10" style={{ flexShrink: 0 }}>
                <circle cx="5" cy="5" r="3" fill={dotColor} opacity="0.35" />
                <circle cx="5" cy="5" r="3" fill="none" stroke={dotColor} strokeWidth="2" />
              </svg>
              <span
                style={{
                  flex: 1,
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {renderLabel(name, input, planPath, onFileOpen, onFileDoubleClick)}
              </span>
            </span>
          </span>
          {planHandleClick && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              width="14"
              height="14"
              style={{
                display: 'block',
                flexShrink: 0,
                marginTop: '3px',
                transition: 'opacity 100ms',
                opacity: isHovered ? 0.85 : 0.35,
              }}
            >
              <polyline
                points="6,4 10,8 6,12"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
      </div>
    )
  }

  // ── ask_user: render interactive option list instead of a normal tool card ──
  if (name === 'ask_user') {
    // NEVER render raw tool input. `options` is declared as strings-or-objects
    // in the tool schema, but the schema is a request to a language model, not
    // a guarantee — weaker models send `[{ label: 'Recipe box' }]`, nested
    // arrays, or quote-escaped pseudo-JSON, and an object reaching JSX throws
    // React error #31 during render, which takes down the entire IDE.
    const askInput = normalizeAskUserInput(input)
    const askOutput = output as { status?: string } | string | undefined
    const serverAwaiting =
      typeof askOutput === 'object' && askOutput?.status === 'awaiting_response'
    const isResponded = typeof askOutput === 'string'
    const [localAnswer, setLocalAnswer] = useState<string | null>(null)
    const isAwaiting = serverAwaiting && localAnswer === null
    const selectedAnswer = isResponded ? (askOutput as string) : localAnswer
    const [freeText, setFreeText] = useState('')
    const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
    // Multi-select picks in progress (labels); sent as one string joined with
    // '; ' on confirm — the same shape an answered multi-select persists as.
    const [multiPicks, setMultiPicks] = useState<string[]>([])
    // Narrow screens have no room for the side-by-side preview pane; there a
    // preview expands inline under its option row instead.
    const [expandedPreviewIdx, setExpandedPreviewIdx] = useState<number | null>(null)

    // Don't render until the question has streamed in. `tool_use_start` surfaces
    // the card the instant the call begins — before its input arrives — which
    // would otherwise flash an empty question + option list. Once the full input
    // is parsed (final `tool_use`), the card appears fully formed. (Placed after
    // the hooks above so the hook order stays stable across renders.)
    if (!askInput.question) return null

    const borderClr = isLight ? '#d0d7de' : '#3d444d'
    const labelChar = (i: number): string => String.fromCharCode(65 + i) // A, B, C, …
    const hasPreviews = askInput.options.some((option) => option.preview)
    const multi = askInput.multiSelect && askInput.options.length > 0
    // The plan-approval card renders its two decisions as prominent design-
    // system CTAs (approve = primary solid, request changes = outline) instead
    // of letter-badged rows — this is the product's single most consequential
    // click, and it should look like it.
    const reviewCtas =
      !!askInput.planReview && !multi && askInput.options.length === 2 && !hasPreviews
    const answeredLabels =
      multi && typeof selectedAnswer === 'string'
        ? selectedAnswer
            .split('; ')
            .map((part) => part.trim())
            .filter(Boolean)
        : []
    const selectedSet = new Set([...multiPicks, ...answeredLabels])
    // Which option's preview the pane shows: the hovered/focused one, else the
    // picked one, else the first option that has a preview at all.
    const previewIdx = (() => {
      if (!hasPreviews) return null
      const candidate = hoveredIdx ?? expandedPreviewIdx
      if (candidate != null && askInput.options[candidate]?.preview) return candidate
      const pickedIdx = askInput.options.findIndex((option) => selectedSet.has(option.label))
      if (pickedIdx >= 0 && askInput.options[pickedIdx].preview) return pickedIdx
      return askInput.options.findIndex((option) => option.preview)
    })()
    const previewOption = previewIdx != null ? askInput.options[previewIdx] : undefined

    return (
      <div
        className={className}
        style={{
          marginBottom: '8px',
          marginTop: '8px',
          borderRadius: '8px',
          border: `1px solid ${borderClr}`,
          background: isLight ? '#f6f8fa' : 'rgba(255,255,255,0.04)',
          overflow: 'hidden',
        }}
      >
        {/* Question header — the plan-approval card gets the rich REVIEW
            header (badge, plan name, step count, clickable path, checklist
            preview); every other question renders as markdown (the model
            formats questions with **bold**, bullets, and line breaks). */}
        {askInput.planReview ? (
          <div
            data-mol-id="plan-review-card"
            style={{
              padding: '10px 12px 10px',
              fontSize: '13px',
              borderBottom: `1px solid ${borderClr}`,
            }}
          >
            <div
              style={{
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.03em',
                textTransform: 'uppercase',
                opacity: 0.6,
                marginBottom: '6px',
              }}
            >
              {t('ide.chat.planReview.badge', undefined, {
                defaultValue: 'Plan ready for review',
              })}
            </div>
            <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>
              {askInput.planReview.name ||
                (askInput.planReview.path ? basename(askInput.planReview.path) : '') ||
                t('ide.chat.planReview.fallbackTitle', undefined, {
                  defaultValue: 'Implementation plan',
                })}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '12px',
                opacity: 0.75,
                marginBottom: askInput.planReview.preview.length > 0 ? '8px' : 0,
              }}
            >
              <span>
                {t(
                  'ide.chat.planReview.steps',
                  { count: askInput.planReview.steps },
                  {
                    defaultValue: '{{count}} steps',
                  },
                )}
              </span>
              {askInput.planReview.path && onFileOpen && (
                <button
                  type="button"
                  data-mol-id="plan-review-open"
                  className={cm.button({ variant: 'link', color: 'primary', size: 'xs' })}
                  onClick={() => onFileOpen(askInput.planReview!.path!)}
                >
                  {t('ide.chat.planReview.openPlan', undefined, { defaultValue: 'Open plan' })}
                </button>
              )}
            </div>
            {askInput.planReview.preview.length > 0 && (
              <ul
                style={{
                  margin: 0,
                  paddingLeft: '18px',
                  fontSize: '12px',
                  opacity: 0.8,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                }}
              >
                {askInput.planReview.preview.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ul>
            )}
            {askInput.planReview.steps > askInput.planReview.preview.length && (
              <div style={{ fontSize: '11px', opacity: 0.55, marginTop: '4px' }}>
                {t(
                  'ide.chat.planReview.more',
                  { count: askInput.planReview.steps - askInput.planReview.preview.length },
                  { defaultValue: '+ {{count}} more steps' },
                )}
              </div>
            )}
          </div>
        ) : (
          <div
            style={{
              padding: '4px 12px 10px',
              fontSize: '13px',
              borderBottom: `1px solid ${borderClr}`,
            }}
          >
            <MarkdownContent text={unescapeLiterals(askInput.question)} isStreaming={false} />
            {multi && isAwaiting && (
              <div
                style={{ fontSize: '11px', fontStyle: 'italic', opacity: 0.55, marginTop: '4px' }}
              >
                {t('ide.chat.askUserMultiHint', undefined, {
                  defaultValue: 'You can choose more than one.',
                })}
              </div>
            )}
          </div>
        )}

        {/* Options, and — when any option carries a preview artifact — a
            side-by-side preview pane on wide screens (narrow screens expand
            the preview inline under its option row instead). */}
        <div style={{ display: 'flex', alignItems: 'stretch' }}>
          <div
            style={{
              flex: hasPreviews && !isNarrow ? '1 1 55%' : '1 1 100%',
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {reviewCtas ? (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                  padding: '10px 12px',
                }}
              >
                {askInput.options.map((option, i) => {
                  const isPicked = selectedAnswer === option.label
                  return (
                    <button
                      key={i}
                      type="button"
                      data-mol-id={`plan-review-cta-${i}`}
                      disabled={!isAwaiting || onAskUserResponse == null}
                      className={cm.cn(
                        cm.button(
                          i === 0
                            ? { variant: 'solid', color: 'primary', size: 'sm' }
                            : { variant: 'outline', color: 'secondary', size: 'sm' },
                        ),
                        cm.touchTargetCompact,
                      )}
                      style={{
                        flex: isNarrow ? '1 1 100%' : '1 1 auto',
                        ...(isPicked ? { outline: '2px solid #3fb950', outlineOffset: '1px' } : {}),
                      }}
                      onClick={() => {
                        if (onAskUserResponse == null) return
                        setLocalAnswer(option.label)
                        onAskUserResponse(option.label)
                      }}
                    >
                      {isPicked ? `✓ ${option.label}` : option.label}
                    </button>
                  )
                })}
              </div>
            ) : (
              askInput.options.map((option, i) => {
                const isSelected = selectedSet.has(option.label)
                const isFaded = !isAwaiting && !isSelected
                const isHover = isAwaiting && hoveredIdx === i
                const isPreviewExpanded = expandedPreviewIdx === i

                return (
                  <div key={i}>
                    <div style={{ display: 'flex', alignItems: 'stretch' }}>
                      <button
                        type="button"
                        data-mol-id={`ask-user-option-${i}`}
                        disabled={!isAwaiting || onAskUserResponse == null}
                        onClick={() => {
                          // No handler = read-only (a project viewer): answering is editor work.
                          if (onAskUserResponse == null) return
                          if (multi) {
                            // Multi-select toggles a pick; a Confirm row submits them.
                            setMultiPicks((picks) =>
                              picks.includes(option.label)
                                ? picks.filter((p) => p !== option.label)
                                : [...picks, option.label],
                            )
                            return
                          }
                          setLocalAnswer(option.label)
                          onAskUserResponse(option.label)
                        }}
                        onFocus={() => {
                          if (isAwaiting) setHoveredIdx(i)
                        }}
                        onMouseEnter={() => {
                          if (isAwaiting) setHoveredIdx(i)
                        }}
                        onMouseLeave={() => setHoveredIdx(null)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          flex: 1,
                          minWidth: 0,
                          padding: option.description ? '7px 12px' : '8px 12px',
                          // Touch: full 44px rows — these are the PRIMARY discovery answers,
                          // so they get the standalone-control floor, not the dense-row 32.
                          ...(isCoarse ? { minHeight: 44 } : {}),
                          border: 'none',
                          borderTop: i > 0 ? `1px solid ${borderClr}` : 'none',
                          background: isSelected
                            ? isLight
                              ? '#dbeafe'
                              : 'rgba(59,130,246,0.2)'
                            : isHover
                              ? isLight
                                ? '#eaeef2'
                                : 'rgba(255,255,255,0.06)'
                              : 'transparent',
                          color: 'inherit',
                          cursor: isAwaiting ? 'pointer' : 'default',
                          textAlign: 'left',
                          fontSize: '13px',
                          opacity: isFaded ? 0.4 : 1,
                          transition: 'background 80ms, opacity 80ms',
                        }}
                      >
                        {/* Letter badge (checkbox-style when multi-select: filled
                        letter = picked, hollow = not yet). */}
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 22,
                            height: 22,
                            borderRadius: multi ? '6px' : '5px',
                            border: `1px solid ${isSelected ? (isLight ? '#93c5fd' : '#3b82f6') : borderClr}`,
                            background: isSelected
                              ? isLight
                                ? '#3b82f6'
                                : '#2563eb'
                              : isLight
                                ? '#fff'
                                : 'rgba(255,255,255,0.08)',
                            color: isSelected ? '#fff' : isLight ? '#57606a' : '#848d97',
                            fontSize: '11px',
                            fontWeight: 600,
                            flexShrink: 0,
                            fontFamily: '"SF Mono", Menlo, Consolas, "Courier New", monospace',
                          }}
                        >
                          {multi && isSelected ? '✓' : labelChar(i)}
                        </span>

                        {/* Option label + optional one-line description */}
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: 'block' }}>{option.label}</span>
                          {option.description && (
                            <span
                              style={{
                                display: 'block',
                                fontSize: '11px',
                                opacity: 0.65,
                                marginTop: '1px',
                              }}
                            >
                              {option.description}
                            </span>
                          )}
                        </span>

                        {/* Checkmark for a picked single-select option */}
                        {!multi && isSelected && (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 16 16"
                            width="14"
                            height="14"
                            fill={isLight ? '#2563eb' : '#60a5fa'}
                          >
                            <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
                          </svg>
                        )}
                      </button>

                      {/* Narrow screens: expand this option's preview inline (a
                      sibling button — interactive elements never nest). */}
                      {hasPreviews && isNarrow && option.preview && (
                        <button
                          type="button"
                          data-mol-id={`ask-user-option-preview-${i}`}
                          aria-label={t('ide.chat.askUserPreview', undefined, {
                            defaultValue: 'Preview',
                          })}
                          disabled={!isAwaiting}
                          onClick={() => setExpandedPreviewIdx(isPreviewExpanded ? null : i)}
                          style={{
                            flexShrink: 0,
                            width: 36,
                            border: 'none',
                            borderTop: i > 0 ? `1px solid ${borderClr}` : 'none',
                            borderLeft: `1px solid ${borderClr}`,
                            background: isPreviewExpanded
                              ? isLight
                                ? '#eaeef2'
                                : 'rgba(255,255,255,0.06)'
                              : 'transparent',
                            color: 'inherit',
                            cursor: isAwaiting ? 'pointer' : 'default',
                            fontSize: '14px',
                            opacity: 0.7,
                            transform: isPreviewExpanded ? 'rotate(90deg)' : 'none',
                            transition: 'transform 80ms',
                          }}
                        >
                          ›
                        </button>
                      )}
                    </div>

                    {/* Inline preview (narrow screens only — wide screens use the
                    side pane below). */}
                    {hasPreviews && isNarrow && option.preview && isPreviewExpanded && (
                      <div
                        style={{
                          borderTop: `1px solid ${borderClr}`,
                          background: isLight ? '#fff' : 'rgba(255,255,255,0.03)',
                          padding: '8px 12px',
                          maxHeight: 240,
                          overflowY: 'auto',
                          fontSize: '12px',
                        }}
                      >
                        <MarkdownContent text={option.preview} isStreaming={false} />
                      </div>
                    )}
                  </div>
                )
              })
            )}

            {/* Multi-select confirm row — submits the picked labels as one
                '; '-joined answer string. */}
            {multi && isAwaiting && onAskUserResponse != null && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '8px',
                  alignItems: 'center',
                  padding: '8px 12px',
                  borderTop: `1px solid ${borderClr}`,
                }}
              >
                <span style={{ fontSize: '11px', opacity: 0.6 }}>
                  {t('ide.chat.askUserSelectedCount', undefined, {
                    defaultValue: '{{count}} selected',
                    count: multiPicks.length,
                  })}
                </span>
                <button
                  type="button"
                  data-mol-id="ask-user-multiselect-confirm"
                  disabled={multiPicks.length === 0}
                  className={cm.cn(
                    cm.button({ variant: 'solid', color: 'primary', size: 'xs' }),
                    cm.touchTargetCompact,
                  )}
                  onClick={() => {
                    if (multiPicks.length === 0) return
                    setLocalAnswer(multiPicks.join('; '))
                    onAskUserResponse(multiPicks.join('; '))
                  }}
                >
                  {t('ide.chat.askUserMultiConfirm', undefined, {
                    defaultValue: 'Confirm choice',
                  })}
                </button>
              </div>
            )}
          </div>

          {/* Side-by-side preview pane (wide screens, rich options only). Shows
              the hovered/focused option's artifact — mockups, code, API shapes
              — so alternatives can be compared without scrolling. */}
          {hasPreviews && !isNarrow && (
            <div
              style={{
                flex: '1 1 45%',
                minWidth: 0,
                borderLeft: `1px solid ${borderClr}`,
                display: 'flex',
                flexDirection: 'column',
                background: isLight ? '#fff' : 'rgba(255,255,255,0.03)',
              }}
            >
              <div
                style={{
                  padding: '6px 12px',
                  fontSize: '11px',
                  fontWeight: 600,
                  opacity: 0.6,
                  borderBottom: `1px solid ${borderClr}`,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {previewOption
                  ? previewOption.label
                  : t('ide.chat.askUserPreview', undefined, { defaultValue: 'Preview' })}
              </div>
              <div
                style={{
                  padding: '8px 12px',
                  maxHeight: 360,
                  overflowY: 'auto',
                  fontSize: '12px',
                }}
              >
                {previewOption?.preview && (
                  <MarkdownContent text={previewOption.preview} isStreaming={false} />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Free-text input. Shown by DEFAULT so the user is never stuck on an
            open-ended question (e.g. "what's your bakery called?") that the model
            asked without setting allowFreeText. Hidden only if the model
            explicitly opts out (allowFreeText === false) for a strict pick-one. */}
        {isAwaiting && askInput.allowFreeText !== false && onAskUserResponse != null && (
          <div
            style={{
              display: 'flex',
              gap: '4px',
              padding: '8px 12px',
              borderTop: `1px solid ${borderClr}`,
            }}
          >
            <input
              type="text"
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && freeText.trim()) {
                  setLocalAnswer(freeText.trim())
                  onAskUserResponse?.(freeText.trim())
                  setFreeText('')
                }
              }}
              placeholder={
                askInput.options.length === 0
                  ? t('ide.chat.askUserPlaceholderEmpty', undefined, {
                      defaultValue: 'Type your answer…',
                    })
                  : t('ide.chat.askUserPlaceholder', undefined, {
                      defaultValue: 'Or something else…',
                    })
              }
              style={{
                flex: 1,
                minWidth: 0,
                padding: '5px 8px',
                borderRadius: '5px',
                border: `1px solid ${borderClr}`,
                background: 'transparent',
                color: 'inherit',
                // Deliberate iOS-zoom guard: a focused input below 16px makes iOS
                // Safari zoom the whole page on phone-width / touch-first viewports.
                fontSize: isNarrow || isCoarse ? '16px' : '12px',
                outline: 'none',
              }}
            />
            <button
              type="button"
              disabled={!freeText.trim()}
              onClick={() => {
                if (freeText.trim()) {
                  setLocalAnswer(freeText.trim())
                  onAskUserResponse?.(freeText.trim())
                  setFreeText('')
                }
              }}
              onMouseEnter={(e) => {
                if (freeText.trim()) {
                  e.currentTarget.style.background = 'rgba(64,112,224,0.3)'
                  e.currentTarget.style.borderColor = 'rgba(64,112,224,0.65)'
                  e.currentTarget.style.color = '#6090f0'
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = freeText.trim()
                  ? 'rgba(64,112,224,0.2)'
                  : 'transparent'
                e.currentTarget.style.borderColor = freeText.trim()
                  ? 'rgba(64,112,224,0.4)'
                  : 'transparent'
                e.currentTarget.style.color = freeText.trim() ? '#4070e0' : 'inherit'
              }}
              style={{
                // Touch floor for the free-text Send action (40px in this dense
                // composer row); fine pointers keep the compact 30px.
                height: isCoarse ? 40 : 30,
                padding: '0 10px',
                borderRadius: 6,
                border: freeText.trim()
                  ? '1px solid rgba(64,112,224,0.4)'
                  : '1px solid transparent',
                background: freeText.trim() ? 'rgba(64,112,224,0.2)' : 'transparent',
                color: freeText.trim() ? '#4070e0' : 'inherit',
                cursor: freeText.trim() ? 'pointer' : 'default',
                fontSize: '12px',
                fontWeight: 500,
                opacity: freeText.trim() ? 1 : 0.3,
                transition: 'background 100ms, border-color 100ms, color 100ms',
              }}
            >
              {t('ide.chat.askUserSubmit', undefined, { defaultValue: 'Send' })}
            </button>
          </div>
        )}

        {/* Show free-text response if it wasn't one of the preset options */}
        {selectedAnswer && !askInput.options.some((option) => option.label === selectedAnswer) && (
          <div
            style={{
              padding: '8px 12px',
              borderTop: `1px solid ${borderClr}`,
              fontSize: '12px',
              fontStyle: 'italic',
            }}
          >
            {selectedAnswer}
          </div>
        )}

        {/* Optional hint text */}
        {askInput.hint && (
          <div
            style={{
              padding: '8px 12px',
              borderTop: `1px solid ${borderClr}`,
              fontSize: '11px',
              fontStyle: 'italic',
              opacity: 0.5,
            }}
          >
            {askInput.hint}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={className} style={{ marginBottom: '4px' }}>
      {/* The row and its Skip are SIBLINGS: the row itself is a <button>, and a
          real button nested inside one is invalid HTML (which is why the undo
          control above has to be a role="button" span). Skip is an action the
          person clicks, so it gets to be a genuine button. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
        <button
          type="button"
          onClick={handleClick}
          onDoubleClick={
            isNewFile && filePath && onFileDoubleClick
              ? () => {
                  onFileDoubleClick(filePath)
                }
              : undefined
          }
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{
            display: 'flex',
            // Coarse: the undo icon's 32px touch box inflates the label row, so
            // top-alignment would leave the diff stats/chevron riding high —
            // center everything instead. Desktop keeps flex-start + px nudges.
            alignItems: isCoarse ? 'center' : 'flex-start',
            gap: '6px',
            background: 'none',
            border: 'none',
            cursor: handleClick ? 'pointer' : 'default',
            color: 'inherit',
            textAlign: 'left',
            padding: '2px 0',
            // Touch: ~20px rows are untappable — 32px is the dense-row floor.
            ...(isCoarse ? { minHeight: 32 } : {}),
            width: '100%',
            // The row shares its line with the Skip button: without this it
            // keeps its intrinsic min-width and pushes the Skip off a 390px
            // screen instead of letting the label ellipsise.
            minWidth: 0,
          }}
        >
          {/* Label + undo icon + one-line summary */}
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {/* Colored status dot — inside the flex row so it auto-centers with the label */}
              <svg width="10" height="10" viewBox="0 0 10 10" style={{ flexShrink: 0 }}>
                <circle cx="5" cy="5" r="3" fill={dotColor} opacity="0.35" />
                <circle cx="5" cy="5" r="3" fill="none" stroke={dotColor} strokeWidth="2" />
              </svg>
              <span
                style={{
                  flex: 1,
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {renderLabel(name, input, filePath, onFileOpen, onFileDoubleClick)}
              </span>
              {/* One-line status ("Running…"/"Done"/error count), on the SAME row as the
                label and pushed to the right edge by the label's flex:1. */}
              {summary && (
                <span
                  className={cm.cn(cm.textMuted, cm.textSize('xs'))}
                  style={{ flexShrink: 0, marginLeft: '8px', whiteSpace: 'nowrap' }}
                >
                  {summary}
                </span>
              )}
              {canRevert && status !== 'running' && (
                <span
                  role="button"
                  tabIndex={0}
                  title={
                    isUndone
                      ? t('ide.chat.redoChange', undefined, {
                          defaultValue: 'Re-apply this change',
                        })
                      : t('ide.chat.undoChange', undefined, { defaultValue: 'Undo this change' })
                  }
                  onClick={handleRevert}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleRevert(e as unknown as React.MouseEvent)
                    }
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(128,128,128,0.2)'
                    e.currentTarget.style.opacity = '1'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.opacity = ''
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    // Touch: hover can't reveal it, so it rests visible at 0.6 and
                    // gets a 32px hit box (the floor for these dense inline rows).
                    width: isCoarse ? 32 : 20,
                    height: isCoarse ? 32 : 20,
                    borderRadius: 4,
                    flexShrink: 0,
                    // Nudge up 1px: the 13px glyph sat slightly below the text's
                    // optical center of the compact 20px box (moot at 32px).
                    position: 'relative',
                    top: isCoarse ? 0 : '-1px',
                    cursor: isReverting ? 'wait' : 'pointer',
                    opacity: isReverting ? 0.3 : isHovered || isCoarse ? 0.6 : 0,
                    transition: 'opacity 100ms, background 100ms',
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 16 16"
                    width="13"
                    height="13"
                    fill="currentColor"
                  >
                    {isUndone ? (
                      <path d="M14.78 6.28a.749.749 0 0 0 0-1.06l-3.5-3.5a.749.749 0 1 0-1.06 1.06L12.439 5H5.251l-.001.007L5.251 5a.8.8 0 0 0-.171.019A4.501 4.501 0 0 0 5.5 14h1.704a.75.75 0 0 0 0-1.5H5.5a3 3 0 1 1 0-6h6.939L10.22 8.72a.749.749 0 1 0 1.06 1.06l3.5-3.5Z" />
                    ) : (
                      <path d="M1.22 6.28a.749.749 0 0 1 0-1.06l3.5-3.5a.749.749 0 1 1 1.06 1.06L3.561 5h7.188l.001.007L10.749 5c.058 0 .116.007.171.019A4.501 4.501 0 0 1 10.5 14H8.796a.75.75 0 0 1 0-1.5H10.5a3 3 0 1 0 0-6H3.561L5.78 8.72a.749.749 0 1 1-1.06 1.06l-3.5-3.5Z" />
                    )}
                  </svg>
                </span>
              )}
            </span>
          </span>

          {/* Line diff stats for file-changing tools */}
          {diffStats && (
            <span
              style={{
                display: 'flex',
                gap: '4px',
                flexShrink: 0,
                marginTop: isCoarse ? 0 : '2px',
                fontSize: '11px',
                fontFamily: '"SF Mono", Menlo, Consolas, "Courier New", monospace',
                opacity: isHovered ? 1 : 0.6,
                transition: 'opacity 100ms',
              }}
            >
              {diffStats.added > 0 && (
                <span
                  style={{
                    color: isUndone
                      ? isLight
                        ? '#cf222e'
                        : '#f47067'
                      : isLight
                        ? '#1a7f37'
                        : '#57ab5a',
                    textDecoration: isUndone ? 'line-through' : undefined,
                  }}
                >
                  +{diffStats.added}
                </span>
              )}
              {diffStats.removed > 0 && (
                <span
                  style={{
                    color: isUndone
                      ? isLight
                        ? '#1a7f37'
                        : '#57ab5a'
                      : isLight
                        ? '#cf222e'
                        : '#f47067',
                    textDecoration: isUndone ? 'line-through' : undefined,
                  }}
                >
                  -{diffStats.removed}
                </span>
              )}
            </span>
          )}

          {/* Expand / open chevron */}
          {(hasDetails || isFileDiff || isDocOpen || (isNewFile && filePath && onFileOpen)) && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              width="14"
              height="14"
              style={{
                display: 'block',
                flexShrink: 0,
                marginTop: isCoarse ? 0 : '3px',
                transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 150ms, opacity 100ms',
                opacity: isHovered ? 0.85 : 0.35,
              }}
            >
              <polyline
                points="6,4 10,8 6,12"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
        {canSkip && (
          <button
            type="button"
            data-mol-id={`tool-call-skip-${id}`}
            onClick={() => {
              void handleSkip()
            }}
            disabled={skipRequested || skipDisabledReason != null}
            title={skipDisabledReason ?? undefined}
            className={cm.cn(cm.button({ variant: 'solid', color: 'primary', size: 'xs' }))}
            style={{ flexShrink: 0 }}
          >
            {skipRequested
              ? t('ide.chat.skippingToolCall', undefined, { defaultValue: 'Skipping…' })
              : t('ide.chat.skipToolCall', undefined, { defaultValue: 'Skip' })}
          </button>
        )}
      </div>

      {/* Expanded detail */}
      {expanded && hasDetails && (
        <div
          className={cm.surfaceSecondary}
          style={{
            marginLeft: '14px',
            marginTop: '4px',
            marginBottom: '4px',
            borderRadius: '4px',
            overflowX: 'auto',
          }}
        >
          {showInOut ? (
            <>
              {inContent && (
                <div style={{ padding: '6px 10px' }}>
                  <div
                    className={cm.textMuted}
                    style={{
                      fontSize: '9px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.6px',
                      marginBottom: '4px',
                      fontWeight: 600,
                    }}
                  >
                    IN
                  </div>
                  {inContent}
                </div>
              )}
              {outContent && (
                <div
                  style={{
                    padding: '6px 10px',
                    borderTop: inContent ? '1px solid rgba(128,128,128,0.15)' : undefined,
                  }}
                >
                  <div
                    className={cm.textMuted}
                    style={{
                      fontSize: '9px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.6px',
                      marginBottom: '4px',
                      fontWeight: 600,
                    }}
                  >
                    OUT
                  </div>
                  {outContent}
                </div>
              )}
            </>
          ) : (
            <div style={{ padding: '6px 10px' }}>
              {/* rename_file: show old → new path */}
              {name === 'rename_file' && (
                <pre style={PRE}>
                  {str(((input ?? {}) as Inp).old_path) ?? ''}
                  {' → '}
                  {str(((input ?? {}) as Inp).new_path) ?? ''}
                </pre>
              )}

              {/* Listing / search tools: show output results */}
              {(name === 'list_files' || name === 'find_files' || name === 'search_files') &&
                output !== undefined &&
                renderOut(name, output)}

              {/* find_package: clickable package matches — each opens its MOLECULE.md */}
              {name === 'find_package' && output !== undefined && (
                <PackageResultRows results={packageResults(output)} onFileOpen={onFileOpen} />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
})
