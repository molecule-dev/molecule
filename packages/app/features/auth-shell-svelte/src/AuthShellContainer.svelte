<!--
  AuthShellContainer: the Svelte counterpart of
  `@molecule/app-auth-shell-react`'s `AuthShellContainer` — outer full-screen
  container, centered flex (default) or a vertical column, with optional
  background decoration.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'
  import { reactStyleText } from '@molecule/app-ui-svelte'

  import type { AuthShellContainerProps } from './types.js'

  let { children, style, className, layout = 'centered' }: AuthShellContainerProps = $props()

  const cm = $derived(getClassMap())

  const base = $derived(
    layout === 'column'
      ? cm.cn(cm.flex({ direction: 'col' }), cm.minH('screen'), cm.authShellContainer)
      : cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.minH('screen'),
          cm.sp('p', 6),
          cm.authShellContainer,
        ),
  )
</script>

<div class={cm.cn(base, className)} style={reactStyleText(style)}>
  {@render children?.()}
</div>
