<!--
  ImageGallery: the Svelte counterpart of
  `@molecule/app-image-gallery-react`'s `ImageGallery` — main image + thumbnail
  grid with controlled-optional selection and "+N" overflow summarisation.
  Same props, same DOM for the same input.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import type { ImageGalleryProps } from './types.js'

  let {
    images,
    selectedIndex,
    onSelect,
    maxThumbnails = 4,
    alts,
    className,
  }: ImageGalleryProps = $props()

  const { t } = useTranslation()

  const cm = $derived(getClassMap())

  let internalIndex = $state(0)
  const idx = $derived(selectedIndex ?? internalIndex)
  const visible = $derived(images.slice(0, maxThumbnails))
  const overflow = $derived(Math.max(0, images.length - visible.length))

  /**
   * Column counts the ClassMap `cm.grid()` resolver can actually render. The
   * `@molecule/app-ui-tailwind` grid CVA only defines these keys — any other
   * value produces no `grid-cols-*` class and the thumbnails collapse into a
   * single column. Keep in sync with that bond's `grid` variants.
   */
  const SUPPORTED_GRID_COLS = [1, 2, 3, 4, 5, 6, 12] as const

  /**
   * Snaps an arbitrary desired column count to the largest ClassMap-supported
   * value that does not exceed it (minimum 1), so any `maxThumbnails` renders
   * a real grid and extra thumbnails wrap onto additional rows.
   *
   * @param desired - The requested number of columns (e.g. `maxThumbnails`).
   * @returns A column count guaranteed to resolve to a `grid-cols-*` class.
   */
  function toGridCols(desired: number): number {
    const clamped = Math.max(1, Math.floor(desired || 0))
    let best: number = SUPPORTED_GRID_COLS[0]
    for (const cols of SUPPORTED_GRID_COLS) {
      if (cols <= clamped) best = cols
    }
    return best
  }

  /**
   * Selects thumbnail `index`, keeping the internal state only while the
   * gallery is uncontrolled, then reports the index to `onSelect`.
   *
   * @param index - The clicked thumbnail's index.
   */
  function setIdx(index: number): void {
    if (selectedIndex === undefined) internalIndex = index
    onSelect?.(index)
  }
</script>

{#if images.length > 0}
  <div class={cm.cn(cm.stack(2), className)}>
    <div style="aspect-ratio: 4 / 3">
      <img
        src={images[idx]}
        alt={alts?.[idx] ??
          t('imageGallery.alt.fallback', { number: idx + 1 }, { defaultValue: 'Image {{number}}' })}
        style="width: 100%; height: 100%; object-fit: cover"
      />
    </div>
    {#if images.length > 1}
      <div class={cm.grid({ cols: toGridCols(maxThumbnails), gap: 'sm' })}>
        {#each visible as src, i (i)}
          <button
            type="button"
            onclick={() => setIdx(i)}
            aria-current={i === idx ? 'true' : undefined}
            aria-label={alts?.[i] ??
              t(
                'imageGallery.alt.fallback',
                { number: i + 1 },
                { defaultValue: 'Image {{number}}' },
              )}
            style="aspect-ratio: 1 / 1"
          >
            <img {src} alt="" style="width: 100%; height: 100%; object-fit: cover" />
          </button>
        {/each}
        {#if overflow > 0}
          <div
            class={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
            )}
            style="aspect-ratio: 1 / 1"
          >
            {t('imageGallery.overflow.more', { count: overflow }, { defaultValue: '+{{count}}' })}
          </div>
        {/if}
      </div>
    {/if}
  </div>
{/if}
