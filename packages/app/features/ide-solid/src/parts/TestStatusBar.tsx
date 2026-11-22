/**
 * The tests status bar — a collapsed strip above the commit bar saying how the
 * project's tests stand, and what is running right now.
 *
 * The summary stays visible while the tests browser is closed, so the person
 * can follow a run and reopen its results from the composer.
 *
 * Solid counterpart of `@molecule/app-ide-react`'s `TestStatusBar` (see that
 * file for the design notes): the same props (React names), the same DOM for
 * the same input, the same callbacks. The bar borrows the commit bar's chrome
 * through the shared {@link DockStrip}, the summary opens the tests browser
 * directly (`onActivate`), and the status mark carries the run's tone. The
 * deprecated `expanded`/`onToggle` props are accepted and ignored the way
 * React's are. The component is a part (React renders it inside ChatPanel
 * without exporting it), so it lives in `src/parts/`.
 *
 * @module
 */

import { createMemo, type JSX } from 'solid-js'

import type { TestItem, TestsRunState } from '@molecule/app-ide-panel-logic'
import type { TestsBarTone } from '@molecule/app-ide-panel-logic/panels'
import {
  runningLabel,
  summariseTestsBar,
  testsBarLabel,
  testsChipLabel,
} from '@molecule/app-ide-panel-logic/panels'
import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import { DockStrip, StatusMark, type StatusMarkState } from './DockStrip.jsx'

/** The shared status mark each tone wears on the chip. */
const TONE_MARK: Record<TestsBarTone, StatusMarkState> = {
  idle: 'todo',
  running: 'active',
  passing: 'done',
  failing: 'failed',
  stopped: 'stopped',
  error: 'failed',
}

/** Props for {@link TestStatusBar} — the React prop names, React's own contract. */
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
  /** The agent's display name, for a run the agent started. */
  agentName?: string
}

/**
 * Renders the tests status strip. React renders it under the React name
 * `TestStatusBar`.
 *
 * @param props - See {@link TestStatusBarProps}.
 * @returns The bar.
 */
export function TestStatusBar(props: TestStatusBarProps): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  // The body runs once, so the summary and its labels are memos over the
  // props: a replaced run state re-renders the bar the way React's
  // re-render does.
  const summary = createMemo(() => summariseTestsBar(props.run, props.tests))
  const label = createMemo(() =>
    props.run.running && props.run.external
      ? runningLabel(t, props.run, props.agentName)
      : testsBarLabel(t, summary()),
  )
  const chipLabel = createMemo(() =>
    props.run.running && props.run.external ? label() : testsChipLabel(t, summary()),
  )
  const inFlight = createMemo(
    () => summary().currentTest ?? summary().currentFile ?? props.run.command,
  )
  const stoppable = createMemo(() => props.run.running && props.onStop != null)

  return (
    <DockStrip
      molId="tests-bar"
      toggleMolId="tests-bar-toggle"
      rootProps={{ 'data-tests-tone': summary().tone }}
      expanded={false}
      onToggle={props.onOpen}
      onActivate={props.onOpen}
      label={<span data-mol-id="tests-bar-label">{label()}</span>}
      hint={
        summary().tone === 'running' && inFlight() ? (
          <span data-mol-id="tests-bar-current">{`· ${inFlight()}`}</span>
        ) : undefined
      }
      actions={
        stoppable() ? (
          <button
            type="button"
            data-mol-id="tests-bar-stop"
            class={cm.cn(
              cm.button({ variant: 'solid', color: 'error', size: 'xs' }),
              cm.touchTargetCompact,
            )}
            onClick={(e) => {
              e.stopPropagation()
              props.onStop?.()
            }}
          >
            {t('ide.testsBar.stop', undefined, { defaultValue: 'Stop' })}
          </button>
        ) : undefined
      }
      icon={<StatusMark state={TONE_MARK[summary().tone]} size={14} />}
      chipLabel={<>{chipLabel()}</>}
    />
  )
}
