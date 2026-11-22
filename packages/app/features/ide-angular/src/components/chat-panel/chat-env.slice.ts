/**
 * React's `chat:env` slice (ChatPanel.tsx lines 2238–2272): the services and
 * derivations every other slice reads, plus the one effect that keeps the
 * conversation-id ref in step.
 *
 * React resolves these once per `ChatInner` render: `t`, `cm`, the theme mode,
 * the viewport flags, the popup cap, the HTTP client, and the conversation
 * facts derived from the endpoint. Here they are signals so a locale, theme or
 * viewport change reaches every consumer without remounting the panel; the
 * shared `ChatInnerState.env` exposes this object to every slice and section.
 *
 * @module
 */

import { computed, inject, Injectable, Injector, type Signal } from '@angular/core'

import { useHttpClient, useThemeMode, useTranslation } from '@molecule/app-angular'
import type { I18nProvider } from '@molecule/app-i18n'
import { getLogger, type Logger } from '@molecule/app-logger'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { useCoarsePointer, useNarrowViewport } from '../../hooks/useViewport.js'
import {
  type ChatEnvValues,
  type ChatHttpClient,
  ChatInnerState,
  registerChatEffect,
} from './chat-inner-state.js'

/** The identifiers other slices and sections read from the `chat:env` slice. */
export interface ChatEnvSlice extends ChatEnvValues {
  /** React's mount I/O for the region: seed the conversation-id ref. */
  mount(): void
  /** React's `#effect chat:env:1` — keeps the ref in step with the endpoint. */
  readonly effects: { 1: () => void }
  /** The translation function; a locale switch re-renders its readers. */
  readonly t: I18nProvider['t']
  /** The active locale (React reads it for the command menu's labels). */
  readonly locale: Signal<string>
  /** The active ClassMap. */
  readonly cm: UIClassMap
  /** The HTTP client every request goes through. */
  readonly http: ChatHttpClient
  /** The host theme's mode. */
  readonly themeMode: Signal<'light' | 'dark'>
  /** Whether the host theme is light. */
  readonly isLight: Signal<boolean>
  /** Whether the viewport is phone-width. */
  readonly isNarrow: Signal<boolean>
  /** Whether the pointer is coarse (touch). */
  readonly isCoarse: Signal<boolean>
  /** The one height cap for popups anchored above the composer. */
  readonly popupMaxHeight: Signal<string>
  /** A public transcript: no composer, no team messages. */
  readonly transcriptOnly: Signal<boolean>
  /** Whether the viewer may manage share links. */
  readonly shareAllowed: Signal<boolean>
  /** Whether the endpoint already carries a conversation id. */
  readonly hasConversation: Signal<boolean>
  /** The conversation id carried by the endpoint, when there is one. */
  readonly conversationId: Signal<string | null>
  /** The conversation id as the pushed-event handler sees it (not reactive). */
  readonly conversationIdRef: { current: string | null }
}

/**
 * React's `chat:env` slice. `ChatInner` provides it and assigns it to the
 * shared state's `env` before any other slice mounts.
 */
@Injectable()
export class ChatEnv implements ChatEnvSlice {
  /** The translation function (React's `useTranslation().t`). */
  readonly t: I18nProvider['t']

  /** The active locale code. */
  readonly locale: Signal<string>

  /** The bonded ClassMap. */
  readonly cm: UIClassMap = getClassMap()

  /** The package logger (React's module-level logger). */
  readonly logger: Logger = getLogger('chat-panel')

  /** The bond's HTTP client. */
  readonly http = useHttpClient()

  /** The current theme mode. */
  readonly themeMode = useThemeMode()

  /** Whether the theme is light (React's `themeMode === 'light'`). */
  readonly isLight = computed(() => this.themeMode() === 'light')

  /** Whether the viewport is phone-width. */
  readonly isNarrow = useNarrowViewport()

  /** Whether the primary pointer is coarse. */
  readonly isCoarse = useCoarsePointer()

  /**
   * One cap for every popup anchored above the composer: phones use `dvh` —
   * not `vh`, which ignores the collapsing browser chrome and the on-screen
   * keyboard — and 50dvh leaves the composer plus a context sliver visible.
   */
  readonly popupMaxHeight = computed(() => (this.isNarrow() ? 'min(50dvh, 420px)' : '70vh'))

  /** The chat endpoint React derives the conversation facts from. */
  private readonly endpoint = computed(() => this.state.props().endpoint)

  /** Whether the endpoint already carries a conversation id. */
  readonly hasConversation = computed(() => this.endpoint().includes('conversationId='))

  /** The endpoint's conversation id, or null. */
  readonly conversationId = computed(
    () => this.endpoint().match(/conversationId=([^&]+)/)?.[1] ?? null,
  )

  /**
   * Kept in sync with `conversationId` so the (memoized) pushed-event handler
   * reads the current conversation without becoming a stale closure. A plain
   * `{ current }` object, like React's ref: not reactive.
   */
  readonly conversationIdRef: { current: string | null } = { current: null }

  /** A public transcript view: the host allows neither editing nor team messaging. */
  readonly transcriptOnly = computed(() => {
    const props = this.state.props()
    return props.canEdit === false && props.canSendTeamMessages === false
  })

  /** Whether share management is available (`canShare` gated above `canEdit`). */
  readonly shareAllowed = computed(() => {
    const props = this.state.props()
    return props.canShare ?? props.canEdit !== false
  })

  /** The shared state, read for the current props. */
  private readonly state = inject(ChatInnerState)

  /** The element injector `registerChatEffect` registers the update in. */
  private readonly injector = inject(Injector)

  /** React's `#effect chat:env:1`: mirror the resolved id into the ref. */
  readonly effects = {
    1: (): void => {
      registerChatEffect(this.injector, (skip) => {
        const id = this.conversationId()
        if (skip) return
        this.conversationIdRef.current = id
      })
    },
  }

  /** React's mount I/O for the region: seed the ref from the current endpoint. */
  mount(): void {
    this.conversationIdRef.current = this.conversationId()
  }

  /** Resolves the locale fields from the i18n provider. */
  constructor() {
    const translation = useTranslation()
    this.t = translation.t
    this.locale = translation.locale
  }
}
