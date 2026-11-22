/**
 * The outer panel's header slice — conversation state, the list and selection,
 * React's `── Header: conversation selector ──` section and its mount fetch.
 *
 * `ChatPanel` itself is the outer unit's file; this slice holds the header's
 * surface so the header section reads it through the context, and so the
 * outer unit extends it without touching the frozen `context.ts`.
 *
 * The controlled/headless switch is React's: a `conversationId` prop that is not
 * `undefined` means the host owns the active conversation (`null` being a valid
 * "no conversation"), and a `chatKey` prop owns the inner chat's remount key.
 * The storage reads and writes go through the panel-logic key helper, and the
 * mount fetch runs from `onMounted` so that it lands AFTER the inner chat's own
 * mount work, exactly as React's parent effects run after its children's.
 *
 * @module
 */

import {
  computed,
  type ComputedRef,
  onBeforeUnmount,
  onMounted,
  onUpdated,
  type Ref,
  ref,
  watch,
} from 'vue'

import type { ConversationSummary } from '@molecule/app-ide-panel-logic/panels'
import { chatConversationStorageKey } from '@molecule/app-ide-panel-logic/panels'

import type { ChatEffect, ChatPanelCtx, SetState } from './context.js'

/** What the outer panel's header section exposes. */
export interface ChatHeaderSlice {
  /** The header's effects, in React's order. */
  readonly effects: {
    /** Moves focus into the dropdown's search field when it opens. */
    readonly 1: ChatEffect
    /** Fetches the conversation list on mount (and when the header comes back). */
    readonly 2: ChatEffect
    /** Closes the dropdown on a mousedown outside it. */
    readonly 3: ChatEffect
  }
  /** Whether the history dropdown is open. */
  readonly showDropdown: Ref<boolean>
  /** Sets the dropdown's open state. */
  readonly setShowDropdown: SetState<boolean>
  /** The conversation list the dropdown shows. */
  readonly conversations: Ref<ConversationSummary[]>
  /** The dropdown's search query. */
  readonly convSearch: Ref<string>
  /** Sets the dropdown's search query. */
  readonly setConvSearch: SetState<string>
  /** The header's root element (the outside-click boundary). */
  readonly dropdownRef: Ref<HTMLElement | null>
  /** The dropdown's search input (focused when it opens). */
  readonly convSearchRef: Ref<HTMLInputElement | null>
  /** The active conversation id — the host's in controlled mode, else internal. */
  readonly activeConversationId: ComputedRef<string | null>
  /** The active conversation's row, when the list carries it. */
  readonly activeConversation: ComputedRef<ConversationSummary | undefined>
  /** The rows matching the search query. */
  readonly filteredConversations: ComputedRef<ConversationSummary[]>
  /** The inner chat's remount key (the host's, else the internal one). */
  readonly chatKey: ComputedRef<string>
  /** The chat endpoint, with the active conversation id appended. */
  readonly chatEndpoint: ComputedRef<string>
  /** The effective `/settings` signal (the host's, else the header gear's). */
  readonly settingsSignal: ComputedRef<number>
  /** The effective `/report` signal (the host's, else the header bug button's). */
  readonly reportSignal: ComputedRef<number>
  /** The effective `/share` signal (the host's, else the header share button's). */
  readonly shareSignal: ComputedRef<number>
  /** Opens or closes the dropdown, refetching the list when it opens. */
  readonly toggleDropdown: () => void
  /** Starts a server conversation (or a local fallback) and remounts the chat. */
  readonly newChat: () => Promise<void>
  /** Switches to a conversation, persists it and remounts the chat. */
  readonly selectConversation: (id: string) => void
  /** Bumps the internal `/settings` signal. */
  readonly openSettings: () => void
  /** Bumps the internal `/report` signal. */
  readonly openReport: () => void
  /** Bumps the internal `/share` signal. */
  readonly openShare: () => void
  /** Reports the active conversation id to the host or persists it locally. */
  readonly reportConversationId: (id: string | null) => void
}

/**
 * Builds the outer panel's header slice.
 *
 * @param ctx - The panel context.
 * @returns The header slice.
 */
