<!--
  AnnotationPin: the Svelte counterpart of
  `@molecule/app-annotation-pin-react`'s `AnnotationPin` — a single pin marker
  (small circle with optional label) rendered at an absolute position on its
  parent, with a click-to-toggle popup showing the note. Same props, same DOM
  for the same input; every visible string goes through `t()` so a locale
  switch re-renders it.
-->
<script lang="ts">
  import type { Attachment } from 'svelte/attachments'

  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { reactStyleText } from '@molecule/app-ui-svelte'

  import type { AnnotationPinProps } from './types.js'

  let {
    position,
    label,
    note,
    selected = false,
    onClick,
    popupSide = 'right',
    className,
    normalised = true,
  }: AnnotationPinProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  // Every `t(…)` runs inside a `$derived`: it reads the i18n version under the
  // hood, so this re-runs on a locale switch the way React's render-time `t`
  // calls re-run on a re-render.
  const markerLabel = $derived(
    t('annotationPin.aria.marker', {}, { defaultValue: 'Annotation pin' }),
  )
  const popupLabel = $derived(
    t('annotationPin.aria.popup', {}, { defaultValue: 'Annotation details' }),
  )
  const emptyNote = $derived(
    t('annotationPin.empty', {}, { defaultValue: 'No notes for this pin.' }),
  )

  /** The wrapper's position (React's `wrapperStyle`). */
  const wrapperStyle = $derived(
    reactStyleText({
      position: 'absolute',
      left: normalised ? `${position.x * 100}%` : `${position.x}px`,
      top: normalised ? `${position.y * 100}%` : `${position.y}px`,
      transform: 'translate(-50%, -50%)',
      zIndex: selected ? 2 : 1,
    }),
  )

  /** The marker button's reset style (React's `markerStyle`). */
  const markerStyle = $derived(
    reactStyleText({
      width: 24,
      height: 24,
      border: 'none',
      padding: 0,
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
    }),
  )

  /** The marker label's style (React's inline `lineHeight` / `pointerEvents`). */
  const labelStyle = $derived(reactStyleText({ lineHeight: 1, pointerEvents: 'none' }))

  /** The popup's side-specific style (React's `popupStyle`). */
  const popupStyle = $derived.by(() => {
    const base: Record<string, string | number> = {
      position: 'absolute',
      minWidth: 160,
      maxWidth: 240,
      padding: 8,
      borderRadius: 4,
      boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
      zIndex: 3,
    }
    switch (popupSide) {
      case 'top':
        base.bottom = '100%'
        base.left = '50%'
        base.transform = 'translate(-50%, -8px)'
        break
      case 'bottom':
        base.top = '100%'
        base.left = '50%'
        base.transform = 'translate(-50%, 8px)'
        break
      case 'left':
        base.right = '100%'
        base.top = '50%'
        base.transform = 'translate(-8px, -50%)'
        break
      case 'right':
      default:
        base.left = '100%'
        base.top = '50%'
        base.transform = 'translate(8px, -50%)'
        break
    }
    return reactStyleText(base)
  })

  // A snippet cannot tell from its value whether it renders anything, so the fallback note is in
  // the body while the note renders nothing (React's `slot(note) ?? <span>…`).
  let noteEmpty = $state(false)

  /** Keeps `noteEmpty` true exactly while the body shows no note content. */
  const trackNote: Attachment<HTMLDivElement> = (body) => {
    const sync = (): void => {
      noteEmpty = !Array.from(body.childNodes).some(
        (node) =>
          !(
            node.nodeType === 1 &&
            (node as Element).getAttribute('data-mol-id') === 'annotation-pin-popup-empty'
          ) &&
          (node.nodeType === 1 || (node.nodeType === 3 && (node.textContent ?? '').trim() !== '')),
      )
    }
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(body, { childList: true, characterData: true, subtree: true })
    return () => observer.disconnect()
  }

  /**
   * Stops the marker click from bubbling to arbitrary ancestor click handlers
   * and forwards it to `onClick`.
   *
   * @param event - The originating mouse event.
   */
  function handleMarkerClick(event: MouseEvent): void {
    event.stopPropagation()
    onClick?.()
  }
</script>

<div
  class={cm.cn(className)}
  data-mol-id="annotation-pin"
  data-pin-selected={selected ? 'true' : 'false'}
  style={wrapperStyle}
>
  <button
    type="button"
    onclick={handleMarkerClick}
    aria-label={markerLabel}
    aria-expanded={selected ? 'true' : 'false'}
    data-mol-id="annotation-pin-marker"
    class={cm.cn(cm.roundedFull, cm.cursorPointer)}
    style={markerStyle}
  >
    <span
      class={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'))}
      data-mol-id="annotation-pin-label"
      style={labelStyle}
    >
      {#if typeof label === 'function'}{@render label?.()}{:else if label !== undefined && label !== null}{label}{/if}
    </span>
  </button>
  {#if selected}
    <div
      role="dialog"
      aria-label={popupLabel}
      data-mol-id="annotation-pin-popup"
      data-popup-side={popupSide}
      class={cm.cn(cm.surface, cm.borderAll, cm.textSize('sm'))}
      style={popupStyle}
    >
      <div data-mol-id="annotation-pin-popup-body" {@attach trackNote}>
        {#if typeof note === 'function'}{@render note?.()}{:else if note !== undefined && note !== null}{note}{/if}
        {#if noteEmpty}<span data-mol-id="annotation-pin-popup-empty">{emptyNote}</span>{/if}
      </div>
    </div>
  {/if}
</div>
