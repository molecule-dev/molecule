<!--
  TrendChip: the Svelte counterpart of `@molecule/app-trend-chip-react`'s
  `TrendChip` — a standalone trend delta chip (`▲ 12%`) for inline placement
  in row/header/cell contexts. Same props (React names), same DOM for the
  same input; colors come from the ClassMap bond's semantic tones and follow
  the app theme, with only the pill's padding and radius applied inline via
  the CSSOM.
-->
<script lang="ts">
  import type { ColorVariant } from '@molecule/app-ui'
  import { getClassMap } from '@molecule/app-ui'

  import { reactStyle } from './style.js'
  import type { TrendChipProps } from './types.js'

  let {
    delta,
    direction,
    suffix = '%',
    prefix,
    variant = 'subtle',
    ariaLabel,
    className,
  }: TrendChipProps = $props()

  const ARROW = { up: '▲', down: '▼', flat: '–' } as const

  /**
   * The semantic tone colouring each direction: the theme's success green for
   * a rise, its error red for a fall, its muted secondary grey for no change.
   */
  const TONE: Record<'up' | 'down' | 'flat', ColorVariant> = {
    up: 'success',
    down: 'error',
    flat: 'secondary',
  } as const

  const cm = $derived(getClassMap())
  const dir = $derived(direction ?? (delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'))
  const tone = $derived(TONE[dir])
  const abs = $derived(Math.abs(delta))
  const toneClass = $derived(
    variant === 'pill' ? cm.cn(cm.bgTone(tone), cm.textOnTone) : cm.textTone(tone),
  )
  const style = $derived(
    variant === 'pill' ? { padding: '2px 6px', borderRadius: '999px' } : undefined,
  )
  const label = $derived(
    ariaLabel ??
      `${typeof prefix === 'string' || typeof prefix === 'number' ? String(prefix) : ''}${ARROW[dir]} ${abs}${suffix}`,
  )
</script>

<span
  aria-label={label}
  class={cm.cn(
    cm.flex({ align: 'center', gap: 'xs' }),
    cm.textSize('xs'),
    cm.fontWeight('semibold'),
    toneClass,
    className,
  )}
  use:reactStyle={style}
>
  {#if prefix !== undefined && prefix !== null && prefix !== ''}
    {#if typeof prefix === 'function'}{@render prefix?.()}{:else}{prefix}{/if}
  {/if}
  <span aria-hidden="true">{ARROW[dir]}</span>
  <span>{abs}{suffix}</span>
</span>
