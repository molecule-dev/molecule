<!--
  FileDropzone: the Svelte counterpart of
  `@molecule/app-file-dropzone-react`'s `FileDropzone` — drag-drop +
  click-to-browse file picker with accept / max-size filtering. Same props,
  same DOM for the same input; node content is a snippet, and every visible
  string goes through `t()` so a locale switch re-renders it.
-->
<script lang="ts">
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

  // Every `t(…)` runs inside a `$derived`: it reads the i18n version under the
  // hood, so this re-runs on a locale switch the way React's render-time `t`
  // calls re-run on a re-render.
  const dropHere = $derived(
    t('fileDropzone.dropHere', {}, { defaultValue: 'Drop files here or click to browse' }),
  )
  const acceptsLabel = $derived(
    accept ? t('fileDropzone.accepts', { accept }, { defaultValue: 'Accepts: {{accept}}' }) : '',
  )

  /**
   * Filters a file list into kept and rejected files, exactly as React does: a
   * file over `maxSize` is rejected, then a file matching neither the accept
   * extension nor the accept MIME token is rejected (`'*'` accepts everything).
   *
   * @param raw - The files the user dropped or picked.
   * @returns The kept and rejected files.
   */
  function filter(raw: FileList | File[]): { kept: File[]; rejected: File[] } {
    const arr = Array.from(raw)
    const kept: File[] = []
    const rejected: File[] = []
    for (const f of arr) {
      if (maxSize && f.size > maxSize) {
        rejected.push(f)
        continue
      }
      // cheap accept check
      if (accept) {
        const okByExt = accept
          .split(',')
          .some(
            (a) =>
              a.trim() && f.name.toLowerCase().endsWith(a.trim().toLowerCase().replace(/^\./, '.')),
          )
        const okByMime = accept
          .split(',')
          .some(
            (a) =>
              a.trim() &&
              f.type &&
              (f.type === a.trim() ||
                (a.trim().endsWith('/*') && f.type.startsWith(a.trim().replace('/*', '/')))),
          )
        if (!okByExt && !okByMime && accept !== '*') {
          rejected.push(f)
          continue
        }
      }
      kept.push(f)
    }
    return { kept, rejected }
  }

  /**
   * Filters the given file list and dispatches kept/rejected files to the
   * callbacks — only the first kept file unless `multiple` is set.
   *
   * @param list - The files from the drop or the hidden input.
   */
  function dispatch(list: FileList | File[]): void {
    const { kept, rejected } = filter(list)
    if (kept.length > 0) onFiles(multiple ? kept : [kept[0]!])
    if (rejected.length > 0) onRejected?.(rejected)
  }

  /** Opens the native file dialog through the hidden input. */
  function openDialog(): void {
    inputEl?.click()
  }

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
    if (!disabled) {
      event.preventDefault()
      dragging = true
    }
  }}
  ondragleave={() => {
    dragging = false
  }}
  ondrop={(event) => {
    event.preventDefault()
    dragging = false
    if (!disabled && event.dataTransfer?.files) dispatch(event.dataTransfer.files)
  }}
  onclick={() => {
    if (!disabled) openDialog()
  }}
  onkeydown={(event) => {
    // role="button" gets no native keyboard activation — wire Enter/Space to
    // open the file dialog so keyboard users can browse (preventDefault stops
    // Space from scrolling the page).
    if (disabled) return
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault()
      openDialog()
    }
  }}
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
    onchange={(event) => {
      const files = event.currentTarget.files
      if (files) dispatch(files)
    }}
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
