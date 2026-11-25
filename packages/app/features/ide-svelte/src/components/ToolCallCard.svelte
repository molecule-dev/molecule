<!--
  ToolCallCard: the Svelte counterpart of `@molecule/app-ide-react`'s
  `ToolCallCard` (see that file for the design notes) — a compact,
  Claude Code-style row for one tool call: a colored status dot, a
  human-readable action label, and a one-line result summary; it expands on
  click to reveal formatted IN / OUT sections (diffs for file edits, terminal
  output for commands, the result rows of the listing, search and package
  tools). Same props (React names), same DOM for the same input, same
  callbacks.

  A call that is still RUNNING carries a **Skip** (when the host serves one):
  it drops that one tool call without ending the turn, and the result renders
  as **Skipped** with a gray dot — never as a success, never as a failure.

  Inline styles are written as plain CSS text and applied through the
  `styleText` action, which writes each declaration with
  `style.setProperty` — exactly how React's style objects reach the DOM.
  (A Svelte dynamic `style` string is re-parsed through
  `CSSStyleDeclaration.cssText`, which normalizes shorthand values
  differently from React: `background: none` can be dropped and
  `border: none` becomes `border: medium`.) Constant styles are module-level
  strings; only the values React computes per render are interpolated.

  All user-facing text goes through `t()`.
-->

<script module lang="ts">
  import type { ToolCallCardProps } from '@molecule/app-ide-panel-logic'
  import type { ToolOutput } from '@molecule/app-ide-panel-logic/panels'
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

  /** A tool call's input or output, read field by field. */
  type Inp = Record<string, unknown>

  /**
   * Normalize a model-authored string for display: models sometimes
   * double-escape tool arguments, so a literal "\n"/"\t"/"\r" (backslash +
   * letter) ends up in the text instead of a real control character. Convert
   * those back so markdown line breaks render correctly.
   *
   * @param s - The raw string.
   * @returns The string with literal escape sequences turned into real ones.
   */
  function unescapeLiterals(s: string): string {
    return s.replace(/\\r\\n|\\n|\\r/g, '\n').replace(/\\t/g, '\t')
  }

  /** The monospace type every code segment and log line renders in. */
  const MONO = '"SF Mono", Menlo, Consolas, "Courier New", monospace'

  /** The inline-code type React spreads into every code segment. */
  const CODE_STYLE = `font-family: ${MONO}; font-size: inherit`

  /** A plain (non-clickable) code segment. */
  const CODE_PLAIN_STYLE = `${CODE_STYLE}; opacity: 0.75`

  /**
   * A clickable code segment (the row's sibling): hover brightens it to full
   * opacity, and it never shrinks to make room for the row's label.
   */
  const CODE_LINK_STYLE = `${CODE_PLAIN_STYLE}; transition: opacity 100ms; flex-shrink: 0`

  /** The button reset inside a clickable code segment (inline text, not a CTA). */
  const CODE_BUTTON_STYLE =
    'background: transparent; border: none; padding: 0px; font: inherit; color: inherit; cursor: pointer'

  /** The monospace log type shared by the detail panes. */
  const PRE = `margin: 0px; white-space: pre; overflow-x: auto; font-family: ${MONO}; font-size: 11px; line-height: 1.5`

  /**
   * A shell command or its output is read whole: wrap it instead of scrolling
   * sideways.
   */
  const WRAP_PRE = `margin: 0px; white-space: pre-wrap; overflow-wrap: anywhere; overflow-x: visible; font-family: ${MONO}; font-size: 11px; line-height: 1.5`

  /** Wrapped output, capped tall output with a vertical scroll. */
  const OUTPUT_PRE = `${WRAP_PRE}; max-height: 320px; overflow-y: auto`

  /** One `find_package` match. */
  interface PackageResult {
    name: string
    label?: string
    category?: string
  }

  /**
   * Keeps a controlled input's `value` ATTRIBUTE in step with its property
   * (React's attribute semantics; Svelte's `value={…}` sets only the
   * property).
   *
   * @param node - The input.
   * @param value - The controlled value.
   * @returns An update hook for the later values.
   */
  function mirrorValue(node: HTMLInputElement, value: string): { update(next: string): void } {
    node.setAttribute('value', value)
    return {
      update(next: string): void {
        node.setAttribute('value', next)
      },
    }
  }

  /**
   * Extract the package matches from a find_package output. Prefers the
   * structured `results` array; falls back to parsing package names out of
   * the model-facing `packages` markdown (conversations recorded before
   * `results` existed).
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
      return out.results.filter(
        (result): result is PackageResult => typeof result?.name === 'string',
      )
    }
    if (typeof out.packages === 'string') {
      return [...out.packages.matchAll(/^### `([^`]+)`(?: — (.+))?$/gm)].map((match) => ({
        name: match[1],
        label: match[2],
      }))
    }
    return []
  }

  /**
   * The clickable target of one backtick segment in a tool label.
   *
   * @param entries - The label entries of a batch `read_file`, or null.
   * @param index - The segment index in the split label.
   * @param filePath - The card's primary file path.
   * @returns The path the segment opens, or null.
   */
  function labelTarget(
    entries: Array<{ name: string; path: string }> | null,
    index: number,
    filePath: string | null,
  ): string | null {
    return entries ? (entries[(index - 1) / 2]?.path ?? null) : filePath
  }

  /**
   * One openable file segment of a tool label: the name it renders as and the
   * path it opens (React's `LabelFileTarget`).
   */
  interface LabelFileTarget {
    name: string
    path: string
  }

  /**
   * One piece of the label text that stays IN the row: a plain run, or a
   * backtick segment that has no openable target (rendered as plain code).
   */
  interface LabelTextPart {
    /** Whether the part is a backtick code segment. */
    code: boolean
    /** The run's text. */
    value: string
  }

  /** Tools that expand to show details inline. */
  const EXPANDABLE = new Set([
    'exec_command',
    'web_fetch',
    'rename_file',
    'list_files',
    'find_files',
    'search_files',
    'find_package',
  ])

  /** One run of text in the edit-file preview. */
  interface EditPreviewSegment {
    /** Whether the run is unchanged text, a removed line, or an added line. */
    kind: 'text' | 'removed' | 'added'
    /** The run's text (newlines included where they separate lines). */
    value: string
  }

  /**
   * The edit-file preview as a flat run list: removed lines, added lines and
   * the newlines between them — React's own node list, so the pane renders one
   * span per coloured line and plain text between.
   *
   * @param input - The raw tool input payload.
   * @returns The runs, in render order.
   */
  function editPreviewSegments(input: unknown): EditPreviewSegment[] {
    const inp = (input ?? {}) as Inp
    const replacements = (Array.isArray(inp.replacements) ? inp.replacements : []).map((entry) => {
      const record = (entry ?? {}) as Inp
      return {
        old_string: str(record.old_string) ?? '',
        new_string: str(record.new_string) ?? '',
      }
    })
    const nodes: EditPreviewSegment[] = []
    replacements.forEach((replacement, index) => {
      if (index > 0) nodes.push({ kind: 'text', value: '\n\n' })
      replacement.old_string.split('\n').forEach((line, lineIndex) => {
        if (lineIndex > 0) nodes.push({ kind: 'text', value: '\n' })
        nodes.push({ kind: 'removed', value: `- ${line}` })
      })
      nodes.push({ kind: 'text', value: '\n' })
      replacement.new_string.split('\n').forEach((line, lineIndex) => {
        if (lineIndex > 0) nodes.push({ kind: 'text', value: '\n' })
        nodes.push({ kind: 'added', value: `+ ${line}` })
      })
    })
    return nodes
  }
</script>

