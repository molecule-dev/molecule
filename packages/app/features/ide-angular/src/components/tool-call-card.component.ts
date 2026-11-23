/**
 * Tool call display row — compact, Claude Code-style.
 *
 * Angular counterpart of `@molecule/app-ide-react`'s `ToolCallCard` (see that
 * file for the design notes): the same inputs (React prop names), the same DOM
 * for the same input, the same callbacks. Shows a colored status dot, a
 * human-readable action label, and a one-line result summary; expands on click
 * to reveal formatted IN / OUT sections: diffs for file edits, terminal output
 * for commands, and the result rows of the listing, search and package tools.
 *
 * A call that is still RUNNING carries a **Skip** (when the host serves one):
 * it drops that one tool call without ending the turn, and the result renders
 * as **Skipped** with a gray dot — never as a success, never as a failure.
 *
 * React's root is a `div` whose class and style differ per card shape (the
 * compact row, the subagent card, the question card) and which is ABSENT for a
 * call that draws nothing (`update_task_list`, a question not yet streamed in).
 * The component's host is that element: the attribute selector makes the host
 * React's root div, and `useHostPresence` takes the host out of the DOM for the
 * call that renders nothing, so no stray element reaches the tree.
 *
 * Styling uses `getClassMap()` (`cm.*`); inline styles are the ones React
 * writes, serialized so the rendered attributes are identical (React's
 * CSSOM-parsed shorthand expansions, `border: medium` for its `border: 'none'`,
 * `flex: 1 1 0%` for its `flex: 1`, `rgb(...)` for its hex colors). All
 * user-facing text goes through `t()`.
 *
 * @module
 */

import { Component, computed, inject, signal } from '@angular/core'

