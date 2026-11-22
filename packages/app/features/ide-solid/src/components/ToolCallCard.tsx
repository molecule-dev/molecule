/**
 * Tool call display row — compact, Claude Code-style.
 *
 * Solid counterpart of `@molecule/app-ide-react`'s `ToolCallCard` (see that
 * file for the design notes): the same props (React names), the same DOM for
 * the same input, the same callbacks. Shows a colored status dot, a
 * human-readable action label, and a one-line result summary; expands on click
 * to reveal formatted IN / OUT sections: diffs for file edits, terminal output
 * for commands, and the result rows of the listing, search and package tools.
 *
 * A call that is still RUNNING carries a **Skip** (when the host serves one):
 * it drops that one tool call without ending the turn, so a person does not
 * have to sit through a command they already know they do not want. The result
 * comes back as `skipped_by_user`, and this card renders it as **Skipped** with
 * a gray dot — never as a success, never as a failure.
 *
 * Styling uses `getClassMap()` (`cm.*`); the inline styles are the ones React
 * writes (Solid's style object takes the hyphenated CSS property names), so the
 * rendered attributes are identical. All user-facing text goes through `t()`.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { createEffect, createMemo, createSignal, For, Match, Show, Switch } from 'solid-js'

import type { ToolCallCardProps } from '@molecule/app-ide-panel-logic'
import type { AskUserPlanReview, ToolOutput } from '@molecule/app-ide-panel-logic/panels'
import {
  basename,
  extractFilePath,
  fileDiffStats,
  interruptedByRestartLine,
  isInterruptedByRestart,
  isSkippedByUser,
  moleculeDocPath,
  normalizeAskUserInput,
  num,
  parseJudgeVerdict,
  readFileLabelEntries,
  str,
  subagentErrorLine,
  toolLabel,
  toolSummary,
} from '@molecule/app-ide-panel-logic/panels'
import { getLogger } from '@molecule/app-logger'
import { useThemeMode, useTranslation, type UseTranslationResult } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import { useBackgroundTaskCommands } from '../context/background-task-commands.js'
import { useCoarsePointer, useNarrowViewport } from '../hooks/useViewport.js'
import { MarkdownContent } from '../parts/MarkdownContent.jsx'

/** The card's logger (React's `getLogger('tool-call-card')`). */
const logger = getLogger('tool-call-card')

/** A tool call's input or output, read field by field. */
type Inp = Record<string, unknown>

/** The tool output shape the panel logic reads. */
type Out = ToolOutput

/** The translate function the helpers below render through. */
type Translate = UseTranslationResult['t']

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

/** The monospace type every code segment and log line renders in. */
const MONO = '"SF Mono", Menlo, Consolas, "Courier New", monospace'

/**
 * Hands an inline style object to Solid's runtime style diffing.
 *
 * Solid's compiler inlines a fully static `style` object into the template as
 * raw CSS text, while React assigns every declaration through the CSSOM — so a
 * hex colour, a `0` length, a `flex`/`border` shorthand and `background: none`
 * serialize differently, and a later dynamic declaration on the same element
 * re-parses the raw text and can drop a shorthand entirely. Calling through
 * this identity function keeps every declaration on the CSSOM path, so the
 * rendered `style` attribute is the one React writes.
 *
 * @param style - The inline style object.
 * @returns The same object.
 */
const styleOf = (style: JSX.CSSProperties): JSX.CSSProperties => style

// ---------------------------------------------------------------------------
// Label renderer — turns `backtick` segments into inline <code> spans
// ---------------------------------------------------------------------------

/** The inline-code type the label's code segments render in. */
const CODE_STYLE: JSX.CSSProperties = {
  'font-family': MONO,
  'font-size': 'inherit',
}

/**
 * One openable file segment of a tool label: the name it renders as and the
 * path it opens.
 */
interface LabelFileTarget {
  name: string
  path: string
}

/**
 * The open-control for a tool label's file segment — a sibling of the row, not
 * a child of it (a control cannot sit inside the row's `role="button"`).
 *
 * @param props - The file the segment opens, its callbacks, and the rendered name.
 * @returns The rendered clickable code element.
 */
function FileOpenControl(props: {
  target: LabelFileTarget
  onFileOpen: (path: string) => void
  onFileDoubleClick?: (path: string) => void
}): JSX.Element {
  const { t } = useTranslation()
  return (
    <code
      style={styleOf({
        ...CODE_STYLE,
        opacity: '0.75',
        transition: 'opacity 100ms',
        'flex-shrink': '0',
      })}
      onMouseEnter={(e) => {
        e.currentTarget.style.opacity = '1'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.opacity = '0.75'
      }}
    >
      {/* `code` is a semantic element and cannot be a button, so the action
           lives on a native button inside it. */}
      <button
        type="button"
        aria-label={t(
          'ide.chat.tool.openFile',
          { path: props.target.path },
          { defaultValue: 'Open {{path}}' },
        )}
        onClick={() => {
          props.onFileOpen(props.target.path)
        }}
        onDblClick={() => {
          props.onFileDoubleClick?.(props.target.path)
        }}
        /* mol-bespoke-button: the filename of a tool-call label opens the
           file — inline code text, not a CTA; the inline reset keeps it
           looking exactly like the code text it wraps. */
        style={styleOf({
          background: 'transparent',
          border: 'none',
          padding: '0',
          font: 'inherit',
          color: 'inherit',
          cursor: 'pointer',
        })}
      >
        {props.target.name}
      </button>
    </code>
  )
}

/**
 * Splits a tool label into its plain text and its openable file segments.
 *
 * The backtick segments of a label are markup (see `toolLabel`): the ones with
 * a resolvable target and an `onFileOpen` become the row's sibling open
 * controls (a control cannot sit inside the row's `role="button"` — axe
 * `nested-interactive`), so they are LEFT OUT of the text; the rest stay as
 * plain code spans inline.
 *
 * @param t - The translation function from `useTranslation()`.
 * @param name - The tool name.
 * @param input - The raw tool input payload.
 * @param filePath - The primary file path for openable segments, or null.
 * @param onFileOpen - Callback to preview a file; without it nothing is openable.
 * @returns The label text (without the openable segments) and those segments.
 */
function labelSegments(
  t: Translate,
  name: string,
  input: unknown,
  filePath: string | null,
  onFileOpen?: (path: string) => void,
): { text: JSX.Element; files: LabelFileTarget[] } {
  const text = toolLabel(t, name, input)
  const parts = text.split(new RegExp('`([^`]+)`'))
  if (parts.length === 1) return { text, files: [] }
  // A batch read names several files: each one opens ITS file, not the first.
  // The entries come from the same list `toolLabel` spelled the names from —
  // indexing the raw path list instead shifted every target after a nameless
  // path (`src/`), so the name rendered opened the wrong file.
  const readEntries = name === 'read_file' ? readFileLabelEntries(input) : null
  const targetOf = (i: number): string | null =>
    readEntries ? (readEntries[(i - 1) / 2]?.path ?? null) : filePath
  const files: LabelFileTarget[] = []
  const openable: boolean[] = parts.map((_part, i) => {
    if (i % 2 === 0) return false
    const target = targetOf(i)
    if (target && onFileOpen) {
      files.push({ name: parts[i], path: target })
      return true
    }
    return false
  })
  const textNodes = parts.map((part, i) => {
    if (i % 2 === 1)
      return openable[i] ? null : (
        <code style={styleOf({ ...CODE_STYLE, opacity: '0.75' })}>{part}</code>
      )
    // A separator between two segments that both moved out of the text (the
    // ", " between a batch read's names) would dangle between nothing.
    if (openable[i - 1] && openable[i + 1] && /^[\s,]*$/.test(part)) return null
    return part
  })
  return { text: <>{textNodes}</>, files }
}

// ---------------------------------------------------------------------------
// find_package results
// ---------------------------------------------------------------------------

/** One `find_package` match. */
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
 *
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
 * README.md in the editor.
 *
 * @param props - The package matches and the callback that opens their docs.
 * @returns The rendered result rows.
 */
