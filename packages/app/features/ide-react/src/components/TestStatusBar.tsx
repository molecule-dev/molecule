/**
 * The tests status bar — a collapsed strip above the commit bar saying how the
 * project's tests stand, and what is running right now.
 *
 * It exists because a run DRIVES THE PREVIEW: the e2e specs navigate the live
 * preview as they go, so without this the preview moves on its own with nothing
 * on screen to account for it. The bar is that account, and it is shown by
 * default for exactly that reason.
 *
 * It deliberately borrows the commit bar's chrome — same hairline top border,
 * same `8px 8px 8px 10px` padding, same 12px chevron rotating 90° on expand,
 * same muted `xs` label — so the two read as one family of strips stacked above
 * the composer rather than two unrelated widgets. Collapsed is the resting
 * state; expanded adds the per-outcome counts and the running file.
 *
 * Colour is carried by the count figures only, never by the whole strip: a bar
 * that turns red across its full width reads as an error in the chat itself.
 * Once anything has a result, the collapsed row shows a coloured
 * `passed / failed / skipped` readout (green / red / yellow) so the state reads
 * at a glance without expanding. Every colour comes from a theme token with a fallback, per
 * DESIGN.md's semantic colours — no hardcoded palette.
 *
 * @module
 */

import type { JSX } from 'react'

import { t } from '@molecule/app-i18n'
import { getClassMap } from '@molecule/app-ui'

import type { TestItem } from '../types.js'
import { DockStrip, StatusMark, type StatusMarkState } from './DockStrip.js'
import type { TestsBarSummary, TestsBarTone } from './tests-bar-utilities.js'
import { summariseTestsBar } from './tests-bar-utilities.js'
import type { TestsRunState } from './tests-card-utilities.js'

/** The theme token each tone paints its dot and figures with. */
const TONE_COLOR: Record<TestsBarTone, string> = {
  idle: 'var(--mol-color-text-muted, #6b7280)',
  running: 'var(--mol-color-info, #2563eb)',
  passing: 'var(--mol-color-success, #16a34a)',
  failing: 'var(--mol-color-error, #dc2626)',
  stopped: 'var(--mol-color-warning, #d97706)',
  error: 'var(--mol-color-error, #dc2626)',
}

/**
 * The one-line summary the collapsed bar shows.
 *
 * @param summary - The derived run summary.
 * @returns The label.
 */
export function testsBarLabel(summary: TestsBarSummary): string {
  const { tone, passed, failed, skipped } = summary
  if (tone === 'running') {
    return summary.remaining > 0
      ? t(
          'ide.testsBar.running',
          { remaining: summary.remaining },
          { defaultValue: 'Running tests — {{remaining}} to go' },
        )
      : t('ide.testsBar.runningLast', undefined, { defaultValue: 'Running tests' })
  }
  if (tone === 'error') {
    return t('ide.testsBar.error', undefined, { defaultValue: 'Test run failed to finish' })
  }
  if (tone === 'stopped') {
    return t('ide.testsBar.stopped', undefined, { defaultValue: 'Test run stopped' })
  }
  if (tone === 'failing') {
    return t(
      'ide.testsBar.failing',
      { failed, passed },
      { defaultValue: '{{failed}} failing, {{passed}} passing' },
    )
  }
  if (tone === 'passing') {
    return skipped > 0
      ? t(
          'ide.testsBar.passingWithSkips',
          { passed, skipped },
          { defaultValue: '{{passed}} passing, {{skipped}} skipped' },
        )
      : t('ide.testsBar.passing', { passed }, { defaultValue: 'All {{passed}} passing' })
  }
  const count = summary.notRun
  return t(
    'ide.testsBar.notRun',
    { count },
    {
      count,
      defaultValue: count === 1 ? '{{count}} test not run yet' : '{{count}} tests not run yet',
    },
  )
}

/** The shared status mark each tone wears on the chip. */
const TONE_MARK: Record<TestsBarTone, StatusMarkState> = {
  idle: 'todo',
  running: 'active',
  passing: 'done',
  failing: 'failed',
  stopped: 'stopped',
  error: 'failed',
}

/**
 * The short label the tray chip wears: one figure, not the sentence — the counts
 * and the running file are in the opened detail.
 *
 * @param summary - The derived run summary.
 * @returns The label.
 */
export function testsChipLabel(summary: TestsBarSummary): string {
  const { tone, passed, failed } = summary
  if (tone === 'running')
    return t('ide.testsBar.runningLast', undefined, { defaultValue: 'Running tests' })
  if (tone === 'failing')
    return `${failed} ${t('ide.testsBar.failedLabel', undefined, { defaultValue: 'failing' })}`
  if (tone === 'passing')
    return `${passed} ${t('ide.testsBar.passedLabel', undefined, { defaultValue: 'passing' })}`
  return testsBarLabel(summary)
}

