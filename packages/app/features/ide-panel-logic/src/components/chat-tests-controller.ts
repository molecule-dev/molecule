/**
 * The chat panel's `/test` region as framework-neutral state and behaviour.
 *
 * The list and the in-flight run live in this controller, not inside the tests
 * card, for one reason: the card is an overlay the person closes. A run that is
 * streaming (a browser spec can take a minute) must survive that close and
 * still be there when they re-open it, and re-running `/test` must re-list
 * without killing it. So the card is presentational and this owns the state.
 *
 * Every framework's chat panel subscribes with {@link ChatTestsController.subscribe}
 * and renders {@link ChatTestsController.snapshot}; the panel keeps its own
 * effects where they are and starts the controller's work from them, so the
 * order of the host's requests and of the timers cannot move. The controller
 * reads everything else from its parameters, and performs no I/O when it is
 * constructed.
 *
 * @module
 */

import type { TranslateFunction } from '@molecule/app-i18n'

import type {
  TestItem,
  TestList,
  TestRunEvent,
  TestRunFeedEvent,
  TestRunHandle,
  TestSelection,
} from '../types.js'
import {
  applyTestRunEvent,
  buildTestFixMessage,
  EMPTY_RUN_STATE,
  failRun,
  markSkipUnavailable,
  requestSkip,
  type TestFailure,
  TestRunProjection,
  type TestsRunState,
} from './tests-card-utilities.js'

/**
 * How the tests browser's listing is doing: still being fetched, ready, the
 * host's discovery failed, or the environment that runs the tests is down.
 */
export type TestsStatus = 'loading' | 'ready' | 'error' | 'unavailable'

/** What the tests region renders — replaced only when one of its fields changes. */
export interface ChatTestsSnapshot {
  /** The tests the host discovered, in the host's order. */
  list: TestItem[]
  /** How the listing is doing. */
  status: TestsStatus
  /** The run the bar and browser show: this panel's own while it runs, else the latest. */
  run: TestsRunState
}

/** One run this panel started: its folded state, the host's handle, and its `done` event. */
export interface OwnTestRunInvocation {
  /** The run's state as the panel has folded its events so far. */
  state: TestsRunState
  /** The host's handle to the run in flight (so it can be cancelled), or null until it hands one over. */
  handle: TestRunHandle | null
  /** The run's `done` event once it arrived, so a late `start` can be recorded as history. */
  ended: Extract<TestRunEvent, { type: 'done' }> | null
}

/** Only COMPLETED own ids are bounded; active own ids are pinned separately. */
export const COMPLETED_OWN_TEST_RUN_ID_LIMIT = 32

/**
 * Remember a completed own run for its delayed feed copy.
 *
 * @param ids - The completed own-run ids, oldest first.
 * @param runId - The run that just completed.
 */
export function rememberCompletedOwnTestRunId(ids: Set<string>, runId: string): void {
  ids.delete(runId)
  ids.add(runId)
  if (ids.size <= COMPLETED_OWN_TEST_RUN_ID_LIMIT) return
  const oldest = ids.values().next()
  if (!oldest.done) ids.delete(oldest.value)
}

/** The host capabilities one controller operation reads (the panel's props). */
export interface ChatTestsHost {
  /** Lists the project's tests — see `ChatPanelProps.listTests`. */
  listTests?: () => Promise<TestList>
  /** Runs the selected tests, streaming events — see `ChatPanelProps.runTests`. */
  runTests?: (selection: TestSelection, onEvent: (event: TestRunEvent) => void) => TestRunHandle
  /** Whether this viewer may run tests — see `ChatPanelProps.canRunTests`. */
  canRunTests?: boolean
  /** Whether this viewer may edit — see `ChatPanelProps.canEdit`. */
  canEdit?: boolean
  /** Whether the environment that runs the tests is up — see `ChatPanelProps.testsAvailable`. */
  testsAvailable?: boolean
  /** Translates the one fallback failure message the controller raises. */
  translate: TranslateFunction
}

/** An opaque scheduled-timer handle, as the platform's `setTimeout` returns it. */
export type ChatTestsTimer = ReturnType<typeof setTimeout>

