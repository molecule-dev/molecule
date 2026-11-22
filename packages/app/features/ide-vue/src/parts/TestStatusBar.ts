/**
 * The tests status bar — a collapsed strip above the commit bar saying how the
 * project's tests stand, and what is running right now.
 *
 * The summary stays visible while the tests browser is closed, so the person
 * can follow a run and reopen its results from the composer.
 *
 * Vue counterpart of `@molecule/app-ide-react`'s `TestStatusBar` (see that
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

import { createTextVNode, defineComponent, h, type PropType, type VNodeChild } from 'vue'

import type { TestItem, TestsRunState } from '@molecule/app-ide-panel-logic'
import type { TestsBarTone } from '@molecule/app-ide-panel-logic/panels'
import {
  runningLabel,
  summariseTestsBar,
  testsBarLabel,
  testsChipLabel,
} from '@molecule/app-ide-panel-logic/panels'
import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import { DockStrip, StatusMark, type StatusMarkState } from './DockStrip.js'

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
export const TestStatusBar = defineComponent({
  name: 'TestStatusBar',
  inheritAttrs: false,
  props: {
    /** The live run state. */
    run: { type: Object as PropType<TestsRunState>, required: true },
    /** The discovered tests, for naming the file that is running. */
    tests: { type: Array as PropType<TestItem[]>, required: true },
    /**
     * Legacy expansion state.
     * @deprecated The summary opens the tests browser directly.
     */
    expanded: { type: Boolean, required: false, default: undefined },
    /**
     * Legacy disclosure callback.
     * @deprecated The summary opens the tests browser directly.
     */
    onToggle: { type: Function as PropType<() => void>, required: false, default: undefined },
    /** Open the tests browser (the `/test` card) — the place runs are started. */
    onOpen: { type: Function as PropType<() => void>, required: true },
    /** Stop the run in flight, when one is running. */
    onStop: { type: Function as PropType<() => void>, required: false, default: undefined },
    /** The agent's display name, for a run the agent started. */
    agentName: { type: String, required: false, default: undefined },
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()

    return (): VNodeChild => {
      const summary = summariseTestsBar(props.run, props.tests)
      // A run this panel only watches says who started it; the counts are in
      // the browser.
      const label =
        props.run.running && props.run.external
          ? runningLabel(t, props.run, props.agentName)
          : testsBarLabel(t, summary)
      const inFlight = summary.currentTest ?? summary.currentFile ?? props.run.command
      return h(DockStrip, {
        molId: 'tests-bar',
        toggleMolId: 'tests-bar-toggle',
        rootProps: { 'data-tests-tone': summary.tone },
        expanded: false,
        onToggle: props.onOpen,
        onActivate: props.onOpen,
        label: h('span', { 'data-mol-id': 'tests-bar-label' }, [label]),
        hint:
          summary.tone === 'running' && inFlight
            ? h('span', { 'data-mol-id': 'tests-bar-current' }, [`· ${inFlight}`])
            : undefined,
        actions:
          props.run.running && props.onStop
            ? h(
                'button',
                {
                  type: 'button',
                  'data-mol-id': 'tests-bar-stop',
                  class: cm.cn(
                    cm.button({ variant: 'solid', color: 'error', size: 'xs' }),
                    cm.touchTargetCompact,
                  ),
                  onClick: (event: MouseEvent) => {
                    event.stopPropagation()
                    props.onStop?.()
                  },
                },
                [t('ide.testsBar.stop', undefined, { defaultValue: 'Stop' })],
              )
            : undefined,
        icon: h(StatusMark, { state: TONE_MARK[summary.tone], size: 14 }),
        chipLabel: createTextVNode(
          props.run.running && props.run.external ? label : testsChipLabel(t, summary),
        ),
      })
    }
  },
})
