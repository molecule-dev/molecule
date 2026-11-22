/**
 * `/test` browser — the project's own tests, listed and runnable from the chat.
 *
 * Solid counterpart of `@molecule/app-ide-react`'s `TestsCard` (see that file
 * for the design notes): the same props (React names), the same DOM for the
 * same input, the same callbacks. Rows are grouped End-to-end then Unit, and
 * within a kind by the project directory that owns them; a running row names
 * the test on screen with a live per-file tally; the Skip control drops the
 * command the run is on without ending the run. The card is PRESENTATIONAL —
 * the list and the in-flight run live in the host, so a run keeps streaming
 * while the overlay is closed and re-opened.
 *
 * Lists are keyed the way React keys them (`item.id` per row,
 * `${kind}:${workspace}` per group) so a re-passed or re-ordered `tests` prop
 * keeps each rendered row, the way React's `key` does.
 *
 * Styling uses `getClassMap()` (`cm.*`); the only inline styles are layout the
 * ClassMap can't express. All user-facing text goes through `t()`.
 *
 * @module
 */

import type { Accessor, JSX } from 'solid-js'
import { createEffect, createMemo, createSignal, For } from 'solid-js'

import type { TestItem, TestKind, TestSelection, TestStatus } from '@molecule/app-ide-panel-logic'
import type {
  TestCaseProgress,
  TestFailure,
  TestGroup,
  TestResultEntry,
  TestsRunState,
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
import { useTranslation, type UseTranslationResult } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

/**
 * The card's button vocabulary, which is the command cards' vocabulary (see
 * molecule DESIGN.md → Command cards). Every ACTION is a button that LOOKS
 * like a button — a filled or bordered box, never text on transparent: the
 * one headline action (Run all), every other action (Run e2e/unit/group, a
 * row Run, Fix with Synthase), and Stop in the design system's error colour;
 * `ghost` is reserved for the Show/Hide output toggles, the only place the
 * sibling cards use it.
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
   * Skips the command the run is on right now, WITHOUT ending it: that file
   * comes back `Skipped` and the run moves to the next one. Omitted by a host
   * that does not serve skipping — then no Skip control is rendered.
   */
  onSkipCurrent?: () => void
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
 * radius written as `px` (the neutral helper returns a unitless number, a
 * React-ism this framework's style objects do not take).
 *
 * @returns The card container's inline style object.
 */
function cardStyle(): Record<string, string> {
  const { padding, border, background } = chatCardStyle()
  return { padding, 'border-radius': '8px', border, background }
}

/**
 * A React-keyed view of a list: the keys to iterate and the latest item per
 * key. Solid's `For` keys by object identity, so the card iterates the KEYS
 * (`For` compares strings by value, so an unchanged key keeps its DOM node and
 * moves it on a reorder) and reads each item through `get`, which returns the
 * latest item for that key so the rendered content still updates reactively.
 *
 * This is the contract of `@molecule/app-ui-solid`'s `createKeyedList` (see
 * its `utilities/keyedList.ts`), which its package does not export — the same
 * mechanism the sibling components keep as stable per-key records.
 *
 * @template T - The list's item type.
 * @template K - The key type.
 * @param items - The list, as a reactive accessor.
 * @param keyOf - The key React assigns each item (`key={…}`).
 * @returns The keys to iterate and the item lookup to read.
 */
function createKeyedList<T, K extends string>(
  items: Accessor<T[]>,
  keyOf: (item: T) => K,
): { keys: Accessor<K[]>; get: (key: K) => T | undefined } {
  const keys = createMemo(() => items().map((item) => keyOf(item)))
  const byKey = createMemo(() => {
    const latest = new Map<K, T>()
    items().forEach((item) => latest.set(keyOf(item), item))
    return latest
  })
  return { keys, get: (key) => byKey().get(key) }
}

/**
 * The tests browser shown by `/test`.
 *
 * @param props - See {@link TestsCardProps}.
 * @returns The rendered tests card.
 */
export function TestsCard(props: TestsCardProps): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [query, setQuery] = createSignal(props.initialQuery)
  // The run output starts COLLAPSED. ScriptsCard auto-expands nothing while a
  // script runs, so neither does this; the status pills carry the state and the
  // output is one click away when someone wants it.
  const [showOutput, setShowOutput] = createSignal(false)
  const [outputEl, setOutputEl] = createSignal<HTMLPreElement | undefined>(undefined)

  // Keep the live output pinned to the newest line unless the reader scrolled up
  // inside the block themselves. No-ops while it is collapsed (no element).
  createEffect(() => {
    void props.run.output
    void showOutput()
    const el = outputEl()
    if (!el) return
    if (el.scrollHeight - el.scrollTop - el.clientHeight > 40) return
    el.scrollTop = el.scrollHeight
  })

  // React keeps the search field's `value` ATTRIBUTE in step with the
  // controlled value (the DOM snapshot carries the attribute as well as the
  // live property); Solid's `value` prop writes only the property, so the
  // attribute is mirrored here. (Solid's `attr:value` writes the same
  // attribute; writing it needs a JSX type augmentation this package's
  // framework-UI packages each declare in their own .d.ts, and this component
  // ships without one.)
  let searchEl: HTMLInputElement | undefined
  createEffect(() => {
    searchEl?.setAttribute('value', query())
  })

  const filtered = createMemo(() => filterTests(props.tests, query()))
  const groups = createMemo(() => groupTests(filtered()))
  const counts = createMemo(() => countByKind(filtered()))
  const summary = createMemo(() => summarizeResults(filtered(), props.run.results))
  const failures = createMemo(() => failedTests(filtered(), props.run.results))

  const rowBorder = (): string => (props.isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)')
  // The same neutral inset the sibling cards give their fields, so the search
  // box READS as a field on the clean overlay surface.
  const fieldBg = (): string => (props.isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.06)')
  // Same box as every card button: 26px tall, 3px radius — the chat's fields
  // and buttons share one size.
  const fieldStyle = (): Record<string, string> => ({
    width: '100%',
    height: '26px',
    padding: '0px 6px',
    'border-radius': '3px',
    border: `1px solid ${rowBorder()}`,
    background: fieldBg(),
    color: 'inherit',
    outline: 'none',
  })

  const disabledReason = (): string | null =>
    !props.canRun
      ? t('ide.tests.viewerCannotRun', undefined, {
          defaultValue: 'Only editors can run this project’s tests.',
        })
      : props.status === 'unavailable'
        ? t('ide.tests.needsSandbox', undefined, {
            defaultValue: 'Start the project to run its tests.',
          })
        : null
  const runnable = (): boolean => props.canRun && props.status === 'ready' && !props.run.running
  const fixable = (): boolean => props.fixDisabledReason === null
  // The row the Skip acts on. The control exists only while the run is on an
  // identifiable row AND the host serves skipping; a viewer still SEES it, with
  // the reason on it, rather than watching it vanish without explanation.
  const skipRowId = (): string | null =>
    props.onSkipCurrent && canSkipRun(props.run) ? currentRunRowId(props.run) : null
  const skipDisabledReason = (): string | null =>
    !props.canRun
      ? t('ide.tests.viewerCannotSkip', undefined, {
          defaultValue: 'Only editors can skip this project’s tests.',
        })
      : null

  // React keys each group by its kind and workspace, so the same listing
  // re-passed keeps every group's (and row's) DOM node; the card iterates the
  // keys and reads the latest group through the lookup.
  const groupList = createKeyedList(groups, (group): string => `${group.kind}:${group.workspace}`)
  const groupFor = (key: string): TestGroup => groupList.get(key)!

  return (
    <div
      data-mol-id="tests-card"
      class={cm.textSize('xs')}
      style={
        props.embedded ? { padding: '10px 12px' } : { ...cardStyle(), 'margin-bottom': '16px' }
      }
    >
      <div
        style={{
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'space-between',
          gap: '8px',
          'margin-bottom': '6px',
          'flex-wrap': 'wrap',
        }}
      >
        {/* Left title area — a (possibly empty when embedded) flex child so the
            primary action below is ALWAYS pushed right, the same header
            structure as ScriptsCard / SkillsCard / SettingsCard. */}
        <div style={{ display: 'flex', 'align-items': 'center', gap: '8px', 'flex-shrink': '0' }}>
          {!props.embedded && (
            <div
              class={cm.cn(cm.fontWeight('medium'), cm.textSize('sm'))}
              style={{ 'flex-shrink': '0' }}
            >
              {t('ide.tests.heading', undefined, { defaultValue: 'Tests' })}
            </div>
          )}
          {props.run.running ? (
            <span
              data-mol-id="tests-card-running"
              class={cm.cn(cm.textMuted, cm.textSize('xs'))}
              style={{ display: 'inline-flex', 'align-items': 'center', gap: '4px' }}
            >
              <span class={cm.spinner({ size: 'xs' })} aria-hidden="true" />
              {runningLabel(t, props.run, props.agentName)}
            </span>
          ) : (
            summary().reported > 0 && (
              <span
                data-mol-id="tests-card-summary"
                class={cm.textSize('xs')}
                style={{ display: 'inline-flex', 'align-items': 'center', gap: '6px' }}
              >
                {summary().passed > 0 && (
                  <span class={cm.textSuccess}>
                    {t(
                      'ide.tests.passedCount',
                      { count: summary().passed },
                      { defaultValue: '{{count}} passed' },
                    )}
                  </span>
                )}
                {summary().failed > 0 && (
                  <span class={cm.textError}>
                    {t(
                      'ide.tests.failedCount',
                      { count: summary().failed },
                      { defaultValue: '{{count}} failed' },
                    )}
                  </span>
                )}
                {/* Skipped is its OWN number beside the other two. A file that
                    was skipped did not pass, and the summary must never let it
                    be read as one. */}
                {summary().skipped > 0 && (
                  <span data-mol-id="tests-card-summary-skipped" class={cm.textMuted}>
                    {t(
                      'ide.tests.skippedCount',
                      { count: summary().skipped },
                      { defaultValue: '{{count}} skipped' },
                    )}
                  </span>
                )}
              </span>
            )
          )}
        </div>
        <div style={{ display: 'flex', 'align-items': 'center', gap: '6px', 'flex-wrap': 'wrap' }}>
          {counts().e2e > 0 && counts().unit > 0 && (
            <>
              <button
                type="button"
                data-mol-id="tests-card-run-e2e"
                onClick={() => props.onRun({ ids: idsOfKind(filtered(), 'e2e') })}
                disabled={!runnable()}
                title={disabledReason() ?? undefined}
                class={cm.cn(SECONDARY_ACTION(cm))}
                style={{ 'flex-shrink': '0' }}
              >
                {t('ide.tests.runE2e', undefined, { defaultValue: 'Run e2e' })}
              </button>
              <button
                type="button"
                data-mol-id="tests-card-run-unit"
                onClick={() => props.onRun({ ids: idsOfKind(filtered(), 'unit') })}
                disabled={!runnable()}
                title={disabledReason() ?? undefined}
                class={cm.cn(SECONDARY_ACTION(cm))}
                style={{ 'flex-shrink': '0' }}
              >
                {t('ide.tests.runUnit', undefined, { defaultValue: 'Run unit' })}
              </button>
            </>
          )}
          {!props.run.running && failures().length > 0 && (
            <button
              type="button"
              data-mol-id="tests-card-fix-all"
              onClick={() => props.onFix(failures())}
              disabled={!fixable()}
              title={props.fixDisabledReason ?? undefined}
              class={cm.cn(SECONDARY_ACTION(cm))}
              style={{ 'flex-shrink': '0' }}
            >
              {failures().length === 1
                ? t('ide.tests.fixWithSynthase', undefined, {
                    defaultValue: 'Fix with Synthase',
                  })
                : t(
                    'ide.tests.fixFailures',
                    { count: failures().length },
                    { defaultValue: 'Fix {{count}} failures' },
                  )}
            </button>
          )}
          {props.run.running
            ? // A run this panel only watches (the agent's, the platform's, another
              // tab's) cannot be stopped from here, so no Stop is offered.
              !props.run.external && (
                <button
                  type="button"
                  data-mol-id="tests-card-cancel"
                  onClick={props.onCancel}
                  class={cm.cn(DESTRUCTIVE_ACTION(cm))}
                  style={{ 'flex-shrink': '0' }}
                >
                  {t('ide.tests.stop', undefined, { defaultValue: 'Stop' })}
                </button>
              )
            : filtered().length > 0 && (
                <button
                  type="button"
                  data-mol-id="tests-card-run-all"
                  onClick={() => props.onRun({ ids: filtered().map((test) => test.id) })}
                  disabled={!runnable()}
                  title={disabledReason() ?? undefined}
                  class={cm.cn(PRIMARY_ACTION(cm))}
                  style={{ 'flex-shrink': '0' }}
                >
                  {t('ide.tests.runAll', undefined, { defaultValue: 'Run all' })}
                </button>
              )}
        </div>
      </div>

      {/* The command a run this panel did not start is running: an agent's own
          command names no tests up front, so this says what is going on while
          its results arrive. */}
      {props.run.external && props.run.command && (
        <div
          data-mol-id="tests-card-command"
          class={cm.cn(cm.textMuted, cm.textSize('xs'))}
          title={props.run.command}
          style={{
            'font-family': 'var(--mol-font-mono, monospace)',
            overflow: 'hidden',
            'text-overflow': 'ellipsis',
            'white-space': 'nowrap',
            'margin-bottom': '6px',
          }}
        >
          {props.run.command}
        </div>
      )}

      {/* Search / filter */}
      <input
        ref={(node: HTMLInputElement) => {
          searchEl = node
        }}
        value={query()}
        data-mol-id="tests-card-search"
        onInput={(event) => setQuery(event.currentTarget.value)}
        placeholder={t('ide.tests.searchPlaceholder', undefined, {
          defaultValue: 'Filter tests…',
        })}
        class={cm.textSize('xs')}
        style={{ ...fieldStyle(), 'margin-bottom': '6px' }}
      />

      {/* Why the run controls are dead, stated in the card rather than in a
          toast that has already gone by the time the person looks. */}
      {disabledReason() && props.status !== 'loading' && (
        <div data-mol-id="tests-card-disabled-reason" class={cm.textMuted}>
          {disabledReason()}
        </div>
      )}

      {props.status === 'loading' && (
        <div class={cm.textMuted} style={{ padding: '6px 0px' }}>
          {t('ide.tests.loading', undefined, { defaultValue: 'Loading tests…' })}
        </div>
      )}

      {props.status === 'unavailable' && (
        <div
          data-mol-id="tests-card-unavailable"
          class={cm.textMuted}
          style={{ padding: '6px 0px' }}
        >
          {t('ide.tests.waitingForSandbox', undefined, {
            defaultValue: 'Start the project to see its tests.',
          })}
        </div>
      )}

      {props.status === 'error' && (
        <div data-mol-id="tests-card-error" class={cm.textMuted} style={{ padding: '6px 0px' }}>
          {t('ide.tests.listError', undefined, {
            defaultValue: 'Could not list this project’s tests.',
          })}
        </div>
      )}

      {props.status === 'ready' && filtered().length === 0 && (
        <div data-mol-id="tests-card-empty" class={cm.textMuted} style={{ padding: '6px 0px' }}>
          {query().trim()
            ? t('ide.tests.noMatch', undefined, {
                defaultValue: 'No tests match your search.',
              })
            : t('ide.tests.empty', undefined, {
                defaultValue: 'No tests in this project yet.',
              })}
        </div>
      )}

      {props.status === 'ready' && (
        <For each={groupList.keys()}>
          {(key) => (
            <TestsCardGroup
              group={groupFor(key)}
              run={props.run}
              runnable={runnable()}
              disabledReason={disabledReason()}
              rowBorder={rowBorder()}
              onRun={props.onRun}
              onFix={props.onFix}
              fixable={fixable()}
              fixDisabledReason={props.fixDisabledReason}
              skipRowId={skipRowId()}
              skipPending={props.run.skipPending}
              skipDisabledReason={skipDisabledReason()}
              onSkipCurrent={props.onSkipCurrent}
            />
          )}
        </For>
      )}

      {/* The running command's live output — the card's own output area, the
          same block ScriptsCard shows a script's captured output in. */}
      {props.run.output.length > 0 && (
        <div data-mol-id="tests-card-output-area" style={{ 'margin-top': '6px' }}>
          <button
            type="button"
            data-mol-id="tests-card-output-toggle"
            aria-expanded={showOutput() ? 'true' : 'false'}
            onClick={() => setShowOutput(!showOutput())}
            class={cm.cn(QUIET_TOGGLE(cm))}
            style={{ 'flex-shrink': '0' }}
          >
            {showOutput()
              ? t('ide.tests.hideOutput', undefined, { defaultValue: 'Hide output' })
              : t('ide.tests.showOutput', undefined, { defaultValue: 'Show output' })}
          </button>
          {showOutput() && (
            <pre
              ref={(node: HTMLPreElement) => {
                setOutputEl(node)
              }}
              data-mol-id="tests-card-output"
              class={cm.textSize('xs')}
              style={{
                margin: '0px',
                padding: '6px 8px',
                'border-radius': '4px',
                border: `1px solid ${rowBorder()}`,
                'white-space': 'pre-wrap',
                'word-break': 'break-word',
                'max-height': '200px',
                overflow: 'auto',
                'font-family': 'var(--mol-font-mono, monospace)',
              }}
            >
              {props.run.output.join('\n')}
            </pre>
          )}
        </div>
      )}

      {props.run.error && (
        <div
          data-mol-id="tests-card-run-error"
          class={cm.textError}
          style={{ 'margin-top': '6px' }}
        >
          {props.run.error}
        </div>
      )}

      {!props.run.running && props.run.outcome === 'cancelled' && !props.run.error && (
        <div
          data-mol-id="tests-card-cancelled"
          class={cm.textMuted}
          style={{ 'margin-top': '6px' }}
        >
          {t('ide.tests.cancelled', undefined, { defaultValue: 'Run stopped.' })}
        </div>
      )}

      {/* A run with skipped work in it finished, but it did not all pass — say
          so plainly, because the rows alone leave it to be inferred. */}
      {!props.run.running && props.run.outcome === 'skipped-by-user' && !props.run.error && (
        <div data-mol-id="tests-card-skipped" class={cm.textMuted} style={{ 'margin-top': '6px' }}>
          {t('ide.tests.skippedByUser', undefined, {
            defaultValue: 'Run finished. The tests you skipped did not run.',
          })}
        </div>
      )}
    </div>
  )
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
  /** The one row that carries a Skip control, or `null` when none does. */
  skipRowId: string | null
  /** A skip has been asked for and the run has not answered yet. */
  skipPending: boolean
  /** Why this viewer cannot skip, already translated — `null` when they can. */
  skipDisabledReason: string | null
  onSkipCurrent?: () => void
}

/**
 * One group of rows — a heading ("End-to-end · my-app/app"), a Run for the
 * whole group, and a row per test file. Internal to the card: React renders
 * it but does not export it, and neither does this file.
 *
 * @param props - See {@link TestsCardGroupProps}.
 * @returns The rendered group.
 */
function TestsCardGroup(props: TestsCardGroupProps): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  const groupId = (): string => `${props.group.kind}-${props.group.workspace}`
  // React keys each row by its test id, so a re-passed or re-ordered group
  // keeps each row's DOM node; the card iterates the keys and reads the latest
  // item through the lookup.
  const rows = createKeyedList(
    () => props.group.items,
    (item) => item.id,
  )
  const rowFor = (key: string): TestItem => rows.get(key)!
  return (
    <div
      data-mol-id={`tests-card-group-${groupId()}`}
      class={cm.borderT}
      style={{ padding: '6px 0px', 'border-color': props.rowBorder }}
    >
      <div
        style={{
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'space-between',
          gap: '8px',
          'flex-wrap': 'wrap',
        }}
      >
        <div class={cm.cn(cm.fontWeight('medium'))} style={{ 'min-width': '0px' }}>
          {groupHeading(t, props.group)}
        </div>
        <button
          type="button"
          data-mol-id={`tests-card-run-group-${groupId()}`}
          onClick={() => props.onRun({ ids: props.group.items.map((item) => item.id) })}
          disabled={!props.runnable}
          title={props.disabledReason ?? undefined}
          class={cm.cn(SECONDARY_ACTION(cm))}
          style={{ 'flex-shrink': '0' }}
        >
          {t('ide.tests.runGroup', undefined, { defaultValue: 'Run group' })}
        </button>
      </div>
      <For each={rows.keys()}>
        {(key) => (
          <TestsCardRow
            item={rowFor(key)}
            result={props.run.results[rowFor(key).id]}
            running={isRowRunning(props.run, rowFor(key).id)}
            progress={props.run.cases[rowFor(key).id]}
            runnable={props.runnable}
            disabledReason={props.disabledReason}
            rowBorder={props.rowBorder}
            onRun={props.onRun}
            onFix={props.onFix}
            fixable={props.fixable}
            fixDisabledReason={props.fixDisabledReason}
            skippable={props.skipRowId === rowFor(key).id}
            skipPending={props.skipPending}
            skipDisabledReason={props.skipDisabledReason}
            onSkipCurrent={props.onSkipCurrent}
          />
        )}
      </For>
    </div>
  )
}