/** What the controller reads from its environment; every one has a default. */
export interface ChatTestsControllerOptions {
  /**
   * Whether a chat TURN is in flight — a fix is a real message, so it waits its
   * turn. Read at call time, so the caller's latest state is what decides.
   */
  isTurnInFlight?: () => boolean
  /** Reads the current time (a seeded run's `startedAt`). Defaults to `Date.now`. */
  now?: () => number
  /** Schedules a re-list after a run completes. Defaults to `setTimeout`. */
  setTimer?: (callback: () => void, delayMs: number) => ChatTestsTimer
  /** Cancels a scheduled re-list. Defaults to `clearTimeout`. */
  clearTimer?: (timer: ChatTestsTimer) => void
  /** Warns about a host failure. Defaults to doing nothing. */
  warn?: (message: string, context: Record<string, unknown>) => void
}

/**
 * The tests region's state and behaviour (see the module docs). React (or a
 * framework binding) subscribes to it, renders {@link ChatTestsController.snapshot},
 * keeps its own effects where they are, and starts the controller's work from
 * them.
 */
export class ChatTestsController {
  private list: TestItem[] = []
  private status: TestsStatus = 'loading'
  private run: TestsRunState = EMPTY_RUN_STATE
  // Each callback closes over its own folded run. Only this invocation owns
  // controls; stopped/completed invocations can still report trailing verdicts.
  private ownRun: OwnTestRunInvocation | null = null
  // One incremental projection: per-file verdicts plus bounded live/latest run
  // state. Server ids dedupe the direct stream and feed echo; legacy id-less
  // custom hosts use the bounded id guard.
  private readonly projection = new TestRunProjection()
  private readonly activeOwnRunIds = new Set<string>()
  private readonly completedOwnRunIds = new Set<string>()
  // Live for the async callbacks, so a list resolving after an unmount, or a
  // run event arriving then, never sets state on a dead tree.
  private mounted = true
  private current: ChatTestsSnapshot = { list: this.list, status: this.status, run: this.run }
  private readonly listeners = new Set<() => void>()
  private readonly isTurnInFlight: () => boolean
  private readonly now: () => number
  private readonly setTimer: (callback: () => void, delayMs: number) => ChatTestsTimer
  private readonly clearTimer: (timer: ChatTestsTimer) => void
  private readonly warn: (message: string, context: Record<string, unknown>) => void

  /**
   * Creates the controller. Performs no I/O.
   *
   * @param options - The environment it reads; every one has a default.
   */
  constructor(options: ChatTestsControllerOptions = {}) {
    this.isTurnInFlight = options.isTurnInFlight ?? (() => false)
    this.now = options.now ?? (() => Date.now())
    this.setTimer = options.setTimer ?? ((callback, delayMs) => setTimeout(callback, delayMs))
    this.clearTimer = options.clearTimer ?? ((timer) => clearTimeout(timer))
    this.warn = options.warn ?? (() => {})
  }

  /**
   * The current state. The identity changes only when one of its fields does.
   *
   * @returns The snapshot to render.
   */
  snapshot = (): ChatTestsSnapshot => this.current

  /**
   * Listens for a new snapshot.
   *
   * @param listener - Called after each change.
   * @returns Stops listening.
   */
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * Marks the panel as mounted. React's mount effect calls this, so a reconnect
   * (StrictMode/Suspense) does not permanently silence discovery and run events.
   */
  mount(): void {
    this.mounted = true
  }

  /**
   * Marks the panel as unmounted and gives up this panel's own run: its handle
   * is cancelled and later run events are ignored.
   */
  unmount(): void {
    this.mounted = false
    const own = this.ownRun
    this.ownRun = null
    own?.handle?.cancel()
  }

  /**
   * Whether the panel is mounted — a list resolving after an unmount must not
   * start a run the person can no longer see.
   *
   * @returns True while the panel is mounted.
   */
  isMounted(): boolean {
    return this.mounted
  }

  /**
   * Sets the listing status (the tests bar shows "loading" while discovery
   * starts).
   *
   * @param status - The new status.
   */
  setStatus(status: TestsStatus): void {
    this.patch({ status })
  }

