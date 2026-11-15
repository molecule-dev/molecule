<!--
  SafeLink: the Svelte counterpart of `@molecule/app-safe-link-react`'s
  `SafeLink` — the binding `Link` (react-router `<Link>`'s click rules) with a
  `#top` fragment appended when the destination matches the current path, so a
  same-path click still produces an observable URL change. Same props (React
  names), same DOM for the same input.
-->
<script lang="ts">
  import { Link, useLocation } from '@molecule/app-svelte'

  import type { SafeLinkProps } from './types.js'

  let { to, replace, state, className, onClick, children, ...anchor }: SafeLinkProps = $props()

  const location = useLocation()

  /** The destination with the same-path `#top` fragment applied. */
  const target = $derived.by(() => {
    const pathname = $location.pathname
    const samePath = pathname === to || pathname + '/' === to
    return samePath ? `${to.replace(/\/$/, '')}#top` : to
  })
</script>

<Link to={target} {replace} {state} class={className} onclick={onClick} {...anchor}>
  {@render children?.()}
</Link>
