<!--
  AnnotationLayer: the Svelte counterpart of
  `@molecule/app-annotation-pin-react`'s `AnnotationLayer` — a wrapper that
  renders its children (the annotated surface) and overlays each pin as a
  clickable marker, plus the invisible full-surface "add pin" target when
  `onSurfaceClick` is given. Same props, same DOM for the same input.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import AnnotationPin from './AnnotationPin.svelte'
  import { styleString } from './css.js'
  import type { AnnotationLayerProps } from './types.js'

  let {
    pins,
    children,
    activePinId,
    onPinClick,
    onSurfaceClick,
    normalised = true,
    popupSide = 'right',
    className,
    style,
  }: AnnotationLayerProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  const regionLabel = $derived(
    t('annotationPin.aria.layer', {}, { defaultValue: 'Annotation layer' }),
  )
  const addPinLabel = $derived(
    t('annotationPin.aria.addPin', {}, { defaultValue: 'Add annotation pin' }),
  )

  /** The layer root's style (React's `rootStyle`: the caller's style wins). */
  const rootStyle = $derived(
    styleString({ position: 'relative', width: '100%', height: '100%', ...(style ?? {}) }),
  )

  // Reset the browser's default button chrome — the add-pin button is an
  // invisible full-surface target, not a visible control.
  const addPinStyle = $derived(
    styleString({ border: 'none', padding: 0, background: 'transparent' }),
  )

  /**
   * Computes the clicked position relative to the add-pin button's box (which
   * covers the layer) and forwards to `onSurfaceClick`. If `normalised` is
   * `true`, the returned coordinates are 0..1 fractions; otherwise they are
   * raw pixel offsets.
   *
   * Clicks produced by keyboard activation (Enter / Space on the focused
   * button) or assistive tech carry `detail === 0` and no pointer position —
   * such clicks place the pin at the surface centre. Pin markers and popups
   * never reach this handler: they stack above the button and are its
   * siblings, so their clicks do not hit it.
   *
   * @param event - The originating mouse event.
   */
  function handleSurfaceClick(event: MouseEvent): void {
    if (!onSurfaceClick) return
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    const keyboardActivated = event.detail === 0
    const px = keyboardActivated ? rect.width / 2 : event.clientX - rect.left
    const py = keyboardActivated ? rect.height / 2 : event.clientY - rect.top
    const safeRectWidth = rect.width || 1
    const safeRectHeight = rect.height || 1
    const x = normalised ? px / safeRectWidth : px
    const y = normalised ? py / safeRectHeight : py
    onSurfaceClick({ x, y })
  }
</script>

<div
  role="region"
  aria-label={regionLabel}
  data-mol-id="annotation-layer"
  class={cm.cn(className)}
  style={rootStyle}
>
  {#if children}{@render children?.()}{/if}
  {#if onSurfaceClick}
    <button
      type="button"
      aria-label={addPinLabel}
      data-mol-id="annotation-layer-add-pin"
      onclick={handleSurfaceClick}
      class={cm.cn(cm.position('absolute'), cm.inset0, cm.cursorPointer)}
      style={addPinStyle}
    ></button>
  {/if}
  {#each pins as pin (pin.id)}
    <AnnotationPin
      position={pin.position}
      label={pin.label}
      note={pin.note}
      selected={activePinId === pin.id}
      {popupSide}
      {normalised}
      onClick={() => onPinClick?.(pin.id)}
    />
  {/each}
</div>
