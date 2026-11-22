/**
 * `chat:tests` — the tests browser's controller and the actions the panel offers
 * (`/test`, Run, Fix, Cancel, Skip), ported from React's `chat:tests` region.
 *
 * The list and the in-flight run live in the shared `ChatTestsController`, not
 * inside the card, for one reason: the card is an overlay the user closes, and a
 * run that is streaming must survive that close and still be there when they
 * re-open it. This slice owns the controller, subscribes to its snapshot (React's
 * `useSyncExternalStore`), and forwards each action with the host's callbacks and
 * permissions read at call time.
 *
 * @module
 */

import type { Accessor } from 'solid-js'
import { createEffect, createSignal, on, onCleanup, onMount, untrack } from 'solid-js'

import type {
  TestFailure,
  TestItem,
  TestList,
  TestSelection,
  TestsRunState,
} from '@molecule/app-ide-panel-logic'
import type { TestsStatus } from '@molecule/app-ide-panel-logic/panels'
import { ChatTestsController } from '@molecule/app-ide-panel-logic/panels'

import type { ChatInnerCtx, SliceEffects } from './context.js'

/** What other slices read from `chat:tests`. */
export interface ChatTestsSlice {
  /** The shared tests controller (it survives the overlay closing). */
  testsController: ChatTestsController
  /** The tests the host discovered. */
  testsList: Accessor<TestItem[]>
  /** How the listing is doing. */
  testsStatus: Accessor<TestsStatus>
  /** The run the bar and browser show. */
  testsRun: Accessor<TestsRunState>
  /** Lists the project's tests through the host. */
  loadTests: (list: () => Promise<TestList>) => Promise<void>
  /** Starts a run. */
  startTestsRun: (selection: TestSelection) => void
  /** Hands the failing tests to the agent as one message. */
  fixTests: (failures: TestFailure[]) => void
  /** Cancels the run in flight. */
  cancelTestsRun: () => void
  /** Skips the command the run is on. */
  skipCurrentTest: () => void
  /** Skips the executor's in-flight tool call. */
  handleSkipToolCall: (toolCallId: string) => Promise<boolean | void>
  /** Opens the tests browser, re-listing first. */
  openTestsBrowser: (query?: string, runAll?: boolean) => void
  /** The slice's effects, by ledger position. */
  effects: SliceEffects
}

/**
 * Creates `chat:tests`.
 * @param ctx - The inner ctx (the host's test callbacks and permissions, the
 *   chat session, the overlay and the translator).
 * @returns The tests slice.
 */
export function createChatTests(ctx: ChatInnerCtx): ChatTestsSlice {
  // React's `readTestsBusy`: whether a TURN is in flight — a fix is a real
  // message, so it waits its turn. Read at call time, so the latest state decides.
  const readTestsBusy = (): boolean => ctx.chat.isLoading() || ctx.chat.isRemoteStreaming()
  const controller = new ChatTestsController({
    isTurnInFlight: readTestsBusy,
    warn: (message, context) => {
      ctx.env.logger.warn(message, context)
    },
  })

  // React's `useSyncExternalStore(controller.subscribe, controller.snapshot)`:
  // the snapshot is read into a signal on every change, so the views re-render
  // exactly when the controller patches a field.
  const [snapshot, setSnapshot] = createSignal(controller.snapshot())
  const unsubscribe = controller.subscribe(() => {
    setSnapshot(controller.snapshot())
  })
  onCleanup(unsubscribe)

  const testsList = (): TestItem[] => snapshot().list
  const testsStatus = (): TestsStatus => snapshot().status
  const testsRun = (): TestsRunState => snapshot().run

  /**
   * The list request alone: every state change follows the host's answer.
   * @param list - The host's discovery function.
   * @returns A promise resolved once the listing settled.
   */
  const loadTests = (list: () => Promise<TestList>): Promise<void> => controller.loadTests(list)

  /**
   * Re-reads the project's tests through the host's current discovery and
   * environment availability.
   * @returns A promise resolved once the listing settled.
   */
  const refreshTests = (): Promise<void> =>
    controller.refreshTests({
      listTests: ctx.props.listTests,
      testsAvailable: ctx.props.testsAvailable,
    })

  /**
   * Starts this panel's own run over a selection.
   * @param selection - What to run.
   */
  const startTestsRun = (selection: TestSelection): void => {
    controller.startTestsRun(selection, {
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
   * @param failures - The failing tests the card lists.
   */
  const fixTests = (failures: TestFailure[]): void => {
    controller.fixTests(failures, {
      canEdit: ctx.props.canEdit,
      closeOverlay: () => {
        ctx.overlay.setPanelOverlay(null)
      },
      sendMessage: (message) => {
        void ctx.chat.sendLatestMessage(message)
      },
    })
  }

  /** Stops this panel's own run. */
  const cancelTestsRun = (): void => {
    controller.cancelTestsRun()
  }

  /** Skips the command the run is ON, leaving the run itself alive. */
  const skipCurrentTest = (): void => {
    controller.skipCurrentTest({
      canEdit: ctx.props.canEdit,
      canRunTests: ctx.props.canRunTests,
    })
  }

  /**
   * Open the tests browser, re-listing so a spec just written shows up.
   * @param query - The search seed (from a `/test <query>` invocation).
   * @param runAll - Start every test once the fresh listing settles.
   */
  const openTestsBrowser = (query = '', runAll = false): void => {
    ctx.overlay.openPanelOverlay('tests', query)
    void refreshTests().then(() => {
      if (runAll && controller.isMounted()) startTestsRun({ kind: 'all' })
    })
  }

  /**
   * Skips the executor's in-flight tool call WITHOUT ending the turn.
   * @param toolCallId - The tool call to skip.
   * @returns The host's answer (`false` when it had already finished or the host
   *   is not allowed to skip).
   */
  const handleSkipToolCall = (toolCallId: string): Promise<boolean | void> =>
    controller.handleSkipToolCall(toolCallId, {
      canEdit: ctx.props.canEdit,
      skipToolCall: ctx.props.skipToolCall,
    })

  return {
    testsController: controller,
    testsList,
    testsStatus,
    testsRun,
    loadTests,
    startTestsRun,
    fixTests,
    cancelTestsRun,
    skipCurrentTest,
    handleSkipToolCall,
    openTestsBrowser,
    effects: {
      // #effect chat:tests:1 — React can reconnect effects on the same tree
      // (StrictMode/Suspense). Cleanup must not permanently silence discovery and
      // run events.
      1: () => {
        onMount(() => controller.mount())
        onCleanup(() => controller.unmount())
      },
      // #effect chat:tests:2 — every run in the project, however it was started,
      // reaches the same bar and browser: the host replays the runs it still
      // holds, then streams new ones. The wrapper reads the latest refresh, so
      // the subscription does not restart (and replay) when the props change.
      2: () => {
        createEffect(
          on(
            () => ctx.props.watchTestRuns,
            () => {
              const stop = controller.watchRuns(ctx.props.watchTestRuns, () => {
                void untrack(refreshTests)
              })
              onCleanup(stop)
            },
          ),
        )
      },
    },
  }
}
