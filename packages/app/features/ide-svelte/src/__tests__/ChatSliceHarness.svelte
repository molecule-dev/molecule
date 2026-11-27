<!--
  Test host for ONE chat-panel slice: sets the HTTP, chat and theme providers in
  Svelte context during initialisation (the only place Svelte context is legal),
  builds a real `ChatContext` over the given props and lets the test create the
  slice under test from it.

  This is the slice-level counterpart of `ChatPanelHost.svelte`: the panel-level
  harness mounts the whole panel, this one mounts a single slice so its mount
  effect, retries and storage reads can be asserted without the units the rest
  of the panel still stubs.
-->
<script lang="ts">
  import { untrack } from 'svelte'

  import type { ChatProvider } from '@molecule/app-ai-chat'
  import type { HttpClient } from '@molecule/app-http'
  import { setHttpContext, setThemeContext, useTranslation } from '@molecule/app-svelte'
  import { setChatContext } from '@molecule/app-svelte/chat'
  import type { ThemeProvider } from '@molecule/app-theme'
  import { getClassMap } from '@molecule/app-ui'
  import { Modal } from '@molecule/app-ui-svelte'

  import type { ChatEnvSlice } from '../components/chat-panel/chat-env.svelte.js'
  import type { ChatInnerProps } from '../components/chat-panel/context.svelte.js'
  import { ChatContext } from '../components/chat-panel/context.svelte.js'

  let {
    http,
    chat,
    theme,
    props,
    build,
    overlayModal = false,
  }: {
    http: HttpClient
    chat: ChatProvider
    theme: ThemeProvider
    props: ChatInnerProps
    build: (ctx: ChatContext) => void
    overlayModal?: boolean
  } = $props()

  // The providers are fixed for the whole mount; untrack records that the host
  // reads them once, the way the conformance kit's own host does.
  untrack(() => {
    setHttpContext(http)
    setChatContext(chat)
    setThemeContext(theme)
  })

  const translation = untrack(() => useTranslation())
  const env: ChatEnvSlice = untrack(() => ({
    t: translation.t,
    locale: 'en',
    cm: getClassMap(),
    http,
    themeMode: 'light',
    isLight: true,
    isNarrow: false,
    isCoarse: false,
    popupMaxHeight: '70vh',
    get hasConversation(): boolean {
      return props.endpoint.includes('conversationId=')
    },
    get conversationId(): string | null {
      return props.endpoint.match(/conversationId=([^&]+)/)?.[1] ?? null
    },
    conversationIdRef: { current: null },
    transcriptOnly: false,
    shareAllowed: true,
    mount(): void {
      // The env slice's own mount work is unit P1's; tests here do not need it.
    },
    effects: { 1: () => {} },
  }))
  const ctx = new ChatContext(() => props)
  ctx.env = env
  untrack(() => build(ctx))
</script>

{#if overlayModal}
  <Modal
    open={ctx.overlay.panelOverlay !== null}
    onClose={() => ctx.overlay.setPanelOverlay(null)}
    showCloseButton={false}
    aria-label="Test panel"
  />
{/if}
