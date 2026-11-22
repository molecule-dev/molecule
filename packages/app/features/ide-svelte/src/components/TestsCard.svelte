<!--
  TestsCard: the Svelte counterpart of `@molecule/app-ide-react`'s `TestsCard`
  — the `/test` browser: the project's own tests, listed, filtered and runnable
  from the chat. Same props (React names), same DOM for the same input. Rows
  are grouped End-to-end then Unit, and within a kind by the project directory
  that owns them; a running row names the test on screen with a live per-file
  tally; the Skip control drops the command the run is on without ending it.
  The card is PRESENTATIONAL — the list and the in-flight run live in the host,
  so a run keeps streaming while the overlay is closed and re-opened. See the
  React file for the design notes.

  Styling uses `getClassMap()` (`cm.*`); the only inline styles are layout the
  ClassMap can't express. All user-facing text goes through `t()`.
-->
<script module lang="ts">
  import type {
    TestCaseProgress,
    TestGroup,
    TestItem,
    TestKind,
    TestResultEntry,
    TestStatus,
  } from '@molecule/app-ide-panel-logic'
  import {
    canSkipRun,
    chatCardStyle,
    countByKind,
    currentRunRowId,
    failedTests,
    filterTests,
    groupTests,
    isRowRunning,
    summarizeResults,
    testCaseLabel,
    testRowLabel,
  } from '@molecule/app-ide-panel-logic'
  import { runningLabel } from '@molecule/app-ide-panel-logic/panels'
  import { useTranslation, type UseTranslationResult } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  /**
   * The card's button vocabulary, which is the command cards' vocabulary (see
   * molecule DESIGN.md → Command cards). Every ACTION is a button that LOOKS
   * like a button — a filled or bordered box, never text on transparent: the
   * one headline action, every other action (Run e2e/unit/group, a row Run,
   * Fix with Synthase), and Stop in the design system's error colour; `ghost`
   * is reserved for the Show/Hide output toggles.
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

  import type * as types from '../types.js'

  /** Re-exported from the plain-TS contract module (src/types.ts). */
  export type TestsCardProps = types.TestsCardProps

  /** Re-exported from the plain-TS contract module (src/types.ts). */
  export type TestsStatus = types.TestsStatus

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
    const where =
      group.label ?? t('ide.tests.workspace.root', undefined, { defaultValue: 'Project' })
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
    if (status === 'passed')
      return t('ide.tests.statusPassed', undefined, { defaultValue: 'Passed' })
    if (status === 'failed')
      return t('ide.tests.statusFailed', undefined, { defaultValue: 'Failed' })
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
</script>

