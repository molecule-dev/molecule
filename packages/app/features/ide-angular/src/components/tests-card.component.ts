/**
 * `/test` browser — the project's own tests, listed and runnable from the chat.
 *
 * Angular counterpart of `@molecule/app-ide-react`'s `TestsCard` (see that
 * file for the design notes): the same inputs (React prop names), the same DOM
 * for the same input, the same callbacks. Rows are grouped End-to-end then
 * Unit, and within a kind by the project directory that owns them; a running
 * row names the test on screen with a live per-file tally; the Skip control
 * drops the command the run is on without ending the run. The card is
 * PRESENTATIONAL — the list and the in-flight run live in the host, so a run
 * keeps streaming while the overlay is closed and re-opened.
 *
 * The internal group and row sub-components stay module-local (React renders
 * them internally too). Inputs are declared the way the kit's other Angular
 * feature components declare them — one plain field per React prop, named in
 * the decorator's `inputs` array — and every derived value is a method the
 * template reads, so each change-detection pass renders the current state the
 * way React's render does. Styling uses `getClassMap()` (`cm.*`); the only
 * inline styles are layout the ClassMap can't express, serialized through
 * `styleText` the way React writes numbers (`26` → `26px`). All user-facing
 * text goes through `t()`.
 *
 * @module
 */

import { Component, type ElementRef, type OnInit, ViewChild } from '@angular/core'

import { useTranslation, type UseTranslationResult } from '@molecule/app-angular'
import type {
  TestCaseProgress,
  TestFailure,
  TestGroup,
  TestItem,
  TestKind,
  TestResultEntry,
  TestSelection,
  TestsRunState,
  TestStatus,
} from '@molecule/app-ide-panel-logic'
import {
  canSkipRun,
  chatCardStyle,
  countByKind,
  currentRunRowId,
  EMPTY_RUN_STATE,
  failedTests,
  filterTests,
  groupTests,
  isRowRunning,
  summarizeResults,
  testCaseLabel,
  testRowLabel,
} from '@molecule/app-ide-panel-logic'
import { runningLabel } from '@molecule/app-ide-panel-logic/panels'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { styleText } from '@molecule/app-ui-angular'

/**
 * The card's button vocabulary, which is the command cards' vocabulary (see
 * molecule DESIGN.md → Command cards). Every ACTION is a button that LOOKS
 * like a button — a filled or bordered box, never text on transparent: the
 * one headline action, every other action (Run e2e/unit/group, a row Run, Fix
 * with Synthase), and Stop in the design system's error colour; `ghost` is
 * reserved for the Show/Hide output toggles.
 *
 * @param cm - The active ClassMap.
 * @returns The resolved class string for the headline action.
 */
const PRIMARY_ACTION = (cm: ReturnType<typeof getClassMap>): string =>
  cm.cn(cm.button({ variant: 'solid', color: 'primary', size: 'xs' }), cm.touchTargetCompact)

/**
 * A secondary action — the same filled `xs` button every action on this card
 * uses, so a row of Run buttons reads as a row of buttons.
 *
 * @param cm - The active ClassMap.
 * @returns The resolved class string.
 */
const SECONDARY_ACTION = (cm: ReturnType<typeof getClassMap>): string =>
  cm.cn(cm.button({ variant: 'solid', color: 'primary', size: 'xs' }), cm.touchTargetCompact)

/**
 * The destructive action (Stop), in the design system's error colour.
 *
 * @param cm - The active ClassMap.
 * @returns The resolved class string.
 */
const DESTRUCTIVE_ACTION = (cm: ReturnType<typeof getClassMap>): string =>
  cm.cn(cm.button({ variant: 'solid', color: 'error', size: 'xs' }), cm.touchTargetCompact)

/**
 * A disclosure toggle — the one place `ghost` belongs (Show/Hide output).
 *
 * @param cm - The active ClassMap.
 * @returns The resolved class string.
 */
const QUIET_TOGGLE = (cm: ReturnType<typeof getClassMap>): string =>
  cm.cn(cm.button({ variant: 'ghost', size: 'xs' }), cm.touchTargetCompact)

/** Discovery status for the tests list — mirrors the React card's. */
export type TestsStatus = 'loading' | 'ready' | 'error' | 'unavailable'

/** Props for `TestsCard` — the React prop names, React's own contract. */
export interface TestsCardProps {
  /** Every discovered test (unfiltered). */
  tests: TestItem[]
  /** How the listing went. */
  status: TestsStatus
  /** The run this card is showing — owned by the panel, so it survives a close. */
  run: TestsRunState
  /** Seeds the search box from `/test <query>`. */
  initialQuery: string
  /** Whether this viewer may run tests at all (a viewer may not). */
  canRun: boolean
  /** Runs a selection. */
  onRun: (selection: TestSelection) => void
  /** Stops the run in flight — the whole run, every remaining file. */
  onCancel: () => void
  /**
   * Skips the command the run is on right now, WITHOUT ending it: that file
   * comes back `Skipped` and the run moves to the next one. Omitted by a host
   * that does not serve skipping — then no Skip control is rendered.
   */
  onSkipCurrent?: () => void
  /**
   * Hands the failing tests to the agent as ONE chat message — a real turn it
   * answers, exactly like the editor’s “Fix with AI”.
   */
  onFix: (failures: TestFailure[]) => void
  /**
   * Why fixing is unavailable (a viewer, a turn already streaming), already
   * translated by the host — `null` when it is available. The card states the
   * reason on the disabled button rather than letting a click do nothing.
   */
  fixDisabledReason: string | null
  /** Light theme (drives the same row border + field inset the sibling cards use). */
  isLight: boolean
  /** Chrome-less inside the command overlay; full card chrome in the timeline. */
  embedded?: boolean
  /** The agent's display name, for a run the agent started. */
  agentName?: string
}

