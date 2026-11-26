/**
 * React's `ChatInner` (ChatPanel.tsx lines 2171–11138): the inner chat surface,
 * split into the per-concern slices and per-section components the port plans.
 *
 * This skeleton owns the wiring only:
 *
 * - it provides the shared {@link ChatInnerState} and one slice per React
 *   `// #region chat:<slice>`, in React's effect order;
 * - in `ngAfterViewInit` — which Angular runs child-before-parent, the order
 *   React's effects use — it calls each slice's `mount()` in React's mount
 *   ledger order (a slice with effects mounts at its first effect, the only
 *   place React runs mount I/O; a slice without effects mounts at its first
 *   region), and proves the child-before-parent order in the unit test;
 * - it registers every `// #effect chat:<slice>:<n>` at the position its
 *   marker gives it, in React's line order, through the owning slice's
 *   `effects.<n>()`.
 *
 * The root element (React's root `<div>` at line 7454) is rendered here with
 * React's inline layout and drag handlers; every other piece is a section
 * component rendered in React's render order. Each slice and section is a stub
 * whose actions report `notPorted(<slice>.<fn>)` until its unit lands.
 *
 * @module
 */

import type { AfterViewInit, OnChanges, TemplateRef } from '@angular/core'
import { Component, inject } from '@angular/core'

import { DEFAULT_AGENT_NAME, DEFAULT_PRODUCT_NAME } from '@molecule/app-angular'
import type { CommandDef } from '@molecule/app-ide-panel-logic'
import { styleText } from '@molecule/app-ui-angular'

import { ChatActivity } from './chat-activity.slice.js'
import { ChatAttachments } from './chat-attachments.slice.js'
import { ChatAutoCommit } from './chat-auto-commit.slice.js'
import { ChatAutoFix } from './chat-auto-fix.slice.js'
import { ChatAutoFixBanner } from './chat-auto-fix-banner.component.js'
import { ChatAutoSend } from './chat-auto-send.slice.js'
import { ChatChat } from './chat-chat.slice.js'
import { ChatCommands } from './chat-commands.slice.js'
import { ChatComposer } from './chat-composer.slice.js'
import { ChatContextUsage } from './chat-context-usage.slice.js'
import { ChatDragOverlay } from './chat-drag-overlay.component.js'
import { ChatEnv } from './chat-env.slice.js'
import { ChatGit } from './chat-git.slice.js'
import type { ChatInnerProps, ChatNativeTests } from './chat-inner-state.js'
import { ChatInnerState } from './chat-inner-state.js'
import { ChatInput } from './chat-input.slice.js'
import { ChatInputArea } from './chat-input-area.component.js'
import { ChatKeyboard } from './chat-keyboard.slice.js'
import { ChatMention } from './chat-mention.slice.js'
import { ChatMessages } from './chat-messages.component.js'
import { ChatModelActions } from './chat-model-actions.slice.js'
import { ChatModels } from './chat-models.slice.js'
import { ChatOverlay } from './chat-overlay.slice.js'
import { ChatPickers } from './chat-pickers.slice.js'
import { ChatPopups } from './chat-popups.slice.js'
import { ChatPrefs } from './chat-prefs.slice.js'
import { ChatQueuedEdit } from './chat-queued-edit.slice.js'
import { ChatRenderHandlers } from './chat-render-handlers.slice.js'
import { ChatReportModal } from './chat-report-modal.component.js'
import { ChatRetryBanner } from './chat-retry-banner.component.js'
import { ChatScripts } from './chat-scripts.slice.js'
import { ChatScroll } from './chat-scroll.slice.js'
import { ChatShareModal } from './chat-share-modal.component.js'
import { ChatSignals } from './chat-signals.slice.js'
import { ChatSkills } from './chat-skills.slice.js'
import { ChatSounds } from './chat-sounds.slice.js'
import { ChatStream } from './chat-stream.slice.js'
import { ChatSubmit } from './chat-submit.slice.js'
import { ChatSystemCards } from './chat-system-cards.slice.js'
import { ChatTests } from './chat-tests.slice.js'
import { ChatTestsBar } from './chat-tests-bar.slice.js'
import { ChatTimeline } from './chat-timeline.slice.js'
import { ChatTips } from './chat-tips.slice.js'
import { ChatUndo } from './chat-undo.slice.js'
import { ChatVoice } from './chat-voice.slice.js'

