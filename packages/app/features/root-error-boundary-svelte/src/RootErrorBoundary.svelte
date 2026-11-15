<!--
  RootErrorBoundary: the Svelte counterpart of
  `@molecule/app-root-error-boundary-react`'s `RootErrorBoundary` — top-level
  error boundary that catches descendant render errors, logs them via the
  bonded `@molecule/app-logger`, and falls back to a minimal localized
  recovery surface read through `useTranslation()` from `@molecule/app-svelte`.
  It renders its children untouched while no error has been caught — there is
  no wrapper element, matching React's fragment root.

  Svelte's `<svelte:boundary>` is the boundary: the caught error goes to the
  bonded logger (React's `componentDidCatch`) and the `failed` snippet renders
  the recovery alert (React's `getDerivedStateFromError` + fallback render).
-->
<script lang="ts">
  import type { Snippet } from 'svelte'

  import { error as logError } from '@molecule/app-logger'

  import RootErrorFallback from './RootErrorFallback.svelte'

  /** Props accepted by the boundary (React's `RootErrorBoundary` props). */
  interface Props {
    /** The app tree to guard (typically the routed root). */
    children?: Snippet
  }

  let { children }: Props = $props()
</script>

<svelte:boundary
  onerror={(caught) => {
    logError(caught instanceof Error ? caught : new Error(String(caught)), '')
  }}
>
  {@render children?.()}
  {#snippet failed()}
    <RootErrorFallback />
  {/snippet}
</svelte:boundary>