<script lang="ts">
  let {
    tests,
    status,
    run,
    initialQuery,
    canRun,
    onRun,
    onCancel,
    onSkipCurrent,
    onFix,
    fixDisabledReason,
    isLight,
    embedded,
    agentName,
  }: TestsCardProps = $props()

  const { t } = useTranslation()
  // The container chrome shared by the chat timeline's boxed cards, with the
  // radius written as `px` the way the DOM takes it here (the neutral helper
  // returns a unitless number for React).
  const card = chatCardStyle()

  // `query` seeds ONCE from `initialQuery` (React's `useState`): a later
  // `initialQuery` prop never reseeds it.
  // svelte-ignore state_referenced_locally
  let query = $state(initialQuery)
  // The run output starts COLLAPSED: the status pills carry the state and the
  // output is one click away when someone wants it.
  let showOutput = $state(false)
  // A failure's output starts COLLAPSED too — the row's status pill says what
  // happened; the detail is one click away for whoever wants it. Keyed by the
  // row's test id, the way React keeps a row component while its key is stable.
  let failureOpen = $state<Record<string, boolean>>({})
  let searchEl = $state<HTMLInputElement | null>(null)
  let outputEl = $state<HTMLPreElement | null>(null)

  const cm = $derived(getClassMap())

  // Keep the live output pinned to the newest line unless the reader scrolled up
  // inside the block themselves. No-ops while it is collapsed (no element).
  $effect(() => {
    void run.output
    void showOutput
    const el = outputEl
    if (!el) return
    if (el.scrollHeight - el.scrollTop - el.clientHeight > 40) return
    el.scrollTop = el.scrollHeight
  })

  // React keeps the `value` ATTRIBUTE in step with the controlled value
  // (Svelte's `value={…}` sets only the property; the serialized markup
  // carries both).
  $effect(() => {
    searchEl?.setAttribute('value', query)
  })

  const filtered = $derived.by(() => filterTests(tests, query))
  const groups = $derived.by(() => groupTests(filtered))
  const counts = $derived.by(() => countByKind(filtered))
  const summary = $derived.by(() => summarizeResults(filtered, run.results))
  const failures = $derived.by(() => failedTests(filtered, run.results))

  const rowBorder = $derived(isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)')
  // The same neutral inset the sibling cards give their fields, so the search
  // box READS as a field on the clean overlay surface.
  const fieldBg = $derived(isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.06)')
  // Same box as every card button: 26px tall, 3px radius (the button CVA's
  // h-[26px] / rounded-[3px]) — the chat's fields and buttons share one size.
  const fieldStyle = $derived(
    `width: 100%; height: 26px; padding: 0px 6px; border-radius: 3px; border: 1px solid ${rowBorder}; background: ${fieldBg}; color: inherit; outline: none`,
  )
  const containerStyle = $derived(
    embedded
      ? 'padding: 10px 12px'
      : `padding: ${card.padding}; border-radius: 8px; margin-bottom: 16px; border: ${card.border}; background: ${card.background}`,
  )
  const disabledReason = $derived(
    !canRun
      ? t('ide.tests.viewerCannotRun', undefined, {
          defaultValue: 'Only editors can run this project’s tests.',
        })
      : status === 'unavailable'
        ? t('ide.tests.needsSandbox', undefined, {
            defaultValue: 'Start the project to run its tests.',
          })
        : null,
  )
  const runnable = $derived(canRun && status === 'ready' && !run.running)
  const fixable = $derived(fixDisabledReason === null)
  // The row the Skip acts on. The control exists only while the run is on an
  // identifiable row AND the host serves skipping; a viewer still SEES it, with
  // the reason on it, rather than watching it vanish without explanation.
  const skipRowId = $derived(onSkipCurrent && canSkipRun(run) ? currentRunRowId(run) : null)
  const skipDisabledReason = $derived(
    !canRun
      ? t('ide.tests.viewerCannotSkip', undefined, {
          defaultValue: 'Only editors can skip this project’s tests.',
        })
      : null,
  )
</script>

