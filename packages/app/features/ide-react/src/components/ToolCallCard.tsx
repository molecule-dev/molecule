/**
 * Tool call display row — compact, Claude Code-style.
 *
 * Shows a colored status dot, a human-readable action label, and a
 * one-line result summary. Expands on click to reveal formatted IN / OUT
 * sections: diffs for file edits, terminal output for commands, etc.
 *
 * @module
 */

import type { JSX, ReactNode } from 'react'
import { memo, useCallback, useState } from 'react'

import { t } from '@molecule/app-i18n'
import { useThemeMode } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { ToolCallCardProps } from '../types.js'
import type { ToolOutput } from './tool-call-utilities.js'
import {
  basename,
  extractFilePath,
  fileDiffStats,
  toolLabel,
  toolSummary,
} from './tool-call-utilities.js'

type Inp = Record<string, unknown>
type Out = ToolOutput

// ---------------------------------------------------------------------------
// Label renderer — turns `backtick` segments into inline <code> spans
// ---------------------------------------------------------------------------

const CODE_STYLE: React.CSSProperties = {
  fontFamily: '"SF Mono", Menlo, Consolas, "Courier New", monospace',
  fontSize: 'inherit',
}

/**
 * Clickable filename code — single click opens preview, double click pins tab.
 * @param root0 - Component props.
 * @param root0.filePath - The file path to open on click.
 * @param root0.onFileOpen - Callback invoked on single click to preview the file.
 * @param root0.onFileDoubleClick - Callback invoked on double click to pin the file tab.
 * @param root0.children - The inline code content to display.
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
          {(inp.command as string) ?? ''}
        </pre>
      )

    case 'write_file':
      // Full file content is too noisy — show only the path
      return <pre style={PRE}>{(inp.path as string) ?? ''}</pre>

    case 'edit_file': {
      const replacements = Array.isArray(inp.replacements)
        ? (inp.replacements as Array<{ old_string: string; new_string: string }>)
        : []
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
          {`/${(inp.pattern as string) ?? ''}/`}
          {inp.path ? ` in ${inp.path}` : ''}
          {inp.include ? ` (${inp.include})` : ''}
        </pre>
      )

    case 'find_files':
      return (
        <pre style={PRE}>
          {(inp.pattern as string) ?? ''}
          {inp.path ? ` in ${inp.path}` : ''}
        </pre>
      )

    case 'read_file':
    case 'delete_file':
    case 'list_files':
    case 'create_directory':
      return <pre style={PRE}>{(inp.path as string) ?? ''}</pre>

    case 'rename_file':
      return (
        <pre style={PRE}>
          {(inp.old_path as string) ?? ''} → {(inp.new_path as string) ?? ''}
        </pre>
      )

    case 'web_fetch':
      return (
        <pre style={PRE}>
          {(inp.method as string) ?? 'GET'} {(inp.url as string) ?? ''}
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
    return <pre style={{ ...PRE, color: '#f47067' }}>{out.error as string}</pre>
  }

  switch (name) {
    case 'exec_command': {
      const stdout = ((out.stdout as string) ?? '').trimEnd()
      const stderr = ((out.stderr as string) ?? '').trimEnd()
      const exitCode = out.exitCode as number | undefined
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
          {!stdout && !stderr && <span style={{ opacity: 0.5 }}>{t('ide.toolCall.noOutput', undefined, { defaultValue: '(no output)' })}</span>}
        </div>
      )
    }

    case 'write_file': {
      const diff = out.diff as
        | { type: string; linesAdded: number; linesRemoved: number }
        | undefined
      if (!diff) return <span style={{ opacity: 0.6 }}>{t('ide.toolCall.written', undefined, { defaultValue: 'Written' })}</span>
      if (diff.type === 'unchanged') return <span style={{ opacity: 0.6 }}>{t('ide.toolCall.statusUnchanged', undefined, { defaultValue: 'Unchanged' })}</span>
      return (
        <div style={{ fontFamily: PRE.fontFamily, fontSize: '11px' }}>
          {diff.type === 'new' && (
            <div style={{ color: '#57ab5a' }}>{t('ide.toolCall.newFileLines', { count: diff.linesAdded }, { defaultValue: 'new file, {{count}} lines' })}</div>
          )}
          {diff.type === 'modified' && (
            <>
              {diff.linesAdded > 0 && (
                <div style={{ color: '#57ab5a' }}>{t('ide.toolCall.linesAdded', { count: diff.linesAdded }, { defaultValue: '+{{count}} lines' })}</div>
              )}
              {diff.linesRemoved > 0 && (
                <div style={{ color: '#f47067' }}>{t('ide.toolCall.linesRemoved', { count: diff.linesRemoved }, { defaultValue: '−{{count}} lines' })}</div>
              )}
            </>
          )}
        </div>
      )
    }

    case 'edit_file': {
      const n = out.replacementsApplied as number | undefined
      return (
        <span style={{ opacity: 0.6, fontSize: '11px' }}>
          {n != null ? t('ide.toolCall.changesApplied', { count: n }, { defaultValue: '{{count}} changes applied' }) : t('ide.toolCall.applied', undefined, { defaultValue: 'Applied' })}
        </span>
      )
    }

    case 'read_file': {
      const content = out.content as string | undefined
      if (!content) return <span style={{ opacity: 0.5 }}>{t('ide.toolCall.empty', undefined, { defaultValue: '(empty)' })}</span>
      const truncated = content.length > 3000
      return (
        <pre style={PRE}>{truncated ? content.slice(0, 3000) + '\n' + t('ide.toolCall.truncated', undefined, { defaultValue: '… (truncated)' }) : content}</pre>
      )
    }

    case 'list_files': {
      const entries = out.entries as Array<{ name: string; type: string }> | undefined
      if (!entries?.length) return <span style={{ opacity: 0.5 }}>{t('ide.toolCall.empty', undefined, { defaultValue: '(empty)' })}</span>
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
      const files = out.files as string[] | undefined
      if (!files?.length) return <span style={{ opacity: 0.5 }}>{t('ide.toolCall.noFilesFound', undefined, { defaultValue: 'No files found' })}</span>
      return (
        <div style={{ fontFamily: PRE.fontFamily, fontSize: '11px', lineHeight: 1.6 }}>
          {files.map((f, i) => (
            <div key={i}>{f}</div>
          ))}
        </div>
      )
    }

    case 'search_files': {
      const matches = out.matches as
        | Array<{ file: string; line: number; content: string }>
        | undefined
      if (!matches?.length) return <span style={{ opacity: 0.5 }}>{t('ide.toolCall.noMatches', undefined, { defaultValue: 'No matches' })}</span>
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
            <div style={{ opacity: 0.5, marginTop: '4px' }}>{t('ide.toolCall.andMore', { count: matches.length - 30 }, { defaultValue: '… and {{count}} more' })}</div>
          )}
        </div>
      )
    }

    case 'web_fetch': {
      const status = out.status as number | undefined
      const body = out.body as string | undefined
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
              {body.length > 2000 ? body.slice(0, 2000) + '\n' + t('ide.toolCall.truncated', undefined, { defaultValue: '… (truncated)' }) : body}
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
 * @param root0 - Component props.
 * @param root0.name - The tool name (e.g. "write_file", "exec_command").
 * @param root0.input - The raw tool input payload.
 * @param root0.output - The raw tool output payload.
 * @param root0.status - The execution status (pending, running, done, error).
 * @param root0.fileDiff - Original and modified file content for undo/redo.
 * @param root0.onFileOpen - Callback to preview a file in the editor.
 * @param root0.onFileDoubleClick - Callback to pin a file tab in the editor.
 * @param root0.onFileDiff - Callback to open a side-by-side diff view.
 * @param root0.onFileRevert - Callback to revert a file to previous content.
 * @param root0.onAskUserResponse - Callback to send the user's response to an ask_user tool.
 * @param root0.className - Optional CSS class name for the container.
 * @returns The rendered tool call card element.
 */
