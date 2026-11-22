/**
 * React's `chat:tests` region of ChatPanel.tsx (lines 1756–1879): the shared
 * {@link ChatTestsController} binding plus the panel's thin action wrappers —
 * the list request alone, the re-list, the run controls, the fix hand-off, the
 * overlay opener and the two effects that mount the controller and subscribe to
 * the project's run feed.
 *
 * The list and the in-flight run live in the controller, not inside the tests
 * card, so a streaming run survives the card being closed. React subscribes with
 * `useSyncExternalStore`; this slice subscribes once at construction and
 * mirrors the snapshot into a signal the computed views read.
 *
 * @module
 */

import { DestroyRef, inject, Injectable, Injector, signal } from '@angular/core'

import type {
  TestFailure,
  TestItem,
  TestList,
  TestSelection,
  TestsRunState,
} from '@molecule/app-ide-panel-logic'
import type { ChatTestsSnapshot, TestsStatus } from '@molecule/app-ide-panel-logic/panels'
import { ChatTestsController } from '@molecule/app-ide-panel-logic/panels'
import { getLogger } from '@molecule/app-logger'

import { ChatChat } from './chat-chat.slice.js'
import type { ChatInnerProps } from './chat-inner-state.js'
import { ChatInnerState, registerChatEffect } from './chat-inner-state.js'
import { ChatOverlay } from './chat-overlay.slice.js'

/** The package logger (React's module-level logger). */
const logger = getLogger('chat-panel')

/** The host's test lister, as React takes it for `loadTests`. */
export type ListTestsHandler = () => Promise<TestList>

/** The identifiers other slices and sections read from the `chat:tests` slice. */
export interface ChatTestsSlice {
  /** React's mount I/O for the region: the controller's mount and the feed subscription. */
  mount(): void

  /** React's `#effect chat:tests:<n>` entry points, at React's positions. */
  readonly effects: { 1: () => void; 2: () => void }

  /** The run in flight (its own, or one followed from the project feed). */
  readonly testsRun: () => TestsRunState
  /** The discovered tests. */
  readonly testsList: () => TestItem[]
  /** How the listing went. */
  readonly testsStatus: () => TestsStatus
  /** The shared tests-run controller. */
  readonly testsController: ChatTestsController
  /** Loads the project's tests through the host's lister. */
  readonly loadTests: (list: ListTestsHandler) => Promise<void>
  /** Re-reads the project's tests through the host's discovery. */
  readonly refreshTests: () => Promise<void>
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
}

/** React's `chat:tests` slice: the controller binding and its wrappers. */
@Injectable()
export class ChatTests implements ChatTestsSlice {
  /** The shared state, read for the host callbacks the controller is given. */
  private readonly state = inject(ChatInnerState)

  /** The element injector `registerChatEffect` registers the effects in. */
  private readonly injector = inject(Injector)

  /** Drops the feed subscription and unmounts the controller on destroy. */
  private readonly destroyRef = inject(DestroyRef)

  /**
   * The shared tests-run controller (React's `useRef` + constructor). It
   * performs no I/O until an effect or action starts its work.
   */
  readonly testsController: ChatTestsController = this.createController()

  /** The controller's latest snapshot, mirrored from its subscription. */
  private readonly snapshot = signal<ChatTestsSnapshot>(this.testsController.snapshot())

  /** The run in flight (its own, or one followed from the project feed). */
  readonly testsRun = (): TestsRunState => this.snapshot().run

  /** The discovered tests. */
  readonly testsList = (): TestItem[] => this.snapshot().list

  /** How the listing went. */
  readonly testsStatus = (): TestsStatus => this.snapshot().status

  /** Stops the feed subscription the current run started, or `null`. */
  private stopWatching: (() => void) | null = null

  /** The host callback the current subscription reads (React's effect dep). */
  private watched: ChatInnerProps['watchTestRuns']

  /** The discovery the last announce ran for (React's `testsDiscoverySeen`). */
  private lastDiscovery: ListTestsHandler | null = null

  /** Subscribes to the controller's snapshot changes for the computed views. */
  constructor() {
    const unsubscribe = this.testsController.subscribe(() => {
      this.snapshot.set(this.testsController.snapshot())
    })
    this.destroyRef.onDestroy(() => {
      this.stopWatching?.()
      this.stopWatching = null
      unsubscribe()
      this.testsController.unmount()
    })
  }

