<!--
  FileDropzone: the Svelte counterpart of
  `@molecule/app-file-dropzone-react`'s `FileDropzone` — drag-drop +
  click-to-browse file picker with accept / max-size filtering. Same props,
  same DOM for the same input; node content is a snippet, and every visible
  string goes through `t()` so a locale switch re-renders it.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
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
  let inputEl: HTMLInputElement | undefined

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
  {:else}
    <p class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>{dropHere}</p>
    {#if accept}
      <p class={cm.cn(cm.textSize('xs'), cm.sp('mt', 1))}>{acceptsLabel}</p>
    {/if}
  {/if}
</div>
