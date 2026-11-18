<!--
  AuthBrandHeaderChip: the Svelte counterpart of
  `@molecule/app-auth-brand-header-react`'s `AuthBrandHeaderChip` — the gradient
  material-symbols chip shown above the wordmark. Same props, same DOM.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import type { AuthBrandHeaderChipProps } from './types.js'

  let { icon, chipGradient, chipShape = 'round' }: AuthBrandHeaderChipProps = $props()

  const cm = $derived(getClassMap())
  // When no `chipGradient` is supplied, fall back to `bg-primary` so the white
  // icon glyph always has a colored backdrop.
  const chipClass = $derived(
    cm.cn(
      cm.w(12),
      cm.h(12),
      chipShape === 'round' ? cm.roundedFull : '',
      cm.flex({ align: 'center', justify: 'center' }),
      cm.sp('mb', 2),
      chipShape === 'square' ? cm.authBrandHeaderChipSquare : '',
      chipGradient ? '' : cm.bgPrimary,
      cm.authBrandHeaderChipShadow,
    ),
  )
  const iconClass = $derived(
    cm.cn(cm.textSize('3xl'), cm.iconGlyphFont, cm.authBrandHeaderChipIcon),
  )
</script>

<div class={chipClass} style:background={chipGradient}>
  <span class={iconClass} style="font-variation-settings: 'FILL' 1" aria-hidden="true">{icon}</span>
</div>
