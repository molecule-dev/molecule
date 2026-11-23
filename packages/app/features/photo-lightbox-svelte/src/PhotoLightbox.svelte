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
  import { Button } from '@molecule/app-ui-svelte'

  import type { PhotoLightboxProps } from './types.js'

  /** React's overlay style (`position: fixed`, `z-index: 100`; the scrim is `cm.bgScrim`'s class). */
  const ROOT_STYLE =
    'position: fixed; inset: 0; z-index: 100; display: flex; align-items: center; justify-content: center'
  /** React's figure style. */
  const FIGURE_STYLE = 'margin: 0; max-width: 90vw; max-height: 90vh; text-align: center'
  /** React's image style. */
  const IMG_STYLE = 'max-width: 100%; max-height: 80vh; object-fit: contain'
  /** React's caption style (the caption colour is `cm.textOnTone`'s class). */
  const CAPTION_STYLE = 'padding: 12px; font-size: 14px'
  /** React's "N / total" counter style (the counter colour is `cm.textOnTone`'s class). */
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

  let { photos, open, onClose, initialIndex = 0, onIndexChange }: PhotoLightboxProps = $props()

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

  // React's document keydown listener while open: ← → navigate, Escape closes.
  $effect(() => {
    if (!open) return
    /** React's keydown handler. */
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose?.()
      else if (event.key === 'ArrowLeft') setIdx(index - 1)
      else if (event.key === 'ArrowRight') setIdx(index + 1)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

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

  /** React's backdrop click: close only when the overlay itself was clicked. */
  function onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) onClose?.()
  }
</script>

{#if open && photos.length > 0}
  <!-- The overlay is a click-to-dismiss screen (role="presentation"): clicking
       it directly closes; clicks on the controls inside do not. The dialog
       itself is the element inside it, so Escape (handled on `document` in the
       $effect) stays the keyboard path. Both roles pass the compiler's a11y
       checks without ignores: the presentation backdrop is the click screen the
       checks exempt, and the dialog carries no interaction handler.
       The `</Button>{#if …}<Button` / `</Button>{/if}` boundaries hug their
       tags on purpose: the dialog is a block container, so whitespace Svelte
       keeps at block edges would render as a space between the controls; the
       other frameworks strip it, and React's DOM has none. -->
  <div
    role="presentation"
    onclick={onBackdropClick}
    class={cm.cn(cm.position('fixed'), cm.bgScrim)}
    style={ROOT_STYLE}
  >
    <div
      role="dialog"
      aria-modal="true"
      aria-label={photo.alt ?? `Image ${index + 1} of ${photos.length}`}
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={onClose}
        aria-label={closeLabel}
        className={cm.position('absolute')}
      >
        ✕
      </Button>{#if photos.length > 1}<Button
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
        <img src={photo.src} alt={photo.alt ?? `Image ${index + 1}`} style={IMG_STYLE} />
        {#if photo.caption}
          <figcaption class={cm.textOnTone} style={CAPTION_STYLE}>
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
      <div class={cm.textOnTone} style={COUNTER_STYLE}>{index + 1} / {photos.length}</div>
    </div>
  </div>
{/if}