export const ToolCallCard = memo(function ToolCallCard({
  name,
  input,
  output,
  status,
  fileDiff,
  onFileOpen,
  onFileDoubleClick,
  onFileDiff,
  onFileRevert,
  onAskUserResponse,
  className,
}: ToolCallCardProps): JSX.Element {
  const cm = getClassMap()
  const isLight = useThemeMode() === 'light'
  const [expanded, setExpanded] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isUndone, setIsUndone] = useState(false)
  const [isReverting, setIsReverting] = useState(false)

  const hasError = (() => {
    if (status === 'error') return true
    if (typeof output !== 'object' || output === null) return false
    const out = output as Record<string, unknown>
    if ('error' in out) return true
    if (name === 'exec_command') {
      const exitCode = out.exitCode as number | undefined
      return exitCode != null && exitCode !== 0
    }
    if (name === 'web_fetch') {
      const s = out.status as number | undefined
      return s != null && s >= 400
    }
    return false
  })()

  // gray → orange → green or red
  const dotColor =
    status === 'pending'
      ? '#888888'
      : status === 'running'
        ? '#e8a000'
        : hasError
          ? '#f04040'
          : '#3fb950'

  const summary = toolSummary(name, output as Out, status)

  // File path for the clickable filename <code> in the label.
  const filePath = extractFilePath(name, input)

  // New files open directly (no diff to show); edits/modifications open the diff viewer.
  const isNewFile =
    name === 'write_file' && ((output as Inp)?.diff as { type?: string })?.type === 'new'
  const isFileDiff =
    !isNewFile &&
    (name === 'edit_file' || name === 'write_file') &&
    filePath != null &&
    onFileDiff != null

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
        setIsUndone((v) => !v)
      } finally {
        setIsReverting(false)
      }
    },
    [canRevert, isReverting, isUndone, fileDiff, filePath, onFileRevert],
  )

  // Tools that expand to show details inline.
  const EXPANDABLE = new Set([
    'exec_command',
    'web_fetch',
    'rename_file',
    'list_files',
    'find_files',
    'search_files',
  ])
  const hasDetails = EXPANDABLE.has(name) && (input !== undefined || output !== undefined)

  // Only exec_command and web_fetch get the labeled IN / OUT pane treatment.
  const showInOut = name === 'exec_command' || name === 'web_fetch'
  const inContent = showInOut && input !== undefined ? renderIn(name, input) : null
  const outContent = showInOut && output !== undefined ? renderOut(name, output) : null

  const handleClick =
    isNewFile && filePath && onFileOpen
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

  // ── ask_user: render interactive option list instead of a normal tool card ──
  if (name === 'ask_user') {
    const askInput = (input ?? {}) as {
      question?: string
      options?: string[]
      allowFreeText?: boolean
    }
    const askOutput = output as { status?: string } | string | undefined
    const serverAwaiting =
      typeof askOutput === 'object' && askOutput?.status === 'awaiting_response'
    const isResponded = typeof askOutput === 'string'
    const [localAnswer, setLocalAnswer] = useState<string | null>(null)
    const isAwaiting = serverAwaiting && localAnswer === null
    const selectedAnswer = isResponded ? (askOutput as string) : localAnswer
    const [freeText, setFreeText] = useState('')
    const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

    const borderClr = isLight ? '#d0d7de' : '#3d444d'
    const labelChar = (i: number): string => String.fromCharCode(65 + i) // A, B, C, …

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
        {/* Question header */}
        <div
          style={{
            padding: '10px 12px',
            fontSize: '13px',
            fontWeight: 600,
            borderBottom: `1px solid ${borderClr}`,
          }}
        >
          {askInput.question}
        </div>

        {/* Full-width option rows */}
        {askInput.options?.map((option, i) => {
          const isSelected = selectedAnswer === option
          const isFaded = !isAwaiting && !isSelected
          const isHover = isAwaiting && hoveredIdx === i

          return (
            <button
              key={i}
              type="button"
              disabled={!isAwaiting}
              onClick={() => {
                setLocalAnswer(option)
                onAskUserResponse?.(option)
              }}
              onMouseEnter={() => {
                if (isAwaiting) setHoveredIdx(i)
              }}
              onMouseLeave={() => setHoveredIdx(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                width: '100%',
                padding: '8px 12px',
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
              {/* Letter badge */}
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 22,
                  height: 22,
                  borderRadius: '5px',
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
                {labelChar(i)}
              </span>

              {/* Option text */}
              <span style={{ flex: 1 }}>{option}</span>

              {/* Checkmark for selected */}
              {isSelected && (
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
          )
        })}

        {/* Free text input (optional) */}
        {isAwaiting && askInput.allowFreeText && (
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
              placeholder={t('ide.chat.askUserPlaceholder', undefined, {
                defaultValue: 'Or type your own…',
              })}
              style={{
                flex: 1,
                padding: '5px 8px',
                borderRadius: '5px',
                border: `1px solid ${borderClr}`,
                background: 'transparent',
                color: 'inherit',
                fontSize: '12px',
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
              style={{
                padding: '5px 12px',
                borderRadius: '5px',
                border: 'none',
                background: freeText.trim() ? (isLight ? '#2563eb' : '#3b82f6') : 'transparent',
                color: freeText.trim() ? '#fff' : 'inherit',
                cursor: freeText.trim() ? 'pointer' : 'default',
                fontSize: '12px',
                fontWeight: 500,
                opacity: freeText.trim() ? 1 : 0.3,
              }}
            >
              {t('ide.chat.askUserSubmit', undefined, { defaultValue: 'Send' })}
            </button>
          </div>
        )}

        {/* Show free-text response if it wasn't one of the preset options */}
        {selectedAnswer && !askInput.options?.includes(selectedAnswer) && (
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
      </div>
    )
  }

  return (
    <div className={className} style={{ marginBottom: '4px' }}>
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
          alignItems: 'flex-start',
          gap: '8px',
          background: 'none',
          border: 'none',
          cursor: handleClick ? 'pointer' : 'default',
          color: 'inherit',
          textAlign: 'left',
          padding: '2px 0',
          width: '100%',
        }}
      >
        {/* Colored status dot */}
        <span style={{ color: dotColor, fontSize: '11px', marginTop: '3px', flexShrink: 0 }}>
          ●
        </span>

        {/* Label + undo icon + one-line summary */}
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px' }}>
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
            {canRevert && (
              <span
                role="button"
                tabIndex={0}
                title={
                  isUndone
                    ? t('ide.chat.redoChange', undefined, { defaultValue: 'Re-apply this change' })
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
                  width: 20,
                  height: 20,
                  borderRadius: 4,
                  flexShrink: 0,
                  cursor: isReverting ? 'wait' : 'pointer',
                  opacity: isReverting ? 0.3 : isHovered ? 0.6 : 0,
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
          {summary && (
            <span
              className={cm.cn(cm.textMuted, cm.textSize('xs'))}
              style={{ display: 'block', marginTop: '1px' }}
            >
              {summary}
            </span>
          )}
        </span>

        {/* Line diff stats for file-changing tools */}
        {(() => {
          const diff = fileDiffStats(name, input, output)
          if (!diff) return null
          return (
            <span
              style={{
                display: 'flex',
                gap: '4px',
                flexShrink: 0,
                marginTop: '2px',
                marginRight: '-2px',
                fontSize: '11px',
                fontFamily: '"SF Mono", Menlo, Consolas, "Courier New", monospace',
                opacity: isHovered ? 1 : 0.6,
                transition: 'opacity 100ms',
              }}
            >
              {diff.added > 0 && (
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
                  +{diff.added}
                </span>
              )}
              {diff.removed > 0 && (
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
                  -{diff.removed}
                </span>
              )}
            </span>
          )
        })()}

        {/* Expand / open chevron */}
        {(hasDetails || isFileDiff || (isNewFile && filePath && onFileOpen)) && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            width="14"
            height="14"
            style={{
              display: 'block',
              flexShrink: 0,
              marginTop: '3px',
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
                  {(((input ?? {}) as Inp).old_path as string) ?? ''}
                  {' → '}
                  {(((input ?? {}) as Inp).new_path as string) ?? ''}
                </pre>
              )}

              {/* Listing / search tools: show output results */}
              {(name === 'list_files' || name === 'find_files' || name === 'search_files') &&
                output !== undefined &&
                renderOut(name, output)}
            </div>
          )}
        </div>
      )}
    </div>
  )
})
