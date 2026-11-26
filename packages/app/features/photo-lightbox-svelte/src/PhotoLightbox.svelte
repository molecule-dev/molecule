<!--
  PhotoLightbox: the Svelte counterpart of
  `@molecule/app-photo-lightbox-react`'s `PhotoLightbox` — fullscreen photo
  viewer with prev/next arrows, keyboard navigation (← → Esc), close button,
  and optional captions. Same props (React names), same DOM for the same input;
  every visible string goes through `t()` so a locale switch re-renders it.
-->
<script lang="ts">
  import { untrack } from 'svelte'

  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Button, Modal } from '@molecule/app-ui-svelte'

  import type { PhotoLightboxProps } from './types.js'

  /** React's figure style. */
  const FIGURE_STYLE = 'margin: 0 auto; max-width: 90vw; max-height: 90vh; text-align: center'
  /** React's image style. */
  const IMG_STYLE = 'max-width: 100%; max-height: 80vh; object-fit: contain'
  /** React's caption style (the caption colour is `cm.textMuted`'s class). */
  const CAPTION_STYLE = 'padding: 12px; font-size: 14px'
  /** React's "N / total" counter style (the counter colour is `cm.textMuted`'s class). */
  const COUNTER_STYLE =
    'position: absolute; bottom: 16px; left: 0; right: 0; text-align: center; font-size: 12px'
  /** React's previous-arrow style. */
  const PREVIOUS_STYLE = {
    position: 'absolute',
    left: '16px',
    top: '50%',
    transform: 'translateY(-50%)',
  }
  /** React's next-arrow style. */
  const NEXT_STYLE = {
    position: 'absolute',
    right: '16px',
    top: '50%',
    transform: 'translateY(-50%)',
  }

  let {
    photos,
    open,
    onClose = () => {},
    initialIndex = 0,
    onIndexChange,
  }: PhotoLightboxProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  // React's `useState(initialIndex)`; `untrack` captures the mount value only.
  let index = $state(untrack(() => initialIndex))
  const photo = $derived(photos[index])

  // React's `useEffect(() => { if (open) setIndex(initialIndex) }, [open, initialIndex])`:
  // reset when (and only when) `open` or `initialIndex` actually changes value.
  let previousOpen = untrack(() => open)
  let previousInitial = untrack(() => initialIndex)
  $effect(() => {
    const nextOpen = open
    const nextInitial = initialIndex
    if (nextOpen && (nextOpen !== previousOpen || nextInitial !== previousInitial)) {
      index = nextInitial
    }
    previousOpen = nextOpen
    previousInitial = nextInitial
  })

  /** Navigates while the key event comes from this lightbox. */
  const navigate = (event: KeyboardEvent): void => {
    if (event.key === 'ArrowLeft') setIdx(index - 1)
    else if (event.key === 'ArrowRight') setIdx(index + 1)
  }

  // Every `t(…)` runs inside a `$derived`: it reads the i18n version under the
  // hood, so these re-run on a locale switch the way React's render-time `t`
  // calls re-run on a re-render.
  const closeLabel = $derived(t('lightbox.close', {}, { defaultValue: 'Close' }))
  const previousLabel = $derived(t('lightbox.previous', {}, { defaultValue: 'Previous' }))
  const nextLabel = $derived(t('lightbox.next', {}, { defaultValue: 'Next' }))

  /** Clamps an index into the gallery (React's modulo wrap) and reports it. */
  function setIdx(next: number): void {
    const total = photos.length
    const clamped = (next + total) % total
    index = clamped
    onIndexChange?.(clamped)
  }
</script>

{#if open && photos.length > 0}
  <Modal
    open
    {onClose}
    onKeyDown={navigate}
    size="full"
    {closeLabel}
    aria-label={photo.alt ??
      t(
        'lightbox.imageOfTotal',
        { index: index + 1, total: photos.length },
        { defaultValue: 'Image {{index}} of {{total}}' },
      )}
  >
    {#if photos.length > 1}<Button
        variant="ghost"
        size="sm"
        onClick={() => setIdx(index - 1)}
        aria-label={previousLabel}
        className={cm.position('absolute')}
        style={PREVIOUS_STYLE}
      >
        ‹
      </Button>{/if}
    <figure style={FIGURE_STYLE}>
      <img
        src={photo.src}
        alt={photo.alt ??
          t('lightbox.image', { index: index + 1 }, { defaultValue: 'Image {{index}}' })}
        style={IMG_STYLE}
      />
      {#if photo.caption}
        <figcaption class={cm.textMuted} style={CAPTION_STYLE}>
          {#if typeof photo.caption === 'function'}{@render photo.caption?.()}{:else}{photo.caption}{/if}
        </figcaption>
      {/if}
    </figure>
    {#if photos.length > 1}<Button
        variant="ghost"
        size="sm"
        onClick={() => setIdx(index + 1)}
        aria-label={nextLabel}
        className={cm.position('absolute')}
        style={NEXT_STYLE}
      >
        ›
      </Button>{/if}
    <div class={cm.textMuted} style={COUNTER_STYLE}>{index + 1} / {photos.length}</div>
  </Modal>
{/if}
