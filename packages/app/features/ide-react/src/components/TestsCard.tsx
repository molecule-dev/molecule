/**
 * `/test` browser — the project's own tests, listed and runnable from the chat.
 *
 * Built as a sibling of {@link ScriptsCard}, because it is the same shape of
 * thing: a searchable list whose rows each carry a Run action and show their
 * captured output inline. Same container chrome, same header (title left,
 * primary action right), same search field, same `cm.borderT` row rhythm, same
 * `<pre>` output block, same `embedded` behaviour in the command overlay.
 *
 * Rows are grouped **End-to-end** then **Unit**, and within a kind by the
 * project directory that owns them (`app`, `my-app/app`, the workspace root
 * last), because a run is invoked from that directory and a person reading two
 * `home.spec.ts` rows needs to know which app each belongs to.
 *
 * The end-to-end specs are the point: the host runs them through the
 * `@molecule/app-e2e-preview` bond chain every scaffolded app carries, so each
 * spec drives the LIVE PREVIEW the person is looking at — no browser binary in
 * the sandbox. That also means **the preview has to be open**: with no page
 * connected the driver waits and then fails saying so, which the card states
 * next to the end-to-end group rather than leaving it a mystery.
 *
 * This component is PRESENTATIONAL — the list and the in-flight run live in
 * `ChatPanel`, so a run keeps streaming while the overlay is closed and
 * re-opened, and re-running `/test` re-lists without losing it.
 *
 * Styling uses `getClassMap()` (`cm.*`); the only inline styles are layout the
 * ClassMap can't express. All user-facing text goes through `t()`.
 *
 * @module
 */

import type { CSSProperties, JSX } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { t } from '@molecule/app-i18n'
import { getClassMap } from '@molecule/app-ui'

import type { TestItem, TestKind, TestSelection, TestStatus } from '../types.js'
import { chatCardStyle } from './chat-card-style.js'
import type {
  TestFailure,
  TestGroup,
  TestResultEntry,
  TestsRunState,
} from './tests-card-utilities.js'
import {
  countByKind,
  failedTests,
  filterTests,
  groupTests,
  isRowRunning,
  summarizeResults,
  testRowLabel,
} from './tests-card-utilities.js'

/**
 * The card's button vocabulary, which is the command cards' vocabulary (see
 * molecule DESIGN.md → Command cards). Every ACTION is a button that LOOKS
 * like a button — a filled or bordered box, never text on transparent:
 *
 * - {@link PRIMARY_ACTION} — the one headline action (Run all).
 * - {@link SECONDARY_ACTION} — every other action (Run e2e/unit/group, a
 *   row Run, Fix with Synthase). The SAME filled box as the headline action:
 *   `outline` at `xs` on the card surface is a 60%-alpha hairline that reads
 *   as plain text (the first restyle shipped that way and was rejected), and
 *   ScriptsCard renders every one of its Run buttons filled.
 * - {@link DESTRUCTIVE_ACTION} — Stop, in the design system's error colour.
 * - {@link QUIET_TOGGLE} — `ghost` is reserved for dismiss/disclosure
 *   controls (the Show/Hide output toggle), the only place the sibling cards
 *   use it. An action rendered ghost is the bug this vocabulary exists to
 *   prevent: it reads as a text link.
 *
 * @param cm - The active ClassMap.
 * @returns The resolved class string.
 */
const PRIMARY_ACTION = (cm: ReturnType<typeof getClassMap>): string =>
  cm.button({ variant: 'solid', color: 'primary', size: 'xs' })

/**
 * A secondary action — the same filled `xs` button ScriptsCard uses for every
 * action, so a row of Run buttons reads as a row of buttons.
 *
 * @param cm - The active ClassMap.
 * @returns The resolved class string.
 */
const SECONDARY_ACTION = (cm: ReturnType<typeof getClassMap>): string =>
  cm.button({ variant: 'solid', color: 'primary', size: 'xs' })