/** The root `<div>`'s inline layout (React's inline style at line 7455). */
const ROOT_STYLE = styleText({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0,
  overflow: 'hidden',
  position: 'relative',
})

/**
 * The inner chat surface, remounted per conversation by the outer
 * `ChatPanel`'s `@for` (React's `key={chatKey}`). The host `<div>` is React's
 * own root element, so the port adds no node.
 */
@Component({
  selector: 'div[mol-chat-inner]',
  standalone: true,
  imports: [
    ChatAutoFixBanner,
    ChatDragOverlay,
    ChatInputArea,
    ChatMessages,
    ChatReportModal,
    ChatRetryBanner,
    ChatShareModal,
  ],
  providers: [
    ChatInnerState,
    ChatEnv,
    ChatStream,
    ChatContextUsage,
    ChatAutoFix,
    ChatAutoCommit,
    ChatChat,
    ChatGit,
    ChatScroll,
    ChatUndo,
    ChatComposer,
    ChatPopups,
    ChatSounds,
    ChatOverlay,
    ChatVoice,
    ChatSystemCards,
    ChatActivity,
    ChatTips,
    ChatPrefs,
    ChatTests,
    ChatSkills,
    ChatModels,
    ChatQueuedEdit,
    ChatAutoSend,
    ChatTestsBar,
    ChatMention,
    ChatAttachments,
    ChatScripts,
    ChatInput,
    ChatModelActions,
    ChatCommands,
    ChatSubmit,
    ChatSignals,
    ChatPickers,
    ChatKeyboard,
    ChatTimeline,
    ChatRenderHandlers,
  ],
  inputs: [
    'projectId',
    'endpoint',
    'initialMessage',
    'onInitialMessageSent',
    'isPro',
    'isAnonymous',
    'canEdit',
    'canSendTeamMessages',
    'canShare',
    'shareLinksAllowed',
    'shareLinksRefreshSignal',
    'shareModalContent',
    'buildUpgradeCta',
    'buildHelpUpgradeSection',
    'activeFile',
    'openTabs',
    'onFileOpen',
    'onFileDoubleClick',
    'onFileDiff',
    'onFileRevert',
    'onFileChange',
    'onFileDeleted',
    'onCommit',
    'onConversationId',
    'onActivityClick',
    'onRenderError',
    'onProfileClick',
    'currentUserId',
    'onReadyToBuild',
    'awaitingSandboxBoot',
    'onClientAction',
    'onTurnComplete',
    'onLoadingChange',
    'onNavigatePreview',
    'onRegisterPushHandler',
    'onRegisterHistoryReconcile',
    'autoSubmitSignal',
    'openSettingsSignal',
    'onManageCustomModels',
    'modelSelectionSignal',
    'openReportSignal',
    'openShareSignal',
    'initialInputValue',
    'pendingMessage',
    'pendingMessageKey',
    'pendingMessageSuppressUser',
    'pendingMessageUserInitiated',
    'userEditedFile',
    'userEditedFileKey',
    'gitStatusTick',
    'discovery',
    'userAvatar',
    'agentName',
    'productName',
    'version',
    'extraCommands',
    'feedbackUrl',
    'listTests',
    'runTests',
    'watchTestRuns',
    'nativeTests',
    'canRunTests',
    'testsAvailable',
    'skipToolCall',
  ],
  host: {
    '[attr.style]': 'rootStyle',
    '(dragenter)': 'attachments.handleDragEnter($event)',
    '(dragover)': 'attachments.handleDragOver($event)',
    '(dragleave)': 'attachments.handleDragLeave($event)',
    '(drop)': 'attachments.handleDrop($event)',
  },
  // prettier-ignore
  template: `<div mol-chat-drag-overlay></div><div mol-chat-messages></div><div mol-chat-auto-fix-banner></div><div mol-chat-retry-banner></div><div mol-chat-input-area></div><div mol-chat-report-modal></div><div mol-chat-share-modal></div>`,
})
export class ChatInner implements OnChanges, AfterViewInit {
  /** The project the conversation belongs to (React's `projectId`). */
  projectId = ''

