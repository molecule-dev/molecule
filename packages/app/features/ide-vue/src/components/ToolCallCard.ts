/**
 * Tool call display row — compact, Claude Code-style.
 *
 * Vue counterpart of `@molecule/app-ide-react`'s `ToolCallCard` (see that file
 * for the design notes): the same props (React names), the same DOM for the
 * same input, the same callbacks. Shows a colored status dot, a
 * human-readable action label, and a one-line result summary; expands on click
 * to reveal formatted IN / OUT sections: diffs for file edits, terminal output
 * for commands, and the result rows of the listing, search and package tools.
 *
 * A call that is still RUNNING carries a **Skip** (when the host serves one):
 * it drops that one tool call without ending the turn, and the result renders
 * as **Skipped** with a gray dot — never as a success, never as a failure.
 *
 * Styling uses `getClassMap()` (`cm.*`); the inline styles are the ones React
 * writes, so the rendered attributes are identical. All user-facing text goes
 * through `t()`.
 *
 * @module
 */

import {
  computed,
  defineComponent,
  h,
  inject,
  type PropType,
  ref,
  type VNode,
  type VNodeChild,
} from 'vue'

import type { ToolCallCardProps } from '@molecule/app-ide-panel-logic'
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
  type ToolOutput,
  toolSummary,
} from '@molecule/app-ide-panel-logic/panels'
import { getLogger } from '@molecule/app-logger'
import { getClassMap } from '@molecule/app-ui'
import { useThemeMode, useTranslation, type UseTranslationResult } from '@molecule/app-vue'

import { backgroundTaskCommandsKey } from '../context/background-task-commands.js'
import { useCoarsePointer, useNarrowViewport } from '../hooks/useViewport.js'
import { MarkdownContent } from '../parts/MarkdownContent.js'

/** The card's logger (React's `getLogger('tool-call-card')`). */
const logger = getLogger('tool-call-card')

/** A tool call's input or output, read field by field. */
type Inp = Record<string, unknown>

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

// ---------------------------------------------------------------------------
// Label renderer — turns `backtick` segments into inline <code> spans
// ---------------------------------------------------------------------------

/** The monospace type every code segment and log line renders in. */
const CODE_STYLE: Record<string, string | number> = {
  fontFamily: '"SF Mono", Menlo, Consolas, "Courier New", monospace',
  fontSize: 'inherit',
}

/**
 * Keeps a controlled input's `value` ATTRIBUTE in step with its property
 * (React's attribute semantics).
 *
 * @param vnode - The input's vnode.
 */
function syncValueAttr(vnode: VNode): void {
  const el = vnode.el as HTMLInputElement | null
  if (el) el.setAttribute('value', el.value)
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
 * @param t - The translation function from `useTranslation()`.
 * @param target - The file segment's name and the path it opens.
 * @param onFileOpen - Callback to preview a file on single click.
 * @param onFileDoubleClick - Callback to pin a file tab on double click.
 * @returns The rendered clickable code element.
 */
function fileOpenControl(
  t: Translate,
  target: LabelFileTarget,
  onFileOpen: (path: string) => void,
  onFileDoubleClick: ((path: string) => void) | undefined,
): VNode {
  return h(
    'code',
    {
      style: { ...CODE_STYLE, opacity: 0.75, transition: 'opacity 100ms', flexShrink: 0 },
      onMouseenter: (e: MouseEvent) => {
        ;(e.currentTarget as HTMLElement).style.opacity = '1'
      },
      onMouseleave: (e: MouseEvent) => {
        ;(e.currentTarget as HTMLElement).style.opacity = '0.75'
      },
    },
    [
      // `code` is a semantic element and cannot be a button, so the action
      // lives on a native button inside it.
      h(
        'button',
        {
          type: 'button',
          'aria-label': t(
            'ide.chat.tool.openFile',
            { path: target.path },
            {
              defaultValue: 'Open {{path}}',
            },
          ),
          onClick: () => {
            onFileOpen(target.path)
          },
          onDblclick: () => {
            onFileDoubleClick?.(target.path)
          },
          /* mol-bespoke-button: the filename of a tool-call label opens the
             file — inline code text, not a CTA; the inline reset keeps it
             looking exactly like the code text it wraps. */
          style: {
            background: 'transparent',
            border: 'none',
            padding: 0,
            font: 'inherit',
            color: 'inherit',
            cursor: 'pointer',
          },
        },
        target.name,
      ),
    ],
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
): { text: string | (string | VNode | null)[]; files: LabelFileTarget[] } {
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
      files.push({ name: parts[i]!, path: target })
      return true
    }
    return false
  })
  const textNodes = parts.map((part, i) => {
    if (i % 2 === 1)
      return openable[i] ? null : h('code', { style: { ...CODE_STYLE, opacity: 0.75 } }, part)
    // A separator between two segments that both moved out of the text (the
    // ", " between a batch read's names) would dangle between nothing.
    if (openable[i - 1] && openable[i + 1] && /^[\s,]*$/.test(part)) return null
    return part
  })
  return { text: textNodes, files }
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

/** The monospace log type, shared by the result rows and the expanded pane. */
const PRE: Record<string, string | number> = {
  margin: 0,
  whiteSpace: 'pre',
  overflowX: 'auto',
  fontFamily: '"SF Mono", Menlo, Consolas, "Courier New", monospace',
  fontSize: '11px',
  lineHeight: 1.5,
}

// A shell command or its output is read whole: wrap it instead of scrolling
// sideways, and cap tall output with a vertical scroll.
const WRAP_PRE: Record<string, string | number> = {
  ...PRE,
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
  overflowX: 'visible',
}
const OUTPUT_PRE: Record<string, string | number> = {
  ...WRAP_PRE,
  maxHeight: '320px',
  overflowY: 'auto',
}

/**
 * Clickable rows for find_package matches — each opens the package's
 * README.md in the editor.
 *
 * @param t - The translation function from `useTranslation()`.
 * @param results - The package matches.
 * @param onFileOpen - Callback to open a package's docs.
 * @param isCoarse - Whether the primary pointer is coarse (touch).
 * @returns The rendered result rows.
 */
function packageResultRows(
  t: Translate,
  results: PackageResult[],
  onFileOpen?: (path: string) => void,
  isCoarse = false,
): VNode {
  if (results.length === 0) {
    return h(
      'span',
      { style: { opacity: 0.5 } },
      t('ide.toolCall.noMatches', undefined, { defaultValue: 'No matches' }),
    )
  }
  return h(
    'div',
    { style: { fontFamily: PRE.fontFamily, fontSize: '11px', lineHeight: 1.7 } },
    results.map((r, i) => {
      const docPath = moleculeDocPath(r.name)
      const clickable = docPath != null && onFileOpen != null
      return h(
        'div',
        {
          role: clickable ? 'button' : undefined,
          tabindex: clickable ? 0 : undefined,
          'data-mol-id': `find-package-result-${i}`,
          title: clickable
            ? t('ide.toolCall.openPackageDoc', undefined, {
                defaultValue: 'Open package docs',
              })
            : undefined,
          onClick: clickable
            ? (e: MouseEvent) => {
                e.stopPropagation()
                onFileOpen(docPath)
              }
            : undefined,
          onKeydown: clickable
            ? (e: KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  e.stopPropagation()
                  onFileOpen(docPath)
                }
              }
            : undefined,
          onMouseenter: (e: MouseEvent) => {
            if (clickable) (e.currentTarget as HTMLElement).style.opacity = '1'
          },
          onMouseleave: (e: MouseEvent) => {
            if (clickable) (e.currentTarget as HTMLElement).style.opacity = '0.8'
          },
          style: {
            display: 'flex',
            gap: '8px',
            alignItems: 'baseline',
            // Touch: ~19px result rows are untappable — 32px dense-row floor.
            ...(isCoarse && clickable ? { minHeight: '32px', alignItems: 'center' } : {}),
            cursor: clickable ? 'pointer' : 'default',
            opacity: clickable ? 0.8 : 1,
            transition: 'opacity 100ms',
          },
        },
        [
          h('span', { style: { whiteSpace: 'nowrap' } }, r.name),
          r.label
            ? h(
                'span',
                {
                  style: {
                    opacity: 0.55,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  },
                },
                r.label,
              )
            : null,
        ].filter(Boolean) as VNodeChild[],
      )
    }),
  )
}

// ---------------------------------------------------------------------------
// Detail renderers — IN and OUT panes
// ---------------------------------------------------------------------------

/**
 * Render the input section for a tool call.
 *
 * @param name - The tool name.
 * @param input - The raw tool input payload.
 * @returns The formatted input content.
 */
