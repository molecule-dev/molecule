/**
 * `chat:env` — the panel's environment: translations, the class map, the HTTP
 * client, the theme and viewport flags, and the conversation the endpoint
 * names. This slice is the port's own (unit P1).
 *
 * @module
 */

import type { Accessor } from 'solid-js'
import { createEffect, createMemo } from 'solid-js'

import { getLogger, type Logger } from '@molecule/app-logger'
import { useHttpClient, useThemeMode, useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import { useCoarsePointer, useNarrowViewport } from '../../hooks/useViewport.js'
import type {
  ChatInnerCtx,
  ClassMap,
  HttpClient,
  SliceEffects,
  TranslateFunction,
} from './context.js'

/** What a slice reads from `chat:env`. */
export interface ChatEnvSlice {
  /** The active translation function. */
  t: TranslateFunction
  /** The active locale code. */
  locale: Accessor<string>
  /** The resolved class map. */
  cm: ClassMap
  /** The panel's logger. */
  logger: Logger
  /** The HTTP client. */
  http: HttpClient
  /** The active theme mode. */
  themeMode: Accessor<'light' | 'dark'>
  /** Whether the theme is light (drives the tinted rows). */
  isLight: Accessor<boolean>
  /** Whether the viewport is phone-width. */
  isNarrow: Accessor<boolean>
  /** Whether the primary pointer is coarse (touch). */
  isCoarse: Accessor<boolean>
  /** The shared height cap of every popup anchored above the composer. */
  popupMaxHeight: Accessor<string>
  /** A read-only member with team messages disabled sees a public transcript. */
  transcriptOnly: Accessor<boolean>
  /** Whether the viewer may manage public share links. */
  shareAllowed: Accessor<boolean>
  /** Whether the endpoint names an existing conversation. */
  hasConversation: Accessor<boolean>
  /** The conversation id the endpoint names, or null. */
  conversationId: Accessor<string | null>
  /** The current conversation id, kept fresh for memoized callbacks. */
  conversationIdRef: { current: string | null }
  /** The slice's effects, by ledger position. */
  effects: SliceEffects
}

/**
 * Creates `chat:env`.
 * @param ctx - The inner ctx (only its props are read here).
 * @returns The environment slice.
 */
export function createChatEnv(ctx: ChatInnerCtx): ChatEnvSlice {
  const props = ctx.props
  const { t, locale } = useTranslation()
  const cm = getClassMap()
  const themeMode = useThemeMode()
  const isNarrow = useNarrowViewport()
  const isCoarse = useCoarsePointer()
  const http = useHttpClient()
  const logger = getLogger('chat-panel')

  const transcriptOnly = createMemo(
    () => props.canEdit === false && props.canSendTeamMessages === false,
  )
  const shareAllowed = createMemo(() => props.canShare ?? props.canEdit !== false)
  const isLight = createMemo(() => themeMode() === 'light')
  // One cap for every popup anchored above the composer: phones use dvh so the
  // collapsing browser chrome and the on-screen keyboard are respected.
  const popupMaxHeight = createMemo(() => (isNarrow() ? 'min(50dvh, 420px)' : '70vh'))
  const hasConversation = createMemo(() => props.endpoint.includes('conversationId='))
  // A plain accessor, not a memo: every effect that reads the conversation
  // subscribes to the endpoint itself, in its own declaration order. Through a
  // memo, Solid notifies the memo first and queues its downstream effects
  // ahead of a sibling effect that reads the endpoint directly, which reverses
  // React's effect order on an endpoint change (e.g. a server-assigned id).
  const conversationId: Accessor<string | null> = () =>
    props.endpoint.match(/conversationId=([^&]+)/)?.[1] ?? null
  const conversationIdRef: { current: string | null } = { current: conversationId() }

  return {
    t,
    locale,
    cm,
    logger,
    http,
    themeMode,
    isLight,
    isNarrow,
    isCoarse,
    popupMaxHeight,
    transcriptOnly,
    shareAllowed,
    hasConversation,
    conversationId,
    conversationIdRef,
    effects: {
      // #effect chat:env:1 — the memoized callbacks read the current conversation
      // without becoming a stale closure.
      1: () => {
        createEffect(() => {
          conversationIdRef.current = conversationId()
        })
      },
    },
  }
}