/**
 * Human label for a kind.
 *
 * @param t - The translation function from `useTranslation()`.
 * @param kind - The kind.
 * @returns The translated label.
 */
function kindLabel(t: UseTranslationResult['t'], kind: TestKind): string {
  return kind === 'e2e'
    ? t('ide.tests.kind.e2e', undefined, { defaultValue: 'End-to-end' })
    : t('ide.tests.kind.unit', undefined, { defaultValue: 'Unit' })
}

/**
 * The heading for one group: its kind and the directory that owns it. The
 * workspace ROOT has no name of its own, so it gets the generic word.
 *
 * @param t - The translation function from `useTranslation()`.
 * @param group - The group.
 * @returns The heading text.
 */
function groupHeading(t: UseTranslationResult['t'], group: TestGroup): string {
  const where = group.label ?? t('ide.tests.workspace.root', undefined, { defaultValue: 'Project' })
  return `${kindLabel(t, group.kind)} · ${where}`
}

/**
 * The short label a status pill shows.
 *
 * @param t - The translation function from `useTranslation()`.
 * @param status - The status.
 * @returns The translated label.
 */
function statusLabel(t: UseTranslationResult['t'], status: TestStatus): string {
  if (status === 'passed') return t('ide.tests.statusPassed', undefined, { defaultValue: 'Passed' })
  if (status === 'failed') return t('ide.tests.statusFailed', undefined, { defaultValue: 'Failed' })
  return t('ide.tests.statusSkipped', undefined, { defaultValue: 'Skipped' })
}

/**
 * The ids of every listed test of one kind.
 *
 * @param tests - The (filtered) tests.
 * @param kind - The kind to select.
 * @returns Their ids.
 */
function idsOfKind(tests: readonly TestItem[], kind: TestKind): string[] {
  return tests.filter((test) => test.kind === kind).map((test) => test.id)
}

/**
 * The card's inline-style texts that never change, serialized once with
 * `styleText` (React's camelCase numbers become `px` exactly the way React
 * writes them; the conformance normalizer sorts declarations, so key order is
 * free).
 */
const STYLES = {
  /** The header row: title area left, actions right, wrapping. */
  headerRow: styleText({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 6,
    flexWrap: 'wrap',
  }),
  /** The title area left of the header (an empty flex child when embedded). */
  titleArea: styleText({ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }),
  /** The actions row right of the header. */
  actionsRow: styleText({ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }),
  /** Every action button and status pill: pinned against wrapping. */
  shrink: styleText({ flexShrink: 0 }),
  /** The card heading (`Tests`). */
  heading: styleText({ flexShrink: 0 }),
  /** The header's running pill. */
  runningPill: styleText({ display: 'inline-flex', alignItems: 'center', gap: 4 }),
  /** A row's running pill (pinned against wrapping, unlike the header's). */
  runningRowPill: styleText({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  }),
  /** The collapsed summary beside the heading. */
  summary: styleText({ display: 'inline-flex', alignItems: 'center', gap: 6 }),
  /** The external run's command line. */
  command: styleText({
    fontFamily: 'var(--mol-font-mono, monospace)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    marginBottom: 6,
  }),
  /** The listing states' rows (loading, unavailable, error, empty). */
  state: styleText({ padding: '6px 0px' }),
  /** The blocks below the listing (output area, run error, end states). */
  marginTop: styleText({ marginTop: 6 }),
  /** A group's header row. */
  groupHeaderRow: styleText({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap',
  }),
  /** A group's heading text, truncating rather than pushing the Run out. */
  minWidth: styleText({ minWidth: 0 }),
  /** A test row. */
  row: styleText({ padding: '4px 0px' }),
  /** A test row's single line of controls. */
  rowLine: styleText({ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }),
  /** A row's file label, truncating rather than pushing the Run out. */
  fileLabel: styleText({
    flex: '1 1 140px',
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontFamily: 'var(--mol-font-mono, monospace)',
  }),
  /** The per-test detail line beneath a running row. */
  caseRow: styleText({
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    minWidth: 0,
    lineHeight: 1.4,
  }),
  /** The per-test detail's title, truncating rather than pushing the tally out. */
  caseTitle: styleText({
    flex: '1 1 140px',
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  }),
  /** The per-test detail's live tally. */
  tally: styleText({ display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }),
  /** A failed row's actions line (toggle + fix). */
  failureRow: styleText({ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }),
} as const

/**
 * One test file: its label, its last status pill, a Run button, and — when it
 * FAILED — the runner's output kept underneath. While the file is RUNNING it
 * also names the test on screen (its group and title) with a live tally.
 * Internal to the card.
 */