  /**
   * The list request alone: every state change follows the host's answer.
   *
   * @param list - The host's discovery function.
   * @returns A promise resolved once the listing settled.
   */
  loadTests(list: () => Promise<TestList>): Promise<void> {
    return list().then(
      (found) => {
        if (!this.mounted) return
        this.patch({ list: found.tests ?? [], status: 'ready' })
      },
      (error: unknown) => {
        this.warn('Failed to list project tests', { error })
        if (!this.mounted) return
        this.patch({ status: 'error' })
      },
    )
  }

  /**
   * Re-reads the project's tests. A host that wires no discovery has no tests to
   * show, and a down environment keeps the list the person was reading.
   *
   * @param host - The host's discovery and environment availability.
   * @returns A promise resolved once the listing settled.
   */
  async refreshTests(host: Pick<ChatTestsHost, 'listTests' | 'testsAvailable'>): Promise<void> {
    if (!host.listTests) {
      this.patch({ status: 'error' })
      return
    }
    if (host.testsAvailable === false) {
      this.patch({ status: 'unavailable' })
      return
    }
    if (this.status !== 'ready') this.patch({ status: 'loading' })
    await this.loadTests(host.listTests)
  }

  /**
   * Starts this panel's own run over a selection.
   *
   * @param selection - What to run.
   * @param host - The host's runner, permissions and translator.
   */
  startTestsRun(selection: TestSelection, host: ChatTestsHost): void {
    if (!host.runTests) return
    if (host.canRunTests === false || host.canEdit === false) return
    if (host.testsAvailable === false || this.run.running || this.ownRun) return
    if (selection.ids?.length === 0) return
    // Seed a running state immediately: the host's `start` event may be a
    // round trip away, and a Run button that appears to do nothing is the
    // failure this feature exists to remove.
    const initial: TestsRunState = {
      ...EMPTY_RUN_STATE,
      running: true,
      queued: [...(selection.ids ?? [])],
      startedAt: this.now(),
      external: false,
    }
    const invocation: OwnTestRunInvocation = {
      state: initial,
      handle: null,
      ended: null,
    }
    this.ownRun = invocation
    const results = { ...this.run.results }
    for (const id of initial.queued) delete results[id]
    this.patch({ run: { ...initial, results } })
    try {
      const handle = host.runTests(selection, (event) => {
        if (!this.mounted) return
        const current = this.ownRun === invocation
        const ended = invocation.ended
        invocation.state = applyTestRunEvent(invocation.state, event)
        const runId = invocation.state.runId

        // Completion owns cleanup even when no start ever supplied an id. Otherwise one failed
        // start leaves this invocation occupied and every later Run click returns early.
        if (event.type === 'done') {
          invocation.ended = event
          if (current) this.ownRun = null
          void this.refreshTests(host)
        }

        if (runId == null) {
          if (current) this.patch({ run: invocation.state })
          return
        }
        if (event.type === 'start') {
          this.recordOwnTestRunEvent(event)
          if (ended) {
            // A start delayed past cancellation is history, never a live own run.
            invocation.state = applyTestRunEvent(invocation.state, ended)
            this.recordOwnTestRunEvent({ ...ended, runId })
          }
        } else {
          this.recordOwnTestRunEvent({ ...event, runId })
        }
        if (event.type === 'done' && !event.eventId) {
          this.activeOwnRunIds.delete(runId)
          rememberCompletedOwnTestRunId(this.completedOwnRunIds, runId)
        }
        this.projectTestsRun()
      })
      // The host is allowed to finish synchronously, before returning its
      // handle. It no longer owns controls after handing the card onward.
      if (this.ownRun !== invocation) return
      invocation.handle = handle
      // Whether a Skip control belongs on screen is decided HERE, by whether
      // this host's handle serves one — not by the card guessing, and not by
      // a button that would do nothing when clicked.
      const skips = typeof handle.skipCurrent === 'function'
      invocation.state = {
        ...invocation.state,
        skipPending: false,
        skipUnavailable: !skips,
      }
      this.patch({ run: { ...this.run, skipPending: false, skipUnavailable: !skips } })
    } catch (error) {
      this.warn('Failed to start a test run', { error })
      if (this.ownRun !== invocation) return
      this.ownRun = null
      const message =
        error instanceof Error
          ? error.message
          : host.translate('ide.tests.runError', undefined, {
              defaultValue: 'The test run could not start.',
            })
      const runId = invocation.state.runId
      if (runId != null) {
        const done = { type: 'done', outcome: 'error', error: message } as const
        invocation.ended = done
        invocation.state = applyTestRunEvent(invocation.state, done)
        this.activeOwnRunIds.delete(runId)
        this.recordOwnTestRunEvent({ ...done, runId })
        this.projectTestsRun()
      } else if (this.projection.show().running) {
        this.projectTestsRun()
      } else {
        this.patch({ run: failRun(this.run, message) })
      }
    }
  }

