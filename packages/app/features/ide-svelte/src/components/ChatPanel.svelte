<!--
  ChatPanel — React's exported `ChatPanel` (ChatPanel.tsx): the outer shell that
  owns the conversation id, the header's history dropdown and the header
  signals, remounts `ChatInner` per conversation, and forwards every React
  prop.

  The conversation-selector header is a section of its own (`ChatHeader`),
  rendered when the built-in header is on and not hidden (`hideConversationMenu`
  also travels to `ChatInner` as `discovery`). The outer mount fetch is deferred
  by one microtask so it runs after `ChatInner`'s mount effects — React runs a
  child's effects before its parent's.
-->
<script module lang="ts">
  import type * as types from '../props.js'

  /** Re-exported from the plain-TS contract module (src/props.ts). */
  export type ChatPanelProps = types.ChatPanelProps
</script>

<script lang="ts">
  import { untrack } from 'svelte'
  import { fromStore } from 'svelte/store'

  import type { ConversationSummary } from '@molecule/app-ide-panel-logic/panels'
  import { chatConversationStorageKey } from '@molecule/app-ide-panel-logic/panels'
  import { useHttpClient, useThemeMode, useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import { useCoarsePointer, useNarrowViewport } from '../hooks/useViewport.js'
  import type { ChatPanelProps as ChatPanelPublicProps } from '../props.js'
  import ChatHeader from './chat-panel/ChatHeader.svelte'
  import ChatInner from './chat-panel/ChatInner.svelte'
  import type { ChatInnerProps, ChatPanelContext } from './chat-panel/context.svelte.js'

  /** React's `ChatPanelProps`. */
  const props: ChatPanelPublicProps = $props()

  const translation = useTranslation()
  const t = translation.t
  const cm = getClassMap()
  const http = useHttpClient()
  const themeMode = fromStore(useThemeMode())
  const narrow = fromStore(useNarrowViewport())
  const coarse = fromStore(useCoarsePointer())

  const storageKey = $derived(chatConversationStorageKey(props.projectId))
  // Read once, the way React reads its storage-backed state initializer.
  const storedConversationId = untrack(() =>
    typeof localStorage === 'undefined' ? null : localStorage.getItem(storageKey),
  )

  // The panel owns its conversation unless the host controls it (`undefined`
  // is the switch; `null` is a valid controlled "no conversation").
  let internalActiveConversationId = $state<string | null>(storedConversationId)
  // Separate key that only changes on user-initiated switches; the backend's
  // mid-stream id must not remount ChatInner (it would drop in-flight messages).
  let internalChatKey = $state<string>(storedConversationId ?? 'default')
  let showDropdown = $state(false)
  let conversations = $state.raw<ConversationSummary[]>([])
  let convSearch = $state('')
  // Incremented by the header buttons to open surfaces inside ChatInner.
  let internalOpenSettingsSignal = $state(0)
  let internalOpenReportSignal = $state(0)
  let internalOpenShareSignal = $state(0)

  const dropdownRef: { current: HTMLDivElement | null } = { current: null }
  const convSearchRef: { current: HTMLInputElement | null } = { current: null }

  const isConversationControlled = $derived(props.conversationId !== undefined)
  const activeConversationId = $derived(
    isConversationControlled ? (props.conversationId ?? null) : internalActiveConversationId,
  )
  const chatKey = $derived(props.chatKey ?? internalChatKey)
  const effectiveSettingsSignal = $derived(props.openSettingsSignal ?? internalOpenSettingsSignal)
  const effectiveReportSignal = $derived(props.openReportSignal ?? internalOpenReportSignal)
  const effectiveShareSignal = $derived(props.openShareSignal ?? internalOpenShareSignal)
  const baseEndpoint = $derived(props.endpoint ?? `/projects/${props.projectId}/chat`)
  const chatEndpoint = $derived(
    activeConversationId ? `${baseEndpoint}?conversationId=${activeConversationId}` : baseEndpoint,
  )
  const shareAllowed = $derived(props.canShare ?? props.canEdit !== false)
  const renderConversationHeader = $derived(props.renderConversationHeader ?? true)
  const hideConversationMenu = $derived(props.hideConversationMenu ?? false)
  const filteredConvs = $derived(
    convSearch
      ? conversations.filter((conversation) =>
          conversation.preview?.toLowerCase().includes(convSearch.toLowerCase()),
        )
      : conversations,
  )
  const activeConv = $derived(
    conversations.find((conversation) => conversation.id === activeConversationId),
  )

  /**
   * Fetches the conversation list the header shows.
   *
   * @param projectId - The project whose conversations to list.
   */
  async function fetchConversations(projectId: string): Promise<void> {
    try {
      const response = await http.get<{ conversations: ConversationSummary[] }>(
        `/projects/${projectId}/conversations`,
      )
      conversations = response.data.conversations
    } catch (_error) {
      // Non-critical: the conversation list is display-only; the header works
      // without it, exactly as React's catch does.
    }
  }

  /**
   * Persists the active conversation id (and its storage key).
   *
   * @param id - The conversation id, or null to clear it.
   */
  function persistConversationId(id: string | null): void {
    internalActiveConversationId = id
    if (typeof localStorage === 'undefined') return
    if (id) localStorage.setItem(storageKey, id)
    else localStorage.removeItem(storageKey)
  }

  /**
   * Reports a conversation id to the host (controlled) or persists it.
   *
   * @param id - The conversation id, or null when there is none.
   */
  function reportConversationId(id: string | null): void {
    if (props.onConversationId) props.onConversationId(id)
    else persistConversationId(id)
  }

  /** Opens or closes the history dropdown, fetching the list when opening. */
  function toggleDropdown(): void {
    if (!showDropdown) void fetchConversations(props.projectId)
    showDropdown = !showDropdown
  }

  /** Starts a new conversation, falling back to a client-side key on failure. */
  async function newChat(): Promise<void> {
    try {
      const response = await http.post<{ id: string }>(
        `/projects/${props.projectId}/conversations`,
        {},
      )
      persistConversationId(response.data.id)
      internalChatKey = response.data.id
    } catch (_error) {
      // Server creation failed — fall back to a client-side key so the user can
      // still start a new chat without a persisted conversation id.
      persistConversationId(null)
      internalChatKey = `new-${Date.now()}`
    }
    showDropdown = false
    convSearch = ''
  }

  /**
   * Opens a conversation and remounts the inner chat.
   *
   * @param id - The conversation's id.
   */
  function selectConversation(id: string): void {
    persistConversationId(id)
    internalChatKey = id
    showDropdown = false
    convSearch = ''
  }

  /**
   * Applies the dropdown's search text.
   *
   * @param value - The new search text.
   */
  function setConvSearch(value: string): void {
    convSearch = value
  }

  // Opening the dropdown is a user action; focus its search field from an
  // effect rather than with `autofocus`.
  $effect(() => {
    if (showDropdown) convSearchRef.current?.focus()
  })

  // Fetch the conversation list so the header shows the current chat title.
  // Issued here, in the parent's effect, exactly as React's parent-after-child
  // commit does: Svelte has already run the inner panel's model, settings, git
  // and file effects by the time this effect runs, so the request lands after
  // theirs and ahead of any later promise continuations. React's
  // `fetchConversations` identity changes with the project, so a project switch
  // re-fetches too — and only that (or the header turning back on) does, which
  // the value guard keeps true when the host re-renders with the same props.
  let fetchedConversationsFor: string | null = null
  $effect(() => {
    const projectId = props.projectId
    if (!renderConversationHeader) {
      fetchedConversationsFor = null
      return
    }
    if (fetchedConversationsFor === projectId) return
    fetchedConversationsFor = projectId
    void fetchConversations(projectId)
  })

  // Close the dropdown on an outside click.
  $effect(() => {
    if (!showDropdown) return
    const handler = (event: MouseEvent): void => {
      if (
        dropdownRef.current &&
        event.target instanceof Node &&
        !dropdownRef.current.contains(event.target)
      ) {
        showDropdown = false
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  })

  /** The props ChatInner is handed (React forwards all of them). */
  const innerProps: ChatInnerProps = {
    get projectId() {
      return props.projectId
    },
    get endpoint() {
      return chatEndpoint
    },
    get initialMessage() {
      return props.initialMessage
    },
    get onInitialMessageSent() {
      return props.onInitialMessageSent
    },
    get isPro() {
      return props.isPro
    },
    get isAnonymous() {
      return props.isAnonymous
    },
    // React's outer `ChatPanel` defaults both (`canEdit = true`,
    // `canSendTeamMessages = true`): undefined means an editor who may post.
    get canEdit() {
      return props.canEdit ?? true
    },
    get canSendTeamMessages() {
      return props.canSendTeamMessages ?? true
    },
    get canShare() {
      return shareAllowed
    },
    get shareLinksAllowed() {
      return props.shareLinksAllowed
    },
    get shareLinksRefreshSignal() {
      return props.shareLinksRefreshSignal
    },
    get shareModalContent() {
      return props.shareModalContent
    },
    get buildUpgradeCta() {
      return props.buildUpgradeCta
    },
    get buildHelpUpgradeSection() {
      return props.buildHelpUpgradeSection
    },
    get activeFile() {
      return props.activeFile
    },
    get openTabs() {
      return props.openTabs
    },
    get onFileOpen() {
      return props.onFileOpen
    },
    get onFileDoubleClick() {
      return props.onFileDoubleClick
    },
    get onFileDiff() {
      return props.onFileDiff
    },
    get onFileRevert() {
      return props.onFileRevert
    },
    get onFileChange() {
      return props.onFileChange
    },
    get onFileDeleted() {
      return props.onFileDeleted
    },
    get onCommit() {
      return props.onCommit
    },
    get onConversationId() {
      return reportConversationId
    },
    get onActivityClick() {
      return props.onActivityClick
    },
    get onRenderError() {
      return props.onRenderError
    },
    get onProfileClick() {
      return props.onProfileClick
    },
    get currentUserId() {
      return props.currentUserId
    },
    get onReadyToBuild() {
      return props.onReadyToBuild
    },
    get awaitingSandboxBoot() {
      return props.awaitingSandboxBoot
    },
    get onClientAction() {
      return props.onClientAction
    },
    get onTurnComplete() {
      return props.onTurnComplete
    },
    get onLoadingChange() {
      return props.onLoadingChange
    },
    get onNavigatePreview() {
      return props.onNavigatePreview
    },
    get onRegisterPushHandler() {
      return props.onRegisterPushHandler
    },
    get onRegisterHistoryReconcile() {
      return props.onRegisterHistoryReconcile
    },
    get autoSubmitSignal() {
      return props.autoSubmitSignal
    },
    get openSettingsSignal() {
      return effectiveSettingsSignal
    },
    get onManageCustomModels() {
      return props.onManageCustomModels
    },
    get modelSelectionSignal() {
      return props.modelSelectionSignal
    },
    get openReportSignal() {
      return effectiveReportSignal
    },
    get openShareSignal() {
      return effectiveShareSignal
    },
    get initialInputValue() {
      return props.initialInputValue
    },
    get pendingMessage() {
      return props.pendingMessage
    },
    get pendingMessageKey() {
      return props.pendingMessageKey
    },
    get pendingMessageSuppressUser() {
      return props.pendingMessageSuppressUser
    },
    get pendingMessageUserInitiated() {
      return props.pendingMessageUserInitiated
    },
    get userEditedFile() {
      return props.userEditedFile
    },
    get userEditedFileKey() {
      return props.userEditedFileKey
    },
    get gitStatusTick() {
      return props.gitStatusTick
    },
    get discovery() {
      return props.hideConversationMenu
    },
    get userAvatar() {
      return props.userAvatar
    },
    get agentName() {
      return props.agentName
    },
    get productName() {
      return props.productName
    },
    get version() {
      return props.version
    },
    get extraCommands() {
      return props.extraCommands
    },
    get feedbackUrl() {
      return props.feedbackUrl
    },
    get listTests() {
      return props.listTests
    },
    get runTests() {
      return props.runTests
    },
    get watchTestRuns() {
      return props.watchTestRuns
    },
    get nativeTests() {
      return props.nativeTests
    },
    get canRunTests() {
      return props.canRunTests
    },
    get testsAvailable() {
      return props.testsAvailable
    },
    get skipToolCall() {
      return props.skipToolCall
    },
  }

  /** The header section's context. */
  const ctx: ChatPanelContext = {
    get props() {
      return props
    },
    t,
    cm,
    get isLight() {
      return themeMode.current === 'light'
    },
    get isNarrow() {
      return narrow.current
    },
    get isCoarse() {
      return coarse.current
    },
    get shareAllowed() {
      return shareAllowed
    },
    get renderConversationHeader() {
      return renderConversationHeader
    },
    get hideConversationMenu() {
      return hideConversationMenu
    },
    get activeConversationId() {
      return activeConversationId
    },
    get conversations() {
      return conversations
    },
    get convSearch() {
      return convSearch
    },
    get showDropdown() {
      return showDropdown
    },
    get filteredConvs() {
      return filteredConvs
    },
    get activeConv() {
      return activeConv
    },
    dropdownRef,
    convSearchRef,
    setConvSearch,
    toggleDropdown,
    newChat: (): void => {
      void newChat()
    },
    selectConversation,
    openShare: (): void => {
      internalOpenShareSignal += 1
    },
    openReport: (): void => {
      internalOpenReportSignal += 1
    },
    openSettings: (): void => {
      internalOpenSettingsSignal += 1
    },
  }
</script>

<div
  class={cm.cn(
    cm.flex({ direction: 'col' }),
    cm.h('full'),
    cm.surface,
    cm.borderR,
    props.className,
  )}
>
  {#if renderConversationHeader && !hideConversationMenu}
    <ChatHeader {ctx} />
  {/if}
  {#key chatKey}
    <ChatInner {...innerProps} />
  {/key}
</div>
