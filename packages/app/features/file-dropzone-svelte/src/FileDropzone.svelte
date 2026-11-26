<!--
  FileDropzone: the Svelte counterpart of
  `@molecule/app-file-dropzone-react`'s `FileDropzone` — drag-drop +
  click-to-browse file picker with accept / max-size filtering. Same props,
  same DOM for the same input; node content is a snippet, and every visible
  string goes through `t()` so a locale switch re-renders it.
-->
<script lang="ts">
  import { createBrowserFileInput } from '@molecule/app-filesystem'
  import { contentNodes, useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import type { FileDropzoneProps } from './types.js'

  let {
    onFiles,
    accept,
    multiple = false,
    maxSize,
    onRejected,
    children,
    disabled,
    className,
  }: FileDropzoneProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  let dragging = $state(false)
  let inputEl = $state<HTMLInputElement | undefined>()
  const handlers = createBrowserFileInput(
    () => inputEl,
    () => ({ accept, disabled, maxSize, multiple, onFiles, onRejected }),
    (file) => file,
  )

  // Every `t(…)` runs inside a `$derived`: it reads the i18n version under the
  // hood, so this re-runs on a locale switch the way React's render-time `t`
  // calls re-run on a re-render.
  const dropHere = $derived(
    t('fileDropzone.dropHere', {}, { defaultValue: 'Drop files here or click to browse' }),
  )
  const acceptsLabel = $derived(
    accept ? t('fileDropzone.accepts', { accept }, { defaultValue: 'Accepts: {{accept}}' }) : '',
  )

  /** The base (not dragging) drop-surface style — React's dashed drop region. */
  const baseStyle =
    'border: 2px dashed var(--mol-color-border, rgba(128,128,128,0.35)); border-radius: 12px; min-height: 140px'
  /** The drag-over style: the border thickens and the fill tints. */
  const draggingStyle =
    'border: 2px dashed var(--mol-color-primary, #3366ff); border-radius: 12px; min-height: 140px; background: color-mix(in srgb, var(--mol-color-primary, #3366ff) 6%, transparent)'

  // React's `children ?? default copy`: a children snippet that renders nothing (an empty list)
  // falls back to the default copy, like an omitted one. A snippet's `{#each}` over no rows
  // changes the DOM without changing the prop, so presence is read from the rendered DOM (the
  // input and the default copy are this component's own nodes, not the children).
  let rootEl = $state<HTMLDivElement | null>(null)
  let dropHereEl = $state<HTMLParagraphElement | null>(null)
  let acceptsEl = $state<HTMLParagraphElement | null>(null)
  let childrenRenders = $state(false)
  $effect(() => {
    const element = rootEl
    if (!element) return
    const own = new Set<Node | null>([inputEl ?? null, dropHereEl, acceptsEl])
    const sync = (): void => {
      const present = contentNodes(element).some(
        (node) => !own.has(node) && (node.nodeType === 1 || (node.textContent ?? '').trim() !== ''),
      )
      if (present !== childrenRenders) childrenRenders = present
    }
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(element, { childList: true, characterData: true, subtree: true })
    return () => observer.disconnect()
  })
</script>

<div
  ondragover={(event) => {
    if (handlers.onDragOver(event)) dragging = true
  }}
  ondragleave={() => {
    dragging = false
  }}
  ondrop={(event) => {
    dragging = false
    handlers.onDrop(event)
  }}
  onclick={handlers.onClick}
  onkeydown={handlers.onKeyDown}
  data-mol-id="file-dropzone"
  role="button"
  tabindex="0"
  aria-disabled={disabled}
  bind:this={rootEl}
  class={cm.cn(
    cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
    cm.sp('p', 6),
    cm.textCenter,
    !disabled ? cm.cursorPointer : undefined,
    className,
  )}
  style={dragging ? draggingStyle : baseStyle}
>
  <input
    bind:this={inputEl}
    type="file"
    {accept}
    {multiple}
    {disabled}
    onchange={handlers.onChange}
    style="display: none"
  />
  {#if children}
    {@render children?.()}
  {/if}
  {#if !childrenRenders}
    <p bind:this={dropHereEl} class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
      {dropHere}
    </p>
    {#if accept}
      <p bind:this={acceptsEl} class={cm.cn(cm.textSize('xs'), cm.sp('mt', 1))}>{acceptsLabel}</p>
    {/if}
  {/if}
</div>