  /**
   * Stops this panel's own run. Only its own run can be stopped from here; the
   * controls are not offered on a run it is only watching.
   */
  cancelTestsRun(): void {
    const invocation = this.ownRun
    if (!invocation) return
    // Relinquish ownership before cancel(), which may synchronously call back.
    this.ownRun = null
    const done = { type: 'done', outcome: 'cancelled' } as const
    invocation.ended = done
    invocation.state = applyTestRunEvent(invocation.state, done)
    const runId = invocation.state.runId
    if (runId != null) {
      this.activeOwnRunIds.delete(runId)
      this.recordOwnTestRunEvent({ ...done, runId })
      this.projectTestsRun()
    } else {
      this.patch({ run: { ...invocation.state, skipUnavailable: true } })
    }
    invocation.handle?.cancel()
  }

  /**
   * Skips the command the run is ON, leaving the run itself alive. The state
   * only records that the request went out — the run's own `result` for that
   * file is what moves the row, so a skip can never paint itself as a pass. A
   * host answering "there was nothing to skip" is a race the person did not
   * cause: the control goes away, no error line.
   *
   * @param options - The panel's edit and run permissions.
   */
  skipCurrentTest(options: { canEdit?: boolean; canRunTests?: boolean }): void {
    if (options.canEdit === false || options.canRunTests === false) return
    const invocation = this.ownRun
    if (!invocation) return
    const skip = invocation.handle?.skipCurrent
    if (!invocation.handle || !skip) {
      invocation.state = markSkipUnavailable(invocation.state)
      this.patch({ run: markSkipUnavailable(this.run) })
      return
    }
    invocation.state = requestSkip(invocation.state)
    this.patch({ run: requestSkip(this.run) })
    const handle = invocation.handle
    const unavailable = (): void => {
      if (this.mounted && this.ownRun === invocation) {
        invocation.state = markSkipUnavailable(invocation.state)
        this.patch({ run: markSkipUnavailable(this.run) })
      }
    }
    try {
      const outcome = skip.call(handle)
      if (outcome) {
        void outcome.then(
          (accepted) => {
            if (accepted === false) unavailable()
          },
          (error: unknown) => {
            this.warn('Failed to skip the running test', { error })
            unavailable()
          },
        )
      }
    } catch (error) {
      this.warn('Failed to skip the running test', { error })
      unavailable()
    }
  }

  /**
   * Skips the executor's in-flight tool call WITHOUT ending the turn — the
   * model is told the command did not run and carries on.
   *
   * @param toolCallId - The tool call to skip.
   * @param options - The panel's edit permission and the host's skip action.
   * @returns The host's answer (`false` when it had already finished), or `false`
   *   when skipping is not allowed or the host failed.
   */
  async handleSkipToolCall(
    toolCallId: string,
    options: {
      canEdit?: boolean
      skipToolCall?: (toolCallId: string) => void | Promise<boolean | void>
    },
  ): Promise<boolean | void> {
    if (options.canEdit === false || !options.skipToolCall) return false
    try {
      return await options.skipToolCall(toolCallId)
    } catch (error) {
      this.warn('Failed to skip the running tool call', { error })
      return false
    }
  }