  /** The chat endpoint, carrying `?conversationId=` when a conversation is open. */
  endpoint = ''

  /** Auto-send this message once on mount. */
  initialMessage?: string

  /** Called after the initial message has been sent. */
  onInitialMessageSent?: () => void

  /** Whether the user has a paid plan. */
  isPro?: boolean

  /** Whether the viewer is anonymous. */
  isAnonymous?: boolean

  /** Whether the user may write shared project state. */
  canEdit?: boolean

  /** Whether team messages are allowed (React's default `true`). */
  canSendTeamMessages = true

  /** Whether the user may manage public share links. */
  canShare?: boolean

  /** Whether the share dialog shows its links. */
  shareLinksAllowed?: boolean

  /** Re-fetches the share dialog's links. */
  shareLinksRefreshSignal?: number

  /** Host sections inside the share dialog. */
  shareModalContent?: TemplateRef<unknown>

  /** Host-supplied upgrade/sign-in CTA builder. */
  buildUpgradeCta?: ChatInnerProps['buildUpgradeCta']

  /** Host-supplied `/help` upgrade section builder. */
  buildHelpUpgradeSection?: ChatInnerProps['buildHelpUpgradeSection']

  /** Path of the currently focused file in the editor. */
  activeFile?: string | null

  /** Paths of all open editor tabs. */
  openTabs?: string[]

  /** Opens a file as a preview tab. */
  onFileOpen?: ChatInnerProps['onFileOpen']

  /** Pins a tab when a filename in a tool call is double-clicked. */
  onFileDoubleClick?: ChatInnerProps['onFileDoubleClick']

  /** Opens a changed file's diff view. */
  onFileDiff?: ChatInnerProps['onFileDiff']

  /** Undoes or redoes a file change by writing the given content. */
  onFileRevert?: ChatInnerProps['onFileRevert']

  /** Called when the AI creates or modifies a file. */
  onFileChange?: ChatInnerProps['onFileChange']

  /** Called when a file is removed from disk. */
  onFileDeleted?: ChatInnerProps['onFileDeleted']

  /** Called after a commit or no-op. */
  onCommit?: () => void

  /** Called whenever the active conversation id changes. */
  onConversationId?: (id: string) => void

  /** Called when an inline activity card is clicked. */
  onActivityClick?: ChatInnerProps['onActivityClick']

  /** Reports a timeline item that threw during render. */
  onRenderError?: ChatInnerProps['onRenderError']

  /** Called when a user avatar or author name in the timeline is clicked. */
  onProfileClick?: ChatInnerProps['onProfileClick']

  /** The signed-in user's id. */
  currentUserId?: string

  /** Called on the `ready_to_build` stream event. */
  onReadyToBuild?: () => void

  /** True after the plan streams while the sandbox is still booting. */
  awaitingSandboxBoot?: boolean

  /** Called on the `client_action` stream event. */
  onClientAction?: ChatInnerProps['onClientAction']

  /** Called on each stream done/error. */
  onTurnComplete?: () => void

  /** Called when the chat's loading state changes. */
  onLoadingChange?: (loading: boolean) => void

  /** Navigates the preview to a route path on a chat link click. */
  onNavigatePreview?: (path: string) => void

  /** Registers the broadcast-chat-event handler with the host. */
  onRegisterPushHandler?: ChatInnerProps['onRegisterPushHandler']

