<!--
  The tests status bar — a collapsed strip above the commit bar saying how the
  project's tests stand, and what is running right now.

  The summary stays visible while the tests browser is closed, so the person
  can follow a run and reopen its results from the composer.

  Svelte counterpart of `@molecule/app-ide-react`'s `TestStatusBar` (see that
  file for the design notes): the same props (React names), the same DOM for
  the same input, the same callbacks. The bar borrows the commit bar's chrome
  through the shared `DockStrip`, the summary opens the tests browser directly
  (`onActivate`), and the status mark carries the run's tone. The deprecated
  `expanded`/`onToggle` props are accepted and ignored the way React's are.
  The component is a part (React renders it inside ChatPanel without exporting
  it), so it lives in `src/parts/`.

  Styling uses `getClassMap()` (`cm.*`); the only inline styles are layout the
  ClassMap can't express. All user-facing text goes through `t()`.
-->
<script module lang="ts">
  import type { TestItem, TestsRunState } from '@molecule/app-ide-panel-logic'
  import type { TestsBarTone } from '@molecule/app-ide-panel-logic/panels'

  /** Props for `TestStatusBar` — the React prop names, React's own contract. */
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

  /** The shared status mark each tone wears on the chip. */
  const TONE_MARK: Record<TestsBarTone, StatusMarkState> = {
    idle: 'todo',
    running: 'active',
    passing: 'done',
    failing: 'failed',
    stopped: 'stopped',
    error: 'failed',
  }
</script>

<script lang="ts">
  import {
    runningLabel,
    summariseTestsBar,
    testsBarLabel,
    testsChipLabel,
  } from '@molecule/app-ide-panel-logic/panels'
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import DockStrip from './DockStrip.svelte'
  import StatusMark, { type StatusMarkState } from './StatusMark.svelte'

  let {
    run,
    tests,
    // Legacy expansion props: accepted, never read — the summary opens the
    // tests browser directly.
    onOpen,
    onStop,
    agentName,
  }: TestStatusBarProps = $props()

  const { t } = useTranslation()
  const cm = getClassMap()

  const summary = $derived(summariseTestsBar(run, tests))
  // A run this panel only watches says who started it; the counts are in the
  // browser.
  const label = $derived(
    run.running && run.external ? runningLabel(t, run, agentName) : testsBarLabel(t, summary),
  )
  const chip = $derived(run.running && run.external ? label : testsChipLabel(t, summary))
  // What is in flight right now: the test on screen, else its file, else the
  // command an outside run is on.
  const inFlight = $derived(summary.currentTest ?? summary.currentFile ?? run.command)
  const hasHint = $derived(summary.tone === 'running' && !!inFlight)
  const showStop = $derived(run.running && onStop != null)
</script>

{#snippet labelNode()}
  <span data-mol-id="tests-bar-label">{label}</span>
{/snippet}
{#snippet hintNode()}
  <span data-mol-id="tests-bar-current">{`· ${inFlight}`}</span>
{/snippet}
{#snippet iconNode()}
  <StatusMark state={TONE_MARK[summary.tone]} size={14} />
{/snippet}
{#snippet actionsNode()}
  <button
    type="button"
    data-mol-id="tests-bar-stop"
    class={cm.cn(
      cm.button({ variant: 'solid', color: 'error', size: 'xs' }),
      cm.touchTargetCompact,
    )}
    onclick={(e) => {
      e.stopPropagation()
      onStop?.()
    }}
  >
    {t('ide.testsBar.stop', undefined, { defaultValue: 'Stop' })}
  </button>
{/snippet}

<DockStrip
  molId="tests-bar"
  toggleMolId="tests-bar-toggle"
  rootProps={{ 'data-tests-tone': summary.tone }}
  expanded={false}
  onToggle={onOpen}
  onActivate={onOpen}
  label={labelNode}
  hint={hasHint ? hintNode : undefined}
  actions={showStop ? actionsNode : undefined}
  icon={iconNode}
  chipLabel={chip}
/>
