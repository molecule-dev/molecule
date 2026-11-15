<!--
  SlideThumbnail: the Svelte counterpart of `@molecule/app-slide-thumbnail-react`'s
  `SlideThumbnail` — a fixed-width clickable tile with an index badge and an
  "active" outline. Same props (React names), same DOM for the same input; the
  live scaled-down preview is the default snippet. The tile's inline style is
  applied through the CSSOM the way react-dom does (see `style.ts`).
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import { reactStyle } from './style.js'
  import type { SlideThumbnailProps } from './types.js'

  let {
    index,
    children,
    active,
    onClick,
    aspect = '16/9',
    width = 160,
    className,
  }: SlideThumbnailProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  // Every `t(…)` runs inside a `$derived`: it reads the i18n version under the
  // hood, so this re-runs on a locale switch the way React's render-time `t`
  // calls re-run on a re-render.
  const label = $derived(t('slideThumbnail.label', { index }, { defaultValue: 'Slide {{index}}' }))

  const rootStyle = $derived({
    width: `${width}px`,
    aspectRatio: aspect.replace('/', ' / '),
    outline: active ? '2px solid currentColor' : 'none',
    outlineOffset: '2px',
    background: 'var(--mol-color-surface, #fff)',
    overflow: 'hidden',
    border: 'none',
    padding: '0',
  })

  // Applied through the CSSOM like the tile's style, so the attribute
  // serializes exactly as react-dom leaves it (rgb colors, `0px` paddings).
  const badgeStyle = {
    position: 'absolute',
    left: '4px',
    top: '4px',
    padding: '0 4px',
    fontSize: '10px',
    fontWeight: '700',
    background: 'rgba(0,0,0,0.6)',
    color: '#fff',
    borderRadius: '3px',
  }
</script>

<button
  type="button"
  onclick={(event) => onClick?.(event)}
  aria-current={active ? 'true' : undefined}
  data-mol-id="slide-thumbnail"
  data-slide-index={index}
  aria-label={label}
  class={cm.cn(cm.position('relative'), cm.cursorPointer, className)}
  use:reactStyle={rootStyle}
>
  {#if children}{@render children()}{/if}
  <span use:reactStyle={badgeStyle}>{index}</span>
</button>
