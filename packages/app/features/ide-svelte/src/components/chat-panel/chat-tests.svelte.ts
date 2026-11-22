/**
 * React's `chat:tests` region of ChatPanel.tsx — the `/test` browser's list and
 * test-run controller, ported to runes.
 *
 * The list and the in-flight run live in the shared `ChatTestsController`, not
 * inside `TestsCard`, for one reason: the card is an overlay the user closes. A
 * run that is streaming (a browser spec can take a minute) must survive that
 * close and still be there when they re-open it, and re-running `/test` must
 * re-list without killing it. So the card is presentational and the controller
 * owns the state; this slice subscribes to its snapshot and renders it.
 *
 * `ChatInner` calls `mount()` and then the effects at React's effect positions,
 * so the order of the host's requests and of the controller's subscriptions is
 * React's.
 *
 * @module
 */

import type {
  TestFailure,
  TestItem,
  TestList,
  TestSelection,
  TestsRunState,
} from '@molecule/app-ide-panel-logic'
import {
  ChatTestsController,
  type ChatTestsSnapshot,
  type TestsStatus,
} from '@molecule/app-ide-panel-logic/panels'
import { getLogger } from '@molecule/app-logger'

import type { ChatContext } from './context.svelte.js'

/** The package logger (the same channel the rest of the panel logs on). */
const logger = getLogger('chat-panel')

/** The identifiers other slices and sections read from the `chat:tests` slice. */
export interface ChatTestsSlice {
  /** The shared tests controller (it survives the overlay closing). */
  readonly testsController: ChatTestsController
  /** The tests the host discovered. */
  readonly testsList: TestItem[]
  /** How the listing is doing. */
  readonly testsStatus: TestsStatus
  /** The run the bar and browser show. */
  readonly testsRun: TestsRunState
  /** Lists the project's tests through the host. */
  readonly loadTests: (list: () => Promise<TestList>) => Promise<void>
  /** Starts a run. */
  readonly startTestsRun: (selection: TestSelection) => void
  /** Hands the failing tests to the agent as one message. */
  readonly fixTests: (failures: TestFailure[]) => void
  /** Cancels the run in flight. */
  readonly cancelTestsRun: () => void
  /** Skips the command the run is on. */
  readonly skipCurrentTest: () => void
  /** Skips the executor's in-flight tool call. */
  readonly handleSkipToolCall: (toolCallId: string) => Promise<boolean | void>
  /** Opens the tests browser, re-listing first. */
  readonly openTestsBrowser: (query?: string, runAll?: boolean) => void

  /** React's mount I/O for the region: the controller's mount lives in effect 1. */
  mount(): void

  /** React's `#effect chat:tests:<n>` entry points, at React's positions. */
  readonly effects: { 1: () => void; 2: () => void }
}

/**
 * Creates the `chat:tests` slice.
 *
 * @param ctx - The shared chat context (the host's test callbacks, its
 *   permissions, the chat session, the overlay and translation).
 * @returns The controller binding, the snapshot views and effects 1–2.
 */
export function createChatTests(ctx: ChatContext): ChatTestsSlice {
  /** React's `readTestsBusy`: whether a TURN is in flight — a fix waits its turn. */
  const readTestsBusy = (): boolean => ctx.chat.isLoading || ctx.chat.isRemoteStreaming
  /** React's controller — one instance shared with the browser and the bar. */
  const testsController = new ChatTestsController({
    isTurnInFlight: readTestsBusy,
    warn: (message, context) => {
      logger.warn(message, context)
    },
  })
  // React's `useSyncExternalStore(testsController.subscribe, snapshot)`: the
  // snapshot is copied into a reactive cell on every change, so the views below
  // re-render exactly when the controller patches a field.
  let testsSnapshot = $state.raw<ChatTestsSnapshot>(testsController.snapshot())

  /** Copies the controller's new snapshot into the reactive cell. */
  const readSnapshot = (): void => {
    testsSnapshot = testsController.snapshot()
  }

  /**
   * Re-reads the project's tests through the host's current discovery and
   * environment availability (React's `refreshTests`).
   *
   * @returns A promise resolved once the listing settled.
   */
  const refreshTests = (): Promise<void> =>
    testsController.refreshTests({
      listTests: ctx.props.listTests,
      testsAvailable: ctx.props.testsAvailable,
    })

  /**
   * The list request alone: every state change follows the host's answer.
   *
   * @param list - The host's discovery function.
   * @returns A promise resolved once the listing settled.
   */
  const loadTests = (list: () => Promise<TestList>): Promise<void> =>
    testsController.loadTests(list)

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
      sendMessage: ctx.chat.sendLatestMessage,
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

  return {
    testsController,
    get testsList(): TestItem[] {
      return testsSnapshot.list
    },
    get testsStatus(): TestsStatus {
      return testsSnapshot.status
    },
    get testsRun(): TestsRunState {
      return testsSnapshot.run
    },
    loadTests,
    startTestsRun,
    fixTests,
    cancelTestsRun,
    skipCurrentTest,
    handleSkipToolCall,
    openTestsBrowser,
    mount(): void {
      // React's mount I/O is effect 1 below (the controller's mount/unmount and
      // the snapshot subscription); there is no other mount work.
    },
    effects: {
      1: (): void => {
        // React can reconnect effects on the same tree (StrictMode/Suspense).
        // Cleanup must not permanently silence discovery and run events.
        $effect(() => {
          testsController.mount()
          const unsubscribe = testsController.subscribe(readSnapshot)
          readSnapshot()
          return () => {
            unsubscribe()
            testsController.unmount()
          }
        })
      },
      2: (): void => {
        // Every run in the project, however it was started, reaches the same bar
        // and browser: the host replays the runs it still holds, then streams new
        // ones. The closure keeps the subscription from restarting (and
        // replaying) each time `refreshTests` would change identity.
        $effect(() => {
          const watch = ctx.props.watchTestRuns
          return testsController.watchRuns(watch, () => {
            void refreshTests()
          })
        })
      },
    },
  }
}
