<!--
  WordCloud: the Svelte counterpart of `@molecule/app-word-cloud-react`'s
  `WordCloud` — renders each word at a font size proportional to its `value`,
  packed with the hand-rolled spiral algorithm. Same props (React names), same
  DOM for the same input. All UI text routes through `t('word-cloud.*')`.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import { packWords } from './packing.js'
  import type { WordCloudProps } from './types.js'

  // Category palette (data): a word's hue is its own identity, not a theme status tone.
  const DEFAULT_PALETTE = ['#2563eb', '#16a34a', '#dc2626', '#9333ea', '#f59e0b'] as const

  let {
    words,
    width = 400,
    height = 300,
    minFontSize = 12,
    maxFontSize = 64,
    colorScale = DEFAULT_PALETTE,
    orientation = 'horizontal',
    onWordClick,
    ariaLabel,
    className,
  }: WordCloudProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  const placed = $derived(
    packWords(words, { width, height, minFontSize, maxFontSize, orientation }),
  )
  const rootLabel = $derived(
    ariaLabel ?? t('word-cloud.aria.cloud', {}, { defaultValue: 'Word cloud' }),
  )
  const emptyLabel = $derived(
    t('word-cloud.aria.empty', {}, { defaultValue: 'No words to display' }),
  )
</script>

<svg
  {width}
  {height}
  viewBox="0 0 {width} {height}"
  role="img"
  aria-label={placed.length === 0 ? emptyLabel : rootLabel}
  data-mol-id="word-cloud"
  class={cm.cn(className)}
>
  {#each placed as p, i (`${p.word.text}-${i}`)}
    {@const fill = p.word.color ?? colorScale[i % colorScale.length]}
    <!-- The React reference renders a clickable `<text tabIndex>` exactly this
         way (no role, no keyboard handler), so parity keeps it as-is. -->
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_tabindex, a11y_no_static_element_interactions -->
    <text
      x={p.x}
      y={p.y}
      font-size={p.fontSize}
      {fill}
      text-anchor="middle"
      dominant-baseline="central"
      transform={p.rotation === 0 ? undefined : `rotate(${p.rotation} ${p.x} ${p.y})`}
      data-mol-id={`word-cloud-word-${p.word.text}`}
      data-value={p.word.value}
      data-rotation={p.rotation}
      tabindex={onWordClick ? 0 : -1}
      onclick={onWordClick ? () => onWordClick?.(p.word) : undefined}
      style={onWordClick ? 'cursor: pointer' : undefined}>{p.word.text}</text
    >
  {/each}
</svg>