@Component({
  selector: 'div[mol-tests-card-row]',
  standalone: true,
  inputs: [
    'item',
    'result',
    'running',
    'progress',
    'runnable',
    'disabledReason',
    'rowBorder',
    'onRun',
    'onFix',
    'fixable',
    'fixDisabledReason',
    'skippable',
    'skipPending',
    'skipDisabledReason',
    'onSkipCurrent',
  ],
  host: {
    '[attr.data-mol-id]': 'dataId()',
    '[attr.style]': 's.row',
  },
  // prettier-ignore
  template: `<div [attr.style]="s.rowLine">
      <div [class]="cm.textMuted" [attr.title]="item.file" [attr.style]="s.fileLabel">{{ rowLabel() }}</div>
      @if (running) {<span [attr.data-mol-id]="statusId()" [class]="cm.textMuted" [attr.style]="s.runningRowPill"><span [class]="cm.spinner({ size: 'xs' })" aria-hidden="true"></span>{{ runningText() }}</span>} @else if (result; as verdict) {<span [attr.data-mol-id]="statusId()" [class]="statusClass(verdict.status)" [attr.style]="s.shrink">{{ statusText(verdict.status) }}</span>}
      @if (skippable) {<button type="button" [attr.data-mol-id]="skipId()" (click)="skip()" [disabled]="skipDisabled()" [attr.title]="skipDisabledReason ?? null" [class]="secondaryAction()" [attr.style]="s.shrink">{{ skipText() }}</button>}
      <button type="button" [attr.data-mol-id]="runId()" (click)="runOne()" [disabled]="!runnable" [attr.title]="disabledReason ?? null" [class]="secondaryAction()" [attr.style]="s.shrink">{{ t('ide.tests.run', undefined, { defaultValue: 'Run' }) }}</button>
    </div>
    @if (running && (caseLabel() !== '' || caseTally() > 0)) {<div [attr.data-mol-id]="caseId()" [class]="cm.textMuted" [attr.style]="s.caseRow">@if (caseLabel() !== '') {<span [attr.data-mol-id]="caseTitleId()" [attr.title]="caseLabel()" [attr.style]="s.caseTitle">{{ caseLabel() }}</span>}@if (caseTally() > 0) {<span [attr.data-mol-id]="caseTallyId()" [attr.style]="s.tally">@if ((progress?.passed ?? 0) > 0) {<span [class]="cm.textSuccess">{{ passedCount() }}</span>}@if ((progress?.failed ?? 0) > 0) {<span [class]="cm.textError">{{ failedCount() }}</span>}@if ((progress?.skipped ?? 0) > 0) {<span>{{ skippedCount() }}</span>}</span>}</div>}
    @if (result; as verdict) {@if (verdict.status === 'failed') {<div [attr.style]="s.failureRow">@if (verdict.output) {<button type="button" [attr.data-mol-id]="failureToggleId()" [attr.aria-expanded]="showFailure ? 'true' : 'false'" (click)="toggleFailure()" [class]="quietAction()" [attr.style]="s.shrink">{{ showFailure ? t('ide.tests.hideOutput', undefined, { defaultValue: 'Hide output' }) : t('ide.tests.showOutput', undefined, { defaultValue: 'Show output' }) }}</button>}<button type="button" [attr.data-mol-id]="fixId()" (click)="fixRow()" [disabled]="!fixable" [attr.title]="fixDisabledReason ?? null" [class]="secondaryAction()" [attr.style]="s.shrink">{{ t('ide.tests.fixWithSynthase', undefined, { defaultValue: 'Fix with Synthase' }) }}</button></div>@if (verdict.output && showFailure) {<pre [attr.data-mol-id]="failureId()" [class]="cm.textSize('xs')" [attr.style]="failureStyle()">{{ verdict.output }}</pre>}}}`,
})
class TestsCardRow {
  /** The test this row renders. */
  item!: TestItem

  /** The file's verdict from the run on show; `undefined` before it reports. */
  result?: TestResultEntry

  /** Whether this file is part of the live run and still undecided. */
  running = false

  /** Live per-test progress while this file runs; `undefined` once it ends. */
  progress?: TestCaseProgress

  /** Whether the viewer may run tests at all. */
  runnable = false

  /** Why the run controls are dead, already translated; `null` when they live. */
  disabledReason: string | null = null

  /** The theme's row border colour. */
  rowBorder = 'rgba(255, 255, 255, 0.08)'

  /** Runs a selection. */
  onRun: (selection: TestSelection) => void = () => {}

  /** Hands failures to the agent as one chat message. */
  onFix: (failures: TestFailure[]) => void = () => {}

  /** Whether fixing is available. */
  fixable = false

  /** Why fixing is unavailable, already translated; `null` when it is. */
  fixDisabledReason: string | null = null

  /** This is the row the run is on, so it is the row that carries the Skip. */
  skippable = false

  /** A skip has been asked for and the run has not answered yet. */
  skipPending = false

  /** Why this viewer cannot skip, already translated; `null` when they can. */
  skipDisabledReason: string | null = null

  /**
   * Skips the command the run is on right now. `undefined` by a host that
   * does not serve skipping.
   */
  onSkipCurrent?: () => void

  /** The bonded ClassMap (styling tokens resolve at render time). */
  protected readonly cm: UIClassMap = getClassMap()

  /** Reactive translation, read in the injection context. */
  protected readonly i18n = useTranslation()

  /** The translation function for the template. */
  protected readonly t = this.i18n.t

  /** The static style texts. */
  protected readonly s = STYLES

  // A failure's output starts COLLAPSED — the status pill says what happened;
  // the detail is one click away for whoever wants it.
  /** Whether the failure's output block is open. */
  protected showFailure = false

  /**
   * The row's `data-mol-id`.
   * @returns The attribute value.
   */
  protected dataId(): string {
    return `tests-card-row-${this.item.id}`
  }

  /**
   * The status pill's `data-mol-id`.
   * @returns The attribute value.
   */
  protected statusId(): string {
    return `tests-card-status-${this.item.id}`
  }

  /**
   * The Skip button's `data-mol-id`.
   * @returns The attribute value.
   */
  protected skipId(): string {
    return `tests-card-skip-${this.item.id}`
  }

  /**
   * The row Run button's `data-mol-id`.
   * @returns The attribute value.
   */
  protected runId(): string {
    return `tests-card-run-${this.item.id}`
  }

  /**
   * The per-test detail line's `data-mol-id`.
   * @returns The attribute value.
   */
  protected caseId(): string {
    return `tests-card-case-${this.item.id}`
  }

  /**
   * The per-test title's `data-mol-id`.
   * @returns The attribute value.
   */
  protected caseTitleId(): string {
    return `tests-card-case-title-${this.item.id}`
  }