  /**
   * Hands the failing tests to the agent as ONE ordinary user message — the
   * same move as the editor's "Fix with AI" and the auto-fix loop: compose the
   * problem, send it through the normal path, let the turn answer. The overlay
   * closes so the person watches the turn they just started.
   *
   * @param failures - The failing tests the card lists.
   * @param options - The panel's edit permission, the overlay closer and the message sender.
   */
  fixTests(
    failures: TestFailure[],
    options: {
      canEdit?: boolean
      closeOverlay: () => void
      sendMessage: (message: string) => void
    },
  ): void {
    if (options.canEdit === false || failures.length === 0) return
    if (this.isTurnInFlight()) return
    const message = buildTestFixMessage(failures)
    if (!message) return
    options.closeOverlay()
    options.sendMessage(message)
  }

  /**
   * Subscribes to every run in the project, however it was started: the host
   * replays the runs it still holds, then streams new ones. A completed run
   * schedules one re-list so the browser shows the fresh verdicts.
   *
   * @param watchTestRuns - The host's feed subscription, or undefined when unwired.
   * @param refresh - Re-lists the project's tests (the panel's effect event).
   * @returns The effect cleanup: stops the subscription and the pending re-list.
   */
  watchRuns(
    watchTestRuns: ((onEvent: (event: TestRunFeedEvent) => void) => () => void) | undefined,
    refresh: () => void,
  ): () => void {
    if (!watchTestRuns) return () => {}
    let relist: ChatTestsTimer | null = null
    let unsubscribe: (() => void) | null = null
    try {
      unsubscribe = watchTestRuns((event) => {
        if (!this.mounted) return
        // Only id-less legacy hosts need run-id suppression. Ordered copies dedupe by event id.
        if (
          !event.eventId &&
          (this.activeOwnRunIds.has(event.runId) || this.completedOwnRunIds.has(event.runId))
        ) {
          return
        }
        this.projection.apply(event, this.ownRun?.state.runId ?? null)
        this.projectTestsRun()
        if (event.type === 'done') {
          if (relist) this.clearTimer(relist)
          relist = this.setTimer(() => {
            relist = null
            refresh()
          }, 500)
        }
      })
      this.projectTestsRun()
    } catch (error) {
      this.warn('Failed to watch the project test runs', { error })
    }
    return () => {
      if (relist) this.clearTimer(relist)
      unsubscribe?.()
    }
  }

  /**
   * Shows what the projection holds, folding in the live own run's skip state
   * when the card is on that run.
   */
  private projectTestsRun(): void {
    const invocation = this.ownRun
    if (invocation && invocation.state.runId == null) {
      this.patch({ run: invocation.state })
      return
    }
    const activeOwnRunId = invocation?.state.runId ?? null
    const next = this.projection.show(activeOwnRunId)
    this.patch({
      run:
        invocation && next.runId === invocation.state.runId
          ? {
              ...next,
              skipPending: invocation.state.skipPending,
              skipUnavailable: invocation.state.skipUnavailable,
            }
          : next,
    })
  }

  /**
   * Records an own-run event for the projection and the delayed-echo guard.
   *
   * @param event - The event, always carrying the invocation's run id.
   */
  private recordOwnTestRunEvent(event: TestRunFeedEvent): void {
    const legacy = !event.eventId
    if (legacy) {
      if (this.ownRun?.state.runId === event.runId) this.activeOwnRunIds.add(event.runId)
      else rememberCompletedOwnTestRunId(this.completedOwnRunIds, event.runId)
    }
    this.projection.apply(event, this.ownRun?.state.runId ?? null)
  }

  /**
   * Stores a changed field and tells the subscribers, once.
   *
   * @param next - The fields that changed.
   */
  private patch(next: Partial<ChatTestsSnapshot>): void {
    let changed = false
    if (next.list !== undefined && next.list !== this.list) {
      this.list = next.list
      changed = true
    }
    if (next.status !== undefined && next.status !== this.status) {
      this.status = next.status
      changed = true
    }
    if (next.run !== undefined && next.run !== this.run) {
      this.run = next.run
      changed = true
    }
    if (!changed) return
    this.current = { list: this.list, status: this.status, run: this.run }
    for (const listener of [...this.listeners]) listener()
  }
}