/**
 * The destructive action (Stop), in the design system's error colour.
 *
 * @param cm - The active ClassMap.
 * @returns The resolved class string.
 */
const DESTRUCTIVE_ACTION = (cm: ReturnType<typeof getClassMap>): string =>
  cm.button({ variant: 'solid', color: 'error', size: 'xs' })

/**
 * A disclosure toggle — the one place `ghost` belongs.
 *
 * @param cm - The active ClassMap.
 * @returns The resolved class string.
 */
const QUIET_TOGGLE = (cm: ReturnType<typeof getClassMap>): string =>
  cm.button({ variant: 'ghost', size: 'xs' })

/** Discovery status for the tests list — mirrors {@link ScriptsCard}'s. */
export type TestsStatus = 'loading' | 'ready' | 'error' | 'unavailable'

/** Props for {@link TestsCard}. */
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
  /** Stops the run in flight. */
  onCancel: () => void
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
}

/**
 * Human label for a kind.
 *
 * @param kind - The kind.
 * @returns The translated label.
 */
function kindLabel(kind: TestKind): string {
  return kind === 'e2e'
    ? t('ide.tests.kind.e2e', undefined, { defaultValue: 'End-to-end' })
    : t('ide.tests.kind.unit', undefined, { defaultValue: 'Unit' })
}

/**
 * The heading for one group: its kind and the directory that owns it. The
 * workspace ROOT has no name of its own, so it gets the generic word.
 *
 * @param group - The group.
 * @returns The heading text.
 */
function groupHeading(group: TestGroup): string {
  const where = group.label ?? t('ide.tests.workspace.root', undefined, { defaultValue: 'Project' })
  return `${kindLabel(group.kind)} · ${where}`
}

/**
 * The short label a status pill shows.
 *
 * @param status - The status.
 * @returns The translated label.
 */
function statusLabel(status: TestStatus): string {
  if (status === 'passed') return t('ide.tests.statusPassed', undefined, { defaultValue: 'Passed' })
  if (status === 'failed') return t('ide.tests.statusFailed', undefined, { defaultValue: 'Failed' })
  return t('ide.tests.statusSkipped', undefined, { defaultValue: 'Skipped' })
}

/**
 * The tests browser shown by `/test`.
 *
 * @param props - See {@link TestsCardProps}.
 * @returns The rendered tests card.
 */
