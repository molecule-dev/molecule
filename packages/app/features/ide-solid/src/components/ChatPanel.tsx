/**
 * AI chat panel — the Solid counterpart of `@molecule/app-ide-react`'s
 * `ChatPanel`.
 *
 * The outer shell: it owns the conversation list, the active conversation (the
 * host's controlled value in headless mode, else a `localStorage`-backed one), a
 * separate user-initiated remount key, and the header's share / report /
 * settings signals. It renders the conversation-selector header and the inner
 * chat surface, remounted per conversation, and keeps React's exact prop
 * contract.
 *
 * `ChatPanel` evaluates its JSX into a const before registering its own
 * effects, so the inner chat's effects are created — and therefore run — before
 * the outer panel's; the effect order (focus the search field, fetch the
 * conversation list, close the dropdown on an outside click) matches React's.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { batch, createEffect, createMemo, createSignal, on, onCleanup, Show } from 'solid-js'

import type { ConversationSummary } from '@molecule/app-ide-panel-logic/panels'
import { chatConversationStorageKey } from '@molecule/app-ide-panel-logic/panels'
import { getLogger } from '@molecule/app-logger'
import { useHttpClient, useThemeMode, useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import { useCoarsePointer, useNarrowViewport } from '../hooks/useViewport.js'
import {
  ChatConversationHeader,
  type ChatConversationHeaderState,
} from './chat-panel/ChatConversationHeader.jsx'
import { ChatInner } from './chat-panel/ChatInner.jsx'
import type { ChatPanelCtx, ChatPanelProps, MutableRef } from './chat-panel/context.js'

export type { ChatPanelProps } from './chat-panel/context.js'

/**
 * AI chat panel with conversation history dropdown and Claude Code-style tool display.
 * @param props - React's chat-panel props (see {@link ChatPanelProps}).
 * @returns The rendered chat panel element.
 */
