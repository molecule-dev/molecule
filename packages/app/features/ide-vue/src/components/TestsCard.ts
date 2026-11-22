/**
 * `/test` browser — the project's own tests, listed and runnable from the chat.
 *
 * Vue counterpart of `@molecule/app-ide-react`'s `TestsCard` (see that file
 * for the design notes): the same props (React names), the same DOM for the
 * same input, the same callbacks. Rows are grouped End-to-end then Unit, and
 * within a kind by the project directory that owns them; a running row names
 * the test on screen with a live per-file tally; the Skip control drops the
 * command the run is on without ending the run. The card is PRESENTATIONAL —
 * the list and the in-flight run live in the host, so a run keeps streaming
 * while the overlay is closed and re-opened.
 *
 * Styling uses `getClassMap()` (`cm.*`); the only inline styles are layout the
 * ClassMap can't express. All user-facing text goes through `t()`.
 *
 * @module
 */

import {
  computed,
  defineComponent,
  h,
  type PropType,
  ref,
  type VNode,
  type VNodeChild,
  watchPostEffect,
} from 'vue'

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
  failedTests,
  filterTests,
  groupTests,
  isRowRunning,
  summarizeResults,
  testCaseLabel,
  testRowLabel,
} from '@molecule/app-ide-panel-logic'
import { runningLabel } from '@molecule/app-ide-panel-logic/panels'
import { getClassMap } from '@molecule/app-ui'
import { useTranslation, type UseTranslationResult } from '@molecule/app-vue'

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

/** Props for {@link TestsCard} — the React prop names, React's own contract. */
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
   * Skips the command the run is on right now, WITHOUT ending it. Omitted by a
   * host that does not serve skipping — then no Skip control is rendered.
   */
  onSkipCurrent?: () => void
  /**
   * Hands the failing tests to the agent as ONE chat message — a real turn it
   * answers, exactly like the editor’s “Fix with AI”.
   */
  onFix: (failures: TestFailure[]) => void
  /**
   * Why fixing is unavailable (a viewer, a turn already streaming), already
   * translated by the host — `null` when it is available.
   */
  fixDisabledReason: string | null
  /** Light theme (drives the row border + field inset). */
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
 * The container chrome shared by the chat timeline's boxed cards, with the
 * radius written as `px` the way the DOM takes it here (the neutral helper
 * returns a unitless number for React).
 *
 * @returns The card container's inline style object.
 */
function cardStyle(): Record<string, string> {
  const { padding, border, background } = chatCardStyle()
  return { padding, borderRadius: '8px', border, background }
}

/**
 * Mirrors React onto the search field: React keeps the `value` ATTRIBUTE in
 * step with the controlled value (the DOM property alone is not enough for
 * the same serialized markup).
 *
 * @param vnode - The input's vnode.
 */
function syncValueAttr(vnode: VNode): void {
  const el = vnode.el as HTMLInputElement | null
  if (el) el.setAttribute('value', el.value)
}

/**
 * The tests browser shown by `/test`.
 *
 * @param props - See {@link TestsCardProps}.
 * @returns The rendered tests card.
 */