export function TestsCard({
  tests,
  status,
  run,
  initialQuery,
  canRun,
  onRun,
  onCancel,
  onFix,
  fixDisabledReason,
  isLight,
  embedded,
}: TestsCardProps): JSX.Element {
  const cm = getClassMap()
  const [query, setQuery] = useState(initialQuery)
  // The run output starts COLLAPSED. ScriptsCard auto-expands nothing while a
  // script runs, so neither does this; the status pills carry the state and the
  // output is one click away when someone wants it.
  const [showOutput, setShowOutput] = useState(false)
  const outputRef = useRef<HTMLPreElement | null>(null)

  // Keep the live output pinned to the newest line unless the reader scrolled up
  // inside the block themselves. No-ops while it is collapsed (no element).
  useEffect(() => {
    const el = outputRef.current
    if (!el) return
    if (el.scrollHeight - el.scrollTop - el.clientHeight > 40) return
    el.scrollTop = el.scrollHeight
  }, [run.output, showOutput])

  const filtered = useMemo(() => filterTests(tests, query), [tests, query])
  const groups = useMemo(() => groupTests(filtered), [filtered])
  const counts = useMemo(() => countByKind(filtered), [filtered])
  const summary = useMemo(() => summarizeResults(filtered, run.results), [filtered, run.results])
  const failures = useMemo(() => failedTests(filtered, run.results), [filtered, run.results])

  const rowBorder = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)'
  // The same neutral inset the sibling cards give their fields, so the search
  // box READS as a field on the clean overlay surface.
  const fieldBg = isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.06)'
  const fieldStyle: CSSProperties = {
    width: '100%',
    padding: '4px 6px',
    borderRadius: 4,
    border: `1px solid ${rowBorder}`,
    background: fieldBg,
    color: 'inherit',
    outline: 'none',
  }

  const disabledReason = !canRun
    ? t('ide.tests.viewerCannotRun', undefined, {
        defaultValue: 'Only editors can run this project’s tests.',
      })
    : status === 'unavailable'
      ? t('ide.tests.needsSandbox', undefined, {
          defaultValue: 'Start the project to run its tests.',
        })
      : null
  const runnable = canRun && status === 'ready' && !run.running
  const fixable = fixDisabledReason === null

  return (
    <div
      data-mol-id="tests-card"
      className={cm.textSize('xs')}
      style={embedded ? { padding: '10px 12px' } : { ...chatCardStyle(), marginBottom: 16 }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          marginBottom: 6,
          flexWrap: 'wrap',
        }}
      >
        {/* Left title area — a (possibly empty when embedded) flex child so the
            primary action below is ALWAYS pushed right, the same header
            structure as ScriptsCard / SkillsCard / SettingsCard. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {!embedded && (
            <div
              className={cm.cn(cm.fontWeight('medium'), cm.textSize('sm'))}
              style={{ flexShrink: 0 }}
            >
              {t('ide.tests.heading', undefined, { defaultValue: 'Tests' })}
            </div>
          )}
          {run.running ? (
            <span
              data-mol-id="tests-card-running"
              className={cm.cn(cm.textMuted, cm.textSize('xs'))}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              <span className={cm.spinner({ size: 'xs' })} aria-hidden="true" />
              {t('ide.tests.running', undefined, { defaultValue: 'Running…' })}
            </span>
          ) : (
            summary.reported > 0 && (
              <span
                data-mol-id="tests-card-summary"
                className={cm.textSize('xs')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                {summary.passed > 0 && (
                  <span className={cm.textSuccess}>
                    {t(
                      'ide.tests.passedCount',
                      { count: summary.passed },
                      { defaultValue: '{{count}} passed' },
                    )}
                  </span>
                )}
                {summary.failed > 0 && (
                  <span className={cm.textError}>
                    {t(
                      'ide.tests.failedCount',
                      { count: summary.failed },
                      { defaultValue: '{{count}} failed' },
                    )}
                  </span>
                )}
              </span>
            )
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {counts.e2e > 0 && counts.unit > 0 && (
            <>
              <button
                type="button"
                data-mol-id="tests-card-run-e2e"
                onClick={() => onRun({ ids: idsOfKind(filtered, 'e2e') })}
                disabled={!runnable}
                title={disabledReason ?? undefined}
                className={cm.cn(SECONDARY_ACTION(cm))}
                style={{ flexShrink: 0 }}
              >
                {t('ide.tests.runE2e', undefined, { defaultValue: 'Run e2e' })}
              </button>
              <button
                type="button"
                data-mol-id="tests-card-run-unit"
                onClick={() => onRun({ ids: idsOfKind(filtered, 'unit') })}
                disabled={!runnable}
                title={disabledReason ?? undefined}
                className={cm.cn(SECONDARY_ACTION(cm))}
                style={{ flexShrink: 0 }}
              >
                {t('ide.tests.runUnit', undefined, { defaultValue: 'Run unit' })}
              </button>
            </>
          )}
          {!run.running && failures.length > 0 && (
            <button
              type="button"
              data-mol-id="tests-card-fix-all"
              onClick={() => onFix(failures)}
              disabled={!fixable}
              title={fixDisabledReason ?? undefined}
              className={cm.cn(SECONDARY_ACTION(cm))}
              style={{ flexShrink: 0 }}
            >
              {failures.length === 1
                ? t('ide.tests.fixWithSynthase', undefined, {
                    defaultValue: 'Fix with Synthase',
                  })
                : t(
                    'ide.tests.fixFailures',
                    { count: failures.length },
                    { defaultValue: 'Fix {{count}} failures' },
                  )}
            </button>
          )}
          {run.running ? (
            <button
              type="button"
              data-mol-id="tests-card-cancel"
              onClick={onCancel}
              className={cm.cn(DESTRUCTIVE_ACTION(cm))}
              style={{ flexShrink: 0 }}
            >
              {t('ide.tests.stop', undefined, { defaultValue: 'Stop' })}
            </button>
          ) : (
            filtered.length > 0 && (
              <button
                type="button"
                data-mol-id="tests-card-run-all"
                onClick={() => onRun({ ids: filtered.map((test) => test.id) })}
                disabled={!runnable}
                title={disabledReason ?? undefined}
                className={cm.cn(PRIMARY_ACTION(cm))}
                style={{ flexShrink: 0 }}
              >
                {t('ide.tests.runAll', undefined, { defaultValue: 'Run all' })}
              </button>
            )
          )}
        </div>
      </div>

      {/* Search / filter */}
      <input
        value={query}
        data-mol-id="tests-card-search"
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('ide.tests.searchPlaceholder', undefined, {
          defaultValue: 'Filter tests…',
        })}
        className={cm.textSize('xs')}
        style={{ ...fieldStyle, marginBottom: 6 }}
      />

      {/* Why the run controls are dead, stated in the card rather than in a
          toast that has already gone by the time the person looks. */}
      {disabledReason && status !== 'loading' && (
        <div data-mol-id="tests-card-disabled-reason" className={cm.textMuted}>
          {disabledReason}
        </div>
      )}

      {status === 'loading' && (
        <div className={cm.textMuted} style={{ padding: '6px 0' }}>
          {t('ide.tests.loading', undefined, { defaultValue: 'Loading tests…' })}
        </div>
      )}

      {status === 'unavailable' && (
        <div
          data-mol-id="tests-card-unavailable"
          className={cm.textMuted}
          style={{ padding: '6px 0' }}
        >
          {t('ide.tests.waitingForSandbox', undefined, {
            defaultValue: 'Start the project to see its tests.',
          })}
        </div>
      )}

      {status === 'error' && (
        <div data-mol-id="tests-card-error" className={cm.textMuted} style={{ padding: '6px 0' }}>
          {t('ide.tests.listError', undefined, {
            defaultValue: 'Could not list this project’s tests.',
          })}
        </div>
      )}

      {status === 'ready' && filtered.length === 0 && (
        <div data-mol-id="tests-card-empty" className={cm.textMuted} style={{ padding: '6px 0' }}>
          {query.trim()
            ? t('ide.tests.noMatch', undefined, {
                defaultValue: 'No tests match your search.',
              })
            : t('ide.tests.empty', undefined, {
                defaultValue: 'No tests in this project yet.',
              })}
        </div>
      )}

      {status === 'ready' &&
        groups.map((group) => (
          <TestsCardGroup
            key={`${group.kind}:${group.workspace}`}
            group={group}
            run={run}
            runnable={runnable}
            disabledReason={disabledReason}
            rowBorder={rowBorder}
            onRun={onRun}
            onFix={onFix}
            fixable={fixable}
            fixDisabledReason={fixDisabledReason}
          />
        ))}

      {/* The running command's live output — the card's own output area, the
          same block ScriptsCard shows a script's captured output in. */}
      {run.output.length > 0 && (
        <div data-mol-id="tests-card-output-area" style={{ marginTop: 6 }}>
          <button
            type="button"
            data-mol-id="tests-card-output-toggle"
            aria-expanded={showOutput}
            onClick={() => setShowOutput((v) => !v)}
            className={cm.cn(QUIET_TOGGLE(cm))}
            style={{ flexShrink: 0 }}
          >
            {showOutput
              ? t('ide.tests.hideOutput', undefined, { defaultValue: 'Hide output' })
              : t('ide.tests.showOutput', undefined, { defaultValue: 'Show output' })}
          </button>
          {showOutput && (
            <pre
              ref={outputRef}
              data-mol-id="tests-card-output"
              className={cm.textSize('xs')}
              style={{
                margin: 0,
                padding: '6px 8px',
                borderRadius: 4,
                border: `1px solid ${rowBorder}`,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                maxHeight: 200,
                overflow: 'auto',
                fontFamily: 'var(--mol-font-mono, monospace)',
              }}
            >
              {run.output.join('\n')}
            </pre>
          )}
        </div>
      )}

      {run.error && (
        <div data-mol-id="tests-card-run-error" className={cm.textError} style={{ marginTop: 6 }}>
          {run.error}
        </div>
      )}

      {!run.running && run.outcome === 'cancelled' && !run.error && (
        <div data-mol-id="tests-card-cancelled" className={cm.textMuted} style={{ marginTop: 6 }}>
          {t('ide.tests.cancelled', undefined, { defaultValue: 'Run stopped.' })}
        </div>
      )}
    </div>
  )
}