function renderIn(name: string, input: unknown): VNodeChild {
  const inp = (input ?? {}) as Inp

  switch (name) {
    case 'exec_command':
      return h('pre', { style: WRAP_PRE }, [
        h('span', { style: { opacity: 0.5 } }, '$ '),
        str(inp.command) ?? '',
      ])

    case 'write_file':
      // Full file content is too noisy — show only the path
      return h('pre', { style: PRE }, str(inp.path) ?? '')

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
      const nodes: VNodeChild[] = []
      replacements.forEach((r, i) => {
        if (i > 0) nodes.push('\n\n')
        r.old_string.split('\n').forEach((line, li) => {
          if (li > 0) nodes.push('\n')
          nodes.push(
            h('span', { style: { color: '#f47067', fontFamily: 'inherit' } }, ['- ', line]),
          )
        })
        nodes.push('\n')
        r.new_string.split('\n').forEach((line, li) => {
          if (li > 0) nodes.push('\n')
          nodes.push(
            h('span', { style: { color: '#57ab5a', fontFamily: 'inherit' } }, ['+ ', line]),
          )
        })
      })
      return h('pre', { style: PRE }, nodes)
    }

    case 'search_files':
      return h('pre', { style: PRE }, [
        `/${str(inp.pattern) ?? ''}/`,
        str(inp.path) ? ` in ${str(inp.path)}` : '',
        str(inp.include) ? ` (${str(inp.include)})` : '',
      ])

    case 'find_files':
      return h('pre', { style: PRE }, [
        str(inp.pattern) ?? '',
        str(inp.path) ? ` in ${str(inp.path)}` : '',
      ])

    case 'read_file':
    case 'delete_file':
    case 'list_files':
    case 'create_directory':
      return h('pre', { style: PRE }, str(inp.path) ?? '')

    case 'rename_file':
      return h('pre', { style: PRE }, [str(inp.old_path) ?? '', ' → ', str(inp.new_path) ?? ''])

    case 'web_fetch':
      return h('pre', { style: PRE }, [str(inp.method) ?? 'GET', ' ', str(inp.url) ?? ''])

    default:
      return h('pre', { style: PRE }, JSON.stringify(input, null, 2))
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
function renderOut(t: Translate, name: string, output: unknown): VNodeChild {
  const out = (output ?? {}) as Inp

  // The result's `message` is written for the model ("Check the actual state
  // first…"); the person gets one plain sentence.
  if (isInterruptedByRestart(output)) {
    return h('span', { style: { opacity: 0.7 } }, interruptedByRestartLine(t))
  }

  if (typeof out === 'object' && out !== null && 'error' in out) {
    return h(
      'pre',
      { style: { ...PRE, color: '#f47067' } },
      str(out.error) ?? JSON.stringify(out.error),
    )
  }

  switch (name) {
    case 'exec_command': {
      const stdout = (str(out.stdout) ?? '').trimEnd()
      const stderr = (str(out.stderr) ?? '').trimEnd()
      const exitCode = num(out.exitCode)
      return h(
        'div',
        null,
        [
          stdout ? h('pre', { style: OUTPUT_PRE }, stdout) : null,
          stderr
            ? h(
                'pre',
                { style: { ...OUTPUT_PRE, color: '#f47067', marginTop: stdout ? '4px' : 0 } },
                stderr,
              )
            : null,
          exitCode != null && exitCode !== 0
            ? h(
                'div',
                { style: { marginTop: '4px', color: '#f47067', fontSize: '10px' } },
                t(
                  'ide.toolCall.exitCode',
                  { code: exitCode },
                  {
                    defaultValue: 'exit code {{code}}',
                  },
                ),
              )
            : null,
          !stdout && !stderr
            ? h(
                'span',
                { style: { opacity: 0.5 } },
                t('ide.toolCall.noOutput', undefined, { defaultValue: '(no output)' }),
              )
            : null,
        ].filter(Boolean) as VNodeChild[],
      )
    }

    case 'write_file': {
      const diff = out.diff as
        { type: string; linesAdded: number; linesRemoved: number } | undefined
      if (!diff)
        return h(
          'span',
          { style: { opacity: 0.6 } },
          t('ide.toolCall.written', undefined, { defaultValue: 'Written' }),
        )
      if (diff.type === 'unchanged')
        return h(
          'span',
          { style: { opacity: 0.6 } },
          t('ide.toolCall.statusUnchanged', undefined, { defaultValue: 'Unchanged' }),
        )
      return h(
        'div',
        { style: { fontFamily: PRE.fontFamily, fontSize: '11px' } },
        [
          diff.type === 'new'
            ? h(
                'div',
                { style: { color: '#57ab5a' } },
                t(
                  'ide.toolCall.newFileLines',
                  { count: diff.linesAdded },
                  {
                    defaultValue: 'new file, {{count}} lines',
                  },
                ),
              )
            : null,
          diff.type === 'modified'
            ? [
                diff.linesAdded > 0
                  ? h(
                      'div',
                      { style: { color: '#57ab5a' } },
                      t(
                        'ide.toolCall.linesAdded',
                        { count: diff.linesAdded },
                        {
                          defaultValue: '+{{count}} lines',
                        },
                      ),
                    )
                  : null,
                diff.linesRemoved > 0
                  ? h(
                      'div',
                      { style: { color: '#f47067' } },
                      t(
                        'ide.toolCall.linesRemoved',
                        { count: diff.linesRemoved },
                        {
                          defaultValue: '−{{count}} lines',
                        },
                      ),
                    )
                  : null,
              ]
            : null,
        ].filter(Boolean) as VNodeChild[],
      )
    }

    case 'edit_file': {
      const n = num(out.replacementsApplied)
      return h(
        'span',
        { style: { opacity: 0.6, fontSize: '11px' } },
        n != null
          ? t(
              'ide.toolCall.changesApplied',
              { count: n },
              {
                defaultValue: '{{count}} changes applied',
              },
            )
          : t('ide.toolCall.applied', undefined, { defaultValue: 'Applied' }),
      )
    }

    case 'read_file': {
      const content = str(out.content)
      if (!content)
        return h(
          'span',
          { style: { opacity: 0.5 } },
          t('ide.toolCall.empty', undefined, { defaultValue: '(empty)' }),
        )
      const truncated = content.length > 3000
      return h(
        'pre',
        { style: PRE },
        truncated
          ? content.slice(0, 3000) +
              '\n' +
              t('ide.toolCall.truncated', undefined, { defaultValue: '… (truncated)' })
          : content,
      )
    }

    case 'list_files': {
      const entries = out.entries as Array<{ name: string; type: string }> | undefined
      if (!entries?.length)
        return h(
          'span',
          { style: { opacity: 0.5 } },
          t('ide.toolCall.empty', undefined, { defaultValue: '(empty)' }),
        )
      return h(
        'div',
        { style: { fontFamily: PRE.fontFamily, fontSize: '11px', lineHeight: 1.6 } },
        entries.map((e, i) =>
          h('div', { key: i, style: { display: 'flex', gap: '6px' } }, [
            h(
              'span',
              { style: { opacity: 0.4, width: '10px', flexShrink: 0 } },
              e.type === 'directory' ? '▶' : '',
            ),
            h('span', null, [e.name, e.type === 'directory' ? '/' : '']),
          ]),
        ),
      )
    }

    case 'find_files': {
      const files = Array.isArray(out.files)
        ? out.files.map((file) => str(file)).filter((file): file is string => file !== undefined)
        : undefined
      if (!files?.length)
        return h(
          'span',
          { style: { opacity: 0.5 } },
          t('ide.toolCall.noFilesFound', undefined, { defaultValue: 'No files found' }),
        )
      return h(
        'div',
        { style: { fontFamily: PRE.fontFamily, fontSize: '11px', lineHeight: 1.6 } },
        files.map((f, i) => h('div', { key: i }, f)),
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
        return h(
          'span',
          { style: { opacity: 0.5 } },
          t('ide.toolCall.noMatches', undefined, { defaultValue: 'No matches' }),
        )
      return h(
        'div',
        { style: { fontFamily: PRE.fontFamily, fontSize: '11px', lineHeight: 1.6 } },
        [
          ...matches
            .slice(0, 30)
            .map((m, i) =>
              h('div', { key: i, style: { display: 'flex', gap: '8px', marginBottom: '2px' } }, [
                h(
                  'span',
                  { style: { opacity: 0.5, flexShrink: 0, whiteSpace: 'nowrap' } },
                  `${basename(m.file)}:${m.line}`,
                ),
                h('span', { style: { whiteSpace: 'pre' } }, m.content.trim()),
              ]),
            ),
          matches.length > 30
            ? h(
                'div',
                { style: { opacity: 0.5, marginTop: '4px' } },
                t(
                  'ide.toolCall.andMore',
                  { count: matches.length - 30 },
                  {
                    defaultValue: '… and {{count}} more',
                  },
                ),
              )
            : null,
        ].filter(Boolean) as VNodeChild[],
      )
    }

    case 'web_fetch': {
      const status = num(out.status)
      const body = str(out.body)
      const ok = status != null && status >= 200 && status < 300
      return h(
        'div',
        null,
        [
          status != null
            ? h(
                'div',
                {
                  style: {
                    color: ok ? '#57ab5a' : '#f47067',
                    marginBottom: body ? '4px' : 0,
                    fontSize: '11px',
                  },
                },
                `HTTP ${status}`,
              )
            : null,
          body
            ? h(
                'pre',
                { style: PRE },
                body.length > 2000
                  ? body.slice(0, 2000) +
                      '\n' +
                      t('ide.toolCall.truncated', undefined, { defaultValue: '… (truncated)' })
                  : body,
              )
            : null,
        ].filter(Boolean) as VNodeChild[],
      )
    }

    default:
      return h('pre', { style: PRE }, JSON.stringify(output, null, 2))
  }
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
export const ToolCallCard = defineComponent({
  name: 'ToolCallCard',
  inheritAttrs: false,
  props: {
    /** The tool call's id (the turn's own identifier for it). */
    id: { type: String, required: true },
    /** The tool name (`exec_command`, `read_file`, …). */
    name: { type: String, required: true },
    /** The raw tool input payload. */
    input: { required: false },
    /** The raw tool output payload. */
    output: { required: false },
    /** How the call is going. */
    status: {
      type: String as PropType<ToolCallCardProps['status']>,
      required: true,
    },
    /** Snapshot of original/modified file content captured at tool-call time. */
    fileDiff: {
      type: Object as PropType<{ original: string; modified: string }>,
      required: false,
    },
    /** Externally controlled undo state — when true, the card displays as undone. */
    isUndone: {
      type: Boolean as PropType<boolean | undefined>,
      required: false,
      default: undefined,
    },
    /** Called when the undo/redo button is toggled on this tool call. */
    onUndoToggle: {
      type: Function as PropType<(id: string, undone: boolean) => void>,
      required: false,
    },
    /** Called when a filename in the card is clicked — open it as a preview tab. */
    onFileOpen: { type: Function as PropType<(path: string) => void>, required: false },
    /** Called when a filename in the card is double-clicked — pin the tab. */
    onFileDoubleClick: { type: Function as PropType<(path: string) => void>, required: false },
    /** Called when a file-changing card is clicked — open its diff. */
    onFileDiff: {
      type: Function as PropType<
        (path: string, diff?: { original: string; modified: string }) => void
      >,
      required: false,
    },
    /** Called to undo/redo a file change — writes the given content to the path. */
    onFileRevert: {
      type: Function as PropType<(path: string, content: string) => Promise<void>>,
      required: false,
    },
    /** Called when the user answers an `ask_user` question. */
    onAskUserResponse: { type: Function as PropType<(response: string) => void>, required: false },
    /** Skips this call while it runs, without ending the turn. */
    onSkip: {
      type: Function as PropType<(id: string) => void | Promise<boolean | void>>,
      required: false,
    },
    /** Why skipping is unavailable to this viewer, already translated; `null` when it is. */
    skipDisabledReason: { type: String as PropType<string | null | undefined>, required: false },
    /** Extra class names for the card root. */
    className: { type: String, required: false },
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const mode = useThemeMode()
    const isLight = computed(() => mode.value === 'light')
    // Touch/phone branches (read unconditionally, before the per-tool early
    // returns): hover-revealed controls become visible-by-default and compact
    // hit areas grow; fine-pointer desktop rendering is unchanged.
    const isCoarse = useCoarsePointer()
    const isNarrow = useNarrowViewport()
    const backgroundCommands = inject(backgroundTaskCommandsKey, new Map<string, string>())

    const expanded = ref(false)
    const isHovered = ref(false)
    const isUndoneLocal = ref(false)
    const isReverting = ref(false)
    // The undo control is a SIBLING of the row, so the row's hover no longer
    // covers the last pixel of travel to it — its own hover keeps it revealed
    // (without this, leaving the row would hide it under the pointer).
    const isUndoHovered = ref(false)
    const skipRequested = ref(false)

    // The subagent card keeps its own disclosure, as React's branch does.
    const subagentExpanded = ref(false)

    // ask_user state (the question's in-progress answer and hovers).
    const localAnswer = ref<string | null>(null)
    const freeText = ref('')
    const hoveredIdx = ref<number | null>(null)
    const multiPicks = ref<string[]>([])
    const expandedPreviewIdx = ref<number | null>(null)

    /**
     * Undo/redo a file change: writes the other side's content and reports the
     * new state to the host.
     *
     * @param e - The click or key event that asked for it.
     * @returns A promise that settles when the host's write settles.
     */
    async function handleRevert(e: MouseEvent | KeyboardEvent): Promise<void> {
      e.stopPropagation()
      const fileDiff = props.fileDiff
      const filePath = currentFilePath()
      const newFile =
        props.name === 'write_file' &&
        ((props.output as Inp | undefined)?.diff as { type?: string } | undefined)?.type === 'new'
      const canRevertNow =
        !newFile &&
        (props.name === 'edit_file' || props.name === 'write_file') &&
        filePath != null &&
        fileDiff != null &&
        props.onFileRevert != null
      if (!canRevertNow || isReverting.value) return
      const undone = isUndone.value
      const content = undone ? fileDiff!.modified : fileDiff!.original
      isReverting.value = true
      try {
        await props.onFileRevert!(filePath!, content)
        const newUndone = !undone
        isUndoneLocal.value = newUndone
        props.onUndoToggle?.(props.id, newUndone)
      } catch (error) {
        // A host whose revert rejects must not leave an unhandled promise
        // rejection: the failure is logged and the card stays exactly as it
        // was (still undone or not, as before the click) (React's handleRevert).
        logger.warn('tool-call-card: reverting a file change failed', { error, path: filePath })
      } finally {
        isReverting.value = false
      }
    }

    /**
     * Skip this call while it is still running — the turn keeps going, the
     * model is told the command did not run. A host that answers `false` means
     * the call had already finished (the stale-button race), which is not an
     * error: the button simply returns to its resting state.
     *
     * @returns A promise that settles when the host's answer settles.
     */
    async function handleSkip(): Promise<void> {
      if (!props.onSkip || skipRequested.value || props.skipDisabledReason) return
      skipRequested.value = true
      try {
        const accepted = await props.onSkip(props.id)
        if (accepted === false) skipRequested.value = false
      } catch (_error) {
        // Deliberate noop: the host already logs whatever went wrong on its
        // side, and there is nothing for the PERSON to do here — the call is
        // still running, so the honest UI is the button back at rest.
        skipRequested.value = false
      }
    }

    /** Files a change opened directly rather than as a diff. */
    const isNewFile = computed(
      () =>
        props.name === 'write_file' &&
        ((props.output as Inp | undefined)?.diff as { type?: string } | undefined)?.type === 'new',
    )

    /** The file a label's segments open, or null. */
    function currentFilePath(): string | null {
      return props.name === 'load_skill'
        ? (((props.output as { path?: string } | null | undefined)?.path ?? null) as string | null)
        : extractFilePath(props.name, props.input)
    }

    const isUndone = computed(() => props.isUndone ?? isUndoneLocal.value)

    /** The className React would put on the card root. */
    const rootClass = computed(() => props.className)

    return (): VNodeChild => {
      const name = props.name
      const input = props.input
      const output = props.output
      const status = props.status
      const light = isLight.value

      // The person skipped this call. It is neither a success nor a failure,
      // and the row has to say so — a green dot on a command that never ran is
      // exactly the kind of quiet lie the honesty rule exists to stop.
      const wasSkipped = isSkippedByUser(output)
      // A restart cut the call off: its effect is unknown, so it is shown like
      // a skip (gray, never green) with its own word and sentence.
      const wasInterrupted = isInterruptedByRestart(output)

      const hasError = (() => {
        if (wasSkipped || wasInterrupted) return false
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
      // not happen, and so does an interrupted one, because nobody knows if it did.
      const dotColor =
        status === 'pending' || wasSkipped || wasInterrupted
          ? '#888888'
          : status === 'running'
            ? '#e8a000'
            : hasError
              ? '#f04040'
              : '#3fb950'

      const summary = toolSummary(t, name, output as ToolOutput, status)

      // A wait names the command it waits on, not just the task id it was handed.
      const waitedTaskId =
        name === 'wait_for_task' ? str((input as Inp | undefined)?.taskId) : undefined
      const waitedCommand = waitedTaskId ? backgroundCommands.get(waitedTaskId) : undefined
      const labelInput = waitedCommand ? { ...(input as Inp), command: waitedCommand } : input

      // File path for the clickable filename <code> in the label. For load_skill
      // the path isn't in the input — the loaded skill's SKILL.md path comes
      // back in the output — so clicking the skill name opens its markdown.
      const filePath = currentFilePath()

      // New files open directly (no diff to show); edits/modifications open the
      // diff viewer.
      const newFile = isNewFile.value
      const isFileDiff =
        !newFile &&
        (name === 'edit_file' || name === 'write_file') &&
        filePath != null &&
        props.onFileDiff != null

      const diffStats = fileDiffStats(name, input, output)

      // Undo/redo: available for file modifications (not new files) when a
      // snapshot exists.
      const canRevert =
        !newFile &&
        (name === 'edit_file' || name === 'write_file') &&
        filePath != null &&
        props.fileDiff != null &&
        props.onFileRevert != null

      // Skip this call while it is still running.
      const canSkip = status === 'running' && props.onSkip != null

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

      // read_molecule_doc: clicking the row opens the package's README.md in
      // the editor (filePath is derived from the input's package name).
      const isDocOpen = name === 'read_molecule_doc' && filePath != null && props.onFileOpen != null

      // Only exec_command and web_fetch get the labeled IN / OUT pane treatment.
      const showInOut = name === 'exec_command' || name === 'web_fetch'
      const inContent = showInOut && input !== undefined ? renderIn(name, input) : null
      const outContent = showInOut && output !== undefined ? renderOut(t, name, output) : null

      const handleClick =
        (newFile || isDocOpen) && filePath && props.onFileOpen
          ? (): void => {
              props.onFileOpen!(filePath)
            }
          : isFileDiff
            ? (): void => {
                props.onFileDiff!(filePath!, props.fileDiff)
              }
            : hasDetails
              ? (): void => {
                  expanded.value = !expanded.value
                }
              : undefined

      // ── update_task_list: drawn once, pinned above the composer (PlanCard) —
      // not repeated in the transcript on every update.
      if (name === 'update_task_list') return null

      // ── spawn_agent: subagent card — explore report / judge verdict / build summary ──
      if (name === 'spawn_agent') {
        const inp = (input ?? {}) as Inp
        const kind = inp.type === 'judge' ? 'judge' : inp.type === 'build' ? 'build' : 'explore'
        const out = (output ?? {}) as {
          report?: unknown
          error?: unknown
          changedPaths?: unknown
          agentId?: unknown
          note?: unknown
        }
        // A background dispatch has no report yet — the strip above the composer
        // carries its live status, so the card says what it started, not nothing.
        const backgrounded = typeof out.agentId === 'string'
        const wrote = Array.isArray(out.changedPaths)
          ? out.changedPaths.filter((path): path is string => typeof path === 'string')
          : []
        const agentModel = typeof inp.model === 'string' ? inp.model : ''
        // A failed run carries `error` (one sentence for the person) and
        // `report` (instructions for the model). The card shows only the first;
        // a card recorded before `error` rode every failure path has only the
        // report, so a report that opens as a failure counts as one too.
        const rawReport = typeof out.report === 'string' ? out.report : ''
        const interrupted = isInterruptedByRestart(output)
        const errorText = interrupted
          ? interruptedByRestartLine(t)
          : subagentErrorLine(t, out.error, rawReport)
        const report = errorText ? '' : rawReport
        const verdict = kind === 'judge' ? parseJudgeVerdict(report) : null
        const borderClr = light ? '#d0d7de' : '#3d444d'
        const verdictTint = light ? 'rgba(63,185,80,0.08)' : 'rgba(63,185,80,0.12)'
        const failTint = light ? 'rgba(248,81,73,0.08)' : 'rgba(248,81,73,0.14)'
        const verdictColor = verdict?.verdict === 'PASS' ? '#3fb950' : '#f8554f'
        const bodyText = verdict ? verdict.rest : report
        const subagentDot = interrupted
          ? '#888888'
          : status === 'error' || errorText
            ? '#f04040'
            : status === 'done'
              ? '#3fb950'
              : status === 'running'
                ? '#e8a000'
                : '#888888'

        return h(
          'div',
          {
            class: rootClass.value,
            'data-mol-id': 'subagent-card',
            style: {
              marginBottom: '8px',
              marginTop: '8px',
              borderRadius: '8px',
              border: `1px solid ${borderClr}`,
              background: light ? '#f6f8fa' : 'rgba(255,255,255,0.04)',
              overflow: 'hidden',
            },
          },
          [
            h(
              'div',
              {
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderBottom: report || errorText ? `1px solid ${borderClr}` : 'none',
                },
              },
              [
                h('span', {
                  'aria-hidden': true,
                  style: {
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    flexShrink: 0,
                    background: subagentDot,
                  },
                }),
                h(
                  'span',
                  null,
                  kind === 'judge'
                    ? t('ide.chat.subagent.judge', undefined, {
                        defaultValue: 'Acceptance judge',
                      })
                    : kind === 'build'
                      ? t('ide.chat.subagent.build', undefined, { defaultValue: 'Build subagent' })
                      : t('ide.chat.subagent.explore', undefined, {
                          defaultValue: 'Research subagent',
                        }),
                ),
                agentModel
                  ? h('span', { style: { fontWeight: 400, opacity: 0.6 } }, agentModel)
                  : null,
                status === 'running' || backgrounded
                  ? h(
                      'span',
                      { style: { fontWeight: 400, opacity: 0.6 } },
                      backgrounded
                        ? t('ide.chat.subagent.inBackground', undefined, {
                            defaultValue: 'running in the background',
                          })
                        : t('ide.chat.subagent.working', undefined, { defaultValue: 'working…' }),
                    )
                  : null,
                wrote.length > 0
                  ? h(
                      'span',
                      { style: { fontWeight: 400, opacity: 0.6 } },
                      t(
                        'ide.chat.subagent.wroteFiles',
                        { count: wrote.length },
                        {
                          defaultValue: '{{count}} files changed',
                        },
                      ),
                    )
                  : null,
              ],
            ),
            errorText
              ? h(
                  'div',
                  {
                    style: {
                      padding: '8px 12px',
                      fontSize: '12px',
                      ...(interrupted ? { opacity: 0.7 } : { color: '#f8554f' }),
                      borderBottom: `1px solid ${borderClr}`,
                    },
                  },
                  errorText,
                )
              : null,
            verdict
              ? h(
                  'div',
                  {
                    'data-mol-id': 'subagent-verdict',
                    style: {
                      padding: '8px 12px',
                      background: verdict.verdict === 'PASS' ? verdictTint : failTint,
                      borderBottom: `1px solid ${borderClr}`,
                    },
                  },
                  [
                    h(
                      'div',
                      {
                        style: {
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '13px',
                          fontWeight: 700,
                          color: verdictColor,
                        },
                      },
                      [
                        verdict.verdict === 'PASS' ? '✓' : '✕',
                        verdict.verdict === 'PASS'
                          ? t('ide.chat.subagent.verdictPass', undefined, {
                              defaultValue: 'PASS',
                            })
                          : t('ide.chat.subagent.verdictFail', undefined, {
                              defaultValue: 'FAIL',
                            }),
                      ],
                    ),
                    verdict.issues.length > 0
                      ? h(
                          'ul',
                          {
                            style: {
                              margin: '6px 0 0',
                              paddingLeft: '18px',
                              fontSize: '12px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '2px',
                              opacity: 0.9,
                            },
                          },
                          verdict.issues.map((issue, i) => h('li', { key: i }, issue)),
                        )
                      : null,
                  ],
                )
              : null,
            bodyText
              ? h('div', { style: { padding: '8px 12px' } }, [
                  h(
                    'div',
                    {
                      style: {
                        fontSize: '12px',
                        whiteSpace: 'pre-wrap',
                        maxHeight: subagentExpanded.value ? undefined : '150px',
                        overflow: 'hidden',
                        opacity: 0.9,
                      },
                    },
                    bodyText,
                  ),
                  bodyText.length > 600
                    ? h(
                        'button',
                        {
                          type: 'button',
                          'data-mol-id': 'subagent-report-toggle',
                          'aria-expanded': subagentExpanded.value,
                          class: cm.cn(
                            cm.button({ variant: 'ghost', size: 'xs' }),
                            cm.touchTargetCompact,
                          ),
                          onClick: () => {
                            subagentExpanded.value = !subagentExpanded.value
                          },
                          style: { marginTop: '4px' },
                        },
                        subagentExpanded.value
                          ? t('ide.chat.subagent.hideReport', undefined, {
                              defaultValue: 'Show less',
                            })
                          : t('ide.chat.subagent.showReport', undefined, {
                              defaultValue: 'Show full report',
                            }),
                      )
                    : null,
                ])
              : null,
          ],
        )
      }

      // ── save_plan: clickable row that opens the plan file in the editor ──────
      if (name === 'save_plan') {
        const planOutput = (output ?? {}) as { path?: string }
        const planPath = planOutput.path ?? null

        // Render as a standard tool card row — click opens the plan file
        const planHandleClick =
          planPath && props.onFileOpen
            ? (): void => {
                props.onFileOpen!(planPath)
              }
            : undefined

        return h('div', { class: rootClass.value, style: { marginBottom: '4px' } }, [
          h(
            'button',
            {
              type: 'button',
              'data-mol-id': 'save-plan-row',
              onClick: planHandleClick,
              onMouseenter: () => {
                isHovered.value = true
              },
              onMouseleave: () => {
                isHovered.value = false
              },
              // mol-bespoke-button: a tool-call ROW — status dot, label, chevron —
              // that happens to open the plan file; a timeline list item, not a
              // CTA. Reset to inherit the row's ink and background.
              style: {
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
                ...(isCoarse.value ? { minHeight: '32px' } : {}),
                width: '100%',
              },
            },
            [
              h('span', { style: { flex: 1, minWidth: 0 } }, [
                h(
                  'span',
                  {
                    style: { fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' },
                  },
                  [
                    h(
                      'svg',
                      { width: 10, height: 10, viewBox: '0 0 10 10', style: { flexShrink: 0 } },
                      [
                        h('circle', { cx: 5, cy: 5, r: 3, fill: dotColor, opacity: '0.35' }),
                        h('circle', {
                          cx: 5,
                          cy: 5,
                          r: 3,
                          fill: 'none',
                          stroke: dotColor,
                          'stroke-width': 2,
                        }),
                      ],
                    ),
                    h(
                      'span',
                      {
                        style: {
                          flex: 1,
                          minWidth: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        },
                      },
                      // The row's own button already opens the plan, so the
                      // label carries no openable targets (plain code only).
                      labelSegments(t, name, input, null).text,
                    ),
                  ],
                ),
              ]),
              planHandleClick
                ? h(
                    'svg',
                    {
                      xmlns: 'http://www.w3.org/2000/svg',
                      viewBox: '0 0 16 16',
                      width: 14,
                      height: 14,
                      style: {
                        display: 'block',
                        flexShrink: 0,
                        marginTop: '3px',
                        transition: 'opacity 100ms',
                        opacity: isHovered.value ? 0.85 : 0.35,
                      },
                    },
                    [
                      h('polyline', {
                        points: '6,4 10,8 6,12',
                        fill: 'none',
                        stroke: 'currentColor',
                        'stroke-width': '1.5',
                        'stroke-linecap': 'round',
                        'stroke-linejoin': 'round',
                      }),
                    ],
                  )
                : null,
            ],
          ),
        ])
      }

      // ── ask_user: interactive option list instead of a normal tool card ──
      if (name === 'ask_user') {
        // NEVER render raw tool input. The schema is a request to a language
        // model, not a guarantee — weaker models send stranger shapes, and an
        // object reaching the renderer crashes the whole IDE.
        const askInput = normalizeAskUserInput(input)
        const askOutput = output as { status?: string } | string | undefined
        const serverAwaiting =
          typeof askOutput === 'object' && askOutput?.status === 'awaiting_response'
        const isResponded = typeof askOutput === 'string'
        const isAwaiting = serverAwaiting && localAnswer.value === null
        const selectedAnswer = isResponded ? (askOutput as string) : localAnswer.value

        // Don't render until the question has streamed in. `tool_use_start`
        // surfaces the card the instant the call begins — before its input
        // arrives — which would otherwise flash an empty question + option list.
        if (!askInput.question) return null

        const borderClr = light ? '#d0d7de' : '#3d444d'
        const labelChar = (i: number): string => String.fromCharCode(65 + i) // A, B, C, …
        const hasPreviews = askInput.options.some((option) => option.preview)
        const multi = askInput.multiSelect && askInput.options.length > 0
        // The plan-approval card renders its two decisions as prominent
        // design-system CTAs instead of letter-badged rows.
        const reviewCtas =
          !!askInput.planReview && !multi && askInput.options.length === 2 && !hasPreviews
        const answeredLabels =
          multi && typeof selectedAnswer === 'string'
            ? selectedAnswer
                .split('; ')
                .map((part) => part.trim())
                .filter(Boolean)
            : []
        const selectedSet = new Set([...multiPicks.value, ...answeredLabels])
        // Which option's preview the pane shows: the hovered/focused one, else
        // the picked one, else the first option that has a preview at all.
        const previewIdx = (() => {
          if (!hasPreviews) return null
          const candidate = hoveredIdx.value ?? expandedPreviewIdx.value
          if (candidate != null && askInput.options[candidate]?.preview) return candidate
          const pickedIdx = askInput.options.findIndex((option) => selectedSet.has(option.label))
          if (pickedIdx >= 0 && askInput.options[pickedIdx].preview) return pickedIdx
          return askInput.options.findIndex((option) => option.preview)
        })()
        const previewOption = previewIdx != null ? askInput.options[previewIdx] : undefined

        return h(
          'div',
          {
            class: rootClass.value,
            style: {
              marginBottom: '8px',
              marginTop: '8px',
              borderRadius: '8px',
              border: `1px solid ${borderClr}`,
              background: light ? '#f6f8fa' : 'rgba(255,255,255,0.04)',
              overflow: 'hidden',
            },
          },
          [
            // Question header — the plan-approval card gets the rich REVIEW
            // header; every other question renders as markdown.
            askInput.planReview
              ? h(
                  'div',
                  {
                    'data-mol-id': 'plan-review-card',
                    style: {
                      padding: '10px 12px 10px',
                      fontSize: '13px',
                      borderBottom: `1px solid ${borderClr}`,
                    },
                  },
                  [
                    h(
                      'div',
                      {
                        style: {
                          fontSize: '11px',
                          fontWeight: 600,
                          letterSpacing: '0.03em',
                          textTransform: 'uppercase',
                          opacity: 0.6,
                          marginBottom: '6px',
                        },
                      },
                      t('ide.chat.planReview.badge', undefined, {
                        defaultValue: 'Plan ready for review',
                      }),
                    ),
                    h(
                      'div',
                      { style: { fontSize: '14px', fontWeight: 600, marginBottom: '4px' } },
                      askInput.planReview.name ||
                        (askInput.planReview.path ? basename(askInput.planReview.path) : '') ||
                        t('ide.chat.planReview.fallbackTitle', undefined, {
                          defaultValue: 'Implementation plan',
                        }),
                    ),
                    h(
                      'div',
                      {
                        style: {
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          fontSize: '12px',
                          opacity: 0.75,
                          marginBottom: askInput.planReview.preview.length > 0 ? '8px' : 0,
                        },
                      },
                      [
                        h(
                          'span',
                          null,
                          t(
                            'ide.chat.planReview.steps',
                            { count: askInput.planReview.steps },
                            { defaultValue: '{{count}} steps' },
                          ),
                        ),
                        askInput.planReview.path && props.onFileOpen
                          ? h(
                              'button',
                              {
                                type: 'button',
                                'data-mol-id': 'plan-review-open',
                                class: cm.cn(
                                  cm.button({ variant: 'solid', color: 'primary', size: 'xs' }),
                                  cm.touchTargetCompact,
                                  cm.shrink0,
                                ),
                                onClick: () => props.onFileOpen!(askInput.planReview!.path!),
                              },
                              t('ide.chat.planReview.openPlan', undefined, {
                                defaultValue: 'Open plan',
                              }),
                            )
                          : null,
                      ],
                    ),
                    // The platform publishes on the plan's behalf when approved.
                    askInput.planReview.goesLive === true
                      ? h(
                          'div',
                          {
                            style: {
                              fontSize: '12px',
                              opacity: 0.75,
                              marginTop: askInput.planReview.preview.length > 0 ? 0 : '8px',
                              marginBottom: askInput.planReview.preview.length > 0 ? '8px' : 0,
                            },
                          },
                          t('ide.chat.planReview.goesLive', undefined, {
                            defaultValue:
                              'Goes live: the platform publishes the app and runs its test suite once, on the live app.',
                          }),
                        )
                      : null,
                    askInput.planReview.preview.length > 0
                      ? h(
                          'ul',
                          {
                            style: {
                              margin: 0,
                              paddingLeft: '18px',
                              fontSize: '12px',
                              opacity: 0.8,
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '2px',
                            },
                          },
                          askInput.planReview.preview.map((step, i) => h('li', { key: i }, step)),
                        )
                      : null,
                    askInput.planReview.steps > askInput.planReview.preview.length
                      ? h(
                          'div',
                          { style: { fontSize: '11px', opacity: 0.55, marginTop: '4px' } },
                          t(
                            'ide.chat.planReview.more',
                            {
                              count: askInput.planReview.steps - askInput.planReview.preview.length,
                            },
                            { defaultValue: '+ {{count}} more steps' },
                          ),
                        )
                      : null,
                  ],
                )
              : h(
                  'div',
                  {
                    style: {
                      padding: '4px 12px 10px',
                      fontSize: '13px',
                      borderBottom: `1px solid ${borderClr}`,
                    },
                  },
                  [
                    h(MarkdownContent, {
                      text: unescapeLiterals(askInput.question),
                      isStreaming: false,
                    }),
                    multi && isAwaiting
                      ? h(
                          'div',
                          {
                            style: {
                              fontSize: '11px',
                              fontStyle: 'italic',
                              opacity: 0.55,
                              marginTop: '4px',
                            },
                          },
                          t('ide.chat.askUserMultiHint', undefined, {
                            defaultValue: 'You can choose more than one.',
                          }),
                        )
                      : null,
                  ],
                ),

            // Options, and — when any option carries a preview artifact — a
            // side-by-side preview pane on wide screens.
            h('div', { style: { display: 'flex', alignItems: 'stretch' } }, [
              h(
                'div',
                {
                  style: {
                    flex: hasPreviews && !isNarrow.value ? '1 1 55%' : '1 1 100%',
                    minWidth: 0,
                    display: 'flex',
                    flexDirection: 'column',
                  },
                },
                [
                  reviewCtas
                    ? h(
                        'div',
                        {
                          style: {
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '8px',
                            padding: '10px 12px',
                          },
                        },
                        askInput.options.map((option, i) => {
                          const isPicked = selectedAnswer === option.label
                          return h(
                            'button',
                            {
                              key: i,
                              type: 'button',
                              'data-mol-id': `plan-review-cta-${i}`,
                              disabled: !isAwaiting || props.onAskUserResponse == null,
                              class: cm.cn(
                                cm.button(
                                  i === 0
                                    ? { variant: 'solid', color: 'primary', size: 'xs' }
                                    : { variant: 'solid', color: 'secondary', size: 'xs' },
                                ),
                                cm.touchTargetCompact,
                              ),
                              style: {
                                flex: isNarrow.value ? '1 1 100%' : '1 1 auto',
                                // The "you picked this" ring is the theme's
                                // success colour, not a literal green.
                                ...(isPicked
                                  ? {
                                      outline: '2px solid var(--mol-color-success, #16a34a)',
                                      outlineOffset: '1px',
                                    }
                                  : {}),
                              },
                              onClick: () => {
                                if (props.onAskUserResponse == null) return
                                localAnswer.value = option.label
                                props.onAskUserResponse(option.label)
                              },
                            },
                            isPicked ? `✓ ${option.label}` : option.label,
                          )
                        }),
                      )
                    : askInput.options.map((option, i) => {
                        const isSelected = selectedSet.has(option.label)
                        const isFaded = !isAwaiting && !isSelected
                        const isHover = isAwaiting && hoveredIdx.value === i
                        const isPreviewExpanded = expandedPreviewIdx.value === i

                        return h('div', { key: i }, [
                          h('div', { style: { display: 'flex', alignItems: 'stretch' } }, [
                            h(
                              'button',
                              {
                                type: 'button',
                                'data-mol-id': `ask-user-option-${i}`,
                                disabled: !isAwaiting || props.onAskUserResponse == null,
                                onClick: () => {
                                  // No handler = read-only (a project viewer):
                                  // answering is editor work.
                                  if (props.onAskUserResponse == null) return
                                  if (multi) {
                                    // Multi-select toggles a pick; a Confirm row
                                    // submits them.
                                    multiPicks.value = multiPicks.value.includes(option.label)
                                      ? multiPicks.value.filter((p) => p !== option.label)
                                      : [...multiPicks.value, option.label]
                                    return
                                  }
                                  localAnswer.value = option.label
                                  props.onAskUserResponse(option.label)
                                },
                                onFocus: () => {
                                  if (isAwaiting) hoveredIdx.value = i
                                },
                                onMouseenter: () => {
                                  if (isAwaiting) hoveredIdx.value = i
                                },
                                onMouseleave: () => {
                                  hoveredIdx.value = null
                                },
                                // mol-bespoke-button: an ask_user answer ROW —
                                // a lettered radio list. It is the list itself,
                                // not a row of CTAs.
                                style: {
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '10px',
                                  flex: 1,
                                  minWidth: 0,
                                  padding: option.description ? '7px 12px' : '8px 12px',
                                  // Touch: full 44px rows — these are the
                                  // PRIMARY discovery answers.
                                  ...(isCoarse.value ? { minHeight: '44px' } : {}),
                                  border: 'none',
                                  borderTop: i > 0 ? `1px solid ${borderClr}` : 'none',
                                  background: isSelected
                                    ? light
                                      ? '#dbeafe'
                                      : 'rgba(59,130,246,0.2)'
                                    : isHover
                                      ? light
                                        ? '#eaeef2'
                                        : 'rgba(255,255,255,0.06)'
                                      : 'transparent',
                                  color: 'inherit',
                                  cursor: isAwaiting ? 'pointer' : 'default',
                                  textAlign: 'left',
                                  fontSize: '13px',
                                  opacity: isFaded ? 0.4 : 1,
                                  transition: 'background 80ms, opacity 80ms',
                                },
                              },
                              [
                                // Letter badge (checkbox-style when multi-select).
                                h(
                                  'span',
                                  {
                                    style: {
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      width: '22px',
                                      height: '22px',
                                      borderRadius: multi ? '6px' : '5px',
                                      border: `1px solid ${
                                        isSelected ? (light ? '#93c5fd' : '#3b82f6') : borderClr
                                      }`,
                                      background: isSelected
                                        ? light
                                          ? '#3b82f6'
                                          : '#2563eb'
                                        : light
                                          ? '#fff'
                                          : 'rgba(255,255,255,0.08)',
                                      color: isSelected ? '#fff' : light ? '#57606a' : '#848d97',
                                      fontSize: '11px',
                                      fontWeight: 600,
                                      flexShrink: 0,
                                      fontFamily:
                                        '"SF Mono", Menlo, Consolas, "Courier New", monospace',
                                    },
                                  },
                                  multi && isSelected ? '✓' : labelChar(i),
                                ),

                                // Option label + optional one-line description
                                h('span', { style: { flex: 1, minWidth: 0 } }, [
                                  h('span', { style: { display: 'block' } }, option.label),
                                  option.description
                                    ? h(
                                        'span',
                                        {
                                          style: {
                                            display: 'block',
                                            fontSize: '11px',
                                            opacity: 0.65,
                                            marginTop: '1px',
                                          },
                                        },
                                        option.description,
                                      )
                                    : null,
                                ]),

                                // Checkmark for a picked single-select option
                                !multi && isSelected
                                  ? h(
                                      'svg',
                                      {
                                        xmlns: 'http://www.w3.org/2000/svg',
                                        viewBox: '0 0 16 16',
                                        width: 14,
                                        height: 14,
                                        fill: light ? '#2563eb' : '#60a5fa',
                                      },
                                      [
                                        h('path', {
                                          d: 'M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z',
                                        }),
                                      ],
                                    )
                                  : null,
                              ],
                            ),

                            // Narrow screens: expand this option's preview inline
                            // (a sibling button — interactive elements never nest).
                            hasPreviews && isNarrow.value && option.preview
                              ? h(
                                  'button',
                                  {
                                    type: 'button',
                                    'data-mol-id': `ask-user-option-preview-${i}`,
                                    'aria-label': t('ide.chat.askUserPreview', undefined, {
                                      defaultValue: 'Preview',
                                    }),
                                    disabled: !isAwaiting,
                                    onClick: () => {
                                      expandedPreviewIdx.value = isPreviewExpanded ? null : i
                                    },
                                    // mol-bespoke-button: icon-only › disclosure
                                    // chevron welded to the answer row's edge.
                                    style: {
                                      flexShrink: 0,
                                      width: '36px',
                                      border: 'none',
                                      borderTop: i > 0 ? `1px solid ${borderClr}` : 'none',
                                      borderLeft: `1px solid ${borderClr}`,
                                      background: isPreviewExpanded
                                        ? light
                                          ? '#eaeef2'
                                          : 'rgba(255,255,255,0.06)'
                                        : 'transparent',
                                      color: 'inherit',
                                      cursor: isAwaiting ? 'pointer' : 'default',
                                      fontSize: '14px',
                                      opacity: 0.7,
                                      transform: isPreviewExpanded ? 'rotate(90deg)' : 'none',
                                      transition: 'transform 80ms',
                                    },
                                  },
                                  '›',
                                )
                              : null,
                          ]),

                          // Inline preview (narrow screens only — wide screens
                          // use the side pane below).
                          hasPreviews && isNarrow.value && option.preview && isPreviewExpanded
                            ? h(
                                'div',
                                {
                                  style: {
                                    borderTop: `1px solid ${borderClr}`,
                                    background: light ? '#fff' : 'rgba(255,255,255,0.03)',
                                    padding: '8px 12px',
                                    maxHeight: '240px',
                                    overflowY: 'auto',
                                    fontSize: '12px',
                                  },
                                },
                                [h(MarkdownContent, { text: option.preview, isStreaming: false })],
                              )
                            : null,
                        ])
                      }),

                  // Multi-select confirm row — submits the picked labels as one
                  // '; '-joined answer string.
                  multi && isAwaiting && props.onAskUserResponse != null
                    ? h(
                        'div',
                        {
                          style: {
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: '8px',
                            alignItems: 'center',
                            padding: '8px 12px',
                            borderTop: `1px solid ${borderClr}`,
                          },
                        },
                        [
                          h(
                            'span',
                            { style: { fontSize: '11px', opacity: 0.6 } },
                            t('ide.chat.askUserSelectedCount', undefined, {
                              defaultValue: '{{count}} selected',
                              count: multiPicks.value.length,
                            }),
                          ),
                          h(
                            'button',
                            {
                              type: 'button',
                              'data-mol-id': 'ask-user-multiselect-confirm',
                              disabled: multiPicks.value.length === 0,
                              class: cm.cn(
                                cm.button({ variant: 'solid', color: 'primary', size: 'xs' }),
                                cm.touchTargetCompact,
                              ),
                              onClick: () => {
                                if (multiPicks.value.length === 0) return
                                localAnswer.value = multiPicks.value.join('; ')
                                props.onAskUserResponse!(multiPicks.value.join('; '))
                              },
                            },
                            t('ide.chat.askUserMultiConfirm', undefined, {
                              defaultValue: 'Confirm choice',
                            }),
                          ),
                        ],
                      )
                    : null,
                ],
              ),

              // Side-by-side preview pane (wide screens, rich options only).
              hasPreviews && !isNarrow.value
                ? h(
                    'div',
                    {
                      style: {
                        flex: '1 1 45%',
                        minWidth: 0,
                        borderLeft: `1px solid ${borderClr}`,
                        display: 'flex',
                        flexDirection: 'column',
                        background: light ? '#fff' : 'rgba(255,255,255,0.03)',
                      },
                    },
                    [
                      h(
                        'div',
                        {
                          style: {
                            padding: '6px 12px',
                            fontSize: '11px',
                            fontWeight: 600,
                            opacity: 0.6,
                            borderBottom: `1px solid ${borderClr}`,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          },
                        },
                        previewOption
                          ? previewOption.label
                          : t('ide.chat.askUserPreview', undefined, { defaultValue: 'Preview' }),
                      ),
                      h(
                        'div',
                        {
                          style: {
                            padding: '8px 12px',
                            maxHeight: '360px',
                            overflowY: 'auto',
                            fontSize: '12px',
                          },
                        },
                        previewOption?.preview
                          ? [
                              h(MarkdownContent, {
                                text: previewOption.preview,
                                isStreaming: false,
                              }),
                            ]
                          : [],
                      ),
                    ],
                  )
                : null,
            ]),

            // Free-text input. Shown by DEFAULT so the user is never stuck on
            // an open-ended question the model asked without setting
            // allowFreeText. Hidden only when the model explicitly opts out.
            isAwaiting && askInput.allowFreeText !== false && props.onAskUserResponse != null
              ? h(
                  'div',
                  {
                    style: {
                      display: 'flex',
                      gap: '4px',
                      padding: '8px 12px',
                      borderTop: `1px solid ${borderClr}`,
                    },
                  },
                  [
                    h('input', {
                      type: 'text',
                      value: freeText.value,
                      'onUpdate:modelValue': undefined,
                      onInput: (e: Event) => {
                        freeText.value = (e.target as HTMLInputElement).value
                      },
                      onKeydown: (e: KeyboardEvent) => {
                        if (e.key === 'Enter' && freeText.value.trim()) {
                          const answer = freeText.value.trim()
                          localAnswer.value = answer
                          props.onAskUserResponse?.(answer)
                          freeText.value = ''
                        }
                      },
                      placeholder:
                        askInput.options.length === 0
                          ? t('ide.chat.askUserPlaceholderEmpty', undefined, {
                              defaultValue: 'Type your answer…',
                            })
                          : t('ide.chat.askUserPlaceholder', undefined, {
                              defaultValue: 'Or type your own…',
                            }),
                      class: cm.touchTargetCompact,
                      // The field box IS the Send button's box: the design-system
                      // 26px height and 3px radius every card button carries.
                      style: {
                        flex: 1,
                        minWidth: 0,
                        height: '26px',
                        padding: '0 8px',
                        borderRadius: '3px',
                        border: `1px solid ${borderClr}`,
                        background: 'transparent',
                        color: 'inherit',
                        // Deliberate iOS-zoom guard: a focused input below 16px
                        // makes iOS Safari zoom the whole page.
                        fontSize: isNarrow.value || isCoarse.value ? '16px' : '13px',
                        outline: 'none',
                      },
                      onVnodeMounted: syncValueAttr,
                      onVnodeUpdated: syncValueAttr,
                    }),
                    h(
                      'button',
                      {
                        type: 'button',
                        'data-mol-id': 'ask-user-free-text-submit',
                        disabled: !freeText.value.trim(),
                        onClick: () => {
                          if (freeText.value.trim()) {
                            const answer = freeText.value.trim()
                            localAnswer.value = answer
                            props.onAskUserResponse?.(answer)
                            freeText.value = ''
                          }
                        },
                        // The same design-system CTA as this card's own Confirm
                        // choice button a few rows up.
                        class: cm.cn(
                          cm.button({ variant: 'solid', color: 'primary', size: 'xs' }),
                          cm.touchTargetCompact,
                          cm.shrink0,
                        ),
                      },
                      t('ide.chat.askUserSubmit', undefined, { defaultValue: 'Send' }),
                    ),
                  ],
                )
              : null,

            // Show free-text response if it wasn't one of the preset options
            selectedAnswer && !askInput.options.some((option) => option.label === selectedAnswer)
              ? h(
                  'div',
                  {
                    style: {
                      padding: '8px 12px',
                      borderTop: `1px solid ${borderClr}`,
                      fontSize: '12px',
                      fontStyle: 'italic',
                    },
                  },
                  selectedAnswer,
                )
              : null,

            // Optional hint text
            askInput.hint
              ? h(
                  'div',
                  {
                    style: {
                      padding: '8px 12px',
                      borderTop: `1px solid ${borderClr}`,
                      fontSize: '11px',
                      fontStyle: 'italic',
                      opacity: 0.5,
                    },
                  },
                  askInput.hint,
                )
              : null,
          ],
        )
      }

      // The label's openable file segments render as the row's SIBLING
      // controls (see the comment below the row): without `onFileOpen` they
      // stay plain text.
      const { text: labelText, files: labelFiles } = labelSegments(
        t,
        name,
        labelInput,
        filePath,
        props.onFileOpen,
      )

      return h('div', { class: rootClass.value, style: { marginBottom: '4px' } }, [
        // The row, its file open controls, its undo control and its Skip are
        // SIBLINGS: the row itself is a role="button" div (a real <button>
        // cannot have its text selected), and a control cannot sit inside a
        // button (axe `nested-interactive`) — the file names that open their
        // file and the undo control are siblings laid out on the same line.
        // Skip is an action the person clicks, so it gets to be a genuine
        // button.
        h('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 } }, [
          h(
            'div',
            {
              role: 'button',
              tabindex: handleClick ? 0 : undefined,
              onClick: handleClick
                ? () => {
                    // Dragging across the label to copy it ends in a click: that
                    // is a selection, not a request to expand or open the card.
                    if (window.getSelection()?.toString()) return
                    handleClick()
                  }
                : undefined,
              onKeydown: handleClick
                ? (e: KeyboardEvent) => {
                    if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault()
                      handleClick()
                    }
                  }
                : undefined,
              onDblclick:
                newFile && filePath && props.onFileDoubleClick
                  ? () => {
                      props.onFileDoubleClick!(filePath)
                    }
                  : undefined,
              onMouseenter: () => {
                isHovered.value = true
              },
              onMouseleave: () => {
                isHovered.value = false
              },
              // mol-bespoke-button: the tool-call ROW itself — one line of the
              // chat timeline, not a CTA. The actions that ride on it (Skip)
              // ARE design-system buttons.
              style: {
                display: 'flex',
                // Coarse: the undo icon's 32px touch box inflates the label row,
                // so top-alignment would leave the diff stats riding high —
                // center everything instead.
                alignItems: isCoarse.value ? 'center' : 'flex-start',
                gap: '6px',
                background: 'none',
                border: 'none',
                // The text must stay selectable (a button's own text is not).
                userSelect: 'text',
                cursor: handleClick ? 'pointer' : 'default',
                color: 'inherit',
                textAlign: 'left',
                padding: '2px 0',
                // Touch: ~20px rows are untappable — 32px is the dense-row floor.
                ...(isCoarse.value ? { minHeight: '32px' } : {}),
                width: '100%',
                // The row shares its line with the Skip button: without this it
                // keeps its intrinsic min-width and pushes the Skip off a 390px
                // screen instead of letting the label ellipsise.
                minWidth: 0,
              },
            },
            [
              // Label + undo icon + one-line summary
              h('span', { style: { flex: 1, minWidth: 0 } }, [
                h(
                  'span',
                  {
                    style: { fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' },
                  },
                  [
                    // Colored status dot — inside the flex row so it auto-centers.
                    h(
                      'svg',
                      { width: 10, height: 10, viewBox: '0 0 10 10', style: { flexShrink: 0 } },
                      [
                        h('circle', { cx: 5, cy: 5, r: 3, fill: dotColor, opacity: '0.35' }),
                        h('circle', {
                          cx: 5,
                          cy: 5,
                          r: 3,
                          fill: 'none',
                          stroke: dotColor,
                          'stroke-width': 2,
                        }),
                      ],
                    ),
                    h(
                      'span',
                      {
                        style: {
                          flex: 1,
                          minWidth: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        },
                      },
                      labelText,
                    ),
                    // One-line status ("Running…"/"Done"/error count), on the
                    // SAME row as the label and pushed to the right edge.
                    summary
                      ? h(
                          'span',
                          {
                            class: cm.cn(cm.textMuted, cm.textSize('xs')),
                            style: { flexShrink: 0, marginLeft: '8px', whiteSpace: 'nowrap' },
                          },
                          summary,
                        )
                      : null,
                  ],
                ),
              ]),

              // Line diff stats for file-changing tools
              diffStats
                ? h(
                    'span',
                    {
                      style: {
                        display: 'flex',
                        gap: '4px',
                        flexShrink: 0,
                        marginTop: isCoarse.value ? 0 : '2px',
                        fontSize: '11px',
                        fontFamily: '"SF Mono", Menlo, Consolas, "Courier New", monospace',
                        opacity: isHovered.value ? 1 : 0.6,
                        transition: 'opacity 100ms',
                      },
                    },
                    [
                      diffStats.added > 0
                        ? h(
                            'span',
                            {
                              style: {
                                color: isUndone.value
                                  ? light
                                    ? '#cf222e'
                                    : '#f47067'
                                  : light
                                    ? '#1a7f37'
                                    : '#57ab5a',
                                textDecoration: isUndone.value ? 'line-through' : undefined,
                              },
                            },
                            `+${diffStats.added}`,
                          )
                        : null,
                      diffStats.removed > 0
                        ? h(
                            'span',
                            {
                              style: {
                                color: isUndone.value
                                  ? light
                                    ? '#1a7f37'
                                    : '#57ab5a'
                                  : light
                                    ? '#cf222e'
                                    : '#f47067',
                                textDecoration: isUndone.value ? 'line-through' : undefined,
                              },
                            },
                            `-${diffStats.removed}`,
                          )
                        : null,
                    ],
                  )
                : null,

              // Expand / open chevron
              hasDetails || isFileDiff || isDocOpen || (newFile && filePath && props.onFileOpen)
                ? h(
                    'svg',
                    {
                      xmlns: 'http://www.w3.org/2000/svg',
                      viewBox: '0 0 16 16',
                      width: 14,
                      height: 14,
                      style: {
                        display: 'block',
                        flexShrink: 0,
                        marginTop: isCoarse.value ? 0 : '3px',
                        transform: expanded.value ? 'rotate(90deg)' : 'rotate(0deg)',
                        transition: 'transform 150ms, opacity 100ms',
                        opacity: isHovered.value ? 0.85 : 0.35,
                      },
                    },
                    [
                      h('polyline', {
                        points: '6,4 10,8 6,12',
                        fill: 'none',
                        stroke: 'currentColor',
                        'stroke-width': '1.5',
                        'stroke-linecap': 'round',
                        'stroke-linejoin': 'round',
                      }),
                    ],
                  )
                : null,
            ],
          ),
          ...labelFiles.map((target) =>
            fileOpenControl(t, target, props.onFileOpen!, props.onFileDoubleClick),
          ),
          canRevert && status !== 'running'
            ? h(
                'span',
                {
                  role: 'button',
                  tabindex: 0,
                  title: isUndone.value
                    ? t('ide.chat.redoChange', undefined, {
                        defaultValue: 'Re-apply this change',
                      })
                    : t('ide.chat.undoChange', undefined, {
                        defaultValue: 'Undo this change',
                      }),
                  onClick: handleRevert,
                  onKeydown: (e: KeyboardEvent) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      void handleRevert(e)
                    }
                  },
                  onMouseenter: (e: MouseEvent) => {
                    isUndoHovered.value = true
                    const el = e.currentTarget as HTMLElement
                    el.style.background = 'rgba(128,128,128,0.2)'
                    el.style.opacity = '1'
                  },
                  onMouseleave: (e: MouseEvent) => {
                    isUndoHovered.value = false
                    const el = e.currentTarget as HTMLElement
                    el.style.background = 'transparent'
                    el.style.opacity = ''
                  },
                  /* mol-bespoke-button: icon-only undo/redo affordance BESIDE
                     the row — it has to be a role="button" span because a real
                     button cannot nest in the row button, and it is
                     hover-revealed chrome (20px box, neutral scrim), not a CTA.
                     Its 32px coarse box is asserted by the mobile-touch tests. */
                  style: {
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    // Touch: hover can't reveal it, so it rests visible at 0.6
                    // and gets a 32px hit box (the floor for these dense
                    // inline rows).
                    width: isCoarse.value ? '32px' : '20px',
                    height: isCoarse.value ? '32px' : '20px',
                    borderRadius: '4px',
                    flexShrink: 0,
                    // Nudge up 1px: the 13px glyph sat slightly below the
                    // text's optical center of the compact 20px box (moot at
                    // 32px).
                    position: 'relative',
                    top: isCoarse.value ? 0 : '-1px',
                    cursor: isReverting.value ? 'wait' : 'pointer',
                    opacity: isReverting.value
                      ? 0.3
                      : isHovered.value || isCoarse.value || isUndoHovered.value
                        ? 0.6
                        : 0,
                    transition: 'opacity 100ms, background 100ms',
                  },
                },
                [
                  h(
                    'svg',
                    {
                      xmlns: 'http://www.w3.org/2000/svg',
                      viewBox: '0 0 16 16',
                      width: 13,
                      height: 13,
                      fill: 'currentColor',
                    },
                    [
                      h('path', {
                        d: isUndone.value
                          ? 'M14.78 6.28a.749.749 0 0 0 0-1.06l-3.5-3.5a.749.749 0 1 0-1.06 1.06L12.439 5H5.251l-.001.007L5.251 5a.8.8 0 0 0-.171.019A4.501 4.501 0 0 0 5.5 14h1.704a.75.75 0 0 0 0-1.5H5.5a3 3 0 1 1 0-6h6.939L10.22 8.72a.749.749 0 1 0 1.06 1.06l3.5-3.5Z'
                          : 'M1.22 6.28a.749.749 0 0 1 0-1.06l3.5-3.5a.749.749 0 1 1 1.06 1.06L3.561 5h7.188l.001.007L10.749 5c.058 0 .116.007.171.019A4.501 4.501 0 0 1 10.5 14H8.796a.75.75 0 0 1 0-1.5H10.5a3 3 0 1 0 0-6H3.561L5.78 8.72a.749.749 0 1 1-1.06 1.06l-3.5-3.5Z',
                      }),
                    ],
                  ),
                ],
              )
            : null,
          canSkip
            ? h(
                'button',
                {
                  type: 'button',
                  'data-mol-id': `tool-call-skip-${props.id}`,
                  onClick: () => {
                    void handleSkip()
                  },
                  disabled: skipRequested.value || props.skipDisabledReason != null,
                  title: props.skipDisabledReason ?? undefined,
                  class: cm.cn(
                    cm.button({ variant: 'solid', color: 'primary', size: 'xs' }),
                    cm.touchTargetCompact,
                    cm.shrink0,
                  ),
                },
                skipRequested.value
                  ? t('ide.chat.skippingToolCall', undefined, { defaultValue: 'Skipping…' })
                  : t('ide.chat.skipToolCall', undefined, { defaultValue: 'Skip' }),
              )
            : null,
        ]),

        // Expanded detail
        expanded.value && hasDetails
          ? h(
              'div',
              {
                class: cm.surfaceSecondary,
                style: {
                  marginLeft: '14px',
                  marginTop: '4px',
                  marginBottom: '4px',
                  borderRadius: '4px',
                  overflowX: 'auto',
                },
              },
              showInOut
                ? [
                    inContent
                      ? h('div', { style: { padding: '6px 10px' } }, [
                          h(
                            'div',
                            {
                              class: cm.textMuted,
                              style: {
                                fontSize: '9px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.6px',
                                marginBottom: '4px',
                                fontWeight: 600,
                              },
                            },
                            name === 'exec_command'
                              ? t('ide.toolCall.command', undefined, { defaultValue: 'Command' })
                              : t('ide.toolCall.request', undefined, { defaultValue: 'Request' }),
                          ),
                          inContent,
                        ])
                      : null,
                    outContent
                      ? h(
                          'div',
                          {
                            style: {
                              padding: '6px 10px',
                              borderTop: inContent ? '1px solid rgba(128,128,128,0.15)' : undefined,
                            },
                          },
                          [
                            h(
                              'div',
                              {
                                class: cm.textMuted,
                                style: {
                                  fontSize: '9px',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.6px',
                                  marginBottom: '4px',
                                  fontWeight: 600,
                                },
                              },
                              name === 'exec_command'
                                ? t('ide.toolCall.output', undefined, { defaultValue: 'Output' })
                                : t('ide.toolCall.response', undefined, {
                                    defaultValue: 'Response',
                                  }),
                            ),
                            outContent,
                          ],
                        )
                      : null,
                  ]
                : [
                    h('div', { style: { padding: '6px 10px' } }, [
                      // rename_file: show old → new path
                      name === 'rename_file'
                        ? h('pre', { style: PRE }, [
                            str(((input ?? {}) as Inp).old_path) ?? '',
                            ' → ',
                            str(((input ?? {}) as Inp).new_path) ?? '',
                          ])
                        : null,

                      // Listing / search tools: show output results
                      (name === 'list_files' || name === 'find_files' || name === 'search_files') &&
                      output !== undefined
                        ? renderOut(t, name, output)
                        : null,

                      // find_package: clickable package matches — each opens its README.md
                      name === 'find_package' && output !== undefined
                        ? packageResultRows(
                            t,
                            packageResults(output),
                            props.onFileOpen,
                            isCoarse.value,
                          )
                        : null,
                    ]),
                  ],
            )
          : null,
      ])
    }
  },
})
