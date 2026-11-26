/**
 * The inner chat surface — the Vue counterpart of `@molecule/app-ide-react`'s
 * `ChatInner`, built as the port's skeleton.
 *
 * The React component is one function of ~9,700 lines. Here it is a context
 * built in the ORDER React declares its `// #region chat:<slice>` markers, plus
 * one render tree walked in React's JSX order. Every slice is created at its
 * first region and every `// #effect chat:<slice>:<n>` is registered at the
 * position its marker gives it, because React's effects run in hook order and
 * that order is observable (the requests, the storage reads, the callbacks).
 * Slices and sections stand in as stubs until the unit that owns them lands;
 * see `not-ported.ts`.
 *
 * Vue runs a child's `onMounted` hooks before its parent's, which is what lets
 * the outer `ChatPanel`'s mount work (the conversation list) run after this
 * component's, as React's child effects do. `ChatPanel`'s mount effect is
 * registered through `onMounted`; nothing here (or there) runs its work during
 * setup, where it would land BEFORE the children exist and reverse React's
 * order.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNodeChild } from 'vue'

import { DEFAULT_AGENT_NAME, DEFAULT_PRODUCT_NAME } from '@molecule/app-vue'

import type { ChatCtx, ChatInnerProps } from './context.js'
import { renderChatAutoFixBanner } from './render-chat-auto-fix-banner.js'
import { renderChatDragOverlay } from './render-chat-drag-overlay.js'
import { renderChatInputArea } from './render-chat-input-area.js'
import { renderChatMessages } from './render-chat-messages.js'
import { renderChatReportModal } from './render-chat-report-modal.js'
import { renderChatRetryBanner } from './render-chat-retry-banner.js'
import { renderChatShareModal } from './render-chat-share-modal.js'
import { createChatActivity } from './use-chat-activity.js'
import { createChatAttachments } from './use-chat-attachments.js'
import { createChatAutoCommit } from './use-chat-auto-commit.js'
import { createChatAutoFix } from './use-chat-auto-fix.js'
import { createChatAutoSend } from './use-chat-auto-send.js'
import { createChatChat } from './use-chat-chat.js'
import { createChatCommands } from './use-chat-commands.js'
import { createChatComposer } from './use-chat-composer.js'
import { createChatContextUsage } from './use-chat-context-usage.js'
import { createChatEnv } from './use-chat-env.js'
import { createChatGit } from './use-chat-git.js'
import { createChatInput } from './use-chat-input.js'
import { createChatKeyboard } from './use-chat-keyboard.js'
import { createChatMention } from './use-chat-mention.js'
import { createChatModelActions } from './use-chat-model-actions.js'
import { createChatModels } from './use-chat-models.js'
import { createChatOverlay } from './use-chat-overlay.js'
import { createChatPickers } from './use-chat-pickers.js'
import { createChatPopups } from './use-chat-popups.js'
import { createChatPrefs } from './use-chat-prefs.js'
import { createChatQueuedEdit } from './use-chat-queued-edit.js'
import { createChatRenderHandlers } from './use-chat-render-handlers.js'
import { createChatScripts } from './use-chat-scripts.js'
import { createChatScroll } from './use-chat-scroll.js'
import { createChatSignals } from './use-chat-signals.js'
import { createChatSkills } from './use-chat-skills.js'
import { createChatSounds } from './use-chat-sounds.js'
import { createChatStream } from './use-chat-stream.js'
import { createChatSubmit } from './use-chat-submit.js'
import { createChatSystemCards } from './use-chat-system-cards.js'
import { createChatTests } from './use-chat-tests.js'
import { createChatTestsBar } from './use-chat-tests-bar.js'
import { createChatTimeline } from './use-chat-timeline.js'
import { createChatTips } from './use-chat-tips.js'
import { createChatUndo } from './use-chat-undo.js'
import { createChatVoice } from './use-chat-voice.js'

/**
 * The inner chat surface: the timeline, the composer and every panel-level
 * behaviour around them, remounted per conversation by the outer panel's
 * `key`.
 */