TestsCard.displayName = 'TestsCard'

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

/** Props for one rendered {@link TestGroup}. */
interface TestsCardGroupProps {
  group: TestGroup
  run: TestsRunState
  runnable: boolean
  disabledReason: string | null
  rowBorder: string
  onRun: (selection: TestSelection) => void
  onFix: (failures: TestFailure[]) => void
  fixable: boolean
  fixDisabledReason: string | null
}

/**
 * One group of rows — a heading ("End-to-end · my-app/app"), a Run for the
 * whole group, and a row per test file.
 *
 * @param props - See {@link TestsCardGroupProps}.
 * @returns The rendered group.
 */
function TestsCardGroup({
  group,
  run,
  runnable,
  disabledReason,
  rowBorder,
  onRun,
  onFix,
  fixable,
  fixDisabledReason,
}: TestsCardGroupProps): JSX.Element {
  const cm = getClassMap()
  const groupId = `${group.kind}-${group.workspace}`
  return (
    <div
      data-mol-id={`tests-card-group-${groupId}`}
      className={cm.borderT}
      style={{ padding: '6px 0', borderColor: rowBorder }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <div className={cm.cn(cm.fontWeight('medium'))} style={{ minWidth: 0 }}>
          {groupHeading(group)}
        </div>
        <button
          type="button"
          data-mol-id={`tests-card-run-group-${groupId}`}
          onClick={() => onRun({ ids: group.items.map((item) => item.id) })}
          disabled={!runnable}
          title={disabledReason ?? undefined}
          className={cm.cn(SECONDARY_ACTION(cm))}
          style={{ flexShrink: 0 }}
        >
          {t('ide.tests.runGroup', undefined, { defaultValue: 'Run group' })}
        </button>
      </div>
      {group.kind === 'e2e' && (
        <div data-mol-id="tests-card-e2e-hint" className={cm.textMuted} style={{ lineHeight: 1.4 }}>
          {t('ide.tests.e2eHint', undefined, {
            defaultValue: 'These run against the live preview, so keep the preview open.',
          })}
        </div>
      )}
      {group.items.map((item) => (
        <TestsCardRow
          key={item.id}
          item={item}
          result={run.results[item.id]}
          running={isRowRunning(run, item.id)}
          runnable={runnable}
          disabledReason={disabledReason}
          rowBorder={rowBorder}
          onRun={onRun}
          onFix={onFix}
          fixable={fixable}
          fixDisabledReason={fixDisabledReason}
        />
      ))}
    </div>
  )
}

/** Props for one test row. */
interface TestsCardRowProps {
  item: TestItem
  result: TestResultEntry | undefined
  running: boolean
  runnable: boolean
  disabledReason: string | null
  rowBorder: string
  onRun: (selection: TestSelection) => void
  onFix: (failures: TestFailure[]) => void
  fixable: boolean
  fixDisabledReason: string | null
}

/**
 * One test file: its label, its last status pill, a Run button, and — when it
 * FAILED — the runner's output kept underneath, the same inline output
 * ScriptsCard shows for a script that exited non-zero.
 *
 * @param props - See {@link TestsCardRowProps}.
 * @returns The rendered row.
 */
function TestsCardRow({
  item,
  result,
  running,
  runnable,
  disabledReason,
  rowBorder,
  onRun,
  onFix,
  fixable,
  fixDisabledReason,
}: TestsCardRowProps): JSX.Element {
  const cm = getClassMap()
  // A failure's output starts COLLAPSED too — the row's status pill says what
  // happened; the detail is one click away for whoever wants it.
  const [showFailure, setShowFailure] = useState(false)
  return (
    <div data-mol-id={`tests-card-row-${item.id}`} style={{ padding: '4px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <div
          className={cm.textMuted}
          title={item.file}
          style={{
            flex: '1 1 140px',
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontFamily: 'var(--mol-font-mono, monospace)',
          }}
        >
          {testRowLabel(item)}
        </div>
        {running ? (
          <span
            data-mol-id={`tests-card-status-${item.id}`}
            className={cm.textMuted}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0 }}
          >
            <span className={cm.spinner({ size: 'xs' })} aria-hidden="true" />
            {t('ide.tests.running', undefined, { defaultValue: 'Running…' })}
          </span>
        ) : (
          result && (
            <span
              data-mol-id={`tests-card-status-${item.id}`}
              className={
                result.status === 'passed'
                  ? cm.textSuccess
                  : result.status === 'failed'
                    ? cm.textError
                    : cm.textMuted
              }
              style={{ flexShrink: 0 }}
            >
              {statusLabel(result.status)}
            </span>
          )
        )}
        <button
          type="button"
          data-mol-id={`tests-card-run-${item.id}`}
          onClick={() => onRun({ ids: [item.id] })}
          disabled={!runnable}
          title={disabledReason ?? undefined}
          className={cm.cn(SECONDARY_ACTION(cm))}
          style={{ flexShrink: 0 }}
        >
          {t('ide.tests.run', undefined, { defaultValue: 'Run' })}
        </button>
      </div>
      {result?.status === 'failed' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {result.output && (
            <button
              type="button"
              data-mol-id={`tests-card-failure-toggle-${item.id}`}
              aria-expanded={showFailure}
              onClick={() => setShowFailure((v) => !v)}
              className={cm.cn(QUIET_TOGGLE(cm))}
              style={{ flexShrink: 0 }}
            >
              {showFailure
                ? t('ide.tests.hideOutput', undefined, { defaultValue: 'Hide output' })
                : t('ide.tests.showOutput', undefined, { defaultValue: 'Show output' })}
            </button>
          )}
          <button
            type="button"
            data-mol-id={`tests-card-fix-${item.id}`}
            onClick={() => onFix([{ item, output: result.output }])}
            disabled={!fixable}
            title={fixDisabledReason ?? undefined}
            className={cm.cn(SECONDARY_ACTION(cm))}
            style={{ flexShrink: 0 }}
          >
            {t('ide.tests.fixWithSynthase', undefined, {
              defaultValue: 'Fix with Synthase',
            })}
          </button>
        </div>
      )}
      {result?.status === 'failed' && result.output && showFailure && (
        <pre
          data-mol-id={`tests-card-failure-${item.id}`}
          className={cm.textSize('xs')}
          style={{
            margin: '4px 0 0',
            padding: '6px 8px',
            borderRadius: 4,
            border: `1px solid ${rowBorder}`,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            maxHeight: 200,
            overflow: 'auto',
            fontFamily: 'var(--mol-font-mono, monospace)',
          }}
        >
          {result.output}
        </pre>
      )}
    </div>
  )
}