  /** Registers the history reconcile with the host. */
  onRegisterHistoryReconcile?: ChatInnerProps['onRegisterHistoryReconcile']

  /** Changing this value submits the current input draft. */
  autoSubmitSignal?: number

  /** Changing this value opens the `/settings` view. */
  openSettingsSignal?: number

  /** Shows a "manage your own models" row in the `/model` picker. */
  onManageCustomModels?: ChatInnerProps['onManageCustomModels']

  /** Bump to re-read persisted model/settings. */
  modelSelectionSignal?: number

  /** Changing this value opens the `/report` bug-report modal. */
  openReportSignal?: number

  /** Changing this value opens the `/share` link modal. */
  openShareSignal?: number

  /** Seeds the input with this text on mount. */
  initialInputValue?: string

  /** Message to auto-send when `pendingMessageKey` changes. */
  pendingMessage?: string

  /** Incremented to trigger sending `pendingMessage`. */
  pendingMessageKey?: number

  /** Sends the pending message on the user's behalf without a user bubble. */
  pendingMessageSuppressUser?: boolean

  /** Marks the pending message as directly user-requested. */
  pendingMessageUserInitiated?: boolean

  /** File path the user just edited in the editor. */
  userEditedFile?: string

  /** Incremented to trigger the user-edit check. */
  userEditedFileKey?: number

  /** Incremented to trigger a git status refresh. */
  gitStatusTick?: number

  /** True during the initial discovery phase. */
  discovery?: boolean

  /** The signed-in user's profile avatar. */
  userAvatar?: string | null

  /** Display name of the AI coding agent (React's default `the assistant`). */
  agentName: string = DEFAULT_AGENT_NAME

  /** Display name of the host product / IDE (React's default `the IDE`). */
  productName: string = DEFAULT_PRODUCT_NAME

  /** The host's current app/build version. */
  version?: string

  /** Host-specific slash commands merged into the menu. */
  extraCommands?: readonly CommandDef[]

  /** Command-menu "Report a problem" URL. */
  feedbackUrl?: string

  /** Lists the project's tests for the Tests bar. */
  listTests?: ChatInnerProps['listTests']

  /** Runs the selected tests, streaming events. */
  runTests?: ChatInnerProps['runTests']

  /** Subscribes to every test run in the project. */
  watchTestRuns?: ChatInnerProps['watchTestRuns']

  /** Host-owned durable native runs in the Tests browser and composer strip. */
  nativeTests?: ChatNativeTests

  /** Whether this viewer may run tests. */
  canRunTests?: boolean

  /** Whether the environment the tests run in is up. */
  testsAvailable?: boolean

  /** Skips the executor's running tool call without ending the turn. */
  skipToolCall?: ChatInnerProps['skipToolCall']

  /** The root element's inline layout (React's inline style). */
  protected readonly rootStyle = ROOT_STYLE

  /** The shared state every slice and section reads. */
  private readonly state = inject(ChatInnerState)

  /** `chat:env` — the services and derivations every slice reads. */
  private readonly env = inject(ChatEnv)

  private readonly stream = inject(ChatStream)
  private readonly contextUsage = inject(ChatContextUsage)
  private readonly autoFix = inject(ChatAutoFix)
  private readonly autoCommit = inject(ChatAutoCommit)
  private readonly chat = inject(ChatChat)
  private readonly git = inject(ChatGit)
  private readonly scroll = inject(ChatScroll)
  private readonly undo = inject(ChatUndo)
  private readonly composer = inject(ChatComposer)
  private readonly popups = inject(ChatPopups)
  private readonly sounds = inject(ChatSounds)
  private readonly overlay = inject(ChatOverlay)
  private readonly voice = inject(ChatVoice)
  private readonly systemCards = inject(ChatSystemCards)
  private readonly activity = inject(ChatActivity)
  private readonly tips = inject(ChatTips)
  private readonly prefs = inject(ChatPrefs)
  private readonly tests = inject(ChatTests)
  private readonly skills = inject(ChatSkills)
  private readonly models = inject(ChatModels)
  private readonly queuedEdit = inject(ChatQueuedEdit)
  private readonly autoSend = inject(ChatAutoSend)
  private readonly testsBar = inject(ChatTestsBar)
  private readonly mention = inject(ChatMention)

