/**
 * `chat:tests` — the tests-run controller and the `/test` browser binding,
 * ported from React's `chat:tests` region: the listing, the runs (its own and
 * every run in the project), the Skip control and the "Fix with AI" handoff.
 *
 * The list and the in-flight run live in the shared `ChatTestsController` (not
 * inside the card), so an overlay the user closes never kills a streaming run;
 * this slice subscribes to its snapshot, starts its work from the effects at
 * React's effect positions, and forwards each action with the host's callbacks
 * and permissions read at call time.
 *
 * @module
 */

import { computed, type ComputedRef, onMounted, onUnmounted, shallowRef, watch } from 'vue'

import type {
  TestFailure,
  TestItem,
  TestSelection,
  TestsRunState,
} from '@molecule/app-ide-panel-logic'
import { ChatTestsController, type TestsStatus } from '@molecule/app-ide-panel-logic/panels'
import { getLogger } from '@molecule/app-logger'

import type { ChatCtx, ChatEffect, ListTestsHandler } from './context.js'

const logger = getLogger('chat-panel')

/** What the `chat:tests` slice exposes. */
export interface ChatTestsSlice {
  /** The run in flight (its own, or one followed from the project feed). */
  readonly testsRun: ComputedRef<TestsRunState>
  /** The discovered tests. */
  readonly testsList: ComputedRef<TestItem[]>
  /** How the listing went. */
  readonly testsStatus: ComputedRef<TestsStatus>
  /** The shared tests-run controller. */
  readonly testsController: ChatTestsController
  /** Loads the project's tests through the host's lister. */
  readonly loadTests: (list: ListTestsHandler) => Promise<void>
  /** Runs a selection. */
  readonly startTestsRun: (selection: TestSelection) => void
  /** Stops the run in flight. */
  readonly cancelTestsRun: () => void
  /** Skips the command the run is on, without ending the run. */
  readonly skipCurrentTest: () => void
  /** Hands the failures to the agent as one chat message. */
  readonly fixTests: (failures: TestFailure[]) => void
  /** Opens the `/test` browser (optionally filtered, optionally running all). */
  readonly openTestsBrowser: (query?: string, runAll?: boolean) => void
  /** Skips the executor's in-flight tool call. */
  readonly handleSkipToolCall: (toolCallId: string) => Promise<boolean | void>
  /** The region's effects, in React's order. */
  readonly effects: {
    /** `#effect chat:tests:1`. */
    readonly 1: ChatEffect
    /** `#effect chat:tests:2` — subscribes to every test run in the project. */
    readonly 2: ChatEffect
  }
}

/**
 * Builds the `chat:tests` slice.
 *
 * @param ctx - The panel context (the host's test callbacks, its permissions,
 *   the chat session, the overlay and translation).
 * @returns The tests slice.
 */