export function createChatHeader(ctx: ChatPanelCtx): ChatHeaderSlice {
  const { props, env } = ctx
  // React's `useState(() => localStorage.getItem(storageKey))` initializers.
  const initialStorageKey = chatConversationStorageKey(props.projectId)
  const internalActiveConversationId = ref<string | null>(localStorage.getItem(initialStorageKey))
  const internalChatKey = ref<string>(localStorage.getItem(initialStorageKey) ?? 'default')
  const showDropdown = ref(false)
  const conversations = ref<ConversationSummary[]>([])
  const convSearch = ref('')
  const dropdownRef = ref<HTMLElement | null>(null)
  const convSearchRef = ref<HTMLInputElement | null>(null)
  const internalSettingsSignal = ref(0)
  const internalReportSignal = ref(0)
  const internalShareSignal = ref(0)

  const isConversationControlled = computed(() => props.conversationId !== undefined)
  const activeConversationId = computed<string | null>(() =>
    isConversationControlled.value
      ? (props.conversationId ?? null)
      : internalActiveConversationId.value,
  )
  const chatKey = computed(() => props.chatKey ?? internalChatKey.value)
  const settingsSignal = computed(() => props.openSettingsSignal ?? internalSettingsSignal.value)
  const reportSignal = computed(() => props.openReportSignal ?? internalReportSignal.value)
  const shareSignal = computed(() => props.openShareSignal ?? internalShareSignal.value)
  const chatEndpoint = computed(() =>
    activeConversationId.value
      ? `${env.baseEndpoint.value}?conversationId=${activeConversationId.value}`
      : env.baseEndpoint.value,
  )

  /** Fetches the project's conversations (non-critical: display only). */
  async function fetchConversations(): Promise<void> {
    try {
      await env.http
        .get<{ conversations: ConversationSummary[] }>(`/projects/${props.projectId}/conversations`)
        .then((res) => {
          conversations.value = res.data.conversations
        })
    } catch (_error) {
      // non-critical — conversation list is display-only; header works fine without it
    }
  }

  /**
   * Stores the active conversation id and remembers it across reloads.
   *
   * @param id - The conversation id, or `null` to forget it.
   */
  function persistConversationId(id: string | null): void {
    internalActiveConversationId.value = id
    const storageKey = chatConversationStorageKey(props.projectId)
    if (id) localStorage.setItem(storageKey, id)
    else localStorage.removeItem(storageKey)
  }

  /**
   * Reports a (backend-assigned or switched) conversation id: the host's
   * handler in controlled mode, else the internal persistence.
   *
   * @param id - The conversation id, or `null`.
   */
  function reportConversationId(id: string | null): void {
    const handler = props.onConversationId ?? persistConversationId
    handler(id)
  }

  /** Opens or closes the dropdown, refetching the list as it opens. */
  function toggleDropdown(): void {
    const next = !showDropdown.value
    if (next) void fetchConversations()
    showDropdown.value = next
  }

  /** Starts a new conversation and remounts the inner chat. */
  async function newChat(): Promise<void> {
    try {
      const res = await env.http.post<{ id: string }>(
        `/projects/${props.projectId}/conversations`,
        {},
      )
      persistConversationId(res.data.id)
      internalChatKey.value = res.data.id
    } catch (_error) {
      // Server conversation creation failed — fall back to a client-side key so
      // the user can still start a new chat without a persisted conversation id
      persistConversationId(null)
      internalChatKey.value = `new-${Date.now()}`
    }
    showDropdown.value = false
    convSearch.value = ''
  }

  /**
   * Switches to a conversation and remounts the inner chat on it.
   *
   * @param id - The conversation id.
   */
  function selectConversation(id: string): void {
    persistConversationId(id)
    internalChatKey.value = id
    showDropdown.value = false
    convSearch.value = ''
  }

  const filteredConversations = computed(() => {
    const query = convSearch.value
    return query
      ? conversations.value.filter((conversation) =>
          conversation.preview?.toLowerCase().includes(query.toLowerCase()),
        )
      : conversations.value
  })
  const activeConversation = computed(() =>
    conversations.value.find((conversation) => conversation.id === activeConversationId.value),
  )

  // The mousedown listener installed while the dropdown is open.
  let removeOutsideClick: (() => void) | null = null

  const effects: ChatHeaderSlice['effects'] = {
    1: () => {
      watch(
        showDropdown,
        (isOpen) => {
          if (isOpen) convSearchRef.value?.focus()
        },
        { flush: 'post' },
      )
    },
    2: () => {
      // React's effect deps are [fetchConversations, renderConversationHeader],
      // so it runs on mount, when the header returns, and on a project change.
      onMounted(() => {
        if (props.renderConversationHeader) void fetchConversations()
      })
      watch(
        () => props.renderConversationHeader,
        (hasHeader) => {
          if (hasHeader) void fetchConversations()
        },
        { flush: 'post' },
      )
      // A project change re-runs React's effect AFTER the inner chat's effects for that change
      // (React runs a commit's effects child-first), so the inner chat's model, settings, git and
      // file requests go out before this list's. A post watcher would run first here: Vue flushes
      // post watchers by component uid, parent before child. Lifecycle hooks run child-first, as
      // React's effects do, and this panel re-renders on a project change (it passes the id to the
      // inner chat), so the change is caught in `onUpdated`.
      let fetchedFor = props.projectId
      onUpdated(() => {
        if (props.projectId === fetchedFor) return
        fetchedFor = props.projectId
        if (props.renderConversationHeader) void fetchConversations()
      })
    },
    3: () => {
      watch(
        showDropdown,
        (isOpen) => {
          removeOutsideClick?.()
          removeOutsideClick = null
          if (!isOpen) return
          const handler = (event: MouseEvent): void => {
            if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
              showDropdown.value = false
            }
          }
          document.addEventListener('mousedown', handler)
          removeOutsideClick = () => document.removeEventListener('mousedown', handler)
        },
        { flush: 'post' },
      )
      onBeforeUnmount(() => {
        removeOutsideClick?.()
        removeOutsideClick = null
      })
    },
  }

  return {
    effects,
    showDropdown,
    setShowDropdown: (value) => {
      showDropdown.value = typeof value === 'function' ? value(showDropdown.value) : value
    },
    conversations,
    convSearch,
    setConvSearch: (value) => {
      convSearch.value = typeof value === 'function' ? value(convSearch.value) : value
    },
    dropdownRef,
    convSearchRef,
    activeConversationId,
    activeConversation,
    filteredConversations,
    chatKey,
    chatEndpoint,
    settingsSignal,
    reportSignal,
    shareSignal,
    toggleDropdown,
    newChat,
    selectConversation,
    openSettings: () => {
      internalSettingsSignal.value += 1
    },
    openReport: () => {
      internalReportSignal.value += 1
    },
    openShare: () => {
      internalShareSignal.value += 1
    },
    reportConversationId,
  }
}