  /** The attachments slice — its drag handlers are bound on the root element. */
  protected readonly attachments = inject(ChatAttachments)

  private readonly scripts = inject(ChatScripts)
  private readonly input = inject(ChatInput)
  private readonly modelActions = inject(ChatModelActions)
  private readonly commands = inject(ChatCommands)
  private readonly submit = inject(ChatSubmit)
  private readonly signals = inject(ChatSignals)
  private readonly pickers = inject(ChatPickers)
  private readonly keyboard = inject(ChatKeyboard)
  private readonly timeline = inject(ChatTimeline)
  private readonly renderHandlers = inject(ChatRenderHandlers)

  /**
   * Publishes the current inputs to the shared state (Angular calls this once
   * before `ngOnInit`, then on every bound change).
   */
  ngOnChanges(): void {
    this.state.props.set(this.collectProps())
  }

  /**
   * Registers React's effect ledger in marker order (the `#effect` positions
   * are React's own `useEffect` order). A slice with scattered regions exposes
   * `effects.<n>()`, so each effect is created where React declares it.
   */
  constructor() {
    this.state.env = this.env

    this.env.effects[1]()

    this.contextUsage.effects[1]()

    this.autoFix.effects[1]()
    this.autoFix.effects[2]()

    this.chat.effects[1]()

    this.composer.effects[1]()
    this.composer.effects[2]()

    this.voice.effects[1]()
    this.voice.effects[2]()
    this.voice.effects[3]()

    this.systemCards.effects[1]()
    this.systemCards.effects[2]()
    this.systemCards.effects[3]()

    this.activity.effects[1]()
    this.activity.effects[2]()

    this.tips.effects[1]()
    this.tips.effects[2]()
    this.tips.effects[3]()
    this.tips.effects[4]()

    this.sounds.effects[1]()

    this.tests.effects[1]()
    this.tests.effects[2]()

    this.sounds.effects[2]()

    this.models.effects[2]()
    this.models.effects[3]()

    this.autoCommit.effects[1]()

    this.models.effects[4]()

    this.queuedEdit.effects[1]()

    this.scroll.effects[1]()
    this.scroll.effects[2]()

    this.git.effects[1]()
    this.git.effects[2]()
    this.git.effects[3]()
    this.git.effects[4]()

    this.autoCommit.effects[2]()
    this.autoCommit.effects[3]()

    this.testsBar.effects[1]()

    this.scroll.effects[3]()
    this.scroll.effects[4]()
    this.scroll.effects[5]()

    this.autoSend.effects[1]()
    this.autoSend.effects[2]()
    this.autoSend.effects[3]()
    this.autoSend.effects[4]()

    this.mention.effects[1]()

    this.skills.effects[1]()

    this.input.effects[1]()

    this.signals.effects[1]()
    this.signals.effects[2]()
    this.signals.effects[3]()
    this.signals.effects[4]()

    this.pickers.effects[2]()

    this.keyboard.effects[1]()

    this.timeline.effects[1]()
  }

