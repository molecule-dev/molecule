/**
 * `chat:env` — the Vue ChatPanel's environment, ported from React's first
 * region: translation, the ClassMap, the HTTP client, the theme, the viewport
 * flags, and the conversation id derived from the endpoint.
 *
 * The values React computes on every render are Vue computeds here, so a prop
 * or media-query change follows without remounting. `conversationIdRef` stays a
 * plain ref object (not reactive), as React's `useRef` is, because the pushed
 * event handler reads it without subscribing.
 *
 * @module
 */

import { computed, type ComputedRef, onMounted, type Ref, watch } from 'vue'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import {
  useHttpClient,
  useThemeMode,
  useTranslation,
  type UseTranslationResult,
} from '@molecule/app-vue'

import { useCoarsePointer, useNarrowViewport } from '../../hooks/useViewport.js'
import type { ChatEffect, ChatHttpClient, ChatInnerProps, MutableRef } from './context.js'

/** What the `chat:env` slice exposes to the rest of the panel. */
export interface ChatEnvSlice {
  /** The translation function; a locale switch re-renders its readers. */
  readonly t: UseTranslationResult['t']
  /** The active locale (React reads it for the command menu's labels). */
  readonly locale: ComputedRef<string>
  /** The active ClassMap. */
  readonly cm: UIClassMap
  /** The HTTP client every request goes through. */
  readonly http: ChatHttpClient
  /** The host theme's mode. */
  readonly themeMode: ComputedRef<'light' | 'dark'>
  /** Whether the host theme is light (drives the tinted rows). */
  readonly isLight: ComputedRef<boolean>
  /** Whether the viewport is phone-width. */
  readonly isNarrow: Ref<boolean>
  /** Whether the pointer is coarse (touch). */
  readonly isCoarse: Ref<boolean>
  /** The one height cap for popups anchored above the composer. */
  readonly popupMaxHeight: ComputedRef<string>
  /** A public transcript: no composer, no team messages. */
  readonly transcriptOnly: ComputedRef<boolean>
  /** Whether the viewer may manage share links. */
  readonly shareAllowed: ComputedRef<boolean>
  /** Whether the endpoint already carries a conversation id. */
  readonly hasConversation: ComputedRef<boolean>
  /** The conversation id carried by the endpoint, when there is one. */
  readonly conversationId: ComputedRef<string | null>
  /**
   * The conversation id as the pushed-event handler sees it — a plain ref, so
   * reading it never subscribes and never goes stale.
   */
  readonly conversationIdRef: MutableRef<string | null>
  /** The region's effects, in React's order. */
  readonly effects: {
    /** `#effect chat:env:1` — keeps {@link conversationIdRef} in sync. */
    readonly 1: ChatEffect
  }
}

/**
 * Builds the `chat:env` slice.
 *
 * @param props - The panel's props (the endpoint and the capability flags).
 * @returns The environment slice.
 */
export function createChatEnv(props: ChatInnerProps): ChatEnvSlice {
  const { t, locale } = useTranslation()
  const cm = getClassMap()
  const themeMode = useThemeMode()
  const isNarrow = useNarrowViewport()
  const isCoarse = useCoarsePointer()
  const http = useHttpClient()

  const isLight = computed(() => themeMode.value === 'light')
  const popupMaxHeight = computed(() => (isNarrow.value ? 'min(50dvh, 420px)' : '70vh'))
  const transcriptOnly = computed(
    () => props.canEdit === false && props.canSendTeamMessages === false,
  )
  const shareAllowed = computed(() => props.canShare ?? props.canEdit !== false)
  const hasConversation = computed(() => props.endpoint.includes('conversationId='))
  const conversationId = computed(() => props.endpoint.match(/conversationId=([^&]+)/)?.[1] ?? null)
  const conversationIdRef: MutableRef<string | null> = { current: conversationId.value }

  const effects: ChatEnvSlice['effects'] = {
    1: () => {
      onMounted(() => {
        conversationIdRef.current = conversationId.value
      })
      watch(
        conversationId,
        (value) => {
          conversationIdRef.current = value
        },
        { flush: 'post' },
      )
    },
  }

  return {
    t,
    locale,
    cm,
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
    effects,
  }
}