export const TestsCard = defineComponent({
  name: 'TestsCard',
  inheritAttrs: false,
  props: {
    /** Every discovered test (unfiltered). */
    tests: { type: Array as PropType<TestItem[]>, required: true },
    /** How the listing went. */
    status: { type: String as PropType<TestsStatus>, required: true },
    /** The run this card is showing — owned by the panel, so it survives a close. */
    run: { type: Object as PropType<TestsRunState>, required: true },
    /** Seeds the search box from `/test <query>`. */
    initialQuery: { type: String, required: true },
    /** Whether this viewer may run tests at all (a viewer may not). */
    canRun: { type: Boolean, required: true },
    /** Runs a selection. */
    onRun: { type: Function as PropType<(selection: TestSelection) => void>, required: true },
    /** Stops the run in flight — the whole run, every remaining file. */
    onCancel: { type: Function as PropType<() => void>, required: true },
    /**
     * Skips the command the run is on right now, WITHOUT ending it. Omitted by
     * a host that does not serve skipping — then no Skip control is rendered.
     */
    onSkipCurrent: {
      type: Function as PropType<() => void>,
      required: false,
      default: undefined,
    },
    /**
     * Hands the failing tests to the agent as ONE chat message — a real turn
     * it answers, exactly like the editor’s “Fix with AI”.
     */
    onFix: { type: Function as PropType<(failures: TestFailure[]) => void>, required: true },
    /**
     * Why fixing is unavailable, already translated by the host — `null` when
     * it is available.
     */
    fixDisabledReason: { type: [String, null] as PropType<string | null>, required: true },
    /** Light theme (drives the row border + field inset). */
    isLight: { type: Boolean, required: true },
    /** Chrome-less inside the command overlay; full card chrome in the timeline. */
    embedded: { type: Boolean, required: false, default: undefined },
    /** The agent's display name, for a run the agent started. */
    agentName: { type: String, required: false, default: undefined },
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const query = ref(props.initialQuery)
    // The run output starts COLLAPSED: the status pills carry the state and
    // the output is one click away when someone wants it.
    const showOutput = ref(false)
    const outputRef = ref<HTMLPreElement | null>(null)

    // Keep the live output pinned to the newest line unless the reader scrolled
    // up inside the block themselves. No-ops while it is collapsed (no element).
    watchPostEffect(() => {
      void props.run.output
      void showOutput.value
      const el = outputRef.value
      if (!el) return
      if (el.scrollHeight - el.scrollTop - el.clientHeight > 40) return
      el.scrollTop = el.scrollHeight
    })

    const filtered = computed(() => filterTests(props.tests, query.value))
    const groups = computed(() => groupTests(filtered.value))
    const counts = computed(() => countByKind(filtered.value))
    const summary = computed(() => summarizeResults(filtered.value, props.run.results))
    const failures = computed(() => failedTests(filtered.value, props.run.results))

    const rowBorder = computed(() =>
      props.isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)',
    )
    // The same neutral inset the sibling cards give their fields, so the search
    // box READS as a field on the clean overlay surface.
    const fieldBg = computed(() => (props.isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.06)'))
    // Same box as every card button: 26px tall, 3px radius — the chat's fields
    // and buttons share one size.
    const fieldStyle = computed(() => ({
      width: '100%',
      height: '26px',
      padding: '0 6px',
      borderRadius: '3px',
      border: `1px solid ${rowBorder.value}`,
      background: fieldBg.value,
      color: 'inherit',
      outline: 'none',
    }))

    const disabledReason = computed(() =>
      !props.canRun
        ? t('ide.tests.viewerCannotRun', undefined, {
            defaultValue: 'Only editors can run this project’s tests.',
          })
        : props.status === 'unavailable'
          ? t('ide.tests.needsSandbox', undefined, {
              defaultValue: 'Start the project to run its tests.',
            })
          : null,
    )
    const runnable = computed(() => props.canRun && props.status === 'ready' && !props.run.running)
    const fixable = computed(() => props.fixDisabledReason === null)
    // The row the Skip acts on. The control exists only while the run is on an
    // identifiable row AND the host serves skipping; a viewer still SEES it,
    // with the reason on it, rather than watching it vanish without explanation.
    const skipRowId = computed(() =>
      props.onSkipCurrent && canSkipRun(props.run) ? currentRunRowId(props.run) : null,
    )
    const skipDisabledReason = computed(() =>
      !props.canRun
        ? t('ide.tests.viewerCannotSkip', undefined, {
            defaultValue: 'Only editors can skip this project’s tests.',
          })
        : null,
    )

    return (): VNodeChild =>
      h(
        'div',
        {
          'data-mol-id': 'tests-card',
          class: cm.textSize('xs'),
          style: props.embedded
            ? { padding: '10px 12px' }
            : { ...cardStyle(), marginBottom: '16px' },
        },
        [
          h(
            'div',
            {
              style: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                marginBottom: '6px',
                flexWrap: 'wrap',
              },
            },
            [
              // Left title area — a (possibly empty when embedded) flex child so
              // the primary action below is ALWAYS pushed right, the same header
              // structure as the sibling command cards.
              h(
                'div',
                { style: { display: 'flex', alignItems: 'center', gap: '8px', flexShrink: '0' } },
                [
                  !props.embedded
                    ? h(
                        'div',
                        {
                          class: cm.cn(cm.fontWeight('medium'), cm.textSize('sm')),
                          style: { flexShrink: '0' },
                        },
                        [t('ide.tests.heading', undefined, { defaultValue: 'Tests' })],
                      )
                    : null,
                  props.run.running
                    ? h(
                        'span',
                        {
                          'data-mol-id': 'tests-card-running',
                          class: cm.cn(cm.textMuted, cm.textSize('xs')),
                          style: { display: 'inline-flex', alignItems: 'center', gap: '4px' },
                        },
                        [
                          h('span', { class: cm.spinner({ size: 'xs' }), 'aria-hidden': 'true' }),
                          runningLabel(t, props.run, props.agentName),
                        ],
                      )
                    : summary.value.reported > 0
                      ? h(
                          'span',
                          {
                            'data-mol-id': 'tests-card-summary',
                            class: cm.textSize('xs'),
                            style: { display: 'inline-flex', alignItems: 'center', gap: '6px' },
                          },
                          [
                            summary.value.passed > 0
                              ? h('span', { class: cm.textSuccess }, [
                                  t(
                                    'ide.tests.passedCount',
                                    { count: summary.value.passed },
                                    { defaultValue: '{{count}} passed' },
                                  ),
                                ])
                              : null,
                            summary.value.failed > 0
                              ? h('span', { class: cm.textError }, [
                                  t(
                                    'ide.tests.failedCount',
                                    { count: summary.value.failed },
                                    { defaultValue: '{{count}} failed' },
                                  ),
                                ])
                              : null,
                            // Skipped is its OWN number beside the other two. A file
                            // that was skipped did not pass, and the summary must
                            // never let it be read as one.
                            summary.value.skipped > 0
                              ? h(
                                  'span',
                                  {
                                    'data-mol-id': 'tests-card-summary-skipped',
                                    class: cm.textMuted,
                                  },
                                  [
                                    t(
                                      'ide.tests.skippedCount',
                                      { count: summary.value.skipped },
                                      { defaultValue: '{{count}} skipped' },
                                    ),
                                  ],
                                )
                              : null,
                          ],
                        )
                      : null,
                ],
              ),
              h(
                'div',
                { style: { display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' } },
                [
                  counts.value.e2e > 0 && counts.value.unit > 0
                    ? [
                        h(
                          'button',
                          {
                            type: 'button',
                            'data-mol-id': 'tests-card-run-e2e',
                            onClick: () => props.onRun({ ids: idsOfKind(filtered.value, 'e2e') }),
                            disabled: !runnable.value,
                            title: disabledReason.value ?? undefined,
                            class: cm.cn(SECONDARY_ACTION(cm)),
                            style: { flexShrink: '0' },
                          },
                          [t('ide.tests.runE2e', undefined, { defaultValue: 'Run e2e' })],
                        ),
                        h(
                          'button',
                          {
                            type: 'button',
                            'data-mol-id': 'tests-card-run-unit',
                            onClick: () => props.onRun({ ids: idsOfKind(filtered.value, 'unit') }),
                            disabled: !runnable.value,
                            title: disabledReason.value ?? undefined,
                            class: cm.cn(SECONDARY_ACTION(cm)),
                            style: { flexShrink: '0' },
                          },
                          [t('ide.tests.runUnit', undefined, { defaultValue: 'Run unit' })],
                        ),
                      ]
                    : null,
                  !props.run.running && failures.value.length > 0
                    ? h(
                        'button',
                        {
                          type: 'button',
                          'data-mol-id': 'tests-card-fix-all',
                          onClick: () => props.onFix(failures.value),
                          disabled: !fixable.value,
                          title: props.fixDisabledReason ?? undefined,
                          class: cm.cn(SECONDARY_ACTION(cm)),
                          style: { flexShrink: '0' },
                        },
                        [
                          failures.value.length === 1
                            ? t('ide.tests.fixWithSynthase', undefined, {
                                defaultValue: 'Fix with Synthase',
                              })
                            : t(
                                'ide.tests.fixFailures',
                                { count: failures.value.length },
                                { defaultValue: 'Fix {{count}} failures' },
                              ),
                        ],
                      )
                    : null,
                  props.run.running
                    ? // A run this panel only watches (the agent's, the platform's,
                      // another tab's) cannot be stopped from here, so no Stop is
                      // offered.
                      !props.run.external
                      ? h(
                          'button',
                          {
                            type: 'button',
                            'data-mol-id': 'tests-card-cancel',
                            onClick: props.onCancel,
                            class: cm.cn(DESTRUCTIVE_ACTION(cm)),
                            style: { flexShrink: '0' },
                          },
                          [t('ide.tests.stop', undefined, { defaultValue: 'Stop' })],
                        )
                      : null
                    : filtered.value.length > 0
                      ? h(
                          'button',
                          {
                            type: 'button',
                            'data-mol-id': 'tests-card-run-all',
                            onClick: () =>
                              props.onRun({ ids: filtered.value.map((test) => test.id) }),
                            disabled: !runnable.value,
                            title: disabledReason.value ?? undefined,
                            class: cm.cn(PRIMARY_ACTION(cm)),
                            style: { flexShrink: '0' },
                          },
                          [t('ide.tests.runAll', undefined, { defaultValue: 'Run all' })],
                        )
                      : null,
                ],
              ),
            ],
          ),

          // The command a run this panel did not start is running: an agent's
          // own command names no tests up front, so this says what is going on
          // while its results arrive.
          props.run.external && props.run.command
            ? h(
                'div',
                {
                  'data-mol-id': 'tests-card-command',
                  class: cm.cn(cm.textMuted, cm.textSize('xs')),
                  title: props.run.command,
                  style: {
                    fontFamily: 'var(--mol-font-mono, monospace)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    marginBottom: '6px',
                  },
                },
                [props.run.command],
              )
            : null,

          // Search / filter
          h('input', {
            value: query.value,
            'data-mol-id': 'tests-card-search',
            onInput: (event: Event) => {
              query.value = (event.target as HTMLInputElement).value
            },
            placeholder: t('ide.tests.searchPlaceholder', undefined, {
              defaultValue: 'Filter tests…',
            }),
            class: cm.textSize('xs'),
            style: { ...fieldStyle.value, marginBottom: '6px' },
            onVnodeMounted: syncValueAttr,
            onVnodeUpdated: syncValueAttr,
          }),

          // Why the run controls are dead, stated in the card rather than in a
          // toast that has already gone by the time the person looks.
          disabledReason.value && props.status !== 'loading'
            ? h('div', { 'data-mol-id': 'tests-card-disabled-reason', class: cm.textMuted }, [
                disabledReason.value,
              ])
            : null,

          props.status === 'loading'
            ? h('div', { class: cm.textMuted, style: { padding: '6px 0' } }, [
                t('ide.tests.loading', undefined, { defaultValue: 'Loading tests…' }),
              ])
            : null,

          props.status === 'unavailable'
            ? h(
                'div',
                {
                  'data-mol-id': 'tests-card-unavailable',
                  class: cm.textMuted,
                  style: { padding: '6px 0' },
                },
                [
                  t('ide.tests.waitingForSandbox', undefined, {
                    defaultValue: 'Start the project to see its tests.',
                  }),
                ],
              )
            : null,

          props.status === 'error'
            ? h(
                'div',
                {
                  'data-mol-id': 'tests-card-error',
                  class: cm.textMuted,
                  style: { padding: '6px 0' },
                },
                [
                  t('ide.tests.listError', undefined, {
                    defaultValue: 'Could not list this project’s tests.',
                  }),
                ],
              )
            : null,

          props.status === 'ready' && filtered.value.length === 0
            ? h(
                'div',
                {
                  'data-mol-id': 'tests-card-empty',
                  class: cm.textMuted,
                  style: { padding: '6px 0' },
                },
                [
                  query.value.trim()
                    ? t('ide.tests.noMatch', undefined, {
                        defaultValue: 'No tests match your search.',
                      })
                    : t('ide.tests.empty', undefined, {
                        defaultValue: 'No tests in this project yet.',
                      }),
                ],
              )
            : null,

          props.status === 'ready'
            ? groups.value.map((group) =>
                h(TestsCardGroup, {
                  key: `${group.kind}:${group.workspace}`,
                  group,
                  run: props.run,
                  runnable: runnable.value,
                  disabledReason: disabledReason.value,
                  rowBorder: rowBorder.value,
                  onRun: props.onRun,
                  onFix: props.onFix,
                  fixable: fixable.value,
                  fixDisabledReason: props.fixDisabledReason,
                  skipRowId: skipRowId.value,
                  skipPending: props.run.skipPending,
                  skipDisabledReason: skipDisabledReason.value,
                  onSkipCurrent: props.onSkipCurrent,
                }),
              )
            : null,

          // The running command's live output — the card's own output area, the
          // same block a script's captured output is shown in.
          props.run.output.length > 0
            ? h('div', { 'data-mol-id': 'tests-card-output-area', style: { marginTop: '6px' } }, [
                h(
                  'button',
                  {
                    type: 'button',
                    'data-mol-id': 'tests-card-output-toggle',
                    'aria-expanded': showOutput.value ? 'true' : 'false',
                    onClick: () => {
                      showOutput.value = !showOutput.value
                    },
                    class: cm.cn(QUIET_TOGGLE(cm)),
                    style: { flexShrink: '0' },
                  },
                  [
                    showOutput.value
                      ? t('ide.tests.hideOutput', undefined, { defaultValue: 'Hide output' })
                      : t('ide.tests.showOutput', undefined, { defaultValue: 'Show output' }),
                  ],
                ),
                showOutput.value
                  ? h(
                      'pre',
                      {
                        ref: outputRef,
                        'data-mol-id': 'tests-card-output',
                        class: cm.textSize('xs'),
                        style: {
                          margin: '0',
                          padding: '6px 8px',
                          borderRadius: '4px',
                          border: `1px solid ${rowBorder.value}`,
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          maxHeight: '200px',
                          overflow: 'auto',
                          fontFamily: 'var(--mol-font-mono, monospace)',
                        },
                      },
                      [props.run.output.join('\n')],
                    )
                  : null,
              ])
            : null,

          props.run.error
            ? h(
                'div',
                {
                  'data-mol-id': 'tests-card-run-error',
                  class: cm.textError,
                  style: { marginTop: '6px' },
                },
                [props.run.error],
              )
            : null,

          !props.run.running && props.run.outcome === 'cancelled' && !props.run.error
            ? h(
                'div',
                {
                  'data-mol-id': 'tests-card-cancelled',
                  class: cm.textMuted,
                  style: { marginTop: '6px' },
                },
                [t('ide.tests.cancelled', undefined, { defaultValue: 'Run stopped.' })],
              )
            : null,

          // A run with skipped work in it finished, but it did not all pass —
          // say so plainly, because the rows alone leave it to be inferred.
          !props.run.running && props.run.outcome === 'skipped-by-user' && !props.run.error
            ? h(
                'div',
                {
                  'data-mol-id': 'tests-card-skipped',
                  class: cm.textMuted,
                  style: { marginTop: '6px' },
                },
                [
                  t('ide.tests.skippedByUser', undefined, {
                    defaultValue: 'Run finished. The tests you skipped did not run.',
                  }),
                ],
              )
            : null,
        ],
      )
  },
})

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
 * One group of rows — a heading ("End-to-end · my-app/app"), a Run for the
 * whole group, and a row per test file. Internal to the card.
 *
 * @param props - See {@link TestsCardGroupProps}.
 * @returns The rendered group.
 */
const TestsCardGroup = defineComponent({
  name: 'TestsCardGroup',
  inheritAttrs: false,
  props: {
    group: { type: Object as PropType<TestGroup>, required: true },
    run: { type: Object as PropType<TestsRunState>, required: true },
    runnable: { type: Boolean, required: true },
    disabledReason: { type: [String, null] as PropType<string | null>, required: true },
    rowBorder: { type: String, required: true },
    onRun: { type: Function as PropType<(selection: TestSelection) => void>, required: true },
    onFix: { type: Function as PropType<(failures: TestFailure[]) => void>, required: true },
    fixable: { type: Boolean, required: true },
    fixDisabledReason: { type: [String, null] as PropType<string | null>, required: true },
    skipRowId: { type: [String, null] as PropType<string | null>, required: true },
    skipPending: { type: Boolean, required: true },
    skipDisabledReason: { type: [String, null] as PropType<string | null>, required: true },
    onSkipCurrent: {
      type: Function as PropType<() => void>,
      required: false,
      default: undefined,
    },
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()
    return (): VNodeChild => {
      const groupId = `${props.group.kind}-${props.group.workspace}`
      return h(
        'div',
        {
          'data-mol-id': `tests-card-group-${groupId}`,
          class: cm.borderT,
          style: { padding: '6px 0', borderColor: props.rowBorder },
        },
        [
          h(
            'div',
            {
              style: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                flexWrap: 'wrap',
              },
            },
            [
              h('div', { class: cm.cn(cm.fontWeight('medium')), style: { minWidth: '0' } }, [
                groupHeading(t, props.group),
              ]),
              h(
                'button',
                {
                  type: 'button',
                  'data-mol-id': `tests-card-run-group-${groupId}`,
                  onClick: () => props.onRun({ ids: props.group.items.map((item) => item.id) }),
                  disabled: !props.runnable,
                  title: props.disabledReason ?? undefined,
                  class: cm.cn(SECONDARY_ACTION(cm)),
                  style: { flexShrink: '0' },
                },
                [t('ide.tests.runGroup', undefined, { defaultValue: 'Run group' })],
              ),
            ],
          ),
          props.group.items.map((item) =>
            h(TestsCardRow, {
              key: item.id,
              item,
              result: props.run.results[item.id],
              running: isRowRunning(props.run, item.id),
              progress: props.run.cases[item.id],
              runnable: props.runnable,
              disabledReason: props.disabledReason,
              rowBorder: props.rowBorder,
              onRun: props.onRun,
              onFix: props.onFix,
              fixable: props.fixable,
              fixDisabledReason: props.fixDisabledReason,
              skippable: props.skipRowId === item.id,
              skipPending: props.skipPending,
              skipDisabledReason: props.skipDisabledReason,
              onSkipCurrent: props.onSkipCurrent,
            }),
          ),
        ],
      )
    }
  },
})