/** What the bar needs from its host. */
export interface TestStatusBarProps {
  /** The live run state. */
  run: TestsRunState
  /** The discovered tests, for naming the file that is running. */
  tests: TestItem[]
  /** Whether this strip is expanded. */
  expanded: boolean
  /** Toggle the expansion. */
  onToggle: () => void
  /** Open the tests browser (the `/test` card) — the place runs are started. */
  onOpen: () => void
  /** Stop the run in flight, when one is running. */
  onStop?: (() => void) | undefined
}

/**
 * Renders the tests status strip.
 *
 * @param props - See {@link TestStatusBarProps}.
 * @returns The bar.
 */
export function TestStatusBar({
  run,
  tests,
  expanded,
  onToggle,
  onOpen,
  onStop,
}: TestStatusBarProps): JSX.Element {
  const cm = getClassMap()
  const summary = summariseTestsBar(run, tests)
  const label = testsBarLabel(summary)

  return (
    <DockStrip
      molId="tests-bar"
      toggleMolId="tests-bar-toggle"
      rootProps={{ 'data-tests-tone': summary.tone }}
      expanded={expanded}
      onToggle={onToggle}
      label={<span data-mol-id="tests-bar-label">{label}</span>}
      hint={
        summary.tone === 'running' && (summary.currentTest ?? summary.currentFile) ? (
          <span data-mol-id="tests-bar-current">{`· ${summary.currentTest ?? summary.currentFile}`}</span>
        ) : undefined
      }
      actions={
        run.running && onStop ? (
          <button
            type="button"
            data-mol-id="tests-bar-stop"
            className={cm.cn(
              cm.button({ variant: 'solid', color: 'error', size: 'xs' }),
              cm.touchTargetCompact,
            )}
            onClick={(e) => {
              e.stopPropagation()
              onStop()
            }}
          >
            {t('ide.testsBar.stop', undefined, { defaultValue: 'Stop' })}
          </button>
        ) : undefined
      }
      detailActions={
        run.running && onStop ? undefined : (
          <button
            type="button"
            data-mol-id="tests-bar-open"
            className={cm.cn(
              cm.button({ variant: 'solid', color: 'primary', size: 'xs' }),
              cm.touchTargetCompact,
            )}
            onClick={(e) => {
              e.stopPropagation()
              onOpen()
            }}
          >
            {t('ide.testsBar.open', undefined, { defaultValue: 'Tests' })}
          </button>
        )
      }
      icon={<StatusMark state={TONE_MARK[summary.tone]} size={14} />}
      chipLabel={testsChipLabel(summary)}
    >
      <div
        data-mol-id="tests-bar-detail"
        className={cm.cn(cm.textMuted, cm.textSize('xs'))}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <span data-mol-id="tests-bar-passed">
            <span style={{ color: TONE_COLOR.passing, fontWeight: 600 }}>{summary.passed}</span>{' '}
            {t('ide.testsBar.passedLabel', undefined, { defaultValue: 'passing' })}
          </span>
          <span data-mol-id="tests-bar-failed">
            <span style={{ color: TONE_COLOR.failing, fontWeight: 600 }}>{summary.failed}</span>{' '}
            {t('ide.testsBar.failedLabel', undefined, { defaultValue: 'failing' })}
          </span>
          <span data-mol-id="tests-bar-skipped">
            <span style={{ color: TONE_COLOR.stopped, fontWeight: 600 }}>{summary.skipped}</span>{' '}
            {t('ide.testsBar.skippedLabel', undefined, { defaultValue: 'skipped' })}
          </span>
          {summary.tone === 'running' ? (
            <span data-mol-id="tests-bar-remaining">
              <span style={{ color: TONE_COLOR.running, fontWeight: 600 }}>
                {summary.remaining}
              </span>{' '}
              {t('ide.testsBar.remainingLabel', undefined, { defaultValue: 'to go' })}
            </span>
          ) : null}
        </div>
        {summary.currentFile ? (
          <div data-mol-id="tests-bar-current-file">
            {t(
              'ide.testsBar.currentFile',
              { file: summary.currentFile },
              { defaultValue: 'Running {{file}}' },
            )}
            {summary.currentTest ? ` › ${summary.currentTest}` : ''}
          </div>
        ) : null}
        {run.error ? <div data-mol-id="tests-bar-error">{run.error}</div> : null}
      </div>
    </DockStrip>
  )
}