  /**
   * Mount I/O: Angular runs a child's `ngAfterViewInit` before its parent's,
   * which is React's child-effects-before-parent order. Slices mount in React's
   * mount ledger order — a slice at its first effect when it has one (mount I/O
   * only exists inside effects), else at its first region.
   */
  ngAfterViewInit(): void {
    this.env.mount()
    this.stream.mount()
    this.contextUsage.mount()
    this.autoFix.mount()
    this.chat.mount()
    this.undo.mount()
    this.composer.mount()
    this.popups.mount()
    this.voice.mount()
    this.systemCards.mount()
    this.activity.mount()
    this.tips.mount()
    this.sounds.mount()
    this.prefs.mount()
    this.tests.mount()
    this.models.mount()
    this.autoCommit.mount()
    this.queuedEdit.mount()
    this.scroll.mount()
    this.git.mount()
    this.testsBar.mount()
    this.autoSend.mount()
    this.mention.mount()
    this.attachments.mount()
    this.skills.mount()
    this.scripts.mount()
    this.input.mount()
    this.modelActions.mount()
    this.commands.mount()
    this.submit.mount()
    this.signals.mount()
    this.pickers.mount()
    this.keyboard.mount()
    this.timeline.mount()
    this.renderHandlers.mount()
  }

  /**
   * Snapshots the component's inputs into the shared state.
   * @returns Every input in React's `ChatInnerProps` shape.
   */
  private collectProps(): ChatInnerProps {
    return {
      projectId: this.projectId,
      endpoint: this.endpoint,
      initialMessage: this.initialMessage,
      onInitialMessageSent: this.onInitialMessageSent,
      isPro: this.isPro,
      isAnonymous: this.isAnonymous,
      canEdit: this.canEdit,
      canSendTeamMessages: this.canSendTeamMessages,
      canShare: this.canShare,
      shareLinksAllowed: this.shareLinksAllowed,
      shareLinksRefreshSignal: this.shareLinksRefreshSignal,
      shareModalContent: this.shareModalContent,
      buildUpgradeCta: this.buildUpgradeCta,
      buildHelpUpgradeSection: this.buildHelpUpgradeSection,
      activeFile: this.activeFile,
      openTabs: this.openTabs,
      onFileOpen: this.onFileOpen,
      onFileDoubleClick: this.onFileDoubleClick,
      onFileDiff: this.onFileDiff,
      onFileRevert: this.onFileRevert,
      onFileChange: this.onFileChange,
      onFileDeleted: this.onFileDeleted,
      onCommit: this.onCommit,
      onConversationId: this.onConversationId,
      onActivityClick: this.onActivityClick,
      onRenderError: this.onRenderError,
      onProfileClick: this.onProfileClick,
      currentUserId: this.currentUserId,
      onReadyToBuild: this.onReadyToBuild,
      awaitingSandboxBoot: this.awaitingSandboxBoot,
      onClientAction: this.onClientAction,
      onTurnComplete: this.onTurnComplete,
      onLoadingChange: this.onLoadingChange,
      onNavigatePreview: this.onNavigatePreview,
      onRegisterPushHandler: this.onRegisterPushHandler,
      onRegisterHistoryReconcile: this.onRegisterHistoryReconcile,
      autoSubmitSignal: this.autoSubmitSignal,
      openSettingsSignal: this.openSettingsSignal,
      onManageCustomModels: this.onManageCustomModels,
      modelSelectionSignal: this.modelSelectionSignal,
      openReportSignal: this.openReportSignal,
      openShareSignal: this.openShareSignal,
      initialInputValue: this.initialInputValue,
      pendingMessage: this.pendingMessage,
      pendingMessageKey: this.pendingMessageKey,
      pendingMessageSuppressUser: this.pendingMessageSuppressUser,
      pendingMessageUserInitiated: this.pendingMessageUserInitiated,
      userEditedFile: this.userEditedFile,
      userEditedFileKey: this.userEditedFileKey,
      gitStatusTick: this.gitStatusTick,
      discovery: this.discovery,
      userAvatar: this.userAvatar,
      agentName: this.agentName,
      productName: this.productName,
      version: this.version,
      extraCommands: this.extraCommands,
      feedbackUrl: this.feedbackUrl,
      listTests: this.listTests,
      runTests: this.runTests,
      watchTestRuns: this.watchTestRuns,
      nativeTests: this.nativeTests,
      canRunTests: this.canRunTests,
      testsAvailable: this.testsAvailable,
      skipToolCall: this.skipToolCall,
    }
  }
}
