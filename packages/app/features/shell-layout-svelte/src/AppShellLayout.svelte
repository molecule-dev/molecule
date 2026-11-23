<!--
  AppShellLayout: the Svelte counterpart of `@molecule/app-shell-layout-react`'s
  `AppShellLayout` — top-level page scaffold: header → main (constrained by
  Container) → footer. Same props, same DOM for the same input; the header and
  footer are snippet slots so consumers retain full control over branding,
  navigation, and footer copy.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'
  import { Container } from '@molecule/app-ui-svelte'

  import type { AppShellLayoutProps } from './types.js'

  let {
    header,
    footer,
    children,
    maxWidth = 'xl',
    className,
    mainClassName,
    dataMolId,
  }: AppShellLayoutProps = $props()

  const cm = $derived(getClassMap())
</script>

<div class={cm.cn(cm.page, cm.appLayout, className)} data-mol-id={dataMolId}>
  {#if header}{@render header?.()}{/if}
  <main class={mainClassName}>
    <Container {maxWidth}>{@render children?.()}</Container>
  </main>
  {#if footer}{@render footer?.()}{/if}
</div>