/**
 * One test file: its label, its last status pill, a Run button, and — when it
 * FAILED — the runner's output kept underneath. While the file is RUNNING it
 * also names the test on screen (its group and title) with a live tally.
 * Internal to the card.
 *
 * @param props - See {@link TestsCardRowProps}.
 * @returns The rendered row.
 */
const TestsCardRow = defineComponent({
  name: 'TestsCardRow',
  inheritAttrs: false,
  props: {
    item: { type: Object as PropType<TestItem>, required: true },
    result: {
      type: Object as PropType<TestResultEntry | undefined>,
      required: false,
      default: undefined,
    },
    running: { type: Boolean, required: true },
    progress: {
      type: Object as PropType<TestCaseProgress | undefined>,
      required: false,
      default: undefined,
    },
    runnable: { type: Boolean, required: true },
    disabledReason: { type: [String, null] as PropType<string | null>, required: true },
    rowBorder: { type: String, required: true },
    onRun: { type: Function as PropType<(selection: TestSelection) => void>, required: true },
    onFix: { type: Function as PropType<(failures: TestFailure[]) => void>, required: true },
    fixable: { type: Boolean, required: true },
    fixDisabledReason: { type: [String, null] as PropType<string | null>, required: true },
    skippable: { type: Boolean, required: true },
    skipPending: { type: Boolean, required: true },
    skipDisabledReason: { type: [String, null] as PropType<string | null>, required: true },
    onSkipCurrent: {
      type: Function as PropType<() => void>,
      required: false,
      default: undefined,
    },
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()
    // A failure's output starts COLLAPSED too — the row's status pill says
    // what happened; the detail is one click away for whoever wants it.
    const showFailure = ref(false)
    return (): VNodeChild => {
      const caseLabel = testCaseLabel(props.progress?.current)
      const caseTally =
        (props.progress?.passed ?? 0) +
        (props.progress?.failed ?? 0) +
        (props.progress?.skipped ?? 0)
      return h(
        'div',
        { 'data-mol-id': `tests-card-row-${props.item.id}`, style: { padding: '4px 0' } },
        [
          h(
            'div',
            { style: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' } },
            [
              h(
                'div',
                {
                  class: cm.textMuted,
                  title: props.item.file,
                  style: {
                    flex: '1 1 140px',
                    minWidth: '0',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontFamily: 'var(--mol-font-mono, monospace)',
                  },
                },
                [testRowLabel(props.item)],
              ),
              props.running
                ? h(
                    'span',
                    {
                      'data-mol-id': `tests-card-status-${props.item.id}`,
                      class: cm.textMuted,
                      style: {
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        flexShrink: '0',
                      },
                    },
                    [
                      h('span', { class: cm.spinner({ size: 'xs' }), 'aria-hidden': 'true' }),
                      t('ide.tests.running', undefined, { defaultValue: 'Running…' }),
                    ],
                  )
                : props.result
                  ? h(
                      'span',
                      {
                        'data-mol-id': `tests-card-status-${props.item.id}`,
                        class:
                          props.result.status === 'passed'
                            ? cm.textSuccess
                            : props.result.status === 'failed'
                              ? cm.textError
                              : cm.textMuted,
                        style: { flexShrink: '0' },
                      },
                      [statusLabel(t, props.result.status)],
                    )
                  : null,
              // Skip lives on the row the run is ON — Stop in the header is still
              // "stop everything". Same filled `xs` button as every other action on
              // this card; nothing new to learn.
              props.skippable
                ? h(
                    'button',
                    {
                      type: 'button',
                      'data-mol-id': `tests-card-skip-${props.item.id}`,
                      onClick: () => props.onSkipCurrent?.(),
                      disabled: props.skipDisabledReason !== null || props.skipPending,
                      title: props.skipDisabledReason ?? undefined,
                      class: cm.cn(SECONDARY_ACTION(cm)),
                      style: { flexShrink: '0' },
                    },
                    [
                      props.skipPending
                        ? t('ide.tests.skipping', undefined, { defaultValue: 'Skipping…' })
                        : t('ide.tests.skip', undefined, { defaultValue: 'Skip' }),
                    ],
                  )
                : null,
              h(
                'button',
                {
                  type: 'button',
                  'data-mol-id': `tests-card-run-${props.item.id}`,
                  onClick: () => props.onRun({ ids: [props.item.id] }),
                  disabled: !props.runnable,
                  title: props.disabledReason ?? undefined,
                  class: cm.cn(SECONDARY_ACTION(cm)),
                  style: { flexShrink: '0' },
                },
                [t('ide.tests.run', undefined, { defaultValue: 'Run' })],
              ),
            ],
          ),
          // What is on screen RIGHT NOW: the runner's own test title (and its
          // group), plus how this file's tests have gone so far. Muted, at the
          // card's own `xs` scale, wrapping rather than overflowing at 390px.
          props.running && (caseLabel !== '' || caseTally > 0)
            ? h(
                'div',
                {
                  'data-mol-id': `tests-card-case-${props.item.id}`,
                  class: cm.textMuted,
                  style: {
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    flexWrap: 'wrap',
                    minWidth: '0',
                    lineHeight: '1.4',
                  },
                },
                [
                  caseLabel !== ''
                    ? h(
                        'span',
                        {
                          'data-mol-id': `tests-card-case-title-${props.item.id}`,
                          title: caseLabel,
                          style: {
                            flex: '1 1 140px',
                            minWidth: '0',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          },
                        },
                        [caseLabel],
                      )
                    : null,
                  caseTally > 0
                    ? h(
                        'span',
                        {
                          'data-mol-id': `tests-card-case-tally-${props.item.id}`,
                          style: {
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            flexShrink: '0',
                          },
                        },
                        [
                          (props.progress?.passed ?? 0) > 0
                            ? h('span', { class: cm.textSuccess }, [
                                t(
                                  'ide.tests.passedCount',
                                  { count: props.progress?.passed ?? 0 },
                                  { defaultValue: '{{count}} passed' },
                                ),
                              ])
                            : null,
                          (props.progress?.failed ?? 0) > 0
                            ? h('span', { class: cm.textError }, [
                                t(
                                  'ide.tests.failedCount',
                                  { count: props.progress?.failed ?? 0 },
                                  { defaultValue: '{{count}} failed' },
                                ),
                              ])
                            : null,
                          (props.progress?.skipped ?? 0) > 0
                            ? h('span', [
                                t(
                                  'ide.tests.skippedCount',
                                  { count: props.progress?.skipped ?? 0 },
                                  { defaultValue: '{{count}} skipped' },
                                ),
                              ])
                            : null,
                        ],
                      )
                    : null,
                ],
              )
            : null,
          props.result?.status === 'failed'
            ? h(
                'div',
                { style: { display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' } },
                [
                  props.result.output
                    ? h(
                        'button',
                        {
                          type: 'button',
                          'data-mol-id': `tests-card-failure-toggle-${props.item.id}`,
                          'aria-expanded': showFailure.value ? 'true' : 'false',
                          onClick: () => {
                            showFailure.value = !showFailure.value
                          },
                          class: cm.cn(QUIET_TOGGLE(cm)),
                          style: { flexShrink: '0' },
                        },
                        [
                          showFailure.value
                            ? t('ide.tests.hideOutput', undefined, { defaultValue: 'Hide output' })
                            : t('ide.tests.showOutput', undefined, { defaultValue: 'Show output' }),
                        ],
                      )
                    : null,
                  h(
                    'button',
                    {
                      type: 'button',
                      'data-mol-id': `tests-card-fix-${props.item.id}`,
                      onClick: () =>
                        props.onFix([{ item: props.item, output: props.result?.output }]),
                      disabled: !props.fixable,
                      title: props.fixDisabledReason ?? undefined,
                      class: cm.cn(SECONDARY_ACTION(cm)),
                      style: { flexShrink: '0' },
                    },
                    [
                      t('ide.tests.fixWithSynthase', undefined, {
                        defaultValue: 'Fix with Synthase',
                      }),
                    ],
                  ),
                ],
              )
            : null,
          props.result?.status === 'failed' && props.result.output && showFailure.value
            ? h(
                'pre',
                {
                  'data-mol-id': `tests-card-failure-${props.item.id}`,
                  class: cm.textSize('xs'),
                  style: {
                    margin: '4px 0 0',
                    padding: '6px 8px',
                    borderRadius: '4px',
                    border: `1px solid ${props.rowBorder}`,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    maxHeight: '200px',
                    overflow: 'auto',
                    fontFamily: 'var(--mol-font-mono, monospace)',
                  },
                },
                [props.result.output],
              )
            : null,
        ],
      )
    }
  },
})
