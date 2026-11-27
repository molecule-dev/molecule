<!--
  Test host for the chat-panel slices that react to PROP CHANGES (the
  auto-send effects): the same providers and slice construction as
  `ChatSliceHarness.svelte`, but the props come from a readable store, so a test
  can change them mid-test the way React's `rerender` did.

  Svelte components take their props from the parent at render, so the store is
  the only way to hand a mounted component a new props object; this host reads
  it through `fromStore`, which keeps every read reactive for the slices'
  `$effect`s.
-->
<script lang="ts">
  import { untrack } from 'svelte'
  import { fromStore, type Readable } from 'svelte/store'

  import type { ChatProvider } from '@molecule/app-ai-chat'
  import type { HttpClient } from '@molecule/app-http'
  import { setHttpContext, setThemeContext, useTranslation } from '@molecule/app-svelte'
  import { setChatContext } from '@molecule/app-svelte/chat'
  import type { ThemeProvider } from '@molecule/app-theme'
  import { getClassMap } from '@molecule/app-ui'

  import type { ChatEnvSlice } from '../components/chat-panel/chat-env.svelte.js'
  import type { ChatInnerProps } from '../components/chat-panel/context.svelte.js'
  import { ChatContext } from '../components/chat-panel/context.svelte.js'

  let {
    http,
    chat,
    theme,
    props: propsStore,
    build,
  }: {
    http: HttpClient
    chat: ChatProvider
    theme: ThemeProvider
    /** The live props; the test updates the store to re-render. */
    props: Readable<ChatInnerProps>
    build: (ctx: ChatContext) => void
  } = $props()

  // The providers are fixed for the whole mount; untrack records that the host
  // reads them once, the way the conformance kit's own host does.
  untrack(() => {
    setHttpContext(http)
    setChatContext(chat)
    setThemeContext(theme)
  })

  /** The live props, read reactively through the store. */
  const live = untrack(() => fromStore(propsStore))

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
      return live.current.endpoint.includes('conversationId=')
    },
    get conversationId(): string | null {
      return live.current.endpoint.match(/conversationId=([^&]+)/)?.[1] ?? null
    },
    conversationIdRef: { current: null },
    get transcriptOnly(): boolean {
      return live.current.canEdit === false && live.current.canSendTeamMessages === false
    },
    get shareAllowed(): boolean {
      return live.current.canShare ?? live.current.canEdit !== false
    },
    mount(): void {
      // The env slice's own mount work is unit P1's; tests here do not need it.
    },
    effects: { 1: () => {} },
  }))
  const ctx = new ChatContext(() => live.current)
  ctx.env = env
  untrack(() => build(ctx))
</script>