  /**
   * The per-test tally's `data-mol-id`.
   * @returns The attribute value.
   */
  protected caseTallyId(): string {
    return `tests-card-case-tally-${this.item.id}`
  }

  /**
   * The failure toggle's `data-mol-id`.
   * @returns The attribute value.
   */
  protected failureToggleId(): string {
    return `tests-card-failure-toggle-${this.item.id}`
  }

  /**
   * The row fix button's `data-mol-id`.
   * @returns The attribute value.
   */
  protected fixId(): string {
    return `tests-card-fix-${this.item.id}`
  }

  /**
   * The failure output block's `data-mol-id`.
   * @returns The attribute value.
   */
  protected failureId(): string {
    return `tests-card-failure-${this.item.id}`
  }

  /**
   * The label for the row: the host's title, else the file path.
   * @returns The label.
   */
  protected rowLabel(): string {
    return testRowLabel(this.item)
  }

  /**
   * The row's running label.
   * @returns The translated label.
   */
  protected runningText(): string {
    return this.t('ide.tests.running', undefined, { defaultValue: 'Running…' })
  }

  /**
   * The test on screen right now, named the way its runner names it.
   * @returns The label, or `` when nothing is named.
   */
  protected caseLabel(): string {
    return testCaseLabel(this.progress?.current)
  }

  /**
   * How this file's tests have gone so far while it runs.
   * @returns The decided-so-far count.
   */
  protected caseTally(): number {
    return (
      (this.progress?.passed ?? 0) + (this.progress?.failed ?? 0) + (this.progress?.skipped ?? 0)
    )
  }

  /**
   * The live tally's passed fragment.
   * @returns The translated fragment.
   */
  protected passedCount(): string {
    return this.t(
      'ide.tests.passedCount',
      { count: this.progress?.passed ?? 0 },
      { defaultValue: '{{count}} passed' },
    )
  }

  /**
   * The live tally's failed fragment.
   * @returns The translated fragment.
   */
  protected failedCount(): string {
    return this.t(
      'ide.tests.failedCount',
      { count: this.progress?.failed ?? 0 },
      { defaultValue: '{{count}} failed' },
    )
  }

  /**
   * The live tally's skipped fragment.
   * @returns The translated fragment.
   */
  protected skippedCount(): string {
    return this.t(
      'ide.tests.skippedCount',
      { count: this.progress?.skipped ?? 0 },
      { defaultValue: '{{count}} skipped' },
    )
  }

  /**
   * Whether the Skip control is dead (a viewer, or a skip already pending).
   * @returns True when it must not take clicks.
   */
  protected skipDisabled(): boolean {
    return this.skipDisabledReason !== null || this.skipPending
  }

  /**
   * The Skip button's text.
   * @returns `Skipping…` while the request is out, `Skip` otherwise.
   */
  protected skipText(): string {
    return this.skipPending
      ? this.t('ide.tests.skipping', undefined, { defaultValue: 'Skipping…' })
      : this.t('ide.tests.skip', undefined, { defaultValue: 'Skip' })
  }

  /**
   * The status pill's text.
   * @param status - The verdict.
   * @returns The translated label.
   */
  protected statusText(status: TestStatus): string {
    return statusLabel(this.t, status)
  }

  /**
   * The status pill's class: success, error or muted.
   * @param status - The verdict.
   * @returns The ClassMap token.
   */
  protected statusClass(status: TestStatus): string {
    return status === 'passed'
      ? this.cm.textSuccess
      : status === 'failed'
        ? this.cm.textError
        : this.cm.textMuted
  }

  /**
   * A secondary action's class string.
   * @returns The resolved classes.
   */
  protected secondaryAction(): string {
    return this.cm.cn(SECONDARY_ACTION(this.cm))
  }

  /**
   * A disclosure toggle's class string.
   * @returns The resolved classes.
   */
  protected quietAction(): string {
    return this.cm.cn(QUIET_TOGGLE(this.cm))
  }

  /**
   * The failure output block's inline style.
   * @returns The style attribute text.
   */
  protected failureStyle(): string | null {
    return styleText({
      margin: '4px 0px 0px',
      padding: '6px 8px',
      borderRadius: 4,
      border: `1px solid ${this.rowBorder}`,
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
      maxHeight: 200,
      overflow: 'auto',
      fontFamily: 'var(--mol-font-mono, monospace)',
    })
  }

  /**
   * Skips the command the run is on (React wraps `onSkipCurrent` in an arrow
   * and calls it with NO event argument).
   */
  protected skip(): void {
    this.onSkipCurrent?.()
  }

  /** Runs exactly this row (React calls `onRun` with no event argument). */
  protected runOne(): void {
    this.onRun({ ids: [this.item.id] })
  }

  /**
   * Hands this failure and its output to the agent (React calls `onFix` with
   * no event argument).
   */
  protected fixRow(): void {
    this.onFix([{ item: this.item, output: this.result?.output }])
  }

  /** Shows or hides the failure's output. */
  protected toggleFailure(): void {
    this.showFailure = !this.showFailure
  }
}

/**
 * One group of rows — a heading ("End-to-end · my-app/app"), a Run for the
 * whole group, and a row per test file. Internal to the card.
 */
