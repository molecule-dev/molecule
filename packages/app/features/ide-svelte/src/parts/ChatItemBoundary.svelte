<!--
  ChatItemBoundary: the Svelte counterpart of `@molecule/app-ide-react`'s
  `ChatItemBoundary` — the per-item error boundary for the chat timeline (see
  that file for the design notes). Same props (React names), same DOM for the
  same input, and the same containment guarantee: a bad item degrades to one
  inline notice and every sibling keeps working.

  Svelte's `<svelte:boundary>` is the boundary: the caught error is reported
  to the bonded logger and the host's `onError` (React's `componentDidCatch`)
  and the `failed` snippet renders the inline notice (React's
  `getDerivedStateFromError` + fallback render). The item body renders through
  the boundary's own template, so a synchronous throw in the item's own
  branching is caught too, not only one from its descendants.
-->
<script module lang="ts">
  import type { Snippet } from 'svelte'

  import type * as types from '../types.js'

  /** Re-exported from the plain-TS contract module (src/types.ts). */
  export type ChatItemErrorInfo = types.ChatItemErrorInfo

  /** Props for {@link ChatItemBoundary} — the React prop names, React's own contract. */
  export interface ChatItemBoundaryProps {
    /** Produces the timeline item's element tree. Called during render, below the boundary. */
    render: Snippet
    /** Reports a caught render error (telemetry). Never throws. */
    onError?: (error: Error, info: ChatItemErrorInfo) => void
  }
</script>

<script lang="ts">
  import { getLogger } from '@molecule/app-logger'
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  // `Snippet` is imported by the module script above; both blocks share one
  // module scope, so importing it twice is a duplicate identifier.

  let { render, onError }: ChatItemBoundaryProps = $props()

  const cm = getClassMap()
  // Re-renders on a locale switch, so the notice changes language at once.
  const { t } = useTranslation()

  /**
   * Reports a caught render error: the bonded logger first (a host that wires
   * no reporter must still leave a trace), then the host's callback, which a
   * failure in must never escalate into a second throw.
   *
   * @param caught - The value the boundary caught.
   */
  const report = (caught: unknown): void => {
    const error = caught instanceof Error ? caught : new Error(String(caught))
    getLogger().error('Chat timeline item failed to render', { error, componentStack: null })
    try {
      onError?.(error, { componentStack: null })
    } catch (_error) {
      // A failing error reporter must never escalate into a second render throw —
      // the whole point of this boundary is that nothing here can take the app down.
    }
  }
</script>

<svelte:boundary
  onerror={(caught) => {
    report(caught)
  }}
>
  {@render render()}
  {#snippet failed()}
    <div
      data-mol-id="chat-item-render-error"
      class={cm.cn(cm.textSize('xs'), cm.textMuted)}
      style="padding: 6px 12px; font-style: italic"
    >
      {t('ide.chat.itemRenderError', undefined, {
        defaultValue: "This message couldn't be displayed.",
      })}
    </div>
  {/snippet}
</svelte:boundary>
