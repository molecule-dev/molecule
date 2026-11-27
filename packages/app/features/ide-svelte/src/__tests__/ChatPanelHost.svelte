<!--
  Test host for ChatPanel: sets the HTTP and chat providers in Svelte context
  during component initialisation (the only place Svelte context is legal) and
  renders the panel with the props the test exposes through the shared store.
  The React reference wraps its panel in HttpProvider + ChatProvider the same
  way, and re-renders it with new props.
-->
<script lang="ts">
  import { untrack } from 'svelte'

  import type { ChatProvider } from '@molecule/app-ai-chat'
  import type { HttpClient } from '@molecule/app-http'
  import { setHttpContext, setThemeContext } from '@molecule/app-svelte'
  import { setChatContext } from '@molecule/app-svelte/chat'
  import type { ThemeProvider } from '@molecule/app-theme'

  import ChatPanel from '../components/ChatPanel.svelte'
  import { panelOverrides } from './chat-panel-props.js'

  let { http, chat, theme }: { http: HttpClient; chat: ChatProvider; theme: ThemeProvider } =
    $props()

  // The providers are fixed for the whole mount; untrack records that the host
  // reads them once, the way the conformance kit's own host does.
  untrack(() => {
    setHttpContext(http)
    setChatContext(chat)
    setThemeContext(theme)
  })
</script>

<ChatPanel {...$panelOverrides} />