@Component({
  selector: 'div[mol-tests-card-group]',
  standalone: true,
  imports: [TestsCardRow],
  inputs: [
    'group',
    'run',
    'runnable',
    'disabledReason',
    'rowBorder',
    'onRun',
    'onFix',
    'fixable',
    'fixDisabledReason',
    'skipRowId',
    'skipPending',
    'skipDisabledReason',
    'onSkipCurrent',
  ],
  host: {
    '[attr.data-mol-id]': 'dataId()',
    '[class]': 'cm.borderT',
    '[attr.style]': 'groupStyle()',
  },
  // prettier-ignore
  template: `<div [attr.style]="s.groupHeaderRow">
      <div [class]="cm.cn(cm.fontWeight('medium'))" [attr.style]="s.minWidth">{{ headingText() }}</div>
      <button type="button" [attr.data-mol-id]="runGroupId()" (click)="runGroup()" [disabled]="!runnable" [attr.title]="disabledReason ?? null" [class]="secondaryAction()" [attr.style]="s.shrink">{{ t('ide.tests.runGroup', undefined, { defaultValue: 'Run group' }) }}</button>
    </div>
    @for (item of group.items; track item.id) {<div mol-tests-card-row [item]="item" [result]="run.results[item.id]" [running]="rowRunning(item.id)" [progress]="run.cases[item.id]" [runnable]="runnable" [disabledReason]="disabledReason" [rowBorder]="rowBorder" [onRun]="onRun" [onFix]="onFix" [fixable]="fixable" [fixDisabledReason]="fixDisabledReason" [skippable]="skipRowId === item.id" [skipPending]="skipPending" [skipDisabledReason]="skipDisabledReason" [onSkipCurrent]="onSkipCurrent"></div>}`,
})
class TestsCardGroup {
  /** The group: a kind within a project directory. */
  group!: TestGroup

  /** The run this card is showing. */
  run: TestsRunState = EMPTY_RUN_STATE

  /** Whether the viewer may run tests at all. */
  runnable = false

  /** Why the run controls are dead, already translated; `null` when they live. */
  disabledReason: string | null = null

  /** The theme's row border colour. */
  rowBorder = 'rgba(255, 255, 255, 0.08)'

  /** Runs a selection. */
  onRun: (selection: TestSelection) => void = () => {}

  /** Hands failures to the agent as one chat message. */
  onFix: (failures: TestFailure[]) => void = () => {}

  /** Whether fixing is available. */
  fixable = false

  /** Why fixing is unavailable, already translated; `null` when it is. */
  fixDisabledReason: string | null = null

  /** The one row that carries a Skip control, or `null` when none does. */
  skipRowId: string | null = null

  /** A skip has been asked for and the run has not answered yet. */
  skipPending = false

  /** Why this viewer cannot skip, already translated; `null` when they can. */
  skipDisabledReason: string | null = null

  /** Skips the command the run is on; `undefined` when the host serves none. */
  onSkipCurrent?: () => void

  /** The bonded ClassMap (styling tokens resolve at render time). */
  protected readonly cm: UIClassMap = getClassMap()

  /** Reactive translation, read in the injection context. */
  protected readonly i18n = useTranslation()

  /** The translation function for the template. */
  protected readonly t = this.i18n.t

  /** The static style texts. */
  protected readonly s = STYLES

  /**
   * The group's `data-mol-id` suffix (`e2e-my-app/app`).
   * @returns The suffix.
   */
  protected groupId(): string {
    return `${this.group.kind}-${this.group.workspace}`
  }

  /**
   * The group's `data-mol-id`.
   * @returns The attribute value.
   */
  protected dataId(): string {
    return `tests-card-group-${this.groupId()}`
  }

  /**
   * The group Run button's `data-mol-id`.
   * @returns The attribute value.
   */
  protected runGroupId(): string {
    return `tests-card-run-group-${this.groupId()}`
  }

  /**
   * The heading: kind and owning directory.
   * @returns The translated heading.
   */
  protected headingText(): string {
    return groupHeading(this.t, this.group)
  }

  /**
   * The group's inline style (the row rhythm above, in the theme's colour).
   * @returns The style attribute text.
   */
  protected groupStyle(): string | null {
    return styleText({ padding: '6px 0px', borderColor: this.rowBorder })
  }

  /**
   * A secondary action's class string.
   * @returns The resolved classes.
   */
  protected secondaryAction(): string {
    return this.cm.cn(SECONDARY_ACTION(this.cm))
  }

  /**
   * Whether one row of this group is running (the run's aggregate, so a
   * parallel file's spinner reflects the live covering runs).
   * @param id - The row's test id.
   * @returns True when the row spins.
   */
  protected rowRunning(id: string): boolean {
    return isRowRunning(this.run, id)
  }

  /** Runs every id in this group (React calls `onRun` with no event argument). */
  protected runGroup(): void {
    this.onRun({ ids: this.group.items.map((item) => item.id) })
  }
}

/**
 * The tests browser shown by `/test`.
 *
 * Rows are grouped End-to-end then Unit, and within a kind by the project
 * directory that owns them (`app`, `my-app/app`, the workspace root last),
 * because a run is invoked from that directory. The run output and every
 * failure's output start COLLAPSED — the status pills carry the state and the
 * output is one click away when someone wants it.
 */