/** Props for one test row. */
interface TestsCardRowProps {
  item: TestItem
  result: TestResultEntry | undefined
  running: boolean
  /** Live per-test progress while this file runs; `undefined` once it ends. */
  progress: TestCaseProgress | undefined
  runnable: boolean
  disabledReason: string | null
  rowBorder: string
  onRun: (selection: TestSelection) => void
  onFix: (failures: TestFailure[]) => void
  fixable: boolean
  fixDisabledReason: string | null
  /** This is the row the run is on, so it is the row that carries the Skip. */
  skippable: boolean
  skipPending: boolean
  skipDisabledReason: string | null
  onSkipCurrent?: () => void
}

/**
 * One test file: its label, its last status pill, a Run button, and — when it
 * FAILED — the runner's output kept underneath, the same inline output
 * ScriptsCard shows for a script that exited non-zero. While the file is
 * RUNNING it also names the test on screen (its group and title) with a live
 * tally; that detail collapses the moment the file reports its verdict.
 * Internal to the card.
 *
 * @param props - See {@link TestsCardRowProps}.
 * @returns The rendered row.
 */
function TestsCardRow(props: TestsCardRowProps): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  // A failure's output starts COLLAPSED too — the row's status pill says what
  // happened; the detail is one click away for whoever wants it.
  const [showFailure, setShowFailure] = createSignal(false)
  const caseLabel = (): string => testCaseLabel(props.progress?.current)
  const caseTally = (): number =>
    (props.progress?.passed ?? 0) + (props.progress?.failed ?? 0) + (props.progress?.skipped ?? 0)
  return (
    <div data-mol-id={`tests-card-row-${props.item.id}`} style={{ padding: '4px 0px' }}>
      <div style={{ display: 'flex', 'align-items': 'center', gap: '8px', 'flex-wrap': 'wrap' }}>
        <div
          class={cm.textMuted}
          title={props.item.file}
          style={{
            flex: '1 1 140px',
            'min-width': '0px',
            overflow: 'hidden',
            'text-overflow': 'ellipsis',
            'white-space': 'nowrap',
            'font-family': 'var(--mol-font-mono, monospace)',
          }}
        >
          {testRowLabel(props.item)}
        </div>
        {props.running ? (
          <span
            data-mol-id={`tests-card-status-${props.item.id}`}
            class={cm.textMuted}
            style={{
              display: 'inline-flex',
              'align-items': 'center',
              gap: '4px',
              'flex-shrink': '0',
            }}
          >
            <span class={cm.spinner({ size: 'xs' })} aria-hidden="true" />
            {t('ide.tests.running', undefined, { defaultValue: 'Running…' })}
          </span>
        ) : (
          props.result && (
            <span
              data-mol-id={`tests-card-status-${props.item.id}`}
              class={
                props.result.status === 'passed'
                  ? cm.textSuccess
                  : props.result.status === 'failed'
                    ? cm.textError
                    : cm.textMuted
              }
              style={{ 'flex-shrink': '0' }}
            >
              {statusLabel(t, props.result.status)}
            </span>
          )
        )}
        {/* Skip lives on the row the run is ON — Stop in the header is still
            "stop everything". Same filled `xs` button as every other action on
            this card (DESIGN.md → Command cards); nothing new to learn. */}
        {props.skippable && (
          <button
            type="button"
            data-mol-id={`tests-card-skip-${props.item.id}`}
            onClick={() => props.onSkipCurrent?.()}
            disabled={props.skipDisabledReason !== null || props.skipPending}
            title={props.skipDisabledReason ?? undefined}
            class={cm.cn(SECONDARY_ACTION(cm))}
            style={{ 'flex-shrink': '0' }}
          >
            {props.skipPending
              ? t('ide.tests.skipping', undefined, { defaultValue: 'Skipping…' })
              : t('ide.tests.skip', undefined, { defaultValue: 'Skip' })}
          </button>
        )}
        <button
          type="button"
          data-mol-id={`tests-card-run-${props.item.id}`}
          onClick={() => props.onRun({ ids: [props.item.id] })}
          disabled={!props.runnable}
          title={props.disabledReason ?? undefined}
          class={cm.cn(SECONDARY_ACTION(cm))}
          style={{ 'flex-shrink': '0' }}
        >
          {t('ide.tests.run', undefined, { defaultValue: 'Run' })}
        </button>
      </div>
      {/* What is on screen RIGHT NOW: the runner's own test title (and its
          group), plus how this file's tests have gone so far. Muted, at the
          card's own `xs` scale, wrapping rather than overflowing at 390px. */}
      {props.running && (caseLabel() !== '' || caseTally() > 0) && (
        <div
          data-mol-id={`tests-card-case-${props.item.id}`}
          class={cm.textMuted}
          style={{
            display: 'flex',
            'align-items': 'center',
            gap: '6px',
            'flex-wrap': 'wrap',
            'min-width': '0px',
            'line-height': '1.4',
          }}
        >
          {caseLabel() !== '' && (
            <span
              data-mol-id={`tests-card-case-title-${props.item.id}`}
              title={caseLabel()}
              style={{
                flex: '1 1 140px',
                'min-width': '0px',
                overflow: 'hidden',
                'text-overflow': 'ellipsis',
                'white-space': 'nowrap',
              }}
            >
              {caseLabel()}
            </span>
          )}
          {caseTally() > 0 && (
            <span
              data-mol-id={`tests-card-case-tally-${props.item.id}`}
              style={{
                display: 'inline-flex',
                'align-items': 'center',
                gap: '6px',
                'flex-shrink': '0',
              }}
            >
              {(props.progress?.passed ?? 0) > 0 && (
                <span class={cm.textSuccess}>
                  {t(
                    'ide.tests.passedCount',
                    { count: props.progress?.passed ?? 0 },
                    { defaultValue: '{{count}} passed' },
                  )}
                </span>
              )}
              {(props.progress?.failed ?? 0) > 0 && (
                <span class={cm.textError}>
                  {t(
                    'ide.tests.failedCount',
                    { count: props.progress?.failed ?? 0 },
                    { defaultValue: '{{count}} failed' },
                  )}
                </span>
              )}
              {(props.progress?.skipped ?? 0) > 0 && (
                <span>
                  {t(
                    'ide.tests.skippedCount',
                    { count: props.progress?.skipped ?? 0 },
                    { defaultValue: '{{count}} skipped' },
                  )}
                </span>
              )}
            </span>
          )}
        </div>
      )}
      {props.result?.status === 'failed' && (
        <div style={{ display: 'flex', 'align-items': 'center', gap: '6px', 'flex-wrap': 'wrap' }}>
          {props.result?.output && (
            <button
              type="button"
              data-mol-id={`tests-card-failure-toggle-${props.item.id}`}
              aria-expanded={showFailure() ? 'true' : 'false'}
              onClick={() => setShowFailure(!showFailure())}
              class={cm.cn(QUIET_TOGGLE(cm))}
              style={{ 'flex-shrink': '0' }}
            >
              {showFailure()
                ? t('ide.tests.hideOutput', undefined, { defaultValue: 'Hide output' })
                : t('ide.tests.showOutput', undefined, { defaultValue: 'Show output' })}
            </button>
          )}
          <button
            type="button"
            data-mol-id={`tests-card-fix-${props.item.id}`}
            onClick={() => props.onFix([{ item: props.item, output: props.result?.output }])}
            disabled={!props.fixable}
            title={props.fixDisabledReason ?? undefined}
            class={cm.cn(SECONDARY_ACTION(cm))}
            style={{ 'flex-shrink': '0' }}
          >
            {t('ide.tests.fixWithSynthase', undefined, {
              defaultValue: 'Fix with Synthase',
            })}
          </button>
        </div>
      )}
      {props.result?.status === 'failed' && props.result.output && showFailure() && (
        <pre
          data-mol-id={`tests-card-failure-${props.item.id}`}
          class={cm.textSize('xs')}
          style={{
            margin: '4px 0px 0px',
            padding: '6px 8px',
            'border-radius': '4px',
            border: `1px solid ${props.rowBorder}`,
            'white-space': 'pre-wrap',
            'word-break': 'break-word',
            'max-height': '200px',
            overflow: 'auto',
            'font-family': 'var(--mol-font-mono, monospace)',
          }}
        >
          {props.result.output}
        </pre>
      )}
    </div>
  )
}
