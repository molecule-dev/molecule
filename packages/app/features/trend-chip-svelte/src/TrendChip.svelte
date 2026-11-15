<!--
  TrendChip: the Svelte counterpart of `@molecule/app-trend-chip-react`'s
  `TrendChip` — a standalone trend delta chip (`▲ 12%`) for inline placement
  in row/header/cell contexts. Same props (React names), same DOM for the
  same input; the trend color is applied inline via the CSSOM and the layout
  and type classes come from the ClassMap bond.
-->
<script lang="ts">
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
  const COLOR = { up: '#22c55e', down: '#ef4444', flat: '#94a3b8' } as const

  const cm = $derived(getClassMap())
  const dir = $derived(direction ?? (delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'))
  const color = $derived(COLOR[dir])
  const abs = $derived(Math.abs(delta))
  const style = $derived(
    variant === 'pill'
      ? { padding: '2px 6px', borderRadius: '999px', background: color, color: '#fff' }
      : { color },
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
    className,
  )}
  use:reactStyle={style}
>
  {#if prefix !== undefined && prefix !== null && prefix !== ''}
    {#if typeof prefix === 'function'}{@render prefix()}{:else}{prefix}{/if}
  {/if}
  <span aria-hidden="true">{ARROW[dir]}</span>
  <span>{abs}{suffix}</span>
</span>