@Component({
  selector: 'div[mol-tests-card]',
  standalone: true,
  imports: [TestsCardGroup],
  inputs: [
    'tests',
    'status',
    'run',
    'initialQuery',
    'canRun',
    'onRun',
    'onCancel',
    'onSkipCurrent',
    'onFix',
    'fixDisabledReason',
    'isLight',
    'embedded',
    'agentName',
  ],
  host: {
    'data-mol-id': 'tests-card',
    '[class]': 'cm.textSize("xs")',
    '[attr.style]': 'rootStyle()',
  },
  // prettier-ignore
  template: `<div [attr.style]="s.headerRow">
      <div [attr.style]="s.titleArea">
        @if (!embedded) {<div [class]="cm.cn(cm.fontWeight('medium'), cm.textSize('sm'))" [attr.style]="s.heading">{{ t('ide.tests.heading', undefined, { defaultValue: 'Tests' }) }}</div>}
        @if (run.running) {<span data-mol-id="tests-card-running" [class]="cm.cn(cm.textMuted, cm.textSize('xs'))" [attr.style]="s.runningPill"><span [class]="cm.spinner({ size: 'xs' })" aria-hidden="true"></span>{{ runningText() }}</span>} @else if (summary().reported > 0) {<span data-mol-id="tests-card-summary" [class]="cm.textSize('xs')" [attr.style]="s.summary">@if (summary().passed > 0) {<span [class]="cm.textSuccess">{{ passedText() }}</span>}@if (summary().failed > 0) {<span [class]="cm.textError">{{ failedText() }}</span>}@if (summary().skipped > 0) {<span data-mol-id="tests-card-summary-skipped" [class]="cm.textMuted">{{ skippedText() }}</span>}</span>}
      </div>
      <div [attr.style]="s.actionsRow">
        @if (counts().e2e > 0 && counts().unit > 0) {<button type="button" data-mol-id="tests-card-run-e2e" (click)="runKind('e2e')" [disabled]="!runnable()" [attr.title]="disabledReason() ?? null" [class]="secondaryAction()" [attr.style]="s.shrink">{{ t('ide.tests.runE2e', undefined, { defaultValue: 'Run e2e' }) }}</button><button type="button" data-mol-id="tests-card-run-unit" (click)="runKind('unit')" [disabled]="!runnable()" [attr.title]="disabledReason() ?? null" [class]="secondaryAction()" [attr.style]="s.shrink">{{ t('ide.tests.runUnit', undefined, { defaultValue: 'Run unit' }) }}</button>}
        @if (!run.running && failures().length > 0) {<button type="button" data-mol-id="tests-card-fix-all" (click)="fixAll()" [disabled]="!fixable()" [attr.title]="fixDisabledReason ?? null" [class]="secondaryAction()" [attr.style]="s.shrink">{{ fixAllText() }}</button>}
        @if (run.running) {@if (!run.external) {<button type="button" data-mol-id="tests-card-cancel" (click)="stop($event)" [class]="destructiveAction()" [attr.style]="s.shrink">{{ t('ide.tests.stop', undefined, { defaultValue: 'Stop' }) }}</button>}} @else if (filtered().length > 0) {<button type="button" data-mol-id="tests-card-run-all" (click)="runAll()" [disabled]="!runnable()" [attr.title]="disabledReason() ?? null" [class]="primaryAction()" [attr.style]="s.shrink">{{ t('ide.tests.runAll', undefined, { defaultValue: 'Run all' }) }}</button>}
      </div>
    </div>
    @if (run.external && run.command) {<div data-mol-id="tests-card-command" [class]="cm.cn(cm.textMuted, cm.textSize('xs'))" [attr.title]="run.command" [attr.style]="s.command">{{ run.command }}</div>}
    <input data-mol-id="tests-card-search" [value]="query" [attr.value]="query" (input)="onSearch($event)" [attr.placeholder]="t('ide.tests.searchPlaceholder', undefined, { defaultValue: 'Filter tests…' })" [class]="cm.textSize('xs')" [attr.style]="searchStyle()" />
    @if (disabledReason() && status !== 'loading') {<div data-mol-id="tests-card-disabled-reason" [class]="cm.textMuted">{{ disabledReason() }}</div>}
    @if (status === 'loading') {<div [class]="cm.textMuted" [attr.style]="s.state">{{ t('ide.tests.loading', undefined, { defaultValue: 'Loading tests…' }) }}</div>}
    @if (status === 'unavailable') {<div data-mol-id="tests-card-unavailable" [class]="cm.textMuted" [attr.style]="s.state">{{ t('ide.tests.waitingForSandbox', undefined, { defaultValue: 'Start the project to see its tests.' }) }}</div>}
    @if (status === 'error') {<div data-mol-id="tests-card-error" [class]="cm.textMuted" [attr.style]="s.state">{{ t('ide.tests.listError', undefined, { defaultValue: 'Could not list this project’s tests.' }) }}</div>}
    @if (status === 'ready' && filtered().length === 0) {<div data-mol-id="tests-card-empty" [class]="cm.textMuted" [attr.style]="s.state">{{ emptyText() }}</div>}
    @if (status === 'ready') {@for (group of groups(); track group.kind + ':' + group.workspace) {<div mol-tests-card-group [group]="group" [run]="run" [runnable]="runnable()" [disabledReason]="disabledReason()" [rowBorder]="rowBorder()" [onRun]="onRun" [onFix]="onFix" [fixable]="fixable()" [fixDisabledReason]="fixDisabledReason" [skipRowId]="skipRowId()" [skipPending]="run.skipPending" [skipDisabledReason]="skipDisabledReason()" [onSkipCurrent]="onSkipCurrent"></div>}}
    @if (run.output.length > 0) {<div data-mol-id="tests-card-output-area" [attr.style]="s.marginTop"><button type="button" data-mol-id="tests-card-output-toggle" [attr.aria-expanded]="showOutput ? 'true' : 'false'" (click)="toggleOutput()" [class]="quietAction()" [attr.style]="s.shrink">{{ showOutput ? t('ide.tests.hideOutput', undefined, { defaultValue: 'Hide output' }) : t('ide.tests.showOutput', undefined, { defaultValue: 'Show output' }) }}</button>@if (showOutput) {<pre #output data-mol-id="tests-card-output" [class]="cm.textSize('xs')" [attr.style]="outputStyle()">{{ outputText() }}</pre>}</div>}
    @if (run.error) {<div data-mol-id="tests-card-run-error" [class]="cm.textError" [attr.style]="s.marginTop">{{ run.error }}</div>}
    @if (!run.running && run.outcome === 'cancelled' && !run.error) {<div data-mol-id="tests-card-cancelled" [class]="cm.textMuted" [attr.style]="s.marginTop">{{ t('ide.tests.cancelled', undefined, { defaultValue: 'Run stopped.' }) }}</div>}
    @if (!run.running && run.outcome === 'skipped-by-user' && !run.error) {<div data-mol-id="tests-card-skipped" [class]="cm.textMuted" [attr.style]="s.marginTop">{{ t('ide.tests.skippedByUser', undefined, { defaultValue: 'Run finished. The tests you skipped did not run.' }) }}</div>}`,
})
export class TestsCard implements OnInit {
  /** Every discovered test (unfiltered). */
  tests: TestItem[] = []