export function ChatPanel(props: ChatPanelProps): JSX.Element {
  const { t } = useTranslation()
  const cm = getClassMap()
  const http = useHttpClient()
  const logger = getLogger('chat-panel')
  const themeMode = useThemeMode()
  const isNarrow = useNarrowViewport()
  const isCoarse = useCoarsePointer()

  // Share management may be gated ABOVE canEdit by the host (see
  // ChatPanelProps.canShare) — gates the built-in header share button here and
  // is threaded into ChatInner for the /share command + modal.
  const shareAllowed = createMemo(() => props.canShare ?? props.canEdit !== false)

  // When the host renders its own conversation chrome (headless mode), it drives
  // the active conversation through the controlled props; otherwise the panel
  // owns it internally (localStorage-backed). `conversationId !== undefined` is
  // the switch — `null` is a valid controlled "no conversation".
  const isConversationControlled = (): boolean => props.conversationId !== undefined

  const storageKey = (): string => chatConversationStorageKey(props.projectId)
  const [internalActiveConversationId, setActiveConversationId] = createSignal<string | null>(
    localStorage.getItem(storageKey()),
  )
  // Separate key that only changes on *user-initiated* conversation switches
  // (new chat, select conversation). The backend assigns a conversation ID
  // mid-stream which updates activeConversationId, but must NOT remount
  // ChatInner (that would lose the in-flight messages).
  const [internalChatKey, setInternalChatKey] = createSignal<string>(
    localStorage.getItem(storageKey()) ?? 'default',
  )
  const [showDropdown, setShowDropdown] = createSignal(false)
  const [conversations, setConversations] = createSignal<ConversationSummary[]>([])
  const [convSearch, setConvSearch] = createSignal('')
  const dropdownRef: MutableRef<HTMLDivElement | null> = { current: null }
  const searchRef: MutableRef<HTMLInputElement | null> = { current: null }
  // Incremented by the header gear button to open the /settings view inside
  // ChatInner (which owns the slash-command dispatch + system-card timeline).
  // A host-supplied signal prop (headless mode) overrides the internal one.
  const [internalOpenSettingsSignal, setInternalOpenSettingsSignal] = createSignal(0)
  // Incremented by the header bug-report button to open the /report modal inside
  // ChatInner (same dispatch target as the /report and /bug commands).
  const [internalOpenReportSignal, setInternalOpenReportSignal] = createSignal(0)
  // Incremented by the header share button to open the /share modal inside
  // ChatInner (same dispatch target as the /share command).
  const [internalOpenShareSignal, setInternalOpenShareSignal] = createSignal(0)

  // Effective values: host-controlled when provided, else internal.
  const activeConversationId = createMemo(() =>
    isConversationControlled() ? (props.conversationId ?? null) : internalActiveConversationId(),
  )
  const chatKey = createMemo(() => props.chatKey ?? internalChatKey())
  const effectiveSettingsSignal = createMemo(
    () => props.openSettingsSignal ?? internalOpenSettingsSignal(),
  )
  const effectiveReportSignal = createMemo(
    () => props.openReportSignal ?? internalOpenReportSignal(),
  )
  const effectiveShareSignal = createMemo(() => props.openShareSignal ?? internalOpenShareSignal())

  const baseEndpoint = (): string => props.endpoint ?? `/projects/${props.projectId}/chat`
  const chatEndpoint = createMemo(() => {
    const conversationId = activeConversationId()
    return conversationId ? `${baseEndpoint()}?conversationId=${conversationId}` : baseEndpoint()
  })

  const fetchConversations = async (): Promise<void> => {
    try {
      const res = await http.get<{ conversations: ConversationSummary[] }>(
        `/projects/${props.projectId}/conversations`,
      )
      setConversations(res.data.conversations)
    } catch (_error) {
      // non-critical — conversation list is display-only; header works fine without it
      // (React's catch is silent here: a failed list must not add a log line.)
    }
  }
  // The effect's dependency: the project whose list to fetch, or null in
  // headless mode where the host owns the conversation list/picker. A plain
  // accessor, not a memo: through a memo this outer effect would be notified
  // ahead of the inner chat's effects on a project switch, while React runs the
  // inner effects first (one commit, child first) — the request order the
  // switching-projects case pins.
  const conversationsFetchProject = (): string | null =>
    props.renderConversationHeader === false ? null : props.projectId

  const handleToggleDropdown = (): void => {
    setShowDropdown((current) => {
      if (!current) void fetchConversations()
      return !current
    })
  }

  const persistConversationId = (id: string | null): void => {
    setActiveConversationId(id)
    if (id) localStorage.setItem(storageKey(), id)
    else localStorage.removeItem(storageKey())
  }

  // What ChatInner reports a (backend-assigned or switched) conversation id to:
  // the host's handler in controlled/headless mode (it owns the picker +
  // persistence), else the internal localStorage-backed persist. The current
  // prop is read at call time, so a replaced handler is honoured.
  const reportConversationId = (id: string): void => {
    const handler = props.onConversationId
    if (handler) handler(id)
    else persistConversationId(id)
  }

  const handleNewChat = async (): Promise<void> => {
    try {
      const res = await http.post<{ id: string }>(`/projects/${props.projectId}/conversations`, {})
      // React applies the whole handler's updates in one commit: the remount
      // key and the endpoint move together, so the outgoing ChatInner never
      // observes the next conversation's endpoint. Solid applies each signal
      // write immediately, so they are batched here to keep the same order.
      batch(() => {
        persistConversationId(res.data.id)
        setInternalChatKey(res.data.id)
        setShowDropdown(false)
        setConvSearch('')
      })
    } catch (_error) {
      // Server conversation creation failed — fall back to a client-side key so
      // the user can still start a new chat without a persisted conversation id
      batch(() => {
        persistConversationId(null)
        setInternalChatKey(`new-${Date.now()}`)
        setShowDropdown(false)
        setConvSearch('')
      })
    }
  }

  const handleSelectConversation = (id: string): void => {
    batch(() => {
      persistConversationId(id)
      setInternalChatKey(id)
      setShowDropdown(false)
      setConvSearch('')
    })
  }

  const filteredConversations = createMemo(() => {
    const query = convSearch()
    if (!query) return conversations()
    return conversations().filter((conversation) =>
      conversation.preview?.toLowerCase().includes(query.toLowerCase()),
    )
  })
  const activeConversation = createMemo(() =>
    conversations().find((conversation) => conversation.id === activeConversationId()),
  )

  const ctx: ChatPanelCtx = {
    props,
    t,
    cm,
    http,
    logger,
    themeMode,
    isNarrow,
    isCoarse,
    shareAllowed,
  }

  const headerState: ChatConversationHeaderState = {
    showDropdown,
    conversations,
    convSearch,
    setConvSearch,
    activeConversationId,
    filteredConversations,
    activeConversation,
    dropdownRef,
    searchRef,
    toggle: handleToggleDropdown,
    newChat: () => {
      void handleNewChat()
    },
    selectConversation: handleSelectConversation,
    openShare: () => setInternalOpenShareSignal((count) => count + 1),
    openReport: () => setInternalOpenReportSignal((count) => count + 1),
    openSettings: () => setInternalOpenSettingsSignal((count) => count + 1),
  }

  // The JSX is built BEFORE this panel's own effects, so the inner chat's
  // effects are created first and run first — React's child-before-parent
  // effect order. Props are passed as JSX attributes (not a spread object) so
  // each is a getter: a signal change reaches the frozen ChatInner's own
  // effects.
  const body = (
    <div
      class={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.h('full'),
        cm.surface,
        cm.borderR,
        props.className,
      )}
    >
      <Show when={props.renderConversationHeader !== false && !props.hideConversationMenu}>
        <ChatConversationHeader ctx={ctx} state={headerState} />
      </Show>
      <Show when={chatKey()} keyed>
        <ChatInner
          projectId={props.projectId}
          endpoint={chatEndpoint()}
          initialMessage={props.initialMessage}
          onInitialMessageSent={props.onInitialMessageSent}
          isPro={props.isPro}
          isAnonymous={props.isAnonymous}
          canEdit={props.canEdit ?? true}
          canSendTeamMessages={props.canSendTeamMessages ?? true}
          canShare={shareAllowed()}
          shareLinksAllowed={props.shareLinksAllowed}
          shareLinksRefreshSignal={props.shareLinksRefreshSignal}
          shareModalContent={props.shareModalContent}
          buildUpgradeCta={props.buildUpgradeCta}
          buildHelpUpgradeSection={props.buildHelpUpgradeSection}
          activeFile={props.activeFile}
          openTabs={props.openTabs}
          onFileOpen={props.onFileOpen}
          onFileDoubleClick={props.onFileDoubleClick}
          onFileDiff={props.onFileDiff}
          onFileRevert={props.onFileRevert}
          onFileChange={props.onFileChange}
          onFileDeleted={props.onFileDeleted}
          onCommit={props.onCommit}
          onConversationId={reportConversationId}
          onActivityClick={props.onActivityClick}
          onRenderError={props.onRenderError}
          onProfileClick={props.onProfileClick}
          currentUserId={props.currentUserId}
          onReadyToBuild={props.onReadyToBuild}
          awaitingSandboxBoot={props.awaitingSandboxBoot}
          onClientAction={props.onClientAction}
          onTurnComplete={props.onTurnComplete}
          onLoadingChange={props.onLoadingChange}
          onNavigatePreview={props.onNavigatePreview}
          onRegisterPushHandler={props.onRegisterPushHandler}
          onRegisterHistoryReconcile={props.onRegisterHistoryReconcile}
          autoSubmitSignal={props.autoSubmitSignal}
          openSettingsSignal={effectiveSettingsSignal()}
          modelSelectionSignal={props.modelSelectionSignal}
          onManageCustomModels={props.onManageCustomModels}
          openReportSignal={effectiveReportSignal()}
          openShareSignal={effectiveShareSignal()}
          initialInputValue={props.initialInputValue}
          pendingMessage={props.pendingMessage}
          pendingMessageKey={props.pendingMessageKey}
          pendingMessageSuppressUser={props.pendingMessageSuppressUser}
          pendingMessageUserInitiated={props.pendingMessageUserInitiated}
          userEditedFile={props.userEditedFile}
          userEditedFileKey={props.userEditedFileKey}
          gitStatusTick={props.gitStatusTick}
          discovery={props.hideConversationMenu}
          userAvatar={props.userAvatar}
          agentName={props.agentName}
          productName={props.productName}
          version={props.version}
          extraCommands={props.extraCommands}
          feedbackUrl={props.feedbackUrl}
          listTests={props.listTests}
          runTests={props.runTests}
          watchTestRuns={props.watchTestRuns}
          nativeTests={props.nativeTests}
          canRunTests={props.canRunTests}
          testsAvailable={props.testsAvailable}
          skipToolCall={props.skipToolCall}
        />
      </Show>
    </div>
  )

  // Opening the conversation dropdown is a user action; focus its search field
  // from an effect rather than with `autoFocus`.
  createEffect(
    on(
      showDropdown,
      (open) => {
        if (open) searchRef.current?.focus()
      },
      { defer: false },
    ),
  )

  // Fetch conversations on mount so the header shows the current chat title.
  // Skipped in headless mode — the host owns the conversation list/picker and
  // this internal fetch would be redundant. React runs the inner chat's effects
  // (models, git status, files list) before this outer panel's on a project
  // switch, so the fetch is deferred one task: Solid re-orders effects as they
  // re-run, and the switch's request order must stay React's.
  let previousFetchProject: string | null | undefined
  createEffect(
    on(
      conversationsFetchProject,
      (projectId) => {
        const projectChanged =
          previousFetchProject !== undefined && previousFetchProject !== projectId
        previousFetchProject = projectId
        if (projectId === null) return
        if (projectChanged) {
          // A project SWITCH: React runs the inner chat's effects (models, git
          // status, files list) before this outer panel's, so the fetch is
          // deferred one task to keep that request order.
          setTimeout(() => {
            void fetchConversations()
          }, 0)
          return
        }
        void fetchConversations()
      },
      { defer: false },
    ),
  )

  // Close the dropdown on an outside click while it is open.
  createEffect(
    on(
      showDropdown,
      (open) => {
        if (!open) return
        const handler = (event: MouseEvent): void => {
          if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
            setShowDropdown(false)
          }
        }
        document.addEventListener('mousedown', handler)
        onCleanup(() => document.removeEventListener('mousedown', handler))
      },
      { defer: false },
    ),
  )

  return body
}