import { useHostPresence, useThemeMode, useTranslation } from '@molecule/app-angular'
import type { ToolCallCardProps } from '@molecule/app-ide-panel-logic'
import {
  type AskUserInput,
  type AskUserOption,
  type AskUserPlanReview,
  basename,
  extractFilePath,
  fileDiffStats,
  interruptedByRestartLine,
  isInterruptedByRestart,
  isSkippedByUser,
  type JudgeVerdict,
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
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { styleText } from '@molecule/app-ui-angular'

import { BACKGROUND_TASK_COMMANDS } from '../context/background-task-commands.js'
import { useCoarsePointer, useNarrowViewport } from '../hooks/useViewport.js'
import { MarkdownContent } from '../parts/markdown-content.component.js'

/** The card's logger (React's `getLogger('tool-call-card')`). */
const logger = getLogger('tool-call-card')

/** A tool call's input or output, read field by field. */
type Inp = Record<string, unknown>

/** One piece of a label: plain text, or a `` `code` `` segment. */
interface LabelSegment {
  /** Whether this piece renders as a `<code>` element. */
  code: boolean
  /** The piece's text. */
  text: string
  /** The file a clickable code segment opens, or null. */
  target: string | null
}

/** One openable file segment of a tool label: the name it renders as and the path it opens. */
interface LabelFileTarget {
  /** The name the segment renders as. */
  name: string
  /** The file it opens. */
  path: string
}

/** One line of an `edit_file` input: a removed line, an added line, or a newline run. */
interface DetailLine {
  /** `del` (red), `add` (green) or `text` (bare newlines). */
  kind: 'del' | 'add' | 'text'
  /** The line's text (empty for `text` runs, whose text is its newlines). */
  text: string
}

/** The expanded IN pane's shape, one branch per tool family. */
type InView =
  | { kind: 'command'; command: string }
  | { kind: 'text'; text: string }
  | { kind: 'edit'; lines: DetailLine[] }

/** The expanded OUT pane's shape, one branch per tool family. */
type OutView =
  | { kind: 'interrupted'; text: string }
  | { kind: 'error'; text: string }
  | { kind: 'exec'; stdout: string; stderr: string; exitCode: number | null }
  | { kind: 'written'; text: string }
  | { kind: 'diff'; mode: 'new' | 'modified'; newCount: number; added: number; removed: number }
  | { kind: 'applied'; text: string }
  | { kind: 'empty'; text: string }
  | { kind: 'read'; text: string }
  | { kind: 'list'; entries: Array<{ name: string; directory: boolean }> }
  | { kind: 'files'; files: string[] }
  | { kind: 'search'; rows: Array<{ label: string; content: string }>; more: number | null }
  | { kind: 'fetch'; status: number | null; ok: boolean; body: string | null }
  | { kind: 'json'; text: string }

/** One `find_package` match. */
interface PackageResult {
  name: string
  label?: string
}

/** The monospace type every code segment and log line renders in. */
const MONO = '"SF Mono", Menlo, Consolas, "Courier New", monospace'

/** The monospace code type shared by the label's code segments. */
const CODE_STYLE: Record<string, unknown> = { fontFamily: MONO, fontSize: 'inherit' }

/** The monospace log type, shared by the result rows and the expanded pane. */
const PRE: Record<string, unknown> = {
  margin: 0,
  whiteSpace: 'pre',
  overflowX: 'auto',
  fontFamily: MONO,
  fontSize: '11px',
  lineHeight: 1.5,
}

/** A shell command or its output is read whole: wrap it instead of scrolling sideways. */
const WRAP_PRE: Record<string, unknown> = {
  ...PRE,
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
  overflowX: 'visible',
}

/** A command's output: wrapped, capped with a vertical scroll. */
const OUTPUT_PRE: Record<string, unknown> = {
  ...WRAP_PRE,
  maxHeight: '320px',
  overflowY: 'auto',
}

/** The "re-apply this change" glyph (an arrow curving right). */
const REDO_PATH =
  'M14.78 6.28a.749.749 0 0 0 0-1.06l-3.5-3.5a.749.749 0 1 0-1.06 1.06L12.439 5H5.251l-.001.007L5.251 5a.8.8 0 0 0-.171.019A4.501 4.501 0 0 0 5.5 14h1.704a.75.75 0 0 0 0-1.5H5.5a3 3 0 1 1 0-6h6.939L10.22 8.72a.749.749 0 1 0 1.06 1.06l3.5-3.5Z'

/** The "undo this change" glyph (an arrow curving left). */
const UNDO_PATH =
  'M1.22 6.28a.749.749 0 0 1 0-1.06l3.5-3.5a.749.749 0 1 1 1.06 1.06L3.561 5h7.188l.001.007L10.749 5c.058 0 .116.007.171.019A4.501 4.501 0 0 1 10.5 14H8.796a.75.75 0 0 1 0-1.5H10.5a3 3 0 1 0 0-6H3.561L5.78 8.72a.749.749 0 1 1-1.06 1.06l-3.5-3.5Z'

/** The checkmark a picked single-select answer carries. */
const CHECK_PATH =
  'M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z'

/** Theme colors in the serialized `rgb()` form React's style attribute carries. */
const COLOURS = {
  red: 'rgb(244, 112, 103)',
  green: 'rgb(87, 171, 90)',
  redStrong: 'rgb(248, 85, 79)',
  success: 'rgb(63, 185, 80)',
  error: 'rgb(240, 64, 64)',
  lightBorder: 'rgb(208, 215, 222)',
  darkBorder: 'rgb(61, 68, 77)',
  lightSurface: 'rgb(246, 248, 250)',
  lightSelected: 'rgb(219, 234, 254)',
  lightHover: 'rgb(234, 238, 242)',
  lightBadgeBorder: 'rgb(147, 197, 253)',
  lightBadge: 'rgb(59, 130, 246)',
  darkBadge: 'rgb(37, 99, 235)',
  white: 'rgb(255, 255, 255)',
  lightMuted: 'rgb(87, 96, 106)',
  darkMuted: 'rgb(132, 141, 151)',
  lightAdded: 'rgb(26, 127, 55)',
  lightRemoved: 'rgb(207, 34, 46)',
  gray: 'rgb(136, 136, 136)',
  orange: 'rgb(232, 160, 0)',
} as const

/**
 * Normalize a model-authored string for display: models sometimes double-escape
 * tool arguments, so a literal "\n"/"\t"/"\r" (backslash + letter) ends up in
 * the text instead of a real control character.
 *
 * @param value - The raw string.
 * @returns The string with literal escape sequences turned into real ones.
 */
function unescapeLiterals(value: string): string {
  return value.replace(/\\r\\n|\\n|\\r/g, '\n').replace(/\\t/g, '\t')
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
  const out = (output ?? {}) as { results?: PackageResult[]; packages?: string }
  if (Array.isArray(out.results)) {
    return out.results.filter((result): result is PackageResult => typeof result?.name === 'string')
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
 * The card's static inline-style texts, serialized once with `styleText`
 * (React's camelCase numbers become `px` exactly the way React writes them;
 * `border: medium` is the serialized form of React's `border: 'none'`, and
 * `flex: 1 1 0%` the serialized form of its `flex: 1`; the conformance
 * normalizer sorts declarations, so key order is free).
 */
const STYLES = {
  /** The row plus its Skip: one line of controls. */
  rowLine: styleText({ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }),
  /** The label column (flex child holding dot, label, summary, undo). */
  labelWrap: styleText({ flex: '1 1 0%', minWidth: 0 }),
  /** The label line: status dot + label + summary + undo. */
  labelLine: styleText({ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }),
  /** The status dot. */
  dotSvg: styleText({ flexShrink: 0 }),
  /** The label text, truncating rather than pushing the summary out. */
  labelText: styleText({
    flex: '1 1 0%',
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  }),
  /** The one-line result summary. */
  summary: styleText({ flexShrink: 0, marginLeft: '8px', whiteSpace: 'nowrap' }),
  /** A plain (non-clickable) code segment. */
  codePlain: styleText({ ...CODE_STYLE, opacity: 0.75 }),
  /** A clickable code segment (its opacity reacts to hover). */
  codeLink: styleText({ ...CODE_STYLE, opacity: 0.75, transition: 'opacity 100ms' }),
  /**
   * A file open control beside the row: it never shrinks away, and its opacity
   * reacts to hover.
   */
  fileOpenCode: styleText({
    ...CODE_STYLE,
    opacity: 0.75,
    transition: 'opacity 100ms',
    flexShrink: 0,
  }),
  /** The native button inside a code segment. */
  codeButton: styleText({
    background: 'transparent',
    border: 'medium',
    color: 'inherit',
    cursor: 'pointer',
    font: 'inherit',
    padding: '0px',
  }),
  /** The expanded detail box. */
  detail: styleText({
    marginLeft: '14px',
    marginTop: '4px',
    marginBottom: '4px',
    borderRadius: '4px',
    overflowX: 'auto',
  }),
  /** One section of the expanded detail. */
  detailBlock: styleText({ padding: '6px 10px' }),
  /** A detail section's IN/OUT heading. */
  detailLabel: styleText({
    fontSize: '9px',
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
    marginBottom: '4px',
    fontWeight: 600,
  }),
  /** The monospace log block. */
  pre: styleText(PRE),
  /** The wrapped command block. */
  wrapPre: styleText(WRAP_PRE),
  /** The capped command-output block. */
  outputPre: styleText(OUTPUT_PRE),
  /** The command block's `$ ` prompt. */
  prompt: styleText({ opacity: 0.5 }),
  /** An empty / no-match note. */
  faded: styleText({ opacity: 0.5 }),
  /** A written / unchanged note. */
  note: styleText({ opacity: 0.6 }),
  /** The result-row list of the listing tools. */
  resultRows: styleText({ fontFamily: MONO, fontSize: '11px', lineHeight: 1.6 }),
  /** The result-row list of find_package. */
  packageRows: styleText({ fontFamily: MONO, fontSize: '11px', lineHeight: 1.7 }),
  /** One listing entry's marker column. */
  entryMark: styleText({ opacity: 0.4, width: '10px', flexShrink: 0 }),
  /** One listing entry's line. */
  entryRow: styleText({ display: 'flex', gap: '6px' }),
  /** One search match's line. */
  matchRow: styleText({ display: 'flex', gap: '8px', marginBottom: '2px' }),
  /** A search match's file:line, pinned. */
  matchWhere: styleText({ opacity: 0.5, flexShrink: 0, whiteSpace: 'nowrap' }),
  /** A search match's snippet. */
  matchText: styleText({ whiteSpace: 'pre' }),
  /** The "+N more matches" line. */
  more: styleText({ opacity: 0.5, marginTop: '4px' }),
  /** A package match's name. */
  packageName: styleText({ whiteSpace: 'nowrap' }),
  /** A package match's label, truncating. */
  packageLabel: styleText({
    opacity: 0.55,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  }),
  /** The command's exit-code line. */
  exitCode: styleText({ marginTop: '4px', color: COLOURS.red, fontSize: '10px' }),
  /** The write_file diff summary block. */
  writeDiff: styleText({ fontFamily: MONO, fontSize: '11px' }),
  /** An added-lines row of a write_file result. */
  added: styleText({ color: COLOURS.green }),
  /** A removed-lines row of a write_file result. */
  removed: styleText({ color: COLOURS.red }),
  /** The applied-changes note. */
  applied: styleText({ opacity: 0.6, fontSize: '11px' }),
  /** An edit line's removal span. */
  editRemoved: styleText({ color: COLOURS.red, fontFamily: 'inherit' }),
  /** An edit line's addition span. */
  editAdded: styleText({ color: COLOURS.green, fontFamily: 'inherit' }),
  /** The interrupted result's sentence. */
  interrupted: styleText({ opacity: 0.7 }),
  /** A subagent card's meta span (model, status, file count). */
  subagentMeta: styleText({ fontWeight: 400, opacity: 0.6 }),
  /** The subagent report toggle's spacing. */
  subagentToggle: styleText({ marginTop: '4px' }),
  /** The subagent report list. */
  subagentIssues: styleText({
    margin: '6px 0px 0px',
    paddingLeft: '18px',
    fontSize: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    opacity: 0.9,
  }),
  /** The save_plan label column. */
  planLabel: styleText({ flex: '1 1 0%', minWidth: 0 }),
  /** The plan-review badge line. */
  planBadge: styleText({
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.03em',
    textTransform: 'uppercase',
    opacity: 0.6,
    marginBottom: '6px',
  }),
  /** The plan-review title. */
  planTitle: styleText({ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }),
  /** The plan-review preview list. */
  planPreview: styleText({
    margin: 0,
    paddingLeft: '18px',
    fontSize: '12px',
    opacity: 0.8,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  }),
  /** The plan-review "more steps" line. */
  planMore: styleText({ fontSize: '11px', opacity: 0.55, marginTop: '4px' }),
  /** The multi-select hint. */
  multiHint: styleText({ fontSize: '11px', fontStyle: 'italic', opacity: 0.55, marginTop: '4px' }),
  /** The options row (answer list left, preview pane right). */
  optionsRow: styleText({ display: 'flex', alignItems: 'stretch' }),
  /** One option's row (answer + narrow preview toggle). */
  optionLine: styleText({ display: 'flex', alignItems: 'stretch' }),
  /** An option's label column. */
  optionLabel: styleText({ flex: '1 1 0%', minWidth: 0 }),
  /** A block-level label span. */
  block: styleText({ display: 'block' }),
  /** An option's description line. */
  optionDescription: styleText({
    display: 'block',
    fontSize: '11px',
    opacity: 0.65,
    marginTop: '1px',
  }),
  /** The plan-review CTAs row. */
  ctaRow: styleText({ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '10px 12px' }),
  /** The multi-select confirm row. */
  multiConfirm: styleText({
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    alignItems: 'center',
    padding: '8px 12px',
  }),
  /** The multi-select picked count. */
  multiCount: styleText({ fontSize: '11px', opacity: 0.6 }),
  /** The preview pane's body. */
  previewBody: styleText({
    padding: '8px 12px',
    maxHeight: '360px',
    overflowY: 'auto',
    fontSize: '12px',
  }),
  /** The inline (narrow) preview box. */
  inlinePreview: styleText({
    background: 'transparent',
    padding: '8px 12px',
    maxHeight: '240px',
    overflowY: 'auto',
    fontSize: '12px',
  }),
  /** The subagent report's wrapper. */
  subagentBodyWrap: styleText({ padding: '8px 12px' }),
} as const

/**
 * Compact tool-call row with status dot, label, summary, and expandable detail
 * pane.
 */
@Component({
  selector: 'div[mol-tool-call-card]',
  standalone: true,
  imports: [MarkdownContent],
  inputs: [
    'id',
    'name',
    'input',
    'output',
    'status',
    'fileDiff',
    'isUndone',
    'onUndoToggle',
    'onFileOpen',
    'onFileDoubleClick',
    'onFileDiff',
    'onFileRevert',
    'onAskUserResponse',
    'onSkip',
    'skipDisabledReason',
    'className',
  ],
  host: {
    // `id` is the tool call's identifier, which React never renders; Angular would also keep a
    // static `id="…"` on the host as the element's id.
    '[attr.id]': 'null',
    '[attr.class]': 'rootClass()',
    '[attr.style]': 'rootStyle()',
    '[attr.data-mol-id]': "isSubagent() ? 'subagent-card' : null",
  },
  // prettier-ignore
  template: `@if (!rendersNothing()) {
    @if (isSubagent()) {
      <div [attr.style]="subagentHeaderStyle()">
        <span aria-hidden="true" [attr.style]="subagentDotStyle()"></span>
        <span>{{ subagentKindLabel() }}</span>
        @if (subagentModel()) {<span [attr.style]="s.subagentMeta">{{ subagentModel() }}</span>}
        @if (subagentWorkingText()) {<span [attr.style]="s.subagentMeta">{{ subagentWorkingText() }}</span>}
        @if (subagentWrote().length > 0) {<span [attr.style]="s.subagentMeta">{{ subagentWroteText() }}</span>}
      </div>
      @if (subagentErrorText()) {<div [attr.style]="subagentErrorStyle()">{{ subagentErrorText() }}</div>}
      @if (subagentVerdict(); as verdict) {
        <div data-mol-id="subagent-verdict" [attr.style]="subagentVerdictStyle(verdict)">
          <div [attr.style]="subagentVerdictRowStyle(verdict)">{{ verdict.verdict === 'PASS' ? '✓' : '✕' }}{{ verdict.verdict === 'PASS' ? verdictPassText() : verdictFailText() }}</div>
          @if (verdict.issues.length > 0) {<ul [attr.style]="s.subagentIssues">@for (issue of verdict.issues; track $index) {<li>{{ issue }}</li>}</ul>}
        </div>
      }
      @if (subagentBody()) {<div [attr.style]="s.subagentBodyWrap"><div [attr.style]="subagentBodyStyle()">{{ subagentBody() }}</div>@if (subagentBody().length > 600) {<button type="button" data-mol-id="subagent-report-toggle" [attr.aria-expanded]="subagentOpen() ? 'true' : 'false'" (click)="toggleSubagent()" [class]="quietToggle()" [attr.style]="s.subagentToggle">{{ subagentToggleText() }}</button>}</div>}
    } @else if (name === 'save_plan') {
      <button type="button" data-mol-id="save-plan-row" (click)="openPlan()" (mouseenter)="hovered.set(true)" (mouseleave)="hovered.set(false)" [attr.style]="savePlanRowStyle()">
        <span [attr.style]="s.planLabel"><span [attr.style]="s.labelLine">
          <svg width="10" height="10" viewBox="0 0 10 10" [attr.style]="s.dotSvg"><circle cx="5" cy="5" r="3" [attr.fill]="dotColor()" opacity="0.35"></circle><circle cx="5" cy="5" r="3" fill="none" [attr.stroke]="dotColor()" stroke-width="2"></circle></svg>
          <span [attr.style]="s.labelText">@for (seg of labelSegments(planPath(), false, false); track $index) {@if (!seg.code) {{{ seg.text }}} @else {<code [attr.style]="s.codePlain">{{ seg.text }}</code>}}</span>
        </span></span>
        @if (planClickable()) {<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="14" height="14" [attr.style]="planChevronStyle()"><polyline points="6,4 10,8 6,12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></polyline></svg>}
      </button>
    } @else if (name === 'ask_user') {
      @if (askPlanReview(); as plan) {
        <div data-mol-id="plan-review-card" [attr.style]="planHeaderStyle()">
          <div [attr.style]="s.planBadge">{{ t('ide.chat.planReview.badge', undefined, { defaultValue: 'Plan ready for review' }) }}</div>
          <div [attr.style]="s.planTitle">{{ planTitle(plan) }}</div>
          <div [attr.style]="planStepsStyle(plan)">
            <span>{{ planStepsText(plan) }}</span>
            @if (plan.path && onFileOpen) {<button type="button" data-mol-id="plan-review-open" [class]="primaryAction()" (click)="openPlanFile(plan.path)">{{ t('ide.chat.planReview.openPlan', undefined, { defaultValue: 'Open plan' }) }}</button>}
          </div>
          @if (plan.goesLive === true) {<div [attr.style]="planGoesLiveStyle(plan)">{{ t('ide.chat.planReview.goesLive', undefined, { defaultValue: 'Goes live: the platform publishes the app and runs its test suite once, on the live app.' }) }}</div>}
          @if (plan.preview.length > 0) {<ul [attr.style]="s.planPreview">@for (step of plan.preview; track $index) {<li>{{ step }}</li>}</ul>}
          @if (plan.steps > plan.preview.length) {<div [attr.style]="s.planMore">{{ planMoreText(plan) }}</div>}
        </div>
      } @else {
        <div [attr.style]="questionHeaderStyle()">
          <div mol-markdown-content [text]="questionText()" [isStreaming]="false"></div>
          @if (askMulti() && askAwaiting()) {<div [attr.style]="s.multiHint">{{ t('ide.chat.askUserMultiHint', undefined, { defaultValue: 'You can choose more than one.' }) }}</div>}
        </div>
      }
      <div [attr.style]="s.optionsRow">
        <div [attr.style]="optionsColumnStyle()">
          @if (askReviewCtas()) {
            <div [attr.style]="s.ctaRow">@for (option of askOptions(); track $index; let i = $index) {<button type="button" [attr.data-mol-id]="'plan-review-cta-' + i" [disabled]="!askAwaiting() || onAskUserResponse == null" (click)="pickCta(option)" [class]="ctaClass(i)" [attr.style]="ctaStyle(option)">{{ ctaText(option) }}</button>}</div>
          } @else {
            @for (option of askOptions(); track $index; let i = $index) {
              <div>
                <div [attr.style]="s.optionLine">
                  <button type="button" [attr.data-mol-id]="'ask-user-option-' + i" [disabled]="!askAwaiting() || onAskUserResponse == null" (click)="pickOption(option)" (focus)="focusOption(i)" (mouseenter)="hoverOption(i)" (mouseleave)="hoveredIdx.set(null)" [attr.style]="optionStyle(option, i)">
                    <span [attr.style]="badgeStyle(option, i)">{{ badgeText(option, i) }}</span>
                    <span [attr.style]="s.optionLabel"><span [attr.style]="s.block">{{ option.label }}</span>@if (option.description) {<span [attr.style]="s.optionDescription">{{ option.description }}</span>}</span>
                    @if (!askMulti() && isOptionSelected(option.label)) {<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="14" height="14" [attr.fill]="isLight() ? '#2563eb' : '#60a5fa'"><path [attr.d]="checkPath"></path></svg>}
                  </button>
                  @if (askHasPreviews() && isNarrow() && option.preview) {<button type="button" [attr.data-mol-id]="'ask-user-option-preview-' + i" [attr.aria-label]="t('ide.chat.askUserPreview', undefined, { defaultValue: 'Preview' })" [disabled]="!askAwaiting()" (click)="togglePreview(i)" [attr.style]="optionPreviewStyle(i)">›</button>}
                </div>
                @if (askHasPreviews() && isNarrow() && option.preview && previewOpenIdx() === i) {<div [attr.style]="inlinePreviewStyle()"><div mol-markdown-content [text]="option.preview" [isStreaming]="false"></div></div>}
              </div>
            }
          }
          @if (askMulti() && askAwaiting() && onAskUserResponse != null) {<div [attr.style]="multiConfirmStyle()"><span [attr.style]="s.multiCount">{{ multiCountText() }}</span><button type="button" data-mol-id="ask-user-multiselect-confirm" [disabled]="multiPicks().length === 0" [class]="multiConfirmClass()" (click)="confirmMulti()">{{ t('ide.chat.askUserMultiConfirm', undefined, { defaultValue: 'Confirm choice' }) }}</button></div>}
        </div>
        @if (askHasPreviews() && !isNarrow()) {<div [attr.style]="previewPaneStyle()"><div [attr.style]="previewHeaderStyle()">{{ previewPaneTitle() }}</div><div [attr.style]="s.previewBody">@if (previewOption(); as option) {@if (option.preview) {<div mol-markdown-content [text]="option.preview" [isStreaming]="false"></div>}}</div></div>}
      </div>
      @if (askAwaiting() && askAllowFreeText() && onAskUserResponse != null) {<div [attr.style]="freeTextRowStyle()"><input type="text" [value]="freeText()" [attr.value]="freeText()" (input)="onFreeText($event)" (keydown)="onFreeTextKey($event)" [attr.placeholder]="freeTextPlaceholder()" [class]="cm.touchTargetCompact" [attr.style]="freeTextStyle()" /><button type="button" data-mol-id="ask-user-free-text-submit" [disabled]="!freeText().trim()" (click)="submitFreeText()" [class]="freeTextSubmitClass()">{{ t('ide.chat.askUserSubmit', undefined, { defaultValue: 'Send' }) }}</button></div>}
      @if (freeTextAnswer(); as answer) {<div [attr.style]="freeTextAnswerStyle()">{{ answer }}</div>}
      @if (askHint()) {<div [attr.style]="hintStyle()">{{ askHint() }}</div>}
    } @else {
      <div [attr.style]="s.rowLine">
        <div role="button" [attr.tabindex]="rowClickKind() ? 0 : null" (click)="onRowClick($event)" (keydown)="onRowKeydown($event)" (dblclick)="onRowDblclick()" (mouseenter)="hovered.set(true)" (mouseleave)="hovered.set(false)" [attr.style]="rowStyle()">
          <span [attr.style]="s.labelWrap"><span [attr.style]="s.labelLine">
            <svg width="10" height="10" viewBox="0 0 10 10" [attr.style]="s.dotSvg"><circle cx="5" cy="5" r="3" [attr.fill]="dotColor()" opacity="0.35"></circle><circle cx="5" cy="5" r="3" fill="none" [attr.stroke]="dotColor()" stroke-width="2"></circle></svg>
            <span [attr.style]="s.labelText">@for (seg of labelSegments(currentFilePath(), true); track $index) {@if (!seg.code) {{{ seg.text }}} @else {<code [attr.style]="s.codePlain">{{ seg.text }}</code>}}</span>
            @if (summary()) {<span [class]="summaryClass()" [attr.style]="s.summary">{{ summary() }}</span>}
          </span></span>
          @if (diffStats(); as stats) {<span [attr.style]="diffStatsStyle()">@if (stats.added > 0) {<span [attr.style]="addedStyle()">{{ '+' + stats.added }}</span>}@if (stats.removed > 0) {<span [attr.style]="removedStyle()">{{ '-' + stats.removed }}</span>}</span>}
          @if (chevronVisible()) {<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="14" height="14" [attr.style]="chevronStyle()"><polyline points="6,4 10,8 6,12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></polyline></svg>}
        </div>
        @for (target of labelFiles(currentFilePath(), true); track target.path) {<code [attr.style]="s.fileOpenCode" (mouseenter)="codeEnter($event)" (mouseleave)="codeLeave($event)"><button type="button" [attr.aria-label]="openFileLabel(target.path)" (click)="fileOpenClick(target.path)" (dblclick)="fileOpenDblClick(target.path)" [attr.style]="s.codeButton">{{ target.name }}</button></code>}
        @if (canRevert() && status !== 'running') {<span role="button" tabindex="0" [attr.title]="undoTitle()" (click)="handleRevert($event)" (keydown)="onUndoKeydown($event)" (mouseenter)="undoEnter($event)" (mouseleave)="undoLeave($event)" [attr.style]="undoStyle()"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="13" height="13" fill="currentColor"><path [attr.d]="undoPath()"></path></svg></span>}
        @if (canSkip()) {<button type="button" [attr.data-mol-id]="'tool-call-skip-' + id" (click)="onSkipClick()" [disabled]="skipRequested() || skipDisabledReason != null" [attr.title]="skipDisabledReason ?? null" [class]="skipClass()">{{ skipText() }}</button>}
      </div>
      @if (expanded() && hasDetails()) {
        <div [class]="cm.surfaceSecondary" [attr.style]="s.detail">
          @if (showInOut()) {
            @if (inView(); as view) {<div [attr.style]="s.detailBlock"><div [class]="cm.textMuted" [attr.style]="s.detailLabel">{{ inLabel() }}</div>@if (view.kind === 'command') {<pre [attr.style]="s.wrapPre"><span [attr.style]="s.prompt">$ </span>{{ view.command }}</pre>} @else if (view.kind === 'text') {<pre [attr.style]="s.pre">{{ view.text }}</pre>} @else {<pre [attr.style]="s.pre">@for (line of view.lines; track $index) {@if (line.kind === 'del') {<span [attr.style]="s.editRemoved">{{ '- ' + line.text }}</span>} @else if (line.kind === 'add') {<span [attr.style]="s.editAdded">{{ '+ ' + line.text }}</span>} @else {{{ line.text }}}}</pre>}</div>}
            @if (outView(); as view) {<div [attr.style]="outBlockStyle()"><div [class]="cm.textMuted" [attr.style]="s.detailLabel">{{ outLabel() }}</div>@if (view.kind === 'interrupted') {<span [attr.style]="s.interrupted">{{ view.text }}</span>} @else if (view.kind === 'error') {<pre [attr.style]="errorPreStyle()">{{ view.text }}</pre>} @else if (view.kind === 'exec') {<div>@if (view.stdout) {<pre [attr.style]="s.outputPre">{{ view.stdout }}</pre>}@if (view.stderr) {<pre [attr.style]="stderrStyle(view.stdout)">{{ view.stderr }}</pre>}@if (view.exitCode != null && view.exitCode !== 0) {<div [attr.style]="s.exitCode">{{ exitCodeText(view.exitCode) }}</div>}@if (!view.stdout && !view.stderr) {<span [attr.style]="s.faded">{{ noOutputText() }}</span>}</div>} @else if (view.kind === 'written') {<span [attr.style]="s.note">{{ view.text }}</span>} @else if (view.kind === 'diff') {<div [attr.style]="s.writeDiff">@if (view.mode === 'new') {<div [attr.style]="s.added">{{ newFileLinesText(view.newCount) }}</div>} @else {@if (view.added > 0) {<div [attr.style]="s.added">{{ linesAddedText(view.added) }}</div>}@if (view.removed > 0) {<div [attr.style]="s.removed">{{ linesRemovedText(view.removed) }}</div>}}</div>} @else if (view.kind === 'applied') {<span [attr.style]="s.applied">{{ view.text }}</span>} @else if (view.kind === 'empty') {<span [attr.style]="s.faded">{{ view.text }}</span>} @else if (view.kind === 'read') {<pre [attr.style]="s.pre">{{ view.text }}</pre>} @else if (view.kind === 'list') {<div [attr.style]="s.resultRows">@for (entry of view.entries; track $index) {<div [attr.style]="s.entryRow"><span [attr.style]="s.entryMark">{{ entry.directory ? '▶' : '' }}</span><span>{{ entry.name }}{{ entry.directory ? '/' : '' }}</span></div>}</div>} @else if (view.kind === 'files') {<div [attr.style]="s.resultRows">@for (file of view.files; track $index) {<div>{{ file }}</div>}</div>} @else if (view.kind === 'search') {<div [attr.style]="s.resultRows">@for (row of view.rows; track $index) {<div [attr.style]="s.matchRow"><span [attr.style]="s.matchWhere">{{ row.label }}</span><span [attr.style]="s.matchText">{{ row.content }}</span></div>}@if (view.more != null) {<div [attr.style]="s.more">{{ andMoreText(view.more) }}</div>}</div>} @else if (view.kind === 'fetch') {<div>@if (view.status != null) {<div [attr.style]="fetchStatusStyle(view)">HTTP {{ view.status }}</div>}@if (view.body) {<pre [attr.style]="s.pre">{{ view.body }}</pre>}</div>} @else {<pre [attr.style]="s.pre">{{ asJson(view) }}</pre>}</div>}
          } @else {
            <div [attr.style]="s.detailBlock">
              @if (name === 'rename_file') {<pre [attr.style]="s.pre">{{ renameText() }}</pre>}
              @if (showsResultRows() && output !== undefined) {@if (outView(); as view) {@if (view.kind === 'interrupted') {<span [attr.style]="s.interrupted">{{ view.text }}</span>} @else if (view.kind === 'error') {<pre [attr.style]="errorPreStyle()">{{ view.text }}</pre>} @else if (view.kind === 'empty') {<span [attr.style]="s.faded">{{ view.text }}</span>} @else if (view.kind === 'list') {<div [attr.style]="s.resultRows">@for (entry of view.entries; track $index) {<div [attr.style]="s.entryRow"><span [attr.style]="s.entryMark">{{ entry.directory ? '▶' : '' }}</span><span>{{ entry.name }}{{ entry.directory ? '/' : '' }}</span></div>}</div>} @else if (view.kind === 'files') {<div [attr.style]="s.resultRows">@for (file of view.files; track $index) {<div>{{ file }}</div>}</div>} @else if (view.kind === 'search') {<div [attr.style]="s.resultRows">@for (row of view.rows; track $index) {<div [attr.style]="s.matchRow"><span [attr.style]="s.matchWhere">{{ row.label }}</span><span [attr.style]="s.matchText">{{ row.content }}</span></div>}@if (view.more != null) {<div [attr.style]="s.more">{{ andMoreText(view.more) }}</div>}</div>} @else {<pre [attr.style]="s.pre">{{ asJson(view) }}</pre>}}}
              @if (name === 'find_package' && output !== undefined) {@if (packages().length === 0) {<span [attr.style]="s.faded">{{ noMatchesText() }}</span>} @else {<div [attr.style]="s.packageRows">@for (result of packages(); track $index; let i = $index) {<div [attr.role]="packageClickable(result) ? 'button' : null" [attr.tabindex]="packageClickable(result) ? 0 : null" [attr.data-mol-id]="'find-package-result-' + i" [attr.title]="packageClickable(result) ? openPackageDocText() : null" (click)="packageClick(result, $event)" (keydown)="packageKeydown(result, $event)" (mouseenter)="packageEnter(result, $event)" (mouseleave)="packageLeave(result, $event)" [attr.style]="packageStyle(result)"><span [attr.style]="s.packageName">{{ result.name }}</span>@if (result.label) {<span [attr.style]="s.packageLabel">{{ result.label }}</span>}</div>}</div>}}
            </div>
          }
        </div>
      }
    }
  }`,
})
export class ToolCallCard {
  /** The tool call's id (the turn's own identifier for it). */
  id!: string

  /** The tool name (`exec_command`, `read_file`, …). */
  name!: string

  /** The raw tool input payload. */
  input?: unknown

  /** The raw tool output payload. */
  output?: unknown

  /** How the call is going. */
  status!: ToolCallCardProps['status']

  /** Snapshot of original/modified file content captured at tool-call time. */
  fileDiff?: { original: string; modified: string }

  /** Externally controlled undo state — when true, the card displays as undone. */
  isUndone?: boolean

  /** Called when the undo/redo button is toggled on this tool call. */
  onUndoToggle?: (id: string, undone: boolean) => void

  /** Called when a filename in the card is clicked — open it as a preview tab. */
  onFileOpen?: (path: string) => void

  /** Called when a filename in the card is double-clicked — pin the tab. */
  onFileDoubleClick?: (path: string) => void

  /** Called when a file-changing card is clicked — open its diff. */
  onFileDiff?: (path: string, diff?: { original: string; modified: string }) => void

  /** Called to undo/redo a file change — writes the given content to the path. */
  onFileRevert?: (path: string, content: string) => Promise<void>

  /** Called when the user answers an `ask_user` question. */
  onAskUserResponse?: (response: string) => void

  /** Skips this call while it runs, without ending the turn. */
  onSkip?: (id: string) => void | Promise<boolean | void>

  /** Why skipping is unavailable to this viewer, already translated; `null` when it is. */
  skipDisabledReason?: string | null

  /** Extra class names for the card root. */
  className?: string

  /** The bonded ClassMap (styling tokens resolve at render time). */
  protected readonly cm: UIClassMap = getClassMap()

  /** Reactive translation, read in the injection context. */
  protected readonly i18n = useTranslation()

  /** The translation function for the template. */
  protected readonly t = this.i18n.t

  /** The theme mode signal. */
  private readonly mode = useThemeMode()

  /** Light theme. */
  protected readonly isLight = computed(() => this.mode() === 'light')

  /** Touch/phone branches (read unconditionally, like React's hooks). */
  protected readonly isCoarse = useCoarsePointer()

  /** Phone-width viewport. */
  protected readonly isNarrow = useNarrowViewport()

  /** The transcript's task-id → command map. */
  private readonly backgroundCommands = inject(BACKGROUND_TASK_COMMANDS)

  /** The static style texts. */
  protected readonly s = STYLES

  /** The checkmark path (the picked-answer glyph). */
  protected readonly checkPath = CHECK_PATH

  /** Keeps the host out of the DOM for a call React renders nothing for. */
  constructor() {
    useHostPresence(() => !this.rendersNothing())
  }

  /** Whether the expanded pane is open. */
  protected readonly expanded = signal(false)

  /** Whether the pointer is over the row (hover-revealed controls). */
  protected readonly hovered = signal(false)

  /**
   * Whether the pointer is over the undo control itself: it sits BESIDE the row,
   * so leaving the row would hide it out from under the pointer.
   */
  protected readonly undoHovered = signal(false)

  /** The card's own undo state, used when the host does not control it. */
  private readonly undoneLocal = signal(false)

  /** Whether a revert write is in flight. */
  private readonly reverting = signal(false)

  /** A skip has been asked for and the host has not answered yet. */
  protected readonly skipRequested = signal(false)

  /** The subagent report's own disclosure. */
  protected readonly subagentOpen = signal(false)

  /** The answer picked in this card (before the host echoes it back). */
  private readonly localAnswer = signal<string | null>(null)

  /** The free-text answer in progress. */
  protected readonly freeText = signal('')

  /** The hovered/focused answer index (drives the preview pane). */
  protected readonly hoveredIdx = signal<number | null>(null)

  /** Multi-select picks in progress (labels). */
  protected readonly multiPicks = signal<string[]>([])

  /** The answer whose inline preview is open on a narrow screen. */
  protected readonly previewOpenIdx = signal<number | null>(null)

  /**
   * Whether this call draws no element at all (React returns `null`). The host
   * then leaves the DOM ({@link useHostPresence}), so nothing reaches the
   * rendered tree.
   * @returns True when the card renders nothing.
   */
  protected rendersNothing(): boolean {
    if (this.name === 'update_task_list') return true
    if (this.name !== 'ask_user') return false
    return !normalizeAskUserInput(this.input).question
  }

  /**
   * Whether this is the subagent card shape.
   * @returns True for `spawn_agent`.
   */
  protected isSubagent(): boolean {
    return this.name === 'spawn_agent'
  }

  /**
   * The root element's class (React's `className`, and only when it renders).
   * @returns The class text, or null.
   */
  protected rootClass(): string | null {
    return this.rendersNothing() ? null : (this.className ?? null)
  }

  /**
   * The root element's inline style: React's per-branch root style (a card that
   * renders nothing has no element at all).
   * @returns The style attribute text, or null.
   */
  protected rootStyle(): string | null {
    if (this.rendersNothing()) return null
    if (this.isSubagent() || this.name === 'ask_user') {
      return styleText({
        marginBottom: '8px',
        marginTop: '8px',
        borderRadius: '8px',
        border: `1px solid ${this.borderColour()}`,
        background: this.isLight() ? COLOURS.lightSurface : 'rgba(255, 255, 255, 0.04)',
        overflow: 'hidden',
      })
    }
    return styleText({ marginBottom: '4px' })
  }

  /**
   * The theme's border colour in its serialized form.
   * @returns The border colour.
   */
  private borderColour(): string {
    return this.isLight() ? COLOURS.lightBorder : COLOURS.darkBorder
  }

  // ── Main row ──────────────────────────────────────────────────────────────

  /**
   * The person skipped this call: neither a success nor a failure.
   * @returns True when the output records a user skip.
   */
  private skipped(): boolean {
    return isSkippedByUser(this.output)
  }

  /**
   * A server restart cut the call off, so its effect is unknown.
   * @returns True when the output records a restart interruption.
   */
  private interrupted(): boolean {
    return isInterruptedByRestart(this.output)
  }

  /**
   * Whether the call failed (a status, an `error`, a non-zero exit, a 4xx/5xx).
   * @returns True when the call reads as a failure.
   */
  private hasError(): boolean {
    if (this.skipped() || this.interrupted()) return false
    if (this.status === 'error') return true
    if (typeof this.output !== 'object' || this.output === null) return false
    const out = this.output as Record<string, unknown>
    if ('error' in out) return true
    if (this.name === 'exec_command') {
      const exitCode = num(out.exitCode)
      return exitCode != null && exitCode !== 0
    }
    if (this.name === 'web_fetch') {
      const status = num(out.status)
      return status != null && status >= 400
    }
    return false
  }

  /**
   * The status dot's colour: gray → orange → green or red (a skipped or
   * interrupted call stays gray — it did not happen, or nobody knows if it did).
   * @returns The SVG fill/stroke colour.
   */
  protected dotColor(): string {
    if (this.status === 'pending' || this.skipped() || this.interrupted()) return '#888888'
    if (this.status === 'running') return '#e8a000'
    return this.hasError() ? '#f04040' : '#3fb950'
  }

  /**
   * The row's one-line result summary.
   * @returns The translated summary, or '' when there is none.
   */
  protected summary(): string {
    return toolSummary(this.t, this.name, this.output as ToolOutput, this.status)
  }

  /**
   * The summary span's class.
   * @returns The resolved classes.
   */
  protected summaryClass(): string {
    return this.cm.cn(this.cm.textMuted, this.cm.textSize('xs'))
  }

  /**
   * The input the label is spelled from: a `wait_for_task` names the command it
   * waits on from the transcript map when the panel published it.
   * @returns The input for `toolLabel`.
   */
  private labelInput(): unknown {
    const taskId =
      this.name === 'wait_for_task' ? str((this.input as Inp | undefined)?.taskId) : undefined
    const command = taskId ? this.backgroundCommands.get(taskId) : undefined
    return command ? { ...(this.input as Inp), command } : this.input
  }

  /**
   * The file a label's code segments open. For `load_skill` the path comes back
   * in the output; otherwise it is derived from the input.
   * @returns The path, or null.
   */
  protected currentFilePath(): string | null {
    return this.name === 'load_skill'
      ? (((this.output as { path?: string } | null | undefined)?.path ?? null) as string | null)
      : extractFilePath(this.name, this.input)
  }

  /**
   * Whether a write created a new file (which opens directly, with no diff).
   * @returns True for a `write_file` result of type `new`.
   */
  protected isNewFile(): boolean {
    return (
      this.name === 'write_file' &&
      ((this.output as Inp | undefined)?.diff as { type?: string } | undefined)?.type === 'new'
    )
  }

  /**
   * Whether clicking the row opens the file's diff.
   * @returns True for a modification with a diff handler.
   */
  protected isFileDiff(): boolean {
    return (
      !this.isNewFile() &&
      (this.name === 'edit_file' || this.name === 'write_file') &&
      this.currentFilePath() != null &&
      this.onFileDiff != null
    )
  }

  /**
   * The line-diff counts shown beside the label.
   * @returns The counts, or null when the tool changes no lines.
   */
  protected diffStats(): { added: number; removed: number } | null {
    return fileDiffStats(this.name, this.input, this.output)
  }

  /**
   * Whether the undo/redo control rides on the row.
   * @returns True for a modification with a snapshot and a revert handler.
   */
  protected canRevert(): boolean {
    return (
      !this.isNewFile() &&
      (this.name === 'edit_file' || this.name === 'write_file') &&
      this.currentFilePath() != null &&
      this.fileDiff != null &&
      this.onFileRevert != null
    )
  }

  /**
   * Whether the Skip control is offered (a running call on a host that serves it).
   * @returns True when Skip renders.
   */
  protected canSkip(): boolean {
    return this.status === 'running' && this.onSkip != null
  }

  /**
   * Whether the row expands to an inline detail pane.
   * @returns True for the expandable tool families.
   */
  protected hasDetails(): boolean {
    const expandable = new Set([
      'exec_command',
      'web_fetch',
      'rename_file',
      'list_files',
      'find_files',
      'search_files',
      'find_package',
    ])
    return expandable.has(this.name) && (this.input !== undefined || this.output !== undefined)
  }

  /**
   * Whether clicking the row opens a package's README.
   * @returns True for a `read_molecule_doc` row with a resolvable path.
   */
  protected isDocOpen(): boolean {
    return (
      this.name === 'read_molecule_doc' && this.currentFilePath() != null && this.onFileOpen != null
    )
  }

  /**
   * Whether the card uses the labeled IN / OUT detail pane.
   * @returns True for commands and fetches.
   */
  protected showInOut(): boolean {
    return this.name === 'exec_command' || this.name === 'web_fetch'
  }

  /**
   * What a click on the row does.
   * @returns The action, or null when the row is inert.
   */
  protected rowClickKind(): 'open' | 'diff' | 'expand' | null {
    const path = this.currentFilePath()
    if ((this.isNewFile() || this.isDocOpen()) && path && this.onFileOpen) return 'open'
    if (this.isFileDiff()) return 'diff'
    if (this.hasDetails()) return 'expand'
    return null
  }

  /**
   * The row's inline style (React's, with the coarse-pointer alignment).
   * @returns The style attribute text.
   */
  protected rowStyle(): string | null {
    const coarse = this.isCoarse()
    return styleText({
      display: 'flex',
      alignItems: coarse ? 'center' : 'flex-start',
      gap: '6px',
      background: 'none',
      border: 'medium',
      userSelect: 'text',
      cursor: this.rowClickKind() ? 'pointer' : 'default',
      color: 'inherit',
      textAlign: 'left',
      padding: '2px 0px',
      ...(coarse ? { minHeight: '32px' } : {}),
      width: '100%',
      minWidth: 0,
    })
  }

  /**
   * The undo/redo span's inline style.
   * @returns The style attribute text.
   */
  protected undoStyle(): string | null {
    const coarse = this.isCoarse()
    const reverting = this.reverting()
    return styleText({
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: coarse ? '32px' : '20px',
      height: coarse ? '32px' : '20px',
      borderRadius: '4px',
      flexShrink: 0,
      position: 'relative',
      top: coarse ? 0 : '-1px',
      cursor: reverting ? 'wait' : 'pointer',
      opacity: reverting ? 0.3 : this.hovered() || coarse || this.undoHovered() ? 0.6 : 0,
      transition: 'opacity 100ms, background 100ms',
    })
  }

  /**
   * The undo/redo control's title (what the click will do).
   * @returns The translated title.
   */
  protected undoTitle(): string {
    return this.isUndoneValue()
      ? this.t('ide.chat.redoChange', undefined, { defaultValue: 'Re-apply this change' })
      : this.t('ide.chat.undoChange', undefined, { defaultValue: 'Undo this change' })
  }

  /**
   * The undo/redo glyph path.
   * @returns The SVG path data.
   */
  protected undoPath(): string {
    return this.isUndoneValue() ? REDO_PATH : UNDO_PATH
  }

  /**
   * The card's undone state (host-controlled when it says, else this card's).
   * @returns True when the change reads as undone.
   */
  private isUndoneValue(): boolean {
    return this.isUndone ?? this.undoneLocal()
  }

  /**
   * The diff-stats span's inline style.
   * @returns The style attribute text.
   */
  protected diffStatsStyle(): string | null {
    return styleText({
      ...(this.diffStatsBase() ?? {}),
      marginTop: this.isCoarse() ? 0 : '2px',
    })
  }

  /**
   * The diff-stats span's static declarations.
   * @returns The declarations, as an object.
   */
  private diffStatsBase(): Record<string, unknown> {
    return {
      display: 'flex',
      gap: '4px',
      flexShrink: 0,
      fontSize: '11px',
      fontFamily: MONO,
      opacity: this.hovered() ? 1 : 0.6,
      transition: 'opacity 100ms',
    }
  }

  /**
   * The added-lines count's style (struck through once undone).
   * @returns The style attribute text.
   */
  protected addedStyle(): string | null {
    const undone = this.isUndoneValue()
    return styleText({
      color: undone
        ? this.isLight()
          ? COLOURS.lightRemoved
          : COLOURS.red
        : this.isLight()
          ? COLOURS.lightAdded
          : COLOURS.green,
      textDecoration: undone ? 'line-through' : undefined,
    })
  }

  /**
   * The removed-lines count's style (struck through once undone).
   * @returns The style attribute text.
   */
  protected removedStyle(): string | null {
    const undone = this.isUndoneValue()
    return styleText({
      color: undone
        ? this.isLight()
          ? COLOURS.lightAdded
          : COLOURS.green
        : this.isLight()
          ? COLOURS.lightRemoved
          : COLOURS.red,
      textDecoration: undone ? 'line-through' : undefined,
    })
  }

  /**
   * Whether the expand/open chevron renders.
   * @returns True for a row with somewhere to go.
   */
  protected chevronVisible(): boolean {
    const path = this.currentFilePath()
    return (
      this.hasDetails() ||
      this.isFileDiff() ||
      this.isDocOpen() ||
      (this.isNewFile() && path != null && this.onFileOpen != null)
    )
  }

  /**
   * The chevron's inline style.
   * @returns The style attribute text.
   */
  protected chevronStyle(): string | null {
    return styleText({
      display: 'block',
      flexShrink: 0,
      marginTop: this.isCoarse() ? 0 : '3px',
      transform: this.expanded() ? 'rotate(90deg)' : 'rotate(0deg)',
      transition: 'transform 150ms, opacity 100ms',
      opacity: this.hovered() ? 0.85 : 0.35,
    })
  }

  /**
   * The label's pieces: plain text with the `` `path` `` segments split out, and
   * (when `openable`) the clickable ones LEFT OUT — they render as the row's
   * SIBLING controls (a control cannot sit inside the row's `role="button"` —
   * axe `nested-interactive`), see {@link labelFiles}.
   * @param filePath - The primary file path for clickable code segments, or null.
   * @param waitAware - Whether the label may name a waited-on command (`wait_for_task`).
   * @param openable - Whether a resolvable code segment moves out to a sibling control.
   * @returns The label's inline segments.
   */
  protected labelSegments(
    filePath: string | null,
    waitAware: boolean,
    openable = true,
  ): LabelSegment[] {
    return this.labelParts(filePath, waitAware, openable).segments
  }

  /**
   * The label's openable file segments, rendered as controls BESIDE the row.
   * @param filePath - The primary file path for clickable code segments, or null.
   * @param waitAware - Whether the label may name a waited-on command (`wait_for_task`).
   * @returns The file targets, in label order.
   */
  protected labelFiles(filePath: string | null, waitAware: boolean): LabelFileTarget[] {
    return this.labelParts(filePath, waitAware, true).files
  }

  /**
   * Splits the label into its inline segments and its openable file targets.
   * @param filePath - The primary file path for clickable code segments, or null.
   * @param waitAware - Whether the label may name a waited-on command (`wait_for_task`).
   * @param openable - Whether a resolvable code segment moves out to a sibling control.
   * @returns The inline segments and the file targets they left behind.
   */
  private labelParts(
    filePath: string | null,
    waitAware: boolean,
    openable: boolean,
  ): { segments: LabelSegment[]; files: LabelFileTarget[] } {
    const input = waitAware ? this.labelInput() : this.input
    const text = toolLabel(this.t, this.name, input)
    const parts = text.split(new RegExp('`([^`]+)`'))
    if (parts.length === 1) {
      return { segments: [{ code: false, text, target: null }], files: [] }
    }
    // A batch read names several files: each one opens ITS file, not the first.
    const entries = this.name === 'read_file' ? readFileLabelEntries(input) : null
    const targetOf = (i: number): string | null =>
      entries ? (entries[(i - 1) / 2]?.path ?? null) : filePath
    const files: LabelFileTarget[] = []
    const openableAt: boolean[] = parts.map((part, i) => {
      if (i % 2 === 0) return false
      const target = targetOf(i)
      if (openable && target && this.onFileOpen) {
        files.push({ name: part, path: target })
        return true
      }
      return false
    })
    const segments: LabelSegment[] = []
    for (const [i, part] of parts.entries()) {
      if (i % 2 === 1) {
        if (!openableAt[i]) segments.push({ code: true, text: part, target: null })
        continue
      }
      // A separator between two segments that both moved out of the text (the
      // ", " between a batch read's names) would dangle between nothing.
      if (openableAt[i - 1] && openableAt[i + 1] && /^[\s,]*$/.test(part)) continue
      segments.push({ code: false, text: part, target: null })
    }
    return { segments, files }
  }

  /**
   * A code segment's button label.
   * @param path - The file it opens.
   * @returns The translated label.
   */
  protected openFileLabel(path: string): string {
    return this.t('ide.chat.tool.openFile', { path }, { defaultValue: 'Open {{path}}' })
  }

  /**
   * A file open control's single click: preview the file.
   * @param path - The file the control names.
   */
  protected fileOpenClick(path: string): void {
    this.onFileOpen?.(path)
  }

  /**
   * A file open control's double click: pin the file's tab.
   * @param path - The file the control names.
   */
  protected fileOpenDblClick(path: string): void {
    this.onFileDoubleClick?.(path)
  }

  /** The row's click: opens a file/diff, or toggles the detail pane. */
  protected onRowClick(_event: Event): void {
    const kind = this.rowClickKind()
    if (!kind) return
    // Dragging across the label to copy it ends in a click: that is a selection,
    // not a request to expand or open the card.
    if (window.getSelection()?.toString()) return
    if (kind === 'open') {
      const path = this.currentFilePath()
      if (path) this.onFileOpen?.(path)
      return
    }
    if (kind === 'diff') {
      const path = this.currentFilePath()
      if (path) this.onFileDiff?.(path, this.fileDiff)
      return
    }
    this.expanded.update((open) => !open)
  }

  /**
   * The row's Enter/Space activation.
   * @param event - The native key event.
   */
  protected onRowKeydown(event: KeyboardEvent): void {
    if (!this.rowClickKind()) return
    if (event.target !== event.currentTarget) return
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    this.onRowClick(event)
  }

  /** The row's double click: pins a NEW file's tab. */
  protected onRowDblclick(): void {
    const path = this.currentFilePath()
    if (!this.isNewFile() || !path || !this.onFileDoubleClick) return
    this.onFileDoubleClick(path)
  }

  /**
   * Sets a hovered code segment's opacity (React mutates it on hover).
   * @param event - The mouse event.
   */
  protected codeEnter(event: MouseEvent): void {
    ;(event.currentTarget as HTMLElement).style.opacity = '1'
  }

  /**
   * Restores a code segment's resting opacity.
   * @param event - The mouse event.
   */
  protected codeLeave(event: MouseEvent): void {
    ;(event.currentTarget as HTMLElement).style.opacity = '0.75'
  }

  /** The undo control's hover scrim. */
  protected undoEnter(event: MouseEvent): void {
    this.undoHovered.set(true)
    const el = event.currentTarget as HTMLElement
    el.style.background = 'rgba(128,128,128,0.2)'
    el.style.opacity = '1'
  }

  /** Removes the undo control's hover scrim. */
  protected undoLeave(event: MouseEvent): void {
    this.undoHovered.set(false)
    const el = event.currentTarget as HTMLElement
    el.style.background = 'transparent'
    el.style.opacity = ''
  }

  /**
   * The undo control's Enter/Space activation.
   * @param event - The native key event.
   */
  protected onUndoKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    void this.handleRevert(event)
  }

  /**
   * Undo/redo this file change: writes the other side's content back and
   * reports the new state to the host.
   * @param event - The click or key event that asked for it.
   * @returns A promise that settles when the host's write settles.
   */
  protected async handleRevert(event: Event): Promise<void> {
    event.stopPropagation()
    if (!this.canRevert() || this.reverting()) return
    const path = this.currentFilePath()
    const diff = this.fileDiff
    const revert = this.onFileRevert
    if (path == null || diff == null || revert == null) return
    const undone = this.isUndoneValue()
    const content = undone ? diff.modified : diff.original
    this.reverting.set(true)
    try {
      await revert(path, content)
      const next = !undone
      this.undoneLocal.set(next)
      this.onUndoToggle?.(this.id, next)
    } catch (error) {
      // A host whose revert rejects must not leave an unhandled promise
      // rejection: the failure is logged and the card stays exactly as it
      // was (still undone or not, as before the click) (React's handleRevert).
      logger.warn('tool-call-card: reverting a file change failed', { error, path: path })
    } finally {
      this.reverting.set(false)
    }
  }

  /**
   * The Skip button's class.
   * @returns The resolved classes.
   */
  protected skipClass(): string {
    return this.cm.cn(
      this.cm.button({ variant: 'solid', color: 'primary', size: 'xs' }),
      this.cm.touchTargetCompact,
      this.cm.shrink0,
    )
  }

  /**
   * The Skip button's text.
   * @returns `Skipping…` while the request is out, `Skip` otherwise.
   */
  protected skipText(): string {
    return this.skipRequested()
      ? this.t('ide.chat.skippingToolCall', undefined, { defaultValue: 'Skipping…' })
      : this.t('ide.chat.skipToolCall', undefined, { defaultValue: 'Skip' })
  }

  /** Asks the host to drop this one call, keeping the turn alive. */
  protected onSkipClick(): void {
    void this.handleSkip()
  }

  /**
   * Skips this call while it is still running. A host that answers `false`
   * means the call had already finished (the stale-button race), which is not
   * an error: the button simply returns to its resting state.
   * @returns A promise that settles when the host's answer settles.
   */
  private async handleSkip(): Promise<void> {
    const skip = this.onSkip
    if (!skip || this.skipRequested() || this.skipDisabledReason) return
    this.skipRequested.set(true)
    try {
      const accepted = await skip(this.id)
      if (accepted === false) this.skipRequested.set(false)
    } catch (_error) {
      // Deliberate noop: the host already logs whatever went wrong on its side,
      // and there is nothing for the PERSON to do here — the call is still
      // running, so the honest UI is the button back at rest to try again.
      this.skipRequested.set(false)
    }
  }

  // ── Expanded detail ───────────────────────────────────────────────────────

  /**
   * The IN pane's view model.
   * @returns The pane's shape, or null when there is no input to show.
   */
  protected inView(): InView | null {
    if (!this.showInOut() || this.input === undefined) return null
    const inp = (this.input ?? {}) as Inp
    if (this.name === 'exec_command') {
      return { kind: 'command', command: str(inp.command) ?? '' }
    }
    if (this.name === 'web_fetch') {
      return { kind: 'text', text: `${str(inp.method) ?? 'GET'} ${str(inp.url) ?? ''}` }
    }
    if (this.name === 'edit_file') return { kind: 'edit', lines: this.editLines() }
    return { kind: 'text', text: this.textInput(inp) }
  }

  /**
   * The plain-text IN pane of the path-shaped tools.
   * @param inp - The input record.
   * @returns The pre's text.
   */
  private textInput(inp: Inp): string {
    if (this.name === 'search_files') {
      return `/${str(inp.pattern) ?? ''}/${str(inp.path) ? ` in ${str(inp.path)}` : ''}${
        str(inp.include) ? ` (${str(inp.include)})` : ''
      }`
    }
    if (this.name === 'find_files') {
      return `${str(inp.pattern) ?? ''}${str(inp.path) ? ` in ${str(inp.path)}` : ''}`
    }
    if (this.name === 'rename_file') {
      return `${str(inp.old_path) ?? ''} → ${str(inp.new_path) ?? ''}`
    }
    if (
      this.name === 'write_file' ||
      this.name === 'read_file' ||
      this.name === 'delete_file' ||
      this.name === 'list_files' ||
      this.name === 'create_directory'
    ) {
      return str(inp.path) ?? ''
    }
    return JSON.stringify(this.input, null, 2)
  }

  /**
   * The IN pane's `<pre>` content for an edit: removed lines, a newline, then
   * added lines, per replacement.
   * @returns The pane's view model.
   */
  protected editLines(): DetailLine[] {
    const inp = (this.input ?? {}) as Inp
    const replacements = (Array.isArray(inp.replacements) ? inp.replacements : []).map((entry) => {
      const record = (entry ?? {}) as Inp
      return {
        old_string: str(record.old_string) ?? '',
        new_string: str(record.new_string) ?? '',
      }
    })
    const lines: DetailLine[] = []
    replacements.forEach((replacement, i) => {
      if (i > 0) lines.push({ kind: 'text', text: '\n\n' })
      replacement.old_string.split('\n').forEach((line, li) => {
        if (li > 0) lines.push({ kind: 'text', text: '\n' })
        lines.push({ kind: 'del', text: line })
      })
      lines.push({ kind: 'text', text: '\n' })
      replacement.new_string.split('\n').forEach((line, li) => {
        if (li > 0) lines.push({ kind: 'text', text: '\n' })
        lines.push({ kind: 'add', text: line })
      })
    })
    return lines
  }

  /**
   * The OUT pane's view model.
   * @returns The pane's shape, or null when there is no output to show.
   */
  protected outView(): OutView | null {
    if (this.output === undefined) return null
    const out = (this.output ?? {}) as Inp
    if (this.interrupted()) {
      return { kind: 'interrupted', text: interruptedByRestartLine(this.t) }
    }
    if (typeof out === 'object' && out !== null && 'error' in out) {
      return {
        kind: 'error',
        text: str(out.error) ?? String(JSON.stringify(out.error)),
      }
    }
    return this.outByTool(out)
  }

  /**
   * The tool-specific OUT pane.
   * @param out - The output record.
   * @returns The pane's shape.
   */
  private outByTool(out: Inp): OutView {
    if (this.name === 'exec_command') {
      return {
        kind: 'exec',
        stdout: (str(out.stdout) ?? '').trimEnd(),
        stderr: (str(out.stderr) ?? '').trimEnd(),
        exitCode: num(out.exitCode) ?? null,
      }
    }
    if (this.name === 'write_file') {
      const diff = out.diff as
        { type: string; linesAdded: number; linesRemoved: number } | undefined
      if (!diff) {
        return {
          kind: 'written',
          text: this.t('ide.toolCall.written', undefined, { defaultValue: 'Written' }),
        }
      }
      if (diff.type === 'unchanged') {
        return {
          kind: 'written',
          text: this.t('ide.toolCall.statusUnchanged', undefined, { defaultValue: 'Unchanged' }),
        }
      }
      return {
        kind: 'diff',
        mode: diff.type === 'new' ? 'new' : 'modified',
        newCount: diff.linesAdded,
        added: diff.linesAdded,
        removed: diff.linesRemoved,
      }
    }
    if (this.name === 'edit_file') {
      const applied = num(out.replacementsApplied)
      return {
        kind: 'applied',
        text:
          applied != null
            ? this.t(
                'ide.toolCall.changesApplied',
                { count: applied },
                { defaultValue: '{{count}} changes applied' },
              )
            : this.t('ide.toolCall.applied', undefined, { defaultValue: 'Applied' }),
      }
    }
    if (this.name === 'read_file') {
      const content = str(out.content)
      if (!content) {
        return {
          kind: 'empty',
          text: this.t('ide.toolCall.empty', undefined, { defaultValue: '(empty)' }),
        }
      }
      return {
        kind: 'read',
        text:
          content.length > 3000
            ? content.slice(0, 3000) +
              '\n' +
              this.t('ide.toolCall.truncated', undefined, { defaultValue: '… (truncated)' })
            : content,
      }
    }
    if (this.name === 'list_files') {
      const entries = Array.isArray(out.entries)
        ? (out.entries as Array<{ name: string; type: string }>).map((entry) => ({
            name: str(entry?.name) ?? '',
            directory: entry?.type === 'directory',
          }))
        : []
      if (entries.length === 0) {
        return {
          kind: 'empty',
          text: this.t('ide.toolCall.empty', undefined, { defaultValue: '(empty)' }),
        }
      }
      return { kind: 'list', entries }
    }
    if (this.name === 'find_files') {
      const files = Array.isArray(out.files)
        ? out.files.map((file) => str(file)).filter((file): file is string => file !== undefined)
        : []
      if (files.length === 0) {
        return {
          kind: 'empty',
          text: this.t('ide.toolCall.noFilesFound', undefined, { defaultValue: 'No files found' }),
        }
      }
      return { kind: 'files', files }
    }
    if (this.name === 'search_files') {
      const matches = Array.isArray(out.matches)
        ? out.matches.map((match) => {
            const record = (match ?? {}) as Inp
            return {
              file: str(record.file) ?? '',
              line: str(record.line) ?? '',
              content: str(record.content) ?? '',
            }
          })
        : []
      if (matches.length === 0) {
        return {
          kind: 'empty',
          text: this.t('ide.toolCall.noMatches', undefined, { defaultValue: 'No matches' }),
        }
      }
      return {
        kind: 'search',
        rows: matches.slice(0, 30).map((match) => ({
          label: `${basename(match.file)}:${match.line}`,
          content: match.content.trim(),
        })),
        more: matches.length > 30 ? matches.length - 30 : null,
      }
    }
    if (this.name === 'web_fetch') {
      const status = num(out.status)
      const body = str(out.body)
      return {
        kind: 'fetch',
        status: status ?? null,
        ok: status != null && status >= 200 && status < 300,
        body:
          body == null
            ? null
            : body.length > 2000
              ? body.slice(0, 2000) +
                '\n' +
                this.t('ide.toolCall.truncated', undefined, { defaultValue: '… (truncated)' })
              : body,
      }
    }
    return { kind: 'json', text: JSON.stringify(this.output, null, 2) }
  }

  /**
   * A view's fallback text (the JSON pane of a row renderer without a case).
   * @param view - The OUT view.
   * @returns The pane's text.
   */
  protected asJson(view: OutView): string {
    return view.kind === 'json' ? view.text : ''
  }

  /**
   * Whether the expanded pane shows the listing/result rows.
   * @returns True for the listing and search families.
   */
  protected showsResultRows(): boolean {
    return this.name === 'list_files' || this.name === 'find_files' || this.name === 'search_files'
  }

  /**
   * The IN section's heading.
   * @returns The translated heading.
   */
  protected inLabel(): string {
    return this.name === 'exec_command'
      ? this.t('ide.toolCall.command', undefined, { defaultValue: 'Command' })
      : this.t('ide.toolCall.request', undefined, { defaultValue: 'Request' })
  }

  /**
   * The OUT section's heading.
   * @returns The translated heading.
   */
  protected outLabel(): string {
    return this.name === 'exec_command'
      ? this.t('ide.toolCall.output', undefined, { defaultValue: 'Output' })
      : this.t('ide.toolCall.response', undefined, { defaultValue: 'Response' })
  }

  /**
   * The OUT block's inline style (a divider only under the IN block).
   * @returns The style attribute text.
   */
  protected outBlockStyle(): string | null {
    return styleText({
      padding: '6px 10px',
      borderTop: this.inView() ? '1px solid rgba(128, 128, 128, 0.15)' : undefined,
    })
  }

  /**
   * An error result's `<pre>` style.
   * @returns The style attribute text.
   */
  protected errorPreStyle(): string | null {
    return styleText({ ...PRE, color: COLOURS.red })
  }

  /**
   * A command's stderr `<pre>` style.
   * @param stdout - The command's stdout (it decides the top margin).
   * @returns The style attribute text.
   */
  protected stderrStyle(stdout: string): string | null {
    return styleText({
      whiteSpace: 'pre-wrap',
      overflowWrap: 'anywhere',
      overflowX: 'visible',
      maxHeight: '320px',
      overflowY: 'auto',
      margin: stdout ? '4px 0px 0px' : '0px',
      fontFamily: MONO,
      fontSize: '11px',
      lineHeight: 1.5,
      color: COLOURS.red,
    })
  }

  /**
   * A fetch result's status line style.
   * @param view - The fetch view.
   * @returns The style attribute text.
   */
  protected fetchStatusStyle(view: OutView): string | null {
    if (view.kind !== 'fetch') return null
    return styleText({
      color: view.ok ? COLOURS.green : COLOURS.red,
      marginBottom: view.body ? '4px' : 0,
      fontSize: '11px',
    })
  }

  /**
   * The rename pane's text.
   * @returns The old → new path line.
   */
  protected renameText(): string {
    const inp = (this.input ?? {}) as Inp
    return `${str(inp.old_path) ?? ''} → ${str(inp.new_path) ?? ''}`
  }

  /**
   * The exit-code line's text.
   * @param code - The command's exit code.
   * @returns The translated line.
   */
  protected exitCodeText(code: number): string {
    return this.t('ide.toolCall.exitCode', { code }, { defaultValue: 'exit code {{code}}' })
  }

  /**
   * The no-output note.
   * @returns The translated note.
   */
  protected noOutputText(): string {
    return this.t('ide.toolCall.noOutput', undefined, { defaultValue: '(no output)' })
  }

  /**
   * The new-file line count.
   * @param count - The lines added.
   * @returns The translated line.
   */
  protected newFileLinesText(count: number): string {
    return this.t(
      'ide.toolCall.newFileLines',
      { count },
      { defaultValue: 'new file, {{count}} lines' },
    )
  }

  /**
   * The added-lines count.
   * @param count - The lines added.
   * @returns The translated line.
   */
  protected linesAddedText(count: number): string {
    return this.t('ide.toolCall.linesAdded', { count }, { defaultValue: '+{{count}} lines' })
  }

  /**
   * The removed-lines count.
   * @param count - The lines removed.
   * @returns The translated line.
   */
  protected linesRemovedText(count: number): string {
    return this.t('ide.toolCall.linesRemoved', { count }, { defaultValue: '−{{count}} lines' })
  }

  /**
   * The "+N more matches" line.
   * @param count - The matches beyond the first 30.
   * @returns The translated line.
   */
  protected andMoreText(count: number): string {
    return this.t('ide.toolCall.andMore', { count }, { defaultValue: '… and {{count}} more' })
  }

  // ── find_package rows ─────────────────────────────────────────────────────

  /**
   * The package matches of a `find_package` output.
   * @returns The matches, possibly empty.
   */
  protected packages(): PackageResult[] {
    return packageResults(this.output)
  }

  /**
   * Whether a package row is clickable (it has a doc path and a handler).
   * @param result - The match.
   * @returns True when the row opens its README.
   */
  protected packageClickable(result: PackageResult): boolean {
    return moleculeDocPath(result.name) != null && this.onFileOpen != null
  }

  /**
   * A package row's inline style.
   * @param result - The match.
   * @returns The style attribute text.
   */
  protected packageStyle(result: PackageResult): string | null {
    const clickable = this.packageClickable(result)
    return styleText({
      display: 'flex',
      gap: '8px',
      alignItems: this.isCoarse() && clickable ? 'center' : 'baseline',
      ...(this.isCoarse() && clickable ? { minHeight: '32px' } : {}),
      cursor: clickable ? 'pointer' : 'default',
      opacity: clickable ? 0.8 : 1,
      transition: 'opacity 100ms',
    })
  }

  /**
   * The package-docs title.
   * @returns The translated title.
   */
  protected openPackageDocText(): string {
    return this.t('ide.toolCall.openPackageDoc', undefined, { defaultValue: 'Open package docs' })
  }

  /**
   * The no-matches note.
   * @returns The translated note.
   */
  protected noMatchesText(): string {
    return this.t('ide.toolCall.noMatches', undefined, { defaultValue: 'No matches' })
  }

  /**
   * A package row's click: opens the package's README.
   * @param result - The match.
   * @param event - The native click event.
   */
  protected packageClick(result: PackageResult, event: Event): void {
    if (!this.packageClickable(result)) return
    event.stopPropagation()
    const path = moleculeDocPath(result.name)
    if (path) this.onFileOpen?.(path)
  }

  /**
   * A package row's Enter/Space activation.
   * @param result - The match.
   * @param event - The native key event.
   */
  protected packageKeydown(result: PackageResult, event: KeyboardEvent): void {
    if (!this.packageClickable(result)) return
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    event.stopPropagation()
    const path = moleculeDocPath(result.name)
    if (path) this.onFileOpen?.(path)
  }

  /** Lights up a clickable package row on hover. */
  protected packageEnter(result: PackageResult, event: MouseEvent): void {
    if (this.packageClickable(result)) (event.currentTarget as HTMLElement).style.opacity = '1'
  }

  /** Restores a clickable package row's resting opacity. */
  protected packageLeave(result: PackageResult, event: MouseEvent): void {
    if (this.packageClickable(result)) (event.currentTarget as HTMLElement).style.opacity = '0.8'
  }

  // ── spawn_agent ───────────────────────────────────────────────────────────

  /**
   * The subagent's kind.
   * @returns `judge`, `build` or `explore`.
   */
  private subagentKind(): 'judge' | 'build' | 'explore' {
    const inp = (this.input ?? {}) as Inp
    return inp.type === 'judge' ? 'judge' : inp.type === 'build' ? 'build' : 'explore'
  }

  /**
   * The subagent run's output record.
   * @returns The output's fields, read defensively.
   */
  private subagentOut(): {
    report?: unknown
    error?: unknown
    changedPaths?: unknown
    agentId?: unknown
  } {
    return (this.output ?? {}) as {
      report?: unknown
      error?: unknown
      changedPaths?: unknown
      agentId?: unknown
    }
  }

  /**
   * The model that ran the subagent.
   * @returns The model name, or ''.
   */
  protected subagentModel(): string {
    const inp = (this.input ?? {}) as Inp
    return typeof inp.model === 'string' ? inp.model : ''
  }

  /**
   * Whether the run was dispatched into the background (no report yet).
   * @returns True when the output carries an agent id.
   */
  private subagentBackgrounded(): boolean {
    return typeof this.subagentOut().agentId === 'string'
  }

  /**
   * The paths the subagent changed.
   * @returns The path strings of a finished run.
   */
  protected subagentWrote(): string[] {
    const changed = this.subagentOut().changedPaths
    return Array.isArray(changed)
      ? changed.filter((path): path is string => typeof path === 'string')
      : []
  }

  /**
   * The one line a failed run shows the person (never the model-facing report).
   * @returns The sentence, or '' when the run did not fail.
   */
  protected subagentErrorText(): string {
    const out = this.subagentOut()
    if (this.interrupted()) return interruptedByRestartLine(this.t)
    const report = typeof out.report === 'string' ? out.report : ''
    return subagentErrorLine(this.t, out.error, report)
  }

  /**
   * The report body: the judge verdict's rest, or the raw report of a run that
   * finished.
   * @returns The body text, or ''.
   */
  protected subagentBody(): string {
    const report = this.subagentErrorText()
      ? ''
      : typeof this.subagentOut().report === 'string'
        ? (this.subagentOut().report as string)
        : ''
    const verdict = this.subagentKind() === 'judge' ? parseJudgeVerdict(report) : null
    return verdict ? verdict.rest : report
  }

  /**
   * The parsed judge verdict (a judge run whose report carries one).
   * @returns The verdict, or null.
   */
  protected subagentVerdict(): JudgeVerdict | null {
    if (this.subagentKind() !== 'judge') return null
    const report = this.subagentErrorText()
      ? ''
      : typeof this.subagentOut().report === 'string'
        ? (this.subagentOut().report as string)
        : ''
    return parseJudgeVerdict(report)
  }

  /**
   * The card's kind label.
   * @returns The translated label.
   */
  protected subagentKindLabel(): string {
    const kind = this.subagentKind()
    if (kind === 'judge')
      return this.t('ide.chat.subagent.judge', undefined, { defaultValue: 'Acceptance judge' })
    if (kind === 'build')
      return this.t('ide.chat.subagent.build', undefined, { defaultValue: 'Build subagent' })
    return this.t('ide.chat.subagent.explore', undefined, { defaultValue: 'Research subagent' })
  }

  /**
   * The live-status line of the header.
   * @returns The translated line, or '' when the run is neither running nor backgrounded.
   */
  protected subagentWorkingText(): string {
    if (this.status !== 'running' && !this.subagentBackgrounded()) return ''
    return this.subagentBackgrounded()
      ? this.t('ide.chat.subagent.inBackground', undefined, {
          defaultValue: 'running in the background',
        })
      : this.t('ide.chat.subagent.working', undefined, { defaultValue: 'working…' })
  }

  /**
   * The changed-files line of the header.
   * @returns The translated line.
   */
  protected subagentWroteText(): string {
    return this.t(
      'ide.chat.subagent.wroteFiles',
      { count: this.subagentWrote().length },
      { defaultValue: '{{count}} files changed' },
    )
  }

  /**
   * The header row's inline style.
   * @returns The style attribute text.
   */
  protected subagentHeaderStyle(): string | null {
    const hasBody = this.subagentBody() !== '' || this.subagentErrorText() !== ''
    return styleText({
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '6px 12px',
      fontSize: '12px',
      fontWeight: 600,
      borderBottom: hasBody ? `1px solid ${this.borderColour()}` : 'medium',
    })
  }

  /**
   * The status dot's inline style.
   * @returns The style attribute text.
   */
  protected subagentDotStyle(): string | null {
    return styleText({
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      flexShrink: 0,
      background: this.interrupted()
        ? COLOURS.gray
        : this.status === 'error' || this.subagentErrorText()
          ? COLOURS.error
          : this.status === 'done'
            ? COLOURS.success
            : this.status === 'running'
              ? COLOURS.orange
              : COLOURS.gray,
    })
  }

  /**
   * The failure line's inline style.
   * @returns The style attribute text.
   */
  protected subagentErrorStyle(): string | null {
    return styleText({
      padding: '8px 12px',
      fontSize: '12px',
      ...(this.interrupted() ? { opacity: 0.7 } : { color: COLOURS.redStrong }),
      borderBottom: `1px solid ${this.borderColour()}`,
    })
  }

  /**
   * The verdict block's inline style.
   * @param verdict - The judge verdict.
   * @returns The style attribute text.
   */
  protected subagentVerdictStyle(verdict: JudgeVerdict): string | null {
    const pass = verdict.verdict === 'PASS'
    return styleText({
      padding: '8px 12px',
      background: pass
        ? this.isLight()
          ? 'rgba(63, 185, 80, 0.08)'
          : 'rgba(63, 185, 80, 0.12)'
        : this.isLight()
          ? 'rgba(248, 81, 73, 0.08)'
          : 'rgba(248, 81, 73, 0.14)',
      borderBottom: `1px solid ${this.borderColour()}`,
    })
  }

  /**
   * The verdict headline's inline style.
   * @param verdict - The judge verdict.
   * @returns The style attribute text.
   */
  protected subagentVerdictRowStyle(verdict: JudgeVerdict): string | null {
    return styleText({
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      fontSize: '13px',
      fontWeight: 700,
      color: verdict.verdict === 'PASS' ? COLOURS.success : COLOURS.redStrong,
    })
  }

  /**
   * The report body's inline style (capped until the reader expands it).
   * @returns The style attribute text.
   */
  protected subagentBodyStyle(): string | null {
    return styleText({
      fontSize: '12px',
      whiteSpace: 'pre-wrap',
      maxHeight: this.subagentOpen() ? undefined : '150px',
      overflow: 'hidden',
      opacity: 0.9,
    })
  }

  /** Toggles the subagent report's disclosure. */
  protected toggleSubagent(): void {
    this.subagentOpen.update((open) => !open)
  }

  /**
   * The report toggle's text.
   * @returns `Show less` once open, `Show full report` otherwise.
   */
  protected subagentToggleText(): string {
    return this.subagentOpen()
      ? this.t('ide.chat.subagent.hideReport', undefined, { defaultValue: 'Show less' })
      : this.t('ide.chat.subagent.showReport', undefined, { defaultValue: 'Show full report' })
  }

  /**
   * The verdict PASS word.
   * @returns The translated word.
   */
  protected verdictPassText(): string {
    return this.t('ide.chat.subagent.verdictPass', undefined, { defaultValue: 'PASS' })
  }

  /**
   * The verdict FAIL word.
   * @returns The translated word.
   */
  protected verdictFailText(): string {
    return this.t('ide.chat.subagent.verdictFail', undefined, { defaultValue: 'FAIL' })
  }

  /**
   * A disclosure toggle's class (the ghost button every card uses).
   * @returns The resolved classes.
   */
  protected quietToggle(): string {
    return this.cm.cn(this.cm.button({ variant: 'ghost', size: 'xs' }), this.cm.touchTargetCompact)
  }

  // ── save_plan ─────────────────────────────────────────────────────────────

  /**
   * The plan file the row opens.
   * @returns The path, or null.
   */
  protected planPath(): string | null {
    return ((this.output ?? {}) as { path?: string }).path ?? null
  }

  /**
   * Whether clicking the row opens the plan file.
   * @returns True when the output names a path and a handler serves it.
   */
  protected planClickable(): boolean {
    return this.planPath() != null && this.onFileOpen != null
  }

  /** Opens the plan file (React calls `onFileOpen` with no event argument). */
  protected openPlan(): void {
    if (!this.planClickable()) return
    const path = this.planPath()
    if (path) this.onFileOpen?.(path)
  }

  /**
   * The save-plan row's inline style.
   * @returns The style attribute text.
   */
  protected savePlanRowStyle(): string | null {
    return styleText({
      display: 'flex',
      alignItems: 'flex-start',
      gap: '6px',
      background: 'none',
      border: 'medium',
      cursor: this.planClickable() ? 'pointer' : 'default',
      color: 'inherit',
      textAlign: 'left',
      padding: '2px 0px',
      ...(this.isCoarse() ? { minHeight: '32px' } : {}),
      width: '100%',
    })
  }

  /**
   * The save-plan chevron's inline style.
   * @returns The style attribute text.
   */
  protected planChevronStyle(): string | null {
    return styleText({
      display: 'block',
      flexShrink: 0,
      marginTop: '3px',
      transition: 'opacity 100ms',
      opacity: this.hovered() ? 0.85 : 0.35,
    })
  }

  // ── ask_user ──────────────────────────────────────────────────────────────

  /**
   * The question's normalized input (never the raw model payload).
   * @returns The coerced question.
   */
  private ask(): AskUserInput {
    return normalizeAskUserInput(this.input)
  }

  /**
   * The plan-review metadata, when this is the plan-approval card.
   * @returns The plan metadata, or undefined.
   */
  protected askPlanReview(): AskUserPlanReview | undefined {
    return this.ask().planReview
  }

  /**
   * The question header's inline style (markdown block, hairline below).
   * @returns The style attribute text.
   */
  protected questionHeaderStyle(): string | null {
    return styleText({
      padding: '4px 12px 10px',
      fontSize: '13px',
      borderBottom: `1px solid ${this.borderColour()}`,
    })
  }

  /**
   * The question header's markdown text.
   * @returns The unescaped question.
   */
  protected questionText(): string {
    return unescapeLiterals(this.ask().question)
  }

  /**
   * The answer options.
   * @returns The coerced options.
   */
  protected askOptions(): AskUserOption[] {
    return this.ask().options
  }

  /**
   * Whether the question is on screen and still answerable.
   * @returns True while the server waits and no answer has been given.
   */
  protected askAwaiting(): boolean {
    return this.serverAwaiting() && this.localAnswer() === null
  }

  /**
   * Whether the server is still waiting for an answer.
   * @returns True when the output status is `awaiting_response`.
   */
  private serverAwaiting(): boolean {
    const out = this.output as { status?: string } | string | undefined
    return typeof out === 'object' && out?.status === 'awaiting_response'
  }

  /**
   * The answer the person gave (the server's echo, else this card's pick).
   * @returns The answer, or null.
   */
  private selectedAnswer(): string | null {
    const out = this.output
    return typeof out === 'string' ? out : this.localAnswer()
  }

  /**
   * The free-text answer shown under the options, when it was not a preset.
   * @returns The answer, or null.
   */
  protected freeTextAnswer(): string | null {
    const answer = this.selectedAnswer()
    if (!answer) return null
    return this.ask().options.some((option) => option.label === answer) ? null : answer
  }

  /**
   * Whether any option carries a preview artifact.
   * @returns True when the compare pane (or inline preview) applies.
   */
  protected askHasPreviews(): boolean {
    return this.ask().options.some((option) => option.preview)
  }

  /**
   * Whether the question takes several answers.
   * @returns True for a multi-select question with options.
   */
  protected askMulti(): boolean {
    const input = this.ask()
    return input.multiSelect && input.options.length > 0
  }

  /**
   * Whether the plan-approval card's two decisions render as CTAs.
   * @returns True for a plan review with exactly two plain options.
   */
  protected askReviewCtas(): boolean {
    const input = this.ask()
    return (
      !!input.planReview && !this.askMulti() && input.options.length === 2 && !this.askHasPreviews()
    )
  }

  /**
   * Whether the free-text box is offered.
   * @returns True unless the model explicitly opted out.
   */
  protected askAllowFreeText(): boolean {
    return this.ask().allowFreeText !== false
  }

  /**
   * The question's hint line.
   * @returns The hint, or ''.
   */
  protected askHint(): string {
    return this.ask().hint
  }

  /**
   * Whether an option is in the SELECTED set: the multi-select picks in
   * progress plus the labels of an already-answered multi-select. A
   * single-select answer marks no option as selected (React's `selectedSet`
   * holds only multi-select state; its CTA tick reads the answer separately).
   *
   * @param label - The option's label.
   * @returns True when the option belongs to the selected set.
   */
  protected isOptionSelected(label: string): boolean {
    const answer = this.selectedAnswer()
    const answered =
      this.askMulti() && typeof answer === 'string'
        ? answer
            .split('; ')
            .map((part) => part.trim())
            .filter(Boolean)
        : []
    return this.multiPicks().includes(label) || answered.includes(label)
  }

  /**
   * An option row's inline style.
   * @param option - The option.
   * @returns The style attribute text.
   */
  protected optionStyle(option: AskUserOption, i: number): string | null {
    const selected = this.isOptionSelected(option.label)
    const awaiting = this.askAwaiting()
    const hover = awaiting && this.hoveredIdx() === i
    return styleText({
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      flex: '1 1 0%',
      minWidth: 0,
      padding: option.description ? '7px 12px' : '8px 12px',
      ...(this.isCoarse() ? { minHeight: '44px' } : {}),
      // React's `border: 'none'` + a `border-top` override, serialized the way
      // the CSSOM lands it: the combined longhands of the shorthand.
      borderColor: i > 0 ? `${this.borderColour()} currentcolor currentcolor` : 'currentcolor',
      borderImage: 'none',
      borderStyle: i > 0 ? 'solid none none' : 'none',
      borderWidth: i > 0 ? '1px medium medium' : 'medium',
      background: selected
        ? this.isLight()
          ? COLOURS.lightSelected
          : 'rgba(59, 130, 246, 0.2)'
        : hover
          ? this.isLight()
            ? COLOURS.lightHover
            : 'rgba(255, 255, 255, 0.06)'
          : 'transparent',
      color: 'inherit',
      cursor: awaiting ? 'pointer' : 'default',
      textAlign: 'left',
      fontSize: '13px',
      opacity: !awaiting && !selected ? 0.4 : 1,
      transition: 'background 80ms, opacity 80ms',
    })
  }

  /**
   * An option's letter badge style.
   * @param option - The option.
   * @returns The style attribute text.
   */
  protected badgeStyle(option: AskUserOption, _index: number): string | null {
    const selected = this.isOptionSelected(option.label)
    const multi = this.askMulti()
    return styleText({
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '22px',
      height: '22px',
      borderRadius: multi ? '6px' : '5px',
      border: `1px solid ${
        selected
          ? this.isLight()
            ? COLOURS.lightBadgeBorder
            : COLOURS.lightBadge
          : this.borderColour()
      }`,
      background: selected
        ? this.isLight()
          ? COLOURS.lightBadge
          : COLOURS.darkBadge
        : this.isLight()
          ? COLOURS.white
          : 'rgba(255, 255, 255, 0.08)',
      color: selected ? COLOURS.white : this.isLight() ? COLOURS.lightMuted : COLOURS.darkMuted,
      fontSize: '11px',
      fontWeight: 600,
      flexShrink: 0,
      fontFamily: MONO,
    })
  }

  /**
   * An option's badge text: its letter, or a checkmark once picked in multi-select.
   * @param option - The option.
   * @param index - The option's position.
   * @returns The badge's text.
   */
  protected badgeText(option: AskUserOption, index: number): string {
    return this.askMulti() && this.isOptionSelected(option.label)
      ? '✓'
      : String.fromCharCode(65 + index)
  }

  /**
   * The narrow-screen preview toggle's style.
   * @param index - The option's position.
   * @returns The style attribute text.
   */
  protected optionPreviewStyle(index: number): string | null {
    const expanded = this.previewOpenIdx() === index
    return styleText({
      flexShrink: 0,
      width: '36px',
      // `border: 'none'` + a top (when not the first row) and a left override,
      // serialized the way the CSSOM lands them.
      borderColor:
        index > 0
          ? `${this.borderColour()} currentcolor currentcolor ${this.borderColour()}`
          : `currentcolor currentcolor currentcolor ${this.borderColour()}`,
      borderImage: 'none',
      borderStyle: index > 0 ? 'solid none none solid' : 'none none none solid',
      borderWidth: index > 0 ? '1px medium medium 1px' : 'medium medium medium 1px',
      background: expanded
        ? this.isLight()
          ? COLOURS.lightHover
          : 'rgba(255, 255, 255, 0.06)'
        : 'transparent',
      color: 'inherit',
      cursor: this.askAwaiting() ? 'pointer' : 'default',
      fontSize: '14px',
      opacity: 0.7,
      transform: expanded ? 'rotate(90deg)' : 'none',
      transition: 'transform 80ms',
    })
  }

  /**
   * The inline (narrow) preview box's style.
   * @returns The style attribute text.
   */
  protected inlinePreviewStyle(): string | null {
    return styleText({
      borderTop: `1px solid ${this.borderColour()}`,
      background: this.isLight() ? COLOURS.white : 'rgba(255, 255, 255, 0.03)',
      padding: '8px 12px',
      maxHeight: '240px',
      overflowY: 'auto',
      fontSize: '12px',
    })
  }

  /**
   * The options column's style (it narrows beside a wide preview pane).
   * @returns The style attribute text.
   */
  protected optionsColumnStyle(): string | null {
    return styleText({
      flex: this.askHasPreviews() && !this.isNarrow() ? '1 1 55%' : '1 1 100%',
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
    })
  }

  /**
   * The wide preview pane's style.
   * @returns The style attribute text.
   */
  protected previewPaneStyle(): string | null {
    return styleText({
      flex: '1 1 45%',
      minWidth: 0,
      borderLeft: `1px solid ${this.borderColour()}`,
      display: 'flex',
      flexDirection: 'column',
      background: this.isLight() ? COLOURS.white : 'rgba(255, 255, 255, 0.03)',
    })
  }

  /**
   * The preview pane's header style (the selected option's label, pinned).
   * @returns The style attribute text.
   */
  protected previewHeaderStyle(): string | null {
    return styleText({
      padding: '6px 12px',
      fontSize: '11px',
      fontWeight: 600,
      opacity: 0.6,
      borderBottom: `1px solid ${this.borderColour()}`,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    })
  }

  /**
   * The option whose preview the pane shows: hovered/focused, else picked, else
   * the first with a preview.
   * @returns The option, or undefined.
   */
  protected previewOption(): AskUserOption | undefined {
    const options = this.askOptions()
    const candidate = this.hoveredIdx() ?? this.previewOpenIdx()
    if (candidate != null && options[candidate]?.preview) return options[candidate]
    const picked = options.findIndex((option) => this.isOptionSelected(option.label))
    if (picked >= 0 && options[picked].preview) return options[picked]
    const first = options.findIndex((option) => option.preview)
    return first >= 0 ? options[first] : undefined
  }

  /**
   * The preview pane's title (the option's label, else the generic word).
   * @returns The title.
   */
  protected previewPaneTitle(): string {
    const option = this.previewOption()
    return (
      option?.label ?? this.t('ide.chat.askUserPreview', undefined, { defaultValue: 'Preview' })
    )
  }

  /**
   * The multi-select confirm row's style.
   * @returns The style attribute text.
   */
  protected multiConfirmStyle(): string | null {
    return styleText({
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '8px',
      alignItems: 'center',
      padding: '8px 12px',
      borderTop: `1px solid ${this.borderColour()}`,
    })
  }

  /**
   * The multi-select picked count.
   * @returns The translated count line.
   */
  protected multiCountText(): string {
    return this.t('ide.chat.askUserSelectedCount', undefined, {
      defaultValue: '{{count}} selected',
      count: this.multiPicks().length,
    })
  }

  /**
   * The multi-select confirm button's class.
   * @returns The resolved classes.
   */
  protected multiConfirmClass(): string {
    return this.cm.cn(
      this.cm.button({ variant: 'solid', color: 'primary', size: 'xs' }),
      this.cm.touchTargetCompact,
    )
  }

  /**
   * The free-text answer row's style.
   * @returns The style attribute text.
   */
  protected freeTextRowStyle(): string | null {
    return styleText({
      display: 'flex',
      gap: '4px',
      padding: '8px 12px',
      borderTop: `1px solid ${this.borderColour()}`,
    })
  }

  /**
   * The free-text field's style.
   * @returns The style attribute text.
   */
  protected freeTextStyle(): string | null {
    return styleText({
      flex: '1 1 0%',
      minWidth: 0,
      height: '26px',
      padding: '0px 8px',
      borderRadius: '3px',
      border: `1px solid ${this.borderColour()}`,
      background: 'transparent',
      color: 'inherit',
      // Deliberate iOS-zoom guard: a focused input below 16px makes iOS Safari
      // zoom the whole page on phone-width / touch-first viewports.
      fontSize: this.isNarrow() || this.isCoarse() ? '16px' : '13px',
      outline: 'none',
    })
  }

  /**
   * The free-text answer's style (shown under the options it was not part of).
   * @returns The style attribute text.
   */
  protected freeTextAnswerStyle(): string | null {
    return styleText({
      padding: '8px 12px',
      borderTop: `1px solid ${this.borderColour()}`,
      fontSize: '12px',
      fontStyle: 'italic',
    })
  }

  /**
   * The question's hint-line style.
   * @returns The style attribute text.
   */
  protected hintStyle(): string | null {
    return styleText({
      padding: '8px 12px',
      borderTop: `1px solid ${this.borderColour()}`,
      fontSize: '11px',
      fontStyle: 'italic',
      opacity: 0.5,
    })
  }

  /**
   * The free-text field's placeholder.
   * @returns The translated placeholder.
   */
  protected freeTextPlaceholder(): string {
    return this.askOptions().length === 0
      ? this.t('ide.chat.askUserPlaceholderEmpty', undefined, {
          defaultValue: 'Type your answer…',
        })
      : this.t('ide.chat.askUserPlaceholder', undefined, { defaultValue: 'Or type your own…' })
  }

  /**
   * The free-text submit button's class.
   * @returns The resolved classes.
   */
  protected freeTextSubmitClass(): string {
    return this.cm.cn(
      this.cm.button({ variant: 'solid', color: 'primary', size: 'xs' }),
      this.cm.touchTargetCompact,
      this.cm.shrink0,
    )
  }

  /**
   * Reads the free-text field, keeping its `value` ATTRIBUTE in step with the
   * property (React's controlled-input semantics).
   * @param event - The native input event.
   */
  protected onFreeText(event: Event): void {
    const value = (event.target as HTMLInputElement).value
    this.freeText.set(value)
    ;(event.target as HTMLInputElement).setAttribute('value', value)
  }

  /**
   * Enter in the free-text field submits the answer.
   * @param event - The native key event.
   */
  protected onFreeTextKey(event: KeyboardEvent): void {
    if (event.key !== 'Enter') return
    this.submitFreeText()
  }

  /** Sends the trimmed free-text answer, then clears the field. */
  protected submitFreeText(): void {
    const answer = this.freeText().trim()
    if (!answer || !this.onAskUserResponse) return
    this.localAnswer.set(answer)
    this.onAskUserResponse(answer)
    this.freeText.set('')
  }

  /**
   * Toggles an option's inline preview on a narrow screen.
   * @param index - The option's position.
   */
  protected togglePreview(index: number): void {
    this.previewOpenIdx.set(this.previewOpenIdx() === index ? null : index)
  }

  /**
   * Focuses an option (it becomes the preview pane's candidate).
   * @param index - The option's position.
   */
  protected focusOption(index: number): void {
    if (this.askAwaiting()) this.hoveredIdx.set(index)
  }

  /**
   * Hovers an option (it becomes the preview pane's candidate).
   * @param index - The option's position.
   */
  protected hoverOption(index: number): void {
    if (this.askAwaiting()) this.hoveredIdx.set(index)
  }

  /**
   * Picks a single-select option, or toggles a multi-select pick.
   * @param option - The option clicked.
   */
  protected pickOption(option: AskUserOption): void {
    if (this.onAskUserResponse == null) return
    if (this.askMulti()) {
      this.multiPicks.update((picks) =>
        picks.includes(option.label)
          ? picks.filter((pick) => pick !== option.label)
          : [...picks, option.label],
      )
      return
    }
    this.localAnswer.set(option.label)
    this.onAskUserResponse(option.label)
  }

  /**
   * Submits the picked labels of a multi-select question as one `'; '`-joined answer.
   */
  protected confirmMulti(): void {
    const picks = this.multiPicks()
    if (picks.length === 0 || !this.onAskUserResponse) return
    this.localAnswer.set(picks.join('; '))
    this.onAskUserResponse(picks.join('; '))
  }

  /**
   * A plan-review CTA's class (the first decision is the primary one).
   * @param index - The CTA's position.
   * @returns The resolved classes.
   */
  protected ctaClass(index: number): string {
    return this.cm.cn(
      this.cm.button(
        index === 0
          ? { variant: 'solid', color: 'primary', size: 'xs' }
          : { variant: 'solid', color: 'secondary', size: 'xs' },
      ),
      this.cm.touchTargetCompact,
    )
  }

  /**
   * A plan-review CTA's inline style.
   * @param option - The CTA's option.
   * @returns The style attribute text.
   */
  protected ctaStyle(option: AskUserOption): string | null {
    const picked = this.selectedAnswer() === option.label
    return styleText({
      flex: this.isNarrow() ? '1 1 100%' : '1 1 auto',
      // The "you picked this" ring is the theme's success colour, not a green.
      ...(picked
        ? {
            outline: '2px solid var(--mol-color-success, #16a34a)',
            outlineOffset: '1px',
          }
        : {}),
    })
  }

  /**
   * A plan-review CTA's text (a picked decision carries a tick).
   * @param option - The CTA's option.
   * @returns The CTA's text.
   */
  protected ctaText(option: AskUserOption): string {
    return this.selectedAnswer() === option.label ? `✓ ${option.label}` : option.label
  }

  /**
   * Picks a plan-review decision.
   * @param option - The decision clicked.
   */
  protected pickCta(option: AskUserOption): void {
    if (this.onAskUserResponse == null) return
    this.localAnswer.set(option.label)
    this.onAskUserResponse(option.label)
  }

  /**
   * The plan-review header's style.
   * @returns The style attribute text.
   */
  protected planHeaderStyle(): string | null {
    return styleText({
      // React writes `10px 12px 10px`; the CSSOM collapses it to `10px 12px`.
      padding: '10px 12px',
      fontSize: '13px',
      borderBottom: `1px solid ${this.borderColour()}`,
    })
  }

  /**
   * The plan's display name (its own, else its file name, else the generic word).
   * @param plan - The plan metadata.
   * @returns The title.
   */
  protected planTitle(plan: AskUserPlanReview): string {
    return (
      plan.name ||
      (plan.path ? basename(plan.path) : '') ||
      this.t('ide.chat.planReview.fallbackTitle', undefined, {
        defaultValue: 'Implementation plan',
      })
    )
  }

  /**
   * The plan's step-count row style.
   * @param plan - The plan metadata.
   * @returns The style attribute text.
   */
  protected planStepsStyle(plan: AskUserPlanReview): string | null {
    return styleText({
      ...this.planStepsBase(),
      marginBottom: plan.preview.length > 0 ? '8px' : 0,
    })
  }

  /**
   * The step-count row's static declarations.
   * @returns The declarations, as an object.
   */
  private planStepsBase(): Record<string, unknown> {
    return { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', opacity: 0.75 }
  }

  /**
   * The plan's step count.
   * @param plan - The plan metadata.
   * @returns The translated count.
   */
  protected planStepsText(plan: AskUserPlanReview): string {
    return this.t(
      'ide.chat.planReview.steps',
      { count: plan.steps },
      { defaultValue: '{{count}} steps' },
    )
  }

  /**
   * The "goes live" line's style.
   * @param plan - The plan metadata.
   * @returns The style attribute text.
   */
  protected planGoesLiveStyle(plan: AskUserPlanReview): string | null {
    return styleText({
      fontSize: '12px',
      opacity: 0.75,
      marginTop: plan.preview.length > 0 ? 0 : '8px',
      marginBottom: plan.preview.length > 0 ? '8px' : 0,
    })
  }

  /**
   * The "+N more steps" line.
   * @param plan - The plan metadata.
   * @returns The translated line.
   */
  protected planMoreText(plan: AskUserPlanReview): string {
    return this.t(
      'ide.chat.planReview.more',
      { count: plan.steps - plan.preview.length },
      { defaultValue: '+ {{count}} more steps' },
    )
  }

  /**
   * Opens the plan file from the plan-review header.
   * @param path - The plan file's path.
   */
  protected openPlanFile(path: string): void {
    this.onFileOpen?.(path)
  }

  /**
   * A headline action's class string.
   * @returns The resolved classes.
   */
  protected primaryAction(): string {
    return this.cm.cn(
      this.cm.button({ variant: 'solid', color: 'primary', size: 'xs' }),
      this.cm.touchTargetCompact,
      this.cm.shrink0,
    )
  }
}