  /** How the listing went. */
  status: TestsStatus = 'ready'

  /** The run this card is showing — owned by the panel, so it survives a close. */
  run: TestsRunState = EMPTY_RUN_STATE

  /** Seeds the search box from `/test <query>` (the FIRST value only). */
  initialQuery = ''

  /** Whether this viewer may run tests at all (a viewer may not). */
  canRun = false

  /** Runs a selection. */
  onRun: (selection: TestSelection) => void = () => {}

  /** Stops the run in flight — the whole run, every remaining file. */
  onCancel: () => void = () => {}

  /**
   * Skips the command the run is on right now, WITHOUT ending it. `undefined`
   * by a host that does not serve skipping — then no Skip control is rendered.
   */
  onSkipCurrent?: () => void

  /**
   * Hands the failing tests to the agent as ONE chat message — a real turn it
   * answers, exactly like the editor’s “Fix with AI”.
   */
  onFix: (failures: TestFailure[]) => void = () => {}

  /**
   * Why fixing is unavailable (a viewer, a turn already streaming), already
   * translated by the host — `null` when it is available.
   */
  fixDisabledReason: string | null = null

  /** Light theme (drives the row border + field inset). */
  isLight = false

  /** Chrome-less inside the command overlay; full card chrome in the timeline. */
  embedded = false

  /** The agent's display name, for a run the agent started. */
  agentName?: string

  /** The bonded ClassMap (styling tokens resolve at render time). */
  protected readonly cm: UIClassMap = getClassMap()

  /** Reactive translation, read in the injection context. */
  protected readonly i18n = useTranslation()

  /** The translation function for the template. */
  protected readonly t = this.i18n.t

  /** The static style texts. */
  protected readonly s = STYLES

  /** The live search query, seeded ONCE from `initialQuery`. */
  protected query = ''

  // The run output starts COLLAPSED. The status pills carry the state and the
  // output is one click away when someone wants it.
  /** Whether the run output block is open. */
  protected showOutput = false

  /** The run output block, when it is open. */
  @ViewChild('output') protected output?: ElementRef<HTMLPreElement>

  /** Seeds the search box once (React's `useState(initialQuery)`). */
  ngOnInit(): void {
    this.query = this.initialQuery
  }

  /**
   * Keep the live output pinned to the newest line unless the reader scrolled
   * up inside the block themselves (React's `useEffect` on
   * `[run.output, showOutput]`). No-ops while it is collapsed (no element).
   */
  ngAfterViewChecked(): void {
    const pre = this.output?.nativeElement
    if (!pre) return
    if (pre.scrollHeight - pre.scrollTop - pre.clientHeight > 40) return
    pre.scrollTop = pre.scrollHeight
  }

  /**
   * The listed tests after the search filter.
   * @returns The matching tests, in input order.
   */
  protected filtered(): TestItem[] {
    return filterTests(this.tests, this.query)
  }

  /**
   * The listed tests, grouped by kind then directory.
   * @returns The groups, in display order.
   */
  protected groups(): TestGroup[] {
    return groupTests(this.filtered())
  }

  /**
   * How many tests there are of each kind (of the LISTED tests).
   * @returns The per-kind counts.
   */
  protected counts(): Record<TestKind, number> {
    return countByKind(this.filtered())
  }

  /**
   * The last run's tallies, over the tests still listed.
   * @returns Passed/failed/skipped file counts.
   */
  protected summary(): { passed: number; failed: number; skipped: number; reported: number } {
    return summarizeResults(this.filtered(), this.run.results)
  }

  /**
   * The listed tests whose last verdict was a failure.
   * @returns The failures, in list order.
   */
  protected failures(): TestFailure[] {
    return failedTests(this.filtered(), this.run.results)
  }