<div data-mol-id="tests-card" class={cm.textSize('xs')} style={containerStyle}>
  <div
    style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px; flex-wrap: wrap"
  >
    <!-- Left title area — a (possibly empty when embedded) flex child so the primary action below is ALWAYS pushed right, the same header structure as the sibling command cards. -->
    <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0">
      {#if !embedded}
        <div class={cm.cn(cm.fontWeight('medium'), cm.textSize('sm'))} style="flex-shrink: 0">
          {t('ide.tests.heading', undefined, { defaultValue: 'Tests' })}
        </div>
      {/if}
      {#if run.running}
        <span
          data-mol-id="tests-card-running"
          class={cm.cn(cm.textMuted, cm.textSize('xs'))}
          style="display: inline-flex; align-items: center; gap: 4px"
        >
          <span class={cm.spinner({ size: 'xs' })} aria-hidden="true"></span>
          {runningLabel(t, run, agentName)}
        </span>
      {:else if summary.reported > 0}
        <span
          data-mol-id="tests-card-summary"
          class={cm.textSize('xs')}
          style="display: inline-flex; align-items: center; gap: 6px"
        >
          {#if summary.passed > 0}
            <span class={cm.textSuccess}>
              {t(
                'ide.tests.passedCount',
                { count: summary.passed },
                { defaultValue: '{{count}} passed' },
              )}
            </span>
          {/if}
          {#if summary.failed > 0}
            <span class={cm.textError}>
              {t(
                'ide.tests.failedCount',
                { count: summary.failed },
                { defaultValue: '{{count}} failed' },
              )}
            </span>
          {/if}
          <!-- Skipped is its OWN number beside the other two. A file that was skipped did not pass, and the summary must never let it be read as one. -->
          {#if summary.skipped > 0}
            <span data-mol-id="tests-card-summary-skipped" class={cm.textMuted}>
              {t(
                'ide.tests.skippedCount',
                { count: summary.skipped },
                { defaultValue: '{{count}} skipped' },
              )}
            </span>
          {/if}
        </span>
      {/if}
    </div>
    <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap">
      {#if counts.e2e > 0 && counts.unit > 0}
        <button
          type="button"
          data-mol-id="tests-card-run-e2e"
          onclick={() => onRun({ ids: idsOfKind(filtered, 'e2e') })}
          disabled={!runnable}
          title={disabledReason ?? undefined}
          class={cm.cn(SECONDARY_ACTION(cm))}
          style="flex-shrink: 0"
        >
          {t('ide.tests.runE2e', undefined, { defaultValue: 'Run e2e' })}
        </button>
        <button
          type="button"
          data-mol-id="tests-card-run-unit"
          onclick={() => onRun({ ids: idsOfKind(filtered, 'unit') })}
          disabled={!runnable}
          title={disabledReason ?? undefined}
          class={cm.cn(SECONDARY_ACTION(cm))}
          style="flex-shrink: 0"
        >
          {t('ide.tests.runUnit', undefined, { defaultValue: 'Run unit' })}
        </button>
      {/if}
      {#if !run.running && failures.length > 0}
        <button
          type="button"
          data-mol-id="tests-card-fix-all"
          onclick={() => onFix(failures)}
          disabled={!fixable}
          title={fixDisabledReason ?? undefined}
          class={cm.cn(SECONDARY_ACTION(cm))}
          style="flex-shrink: 0"
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
      {/if}
      {#if run.running}
        <!-- A run this panel only watches (the agent's, the platform's, another tab's) cannot be stopped from here, so no Stop is offered. -->
        {#if !run.external}
          <button
            type="button"
            data-mol-id="tests-card-cancel"
            onclick={onCancel}
            class={cm.cn(DESTRUCTIVE_ACTION(cm))}
            style="flex-shrink: 0"
          >
            {t('ide.tests.stop', undefined, { defaultValue: 'Stop' })}
          </button>
        {/if}
      {:else if filtered.length > 0}
        <button
          type="button"
          data-mol-id="tests-card-run-all"
          onclick={() => onRun({ ids: filtered.map((test) => test.id) })}
          disabled={!runnable}
          title={disabledReason ?? undefined}
          class={cm.cn(PRIMARY_ACTION(cm))}
          style="flex-shrink: 0"
        >
          {t('ide.tests.runAll', undefined, { defaultValue: 'Run all' })}
        </button>
      {/if}
    </div>
  </div>
  {#if run.external && run.command}
    <!-- The command a run this panel did not start is running: an agent's own command names no tests up front, so this says what is going on while its results arrive. -->
    <div
      data-mol-id="tests-card-command"
      class={cm.cn(cm.textMuted, cm.textSize('xs'))}
      title={run.command}
      style="font-family: var(--mol-font-mono, monospace); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-bottom: 6px"
    >
      {run.command}
    </div>
  {/if}
  <!-- Search / filter -->
  <input
    bind:this={searchEl}
    value={query}
    data-mol-id="tests-card-search"
    oninput={(event) => {
      query = event.currentTarget.value
    }}
    placeholder={t('ide.tests.searchPlaceholder', undefined, { defaultValue: 'Filter tests…' })}
    class={cm.textSize('xs')}
    style={`${fieldStyle}; margin-bottom: 6px`}
  />
  <!-- Why the run controls are dead, stated in the card rather than in a toast that has already gone by the time the person looks. -->
  {#if disabledReason && status !== 'loading'}
    <div data-mol-id="tests-card-disabled-reason" class={cm.textMuted}>{disabledReason}</div>
  {/if}
  {#if status === 'loading'}
    <div class={cm.textMuted} style="padding: 6px 0px">
      {t('ide.tests.loading', undefined, { defaultValue: 'Loading tests…' })}
    </div>
  {/if}
  {#if status === 'unavailable'}
    <div data-mol-id="tests-card-unavailable" class={cm.textMuted} style="padding: 6px 0px">
      {t('ide.tests.waitingForSandbox', undefined, {
        defaultValue: 'Start the project to see its tests.',
      })}
    </div>
  {/if}
  {#if status === 'error'}
    <div data-mol-id="tests-card-error" class={cm.textMuted} style="padding: 6px 0px">
      {t('ide.tests.listError', undefined, {
        defaultValue: 'Could not list this project’s tests.',
      })}
    </div>
  {/if}
  {#if status === 'ready' && filtered.length === 0}
    <div data-mol-id="tests-card-empty" class={cm.textMuted} style="padding: 6px 0px">
      {query.trim()
        ? t('ide.tests.noMatch', undefined, {
            defaultValue: 'No tests match your search.',
          })
        : t('ide.tests.empty', undefined, {
            defaultValue: 'No tests in this project yet.',
          })}
    </div>
  {/if}
  {#if status === 'ready'}
    {#each groups as group (group.kind + ':' + group.workspace)}
      {@const groupId = `${group.kind}-${group.workspace}`}
      <div
        data-mol-id={`tests-card-group-${groupId}`}
        class={cm.borderT}
        style={`padding: 6px 0px; border-color: ${rowBorder}`}
      >
        <div
          style="display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap"
        >
          <div class={cm.cn(cm.fontWeight('medium'))} style="min-width: 0px">
            {groupHeading(t, group)}
          </div>
          <button
            type="button"
            data-mol-id={`tests-card-run-group-${groupId}`}
            onclick={() => onRun({ ids: group.items.map((item) => item.id) })}
            disabled={!runnable}
            title={disabledReason ?? undefined}
            class={cm.cn(SECONDARY_ACTION(cm))}
            style="flex-shrink: 0"
          >
            {t('ide.tests.runGroup', undefined, { defaultValue: 'Run group' })}
          </button>
        </div>
        {#each group.items as item (item.id)}
          {@const result: TestResultEntry | undefined = run.results[item.id]}
          {@const running = isRowRunning(run, item.id)}
          {@const progress: TestCaseProgress | undefined = run.cases[item.id]}
          {@const skippable = skipRowId === item.id}
          {@const caseLabel = testCaseLabel(progress?.current)}
          {@const caseTally =
            (progress?.passed ?? 0) + (progress?.failed ?? 0) + (progress?.skipped ?? 0)}
          <div data-mol-id={`tests-card-row-${item.id}`} style="padding: 4px 0px">
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap">
              <div
                class={cm.textMuted}
                title={item.file}
                style="flex: 1 1 140px; min-width: 0px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: var(--mol-font-mono, monospace)"
              >
                {testRowLabel(item)}
              </div>
              {#if running}
                <span
                  data-mol-id={`tests-card-status-${item.id}`}
                  class={cm.textMuted}
                  style="display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0"
                  ><span class={cm.spinner({ size: 'xs' })} aria-hidden="true"></span>{t(
                    'ide.tests.running',
                    undefined,
                    { defaultValue: 'Running…' },
                  )}</span
                >
              {:else if result}
                <span
                  data-mol-id={`tests-card-status-${item.id}`}
                  class={result.status === 'passed'
                    ? cm.textSuccess
                    : result.status === 'failed'
                      ? cm.textError
                      : cm.textMuted}
                  style="flex-shrink: 0"
                >
                  {statusLabel(t, result.status)}
                </span>
              {/if}
              <!-- Skip lives on the row the run is ON — Stop in the header is still "stop everything". Same filled `xs` button as every other action on this card (DESIGN.md → Command cards); nothing new to learn. -->
              {#if skippable}
                <button
                  type="button"
                  data-mol-id={`tests-card-skip-${item.id}`}
                  onclick={() => onSkipCurrent?.()}
                  disabled={skipDisabledReason !== null || run.skipPending}
                  title={skipDisabledReason ?? undefined}
                  class={cm.cn(SECONDARY_ACTION(cm))}
                  style="flex-shrink: 0"
                >
                  {run.skipPending
                    ? t('ide.tests.skipping', undefined, { defaultValue: 'Skipping…' })
                    : t('ide.tests.skip', undefined, { defaultValue: 'Skip' })}
                </button>
              {/if}
              <button
                type="button"
                data-mol-id={`tests-card-run-${item.id}`}
                onclick={() => onRun({ ids: [item.id] })}
                disabled={!runnable}
                title={disabledReason ?? undefined}
                class={cm.cn(SECONDARY_ACTION(cm))}
                style="flex-shrink: 0"
              >
                {t('ide.tests.run', undefined, { defaultValue: 'Run' })}
              </button>
            </div>
            <!-- What is on screen RIGHT NOW: the runner's own test title (and its group), plus how this file's tests have gone so far. Muted, at the card's own `xs` scale, wrapping rather than overflowing at 390px. -->
            {#if running && (caseLabel !== '' || caseTally > 0)}
              <div
                data-mol-id={`tests-card-case-${item.id}`}
                class={cm.textMuted}
                style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap; min-width: 0px; line-height: 1.4"
              >
                {#if caseLabel !== ''}
                  <span
                    data-mol-id={`tests-card-case-title-${item.id}`}
                    title={caseLabel}
                    style="flex: 1 1 140px; min-width: 0px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap"
                  >
                    {caseLabel}
                  </span>
                {/if}
                {#if caseTally > 0}
                  <span
                    data-mol-id={`tests-card-case-tally-${item.id}`}
                    style="display: inline-flex; align-items: center; gap: 6px; flex-shrink: 0"
                  >
                    {#if (progress?.passed ?? 0) > 0}
                      <span class={cm.textSuccess}>
                        {t(
                          'ide.tests.passedCount',
                          { count: progress?.passed ?? 0 },
                          { defaultValue: '{{count}} passed' },
                        )}
                      </span>
                    {/if}
                    {#if (progress?.failed ?? 0) > 0}
                      <span class={cm.textError}>
                        {t(
                          'ide.tests.failedCount',
                          { count: progress?.failed ?? 0 },
                          { defaultValue: '{{count}} failed' },
                        )}
                      </span>
                    {/if}
                    {#if (progress?.skipped ?? 0) > 0}
                      <span>
                        {t(
                          'ide.tests.skippedCount',
                          { count: progress?.skipped ?? 0 },
                          { defaultValue: '{{count}} skipped' },
                        )}
                      </span>
                    {/if}
                  </span>
                {/if}
              </div>
            {/if}
            {#if result?.status === 'failed'}
              <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap">
                {#if result.output}
                  <button
                    type="button"
                    data-mol-id={`tests-card-failure-toggle-${item.id}`}
                    aria-expanded={failureOpen[item.id] ? 'true' : 'false'}
                    onclick={() => (failureOpen[item.id] = !failureOpen[item.id])}
                    class={cm.cn(QUIET_TOGGLE(cm))}
                    style="flex-shrink: 0"
                  >
                    {failureOpen[item.id]
                      ? t('ide.tests.hideOutput', undefined, { defaultValue: 'Hide output' })
                      : t('ide.tests.showOutput', undefined, { defaultValue: 'Show output' })}
                  </button>
                {/if}
                <button
                  type="button"
                  data-mol-id={`tests-card-fix-${item.id}`}
                  onclick={() => onFix([{ item, output: result.output }])}
                  disabled={!fixable}
                  title={fixDisabledReason ?? undefined}
                  class={cm.cn(SECONDARY_ACTION(cm))}
                  style="flex-shrink: 0"
                >
                  {t('ide.tests.fixWithSynthase', undefined, {
                    defaultValue: 'Fix with Synthase',
                  })}
                </button>
              </div>
            {/if}
            {#if result?.status === 'failed' && result.output && failureOpen[item.id]}
              <pre
                data-mol-id={`tests-card-failure-${item.id}`}
                class={cm.textSize('xs')}
                style={`margin: 4px 0px 0px; padding: 6px 8px; border-radius: 4px; border: 1px solid ${rowBorder}; white-space: pre-wrap; word-break: break-word; max-height: 200px; overflow: auto; font-family: var(--mol-font-mono, monospace)`}>{result.output}</pre>
            {/if}
          </div>
        {/each}
      </div>
    {/each}
  {/if}
  {#if run.output.length > 0}
    <!-- The running command's live output — the card's own output area, the same block the sibling scripts card shows a script's captured output in. -->
    <div data-mol-id="tests-card-output-area" style="margin-top: 6px">
      <button
        type="button"
        data-mol-id="tests-card-output-toggle"
        aria-expanded={showOutput ? 'true' : 'false'}
        onclick={() => (showOutput = !showOutput)}
        class={cm.cn(QUIET_TOGGLE(cm))}
        style="flex-shrink: 0"
      >
        {showOutput
          ? t('ide.tests.hideOutput', undefined, { defaultValue: 'Hide output' })
          : t('ide.tests.showOutput', undefined, { defaultValue: 'Show output' })}
      </button>
      {#if showOutput}
        <pre
          bind:this={outputEl}
          data-mol-id="tests-card-output"
          class={cm.textSize('xs')}
          style={`margin: 0px; padding: 6px 8px; border-radius: 4px; border: 1px solid ${rowBorder}; white-space: pre-wrap; word-break: break-word; max-height: 200px; overflow: auto; font-family: var(--mol-font-mono, monospace)`}>{run.output.join(
            '\n',
          )}</pre>
      {/if}
    </div>
  {/if}
  {#if run.error}
    <div data-mol-id="tests-card-run-error" class={cm.textError} style="margin-top: 6px">
      {run.error}
    </div>
  {/if}
  {#if !run.running && run.outcome === 'cancelled' && !run.error}
    <div data-mol-id="tests-card-cancelled" class={cm.textMuted} style="margin-top: 6px">
      {t('ide.tests.cancelled', undefined, { defaultValue: 'Run stopped.' })}
    </div>
  {/if}
  <!-- A run with skipped work in it finished, but it did not all pass — say so plainly, because the rows alone leave it to be inferred. -->
  {#if !run.running && run.outcome === 'skipped-by-user' && !run.error}
    <div data-mol-id="tests-card-skipped" class={cm.textMuted} style="margin-top: 6px">
      {t('ide.tests.skippedByUser', undefined, {
        defaultValue: 'Run finished. The tests you skipped did not run.',
      })}
    </div>
  {/if}
</div>
