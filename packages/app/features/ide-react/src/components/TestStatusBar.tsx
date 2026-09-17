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
 * Colour is carried by the STATUS DOT and the count figures, never by the whole
 * strip: a bar that turns red across its full width reads as an error in the
 * chat itself. Every colour comes from a theme token with a fallback, per
 * DESIGN.md's semantic colours — no hardcoded palette.
 *
 * @module
 */

import type { JSX } from 'react'

import { t } from '@molecule/app-i18n'
import { getClassMap } from '@molecule/app-ui'

import type { TestItem } from '../types.js'
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
  return t('ide.testsBar.idle', undefined, { defaultValue: 'Tests not run yet' })
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
  const color = TONE_COLOR[summary.tone]
  const label = testsBarLabel(summary)

  return (
    <div
      data-mol-id="tests-bar"
      data-tests-tone={summary.tone}
      style={{
        borderTop: '1px solid rgba(128,128,128,0.15)',
        padding: '8px 8px 8px 10px',
      }}
    >
      <div
        role="button"
        tabIndex={0}
        data-mol-id="tests-bar-toggle"
        aria-expanded={expanded}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onToggle()
          }
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            width="12"
            height="12"
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
          {/* The status dot carries the colour. */}
          <span
            data-mol-id="tests-bar-dot"
            aria-hidden="true"
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: color,
              flexShrink: 0,
              // No pulse: the commit bar's own badge settled that question
              // (AutoCommitBadge — "no pulse animation"), and "running" is
              // already carried by the label, the count and the Stop button.
            }}
          />
          <span
            data-mol-id="tests-bar-label"
            className={cm.cn(cm.textMuted, cm.textSize('xs'))}
            style={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {label}
          </span>
          {/* The running test, on the same line when there is room — this is the
              half that explains a preview moving by itself. */}
          {summary.tone === 'running' && (summary.currentTest ?? summary.currentFile) ? (
            <span
              data-mol-id="tests-bar-current"
              className={cm.cn(cm.textMuted, cm.textSize('xs'))}
              style={{
                opacity: 0.75,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                minWidth: 0,
              }}
            >
              {`· ${summary.currentTest ?? summary.currentFile}`}
            </span>
          ) : null}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {run.running && onStop ? (
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
          ) : (
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
          )}
        </div>
      </div>

      {expanded ? (
        <div
          data-mol-id="tests-bar-detail"
          className={cm.cn(cm.textMuted, cm.textSize('xs'))}
          style={{
            marginTop: 6,
            paddingLeft: 16,
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
      ) : null}
    </div>
  )
}
