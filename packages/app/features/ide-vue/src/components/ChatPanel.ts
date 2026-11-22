/**
 * AI chat panel — the Vue counterpart of `@molecule/app-ide-react`'s
 * `ChatPanel`.
 *
 * The React panel is the outer shell (the conversation-selector header and the
 * inner chat) around ChatInner. The props are React's own contract, the root
 * and the prop forwarding are React's, the header comes from the outer unit's
 * section, and the inner chat is `ChatInner`, remounted per conversation through
 * `key`, exactly as React remounts it through `key={chatKey}`.
 *
 * The header's conversation state, the picker, the new-chat POST and the two
 * modals live in the header slice (`use-chat-header.ts`) and the modal slots
 * (`render-chat-report-modal.ts`, `render-chat-share-modal.ts`).
 *
 * @module
 */

import { computed, defineComponent, h, type PropType, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { useHttpClient, useTranslation } from '@molecule/app-vue'

import { useCoarsePointer, useNarrowViewport } from '../hooks/useViewport.js'
import { ChatInner } from './chat-panel/ChatInner.js'
import type { ChatPanelCtx, ChatPanelEnv, ChatPanelProps } from './chat-panel/context.js'
import { renderChatHeader } from './chat-panel/render-chat-header.js'
import { createChatHeader } from './chat-panel/use-chat-header.js'

export type { ChatPanelProps } from './chat-panel/context.js'

/**
 * The outer chat panel: the conversation-selector header above the inner chat.
 */
export const ChatPanel = defineComponent({
  name: 'ChatPanel',
  props: {
    /** The project the conversation belongs to. */
    projectId: { type: String, required: true },
    /** The chat endpoint; defaults to `/projects/:id/chat`. */
    endpoint: { type: String, default: undefined },
    /** A message to auto-send once on mount. */
    initialMessage: { type: String, default: undefined },
    /** Called after the initial message was dispatched. */
    onInitialMessageSent: { type: Function as PropType<() => void>, default: undefined },
    /** Opens a file as a preview tab. */
    onFileOpen: { type: Function as PropType<ChatPanelProps['onFileOpen']>, default: undefined },
    /** Pins a file's tab. */
    onFileDoubleClick: {
      type: Function as PropType<ChatPanelProps['onFileDoubleClick']>,
      default: undefined,
    },
    /** Opens a changed file's diff. */
    onFileDiff: { type: Function as PropType<ChatPanelProps['onFileDiff']>, default: undefined },
    /** Writes a file back. */
    onFileRevert: {
      type: Function as PropType<ChatPanelProps['onFileRevert']>,
      default: undefined,
    },
    /** Reports that the agent created or modified a file. */
    onFileChange: {
      type: Function as PropType<ChatPanelProps['onFileChange']>,
      default: undefined,
    },
    /** Reports that a file was removed. */
    onFileDeleted: {
      type: Function as PropType<ChatPanelProps['onFileDeleted']>,
      default: undefined,
    },
    /** Called after a commit attempt completes. */
    onCommit: { type: Function as PropType<() => void>, default: undefined },
    /** Called when an inline activity card is clicked. */
    onActivityClick: {
      type: Function as PropType<ChatPanelProps['onActivityClick']>,
      default: undefined,
    },
    /** Reports a timeline item that threw. */
    onRenderError: {
      type: Function as PropType<ChatPanelProps['onRenderError']>,
      default: undefined,
    },
    /** Called when a timeline avatar or author name is clicked. */
    onProfileClick: {
      type: Function as PropType<ChatPanelProps['onProfileClick']>,
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
      type: Function as PropType<ChatPanelProps['onClientAction']>,
      default: undefined,
    },
    /** Called on each stream done. */
    onTurnComplete: { type: Function as PropType<() => void>, default: undefined },
    /** Reports the chat's loading state. */
    onLoadingChange: {
      type: Function as PropType<ChatPanelProps['onLoadingChange']>,
      default: undefined,
    },
    /** Navigates the preview to a route on a chat link click. */
    onNavigatePreview: {
      type: Function as PropType<ChatPanelProps['onNavigatePreview']>,
      default: undefined,
    },
    /** Registers the host's broadcast-chat handler. */
    onRegisterPushHandler: {
      type: Function as PropType<ChatPanelProps['onRegisterPushHandler']>,
      default: undefined,
    },
    /** Registers the host's history reconcile. */
    onRegisterHistoryReconcile: {
      type: Function as PropType<ChatPanelProps['onRegisterHistoryReconcile']>,
      default: undefined,
    },
    /** Changing this submits the current input draft. */
    autoSubmitSignal: { type: Number, default: undefined },
    /** Seeds the input with this text on mount. */
    initialInputValue: { type: String, default: undefined },
    /** Hide the conversation-selector header (discovery). */
    hideConversationMenu: {
      type: Boolean as PropType<boolean | undefined>,
      default: undefined,
    },
    /** Whether to render the built-in conversation header (default `true`). */
    renderConversationHeader: { type: Boolean, default: true },
    /** Host-controlled active conversation id (headless mode). */
    conversationId: { type: String as PropType<string | null>, default: undefined },
    /** Host-controlled remount key for the inner chat (headless mode). */
    chatKey: { type: String, default: undefined },
    /** Called whenever the active conversation id changes. */
    onConversationId: {
      type: Function as PropType<ChatPanelProps['onConversationId']>,
      default: undefined,
    },
    /** Changing this opens the in-chat `/share` modal. */
    openShareSignal: { type: Number, default: undefined },
    /** Changing this opens the in-chat `/report` modal. */
    openReportSignal: { type: Number, default: undefined },
    /** Changing this opens the in-chat `/settings` view. */
    openSettingsSignal: { type: Number, default: undefined },
    /** Shows a "manage your own models" row in the `/model` picker. */
    onManageCustomModels: {
      type: Function as PropType<ChatPanelProps['onManageCustomModels']>,
      default: undefined,
    },
    /** Bump to re-read persisted model / settings state. */
    modelSelectionSignal: { type: Number, default: undefined },
    /** Whether the viewer may write shared project state (React's default `true`). */
    canEdit: { type: Boolean as PropType<boolean | undefined>, default: true },
    /** Whether team messages are allowed (React's default `true`). */
    canSendTeamMessages: { type: Boolean as PropType<boolean | undefined>, default: true },
    /** Whether the viewer may manage share links. */
    canShare: { type: Boolean as PropType<boolean | undefined>, default: undefined },
    /** Whether the share dialog shows its links. */
    shareLinksAllowed: { type: Boolean as PropType<boolean | undefined>, default: undefined },
    /** Changing this re-fetches the share dialog's links. */
    shareLinksRefreshSignal: { type: Number, default: undefined },
    /** Host sections rendered inside the share dialog. */
    shareModalContent: { type: [Object, Array] as PropType<VNodeChild>, default: undefined },
    /** Spinner / busy indicator for in-chat loading states. */
    spinner: { type: [Object, Array] as PropType<VNodeChild>, default: undefined },
    /** The focused editor file. */
    activeFile: { type: String as PropType<string | null>, default: undefined },
    /** The open editor tabs. */
    openTabs: { type: Array as PropType<string[]>, default: undefined },
    /** Incremented to trigger a git status refresh. */
    gitStatusTick: { type: Number, default: undefined },
    /** A message to auto-send when `pendingMessageKey` changes. */
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
    /** Whether the viewer is anonymous. */
    isAnonymous: { type: Boolean as PropType<boolean | undefined>, default: undefined },
    /** Whether the viewer is on a paid plan. */
    isPro: { type: Boolean as PropType<boolean | undefined>, default: undefined },
    /** Retained for call-site compatibility; no built-in behavior reads it. */
    suppressGuestReminder: {
      type: Boolean as PropType<boolean | undefined>,
      default: undefined,
    },
    /** Host-supplied upgrade / sign-in CTA builder. */
    buildUpgradeCta: {
      type: Function as PropType<ChatPanelProps['buildUpgradeCta']>,
      default: undefined,
    },
    /** Host-supplied `/help` upgrade section builder. */
    buildHelpUpgradeSection: {
      type: Function as PropType<ChatPanelProps['buildHelpUpgradeSection']>,
      default: undefined,
    },
    /** The signed-in user's avatar. */
    userAvatar: { type: String as PropType<string | null>, default: undefined },
    /** The agent's display name. */
    agentName: { type: String, default: undefined },
    /** The host product's display name. */
    productName: { type: String, default: undefined },
    /** The host's build version. */
    version: { type: String, default: undefined },
    /** Host-specific slash commands merged into the menu. */
    extraCommands: {
      type: Array as PropType<ChatPanelProps['extraCommands']>,
      default: undefined,
    },
    /** The command-menu "Report a problem" URL. */
    feedbackUrl: { type: String, default: undefined },
    /** Lists the project's tests. */
    listTests: { type: Function as PropType<ChatPanelProps['listTests']>, default: undefined },
    /** Runs the selected tests. */
    runTests: { type: Function as PropType<ChatPanelProps['runTests']>, default: undefined },
    /** Subscribes to every test run. */
    watchTestRuns: {
      type: Function as PropType<ChatPanelProps['watchTestRuns']>,
      default: undefined,
    },
    /** Host-owned durable native runs. */
    nativeTests: { type: Object as PropType<ChatPanelProps['nativeTests']>, default: undefined },
    /** Whether this viewer may run tests. */
    canRunTests: { type: Boolean as PropType<boolean | undefined>, default: undefined },
    /** Whether the environment the tests run in is up. */
    testsAvailable: { type: Boolean as PropType<boolean | undefined>, default: undefined },
    /** Skips the executor's in-flight tool call. */
    skipToolCall: {
      type: Function as PropType<ChatPanelProps['skipToolCall']>,
      default: undefined,
    },
    /** Extra classes appended to the panel's root. */
    className: { type: String, default: undefined },
  },
  setup(props) {
    const { t } = useTranslation()
    const cm = getClassMap()
    const isNarrow = useNarrowViewport()
    const isCoarse = useCoarsePointer()
    const http = useHttpClient()

    const env: ChatPanelEnv = {
      t,
      cm,
      http,
      isNarrow,
      isCoarse,
      shareAllowed: computed(() => props.canShare ?? props.canEdit !== false),
      baseEndpoint: computed(() => props.endpoint ?? `/projects/${props.projectId}/chat`),
    }
    // Built in place: the header slice reads the panel's services through it.
    const ctx = { props, env } as ChatPanelCtx
    ctx.header = createChatHeader(ctx)

    // The outer panel's effects, in React's order. Registering them here —
    // during setup — puts their mount work in Vue's mount queue, where a
    // parent's hook runs AFTER its child's, exactly as React's parent effects
    // run after its children's. Wrapping work in an `immediate` watcher instead
    // would run it during setup, before the inner chat exists, reversing
    // React's order.
    ctx.header.effects[1]()
    ctx.header.effects[2]()
    ctx.header.effects[3]()

    /**
     * Renders the panel: the outer root, the header, and the inner chat.
     *
     * @returns The panel's element tree.
     */
    return (): VNodeChild =>
      h(
        'div',
        {
          className: cm.cn(
            cm.flex({ direction: 'col' }),
            cm.h('full'),
            cm.surface,
            cm.borderR,
            props.className,
          ),
        },
        [
          renderChatHeader(ctx),
          h(ChatInner, {
            key: ctx.header.chatKey.value,
            projectId: props.projectId,
            endpoint: ctx.header.chatEndpoint.value,
            initialMessage: props.initialMessage,
            onInitialMessageSent: props.onInitialMessageSent,
            isPro: props.isPro,
            isAnonymous: props.isAnonymous,
            canEdit: props.canEdit ?? true,
            canSendTeamMessages: props.canSendTeamMessages ?? true,
            canShare: env.shareAllowed.value,
            shareLinksAllowed: props.shareLinksAllowed,
            shareLinksRefreshSignal: props.shareLinksRefreshSignal,
            shareModalContent: props.shareModalContent,
            buildUpgradeCta: props.buildUpgradeCta,
            buildHelpUpgradeSection: props.buildHelpUpgradeSection,
            activeFile: props.activeFile,
            openTabs: props.openTabs,
            onFileOpen: props.onFileOpen,
            onFileDoubleClick: props.onFileDoubleClick,
            onFileDiff: props.onFileDiff,
            onFileRevert: props.onFileRevert,
            onFileChange: props.onFileChange,
            onFileDeleted: props.onFileDeleted,
            onCommit: props.onCommit,
            onConversationId: ctx.header.reportConversationId,
            onActivityClick: props.onActivityClick,
            onRenderError: props.onRenderError,
            onProfileClick: props.onProfileClick,
            currentUserId: props.currentUserId,
            onReadyToBuild: props.onReadyToBuild,
            awaitingSandboxBoot: props.awaitingSandboxBoot,
            onClientAction: props.onClientAction,
            onTurnComplete: props.onTurnComplete,
            onLoadingChange: props.onLoadingChange,
            onNavigatePreview: props.onNavigatePreview,
            onRegisterPushHandler: props.onRegisterPushHandler,
            onRegisterHistoryReconcile: props.onRegisterHistoryReconcile,
            autoSubmitSignal: props.autoSubmitSignal,
            openSettingsSignal: ctx.header.settingsSignal.value,
            onManageCustomModels: props.onManageCustomModels,
            modelSelectionSignal: props.modelSelectionSignal,
            openReportSignal: ctx.header.reportSignal.value,
            openShareSignal: ctx.header.shareSignal.value,
            initialInputValue: props.initialInputValue,
            pendingMessage: props.pendingMessage,
            pendingMessageKey: props.pendingMessageKey,
            pendingMessageSuppressUser: props.pendingMessageSuppressUser,
            pendingMessageUserInitiated: props.pendingMessageUserInitiated,
            userEditedFile: props.userEditedFile,
            userEditedFileKey: props.userEditedFileKey,
            gitStatusTick: props.gitStatusTick,
            discovery: props.hideConversationMenu,
            userAvatar: props.userAvatar,
            agentName: props.agentName,
            productName: props.productName,
            version: props.version,
            extraCommands: props.extraCommands,
            feedbackUrl: props.feedbackUrl,
            listTests: props.listTests,
            runTests: props.runTests,
            watchTestRuns: props.watchTestRuns,
            nativeTests: props.nativeTests,
            canRunTests: props.canRunTests,
            testsAvailable: props.testsAvailable,
            skipToolCall: props.skipToolCall,
          }),
        ],
      )
  },
})
