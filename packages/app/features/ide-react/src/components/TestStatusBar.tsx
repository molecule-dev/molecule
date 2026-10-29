/**
 * The tests status bar — a collapsed strip above the commit bar saying how the
 * project's tests stand, and what is running right now.
 *
 * The summary stays visible while the tests browser is closed, so the person
 * can follow a run and reopen its results from the composer.
 *
 * It deliberately borrows the commit bar's chrome — same hairline top border,
 * same `8px 8px 8px 10px` padding, same 12px chevron rotating 90° on expand,
 * same muted `xs` label. The summary opens the tests browser directly; there
 * is no intermediate disclosure or second navigation button.
 *
 * The status mark carries the run's tone; the short label summarises the result.
 * The tests browser contains the full counts, current file and run output.
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
 * The short label the tray chip wears; full details live in the tests browser.
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
  /**
   * Legacy expansion state.
   * @deprecated The summary opens the tests browser directly.
   */
  expanded?: boolean
  /**
   * Legacy disclosure callback.
   * @deprecated The summary opens the tests browser directly.
   */
  onToggle?: () => void
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
export function TestStatusBar({ run, tests, onOpen, onStop }: TestStatusBarProps): JSX.Element {
  const cm = getClassMap()
  const summary = summariseTestsBar(run, tests)
  const label = testsBarLabel(summary)

  return (
    <DockStrip
      molId="tests-bar"
      toggleMolId="tests-bar-toggle"
      rootProps={{ 'data-tests-tone': summary.tone }}
      expanded={false}
      onToggle={onOpen}
      onActivate={onOpen}
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
      icon={<StatusMark state={TONE_MARK[summary.tone]} size={14} />}
      chipLabel={testsChipLabel(summary)}
    />
  )
}
