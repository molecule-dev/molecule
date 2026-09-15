/**
 * The Tests bar — the project's own tests, listed and runnable from the chat
 * composer, in the same slot and the same visual language as the "N uncommitted
 * files" bar right below it.
 *
 * Collapsed it is one dense row: a chevron, "N tests", and the last run's
 * summary (a green passed count, a red failed count, or a spinner while a run
 * is live), with the run controls on the right. Expanded it lists every test,
 * grouped **End-to-end** then **Unit** and then by workspace, each row carrying
 * its own status pill and Run button, with the live output in a scrolling
 * monospace block and a failure's output kept under its row after the run ends.
 *
 * The end-to-end specs are the point: the host runs them through the
 * `@molecule/app-e2e-preview` bond chain every scaffolded app carries, so each
 * spec drives the LIVE PREVIEW the person is looking at — no browser binary in
 * the sandbox. That also means **the preview has to be open**: with no page
 * connected, the driver waits and then fails saying so. The bar says this next
 * to the end-to-end group rather than letting the failure be a mystery.
 *
 * The bar owns no routes. It calls the two host callbacks
 * ({@link ChatPanelProps.listTests}, {@link ChatPanelProps.runTests}) and folds
 * what the run streams back through {@link applyTestRunEvent}.
 *
 * @module
 */

import type { CSSProperties, JSX } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { t } from '@molecule/app-i18n'
import { getClassMap } from '@molecule/app-ui'

import type {
  TestItem,
  TestKind,
  TestList,
  TestRunEvent,
  TestRunHandle,
  TestSelection,
  TestStatus,
  TestWorkspace,
} from '../types.js'
import type { TestGroup, TestResultEntry, TestsRunState } from './tests-bar-utilities.js'
import {
  applyTestRunEvent,
  countByKind,
  EMPTY_RUN_STATE,
  failRun,
  groupTests,
  isRowRunning,
  summarizeResults,
  testRowLabel,
} from './tests-bar-utilities.js'

/** Props for {@link TestsBar}. */
export interface TestsBarProps {
  /** Lists the project's tests — see {@link ChatPanelProps.listTests}. */
  listTests: () => Promise<TestList>
  /** Runs a selection — see {@link ChatPanelProps.runTests}. */
  runTests: (selection: TestSelection, onEvent: (event: TestRunEvent) => void) => TestRunHandle
  /** Whether this viewer may run tests at all (a viewer may not). */
  canRun: boolean
  /** Whether the environment that runs them is up (a running sandbox). */
  available: boolean
  /** Bump to re-list — the host passes its file-change tick so new specs appear. */
  refreshKey?: number
  /** Grow the hit areas for touch, matching the commit bar's coarse-pointer rules. */
  isCoarse?: boolean
}

/** The theme's success color, with the same fallback the commit bar's green button uses. */
const PASS_COLOR = 'var(--mol-color-success, #3fb950)'
/** The theme's error color, with a fallback matching the commit bar's deletion red. */
const FAIL_COLOR = 'var(--mol-color-error, #f85149)'

/**
 * Human label for a workspace, shown beside the group heading so `app` vs `api`
 * is obvious in a project that tests both.
 *
 * @param workspace - The workspace.
 * @returns The translated label.
 */
