<!--
  AuthBrandHeaderTagline: the Svelte counterpart of
  `@molecule/app-auth-brand-header-react`'s `AuthBrandHeaderTagline` — the
  tagline `<p>`. Same props, same DOM; the content is the `children` snippet
  (React's children).
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import type { AuthBrandHeaderTaglineProps } from './types.js'

  let { children, className }: AuthBrandHeaderTaglineProps = $props()

  const cm = $derived(getClassMap())
  const taglineClass = $derived(
    cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), cm.authBrandHeaderTagline, className),
  )
</script>

<p class={taglineClass}>
  {@render children?.()}
</p>