export const ChatInner = defineComponent({
  name: 'ChatInner',
  props: {
    /** The project the conversation belongs to. */
    projectId: { type: String, required: true },
    /** The chat endpoint (already carries `?conversationId=` when there is one). */
    endpoint: { type: String, required: true },
    /** A message to send once on mount. */
    initialMessage: { type: String, default: undefined },
    /** Called after the initial message was dispatched. */
    onInitialMessageSent: { type: Function as PropType<() => void>, default: undefined },
    /** Whether the viewer is on a paid plan. */
    isPro: { type: Boolean as PropType<boolean | undefined>, default: undefined },
    /** Whether the viewer is anonymous. */
    isAnonymous: { type: Boolean as PropType<boolean | undefined>, default: undefined },
    /** Whether the viewer may write shared project state. */
    canEdit: { type: Boolean as PropType<boolean | undefined>, default: undefined },
    /** Whether team-only side-channel messages are allowed (React's default `true`). */
    canSendTeamMessages: { type: Boolean as PropType<boolean | undefined>, default: true },
    /** Whether the viewer may manage public share links. */
    canShare: { type: Boolean as PropType<boolean | undefined>, default: undefined },
    /** Whether the share dialog shows its links. */
    shareLinksAllowed: { type: Boolean as PropType<boolean | undefined>, default: undefined },
    /** Bumped when another client changed the links. */
    shareLinksRefreshSignal: { type: Number, default: undefined },
    /** Host sections rendered inside the share dialog. */
    shareModalContent: { type: [Object, Array] as PropType<VNodeChild>, default: undefined },
    /** Host-supplied upgrade / sign-in CTA builder. */
    buildUpgradeCta: {
      type: Function as PropType<ChatInnerProps['buildUpgradeCta']>,
      default: undefined,
    },
    /** Host-supplied `/help` upgrade section builder. */
    buildHelpUpgradeSection: {
      type: Function as PropType<ChatInnerProps['buildHelpUpgradeSection']>,
      default: undefined,
    },
    /** The focused editor file. */
    activeFile: { type: String as PropType<string | null>, default: undefined },
    /** The open editor tabs. */
    openTabs: { type: Array as PropType<string[]>, default: undefined },
    /** Opens a file as a preview tab. */
    onFileOpen: { type: Function as PropType<ChatInnerProps['onFileOpen']>, default: undefined },
    /** Pins a file's tab. */
    onFileDoubleClick: {
      type: Function as PropType<ChatInnerProps['onFileDoubleClick']>,
      default: undefined,
    },
    /** Opens a changed file's diff. */
    onFileDiff: { type: Function as PropType<ChatInnerProps['onFileDiff']>, default: undefined },
    /** Writes a file back. */
    onFileRevert: {
      type: Function as PropType<ChatInnerProps['onFileRevert']>,
      default: undefined,
    },
    /** Reports that the agent created or modified a file. */
    onFileChange: {
      type: Function as PropType<ChatInnerProps['onFileChange']>,
      default: undefined,
    },
    /** Reports that a file was removed. */
    onFileDeleted: {
      type: Function as PropType<ChatInnerProps['onFileDeleted']>,
      default: undefined,
    },
    /** Called after a commit attempt completes. */
    onCommit: { type: Function as PropType<() => void>, default: undefined },
    /** Reports the active conversation id. */
    onConversationId: {
      type: Function as PropType<ChatInnerProps['onConversationId']>,
      default: undefined,
    },
    /** Called when an inline activity card is clicked. */
    onActivityClick: {
      type: Function as PropType<ChatInnerProps['onActivityClick']>,
      default: undefined,
    },
    /** Reports a timeline item that threw. */
    onRenderError: {
      type: Function as PropType<ChatInnerProps['onRenderError']>,
      default: undefined,
    },
    /** Called when a timeline avatar or author name is clicked. */
    onProfileClick: {
      type: Function as PropType<ChatInnerProps['onProfileClick']>,
      default: undefined,
    },
    /** The signed-in user's id. */
    currentUserId: { type: String, default: undefined },
    /** Called on `ready_to_build`. */
    onReadyToBuild: { type: Function as PropType<() => void>, default: undefined },
    /** True after the plan streams but while the sandbox is still booting. */
    awaitingSandboxBoot: {
      type: Boolean as PropType<boolean | undefined>,
      default: undefined,
    },
    /** Called on `client_action`. */
    onClientAction: {
      type: Function as PropType<ChatInnerProps['onClientAction']>,
      default: undefined,
    },
    /** Called on each stream done. */
    onTurnComplete: { type: Function as PropType<() => void>, default: undefined },
    /** Reports the chat's loading state. */
    onLoadingChange: {
      type: Function as PropType<ChatInnerProps['onLoadingChange']>,
      default: undefined,
    },
    /** Navigates the preview to a route on a chat link click. */
    onNavigatePreview: {
      type: Function as PropType<ChatInnerProps['onNavigatePreview']>,
      default: undefined,
    },
    /** Registers the host's broadcast-chat handler. */
    onRegisterPushHandler: {
      type: Function as PropType<ChatInnerProps['onRegisterPushHandler']>,
      default: undefined,
    },
    /** Registers the host's history reconcile. */
    onRegisterHistoryReconcile: {
      type: Function as PropType<ChatInnerProps['onRegisterHistoryReconcile']>,
      default: undefined,
    },
    /** Changing this submits the current input draft. */
    autoSubmitSignal: { type: Number, default: undefined },
    /** Changing this opens the `/settings` view. */
    openSettingsSignal: { type: Number, default: undefined },
    /** Shows a "manage your own models" row in the `/model` picker. */
    onManageCustomModels: {
      type: Function as PropType<ChatInnerProps['onManageCustomModels']>,
      default: undefined,
    },
    /** Bump to re-read persisted model / settings state. */
    modelSelectionSignal: { type: Number, default: undefined },
    /** Changing this opens the `/report` modal. */
    openReportSignal: { type: Number, default: undefined },
    /** Changing this opens the `/share` modal. */
    openShareSignal: { type: Number, default: undefined },
    /** Seeds the input with this text on mount. */
    initialInputValue: { type: String, default: undefined },
    /** A message to send when `pendingMessageKey` changes. */
    pendingMessage: { type: String, default: undefined },
    /** Incremented to send `pendingMessage`. */
    pendingMessageKey: { type: Number, default: undefined },
    /** Suppresses the user bubble for the pending message. */
    pendingMessageSuppressUser: {
      type: Boolean as PropType<boolean | undefined>,
      default: undefined,
    },
    /** Marks the pending message as user-initiated. */
    pendingMessageUserInitiated: {
      type: Boolean as PropType<boolean | undefined>,
      default: undefined,
    },
    /** The file the user just edited. */
    userEditedFile: { type: String, default: undefined },
    /** Incremented to trigger the user-edit check. */
    userEditedFileKey: { type: Number, default: undefined },
    /** Incremented by the host to refresh git status. */
    gitStatusTick: { type: Number, default: undefined },
    /** True during the initial discovery phase. */
    discovery: { type: Boolean as PropType<boolean | undefined>, default: undefined },
    /** The signed-in user's avatar. */
    userAvatar: { type: String as PropType<string | null>, default: undefined },
    /** The agent's display name (React's default `the assistant`). */
    agentName: { type: String, default: DEFAULT_AGENT_NAME },
    /** The host product's display name (React's default `the IDE`). */
    productName: { type: String, default: DEFAULT_PRODUCT_NAME },
    /** The host's build version. */
    version: { type: String, default: undefined },
    /** Host-specific slash commands merged into the menu. */
    extraCommands: {
      type: Array as PropType<ChatInnerProps['extraCommands']>,
      default: undefined,
    },
    /** The command-menu "Report a problem" URL. */
    feedbackUrl: { type: String, default: undefined },
    /** Lists the project's tests. */
    listTests: { type: Function as PropType<ChatInnerProps['listTests']>, default: undefined },
    /** Runs the selected tests. */
    runTests: { type: Function as PropType<ChatInnerProps['runTests']>, default: undefined },
    /** Subscribes to every test run. */
    watchTestRuns: {
      type: Function as PropType<ChatInnerProps['watchTestRuns']>,
      default: undefined,
    },
    /** Host-owned durable native runs. */
    nativeTests: { type: Object as PropType<ChatInnerProps['nativeTests']>, default: undefined },
    /** Whether this viewer may run tests. */
    canRunTests: { type: Boolean as PropType<boolean | undefined>, default: undefined },
    /** Whether the environment the tests run in is up. */
    testsAvailable: { type: Boolean as PropType<boolean | undefined>, default: undefined },
    /** Skips the executor's in-flight tool call. */
    skipToolCall: {
      type: Function as PropType<ChatInnerProps['skipToolCall']>,
      default: undefined,
    },
  },
  setup(props) {
    // The context every slice and section reads. Built in place in React's
    // region order; each slice resolves the others through it at call time, so
    // the cycles React's own regions have (submit → commands → submit, the
    // stream → auto-fix / auto-commit / sounds / activity, the timeline → the
    // cards) stay cycles here too.
    const env = createChatEnv(props)
    const ctx = { props, env } as ChatCtx

    // ── chat:env ────────────────────────────────────────────────────────────
    ctx.env.effects[1]()

    // ── chat:stream (region 1 of 2) ────────────────────────────────────────
    ctx.stream = createChatStream(ctx)

    // ── chat:context-usage ─────────────────────────────────────────────────
    ctx.contextUsage = createChatContextUsage(ctx)
    ctx.contextUsage.effects[1]()

    // ── chat:auto-fix (region 1 of 2) ──────────────────────────────────────
    ctx.autoFix = createChatAutoFix(ctx)
    ctx.autoFix.effects[1]()

    // ── chat:stream (region 2 of 2) ────────────────────────────────────────
    // (the region declares the stream branch handlers; the slice already exists)

    // ── chat:auto-fix (region 2 of 2) ──────────────────────────────────────
    ctx.autoFix.effects[2]()

    // ── chat:auto-commit (region 1 of 4) ───────────────────────────────────
    ctx.autoCommit = createChatAutoCommit(ctx)

    // ── chat:chat ──────────────────────────────────────────────────────────
    ctx.chat = createChatChat(ctx)
    ctx.chat.effects[1]()

    // ── chat:git (region 1 of 4) ───────────────────────────────────────────
    ctx.git = createChatGit(ctx)

    // ── chat:scroll (region 1 of 3) ────────────────────────────────────────
    ctx.scroll = createChatScroll(ctx)

    // ── chat:undo ──────────────────────────────────────────────────────────
    ctx.undo = createChatUndo(ctx)

    // ── chat:composer ──────────────────────────────────────────────────────
    ctx.composer = createChatComposer(ctx)
    ctx.composer.effects[1]()
    ctx.composer.effects[2]()

    // ── chat:popups ────────────────────────────────────────────────────────
    ctx.popups = createChatPopups(ctx)

    // ── chat:sounds (region 1 of 3) ────────────────────────────────────────
    ctx.sounds = createChatSounds(ctx)

    // ── chat:overlay (region 1 of 2) ───────────────────────────────────────
    ctx.overlay = createChatOverlay(ctx)

    // ── chat:voice ─────────────────────────────────────────────────────────
    ctx.voice = createChatVoice(ctx)
    ctx.voice.effects[1]()
    ctx.voice.effects[2]()
    ctx.voice.effects[3]()

    // ── chat:system-cards ──────────────────────────────────────────────────
    ctx.systemCards = createChatSystemCards(ctx)
    ctx.systemCards.effects[1]()
    ctx.systemCards.effects[2]()
    ctx.systemCards.effects[3]()

    // ── chat:activity ──────────────────────────────────────────────────────
    ctx.activity = createChatActivity(ctx)
    ctx.activity.effects[1]()
    ctx.activity.effects[2]()

    // ── chat:tips ──────────────────────────────────────────────────────────
    ctx.tips = createChatTips(ctx)
    ctx.tips.effects[1]()
    ctx.tips.effects[2]()
    ctx.tips.effects[3]()
    ctx.tips.effects[4]()

    // ── chat:sounds (region 2 of 3) ────────────────────────────────────────
    ctx.sounds.effects[1]()

    // ── chat:prefs ─────────────────────────────────────────────────────────
    ctx.prefs = createChatPrefs(ctx)

    // ── chat:overlay (region 2 of 2) ───────────────────────────────────────

    // ── chat:tests ─────────────────────────────────────────────────────────
    ctx.tests = createChatTests(ctx)
    ctx.tests.effects[1]()
    ctx.tests.effects[2]()

    // ── chat:sounds (region 3 of 3) ────────────────────────────────────────
    ctx.sounds.effects[2]()

    // ── chat:skills (region 1 of 2) ────────────────────────────────────────
    ctx.skills = createChatSkills(ctx)

    // ── chat:models (region 1 of 2) ────────────────────────────────────────
    ctx.models = createChatModels(ctx)
    ctx.models.effects[2]()
    ctx.models.effects[3]()

    // ── chat:auto-commit (region 2 of 4) ───────────────────────────────────
    ctx.autoCommit.effects[1]()

    // ── chat:models (region 2 of 2) ────────────────────────────────────────
    ctx.models.effects[4]()

    // ── chat:queued-edit ───────────────────────────────────────────────────
    ctx.queuedEdit = createChatQueuedEdit(ctx)
    ctx.queuedEdit.effects[1]()

    // ── chat:auto-send (region 1 of 2) ─────────────────────────────────────
    ctx.autoSend = createChatAutoSend(ctx)

    // ── chat:scroll (region 2 of 3) ────────────────────────────────────────
    ctx.scroll.effects[1]()
    ctx.scroll.effects[2]()

    // ── chat:git (region 2 of 4) ───────────────────────────────────────────
    ctx.git.effects[1]()
    ctx.git.effects[2]()
    ctx.git.effects[3]()
    ctx.git.effects[4]()

    // ── chat:auto-commit (region 3 of 4) ───────────────────────────────────
    ctx.autoCommit.effects[2]()
    ctx.autoCommit.effects[3]()

    // ── chat:tests-bar ─────────────────────────────────────────────────────
    ctx.testsBar = createChatTestsBar(ctx)
    ctx.testsBar.effects[1]()

    // ── chat:git (region 3 of 4) ───────────────────────────────────────────
    // (the region declares the commit actions the render reads)

    // ── chat:scroll (region 3 of 3) ────────────────────────────────────────
    ctx.scroll.effects[3]()
    ctx.scroll.effects[4]()
    ctx.scroll.effects[5]()

    // ── chat:auto-send (region 2 of 2) ─────────────────────────────────────
    ctx.autoSend.effects[1]()
    ctx.autoSend.effects[2]()
    ctx.autoSend.effects[3]()
    ctx.autoSend.effects[4]()

    // ── chat:git (region 4 of 4) ───────────────────────────────────────────
    // (the region declares the commit cards the render reads)

    // ── chat:mention ───────────────────────────────────────────────────────
    ctx.mention = createChatMention(ctx)
    ctx.mention.effects[1]()

    // ── chat:attachments (region 1 of 2) ───────────────────────────────────
    ctx.attachments = createChatAttachments(ctx)

    // ── chat:skills (region 2 of 2) ────────────────────────────────────────
    ctx.skills.effects[1]()

    // ── chat:scripts ───────────────────────────────────────────────────────
    ctx.scripts = createChatScripts(ctx)

    // ── chat:attachments (region 2 of 2) ───────────────────────────────────
    // (the region declares the drag / paste handlers the root and composer attach)

    // ── chat:input ─────────────────────────────────────────────────────────
    ctx.input = createChatInput(ctx)
    ctx.input.effects[1]()

    // ── chat:model-actions ─────────────────────────────────────────────────
    ctx.modelActions = createChatModelActions(ctx)

    // ── chat:commands ──────────────────────────────────────────────────────
    ctx.commands = createChatCommands(ctx)

    // ── chat:auto-commit (region 4 of 4) ───────────────────────────────────
    // (the region declares the commit action the work card renders)

    // ── chat:submit ────────────────────────────────────────────────────────
    ctx.submit = createChatSubmit(ctx)

    // ── chat:signals ───────────────────────────────────────────────────────
    ctx.signals = createChatSignals(ctx)
    ctx.signals.effects[1]()
    ctx.signals.effects[2]()
    ctx.signals.effects[3]()
    ctx.signals.effects[4]()

    // ── chat:pickers ───────────────────────────────────────────────────────
    ctx.pickers = createChatPickers(ctx)
    ctx.pickers.effects[2]()

    // ── chat:keyboard ──────────────────────────────────────────────────────
    ctx.keyboard = createChatKeyboard(ctx)
    ctx.keyboard.effects[1]()

    // ── chat:timeline ──────────────────────────────────────────────────────
    ctx.timeline = createChatTimeline(ctx)
    ctx.timeline.effects[1]()

    // ── chat:render-handlers ───────────────────────────────────────────────
    ctx.renderHandlers = createChatRenderHandlers(ctx)

    /**
     * Renders the chat: the root the drag handlers belong to, and every section
     * in React's render order. Sections nest inside the ones that own their
     * container (`renderChatMessages`, `renderChatInputArea`), so the tree walks
     * exactly as React's JSX does.
     *
     * @returns The chat's element tree.
     */
    return (): VNodeChild =>
      h(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
            position: 'relative',
          },
          onDragenter: (event: DragEvent) => {
            ctx.attachments.handleDragEnter(event)
          },
          onDragover: (event: DragEvent) => {
            ctx.attachments.handleDragOver(event)
          },
          onDragleave: () => {
            ctx.attachments.handleDragLeave()
          },
          onDrop: (event: DragEvent) => {
            ctx.attachments.handleDrop(event)
          },
        },
        [
          renderChatDragOverlay(ctx),
          renderChatMessages(ctx),
          renderChatAutoFixBanner(ctx),
          renderChatRetryBanner(ctx),
          renderChatInputArea(ctx),
          renderChatReportModal(ctx),
          renderChatShareModal(ctx),
        ],
      )
  },
})