  /**
   * The theme's row border colour.
   * @returns The border colour.
   */
  protected rowBorder(): string {
    return this.isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)'
  }

  /**
   * Why the run controls are dead, stated in the card rather than in a toast
   * that has already gone by the time the person looks.
   * @returns The reason, or `null` when the controls live.
   */
  protected disabledReason(): string | null {
    if (!this.canRun) {
      return this.t('ide.tests.viewerCannotRun', undefined, {
        defaultValue: 'Only editors can run this project’s tests.',
      })
    }
    if (this.status === 'unavailable') {
      return this.t('ide.tests.needsSandbox', undefined, {
        defaultValue: 'Start the project to run its tests.',
      })
    }
    return null
  }

  /**
   * Whether the run controls live (an editor, a ready listing, no live run).
   * @returns True when running is possible.
   */
  protected runnable(): boolean {
    return this.canRun && this.status === 'ready' && !this.run.running
  }

  /**
   * Whether fixing is available.
   * @returns True when the fix actions are enabled.
   */
  protected fixable(): boolean {
    return this.fixDisabledReason === null
  }

  /**
   * The row the Skip acts on. The control exists only while the run is on an
   * identifiable row AND the host serves skipping; a viewer still SEES it,
   * with the reason on it, rather than watching it vanish without explanation.
   * @returns The row's id, or `null`.
   */
  protected skipRowId(): string | null {
    return this.onSkipCurrent && canSkipRun(this.run) ? currentRunRowId(this.run) : null
  }

  /**
   * Why this viewer cannot skip, already translated.
   * @returns The reason, or `null` when they can.
   */
  protected skipDisabledReason(): string | null {
    return !this.canRun
      ? this.t('ide.tests.viewerCannotSkip', undefined, {
          defaultValue: 'Only editors can skip this project’s tests.',
        })
      : null
  }

  /**
   * The header's running label (who started the run, when not this panel).
   * @returns The translated label.
   */
  protected runningText(): string {
    return runningLabel(this.t, this.run, this.agentName)
  }

  /**
   * The summary's passed fragment.
   * @returns The translated fragment.
   */
  protected passedText(): string {
    return this.t(
      'ide.tests.passedCount',
      { count: this.summary().passed },
      {
        defaultValue: '{{count}} passed',
      },
    )
  }

  /**
   * The summary's failed fragment.
   * @returns The translated fragment.
   */
  protected failedText(): string {
    return this.t(
      'ide.tests.failedCount',
      { count: this.summary().failed },
      {
        defaultValue: '{{count}} failed',
      },
    )
  }

  /**
   * The summary's skipped fragment (its OWN number, never a pass).
   * @returns The translated fragment.
   */
  protected skippedText(): string {
    return this.t(
      'ide.tests.skippedCount',
      { count: this.summary().skipped },
      {
        defaultValue: '{{count}} skipped',
      },
    )
  }

  /**
   * The header fix button's text (one failure, or the count).
   * @returns The translated label.
   */
  protected fixAllText(): string {
    return this.failures().length === 1
      ? this.t('ide.tests.fixWithSynthase', undefined, { defaultValue: 'Fix with Synthase' })
      : this.t(
          'ide.tests.fixFailures',
          { count: this.failures().length },
          {
            defaultValue: 'Fix {{count}} failures',
          },
        )
  }

  /**
   * The empty-listing message (no match, or no tests yet).
   * @returns The translated message.
   */
  protected emptyText(): string {
    return this.query.trim()
      ? this.t('ide.tests.noMatch', undefined, { defaultValue: 'No tests match your search.' })
      : this.t('ide.tests.empty', undefined, { defaultValue: 'No tests in this project yet.' })
  }

  /**
   * The card container's inline style: chrome-less inside the command overlay,
   * the boxed card (with the timeline's bottom-margin rhythm) otherwise.
   * @returns The style attribute text.
   */
  protected rootStyle(): string | null {
    return styleText(
      this.embedded ? { padding: '10px 12px' } : { ...chatCardStyle(), marginBottom: 16 },
    )
  }

  /**
   * The search field's inline style: the same box as every card button (26px
   * tall, 3px radius) in the theme's neutral inset.
   * @returns The style attribute text.
   */
  protected searchStyle(): string | null {
    return styleText({
      width: '100%',
      height: 26,
      padding: '0px 6px',
      borderRadius: 3,
      border: `1px solid ${this.rowBorder()}`,
      background: this.isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.06)',
      color: 'inherit',
      outline: 'none',
      marginBottom: 6,
    })
  }

  /**
   * The run output block's inline style.
   * @returns The style attribute text.
   */
  protected outputStyle(): string | null {
    return styleText({
      margin: 0,
      padding: '6px 8px',
      borderRadius: 4,
      border: `1px solid ${this.rowBorder()}`,
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
      maxHeight: 200,
      overflow: 'auto',
      fontFamily: 'var(--mol-font-mono, monospace)',
    })
  }

  /**
   * The run output's text: the live lines, newest last.
   * @returns The joined output.
   */
  protected outputText(): string {
    return this.run.output.join('\n')
  }

  /**
   * A headline action's class string.
   * @returns The resolved classes.
   */
  protected primaryAction(): string {
    return this.cm.cn(PRIMARY_ACTION(this.cm))
  }

  /**
   * A secondary action's class string.
   * @returns The resolved classes.
   */
  protected secondaryAction(): string {
    return this.cm.cn(SECONDARY_ACTION(this.cm))
  }

  /**
   * The destructive action's class string (Stop).
   * @returns The resolved classes.
   */
  protected destructiveAction(): string {
    return this.cm.cn(DESTRUCTIVE_ACTION(this.cm))
  }

  /**
   * A disclosure toggle's class string.
   * @returns The resolved classes.
   */
  protected quietAction(): string {
    return this.cm.cn(QUIET_TOGGLE(this.cm))
  }

  /**
   * Reads the search field into the query (React's controlled `onChange`).
   * @param event - The native input event.
   */
  protected onSearch(event: Event): void {
    this.query = (event.target as HTMLInputElement).value
  }

  /**
   * Runs every LISTED test of one kind, honouring the filter (React calls
   * `onRun` with no event argument).
   * @param kind - The kind to run.
   */
  protected runKind(kind: TestKind): void {
    this.onRun({ ids: idsOfKind(this.filtered(), kind) })
  }

  /** Runs every LISTED test, honouring the filter (React passes no event). */
  protected runAll(): void {
    this.onRun({ ids: this.filtered().map((test) => test.id) })
  }

  /** Batches EVERY failure into one hand-over (React passes no event). */
  protected fixAll(): void {
    this.onFix(this.failures())
  }

  /**
   * Stops the whole run. React binds the BARE `onCancel` reference as the
   * click handler, so the click event itself is the call's argument even
   * though the callback's type takes none (a zero-arg function is assignable
   * to a one-arg handler).
   * @param event - The native click event.
   */
  protected stop(event: Event): void {
    const cancel: (event: Event) => void = this.onCancel
    cancel(event)
  }

  /** Shows or hides the run output block. */
  protected toggleOutput(): void {
    this.showOutput = !this.showOutput
  }
}