  /** React's mount I/O: the controller mounts, then the feed subscription starts. */
  /** React's mount I/O: each effect's mount run happens at its own ledger position. */
  mount(): void {
    // Effects 1 and 2 perform the region's mount work (the controller mount and
    // the run-feed subscription) on their first runs.
  }

  /** Loads the project's tests through the host's lister (React's `loadTests`). */
  readonly loadTests = (list: ListTestsHandler): Promise<void> =>
    this.testsController.loadTests(list)

  /** Re-reads the project's tests through the host's discovery (React's `refreshTests`). */
  readonly refreshTests = (): Promise<void> =>
    this.testsController.refreshTests({
      listTests: this.state.props().listTests,
      testsAvailable: this.state.props().testsAvailable,
    })

  /** Runs a selection, with the host's runner, permissions and translator. */
  readonly startTestsRun = (selection: TestSelection): void => {
    const props = this.state.props()
    this.testsController.startTestsRun(selection, {
      listTests: props.listTests,
      runTests: props.runTests,
      canRunTests: props.canRunTests,
      canEdit: props.canEdit,
      testsAvailable: props.testsAvailable,
      translate: this.state.env.t,
    })
  }

  /** Stops this panel's own run. */
  readonly cancelTestsRun = (): void => {
    this.testsController.cancelTestsRun()
  }

  /** Skips the command the run is on, leaving the run itself alive. */
  readonly skipCurrentTest = (): void => {
    this.testsController.skipCurrentTest({
      canEdit: this.state.props().canEdit,
      canRunTests: this.state.props().canRunTests,
    })
  }

  /** Hands the failures to the agent as ONE ordinary user message. */
  readonly fixTests = (failures: TestFailure[]): void => {
    const props = this.state.props()
    this.testsController.fixTests(failures, {
      canEdit: props.canEdit,
      closeOverlay: () => {
        this.state.slice(ChatOverlay).setPanelOverlay(null)
      },
      sendMessage: this.state.slice(ChatChat).sendLatestMessage,
    })
  }

  /** Opens the `/test` browser, re-listing so a spec just written shows up. */
  readonly openTestsBrowser = (query = '', runAll = false): void => {
    this.state.slice(ChatOverlay).openPanelOverlay('tests', query)
    void this.refreshTests().then(() => {
      if (runAll && this.testsController.isMounted()) this.startTestsRun({ kind: 'all' })
    })
  }

  /** Skips the executor's in-flight tool call WITHOUT ending the turn. */
  readonly handleSkipToolCall = (toolCallId: string): Promise<boolean | void> =>
    this.testsController.handleSkipToolCall(toolCallId, {
      canEdit: this.state.props().canEdit,
      skipToolCall: this.state.props().skipToolCall,
    })

  /** React's `#effect chat:tests:<n>` ledger, registered at its positions. */
  readonly effects = {
    1: (): void => {
      registerChatEffect(this.injector, () => {
        // React's mount run: connect the shared tests controller (and disable it
        // on a reconnect).
        this.testsController.mount()
      })
    },
    2: (): void => {
      registerChatEffect(this.injector, () => {
        // Track the host callback (React's effect dependency) before the guard.
        this.watchRuns()
      })
    },
  }

  /**
   * Creates the controller with the panel's live turn check and logger, the way
   * React constructs it on its first render.
   *
   * @returns The controller instance.
   */
  private createController(): ChatTestsController {
    return new ChatTestsController({
      isTurnInFlight: (): boolean => {
        const chat = this.state.slice(ChatChat)
        return chat.isLoading() || chat.isRemoteStreaming()
      },
      warn: (message, context): void => {
        logger.warn(message, context)
      },
    })
  }

  /**
   * Subscribes to the project's run feed, re-subscribing only when the host's
   * callback identity changes — the way React's effect dependency does.
   */
  private watchRuns(): void {
    const watch = this.state.props().watchTestRuns
    if (this.stopWatching && this.watched === watch) return
    this.stopWatching?.()
    this.watched = watch
    this.stopWatching = this.testsController.watchRuns(watch, () => {
      void this.refreshTests()
    })
  }
}