export function createChatTests(ctx: ChatCtx): ChatTestsSlice {
  // React's `readTestsBusy`: whether a TURN is in flight — a fix is a real
  // message, so it waits its turn. Read at call time.
  const readTestsBusy = (): boolean => ctx.chat.isLoading.value || ctx.chat.isRemoteStreaming.value
  const testsController = new ChatTestsController({
    isTurnInFlight: readTestsBusy,
    warn: (message, context) => {
      logger.warn(message, context)
    },
  })

  // React's `useSyncExternalStore(testsController.subscribe, snapshot)`: the
  // snapshot is read into a reactive ref on every change, so the computed
  // views below re-render the panel exactly when the controller patches a field.
  const testsSnapshot = shallowRef(testsController.snapshot())
  const unsubscribe = testsController.subscribe(() => {
    testsSnapshot.value = testsController.snapshot()
  })
  onUnmounted(unsubscribe)

  const testsRun = computed(() => testsSnapshot.value.run)
  const testsList = computed(() => testsSnapshot.value.list)
  const testsStatus = computed(() => testsSnapshot.value.status)

  /**
   * The list request alone: every state change follows the host's answer.
   *
   * @param list - The host's discovery function.
   * @returns A promise resolved once the listing settled.
   */
  const loadTests = (list: ListTestsHandler): Promise<void> => testsController.loadTests(list)

  /**
   * Re-reads the project's tests through the host's current discovery and
   * environment availability.
   *
   * @returns A promise resolved once the listing settled.
   */
  const refreshTests = (): Promise<void> =>
    testsController.refreshTests({
      listTests: ctx.props.listTests,
      testsAvailable: ctx.props.testsAvailable,
    })

  /**
   * Starts this panel's own run over a selection.
   *
   * @param selection - What to run.
   */
  const startTestsRun = (selection: TestSelection): void => {
    testsController.startTestsRun(selection, {
      listTests: ctx.props.listTests,
      runTests: ctx.props.runTests,
      canRunTests: ctx.props.canRunTests,
      canEdit: ctx.props.canEdit,
      testsAvailable: ctx.props.testsAvailable,
      translate: ctx.env.t,
    })
  }

  /**
   * Hands the failing tests to the agent as ONE ordinary user message, closing
   * the overlay so the person watches the turn they just started.
   *
   * @param failures - The failing tests the card lists.
   */
  const fixTests = (failures: TestFailure[]): void => {
    testsController.fixTests(failures, {
      canEdit: ctx.props.canEdit,
      closeOverlay: () => {
        ctx.overlay.setPanelOverlay(null)
      },
      sendMessage: (message) => {
        ctx.chat.sendLatestMessage(message)
      },
    })
  }

  /** Stops this panel's own run. */
  const cancelTestsRun = (): void => {
    testsController.cancelTestsRun()
  }

  /**
   * Skips the command the run is ON, leaving the run itself alive.
   */
  const skipCurrentTest = (): void => {
    testsController.skipCurrentTest({
      canEdit: ctx.props.canEdit,
      canRunTests: ctx.props.canRunTests,
    })
  }

  /**
   * Open the tests browser, re-listing so a spec just written shows up.
   *
   * @param query - The search seed (from a `/test <query>` invocation).
   * @param runAll - Start every test once the fresh listing settles.
   */
  const openTestsBrowser = (query = '', runAll = false): void => {
    ctx.overlay.openPanelOverlay('tests', query)
    void refreshTests().then(() => {
      if (runAll && testsController.isMounted()) startTestsRun({ kind: 'all' })
    })
  }

  /**
   * Skips the executor's in-flight tool call WITHOUT ending the turn.
   *
   * @param toolCallId - The tool call to skip.
   * @returns The host's answer (`false` when it had already finished or the
   *   host is not allowed to skip).
   */
  const handleSkipToolCall = (toolCallId: string): Promise<boolean | void> =>
    testsController.handleSkipToolCall(toolCallId, {
      canEdit: ctx.props.canEdit,
      skipToolCall: ctx.props.skipToolCall,
    })

  return {
    testsRun,
    testsList,
    testsStatus,
    testsController,
    loadTests,
    startTestsRun,
    cancelTestsRun,
    skipCurrentTest,
    fixTests,
    openTestsBrowser,
    handleSkipToolCall,
    effects: {
      1: () => {
        // React can reconnect effects on the same tree (StrictMode/Suspense).
        // Cleanup must not permanently silence discovery and run events.
        onMounted(() => {
          testsController.mount()
        })
        onUnmounted(() => {
          testsController.unmount()
        })
      },
      2: () => {
        // Every run in the project, however it was started, reaches the same bar
        // and browser: the host replays the runs it still holds, then streams new
        // ones. The closure keeps the subscription from restarting (and
        // replaying) each time `refreshTests` would change identity.
        let stop = (): void => {}
        const subscribe = (): void => {
          stop = testsController.watchRuns(ctx.props.watchTestRuns, () => {
            void refreshTests()
          })
        }
        onMounted(subscribe)
        onUnmounted(() => {
          stop()
        })
        watch(
          () => ctx.props.watchTestRuns,
          () => {
            stop()
            subscribe()
          },
          { flush: 'post' },
        )
      },
    },
  }
}
