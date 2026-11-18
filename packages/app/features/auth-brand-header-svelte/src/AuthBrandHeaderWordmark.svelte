<!--
  AuthBrandHeaderWordmark: the Svelte counterpart of
  `@molecule/app-auth-brand-header-react`'s `AuthBrandHeaderWordmark` — the
  wordmark `<h1>`. Same props, same DOM; the content is the `children`
  snippet (React's children).
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import type { AuthBrandHeaderWordmarkProps } from './types.js'

  let { children, color, className }: AuthBrandHeaderWordmarkProps = $props()

  const cm = $derived(getClassMap())
  // Default to `text-on-surface` so the wordmark renders with the correct
  // contrast in both light and dark themes; `className` appends last so an app
  // override wins.
  const wordmarkClass = $derived(cm.cn(cm.textSize('4xl'), cm.authBrandHeaderWordmark, className))
</script>

<h1 class={wordmarkClass} style:color>
  {@render children?.()}
</h1>