<script lang="ts">
  import { getLogger } from '@molecule/app-logger'
  import { useThemeMode, useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import {
    getBackgroundTaskCommands,
    hasBackgroundTaskCommands,
  } from '../context/background-task-commands.js'
  import { useCoarsePointer, useNarrowViewport } from '../hooks/useViewport.js'
  import { styleText } from '../parts/inline-style.js'
  import MarkdownContent from '../parts/MarkdownContent.svelte'

  /** The card's logger (React's `getLogger('tool-call-card')`). */
  const logger = getLogger('tool-call-card')

  let {
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
  }: ToolCallCardProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()
  const themeMode = useThemeMode()
  const pointer = useCoarsePointer()
  const viewport = useNarrowViewport()

  const light = $derived($themeMode === 'light')
  const coarse = $derived($pointer)
  const narrow = $derived($viewport)

  // The background-task map the chat panel publishes (React's context
  // default is an empty map — a host that publishes nothing keeps it empty).
  const EMPTY_COMMANDS: ReadonlyMap<string, string> = new Map<string, string>()
  const backgroundCommands = hasBackgroundTaskCommands()
    ? getBackgroundTaskCommands()
    : EMPTY_COMMANDS

  let expanded = $state(false)
  let isHovered = $state(false)
  let isUndoneLocal = $state(false)
  let isReverting = $state(false)
  // The undo control is a SIBLING of the row, so the row's hover no longer
  // covers the last pixel of travel to it — its own hover keeps it revealed
  // (without this, leaving the row would hide it under the pointer).
  let isUndoHovered = $state(false)
  let skipRequested = $state(false)

  // The subagent card keeps its own disclosure, as React's branch does.
  let subagentExpanded = $state(false)

  // ask_user state (the question's in-progress answer and hovers).
  let localAnswer = $state<string | null>(null)
  let freeText = $state('')
  let hoveredIdx = $state<number | null>(null)
  let multiPicks = $state<string[]>([])
  let expandedPreviewIdx = $state<number | null>(null)

  const isUndone = $derived(isUndoneProp ?? isUndoneLocal)

  // The person skipped this call. It is neither a success nor a failure, and
  // the row has to say so — a green dot on a command that never ran is exactly
  // the kind of quiet lie the honesty rule exists to stop.
  const wasSkipped = $derived(isSkippedByUser(output))
  // A restart cut the call off: its effect is unknown, so it is shown like a
  // skip (gray, never green) with its own word and sentence.
  const wasInterrupted = $derived(isInterruptedByRestart(output))

  const hasError = $derived.by(() => {
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
      const statusCode = num(out.status)
      return statusCode != null && statusCode >= 400
    }
    return false
  })

  // gray → orange → green or red; a skipped call stays gray, because it did
  // not happen, and so does an interrupted one, because nobody knows if it did.
  const dotColor = $derived(
    status === 'pending' || wasSkipped || wasInterrupted
      ? '#888888'
      : status === 'running'
        ? '#e8a000'
        : hasError
          ? '#f04040'
          : '#3fb950',
  )

  const summary = $derived(toolSummary(t, name, output as ToolOutput, status))

  // A wait names the command it waits on, not just the task id it was handed.
  const waitedTaskId = $derived(
    name === 'wait_for_task' ? str((input as Inp | undefined)?.taskId) : undefined,
  )
  const waitedCommand = $derived(waitedTaskId ? backgroundCommands.get(waitedTaskId) : undefined)
  const labelInput = $derived(waitedCommand ? { ...(input as Inp), command: waitedCommand } : input)

  // File path for the clickable filename <code> in the label. For load_skill
  // the path isn't in the input — the loaded skill's SKILL.md path comes back
  // in the output ({ name, path, content }) — so clicking the skill name opens
  // its markdown.
  const filePath = $derived(
    name === 'load_skill'
      ? ((output as { path?: string } | null | undefined)?.path ?? null)
      : extractFilePath(name, input),
  )

  /**
   * Splits a tool label into the text that stays in the row and its openable
   * file segments (React's `labelSegments`).
   *
   * The backtick segments of a label are markup: the ones with a resolvable
   * target and an `onFileOpen` become the row's SIBLING open controls (a
   * control cannot sit inside the row's `role="button"` — axe
   * `nested-interactive`), so they are LEFT OUT of the text; the rest stay as
   * plain code runs inline.
   *
   * @param labelInputValue - The raw tool input the label spells out.
   * @param labelFilePath - The primary file path for openable segments, or null.
   * @returns The label parts (without the openable segments) and those segments.
   */
  function splitLabel(
    labelInputValue: unknown,
    labelFilePath: string | null,
  ): { parts: LabelTextPart[]; files: LabelFileTarget[] } {
    const text = toolLabel(t, name, labelInputValue)
    const parts = text.split(new RegExp('`([^`]+)`'))
    if (parts.length === 1) return { parts: [{ code: false, value: text }], files: [] }
    // A batch read names several files: each one opens ITS file, not the first.
    // The entries come from the same list `toolLabel` spelled the names from —
    // indexing the raw path list instead shifted every target after a nameless
    // path (`src/`), so the name rendered opened the wrong file.
    const readEntries = name === 'read_file' ? readFileLabelEntries(labelInputValue) : null
    const files: LabelFileTarget[] = []
    const openable: boolean[] = parts.map((_part, index) => {
      if (index % 2 === 0) return false
      const target = labelTarget(readEntries, index, labelFilePath)
      if (target && onFileOpen) {
        files.push({ name: parts[index], path: target })
        return true
      }
      return false
    })
    const textParts: LabelTextPart[] = []
    parts.forEach((part, index) => {
      if (index % 2 === 1) {
        if (!openable[index]) textParts.push({ code: true, value: part })
        return
      }
      // A separator between two segments that both moved out of the text (the
      // ", " between a batch read's names) would dangle between nothing.
      if (openable[index - 1] && openable[index + 1] && /^[\s,]*$/.test(part)) return
      textParts.push({ code: false, value: part })
    })
    return { parts: textParts, files }
  }

  /** The row's own label: its plain text, with the openable segments left out. */
  const label = $derived(splitLabel(labelInput, filePath))

  /** New files open directly (no diff to show); edits open the diff viewer. */
  const isNewFile = $derived(
    name === 'write_file' &&
      ((output as Inp | undefined)?.diff as { type?: string } | undefined)?.type === 'new',
  )

  const isFileDiff = $derived(
    !isNewFile &&
      (name === 'edit_file' || name === 'write_file') &&
      filePath != null &&
      onFileDiff != null,
  )

  /** The LCS diff numbers for a file-changing call (null when there are none). */
  const diffStats = $derived(fileDiffStats(name, input, output))

  /** Undo/redo: available for file modifications when a snapshot exists. */
  const canRevert = $derived(
    !isNewFile &&
      (name === 'edit_file' || name === 'write_file') &&
      filePath != null &&
      fileDiff != null &&
      onFileRevert != null,
  )

  /** Skip this call while it is still running. */
  const canSkip = $derived(status === 'running' && onSkip != null)

  /** Tools that expand to show details inline. */
  const hasDetails = $derived(EXPANDABLE.has(name) && (input !== undefined || output !== undefined))

  /** read_molecule_doc opens the package's README from the row itself. */
  const isDocOpen = $derived(name === 'read_molecule_doc' && filePath != null && onFileOpen != null)

  /** Only exec_command and web_fetch get the labeled IN / OUT pane treatment. */
  const showInOut = $derived(name === 'exec_command' || name === 'web_fetch')
  const hasInContent = $derived(showInOut && input !== undefined)
  const hasOutContent = $derived(showInOut && output !== undefined)

  /** What a click on the row does: open, diff, expand, or nothing. */
  const rowAction = $derived(
    (isNewFile || isDocOpen) && filePath && onFileOpen
      ? 'open'
      : isFileDiff
        ? 'diff'
        : hasDetails
          ? 'expand'
          : null,
  )

  const rowStyle = $derived(
    `display: flex; align-items: ${coarse ? 'center' : 'flex-start'}; gap: 6px; background: none; border: none; user-select: text; cursor: ${
      rowAction ? 'pointer' : 'default'
    }; color: inherit; text-align: left; padding: 2px 0; ${
      coarse ? 'min-height: 32px; ' : ''
    }width: 100%; min-width: 0`,
  )

  /**
   * Undo/redo a file change: writes the other side's content and reports the
   * new state to the host.
   *
   * @param event - The click or key event that asked for it.
   */
  async function handleRevert(event: Event): Promise<void> {
    event.stopPropagation()
    if (!canRevert || isReverting) return
    const content = isUndone ? fileDiff!.modified : fileDiff!.original
    isReverting = true
    try {
      await onFileRevert!(filePath!, content)
      const newUndone = !isUndone
      isUndoneLocal = newUndone
      onUndoToggle?.(id, newUndone)
    } catch (error) {
      // A host whose revert rejects must not leave an unhandled promise
      // rejection: the failure is logged and the card stays exactly as it
      // was (still undone or not, as before the click) (React's handleRevert).
      logger.warn('tool-call-card: reverting a file change failed', { error, path: filePath })
    } finally {
      isReverting = false
    }
  }

  /**
   * Skip this call while it is still running — the turn keeps going, the model
   * is told the command did not run. A host that answers `false` means the
   * call had already finished (the stale-button race), which is not an error:
   * the button simply returns to its resting state.
   */
  async function handleSkip(): Promise<void> {
    if (!onSkip || skipRequested || skipDisabledReason) return
    skipRequested = true
    try {
      const accepted = await onSkip(id)
      if (accepted === false) skipRequested = false
    } catch (_error) {
      // Deliberate noop: the host already logs whatever went wrong on its
      // side, and there is nothing for the PERSON to do here — the call is
      // still running, so the honest UI is the button back at rest.
      skipRequested = false
    }
  }

  /** Runs the row's click action (dragging to select text is not a click). */
  function handleRowClick(): void {
    if (window.getSelection()?.toString()) return
    if (rowAction === 'open') onFileOpen!(filePath!)
    else if (rowAction === 'diff') onFileDiff!(filePath!, fileDiff)
    else if (rowAction === 'expand') expanded = !expanded
  }

  /**
   * The row's keyboard activation (Enter/Space on the row itself).
   *
   * @param event - The key event.
   */
  function handleRowKeydown(event: KeyboardEvent): void {
    if (event.target !== event.currentTarget) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleRowClick()
    }
  }

  /**
   * Brightens a clickable code segment while the pointer is over it.
   *
   * @param event - The pointer event.
   */
  function brightenCode(event: MouseEvent): void {
    ;(event.currentTarget as HTMLElement).style.opacity = '1'
  }

  /**
   * Restores a clickable code segment's resting opacity.
   *
   * @param event - The pointer event.
   */
  function dimCode(event: MouseEvent): void {
    ;(event.currentTarget as HTMLElement).style.opacity = '0.75'
  }

  /**
   * Raises a clickable package row's opacity.
   *
   * @param event - The pointer event.
   * @param clickable - Whether the row opens docs at all.
   */
  function enterPackageRow(event: MouseEvent, clickable: boolean): void {
    if (clickable) (event.currentTarget as HTMLElement).style.opacity = '1'
  }

  /**
   * Restores a clickable package row's resting opacity.
   *
   * @param event - The pointer event.
   * @param clickable - Whether the row opens docs at all.
   */
  function leavePackageRow(event: MouseEvent, clickable: boolean): void {
    if (clickable) (event.currentTarget as HTMLElement).style.opacity = '0.8'
  }

  /**
   * Opens a package's README from its result row.
   *
   * @param event - The click.
   * @param docPath - The README path.
   */
  function openPackageDoc(event: MouseEvent, docPath: string): void {
    event.stopPropagation()
    onFileOpen?.(docPath)
  }

  /**
   * Opens a package's README from the keyboard (Enter/Space on its row).
   *
   * @param event - The key event.
   * @param docPath - The README path.
   */
  function openPackageDocKey(event: KeyboardEvent, docPath: string): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      event.stopPropagation()
      onFileOpen?.(docPath)
    }
  }

  /**
   * Highlights the undo mark, shows it at full strength and keeps it revealed
   * while the pointer is over it (the row's hover ended at the row's edge).
   *
   * @param event - The pointer event.
   */
  function enterUndo(event: MouseEvent): void {
    isUndoHovered = true
    const el = event.currentTarget as HTMLElement
    el.style.background = 'rgba(128,128,128,0.2)'
    el.style.opacity = '1'
  }

  /**
   * Restores the undo mark's resting scrim, opacity and reveal.
   *
   * @param event - The pointer event.
   */
  function leaveUndo(event: MouseEvent): void {
    isUndoHovered = false
    const el = event.currentTarget as HTMLElement
    el.style.background = 'transparent'
    el.style.opacity = ''
  }

  const undoOpacity = $derived(isReverting ? 0.3 : isHovered || coarse || isUndoHovered ? 0.6 : 0)
  const undoStyle = $derived(
    `display: inline-flex; align-items: center; justify-content: center; width: ${
      coarse ? 32 : 20
    }px; height: ${coarse ? 32 : 20}px; border-radius: 4px; flex-shrink: 0; position: relative; top: ${
      coarse ? 0 : '-1px'
    }; cursor: ${isReverting ? 'wait' : 'pointer'}; opacity: ${undoOpacity}; transition: opacity 100ms, background 100ms`,
  )

  const addColor = $derived(
    isUndone ? (light ? '#cf222e' : '#f47067') : light ? '#1a7f37' : '#57ab5a',
  )
  const removeColor = $derived(
    isUndone ? (light ? '#1a7f37' : '#57ab5a') : light ? '#cf222e' : '#f47067',
  )

  /** Whether the expand/open chevron is drawn on the row. */
  const hasChevron = $derived(
    hasDetails || isFileDiff || isDocOpen || (isNewFile && filePath != null && onFileOpen != null),
  )

  /** The subagent card's derived content (React's spawn_agent branch). */
  const subagent = $derived.by(() => {
    const inp = (input ?? {}) as Inp
    const out = (output ?? {}) as {
      report?: unknown
      error?: unknown
      changedPaths?: unknown
      agentId?: unknown
      note?: unknown
    }
    const kind: 'judge' | 'build' | 'explore' =
      inp.type === 'judge' ? 'judge' : inp.type === 'build' ? 'build' : 'explore'
    // A background dispatch has no report yet — the strip above the composer
    // carries its live status, so the card says what it started, not nothing.
    const backgrounded = typeof out.agentId === 'string'
    const wrote = Array.isArray(out.changedPaths)
      ? out.changedPaths.filter((path): path is string => typeof path === 'string')
      : []
    const agentModel = typeof inp.model === 'string' ? inp.model : ''
    // A failed run carries `error` (one sentence for the person) and `report`
    // (instructions for the model). The card shows only the first; a card
    // recorded before `error` rode every failure path has only the report, so
    // a report that opens as a failure counts as one too.
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
    const dot = interrupted
      ? '#888888'
      : status === 'error' || errorText
        ? '#f04040'
        : status === 'done'
          ? '#3fb950'
          : status === 'running'
            ? '#e8a000'
            : '#888888'
    return {
      kind,
      backgrounded,
      wrote,
      agentModel,
      interrupted,
      errorText,
      report,
      verdict,
      bodyText,
      borderClr,
      verdictTint,
      failTint,
      verdictColor,
      dot,
    }
  })

  /** The plan file a `save_plan` row opens. */
  const planPath = $derived(((output ?? {}) as { path?: string }).path ?? null)

  /** The normalized ask_user question, and its answered/awaiting state. */
  const askInput = $derived(normalizeAskUserInput(input))
  const askOutput = $derived(output as { status?: string } | string | undefined)
  const serverAwaiting = $derived(
    typeof askOutput === 'object' && askOutput?.status === 'awaiting_response',
  )
  const isResponded = $derived(typeof askOutput === 'string')
  const isAwaiting = $derived(serverAwaiting && localAnswer === null)
  const selectedAnswer = $derived(isResponded ? (askOutput as string) : localAnswer)
  const hasPreviews = $derived(askInput.options.some((option) => option.preview))
  const multi = $derived(askInput.multiSelect && askInput.options.length > 0)
  // The plan-approval card renders its two decisions as prominent
  // design-system CTAs instead of letter-badged rows.
  const reviewCtas = $derived(
    !!askInput.planReview && !multi && askInput.options.length === 2 && !hasPreviews,
  )
  const answeredLabels = $derived(
    multi && typeof selectedAnswer === 'string'
      ? selectedAnswer
          .split('; ')
          .map((part) => part.trim())
          .filter(Boolean)
      : [],
  )
  const selectedSet = $derived(new Set([...multiPicks, ...answeredLabels]))
  // Which option's preview the pane shows: the hovered/focused one, else the
  // picked one, else the first option that has a preview at all.
  const previewIdx = $derived.by(() => {
    if (!hasPreviews) return null
    const candidate = hoveredIdx ?? expandedPreviewIdx
    if (candidate != null && askInput.options[candidate]?.preview) return candidate
    const pickedIdx = askInput.options.findIndex((option) => selectedSet.has(option.label))
    if (pickedIdx >= 0 && askInput.options[pickedIdx].preview) return pickedIdx
    return askInput.options.findIndex((option) => option.preview)
  })
  const previewOption = $derived(previewIdx != null ? askInput.options[previewIdx] : undefined)
  const questionBorder = $derived(light ? '#d0d7de' : '#3d444d')

  /**
   * The letter badge beside an ask_user option.
   *
   * @param index - The option's position.
   * @returns A, B, C, …
   */
  function labelChar(index: number): string {
    return String.fromCharCode(65 + index)
  }

  /**
   * Picks (or toggles) an ask_user option.
   *
   * @param label - The option's label.
   */
  function pickOption(label: string): void {
    // No handler = read-only (a project viewer): answering is editor work.
    if (onAskUserResponse == null) return
    if (multi) {
      // Multi-select toggles a pick; a Confirm row submits them.
      multiPicks = multiPicks.includes(label)
        ? multiPicks.filter((pick) => pick !== label)
        : [...multiPicks, label]
      return
    }
    localAnswer = label
    onAskUserResponse(label)
  }

  /**
   * Sends a typed free-text answer (Enter in the field, or Send).
   *
   * @param answer - The trimmed answer.
   */
  function submitFreeText(answer: string): void {
    if (!answer) return
    localAnswer = answer
    onAskUserResponse?.(answer)
    freeText = ''
  }

  /** Confirms the picked labels as one '; '-joined answer string. */
  function confirmMulti(): void {
    if (multiPicks.length === 0) return
    const answer = multiPicks.join('; ')
    localAnswer = answer
    onAskUserResponse?.(answer)
  }

  /** The free-text field's placeholder. */
  const freeTextPlaceholder = $derived(
    askInput.options.length === 0
      ? t('ide.chat.askUserPlaceholderEmpty', undefined, {
          defaultValue: 'Type your answer…',
        })
      : t('ide.chat.askUserPlaceholder', undefined, { defaultValue: 'Or type your own…' }),
  )

  /** The ask_user answer row style. */
  const optionRowStyle = (index: number): string => {
    const selected = selectedSet.has(askInput.options[index].label)
    const faded = !isAwaiting && !selected
    const hover = isAwaiting && hoveredIdx === index
    const background = selected
      ? light
        ? '#dbeafe'
        : 'rgba(59,130,246,0.2)'
      : hover
        ? light
          ? '#eaeef2'
          : 'rgba(255,255,255,0.06)'
        : 'transparent'
    return `display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; padding: ${
      askInput.options[index].description ? '7px 12px' : '8px 12px'
    }; ${coarse ? 'min-height: 44px; ' : ''}border: none; border-top: ${
      index > 0 ? `1px solid ${questionBorder}` : 'none'
    }; background: ${background}; color: inherit; cursor: ${
      isAwaiting ? 'pointer' : 'default'
    }; text-align: left; font-size: 13px; opacity: ${faded ? 0.4 : 1}; transition: background 80ms, opacity 80ms`
  }
