/**
 * React's `chat:env` slice (ChatPanel.tsx lines 2238–2272): the services and
 * derivations every other slice reads, plus the one effect that keeps the
 * conversation-id ref in step.
 *
 * React resolves these once per `ChatInner` render: `t`, `cm`, the theme mode,
 * the viewport flags, the popup cap, the HTTP client, and the conversation
 * facts derived from the endpoint. Here they are reactive getters, so a locale,
 * theme or viewport change reaches every consumer without remounting the panel.
 *
 * @module
 */

import { untrack } from 'svelte'
import { fromStore } from 'svelte/store'

import type { I18nProvider } from '@molecule/app-i18n'
import { useHttpClient, useThemeMode, useTranslation } from '@molecule/app-svelte'
import { getClassMap, type UIClassMap } from '@molecule/app-ui'

import { useCoarsePointer, useNarrowViewport } from '../../hooks/useViewport.js'
import type { ChatContext, ChatHttpClient } from './context.svelte.js'

/**
 * The identifiers other slices and sections read from the `chat:env` slice:
 * the services and derivations every other slice reads. They are reactive
 * getters where React re-renders, so a locale, theme or viewport change reaches
 * every consumer without re-mounting the panel.
 */
export interface ChatEnvSlice {
  /** The translation function (React's `useTranslation().t`). */
  readonly t: I18nProvider['t']
  /** The active locale code. */
  readonly locale: string
  /** The bonded ClassMap (styling tokens resolve at render time). */
  readonly cm: UIClassMap
  /** The bond's HTTP client. */
  readonly http: ChatHttpClient
  /** The current theme mode. */
  readonly themeMode: 'light' | 'dark'
  /** Whether the theme is light (React's `themeMode === 'light'`). */
  readonly isLight: boolean
  /** Whether the viewport is phone-width. */
  readonly isNarrow: boolean
  /** Whether the primary pointer is coarse. */
  readonly isCoarse: boolean
  /** The one cap every popup anchored above the composer uses. */
  readonly popupMaxHeight: string
  /** Whether the endpoint already carries a conversation id. */
  readonly hasConversation: boolean
  /** The endpoint's conversation id, or null. */
  readonly conversationId: string | null
  /** The conversation id the (memoized) pushed-event handler reads. */
  readonly conversationIdRef: { current: string | null }
  /** A public transcript view: neither editing nor team messaging is allowed. */
  readonly transcriptOnly: boolean
  /** Whether the share surfaces are available to this viewer. */
  readonly shareAllowed: boolean
  /** React's mount I/O for the region: seed the conversation-id ref. */
  mount(): void
  /** React's `#effect chat:env:1` — keeps the ref in step with the endpoint. */
  readonly effects: { 1: () => void }
}

/**
 * Creates the `chat:env` slice.
 *
 * @param ctx - The shared chat context.
 * @returns The resolved env, reactive to locale, theme, viewport and props.
 */
export function createChatEnv(ctx: ChatContext): ChatEnvSlice {
  const translation = useTranslation()
  const t = translation.t
  const locale = fromStore(translation.locale)
  const cm = getClassMap()
  const http = useHttpClient()
  const themeMode = fromStore(useThemeMode())
  const narrow = fromStore(useNarrowViewport())
  const coarse = fromStore(useCoarsePointer())

  // A plain `{ current }` object, like React's ref: not reactive. The effect
  // below keeps it in step so a memoized pushed-event handler never closes over
  // a stale conversation.
  const conversationIdRef: { current: string | null } = { current: null }

  /** The endpoint's conversation id, or null (React's regex read). */
  const readConversationId = (): string | null =>
    ctx.props.endpoint.match(/conversationId=([^&]+)/)?.[1] ?? null

  return {
    t,
    get locale(): string {
      return locale.current
    },
    cm,
    http,
    get themeMode(): 'light' | 'dark' {
      return themeMode.current
    },
    get isLight(): boolean {
      return themeMode.current === 'light'
    },
    get isNarrow(): boolean {
      return narrow.current
    },
    get isCoarse(): boolean {
      return coarse.current
    },
    get popupMaxHeight(): string {
      // Phones use dvh — not vh, which ignores the collapsing browser chrome
      // and the on-screen keyboard; 50dvh leaves the composer and a context
      // sliver visible, and 420px bounds it on small tablets.
      return narrow.current ? 'min(50dvh, 420px)' : '70vh'
    },
    get hasConversation(): boolean {
      return ctx.props.endpoint.includes('conversationId=')
    },
    get conversationId(): string | null {
      return readConversationId()
    },
    conversationIdRef,
    get transcriptOnly(): boolean {
      return ctx.props.canEdit === false && ctx.canSendTeamMessages === false
    },
    get shareAllowed(): boolean {
      return ctx.props.canShare ?? ctx.props.canEdit !== false
    },
    mount(): void {
      conversationIdRef.current = untrack(readConversationId)
    },
    effects: {
      1: (): void => {
        $effect(() => {
          conversationIdRef.current = readConversationId()
        })
      },
    },
  }
}