function PackageResultRows(props: {
  results: PackageResult[]
  onFileOpen?: (path: string) => void
}): JSX.Element {
  const isCoarse = useCoarsePointer()
  const { t } = useTranslation()
  return (
    <Show
      when={props.results.length > 0}
      fallback={
        <span style={styleOf({ opacity: '0.5' })}>
          {t('ide.toolCall.noMatches', undefined, { defaultValue: 'No matches' })}
        </span>
      }
    >
      <div style={styleOf({ 'font-family': MONO, 'font-size': '11px', 'line-height': '1.7' })}>
        {props.results.map((r, i) => {
          const docPath = moleculeDocPath(r.name)
          const clickable = docPath != null && props.onFileOpen != null
          return (
            <div
              role={clickable ? 'button' : undefined}
              tabindex={clickable ? 0 : undefined}
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
                  ? (e: MouseEvent) => {
                      e.stopPropagation()
                      props.onFileOpen!(docPath!)
                    }
                  : undefined
              }
              onKeyDown={
                clickable
                  ? (e: KeyboardEvent) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        e.stopPropagation()
                        props.onFileOpen!(docPath!)
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
              style={styleOf({
                display: 'flex',
                gap: '8px',
                'align-items': 'baseline',
                // Touch: ~19px result rows are untappable — 32px dense-row floor.
                ...(isCoarse() && clickable
                  ? { 'min-height': '32px', 'align-items': 'center' }
                  : {}),
                cursor: clickable ? 'pointer' : 'default',
                opacity: clickable ? '0.8' : '1',
                transition: 'opacity 100ms',
              })}
            >
              <span style={styleOf({ 'white-space': 'nowrap' })}>{r.name}</span>
              {r.label && (
                <span
                  style={styleOf({
                    opacity: '0.55',
                    overflow: 'hidden',
                    'text-overflow': 'ellipsis',
                    'white-space': 'nowrap',
                  })}
                >
                  {r.label}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </Show>
  )
}

// ---------------------------------------------------------------------------
// Detail renderers — IN and OUT panes
// ---------------------------------------------------------------------------

/** The monospace log type, shared by the result rows and the expanded pane. */
const PRE: JSX.CSSProperties = {
  margin: '0',
  'white-space': 'pre',
  'overflow-x': 'auto',
  'font-family': MONO,
  'font-size': '11px',
  'line-height': '1.5',
}

// A shell command or its output is read whole: wrap it instead of scrolling
// sideways, and cap tall output with a vertical scroll.
const WRAP_PRE: JSX.CSSProperties = {
  ...PRE,
  'white-space': 'pre-wrap',
  'overflow-wrap': 'anywhere',
  'overflow-x': 'visible',
}
const OUTPUT_PRE: JSX.CSSProperties = { ...WRAP_PRE, 'max-height': '320px', 'overflow-y': 'auto' }

/**
 * Render the input section for a tool call.
 *
 * @param name - The tool name.
 * @param input - The raw tool input payload.
 * @returns The formatted input content.
 */
function renderIn(name: string, input: unknown): JSX.Element {
  const inp = (input ?? {}) as Inp

  switch (name) {
    case 'exec_command':
      return (
        <pre style={WRAP_PRE}>
          <span style={styleOf({ opacity: '0.5' })}>$ </span>
          {str(inp.command) ?? ''}
        </pre>
      )

    case 'write_file':
      // Full file content is too noisy — show only the path
      return <pre style={PRE}>{str(inp.path) ?? ''}</pre>

    case 'edit_file': {
      // `replacements` is model-authored: entries can be missing, or carry
      // non-string old/new values. Reading them through `str` keeps a malformed
      // edit renderable instead of throwing on `.split` mid-render.
      const replacements = (Array.isArray(inp.replacements) ? inp.replacements : []).map(
        (entry) => {
          const record = (entry ?? {}) as Inp
          return {
            old_string: str(record.old_string) ?? '',
            new_string: str(record.new_string) ?? '',
          }
        },
      )
      const nodes: JSX.Element[] = []
      replacements.forEach((r, i) => {
        if (i > 0) nodes.push('\n\n')
        r.old_string.split('\n').forEach((line, li) => {
          if (li > 0) nodes.push('\n')
          nodes.push(
            <span style={styleOf({ color: '#f47067', 'font-family': 'inherit' })}>
              {'- '}
              {line}
            </span>,
          )
        })
        nodes.push('\n')
        r.new_string.split('\n').forEach((line, li) => {
          if (li > 0) nodes.push('\n')
          nodes.push(
            <span style={styleOf({ color: '#57ab5a', 'font-family': 'inherit' })}>
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
 *
 * @param t - The translation function from `useTranslation()`.
 * @param name - The tool name.
 * @param output - The raw tool output payload.
 * @returns The formatted output content.
 */
function renderOut(t: Translate, name: string, output: unknown): JSX.Element {
  const out = (output ?? {}) as Inp

  // The result's `message` is written for the model ("Check the actual state
  // first…"); the person gets one plain sentence.
  if (isInterruptedByRestart(output)) {
    return <span style={styleOf({ opacity: '0.7' })}>{interruptedByRestartLine(t)}</span>
  }

  if (typeof out === 'object' && out !== null && 'error' in out) {
    return (
      <pre style={styleOf({ ...PRE, color: '#f47067' })}>
        {str(out.error) ?? JSON.stringify(out.error)}
      </pre>
    )
  }

  switch (name) {
    case 'exec_command': {
      const stdout = (str(out.stdout) ?? '').trimEnd()
      const stderr = (str(out.stderr) ?? '').trimEnd()
      const exitCode = num(out.exitCode)
      return (
        <div>
          {stdout && <pre style={OUTPUT_PRE}>{stdout}</pre>}
          {stderr && (
            <pre
              style={styleOf({
                ...OUTPUT_PRE,
                color: '#f47067',
                'margin-top': stdout ? '4px' : '0',
              })}
            >
              {stderr}
            </pre>
          )}
          {exitCode != null && exitCode !== 0 && (
            <div style={styleOf({ 'margin-top': '4px', color: '#f47067', 'font-size': '10px' })}>
              {t(
                'ide.toolCall.exitCode',
                { code: exitCode },
                { defaultValue: 'exit code {{code}}' },
              )}
            </div>
          )}
          {!stdout && !stderr && (
            <span style={styleOf({ opacity: '0.5' })}>
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
          <span style={styleOf({ opacity: '0.6' })}>
            {t('ide.toolCall.written', undefined, { defaultValue: 'Written' })}
          </span>
        )

      if (diff.type === 'unchanged')
        return (
          <span style={styleOf({ opacity: '0.6' })}>
            {t('ide.toolCall.statusUnchanged', undefined, { defaultValue: 'Unchanged' })}
          </span>
        )

      return (
        <div style={styleOf({ 'font-family': MONO, 'font-size': '11px' })}>
          {diff.type === 'new' && (
            <div style={styleOf({ color: '#57ab5a' })}>
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
                <div style={styleOf({ color: '#57ab5a' })}>
                  {t(
                    'ide.toolCall.linesAdded',
                    { count: diff.linesAdded },
                    { defaultValue: '+{{count}} lines' },
                  )}
                </div>
              )}
              {diff.linesRemoved > 0 && (
                <div style={styleOf({ color: '#f47067' })}>
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
        <span style={styleOf({ opacity: '0.6', 'font-size': '11px' })}>
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
          <span style={styleOf({ opacity: '0.5' })}>
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
          <span style={styleOf({ opacity: '0.5' })}>
            {t('ide.toolCall.empty', undefined, { defaultValue: '(empty)' })}
          </span>
        )

      return (
        <div style={styleOf({ 'font-family': MONO, 'font-size': '11px', 'line-height': '1.6' })}>
          {entries.map((e) => (
            <div style={styleOf({ display: 'flex', gap: '6px' })}>
              <span style={styleOf({ opacity: '0.4', width: '10px', 'flex-shrink': '0' })}>
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
          <span style={styleOf({ opacity: '0.5' })}>
            {t('ide.toolCall.noFilesFound', undefined, { defaultValue: 'No files found' })}
          </span>
        )

      return (
        <div style={styleOf({ 'font-family': MONO, 'font-size': '11px', 'line-height': '1.6' })}>
          {files.map((f) => (
            <div>{f}</div>
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
          <span style={styleOf({ opacity: '0.5' })}>
            {t('ide.toolCall.noMatches', undefined, { defaultValue: 'No matches' })}
          </span>
        )

      return (
        <div style={styleOf({ 'font-family': MONO, 'font-size': '11px', 'line-height': '1.6' })}>
          {matches.slice(0, 30).map((m) => (
            <div style={styleOf({ display: 'flex', gap: '8px', 'margin-bottom': '2px' })}>
              <span
                style={styleOf({ opacity: '0.5', 'flex-shrink': '0', 'white-space': 'nowrap' })}
              >
                {basename(m.file)}:{m.line}
              </span>
              <span style={styleOf({ 'white-space': 'pre' })}>{m.content.trim()}</span>
            </div>
          ))}
          {matches.length > 30 && (
            <div style={styleOf({ opacity: '0.5', 'margin-top': '4px' })}>
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
              style={styleOf({
                color: ok ? '#57ab5a' : '#f47067',
                'margin-bottom': body ? '4px' : '0',
                'font-size': '11px',
              })}
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
// spawn_agent: the subagent card
// ---------------------------------------------------------------------------

/**
 * The `spawn_agent` card — a research report, a judge verdict, or a build
 * summary, with a one-line failure notice and a collapsible long report.
 *
 * @param props - The tool call (`card`) and the caller's translate function.
 * @returns The rendered subagent card.
 */
function SubagentCard(props: { card: ToolCallCardProps; t: Translate }): JSX.Element {
  const cm = getClassMap()
  const mode = useThemeMode()
  const isLight = (): boolean => mode() === 'light'
  const [expanded, setExpanded] = createSignal(false)

  const inp = (): Inp => (props.card.input ?? {}) as Inp
  const kind = (): 'judge' | 'build' | 'explore' =>
    inp().type === 'judge' ? 'judge' : inp().type === 'build' ? 'build' : 'explore'
  const out = (): {
    report?: unknown
    error?: unknown
    changedPaths?: unknown
    agentId?: unknown
    note?: unknown
  } =>
    (props.card.output ?? {}) as {
      report?: unknown
      error?: unknown
      changedPaths?: unknown
      agentId?: unknown
      note?: unknown
    }
  // A background dispatch has no report yet — the strip above the composer
  // carries its live status, so the card says what it started, not nothing.
  const backgrounded = (): boolean => typeof out().agentId === 'string'
  const wrote = (): string[] => {
    const changed = out().changedPaths
    return Array.isArray(changed)
      ? changed.filter((path): path is string => typeof path === 'string')
      : []
  }
  const agentModel = (): string => {
    const model = inp().model
    return typeof model === 'string' ? model : ''
  }
  // A failed run carries `error` (one sentence for the person) and `report`
  // (instructions for the model). The card shows only the first; a card
  // recorded before `error` rode every failure path has only the report, so a
  // report that opens as a failure counts as one too.
  const rawReport = (): string => {
    const value = out().report
    return typeof value === 'string' ? value : ''
  }
  const interrupted = (): boolean => isInterruptedByRestart(props.card.output)
  const errorText = (): string =>
    interrupted()
      ? interruptedByRestartLine(props.t)
      : subagentErrorLine(props.t, out().error, rawReport())
  const report = (): string => (errorText() ? '' : rawReport())
  const verdict = (): ReturnType<typeof parseJudgeVerdict> =>
    kind() === 'judge' ? parseJudgeVerdict(report()) : null
  const borderClr = (): string => (isLight() ? '#d0d7de' : '#3d444d')
  const verdictTint = (): string => (isLight() ? 'rgba(63,185,80,0.08)' : 'rgba(63,185,80,0.12)')
  const failTint = (): string => (isLight() ? 'rgba(248,81,73,0.08)' : 'rgba(248,81,73,0.14)')
  const verdictColor = (): string => (verdict()?.verdict === 'PASS' ? '#3fb950' : '#f8554f')
  const bodyText = (): string => {
    const v = verdict()
    return v ? v.rest : report()
  }
  const dot = (): string =>
    interrupted()
      ? '#888888'
      : props.card.status === 'error' || errorText()
        ? '#f04040'
        : props.card.status === 'done'
          ? '#3fb950'
          : props.card.status === 'running'
            ? '#e8a000'
            : '#888888'
  const t = props.t

  return (
    <div
      class={props.card.className}
      data-mol-id="subagent-card"
      style={styleOf({
        'margin-bottom': '8px',
        'margin-top': '8px',
        'border-radius': '8px',
        border: `1px solid ${borderClr()}`,
        background: isLight() ? '#f6f8fa' : 'rgba(255,255,255,0.04)',
        overflow: 'hidden',
      })}
    >
      <div
        style={styleOf({
          display: 'flex',
          'align-items': 'center',
          gap: '8px',
          padding: '6px 12px',
          'font-size': '12px',
          'font-weight': '600',
          'border-bottom': report() || errorText() ? `1px solid ${borderClr()}` : 'none',
        })}
      >
        <span
          aria-hidden="true"
          style={styleOf({
            width: '8px',
            height: '8px',
            'border-radius': '50%',
            'flex-shrink': '0',
            background: dot(),
          })}
        />

        <span>
          {kind() === 'judge'
            ? t('ide.chat.subagent.judge', undefined, { defaultValue: 'Acceptance judge' })
            : kind() === 'build'
              ? t('ide.chat.subagent.build', undefined, { defaultValue: 'Build subagent' })
              : t('ide.chat.subagent.explore', undefined, { defaultValue: 'Research subagent' })}
        </span>
        {agentModel() && (
          <span style={styleOf({ 'font-weight': '400', opacity: '0.6' })}>{agentModel()}</span>
        )}
        {(props.card.status === 'running' || backgrounded()) && (
          <span style={styleOf({ 'font-weight': '400', opacity: '0.6' })}>
            {backgrounded()
              ? t('ide.chat.subagent.inBackground', undefined, {
                  defaultValue: 'running in the background',
                })
              : t('ide.chat.subagent.working', undefined, { defaultValue: 'working…' })}
          </span>
        )}
        {wrote().length > 0 && (
          <span style={styleOf({ 'font-weight': '400', opacity: '0.6' })}>
            {t(
              'ide.chat.subagent.wroteFiles',
              { count: wrote().length },
              { defaultValue: '{{count}} files changed' },
            )}
          </span>
        )}
      </div>

      {errorText() && (
        <div
          style={styleOf({
            padding: '8px 12px',
            'font-size': '12px',
            ...(interrupted() ? { opacity: '0.7' } : { color: '#f8554f' }),
            'border-bottom': `1px solid ${borderClr()}`,
          })}
        >
          {errorText()}
        </div>
      )}

      {verdict() && (
        <div
          data-mol-id="subagent-verdict"
          style={styleOf({
            padding: '8px 12px',
            background: verdict()!.verdict === 'PASS' ? verdictTint() : failTint(),
            'border-bottom': `1px solid ${borderClr()}`,
          })}
        >
          <div
            style={styleOf({
              display: 'flex',
              'align-items': 'center',
              gap: '6px',
              'font-size': '13px',
              'font-weight': '700',
              color: verdictColor(),
            })}
          >
            {verdict()!.verdict === 'PASS' ? '✓' : '✕'}
            {verdict()!.verdict === 'PASS'
              ? t('ide.chat.subagent.verdictPass', undefined, { defaultValue: 'PASS' })
              : t('ide.chat.subagent.verdictFail', undefined, { defaultValue: 'FAIL' })}
          </div>
          {verdict()!.issues.length > 0 && (
            <ul
              style={styleOf({
                margin: '6px 0 0',
                'padding-left': '18px',
                'font-size': '12px',
                display: 'flex',
                'flex-direction': 'column',
                gap: '2px',
                opacity: '0.9',
              })}
            >
              {verdict()!.issues.map((issue) => (
                <li>{issue}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {bodyText() && (
        <div style={styleOf({ padding: '8px 12px' })}>
          <div
            style={styleOf({
              'font-size': '12px',
              'white-space': 'pre-wrap',
              'max-height': expanded() ? undefined : '150px',
              overflow: 'hidden',
              opacity: '0.9',
            })}
          >
            {bodyText()}
          </div>
          {bodyText().length > 600 && (
            <button
              type="button"
              data-mol-id="subagent-report-toggle"
              aria-expanded={expanded() ? 'true' : 'false'}
              // A show/hide disclosure, so it is the `ghost` toggle every
              // other card in the IDE uses for one (TestsCard's QUIET_TOGGLE).
              class={cm.cn(cm.button({ variant: 'ghost', size: 'xs' }), cm.touchTargetCompact)}
              onClick={() => setExpanded((e) => !e)}
              style={styleOf({ 'margin-top': '4px' })}
            >
              {expanded()
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

// ---------------------------------------------------------------------------
// save_plan: clickable row that opens the plan file in the editor
// ---------------------------------------------------------------------------

/**
 * Whether a tool call's result is a failure. A call the person skipped, or one
 * a restart cut off, is neither a success nor a failure: its effect either did
 * not happen or is unknown, so it never reads as failed.
 *
 * @param card - The tool call.
 * @returns True when the call failed.
 */
function toolCallHasError(card: ToolCallCardProps): boolean {
  if (isSkippedByUser(card.output) || isInterruptedByRestart(card.output)) return false
  if (card.status === 'error') return true
  if (typeof card.output !== 'object' || card.output === null) return false
  const out = card.output as Record<string, unknown>
  if ('error' in out) return true
  if (card.name === 'exec_command') {
    const exitCode = num(out.exitCode)
    return exitCode != null && exitCode !== 0
  }
  if (card.name === 'web_fetch') {
    const s = num(out.status)
    return s != null && s >= 400
  }
  return false
}

/**
 * The status dot's colour: gray → orange → green or red. A skipped call stays
 * gray, because it did not happen, and so does an interrupted one, because
 * nobody knows if it did.
 *
 * @param card - The tool call.
 * @returns The dot colour.
 */
function toolCallDotColor(card: ToolCallCardProps): string {
  if (
    card.status === 'pending' ||
    isSkippedByUser(card.output) ||
    isInterruptedByRestart(card.output)
  )
    return '#888888'
  if (card.status === 'running') return '#e8a000'
  return toolCallHasError(card) ? '#f04040' : '#3fb950'
}

/**
 * The `save_plan` row — a standard tool-call row whose click opens the plan
 * file in the editor.
 *
 * @param props - The tool call and the caller's translate function.
 * @returns The rendered plan row.
 */
function SavePlanRow(props: { card: ToolCallCardProps; t: Translate }): JSX.Element {
  const { t } = props
  const isCoarse = useCoarsePointer()
  const [isHovered, setIsHovered] = createSignal(false)

  const planPath = (): string | null =>
    ((props.card.output ?? {}) as { path?: string }).path ?? null
  const planHandleClick = (): (() => void) | undefined =>
    planPath() && props.card.onFileOpen
      ? () => {
          props.card.onFileOpen!(planPath()!)
        }
      : undefined
  const dotColor = (): string => toolCallDotColor(props.card)

  return (
    <div class={props.card.className} style={styleOf({ 'margin-bottom': '4px' })}>
      <button
        type="button"
        data-mol-id="save-plan-row"
        onClick={planHandleClick()}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        /* mol-bespoke-button: a tool-call ROW — status dot, label, chevron —
           that happens to open the plan file; a timeline list item, not a
           CTA. Reset to inherit the row's ink and background. */
        style={styleOf({
          display: 'flex',
          'align-items': 'flex-start',
          gap: '6px',
          background: 'none',
          border: 'none',
          cursor: planHandleClick() ? 'pointer' : 'default',
          color: 'inherit',
          'text-align': 'left',
          padding: '2px 0',
          // Touch: ~20px rows are untappable — 32px is the dense-row floor.
          ...(isCoarse() ? { 'min-height': '32px' } : {}),
          width: '100%',
        })}
      >
        <span style={styleOf({ flex: '1', 'min-width': '0' })}>
          <span
            style={styleOf({
              'font-size': '13px',
              display: 'flex',
              'align-items': 'center',
              gap: '6px',
            })}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" style={styleOf({ 'flex-shrink': '0' })}>
              <circle cx="5" cy="5" r="3" fill={dotColor()} opacity="0.35" />
              <circle cx="5" cy="5" r="3" fill="none" stroke={dotColor()} stroke-width="2" />
            </svg>
            <span
              style={styleOf({
                flex: '1',
                'min-width': '0',
                overflow: 'hidden',
                'text-overflow': 'ellipsis',
                'white-space': 'nowrap',
              })}
            >
              {labelSegments(t, props.card.name, props.card.input, null).text}
            </span>
          </span>
        </span>
        {planHandleClick() && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            width="14"
            height="14"
            style={styleOf({
              display: 'block',
              'flex-shrink': '0',
              'margin-top': '3px',
              transition: 'opacity 100ms',
              opacity: isHovered() ? '0.85' : '0.35',
            })}
          >
            <polyline
              points="6,4 10,8 6,12"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        )}
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ask_user: the interactive option list
// ---------------------------------------------------------------------------

/**
 * The `ask_user` card — a question with lettered option rows, optional
 * previews, multi-select and a free-text answer.
 *
 * @param props - The tool call and the caller's translate function.
 * @returns The rendered question card (nothing until the question arrives).
 */
function AskUserCard(props: { card: ToolCallCardProps; t: Translate }): JSX.Element {
  const cm = getClassMap()
  const mode = useThemeMode()
  const isLight = (): boolean => mode() === 'light'
  const isCoarse = useCoarsePointer()
  const isNarrow = useNarrowViewport()
  const { t } = props

  const askInput = createMemo(() => normalizeAskUserInput(props.card.input))
  const askOutput = (): { status?: string } | string | undefined =>
    props.card.output as { status?: string } | string | undefined
  const serverAwaiting = (): boolean => {
    const value = askOutput()
    return typeof value === 'object' && value?.status === 'awaiting_response'
  }
  const isResponded = (): boolean => typeof askOutput() === 'string'

  const [localAnswer, setLocalAnswer] = createSignal<string | null>(null)
  const [freeText, setFreeText] = createSignal('')
  const [hoveredIdx, setHoveredIdx] = createSignal<number | null>(null)
  // Multi-select picks in progress (labels); sent as one string joined with
  // '; ' on confirm — the same shape an answered multi-select persists as.
  const [multiPicks, setMultiPicks] = createSignal<string[]>([])
  // Narrow screens have no room for the side-by-side preview pane; there a
  // preview expands inline under its option row instead.
  const [expandedPreviewIdx, setExpandedPreviewIdx] = createSignal<number | null>(null)

  const isAwaiting = (): boolean => serverAwaiting() && localAnswer() === null
  const selectedAnswer = (): string | null =>
    isResponded() ? (askOutput() as string) : localAnswer()

  const borderClr = (): string => (isLight() ? '#d0d7de' : '#3d444d')
  const labelChar = (i: number): string => String.fromCharCode(65 + i) // A, B, C, …
  const hasPreviews = (): boolean => askInput().options.some((option) => option.preview)
  const multi = (): boolean => askInput().multiSelect && askInput().options.length > 0
  // The plan-approval card renders its two decisions as prominent
  // design-system CTAs instead of letter-badged rows.
  const reviewCtas = (): boolean =>
    !!askInput().planReview && !multi() && askInput().options.length === 2 && !hasPreviews()
  const answeredLabels = (): string[] =>
    multi() && typeof selectedAnswer() === 'string'
      ? selectedAnswer()!
          .split('; ')
          .map((part) => part.trim())
          .filter(Boolean)
      : []
  const selectedSet = (): Set<string> => new Set([...multiPicks(), ...answeredLabels()])
  // Which option's preview the pane shows: the hovered/focused one, else the
  // picked one, else the first option that has a preview at all.
  const previewIdx = (): number | null => {
    if (!hasPreviews()) return null
    const options = askInput().options
    const candidate = hoveredIdx() ?? expandedPreviewIdx()
    if (candidate != null && options[candidate]?.preview) return candidate
    const pickedIdx = options.findIndex((option) => selectedSet().has(option.label))
    if (pickedIdx >= 0 && options[pickedIdx].preview) return pickedIdx
    return options.findIndex((option) => option.preview)
  }
  const previewOption = (): { label: string; preview?: string } | undefined => {
    const idx = previewIdx()
    return idx != null ? askInput().options[idx] : undefined
  }
  const planReview = (): AskUserPlanReview | undefined => askInput().planReview

  // React writes a controlled input's value to the `value` ATTRIBUTE as well as
  // the live property; the conformance normalizer records both, and a property
  // alone is not the same DOM. Keep the two in step.
  let freeTextInput: HTMLInputElement | undefined
  createEffect(() => {
    const value = freeText()
    if (!freeTextInput) return
    freeTextInput.value = value
    freeTextInput.setAttribute('value', value)
  })

  /**
   * Sends the free-text answer when it is not blank.
   */
  const submitFreeText = (): void => {
    const answer = freeText().trim()
    if (!answer) return
    setLocalAnswer(answer)
    props.card.onAskUserResponse?.(answer)
    setFreeText('')
  }

  return (
    <Show when={askInput().question} fallback={null}>
      <div
        class={props.card.className}
        style={styleOf({
          'margin-bottom': '8px',
          'margin-top': '8px',
          'border-radius': '8px',
          border: `1px solid ${borderClr()}`,
          background: isLight() ? '#f6f8fa' : 'rgba(255,255,255,0.04)',
          overflow: 'hidden',
        })}
      >
        {/* Question header — the plan-approval card gets the rich REVIEW
             header (badge, plan name, step count, clickable path, checklist
             preview); every other question renders as markdown (the model
             formats questions with **bold**, bullets, and line breaks). */}
        {planReview() ? (
          <div
            data-mol-id="plan-review-card"
            style={styleOf({
              padding: '10px 12px 10px',
              'font-size': '13px',
              'border-bottom': `1px solid ${borderClr()}`,
            })}
          >
            <div
              style={styleOf({
                'font-size': '11px',
                'font-weight': '600',
                'letter-spacing': '0.03em',
                'text-transform': 'uppercase',
                opacity: '0.6',
                'margin-bottom': '6px',
              })}
            >
              {t('ide.chat.planReview.badge', undefined, {
                defaultValue: 'Plan ready for review',
              })}
            </div>
            <div
              style={styleOf({ 'font-size': '14px', 'font-weight': '600', 'margin-bottom': '4px' })}
            >
              {planReview()!.name ||
                (planReview()!.path ? basename(planReview()!.path!) : '') ||
                t('ide.chat.planReview.fallbackTitle', undefined, {
                  defaultValue: 'Implementation plan',
                })}
            </div>
            <div
              style={styleOf({
                display: 'flex',
                'align-items': 'center',
                gap: '10px',
                'font-size': '12px',
                opacity: '0.75',
                'margin-bottom': planReview()!.preview.length > 0 ? '8px' : '0',
              })}
            >
              <span>
                {t(
                  'ide.chat.planReview.steps',
                  { count: planReview()!.steps },
                  {
                    defaultValue: '{{count}} steps',
                  },
                )}
              </span>
              {planReview()!.path && props.card.onFileOpen && (
                <button
                  type="button"
                  data-mol-id="plan-review-open"
                  // Opening the plan is an ACTION, so it looks like a button —
                  // the same solid `xs` primary as every other open/load action
                  // in the chat.
                  class={cm.cn(
                    cm.button({ variant: 'solid', color: 'primary', size: 'xs' }),
                    cm.touchTargetCompact,
                    cm.shrink0,
                  )}
                  onClick={() => props.card.onFileOpen!(planReview()!.path!)}
                >
                  {t('ide.chat.planReview.openPlan', undefined, { defaultValue: 'Open plan' })}
                </button>
              )}
            </div>
            {/* The platform publishes on the plan's behalf when approved — say so
               under the step count, so approval is informed. */}
            {planReview()!.goesLive === true && (
              <div
                style={styleOf({
                  'font-size': '12px',
                  opacity: '0.75',
                  'margin-top': planReview()!.preview.length > 0 ? '0' : '8px',
                  'margin-bottom': planReview()!.preview.length > 0 ? '8px' : '0',
                })}
              >
                {t('ide.chat.planReview.goesLive', undefined, {
                  defaultValue:
                    'Goes live: the platform publishes the app and runs its test suite once, on the live app.',
                })}
              </div>
            )}
            {planReview()!.preview.length > 0 && (
              <ul
                style={styleOf({
                  margin: '0',
                  'padding-left': '18px',
                  'font-size': '12px',
                  opacity: '0.8',
                  display: 'flex',
                  'flex-direction': 'column',
                  gap: '2px',
                })}
              >
                {planReview()!.preview.map((step) => (
                  <li>{step}</li>
                ))}
              </ul>
            )}
            {planReview()!.steps > planReview()!.preview.length && (
              <div style={styleOf({ 'font-size': '11px', opacity: '0.55', 'margin-top': '4px' })}>
                {t(
                  'ide.chat.planReview.more',
                  { count: planReview()!.steps - planReview()!.preview.length },
                  { defaultValue: '+ {{count}} more steps' },
                )}
              </div>
            )}
          </div>
        ) : (
          <div
            style={styleOf({
              padding: '4px 12px 10px',
              'font-size': '13px',
              'border-bottom': `1px solid ${borderClr()}`,
            })}
          >
            <MarkdownContent text={unescapeLiterals(askInput().question)} isStreaming={false} />
            {multi() && isAwaiting() && (
              <div
                style={styleOf({
                  'font-size': '11px',
                  'font-style': 'italic',
                  opacity: '0.55',
                  'margin-top': '4px',
                })}
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
        <div style={styleOf({ display: 'flex', 'align-items': 'stretch' })}>
          <div
            style={styleOf({
              flex: hasPreviews() && !isNarrow() ? '1 1 55%' : '1 1 100%',
              'min-width': '0',
              display: 'flex',
              'flex-direction': 'column',
            })}
          >
            {reviewCtas() ? (
              <div
                style={styleOf({
                  display: 'flex',
                  'flex-wrap': 'wrap',
                  gap: '8px',
                  padding: '10px 12px',
                })}
              >
                {askInput().options.map((option, i) => {
                  const isPicked = (): boolean => selectedAnswer() === option.label
                  return (
                    <button
                      type="button"
                      data-mol-id={`plan-review-cta-${i}`}
                      disabled={!isAwaiting() || props.card.onAskUserResponse == null}
                      class={cm.cn(
                        // Filled on both: inside a chat card an `outline` at this
                        // size reads as plain text (DESIGN.md → Command cards).
                        cm.button(
                          i === 0
                            ? { variant: 'solid', color: 'primary', size: 'xs' }
                            : { variant: 'solid', color: 'secondary', size: 'xs' },
                        ),
                        cm.touchTargetCompact,
                      )}
                      style={styleOf({
                        flex: isNarrow() ? '1 1 100%' : '1 1 auto',
                        // The "you picked this" ring is the theme's success
                        // colour, not a literal green.
                        ...(isPicked()
                          ? {
                              outline: '2px solid var(--mol-color-success, #16a34a)',
                              'outline-offset': '1px',
                            }
                          : {}),
                      })}
                      onClick={() => {
                        const respond = props.card.onAskUserResponse
                        if (respond == null) return
                        setLocalAnswer(option.label)
                        respond(option.label)
                      }}
                    >
                      {isPicked() ? `✓ ${option.label}` : option.label}
                    </button>
                  )
                })}
              </div>
            ) : (
              askInput().options.map((option, i) => {
                const isSelected = (): boolean => selectedSet().has(option.label)
                const isFaded = (): boolean => !isAwaiting() && !isSelected()
                const isHover = (): boolean => isAwaiting() && hoveredIdx() === i
                const isPreviewExpanded = (): boolean => expandedPreviewIdx() === i

                return (
                  <div>
                    <div style={styleOf({ display: 'flex', 'align-items': 'stretch' })}>
                      <button
                        type="button"
                        data-mol-id={`ask-user-option-${i}`}
                        disabled={!isAwaiting() || props.card.onAskUserResponse == null}
                        onClick={() => {
                          // No handler = read-only (a project viewer): answering is editor work.
                          const respond = props.card.onAskUserResponse
                          if (respond == null) return
                          if (multi()) {
                            // Multi-select toggles a pick; a Confirm row submits them.
                            setMultiPicks((picks) =>
                              picks.includes(option.label)
                                ? picks.filter((p) => p !== option.label)
                                : [...picks, option.label],
                            )
                            return
                          }
                          setLocalAnswer(option.label)
                          respond(option.label)
                        }}
                        onFocus={() => {
                          if (isAwaiting()) setHoveredIdx(i)
                        }}
                        onMouseEnter={() => {
                          if (isAwaiting()) setHoveredIdx(i)
                        }}
                        onMouseLeave={() => setHoveredIdx(null)}
                        /* mol-bespoke-button: an ask_user answer ROW — a
                         lettered radio list (A/B/C badge, label, optional
                         description, tick), stacked with hairline dividers.
                         It is the list itself, not a row of CTAs. */
                        style={styleOf({
                          display: 'flex',
                          'align-items': 'center',
                          gap: '10px',
                          flex: '1',
                          'min-width': '0',
                          padding: option.description ? '7px 12px' : '8px 12px',
                          // Touch: full 44px rows — these are the PRIMARY
                          // discovery answers.
                          ...(isCoarse() ? { 'min-height': '44px' } : {}),
                          border: 'none',
                          'border-top': i > 0 ? `1px solid ${borderClr()}` : 'none',
                          background: isSelected()
                            ? isLight()
                              ? '#dbeafe'
                              : 'rgba(59,130,246,0.2)'
                            : isHover()
                              ? isLight()
                                ? '#eaeef2'
                                : 'rgba(255,255,255,0.06)'
                              : 'transparent',
                          color: 'inherit',
                          cursor: isAwaiting() ? 'pointer' : 'default',
                          'text-align': 'left',
                          'font-size': '13px',
                          opacity: isFaded() ? '0.4' : '1',
                          transition: 'background 80ms, opacity 80ms',
                        })}
                      >
                        {/* Letter badge (checkbox-style when multi-select: filled
                           letter = picked, hollow = not yet). */}
                        <span
                          style={styleOf({
                            display: 'inline-flex',
                            'align-items': 'center',
                            'justify-content': 'center',
                            width: '22px',
                            height: '22px',
                            'border-radius': multi() ? '6px' : '5px',
                            border: `1px solid ${
                              isSelected() ? (isLight() ? '#93c5fd' : '#3b82f6') : borderClr()
                            }`,

                            background: isSelected()
                              ? isLight()
                                ? '#3b82f6'
                                : '#2563eb'
                              : isLight()
                                ? '#fff'
                                : 'rgba(255,255,255,0.08)',
                            color: isSelected() ? '#fff' : isLight() ? '#57606a' : '#848d97',
                            'font-size': '11px',
                            'font-weight': '600',
                            'flex-shrink': '0',
                            'font-family': MONO,
                          })}
                        >
                          {multi() && isSelected() ? '✓' : labelChar(i)}
                        </span>

                        {/* Option label + optional one-line description */}
                        <span style={styleOf({ flex: '1', 'min-width': '0' })}>
                          <span style={styleOf({ display: 'block' })}>{option.label}</span>
                          {option.description && (
                            <span
                              style={styleOf({
                                display: 'block',
                                'font-size': '11px',
                                opacity: '0.65',
                                'margin-top': '1px',
                              })}
                            >
                              {option.description}
                            </span>
                          )}
                        </span>

                        {/* Checkmark for a picked single-select option */}
                        {!multi() && isSelected() && (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 16 16"
                            width="14"
                            height="14"
                            fill={isLight() ? '#2563eb' : '#60a5fa'}
                          >
                            <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
                          </svg>
                        )}
                      </button>

                      {/* Narrow screens: expand this option's preview inline (a
                         sibling button — interactive elements never nest). */}
                      {hasPreviews() && isNarrow() && option.preview && (
                        <button
                          type="button"
                          data-mol-id={`ask-user-option-preview-${i}`}
                          aria-label={t('ide.chat.askUserPreview', undefined, {
                            defaultValue: 'Preview',
                          })}
                          disabled={!isAwaiting()}
                          onClick={() => setExpandedPreviewIdx(isPreviewExpanded() ? null : i)}
                          /* mol-bespoke-button: icon-only › disclosure chevron
                         welded to the right edge of the answer row beside
                         it — it shares that row's dividers and background
                         so the pair reads as one row. */
                          style={styleOf({
                            'flex-shrink': '0',
                            width: '36px',
                            border: 'none',
                            'border-top': i > 0 ? `1px solid ${borderClr()}` : 'none',
                            'border-left': `1px solid ${borderClr()}`,
                            background: isPreviewExpanded()
                              ? isLight()
                                ? '#eaeef2'
                                : 'rgba(255,255,255,0.06)'
                              : 'transparent',
                            color: 'inherit',
                            cursor: isAwaiting() ? 'pointer' : 'default',
                            'font-size': '14px',
                            opacity: '0.7',
                            transform: isPreviewExpanded() ? 'rotate(90deg)' : 'none',
                            transition: 'transform 80ms',
                          })}
                        >
                          ›
                        </button>
                      )}
                    </div>

                    {/* Inline preview (narrow screens only — wide screens use
                       the side pane below). */}
                    {hasPreviews() && isNarrow() && option.preview && isPreviewExpanded() && (
                      <div
                        style={styleOf({
                          'border-top': `1px solid ${borderClr()}`,
                          background: isLight() ? '#fff' : 'rgba(255,255,255,0.03)',
                          padding: '8px 12px',
                          'max-height': '240px',
                          'overflow-y': 'auto',
                          'font-size': '12px',
                        })}
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
            {multi() && isAwaiting() && props.card.onAskUserResponse != null && (
              <div
                style={styleOf({
                  display: 'flex',
                  'justify-content': 'flex-end',
                  gap: '8px',
                  'align-items': 'center',
                  padding: '8px 12px',
                  'border-top': `1px solid ${borderClr()}`,
                })}
              >
                <span style={styleOf({ 'font-size': '11px', opacity: '0.6' })}>
                  {t('ide.chat.askUserSelectedCount', undefined, {
                    defaultValue: '{{count}} selected',
                    count: multiPicks().length,
                  })}
                </span>
                <button
                  type="button"
                  data-mol-id="ask-user-multiselect-confirm"
                  disabled={multiPicks().length === 0}
                  class={cm.cn(
                    cm.button({ variant: 'solid', color: 'primary', size: 'xs' }),
                    cm.touchTargetCompact,
                  )}
                  onClick={() => {
                    if (multiPicks().length === 0) return
                    const answer = multiPicks().join('; ')
                    setLocalAnswer(answer)
                    props.card.onAskUserResponse!(answer)
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
          {hasPreviews() && !isNarrow() && (
            <div
              style={styleOf({
                flex: '1 1 45%',
                'min-width': '0',
                'border-left': `1px solid ${borderClr()}`,
                display: 'flex',
                'flex-direction': 'column',
                background: isLight() ? '#fff' : 'rgba(255,255,255,0.03)',
              })}
            >
              <div
                style={styleOf({
                  padding: '6px 12px',
                  'font-size': '11px',
                  'font-weight': '600',
                  opacity: '0.6',
                  'border-bottom': `1px solid ${borderClr()}`,
                  'white-space': 'nowrap',
                  overflow: 'hidden',
                  'text-overflow': 'ellipsis',
                })}
              >
                {previewOption()
                  ? previewOption()!.label
                  : t('ide.chat.askUserPreview', undefined, { defaultValue: 'Preview' })}
              </div>
              <div
                style={styleOf({
                  padding: '8px 12px',
                  'max-height': '360px',
                  'overflow-y': 'auto',
                  'font-size': '12px',
                })}
              >
                {previewOption()?.preview && (
                  <MarkdownContent text={previewOption()!.preview!} isStreaming={false} />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Free-text input. Shown by DEFAULT so the user is never stuck on an
             open-ended question (e.g. "what's your bakery called?") that the model
             asked without setting allowFreeText. Hidden only if the model
             explicitly opts out (allowFreeText === false) for a strict pick-one. */}
        {isAwaiting() &&
          askInput().allowFreeText !== false &&
          props.card.onAskUserResponse != null && (
            <div
              style={styleOf({
                display: 'flex',
                gap: '4px',
                padding: '8px 12px',
                'border-top': `1px solid ${borderClr()}`,
              })}
            >
              <input
                ref={(el: HTMLInputElement) => {
                  freeTextInput = el
                  el.setAttribute('value', freeText())
                }}
                type="text"
                value={freeText()}
                onInput={(e) => setFreeText(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && freeText().trim()) submitFreeText()
                }}
                placeholder={
                  askInput().options.length === 0
                    ? t('ide.chat.askUserPlaceholderEmpty', undefined, {
                        defaultValue: 'Type your answer…',
                      })
                    : t('ide.chat.askUserPlaceholder', undefined, {
                        defaultValue: 'Or type your own…',
                      })
                }
                class={cm.touchTargetCompact}
                /* The field box IS the Send button's box: the design-system 26px
               height and 3px radius every card button carries, so the pair
               reads as one control. */
                style={styleOf({
                  flex: '1',
                  'min-width': '0',
                  height: '26px',
                  padding: '0 8px',
                  'border-radius': '3px',
                  border: `1px solid ${borderClr()}`,
                  background: 'transparent',
                  color: 'inherit',
                  // Deliberate iOS-zoom guard: a focused input below 16px makes iOS
                  // Safari zoom the whole page on phone-width / touch-first viewports.
                  'font-size': isNarrow() || isCoarse() ? '16px' : '13px',
                  outline: 'none',
                })}
              />

              <button
                type="button"
                data-mol-id="ask-user-free-text-submit"
                disabled={!freeText().trim()}
                onClick={submitFreeText}
                // The same design-system CTA as this card's own Confirm choice
                // button a few rows up.
                class={cm.cn(
                  cm.button({ variant: 'solid', color: 'primary', size: 'xs' }),
                  cm.touchTargetCompact,
                  cm.shrink0,
                )}
              >
                {t('ide.chat.askUserSubmit', undefined, { defaultValue: 'Send' })}
              </button>
            </div>
          )}

        {/* Show free-text response if it wasn't one of the preset options */}
        {selectedAnswer() &&
          !askInput().options.some((option) => option.label === selectedAnswer()) && (
            <div
              style={styleOf({
                padding: '8px 12px',
                'border-top': `1px solid ${borderClr()}`,
                'font-size': '12px',
                'font-style': 'italic',
              })}
            >
              {selectedAnswer()}
            </div>
          )}

        {/* Optional hint text */}
        {askInput().hint && (
          <div
            style={styleOf({
              padding: '8px 12px',
              'border-top': `1px solid ${borderClr()}`,
              'font-size': '11px',
              'font-style': 'italic',
              opacity: '0.5',
            })}
          >
            {askInput().hint}
          </div>
        )}
      </div>
    </Show>
  )
}

// ---------------------------------------------------------------------------
// The compact row and its expandable detail pane
// ---------------------------------------------------------------------------

/** Tools that expand to show details inline. */
const EXPANDABLE_TOOLS = new Set([
  'exec_command',
  'web_fetch',
  'rename_file',
  'list_files',
  'find_files',
  'search_files',
  'find_package',
])

/**
 * The default tool-call row: status dot, label, line-diff stats, the one-line
 * summary, the undo control, the Skip action, and the expandable detail pane.
 *
 * @param props - The tool call and the caller's translate function.
 * @returns The rendered row.
 */
function ToolCallRow(props: { card: ToolCallCardProps; t: Translate }): JSX.Element {
  const cm = getClassMap()
  const mode = useThemeMode()
  const isLight = (): boolean => mode() === 'light'
  const isCoarse = useCoarsePointer()
  const backgroundCommands = useBackgroundTaskCommands()
  const { t } = props

  const [expanded, setExpanded] = createSignal(false)
  const [isHovered, setIsHovered] = createSignal(false)
  // The undo control hovers itself: once the pointer leaves the row ONTO it,
  // it stays revealed (the row's own hover state has already cleared).
  const [isUndoHovered, setIsUndoHovered] = createSignal(false)
  const [isUndoneLocal, setIsUndoneLocal] = createSignal(false)
  const [isReverting, setIsReverting] = createSignal(false)
  const [skipRequested, setSkipRequested] = createSignal(false)

  const card = props.card

  // gray → orange → green or red; a skipped call stays gray, because it did
  // not happen, and so does an interrupted one, because nobody knows if it did.
  const dotColor = (): string => toolCallDotColor(card)

  const summary = (): string => toolSummary(t, card.name, card.output as Out, card.status)

  // A wait names the command it waits on, not just the task id it was handed.
  const waitedTaskId = (): string | undefined =>
    card.name === 'wait_for_task' ? str((card.input as Inp | undefined)?.taskId) : undefined
  const waitedCommand = (): string | undefined => {
    const id = waitedTaskId()
    return id ? backgroundCommands.get(id) : undefined
  }
  const labelInput = (): unknown => {
    const command = waitedCommand()
    return command ? { ...(card.input as Inp), command } : card.input
  }

  // File path for the clickable filename <code> in the label. For load_skill the
  // path isn't in the input — the loaded skill's SKILL.md path comes back in the
  // output ({ name, path, content }) — so clicking the skill name opens its markdown.
  const filePath = (): string | null =>
    card.name === 'load_skill'
      ? (((card.output as { path?: string } | null | undefined)?.path ?? null) as string | null)
      : extractFilePath(card.name, card.input)

  // New files open directly (no diff to show); edits/modifications open the diff viewer.
  const isNewFile = (): boolean =>
    card.name === 'write_file' &&
    ((card.output as Inp | undefined)?.diff as { type?: string } | undefined)?.type === 'new'
  const isFileDiff = (): boolean =>
    !isNewFile() &&
    (card.name === 'edit_file' || card.name === 'write_file') &&
    filePath() != null &&
    card.onFileDiff != null

  // Memoize the expensive O(n*m) LCS diff computation so it only re-runs when inputs change.
  const diffStats = createMemo(() => fileDiffStats(card.name, card.input, card.output))

  // Undo/redo: available for file modifications (not new files) when a snapshot exists.
  const canRevert = (): boolean =>
    !isNewFile() &&
    (card.name === 'edit_file' || card.name === 'write_file') &&
    filePath() != null &&
    card.fileDiff != null &&
    card.onFileRevert != null

  const isUndone = (): boolean => card.isUndone ?? isUndoneLocal()

  /**
   * Undo/redo a file change: writes the other side's content and reports the
   * new state to the host.
   *
   * @param e - The click or key event that asked for it.
   * @returns A promise that settles when the host's write settles.
   */
  const handleRevert = async (e: MouseEvent | KeyboardEvent): Promise<void> => {
    e.stopPropagation()
    if (!canRevert() || isReverting()) return
    const diff = card.fileDiff!
    const undone = isUndone()
    const content = undone ? diff.modified : diff.original
    setIsReverting(true)
    try {
      await card.onFileRevert!(filePath()!, content)
      const newUndone = !undone
      setIsUndoneLocal(newUndone)
      card.onUndoToggle?.(card.id, newUndone)
    } catch (error) {
      // A host whose revert rejects must not leave an unhandled promise
      // rejection: the failure is logged and the card stays exactly as it
      // was (still undone or not, as before the click) (React's handleRevert).
      logger.warn('tool-call-card: reverting a file change failed', { error, path: filePath() })
    } finally {
      setIsReverting(false)
    }
  }

  // Skip this call while it is still running — the turn keeps going, the model
  // is told the command did not run. A host that answers `false` means the call
  // had already finished (the stale-button race), which is not an error: the
  // button simply returns to its resting state.
  const canSkip = (): boolean => card.status === 'running' && card.onSkip != null
  /**
   * Asks the host to skip this call, returning the button to rest when it says
   * nothing was in flight.
   *
   * @returns A promise that settles when the host's answer settles.
   */
  const handleSkip = async (): Promise<void> => {
    if (!card.onSkip || skipRequested() || card.skipDisabledReason) return
    setSkipRequested(true)
    try {
      const accepted = await card.onSkip(card.id)
      if (accepted === false) setSkipRequested(false)
    } catch (_error) {
      // Deliberate noop: the host already logs whatever went wrong on its side,
      // and there is nothing for the PERSON to do here — the call is still
      // running, so the honest UI is the button back at rest to try again.
      setSkipRequested(false)
    }
  }

  const hasDetails = (): boolean =>
    EXPANDABLE_TOOLS.has(card.name) && (card.input !== undefined || card.output !== undefined)

  // read_molecule_doc: clicking the row opens the package's README.md in the
  // editor (filePath is derived from the input's package name).
  const isDocOpen = (): boolean =>
    card.name === 'read_molecule_doc' && filePath() != null && card.onFileOpen != null

  // Only exec_command and web_fetch get the labeled IN / OUT pane treatment.
  const showInOut = (): boolean => card.name === 'exec_command' || card.name === 'web_fetch'

  const handleClick = (): (() => void) | undefined =>
    (isNewFile() || isDocOpen()) && filePath() && card.onFileOpen
      ? () => {
          card.onFileOpen!(filePath()!)
        }
      : isFileDiff()
        ? () => {
            card.onFileDiff!(filePath()!, card.fileDiff)
          }
        : hasDetails()
          ? () => {
              setExpanded((e) => !e)
            }
          : undefined

  // The label's openable file segments render as the row's SIBLING controls
  // (see the comment above the row): without `onFileOpen` they stay plain text.
  const label = createMemo(() =>
    labelSegments(t, card.name, labelInput(), filePath(), card.onFileOpen),
  )

  return (
    <div class={card.className} style={styleOf({ 'margin-bottom': '4px' })}>
      {/* The row, its file open controls, its undo control and its Skip are SIBLINGS: the row
           itself is a role="button" div (a real <button> cannot have its text selected), and a
           control cannot sit inside a button (axe `nested-interactive`) — the file names that
           open their file and the undo control are siblings laid out on the same line. Skip is an
           action the person clicks, so it gets to be a genuine button. */}
      <div
        style={styleOf({ display: 'flex', 'align-items': 'center', gap: '6px', 'min-width': '0' })}
      >
        <div
          role="button"
          tabindex={handleClick() ? 0 : undefined}
          onClick={
            handleClick()
              ? () => {
                  // Dragging across the label to copy it ends in a click: that is a
                  // selection, not a request to expand or open the card.
                  if (window.getSelection()?.toString()) return
                  handleClick()?.()
                }
              : undefined
          }
          onKeyDown={
            handleClick()
              ? (e: KeyboardEvent) => {
                  if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault()
                    handleClick()?.()
                  }
                }
              : undefined
          }
          onDblClick={
            isNewFile() && filePath() && card.onFileDoubleClick
              ? () => {
                  card.onFileDoubleClick!(filePath()!)
                }
              : undefined
          }
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          /* mol-bespoke-button: the tool-call ROW itself — status dot, label,
             diff stats, expand chevron — one line of the chat timeline, not a
             CTA. Reset to inherit the timeline's ink and background; the
             actions that ride on it (Skip) ARE design-system buttons. */
          style={styleOf({
            display: 'flex',
            // Coarse: the undo icon's 32px touch box inflates the label row, so
            // top-alignment would leave the diff stats/chevron riding high —
            // center everything instead. Desktop keeps flex-start + px nudges.
            'align-items': isCoarse() ? 'center' : 'flex-start',
            gap: '6px',
            background: 'none',
            border: 'none',
            // The text must stay selectable (a button's own text is not).
            'user-select': 'text',
            cursor: handleClick() ? 'pointer' : 'default',
            color: 'inherit',
            'text-align': 'left',
            padding: '2px 0',
            // Touch: ~20px rows are untappable — 32px is the dense-row floor.
            ...(isCoarse() ? { 'min-height': '32px' } : {}),
            width: '100%',
            // The row shares its line with the Skip button: without this it
            // keeps its intrinsic min-width and pushes the Skip off a 390px
            // screen instead of letting the label ellipsise.
            'min-width': '0',
          })}
        >
          {/* Label + undo icon + one-line summary */}
          <span style={styleOf({ flex: '1', 'min-width': '0' })}>
            <span
              style={styleOf({
                'font-size': '13px',
                display: 'flex',
                'align-items': 'center',
                gap: '6px',
              })}
            >
              {/* Colored status dot — inside the flex row so it auto-centers with the label */}
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                style={styleOf({ 'flex-shrink': '0' })}
              >
                <circle cx="5" cy="5" r="3" fill={dotColor()} opacity="0.35" />
                <circle cx="5" cy="5" r="3" fill="none" stroke={dotColor()} stroke-width="2" />
              </svg>
              <span
                style={styleOf({
                  flex: '1',
                  'min-width': '0',
                  overflow: 'hidden',
                  'text-overflow': 'ellipsis',
                  'white-space': 'nowrap',
                })}
              >
                {label().text}
              </span>
              {/* One-line status ("Running…"/"Done"/error count), on the SAME row as the
                 label and pushed to the right edge by the label's flex:1. */}
              {summary() && (
                <span
                  class={cm.cn(cm.textMuted, cm.textSize('xs'))}
                  style={styleOf({
                    'flex-shrink': '0',
                    'margin-left': '8px',
                    'white-space': 'nowrap',
                  })}
                >
                  {summary()}
                </span>
              )}
            </span>
          </span>

          {/* Line diff stats for file-changing tools */}
          {diffStats() && (
            <span
              style={styleOf({
                display: 'flex',
                gap: '4px',
                'flex-shrink': '0',
                'margin-top': isCoarse() ? '0' : '2px',
                'font-size': '11px',
                'font-family': MONO,
                opacity: isHovered() ? '1' : '0.6',
                transition: 'opacity 100ms',
              })}
            >
              {diffStats()!.added > 0 && (
                <span
                  style={styleOf({
                    color: isUndone()
                      ? isLight()
                        ? '#cf222e'
                        : '#f47067'
                      : isLight()
                        ? '#1a7f37'
                        : '#57ab5a',
                    'text-decoration': isUndone() ? 'line-through' : undefined,
                  })}
                >
                  +{diffStats()!.added}
                </span>
              )}
              {diffStats()!.removed > 0 && (
                <span
                  style={styleOf({
                    color: isUndone()
                      ? isLight()
                        ? '#1a7f37'
                        : '#57ab5a'
                      : isLight()
                        ? '#cf222e'
                        : '#f47067',
                    'text-decoration': isUndone() ? 'line-through' : undefined,
                  })}
                >
                  -{diffStats()!.removed}
                </span>
              )}
            </span>
          )}

          {/* Expand / open chevron */}
          {(hasDetails() ||
            isFileDiff() ||
            isDocOpen() ||
            (isNewFile() && filePath() && card.onFileOpen)) && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              width="14"
              height="14"
              style={styleOf({
                display: 'block',
                'flex-shrink': '0',
                'margin-top': isCoarse() ? '0' : '3px',
                transform: expanded() ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 150ms, opacity 100ms',
                opacity: isHovered() ? '0.85' : '0.35',
              })}
            >
              <polyline
                points="6,4 10,8 6,12"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          )}
        </div>
        <For each={label().files}>
          {(target) => (
            <FileOpenControl
              target={target}
              onFileOpen={card.onFileOpen!}
              onFileDoubleClick={card.onFileDoubleClick}
            />
          )}
        </For>
        {canRevert() && card.status !== 'running' && (
          <span
            role="button"
            tabindex={0}
            title={
              isUndone()
                ? t('ide.chat.redoChange', undefined, {
                    defaultValue: 'Re-apply this change',
                  })
                : t('ide.chat.undoChange', undefined, { defaultValue: 'Undo this change' })
            }
            onClick={handleRevert}
            onKeyDown={(e: KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                void handleRevert(e)
              }
            }}
            onMouseEnter={(e) => {
              setIsUndoHovered(true)
              e.currentTarget.style.background = 'rgba(128,128,128,0.2)'
              e.currentTarget.style.opacity = '1'
            }}
            onMouseLeave={(e) => {
              setIsUndoHovered(false)
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.opacity = ''
            }}
            /* mol-bespoke-button: icon-only undo/redo affordance BESIDE
                   the row — it has to be a role="button" span because
                   a real button cannot nest in the row button, and it is
                   hover-revealed chrome (20px box, neutral scrim), not a CTA.
                   Its 32px coarse box is asserted by the mobile-touch tests. */
            style={styleOf({
              display: 'inline-flex',
              'align-items': 'center',
              'justify-content': 'center',
              // Touch: hover can't reveal it, so it rests visible at 0.6 and
              // gets a 32px hit box (the floor for these dense inline rows).
              width: isCoarse() ? '32px' : '20px',
              height: isCoarse() ? '32px' : '20px',
              'border-radius': '4px',
              'flex-shrink': '0',
              // Nudge up 1px: the 13px glyph sat slightly below the text's
              // optical center of the compact 20px box (moot at 32px).
              position: 'relative',
              top: isCoarse() ? '0' : '-1px',
              cursor: isReverting() ? 'wait' : 'pointer',
              opacity: isReverting()
                ? '0.3'
                : isHovered() || isCoarse() || isUndoHovered()
                  ? '0.6'
                  : '0',
              transition: 'opacity 100ms, background 100ms',
            })}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              width="13"
              height="13"
              fill="currentColor"
            >
              {isUndone() ? (
                <path d="M14.78 6.28a.749.749 0 0 0 0-1.06l-3.5-3.5a.749.749 0 1 0-1.06 1.06L12.439 5H5.251l-.001.007L5.251 5a.8.8 0 0 0-.171.019A4.501 4.501 0 0 0 5.5 14h1.704a.75.75 0 0 0 0-1.5H5.5a3 3 0 1 1 0-6h6.939L10.22 8.72a.749.749 0 1 0 1.06 1.06l3.5-3.5Z" />
              ) : (
                <path d="M1.22 6.28a.749.749 0 0 1 0-1.06l3.5-3.5a.749.749 0 1 1 1.06 1.06L3.561 5h7.188l.001.007L10.749 5c.058 0 .116.007.171.019A4.501 4.501 0 0 1 10.5 14H8.796a.75.75 0 0 1 0-1.5H10.5a3 3 0 1 0 0-6H3.561L5.78 8.72a.749.749 0 1 1-1.06 1.06l-3.5-3.5Z" />
              )}
            </svg>
          </span>
        )}
        {canSkip() && (
          <button
            type="button"
            data-mol-id={`tool-call-skip-${card.id}`}
            onClick={() => {
              void handleSkip()
            }}
            disabled={skipRequested() || card.skipDisabledReason != null}
            title={card.skipDisabledReason ?? undefined}
            class={cm.cn(
              cm.button({ variant: 'solid', color: 'primary', size: 'xs' }),
              cm.touchTargetCompact,
              cm.shrink0,
            )}
          >
            {skipRequested()
              ? t('ide.chat.skippingToolCall', undefined, { defaultValue: 'Skipping…' })
              : t('ide.chat.skipToolCall', undefined, { defaultValue: 'Skip' })}
          </button>
        )}
      </div>

      {/* Expanded detail */}
      {expanded() && hasDetails() && (
        <div
          class={cm.surfaceSecondary}
          style={styleOf({
            'margin-left': '14px',
            'margin-top': '4px',
            'margin-bottom': '4px',
            'border-radius': '4px',
            'overflow-x': 'auto',
          })}
        >
          {showInOut() ? (
            <>
              {card.input !== undefined && (
                <div style={styleOf({ padding: '6px 10px' })}>
                  <div
                    class={cm.textMuted}
                    style={styleOf({
                      'font-size': '9px',
                      'text-transform': 'uppercase',
                      'letter-spacing': '0.6px',
                      'margin-bottom': '4px',
                      'font-weight': '600',
                    })}
                  >
                    {card.name === 'exec_command'
                      ? t('ide.toolCall.command', undefined, { defaultValue: 'Command' })
                      : t('ide.toolCall.request', undefined, { defaultValue: 'Request' })}
                  </div>
                  {renderIn(card.name, card.input)}
                </div>
              )}
              {card.output !== undefined && (
                <div
                  style={styleOf({
                    padding: '6px 10px',
                    'border-top':
                      card.input !== undefined ? '1px solid rgba(128,128,128,0.15)' : undefined,
                  })}
                >
                  <div
                    class={cm.textMuted}
                    style={styleOf({
                      'font-size': '9px',
                      'text-transform': 'uppercase',
                      'letter-spacing': '0.6px',
                      'margin-bottom': '4px',
                      'font-weight': '600',
                    })}
                  >
                    {card.name === 'exec_command'
                      ? t('ide.toolCall.output', undefined, { defaultValue: 'Output' })
                      : t('ide.toolCall.response', undefined, { defaultValue: 'Response' })}
                  </div>
                  {renderOut(t, card.name, card.output)}
                </div>
              )}
            </>
          ) : (
            <div style={styleOf({ padding: '6px 10px' })}>
              {/* rename_file: show old → new path */}
              {card.name === 'rename_file' && (
                <pre style={PRE}>
                  {str(((card.input ?? {}) as Inp).old_path) ?? ''}
                  {' → '}
                  {str(((card.input ?? {}) as Inp).new_path) ?? ''}
                </pre>
              )}

              {/* Listing / search tools: show output results */}
              {(card.name === 'list_files' ||
                card.name === 'find_files' ||
                card.name === 'search_files') &&
                card.output !== undefined &&
                renderOut(t, card.name, card.output)}

              {/* find_package: clickable package matches — each opens its README.md */}
              {card.name === 'find_package' && card.output !== undefined && (
                <PackageResultRows
                  results={packageResults(card.output)}
                  onFileOpen={card.onFileOpen}
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Compact tool-call row with status dot, label, summary, and expandable detail pane.
 *
 * @param props - See `ToolCallCardProps` (React's contract).
 * @returns The rendered tool call card element.
 */
export function ToolCallCard(props: ToolCallCardProps): JSX.Element {
  const { t } = useTranslation()

  return (
    <Switch fallback={<ToolCallRow card={props} t={t} />}>
      {/* ── update_task_list: drawn once, pinned above the composer (PlanCard) —
           not repeated in the transcript on every update. */}
      <Match when={props.name === 'update_task_list'}>{null}</Match>
      {/* ── spawn_agent: subagent card — explore report / judge verdict / build summary ── */}
      <Match when={props.name === 'spawn_agent'}>
        <SubagentCard card={props} t={t} />
      </Match>
      {/* ── save_plan: clickable row that opens the plan file in the editor ── */}
      <Match when={props.name === 'save_plan'}>
        <SavePlanRow card={props} t={t} />
      </Match>
      {/* ── ask_user: render interactive option list instead of a normal tool card ── */}
      <Match when={props.name === 'ask_user'}>
        <AskUserCard card={props} t={t} />
      </Match>
    </Switch>
  )
}