</script>

<!-- ── Label renderer: the text that stays IN the row — plain runs, and
     `backtick` segments that have no openable target as plain code spans (the
     openable ones render as the row's siblings, below). ───────────────────── -->
{#snippet labelParts(parts: LabelTextPart[])}
  {#each parts as part, index (index)}
    {#if part.code}<code use:styleText={CODE_PLAIN_STYLE}>{part.value}</code
      >{:else}{part.value}{/if}
  {/each}
{/snippet}

<!-- ── The open-control for one openable file segment — a sibling of the row,
     not a child of it (a control cannot sit inside the row's
     role="button"). `code` is a semantic element and cannot be a button, so
     the action lives on a native button inside it. ───────────────────────── -->
{#snippet fileOpenControl(target: LabelFileTarget)}
  <code use:styleText={CODE_LINK_STYLE} onmouseenter={brightenCode} onmouseleave={dimCode}>
    <button
      type="button"
      aria-label={t(
        'ide.chat.tool.openFile',
        { path: target.path },
        { defaultValue: 'Open {{path}}' },
      )}
      onclick={() => {
        onFileOpen?.(target.path)
      }}
      ondblclick={() => {
        onFileDoubleClick?.(target.path)
      }}
      use:styleText={CODE_BUTTON_STYLE}>{target.name}</button
    >
  </code>
{/snippet}

<!-- ── IN pane: what the call asked for. ─────────────────────────────────── -->
{#snippet inPane(toolName: string, toolInput: unknown)}
  {@const inp = (toolInput ?? {}) as Inp}
  {#if toolName === 'exec_command'}
    <pre use:styleText={WRAP_PRE}><span use:styleText={'opacity: 0.5'}>$ </span>{str(inp.command) ??
        ''}</pre>
  {:else if toolName === 'write_file'}
    <pre use:styleText={PRE}>{str(inp.path) ?? ''}</pre>
  {:else if toolName === 'edit_file'}
    <pre
      use:styleText={PRE}>{#each editPreviewSegments(toolInput) as segment, index (index)}{#if segment.kind === 'text'}{segment.value}{:else}<span
            use:styleText={segment.kind === 'removed'
              ? 'color: #f47067; font-family: inherit'
              : 'color: #57ab5a; font-family: inherit'}>{segment.value}</span
          >{/if}{/each}</pre>
  {:else if toolName === 'search_files'}
    <pre use:styleText={PRE}>{`/${str(inp.pattern) ?? ''}/`}{str(inp.path)
        ? ` in ${str(inp.path)}`
        : ''}{str(inp.include) ? ` (${str(inp.include)})` : ''}</pre>
  {:else if toolName === 'find_files'}
    <pre use:styleText={PRE}>{str(inp.pattern) ?? ''}{str(inp.path)
        ? ` in ${str(inp.path)}`
        : ''}</pre>
  {:else if toolName === 'read_file' || toolName === 'delete_file' || toolName === 'list_files' || toolName === 'create_directory'}
    <pre use:styleText={PRE}>{str(inp.path) ?? ''}</pre>
  {:else if toolName === 'rename_file'}
    <pre use:styleText={PRE}>{str(inp.old_path) ?? ''} → {str(inp.new_path) ?? ''}</pre>
  {:else if toolName === 'web_fetch'}
    <pre use:styleText={PRE}>{str(inp.method) ?? 'GET'} {str(inp.url) ?? ''}</pre>
  {:else}
    <pre use:styleText={PRE}>{JSON.stringify(toolInput, null, 2)}</pre>
  {/if}
{/snippet}

<!-- ── OUT pane: what came back. ─────────────────────────────────────────── -->
{#snippet outPane(toolName: string, toolOutput: unknown)}
  {@const out = (toolOutput ?? {}) as Inp}
  {#if isInterruptedByRestart(toolOutput)}
    <span use:styleText={'opacity: 0.7'}>{interruptedByRestartLine(t)}</span>
  {:else if typeof out === 'object' && out !== null && 'error' in out}
    <pre use:styleText={`${PRE}; color: #f47067`}>{str(out.error) ??
        JSON.stringify(out.error)}</pre>
  {:else if toolName === 'exec_command'}
    {@const stdout = (str(out.stdout) ?? '').trimEnd()}
    {@const stderr = (str(out.stderr) ?? '').trimEnd()}
    {@const exitCode = num(out.exitCode)}
    <div>
      {#if stdout}<pre use:styleText={OUTPUT_PRE}>{stdout}</pre>{/if}{#if stderr}<pre
          use:styleText={`${OUTPUT_PRE}; color: #f47067; margin-top: ${stdout ? '4px' : '0px'}`}>{stderr}</pre>{/if}{#if exitCode != null && exitCode !== 0}<div
          use:styleText={'margin-top: 4px; color: #f47067; font-size: 10px'}
        >
          {t('ide.toolCall.exitCode', { code: exitCode }, { defaultValue: 'exit code {{code}}' })}
        </div>{/if}{#if !stdout && !stderr}<span use:styleText={'opacity: 0.5'}
          >{t('ide.toolCall.noOutput', undefined, { defaultValue: '(no output)' })}</span
        >{/if}
    </div>
  {:else if toolName === 'write_file'}
    {@const diff = out.diff as
      { type: string; linesAdded: number; linesRemoved: number } | undefined}
    {#if !diff}
      <span use:styleText={'opacity: 0.6'}
        >{t('ide.toolCall.written', undefined, { defaultValue: 'Written' })}</span
      >
    {:else if diff.type === 'unchanged'}
      <span use:styleText={'opacity: 0.6'}
        >{t('ide.toolCall.statusUnchanged', undefined, { defaultValue: 'Unchanged' })}</span
      >
    {:else}
      <div use:styleText={`font-family: ${MONO}; font-size: 11px`}>
        {#if diff.type === 'new'}<div use:styleText={'color: #57ab5a'}>
            {t(
              'ide.toolCall.newFileLines',
              { count: diff.linesAdded },
              { defaultValue: 'new file, {{count}} lines' },
            )}
          </div>{/if}{#if diff.type === 'modified'}{#if diff.linesAdded > 0}<div
              use:styleText={'color: #57ab5a'}
            >
              {t(
                'ide.toolCall.linesAdded',
                { count: diff.linesAdded },
                { defaultValue: '+{{count}} lines' },
              )}
            </div>{/if}{#if diff.linesRemoved > 0}<div use:styleText={'color: #f47067'}>
              {t(
                'ide.toolCall.linesRemoved',
                { count: diff.linesRemoved },
                { defaultValue: '−{{count}} lines' },
              )}
            </div>{/if}{/if}
      </div>
    {/if}
  {:else if toolName === 'edit_file'}
    {@const appliedCount = num(out.replacementsApplied)}
    <span use:styleText={'opacity: 0.6; font-size: 11px'}
      >{appliedCount != null
        ? t(
            'ide.toolCall.changesApplied',
            { count: appliedCount },
            { defaultValue: '{{count}} changes applied' },
          )
        : t('ide.toolCall.applied', undefined, { defaultValue: 'Applied' })}</span
    >
  {:else if toolName === 'read_file'}
    {@const content = str(out.content)}
    {#if !content}
      <span use:styleText={'opacity: 0.5'}
        >{t('ide.toolCall.empty', undefined, { defaultValue: '(empty)' })}</span
      >
    {:else}
      <pre use:styleText={PRE}>{content.length > 3000
          ? content.slice(0, 3000) +
            '\n' +
            t('ide.toolCall.truncated', undefined, { defaultValue: '… (truncated)' })
          : content}</pre>
    {/if}
  {:else if toolName === 'list_files'}
    {@const entries = out.entries as Array<{ name: string; type: string }> | undefined}
    {#if !entries?.length}
      <span use:styleText={'opacity: 0.5'}
        >{t('ide.toolCall.empty', undefined, { defaultValue: '(empty)' })}</span
      >
    {:else}
      <div use:styleText={`font-family: ${MONO}; font-size: 11px; line-height: 1.6`}>
        {#each entries as entry, index (index)}<div use:styleText={'display: flex; gap: 6px'}>
            <span use:styleText={'opacity: 0.4; width: 10px; flex-shrink: 0'}
              >{entry.type === 'directory' ? '▶' : ''}</span
            ><span>{entry.name}{entry.type === 'directory' ? '/' : ''}</span>
          </div>{/each}
      </div>
    {/if}
  {:else if toolName === 'find_files'}
    {@const files = Array.isArray(out.files)
      ? out.files.map((file) => str(file)).filter((file): file is string => file !== undefined)
      : undefined}
    {#if !files?.length}
      <span use:styleText={'opacity: 0.5'}
        >{t('ide.toolCall.noFilesFound', undefined, { defaultValue: 'No files found' })}</span
      >
    {:else}
      <div use:styleText={`font-family: ${MONO}; font-size: 11px; line-height: 1.6`}>
        {#each files as foundFile, index (index)}<div>{foundFile}</div>{/each}
      </div>
    {/if}
  {:else if toolName === 'search_files'}
    {@const matches = Array.isArray(out.matches)
      ? out.matches.map((match) => {
          const record = (match ?? {}) as Inp
          return {
            file: str(record.file) ?? '',
            line: str(record.line) ?? '',
            content: str(record.content) ?? '',
          }
        })
      : undefined}
    {#if !matches?.length}
      <span use:styleText={'opacity: 0.5'}
        >{t('ide.toolCall.noMatches', undefined, { defaultValue: 'No matches' })}</span
      >
    {:else}
      <div use:styleText={`font-family: ${MONO}; font-size: 11px; line-height: 1.6`}>
        {#each matches.slice(0, 30) as match, index (index)}<div
            use:styleText={'display: flex; gap: 8px; margin-bottom: 2px'}
          >
            <span use:styleText={'opacity: 0.5; flex-shrink: 0; white-space: nowrap'}
              >{basename(match.file)}:{match.line}</span
            ><span use:styleText={'white-space: pre'}>{match.content.trim()}</span>
          </div>{/each}{#if matches.length > 30}<div
            use:styleText={'opacity: 0.5; margin-top: 4px'}
          >
            {t(
              'ide.toolCall.andMore',
              { count: matches.length - 30 },
              { defaultValue: '… and {{count}} more' },
            )}
          </div>{/if}
      </div>
    {/if}
  {:else if toolName === 'web_fetch'}
    {@const statusCode = num(out.status)}
    {@const body = str(out.body)}
    {@const ok = statusCode != null && statusCode >= 200 && statusCode < 300}
    <div>
      {#if statusCode != null}<div
          use:styleText={`color: ${ok ? '#57ab5a' : '#f47067'}; margin-bottom: ${body ? '4px' : '0px'}; font-size: 11px`}
        >
          HTTP {statusCode}
        </div>{/if}{#if body}<pre use:styleText={PRE}>{body.length > 2000
            ? body.slice(0, 2000) +
              '\n' +
              t('ide.toolCall.truncated', undefined, { defaultValue: '… (truncated)' })
            : body}</pre>{/if}
    </div>
  {:else}
    <pre use:styleText={PRE}>{JSON.stringify(toolOutput, null, 2)}</pre>
  {/if}
{/snippet}

<!-- ── find_package results: clickable rows that open each package's docs. ── -->
{#snippet packageRows(results: PackageResult[])}
  {#if results.length === 0}
    <span use:styleText={'opacity: 0.5'}
      >{t('ide.toolCall.noMatches', undefined, { defaultValue: 'No matches' })}</span
    >
  {:else}
    <div use:styleText={`font-family: ${MONO}; font-size: 11px; line-height: 1.7`}>
      {#each results as result, index (index)}
        {@const docPath = moleculeDocPath(result.name)}
        {@const clickable = docPath != null && onFileOpen != null}
        <!-- A clickable package row is a role="button" div (React's markup);
             the role is conditional, which the a11y check cannot see. -->
        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
        <div
          role={clickable ? 'button' : undefined}
          tabindex={clickable ? 0 : undefined}
          data-mol-id={`find-package-result-${index}`}
          title={clickable
            ? t('ide.toolCall.openPackageDoc', undefined, {
                defaultValue: 'Open package docs',
              })
            : undefined}
          onclick={clickable ? (event) => openPackageDoc(event, docPath as string) : undefined}
          onkeydown={clickable ? (event) => openPackageDocKey(event, docPath as string) : undefined}
          onmouseenter={(event) => enterPackageRow(event, clickable)}
          onmouseleave={(event) => leavePackageRow(event, clickable)}
          use:styleText={`display: flex; gap: 8px; align-items: ${
            coarse && clickable ? 'center' : 'baseline'
          }; ${coarse && clickable ? 'min-height: 32px; ' : ''}cursor: ${
            clickable ? 'pointer' : 'default'
          }; opacity: ${clickable ? 0.8 : 1}; transition: opacity 100ms`}
        >
          <span use:styleText={'white-space: nowrap'}>{result.name}</span>
          {#if result.label}<span
              use:styleText={'opacity: 0.55; overflow: hidden; text-overflow: ellipsis; white-space: nowrap'}
              >{result.label}</span
            >{/if}
        </div>
      {/each}
    </div>
  {/if}
{/snippet}

{#if name === 'update_task_list'}
  <!-- Drawn once, pinned above the composer (PlanCard) — not repeated in the
       transcript on every update. -->
{:else if name === 'spawn_agent'}
  <div
    class={className}
    data-mol-id="subagent-card"
    use:styleText={`margin-bottom: 8px; margin-top: 8px; border-radius: 8px; border: 1px solid ${
      subagent.borderClr
    }; background: ${light ? '#f6f8fa' : 'rgba(255,255,255,0.04)'}; overflow: hidden`}
  >
    <div
      use:styleText={`display: flex; align-items: center; gap: 8px; padding: 6px 12px; font-size: 12px; font-weight: 600; border-bottom: ${
        subagent.report || subagent.errorText ? `1px solid ${subagent.borderClr}` : 'none'
      }`}
    >
      <span
        aria-hidden="true"
        use:styleText={`width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; background: ${subagent.dot}`}
      ></span>
      <span
        >{subagent.kind === 'judge'
          ? t('ide.chat.subagent.judge', undefined, { defaultValue: 'Acceptance judge' })
          : subagent.kind === 'build'
            ? t('ide.chat.subagent.build', undefined, { defaultValue: 'Build subagent' })
            : t('ide.chat.subagent.explore', undefined, {
                defaultValue: 'Research subagent',
              })}</span
      >
      {#if subagent.agentModel}<span use:styleText={'font-weight: 400; opacity: 0.6'}
          >{subagent.agentModel}</span
        >{/if}
      {#if status === 'running' || subagent.backgrounded}<span
          use:styleText={'font-weight: 400; opacity: 0.6'}
          >{subagent.backgrounded
            ? t('ide.chat.subagent.inBackground', undefined, {
                defaultValue: 'running in the background',
              })
            : t('ide.chat.subagent.working', undefined, { defaultValue: 'working…' })}</span
        >{/if}
      {#if subagent.wrote.length > 0}<span use:styleText={'font-weight: 400; opacity: 0.6'}
          >{t(
            'ide.chat.subagent.wroteFiles',
            { count: subagent.wrote.length },
            { defaultValue: '{{count}} files changed' },
          )}</span
        >{/if}
    </div>

    {#if subagent.errorText}
      <div
        use:styleText={`padding: 8px 12px; font-size: 12px; ${
          subagent.interrupted ? 'opacity: 0.7' : 'color: #f8554f'
        }; border-bottom: 1px solid ${subagent.borderClr}`}
      >
        {subagent.errorText}
      </div>
    {/if}

    {#if subagent.verdict}
      <div
        data-mol-id="subagent-verdict"
        use:styleText={`padding: 8px 12px; background: ${
          subagent.verdict.verdict === 'PASS' ? subagent.verdictTint : subagent.failTint
        }; border-bottom: 1px solid ${subagent.borderClr}`}
      >
        <div
          use:styleText={`display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 700; color: ${subagent.verdictColor}`}
        >
          {subagent.verdict.verdict === 'PASS' ? '✓' : '✕'}{subagent.verdict.verdict === 'PASS'
            ? t('ide.chat.subagent.verdictPass', undefined, { defaultValue: 'PASS' })
            : t('ide.chat.subagent.verdictFail', undefined, { defaultValue: 'FAIL' })}
        </div>
        {#if subagent.verdict.issues.length > 0}
          <ul
            use:styleText={'margin: 6px 0 0; padding-left: 18px; font-size: 12px; display: flex; flex-direction: column; gap: 2px; opacity: 0.9'}
          >
            {#each subagent.verdict.issues as issue, index (index)}<li>{issue}</li>{/each}
          </ul>
        {/if}
      </div>
    {/if}

    {#if subagent.bodyText}
      <div use:styleText={'padding: 8px 12px'}>
        <div
          use:styleText={`font-size: 12px; white-space: pre-wrap; ${
            subagentExpanded ? '' : 'max-height: 150px; '
          }overflow: hidden; opacity: 0.9`}
        >
          {subagent.bodyText}
        </div>
        {#if subagent.bodyText.length > 600}
          <!-- A show/hide disclosure, so it is the `ghost` toggle every other
               card in the IDE uses for one. -->
          <button
            type="button"
            data-mol-id="subagent-report-toggle"
            aria-expanded={subagentExpanded}
            class={cm.cn(cm.button({ variant: 'ghost', size: 'xs' }), cm.touchTargetCompact)}
            onclick={() => (subagentExpanded = !subagentExpanded)}
            use:styleText={'margin-top: 4px'}
          >
            {subagentExpanded
              ? t('ide.chat.subagent.hideReport', undefined, { defaultValue: 'Show less' })
              : t('ide.chat.subagent.showReport', undefined, {
                  defaultValue: 'Show full report',
                })}
          </button>
        {/if}
      </div>
    {/if}
  </div>
{:else if name === 'save_plan'}
  <!-- A standard tool card row whose click opens the plan file. -->
  <div class={className} use:styleText={'margin-bottom: 4px'}>
    <button
      type="button"
      data-mol-id="save-plan-row"
      onclick={planPath && onFileOpen ? () => onFileOpen?.(planPath!) : undefined}
      onmouseenter={() => (isHovered = true)}
      onmouseleave={() => (isHovered = false)}
      use:styleText={`display: flex; align-items: flex-start; gap: 6px; background: none; border: none; cursor: ${
        planPath && onFileOpen ? 'pointer' : 'default'
      }; color: inherit; text-align: left; padding: 2px 0; ${
        coarse ? 'min-height: 32px; ' : ''
      }width: 100%`}
    >
      <span use:styleText={'flex: 1; min-width: 0'}>
        <span use:styleText={'font-size: 13px; display: flex; align-items: center; gap: 6px'}>
          <svg width="10" height="10" viewBox="0 0 10 10" use:styleText={'flex-shrink: 0'}>
            <circle cx="5" cy="5" r="3" fill={dotColor} opacity="0.35"></circle>
            <circle cx="5" cy="5" r="3" fill="none" stroke={dotColor} stroke-width="2"></circle>
          </svg>
          <span
            use:styleText={'flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap'}
          >
            <!-- The row button already opens the plan, so its label carries no
                 openable targets — plain code only. -->
            {@render labelParts(splitLabel(input, null).parts)}
          </span>
        </span>
      </span>
      {#if planPath && onFileOpen}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          width="14"
          height="14"
          use:styleText={`display: block; flex-shrink: 0; margin-top: 3px; transition: opacity 100ms; opacity: ${
            isHovered ? 0.85 : 0.35
          }`}
        >
          <polyline
            points="6,4 10,8 6,12"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          ></polyline>
        </svg>
      {/if}
    </button>
  </div>
{:else if name === 'ask_user'}
  {#if askInput.question}
    <div
      class={className}
      use:styleText={`margin-bottom: 8px; margin-top: 8px; border-radius: 8px; border: 1px solid ${questionBorder}; background: ${
        light ? '#f6f8fa' : 'rgba(255,255,255,0.04)'
      }; overflow: hidden`}
    >
      <!-- Question header — the plan-approval card gets the rich REVIEW
           header; every other question renders as markdown. -->
      {#if askInput.planReview}
        {@const planReview = askInput.planReview}
        {@const planReviewPath = planReview.path}
        <div
          data-mol-id="plan-review-card"
          use:styleText={`padding: 10px 12px 10px; font-size: 13px; border-bottom: 1px solid ${questionBorder}`}
        >
          <div
            use:styleText={'font-size: 11px; font-weight: 600; letter-spacing: 0.03em; text-transform: uppercase; opacity: 0.6; margin-bottom: 6px'}
          >
            {t('ide.chat.planReview.badge', undefined, {
              defaultValue: 'Plan ready for review',
            })}
          </div>
          <div use:styleText={'font-size: 14px; font-weight: 600; margin-bottom: 4px'}>
            {planReview.name ||
              (planReviewPath ? basename(planReviewPath) : '') ||
              t('ide.chat.planReview.fallbackTitle', undefined, {
                defaultValue: 'Implementation plan',
              })}
          </div>
          <div
            use:styleText={`display: flex; align-items: center; gap: 10px; font-size: 12px; opacity: 0.75; margin-bottom: ${
              planReview.preview.length > 0 ? '8px' : '0px'
            }`}
          >
            <span>
              {t(
                'ide.chat.planReview.steps',
                { count: planReview.steps },
                { defaultValue: '{{count}} steps' },
              )}
            </span>
            {#if planReviewPath && onFileOpen}
              <button
                type="button"
                data-mol-id="plan-review-open"
                class={cm.cn(
                  cm.button({ variant: 'solid', color: 'primary', size: 'xs' }),
                  cm.touchTargetCompact,
                  cm.shrink0,
                )}
                onclick={() => onFileOpen?.(planReviewPath)}
              >
                {t('ide.chat.planReview.openPlan', undefined, { defaultValue: 'Open plan' })}
              </button>
            {/if}
          </div>
          <!-- The platform publishes on the plan's behalf when approved. -->
          {#if planReview.goesLive === true}
            <div
              use:styleText={`font-size: 12px; opacity: 0.75; margin-top: ${
                planReview.preview.length > 0 ? '0px' : '8px'
              }; margin-bottom: ${planReview.preview.length > 0 ? '8px' : '0px'}`}
            >
              {t('ide.chat.planReview.goesLive', undefined, {
                defaultValue:
                  'Goes live: the platform publishes the app and runs its test suite once, on the live app.',
              })}
            </div>
          {/if}
          {#if planReview.preview.length > 0}
            <ul
              use:styleText={'margin: 0; padding-left: 18px; font-size: 12px; opacity: 0.8; display: flex; flex-direction: column; gap: 2px'}
            >
              {#each planReview.preview as step, index (index)}<li>{step}</li>{/each}
            </ul>
          {/if}
          {#if planReview.steps > planReview.preview.length}
            <div use:styleText={'font-size: 11px; opacity: 0.55; margin-top: 4px'}>
              {t(
                'ide.chat.planReview.more',
                { count: planReview.steps - planReview.preview.length },
                { defaultValue: '+ {{count}} more steps' },
              )}
            </div>
          {/if}
        </div>
      {:else}
        <div
          use:styleText={`padding: 4px 12px 10px; font-size: 13px; border-bottom: 1px solid ${questionBorder}`}
        >
          <MarkdownContent text={unescapeLiterals(askInput.question)} isStreaming={false} />
          {#if multi && isAwaiting}
            <div
              use:styleText={'font-size: 11px; font-style: italic; opacity: 0.55; margin-top: 4px'}
            >
              {t('ide.chat.askUserMultiHint', undefined, {
                defaultValue: 'You can choose more than one.',
              })}
            </div>
          {/if}
        </div>
      {/if}

      <!-- Options, and — when any option carries a preview artifact — a
           side-by-side preview pane on wide screens. -->
      <div use:styleText={'display: flex; align-items: stretch'}>
        <div
          use:styleText={`flex: ${
            hasPreviews && !narrow ? '1 1 55%' : '1 1 100%'
          }; min-width: 0; display: flex; flex-direction: column`}
        >
          {#if reviewCtas}
            <div use:styleText={'display: flex; flex-wrap: wrap; gap: 8px; padding: 10px 12px'}>
              {#each askInput.options as option, index (index)}
                {@const isPicked = selectedAnswer === option.label}
                <button
                  type="button"
                  data-mol-id={`plan-review-cta-${index}`}
                  disabled={!isAwaiting || onAskUserResponse == null}
                  class={cm.cn(
                    cm.button(
                      index === 0
                        ? { variant: 'solid', color: 'primary', size: 'xs' }
                        : { variant: 'solid', color: 'secondary', size: 'xs' },
                    ),
                    cm.touchTargetCompact,
                  )}
                  use:styleText={`flex: ${narrow ? '1 1 100%' : '1 1 auto'}${
                    isPicked
                      ? '; outline: 2px solid var(--mol-color-success, #16a34a); outline-offset: 1px'
                      : ''
                  }`}
                  onclick={() => pickOption(option.label)}
                >
                  {isPicked ? `✓ ${option.label}` : option.label}
                </button>
              {/each}
            </div>
          {:else}
            {#each askInput.options as option, index (index)}
              {@const isSelected = selectedSet.has(option.label)}
              {@const isPreviewExpanded = expandedPreviewIdx === index}
              <div>
                <div use:styleText={'display: flex; align-items: stretch'}>
                  <button
                    type="button"
                    data-mol-id={`ask-user-option-${index}`}
                    disabled={!isAwaiting || onAskUserResponse == null}
                    onclick={() => pickOption(option.label)}
                    onfocus={() => {
                      if (isAwaiting) hoveredIdx = index
                    }}
                    onmouseenter={() => {
                      if (isAwaiting) hoveredIdx = index
                    }}
                    onmouseleave={() => (hoveredIdx = null)}
                    use:styleText={optionRowStyle(index)}
                  >
                    <!-- Letter badge (checkbox-style when multi-select). -->
                    <span
                      use:styleText={`display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: ${
                        multi ? '6px' : '5px'
                      }; border: 1px solid ${
                        isSelected ? (light ? '#93c5fd' : '#3b82f6') : questionBorder
                      }; background: ${
                        isSelected
                          ? light
                            ? '#3b82f6'
                            : '#2563eb'
                          : light
                            ? '#fff'
                            : 'rgba(255,255,255,0.08)'
                      }; color: ${
                        isSelected ? '#fff' : light ? '#57606a' : '#848d97'
                      }; font-size: 11px; font-weight: 600; flex-shrink: 0; font-family: ${MONO}`}
                      >{multi && isSelected ? '✓' : labelChar(index)}</span
                    >

                    <!-- Option label + optional one-line description -->
                    <span use:styleText={'flex: 1; min-width: 0'}>
                      <span use:styleText={'display: block'}>{option.label}</span>
                      {#if option.description}<span
                          use:styleText={'display: block; font-size: 11px; opacity: 0.65; margin-top: 1px'}
                          >{option.description}</span
                        >{/if}
                    </span>

                    <!-- Checkmark for a picked single-select option -->
                    {#if !multi && isSelected}
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 16 16"
                        width="14"
                        height="14"
                        fill={light ? '#2563eb' : '#60a5fa'}
                      >
                        <path
                          d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"
                        ></path>
                      </svg>
                    {/if}
                  </button>

                  <!-- Narrow screens: expand this option's preview inline (a
                       sibling button — interactive elements never nest). -->
                  {#if hasPreviews && narrow && option.preview}
                    <button
                      type="button"
                      data-mol-id={`ask-user-option-preview-${index}`}
                      aria-label={t('ide.chat.askUserPreview', undefined, {
                        defaultValue: 'Preview',
                      })}
                      disabled={!isAwaiting}
                      onclick={() => (expandedPreviewIdx = isPreviewExpanded ? null : index)}
                      use:styleText={`flex-shrink: 0; width: 36px; border: none; border-top: ${
                        index > 0 ? `1px solid ${questionBorder}` : 'none'
                      }; border-left: 1px solid ${questionBorder}; background: ${
                        isPreviewExpanded
                          ? light
                            ? '#eaeef2'
                            : 'rgba(255,255,255,0.06)'
                          : 'transparent'
                      }; color: inherit; cursor: ${
                        isAwaiting ? 'pointer' : 'default'
                      }; font-size: 14px; opacity: 0.7; transform: ${
                        isPreviewExpanded ? 'rotate(90deg)' : 'none'
                      }; transition: transform 80ms`}
                    >
                      ›
                    </button>
                  {/if}
                </div>

                <!-- Inline preview (narrow screens only — wide screens use the
                     side pane below). -->
                {#if hasPreviews && narrow && option.preview && isPreviewExpanded}
                  <div
                    use:styleText={`border-top: 1px solid ${questionBorder}; background: ${
                      light ? '#fff' : 'rgba(255,255,255,0.03)'
                    }; padding: 8px 12px; max-height: 240px; overflow-y: auto; font-size: 12px`}
                  >
                    <MarkdownContent text={option.preview} isStreaming={false} />
                  </div>
                {/if}
              </div>
            {/each}
          {/if}

          <!-- Multi-select confirm row — submits the picked labels as one
               '; '-joined answer string. -->
          {#if multi && isAwaiting && onAskUserResponse != null}
            <div
              use:styleText={`display: flex; justify-content: flex-end; gap: 8px; align-items: center; padding: 8px 12px; border-top: 1px solid ${questionBorder}`}
            >
              <span use:styleText={'font-size: 11px; opacity: 0.6'}
                >{t('ide.chat.askUserSelectedCount', undefined, {
                  defaultValue: '{{count}} selected',
                  count: multiPicks.length,
                })}</span
              >
              <button
                type="button"
                data-mol-id="ask-user-multiselect-confirm"
                disabled={multiPicks.length === 0}
                class={cm.cn(
                  cm.button({ variant: 'solid', color: 'primary', size: 'xs' }),
                  cm.touchTargetCompact,
                )}
                onclick={confirmMulti}
              >
                {t('ide.chat.askUserMultiConfirm', undefined, {
                  defaultValue: 'Confirm choice',
                })}
              </button>
            </div>
          {/if}
        </div>

        <!-- Side-by-side preview pane (wide screens, rich options only). -->
        {#if hasPreviews && !narrow}
          <div
            use:styleText={`flex: 1 1 45%; min-width: 0; border-left: 1px solid ${questionBorder}; display: flex; flex-direction: column; background: ${
              light ? '#fff' : 'rgba(255,255,255,0.03)'
            }`}
          >
            <div
              use:styleText={`padding: 6px 12px; font-size: 11px; font-weight: 600; opacity: 0.6; border-bottom: 1px solid ${questionBorder}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis`}
            >
              {previewOption
                ? previewOption.label
                : t('ide.chat.askUserPreview', undefined, { defaultValue: 'Preview' })}
            </div>
            <div
              use:styleText={'padding: 8px 12px; max-height: 360px; overflow-y: auto; font-size: 12px'}
            >
              {#if previewOption?.preview}
                <MarkdownContent text={previewOption.preview} isStreaming={false} />
              {/if}
            </div>
          </div>
        {/if}
      </div>

      <!-- Free-text input. Shown by DEFAULT so the user is never stuck on an
           open-ended question the model asked without setting
           allowFreeText. Hidden only when the model explicitly opts out. -->
      {#if isAwaiting && askInput.allowFreeText !== false && onAskUserResponse != null}
        <div
          use:styleText={`display: flex; gap: 4px; padding: 8px 12px; border-top: 1px solid ${questionBorder}`}
        >
          <input
            type="text"
            value={freeText}
            use:mirrorValue={freeText}
            oninput={(event) => (freeText = event.currentTarget.value)}
            onkeydown={(event) => {
              if (event.key === 'Enter' && freeText.trim()) submitFreeText(freeText.trim())
            }}
            placeholder={freeTextPlaceholder}
            class={cm.touchTargetCompact}
            use:styleText={`flex: 1; min-width: 0; height: 26px; padding: 0 8px; border-radius: 3px; border: 1px solid ${questionBorder}; background: transparent; color: inherit; font-size: ${
              narrow || coarse ? '16px' : '13px'
            }; outline: none`}
          />
          <button
            type="button"
            data-mol-id="ask-user-free-text-submit"
            disabled={!freeText.trim()}
            onclick={() => submitFreeText(freeText.trim())}
            class={cm.cn(
              cm.button({ variant: 'solid', color: 'primary', size: 'xs' }),
              cm.touchTargetCompact,
              cm.shrink0,
            )}
          >
            {t('ide.chat.askUserSubmit', undefined, { defaultValue: 'Send' })}
          </button>
        </div>
      {/if}

      <!-- Show free-text response if it wasn't one of the preset options -->
      {#if selectedAnswer && !askInput.options.some((option) => option.label === selectedAnswer)}
        <div
          use:styleText={`padding: 8px 12px; border-top: 1px solid ${questionBorder}; font-size: 12px; font-style: italic`}
        >
          {selectedAnswer}
        </div>
      {/if}

      <!-- Optional hint text -->
      {#if askInput.hint}
        <div
          use:styleText={`padding: 8px 12px; border-top: 1px solid ${questionBorder}; font-size: 11px; font-style: italic; opacity: 0.5`}
        >
          {askInput.hint}
        </div>
      {/if}
    </div>
  {/if}
{:else}
  <div class={className} use:styleText={'margin-bottom: 4px'}>
    <!-- The row, its file open controls, its undo control and its Skip are
         SIBLINGS: the row itself is a role="button" div (a real <button>
         cannot have its text selected), and a control cannot sit inside a
         button (axe `nested-interactive`) — the file names that open their
         file and the undo control are siblings laid out on the same line. Skip
         is an action the person clicks, so it gets to be a genuine button. -->
    <div use:styleText={'display: flex; align-items: center; gap: 6px; min-width: 0'}>
      <div
        role="button"
        tabindex={rowAction ? 0 : undefined}
        onclick={rowAction ? handleRowClick : undefined}
        onkeydown={rowAction ? handleRowKeydown : undefined}
        ondblclick={isNewFile && filePath && onFileDoubleClick
          ? () => onFileDoubleClick?.(filePath)
          : undefined}
        onmouseenter={() => (isHovered = true)}
        onmouseleave={() => (isHovered = false)}
        use:styleText={rowStyle}
      >
        <!-- Label + undo icon + one-line summary -->
        <span use:styleText={'flex: 1; min-width: 0'}>
          <span use:styleText={'font-size: 13px; display: flex; align-items: center; gap: 6px'}>
            <!-- Colored status dot — inside the flex row so it auto-centers. -->
            <svg width="10" height="10" viewBox="0 0 10 10" use:styleText={'flex-shrink: 0'}>
              <circle cx="5" cy="5" r="3" fill={dotColor} opacity="0.35"></circle>
              <circle cx="5" cy="5" r="3" fill="none" stroke={dotColor} stroke-width="2"></circle>
            </svg>
            <span
              use:styleText={'flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap'}
            >
              {@render labelParts(label.parts)}
            </span>
            <!-- One-line status, on the SAME row as the label. -->
            {#if summary}
              <span
                class={cm.cn(cm.textMuted, cm.textSize('xs'))}
                use:styleText={'flex-shrink: 0; margin-left: 8px; white-space: nowrap'}
              >
                {summary}
              </span>
            {/if}
          </span>
        </span>

        <!-- Line diff stats for file-changing tools -->
        {#if diffStats}
          <span
            use:styleText={`display: flex; gap: 4px; flex-shrink: 0; margin-top: ${
              coarse ? '0px' : '2px'
            }; font-size: 11px; font-family: ${MONO}; opacity: ${
              isHovered ? 1 : 0.6
            }; transition: opacity 100ms`}
          >
            {#if diffStats.added > 0}
              <span
                use:styleText={`color: ${addColor}${
                  isUndone ? '; text-decoration: line-through' : ''
                }`}>+{diffStats.added}</span
              >
            {/if}
            {#if diffStats.removed > 0}
              <span
                use:styleText={`color: ${removeColor}${
                  isUndone ? '; text-decoration: line-through' : ''
                }`}>-{diffStats.removed}</span
              >
            {/if}
          </span>
        {/if}

        <!-- Expand / open chevron -->
        {#if hasChevron}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            width="14"
            height="14"
            use:styleText={`display: block; flex-shrink: 0; margin-top: ${
              coarse ? '0px' : '3px'
            }; transform: ${
              expanded ? 'rotate(90deg)' : 'rotate(0deg)'
            }; transition: transform 150ms, opacity 100ms; opacity: ${isHovered ? 0.85 : 0.35}`}
          >
            <polyline
              points="6,4 10,8 6,12"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            ></polyline>
          </svg>
        {/if}
      </div>
      {#each label.files as target (target.path)}
        {@render fileOpenControl(target)}
      {/each}
      {#if canRevert && status !== 'running'}
        <!-- The undo/redo control — a sibling laid out on the row's line: a
             role="button" span (a real button cannot nest in the row button's
             line semantics), hover-revealed chrome (20px box, neutral scrim),
             not a CTA. Its 32px coarse box is asserted by the mobile-touch
             tests. -->
        <span
          role="button"
          tabindex="0"
          title={isUndone
            ? t('ide.chat.redoChange', undefined, {
                defaultValue: 'Re-apply this change',
              })
            : t('ide.chat.undoChange', undefined, { defaultValue: 'Undo this change' })}
          onclick={handleRevert}
          onkeydown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              void handleRevert(event)
            }
          }}
          onmouseenter={enterUndo}
          onmouseleave={leaveUndo}
          use:styleText={undoStyle}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            width="13"
            height="13"
            fill="currentColor"
          >
            {#if isUndone}
              <path
                d="M14.78 6.28a.749.749 0 0 0 0-1.06l-3.5-3.5a.749.749 0 1 0-1.06 1.06L12.439 5H5.251l-.001.007L5.251 5a.8.8 0 0 0-.171.019A4.501 4.501 0 0 0 5.5 14h1.704a.75.75 0 0 0 0-1.5H5.5a3 3 0 1 1 0-6h6.939L10.22 8.72a.749.749 0 1 0 1.06 1.06l3.5-3.5Z"
              ></path>
            {:else}
              <path
                d="M1.22 6.28a.749.749 0 0 1 0-1.06l3.5-3.5a.749.749 0 1 1 1.06 1.06L3.561 5h7.188l.001.007L10.749 5c.058 0 .116.007.171.019A4.501 4.501 0 0 1 10.5 14H8.796a.75.75 0 0 1 0-1.5H10.5a3 3 0 1 0 0-6H3.561L5.78 8.72a.749.749 0 1 1-1.06 1.06l-3.5-3.5Z"
              ></path>
            {/if}
          </svg>
        </span>
      {/if}
      {#if canSkip}
        <button
          type="button"
          data-mol-id={`tool-call-skip-${id}`}
          onclick={() => void handleSkip()}
          disabled={skipRequested || skipDisabledReason != null}
          title={skipDisabledReason ?? undefined}
          class={cm.cn(
            cm.button({ variant: 'solid', color: 'primary', size: 'xs' }),
            cm.touchTargetCompact,
            cm.shrink0,
          )}
        >
          {skipRequested
            ? t('ide.chat.skippingToolCall', undefined, { defaultValue: 'Skipping…' })
            : t('ide.chat.skipToolCall', undefined, { defaultValue: 'Skip' })}
        </button>
      {/if}
    </div>

    <!-- Expanded detail -->
    {#if expanded && hasDetails}
      <div
        class={cm.surfaceSecondary}
        use:styleText={'margin-left: 14px; margin-top: 4px; margin-bottom: 4px; border-radius: 4px; overflow-x: auto'}
      >
        {#if showInOut}
          {#if hasInContent}
            <div use:styleText={'padding: 6px 10px'}>
              <div
                class={cm.textMuted}
                use:styleText={'font-size: 9px; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 4px; font-weight: 600'}
              >
                {name === 'exec_command'
                  ? t('ide.toolCall.command', undefined, { defaultValue: 'Command' })
                  : t('ide.toolCall.request', undefined, { defaultValue: 'Request' })}
              </div>
              {@render inPane(name, input)}
            </div>
          {/if}
          {#if hasOutContent}
            <div
              use:styleText={`padding: 6px 10px; border-top: ${
                hasInContent ? '1px solid rgba(128,128,128,0.15)' : 'none'
              }`}
            >
              <div
                class={cm.textMuted}
                use:styleText={'font-size: 9px; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 4px; font-weight: 600'}
              >
                {name === 'exec_command'
                  ? t('ide.toolCall.output', undefined, { defaultValue: 'Output' })
                  : t('ide.toolCall.response', undefined, { defaultValue: 'Response' })}
              </div>
              {@render outPane(name, output)}
            </div>
          {/if}
        {:else}
          <div use:styleText={'padding: 6px 10px'}>
            <!-- rename_file: show old → new path -->
            {#if name === 'rename_file'}
              <pre use:styleText={PRE}>{str(((input ?? {}) as Inp).old_path) ?? ''} → {str(
                  ((input ?? {}) as Inp).new_path,
                ) ?? ''}</pre>
            {/if}

            <!-- Listing / search tools: show output results -->
            {#if (name === 'list_files' || name === 'find_files' || name === 'search_files') && output !== undefined}
              {@render outPane(name, output)}
            {/if}

            <!-- find_package: clickable package matches — each opens its README.md -->
            {#if name === 'find_package' && output !== undefined}
              {@render packageRows(packageResults(output))}
            {/if}
          </div>
        {/if}
      </div>
    {/if}
  </div>
{/if}