function workspaceLabel(workspace: TestWorkspace): string {
  if (workspace === 'app') {
    return t('ide.tests.workspace.app', undefined, { defaultValue: 'App' })
  }
  if (workspace === 'api') {
    return t('ide.tests.workspace.api', undefined, { defaultValue: 'API' })
  }
  return t('ide.tests.workspace.root', undefined, { defaultValue: 'Project' })
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
 * The colour a status pill renders in.
 *
 * @param status - The status.
 * @returns A CSS colour value.
 */
function statusColor(status: TestStatus): string {
  if (status === 'passed') return PASS_COLOR
  if (status === 'failed') return FAIL_COLOR
  return 'inherit'
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
 * The Tests bar. Renders nothing at all until the host's list resolves with at
 * least one test — an empty bar above the composer would be pure noise in a
 * project that has no tests yet.
 *
 * @param props - See {@link TestsBarProps}.
 * @returns The bar, or `null` when there is nothing to show.
 */
export function TestsBar({
  listTests,
  runTests,
  canRun,
  available,
  refreshKey,
  isCoarse,
}: TestsBarProps): JSX.Element | null {
  const cm = getClassMap()
  const [expanded, setExpanded] = useState(false)
  const [tests, setTests] = useState<TestItem[]>([])
  const [listError, setListError] = useState<string | null>(null)
  const [run, setRun] = useState<TestsRunState>(EMPTY_RUN_STATE)
  const [showOutput, setShowOutput] = useState(true)
  const handleRef = useRef<TestRunHandle | null>(null)
  const outputRef = useRef<HTMLPreElement | null>(null)
  // Live for the async list callback, so a list that resolves after the bar
  // unmounted never sets state on a dead component.
  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      handleRef.current?.cancel()
    }
  }, [])

  const refresh = useCallback(async () => {
    // Nothing can be discovered while the environment is down, and an empty
    // answer would WIPE the list the person was reading. Keep what was last
    // listed (with its statuses) and let the disabled reason explain itself.
    if (!available) return
    try {
      const list = await listTests()
      if (!mountedRef.current) return
      setTests(list.tests ?? [])
      setListError(null)
    } catch (_error) {
      if (!mountedRef.current) return
      setListError(
        t('ide.tests.listError', undefined, {
          defaultValue: 'Could not list this project’s tests.',
        }),
      )
    }
  }, [listTests, available])

  useEffect(() => {
    void refresh()
  }, [refresh, refreshKey])

  // Keep the live output scrolled to the newest line unless the reader has
  // scrolled up inside the block themselves.
  useEffect(() => {
    const el = outputRef.current
    if (!el) return
    if (el.scrollHeight - el.scrollTop - el.clientHeight > 40) return
    el.scrollTop = el.scrollHeight
  }, [run.output])

  const groups = useMemo(() => groupTests(tests), [tests])
  const counts = useMemo(() => countByKind(tests), [tests])
  const summary = useMemo(() => summarizeResults(tests, run.results), [tests, run.results])

  const start = useCallback(
    (selection: TestSelection) => {
      if (!canRun || !available || run.running) return
      setExpanded(true)
      setShowOutput(true)
      // Seed a running state immediately: the host's `start` event may be a
      // round trip away, and a Run button that appears to do nothing is the
      // failure this feature is supposed to remove.
      setRun((prev) => ({
        ...prev,
        running: true,
        outcome: null,
        error: null,
        output: [],
        currentId: null,
        queued: selection.ids ?? [],
        startedAt: Date.now(),
        durationMs: null,
      }))
      try {
        handleRef.current = runTests(selection, (event) => {
          if (!mountedRef.current) return
          setRun((prev) => applyTestRunEvent(prev, event))
          if (event.type === 'done') {
            handleRef.current = null
            // A run can create, rename or delete nothing — but it CAN reveal a
            // spec the agent wrote mid-run, so re-list once it settles.
            void refresh()
          }
        })
      } catch (error) {
        setRun((prev) =>
          failRun(
            prev,
            error instanceof Error
              ? error.message
              : t('ide.tests.runError', undefined, {
                  defaultValue: 'The test run could not start.',
                }),
          ),
        )
      }
    },
    [canRun, available, run.running, runTests, refresh],
  )

  const cancel = useCallback(() => {
    handleRef.current?.cancel()
    handleRef.current = null
    setRun((prev) => ({ ...prev, running: false, currentId: null, outcome: 'cancelled' }))
  }, [])

  if (tests.length === 0 && !listError) return null

  const disabledReason = !canRun
    ? t('ide.tests.viewerCannotRun', undefined, {
        defaultValue: 'Only editors can run this project’s tests.',
      })
    : !available
      ? t('ide.tests.needsSandbox', undefined, {
          defaultValue: 'Start the project to run its tests.',
        })
      : null
  const runnable = canRun && available && !run.running

  const rowMinHeight = isCoarse ? { minHeight: 32 } : {}
  const actionStyle: CSSProperties = {
    flexShrink: 0,
    ...(isCoarse ? { minHeight: 36 } : {}),
  }

  return (
    <div
      data-mol-id="tests-bar"
      style={{
        borderTop: '1px solid rgba(128,128,128,0.15)',
        // Same box model as the commit bar directly below, so the two read as
        // one stack of bars rather than two unrelated strips.
        padding: '8px 8px 8px 10px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          // Phone widths: the controls drop under the label instead of pushing
          // the bar into a horizontal scroll.
          flexWrap: 'wrap',
        }}
      >
        <div
          role="button"
          tabIndex={0}
          data-mol-id="tests-bar-toggle"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setExpanded((v) => !v)
            }
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            cursor: 'pointer',
            minWidth: 0,
            ...(isCoarse ? { minHeight: 36 } : {}),
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            width="12"
            height="12"
            aria-hidden="true"
            style={{
              transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 120ms',
              opacity: 0.5,
              flexShrink: 0,
            }}
          >
            <path
              d="M6 4l4 4-4 4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className={cm.cn(cm.textMuted, cm.textSize('xs'))}>
            {t('ide.tests.testCount', { count: tests.length }, { defaultValue: '{{count}} tests' })}
          </span>
          {run.running ? (
            <span
              data-mol-id="tests-bar-running"
              className={cm.cn(cm.textMuted, cm.textSize('xs'))}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              <span className={cm.spinner({ size: 'xs' })} aria-hidden="true" />
              {t('ide.tests.running', undefined, { defaultValue: 'Running…' })}
            </span>
          ) : (
            summary.reported > 0 && (
              <span
                data-mol-id="tests-bar-summary"
                className={cm.textSize('xs')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                {summary.passed > 0 && (
                  <span style={{ color: PASS_COLOR }}>
                    {t(
                      'ide.tests.passedCount',
                      { count: summary.passed },
                      { defaultValue: '{{count}} passed' },
                    )}
                  </span>
                )}
                {summary.failed > 0 && (
                  <span style={{ color: FAIL_COLOR }}>
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
          {counts.e2e > 0 && (
            <button
              type="button"
              data-mol-id="tests-bar-run-e2e"
              onClick={(e) => {
                e.stopPropagation()
                start({ kind: 'e2e' })
              }}
              disabled={!runnable}
              title={disabledReason ?? undefined}
              className={cm.cn(cm.button({ variant: 'ghost', size: 'xs' }))}
              style={actionStyle}
            >
              {t('ide.tests.runE2e', undefined, { defaultValue: 'Run e2e' })}
            </button>
          )}
          {counts.unit > 0 && (
            <button
              type="button"
              data-mol-id="tests-bar-run-unit"
              onClick={(e) => {
                e.stopPropagation()
                start({ kind: 'unit' })
              }}
              disabled={!runnable}
              title={disabledReason ?? undefined}
              className={cm.cn(cm.button({ variant: 'ghost', size: 'xs' }))}
              style={actionStyle}
            >
              {t('ide.tests.runUnit', undefined, { defaultValue: 'Run unit' })}
            </button>
          )}
          {run.running ? (
            <button
              type="button"
              data-mol-id="tests-bar-cancel"
              onClick={(e) => {
                e.stopPropagation()
                cancel()
              }}
              className={cm.cn(cm.button({ variant: 'solid', color: 'secondary', size: 'xs' }))}
              style={actionStyle}
            >
              {t('ide.tests.stop', undefined, { defaultValue: 'Stop' })}
            </button>
          ) : (
            <button
              type="button"
              data-mol-id="tests-bar-run-all"
              onClick={(e) => {
                e.stopPropagation()
                start({ kind: 'all' })
              }}
              disabled={!runnable}
              title={disabledReason ?? undefined}
              className={cm.cn(cm.button({ variant: 'solid', color: 'primary', size: 'xs' }))}
              style={actionStyle}
            >
              {t('ide.tests.runAll', undefined, { defaultValue: 'Run all' })}
            </button>
          )}
        </div>
      </div>

      {/* Why the run controls are dead, stated in the bar rather than in a
          toast that has already gone by the time the person looks. */}
      {disabledReason && (
        <div
          data-mol-id="tests-bar-disabled-reason"
          className={cm.cn(cm.textMuted, cm.textSize('xs'))}
          style={{ marginTop: 4, paddingLeft: 16 }}
        >
          {disabledReason}
        </div>
      )}

      {listError && (
        <div
          data-mol-id="tests-bar-list-error"
          className={cm.cn(cm.textError, cm.textSize('xs'))}
          style={{ marginTop: 4, paddingLeft: 16 }}
        >
          {listError}
        </div>
      )}

      {run.error && (
        <div
          data-mol-id="tests-bar-run-error"
          className={cm.cn(cm.textError, cm.textSize('xs'))}
          style={{ marginTop: 4, paddingLeft: 16, lineHeight: 1.4 }}
        >
          {run.error}
        </div>
      )}

      {!run.running && run.outcome === 'cancelled' && !run.error && (
        <div
          data-mol-id="tests-bar-cancelled"
          className={cm.cn(cm.textMuted, cm.textSize('xs'))}
          style={{ marginTop: 4, paddingLeft: 16 }}
        >
          {t('ide.tests.cancelled', undefined, { defaultValue: 'Run stopped.' })}
        </div>
      )}

      {expanded && (
        <div
          data-mol-id="tests-bar-list"
          style={{ marginTop: 4, paddingLeft: 16, maxHeight: 260, overflowY: 'auto' }}
        >
          {groups.map((group) => (
            <TestsBarGroup
              key={`${group.kind}:${group.workspace}`}
              group={group}
              run={run}
              runnable={runnable}
              disabledReason={disabledReason}
              rowMinHeight={rowMinHeight}
              actionStyle={actionStyle}
              onRun={start}
            />
          ))}
        </div>
      )}

      {/* Live output — its own scroll container, so a long run never grows the
          composer or scrolls the page. */}
      {(run.running || run.output.length > 0) && (
        <div style={{ marginTop: 6, paddingLeft: 16 }}>
          <button
            type="button"
            data-mol-id="tests-bar-output-toggle"
            aria-expanded={showOutput}
            onClick={() => setShowOutput((v) => !v)}
            className={cm.cn(cm.button({ variant: 'ghost', size: 'xs' }))}
            style={actionStyle}
          >
            {showOutput
              ? t('ide.tests.hideOutput', undefined, { defaultValue: 'Hide output' })
              : t('ide.tests.showOutput', undefined, { defaultValue: 'Show output' })}
          </button>
          {showOutput && (
            <pre
              ref={outputRef}
              data-mol-id="tests-bar-output"
              className={cm.textSize('xs')}
              style={{
                margin: '4px 0 0',
                padding: '6px 8px',
                borderRadius: 4,
                border: '1px solid rgba(128,128,128,0.25)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                maxHeight: 180,
                overflow: 'auto',
                fontFamily: 'var(--mol-font-mono, monospace)',
              }}
            >
              {run.output.join('\n')}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}

TestsBar.displayName = 'TestsBar'

/** Props for one rendered {@link TestGroup}. */
interface TestsBarGroupProps {
  group: TestGroup
  run: TestsRunState
  runnable: boolean
  disabledReason: string | null
  rowMinHeight: CSSProperties
  actionStyle: CSSProperties
  onRun: (selection: TestSelection) => void
}

/**
 * One group of rows — a heading ("End-to-end · App"), a Run for the whole
 * group, and a row per test file.
 *
 * @param props - See {@link TestsBarGroupProps}.
 * @returns The rendered group.
 */
function TestsBarGroup({
  group,
  run,
  runnable,
  disabledReason,
  rowMinHeight,
  actionStyle,
  onRun,
}: TestsBarGroupProps): JSX.Element {
  const cm = getClassMap()
  const groupId = `${group.kind}-${group.workspace}`
  return (
    <div data-mol-id={`tests-bar-group-${groupId}`} style={{ marginBottom: 6 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <span className={cm.cn(cm.textMuted, cm.textSize('xs'), cm.fontWeight('medium'))}>
          {`${kindLabel(group.kind)} · ${workspaceLabel(group.workspace)}`}
        </span>
        <button
          type="button"
          data-mol-id={`tests-bar-run-group-${groupId}`}
          onClick={() => onRun({ ids: group.items.map((item) => item.id) })}
          disabled={!runnable}
          title={disabledReason ?? undefined}
          className={cm.cn(cm.button({ variant: 'ghost', size: 'xs' }))}
          style={actionStyle}
        >
          {t('ide.tests.runGroup', undefined, { defaultValue: 'Run group' })}
        </button>
      </div>
      {group.kind === 'e2e' && (
        <div
          className={cm.cn(cm.textMuted, cm.textSize('xs'))}
          data-mol-id="tests-bar-e2e-hint"
          style={{ lineHeight: 1.4, marginBottom: 2 }}
        >
          {t('ide.tests.e2eHint', undefined, {
            defaultValue: 'These run against the live preview, so keep the preview open.',
          })}
        </div>
      )}
      {group.items.map((item) => (
        <TestsBarRow
          key={item.id}
          item={item}
          result={run.results[item.id]}
          running={isRowRunning(run, item.id)}
          runnable={runnable}
          disabledReason={disabledReason}
          rowMinHeight={rowMinHeight}
          actionStyle={actionStyle}
          onRun={onRun}
        />
      ))}
    </div>
  )
}

/** Props for one test row. */
interface TestsBarRowProps {
  item: TestItem
  result: TestResultEntry | undefined
  running: boolean
  runnable: boolean
  disabledReason: string | null
  rowMinHeight: CSSProperties
  actionStyle: CSSProperties
  onRun: (selection: TestSelection) => void
}

/**
 * One test file: its label, its last status pill, a Run button, and — when it
 * FAILED — the runner's output kept underneath so the failure is readable after
 * the run has moved on.
 *
 * @param props - See {@link TestsBarRowProps}.
 * @returns The rendered row.
 */
function TestsBarRow({
  item,
  result,
  running,
  runnable,
  disabledReason,
  rowMinHeight,
  actionStyle,
  onRun,
}: TestsBarRowProps): JSX.Element {
  const cm = getClassMap()
  return (
    <div data-mol-id={`tests-bar-row-${item.id}`} style={{ padding: '1px 0' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          flexWrap: 'wrap',
          ...rowMinHeight,
        }}
      >
        <span
          className={cm.cn(cm.textMuted, cm.textSize('xs'))}
          title={item.file}
          style={{
            fontFamily: 'var(--mol-font-mono, monospace)',
            flex: '1 1 140px',
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {testRowLabel(item)}
        </span>
        {running ? (
          <span
            data-mol-id={`tests-bar-status-${item.id}`}
            className={cm.cn(cm.textMuted, cm.textSize('xs'))}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0 }}
          >
            <span className={cm.spinner({ size: 'xs' })} aria-hidden="true" />
            {t('ide.tests.running', undefined, { defaultValue: 'Running…' })}
          </span>
        ) : (
          result && (
            <span
              data-mol-id={`tests-bar-status-${item.id}`}
              className={cm.textSize('xs')}
              style={{ color: statusColor(result.status), flexShrink: 0 }}
            >
              {statusLabel(result.status)}
            </span>
          )
        )}
        <button
          type="button"
          data-mol-id={`tests-bar-run-${item.id}`}
          onClick={() => onRun({ ids: [item.id] })}
          disabled={!runnable}
          title={disabledReason ?? undefined}
          className={cm.cn(cm.button({ variant: 'ghost', size: 'xs' }))}
          style={actionStyle}
        >
          {t('ide.tests.run', undefined, { defaultValue: 'Run' })}
        </button>
      </div>
      {result?.status === 'failed' && result.output && (
        <pre
          data-mol-id={`tests-bar-failure-${item.id}`}
          className={cm.textSize('xs')}
          style={{
            margin: '2px 0 4px',
            padding: '6px 8px',
            borderRadius: 4,
            border: `1px solid ${FAIL_COLOR}`,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            maxHeight: 160,
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
