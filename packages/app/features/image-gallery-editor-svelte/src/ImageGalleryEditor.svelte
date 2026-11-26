<!--
  ImageGalleryEditor: the Svelte counterpart of
  `@molecule/app-image-gallery-editor-react`'s `ImageGalleryEditor` — same
  props (React names), same ClassMap tokens, same DOM. Click an empty slot or
  the drop zone to upload, or drop image files on the drop zone to fill the
  empty slots in order; click a filled slot to remove (confirmed via the
  shared `ConfirmDialog` from `@molecule/app-ui-svelte`). The drop zone and
  every slot are keyboard buttons: Enter and Space do what a click does.
  Node props (`header`, `counter`, `dropZoneTitle`, `dropZoneHint`,
  `statusMessage`) are snippets, or plain strings.
-->
<script lang="ts">
  import { fromByteArray } from 'base64-js'
  import { onDestroy, untrack } from 'svelte'
  import { SvelteSet } from 'svelte/reactivity'

  import {
    createBrowserFileInput,
    filterPickedFiles,
    fromBrowserFile,
    type PickedFile,
  } from '@molecule/app-filesystem'
  import { warn } from '@molecule/app-logger'
  import { ContentOrElse, PresentWhileContent, useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { ConfirmDialog, Icon } from '@molecule/app-ui-svelte'

  import type { ImageGalleryEditorProps } from './types.js'

  const IMAGE_ACCEPT = 'image/*'

  /** Revokes the editor's object URLs once they are no longer needed. */
  function releasePreviews(owned: Set<string>, keep: readonly (string | null)[]): void {
    for (const url of owned) {
      if (keep.includes(url)) continue
      URL.revokeObjectURL(url)
      owned.delete(url)
    }
  }

  /** Reads local previews from the portable file selection. */
  async function createPreviews(
    files: readonly PickedFile[],
    owned: Set<string>,
  ): Promise<string[]> {
    const images = await Promise.all(
      files.map(async (file) => ({ type: file.type, data: await file.arrayBuffer() })),
    )
    const useObjectUrl =
      typeof HTMLImageElement !== 'undefined' &&
      typeof URL.createObjectURL === 'function' &&
      typeof URL.revokeObjectURL === 'function'
    return images.map(({ data, type }) => {
      if (!useObjectUrl) return `data:${type};base64,${fromByteArray(new Uint8Array(data))}`
      const url = URL.createObjectURL(new Blob([data], { type }))
      owned.add(url)
      return url
    })
  }

  /** Reports a chooser or preview failure. */
  function reportSelectionError(error: unknown): void {
    warn('Image gallery could not use the selected files', { error })
  }

  let {
    slots,
    onChange,
    onPickFiles,
    maxImages = 24,
    header,
    counter,
    dropZoneTitle,
    dropZoneHint,
    confirmRemoveMessage,
    statusMessage,
    emptySlotIcon = 'image',
  }: ImageGalleryEditorProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  let uploadingSlot: number | null = null
  let removeIndex: number | null = $state(null)
  let inputEl: HTMLInputElement | undefined
  let mounted = true
  const ownedPreviews = new SvelteSet<string>()
  $effect(() => {
    const currentSlots = slots
    untrack(() => releasePreviews(ownedPreviews, currentSlots))
  })
  onDestroy(() => {
    mounted = false
    releasePreviews(ownedPreviews, [])
  })

  // Every `t(…)` runs inside a `$derived`: it reads the i18n version under the
  // hood, so this re-runs on a locale switch the way React's render-time `t`
  // calls re-run on a re-render.
  const addImageLabel = $derived(
    t('imageGalleryEditor.aria.addImage', {}, { defaultValue: 'Add image' }),
  )
  const removeImageLabel = $derived(
    t('imageGalleryEditor.aria.removeImage', {}, { defaultValue: 'Remove image' }),
  )
  const titleFallback = $derived(
    t('imageGalleryEditor.dropZone.title', {}, { defaultValue: 'Drag and drop assets here' }),
  )
  const hintFallback = $derived(
    t('imageGalleryEditor.dropZone.hint', {}, { defaultValue: 'or click to browse local files' }),
  )
  const removeMessage = $derived(
    confirmRemoveMessage ??
      t('imageGalleryEditor.remove.message', {}, { defaultValue: 'Remove this image?' }),
  )
  const removeTitle = $derived(
    t('imageGalleryEditor.remove.title', {}, { defaultValue: 'Remove image?' }),
  )

  /**
   * Delivers URLs for the ordered file selection to the chosen slot or empty slots.
   *
   * @param files - The portable files from the chooser or drop.
   * @param slot - The slot that opened the chooser, or null.
   */
  async function placeFiles(files: readonly PickedFile[], slot: number | null): Promise<void> {
    const previews = new Set<string>()
    const limit = maxImages
    try {
      const visible = slots.slice(0, Math.max(0, limit))
      const available =
        slot === null ? visible.filter((url) => url === null).length : Number(slot < visible.length)
      const urls = onPickFiles
        ? await onPickFiles(files)
        : await createPreviews(files.slice(0, available), previews)
      if (!mounted) {
        releasePreviews(previews, [])
        return
      }
      const next = [...slots]
      if (slot !== null) {
        next[slot] = urls[0] ?? null
      } else {
        for (const url of urls) {
          const index = next.findIndex((value) => value === null)
          if (index < 0 || index >= limit) break
          next[index] = url ?? null
        }
      }
      const changed = next.slice(0, limit)
      releasePreviews(previews, changed)
      for (const url of previews) ownedPreviews.add(url)
      onChange(changed)
      releasePreviews(ownedPreviews, [...slots, ...changed])
    } catch (error) {
      for (const url of previews) ownedPreviews.delete(url)
      releasePreviews(previews, [])
      reportSelectionError(error)
    }
  }

  const chooser = createBrowserFileInput(
    () => inputEl,
    () => ({
      accept: IMAGE_ACCEPT,
      onPickError: reportSelectionError,
      onFiles: (files) => {
        const slot = uploadingSlot
        uploadingSlot = null
        void placeFiles(files, slot)
      },
    }),
    fromBrowserFile,
  )

  const drop = createBrowserFileInput(
    () => inputEl,
    () => ({
      multiple: true,
      onPickError: reportSelectionError,
      onFiles: (files) => {
        const { accepted, rejected } = filterPickedFiles(files, {
          accept: IMAGE_ACCEPT,
          multiple: true,
        })
        if (rejected.length === 0) void placeFiles(accepted, null)
      },
    }),
    fromBrowserFile,
  )

  /** Opens the shared chooser at the given slot, or at the first empty slot from the hero. */
  function openPicker(index: number | null): void {
    uploadingSlot = index
    chooser.onClick({ target: null, defaultPrevented: false })
  }

  /**
   * React's `handleSlotClick`: a filled slot asks for removal through the
   * shared ConfirmDialog (window.confirm hangs headless e2e); an empty slot
   * targets the picker at it.
   *
   * @param index - The slot's position.
   */
  function handleSlotClick(index: number): void {
    if (slots[index]) {
      removeIndex = index
    } else {
      openPicker(index)
    }
  }

  /**
   * Activates a `role="button"` element from the keyboard — Enter and Space
   * run the same action the mouse click runs.
   *
   * @param event - The native keyboard event.
   * @param action - The click handler to mirror.
   */
  function activateWithKeyboard(event: KeyboardEvent, action: () => void): void {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    action()
  }
</script>

<section>
  {#if header || counter}
    <div class={cm.cn(cm.flex({ align: 'end', justify: 'between' }), cm.sp('mb', 6))}>
      <ContentOrElse>
        {#if typeof header === 'function'}{@render header?.()}{:else if header != null}{header}{/if}
        {#snippet otherwise()}<div></div>{/snippet}
      </ContentOrElse>
      {#if counter}
        <PresentWhileContent
          tag="span"
          class={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.textMuted,
            cm.uppercase,
            cm.trackingWide,
          )}
        >
          {#if typeof counter === 'function'}{@render counter?.()}{:else}{counter}{/if}
        </PresentWhileContent>
      {/if}
    </div>
  {/if}
  <div class={cm.cn(cm.grid({ cols: 12, gap: 'md', responsive: false }))}>
    <!-- Hero drop zone (spans 8/12). grid-column span, aspect ratio, corner
        radius, and the dashed affordance border are ClassMap-can't-express
        (Rule 5); each uses a real theme token, never a hardcoded color. -->
    <div
      role="button"
      tabindex="0"
      data-mol-id="image-gallery-editor-dropzone"
      onclick={() => openPicker(null)}
      onkeydown={(event) => activateWithKeyboard(event, () => openPicker(null))}
      ondragover={drop.onDragOver}
      ondrop={drop.onDrop}
      class={cm.cn(
        cm.surfaceSecondary,
        cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
        cm.cursorPointer,
      )}
      style="grid-column: span 8 / span 8; aspect-ratio: 16 / 9; border-radius: 0.75rem; border: 2px dashed var(--color-border)"
    >
      <div
        class={cm.cn(
          cm.w(16),
          cm.h(16),
          cm.bgWhite,
          cm.roundedFull,
          cm.flex({ align: 'center', justify: 'center' }),
          cm.sp('mb', 4),
        )}
      >
        <Icon name="upload" size={28} className={cm.textPrimary} />
      </div>
      <p class={cm.cn(cm.fontWeight('bold'))}>
        {#if typeof dropZoneTitle === 'function'}
          {@render dropZoneTitle?.()}
        {:else if dropZoneTitle != null}
          {dropZoneTitle}
        {:else}
          {titleFallback}
        {/if}
      </p>
      <p class={cm.cn(cm.textSize('sm'), cm.textMuted, cm.sp('mt', 1))}>
        {#if typeof dropZoneHint === 'function'}
          {@render dropZoneHint?.()}
        {:else if dropZoneHint != null}
          {dropZoneHint}
        {:else}
          {hintFallback}
        {/if}
      </p>
    </div>
    <!-- Thumbnail slot grid (spans 4/12). -->
    <div
      class={cm.cn(cm.grid({ cols: 2, gap: 'md', responsive: false }))}
      style="grid-column: span 4 / span 4"
    >
      {#each slots as url, i (i)}
        <!-- mol-bespoke-button: the role="button" is the keyboard a11y contract
             on a 1:1 image-thumbnail tile, not a CTA — aspect ratio and tile
             radius are Rule 5 inline exceptions; the button recipe does not
             style image slots. -->
        <div
          role="button"
          tabindex="0"
          data-mol-id={`image-gallery-editor-slot-${i}`}
          aria-label={url ? removeImageLabel : addImageLabel}
          onclick={() => handleSlotClick(i)}
          onkeydown={(event) => activateWithKeyboard(event, () => handleSlotClick(i))}
          class={cm.cn(cm.surfaceSecondary, cm.position('relative'), cm.cursorPointer)}
          style="aspect-ratio: 1 / 1; border-radius: 0.75rem; overflow: hidden"
        >
          {#if url}
            <!-- object-fit + a steady dim are not in the ClassMap contract
                (Rule 5). The dim lets the always-visible delete glyph read;
                the affordance is always visible — it works on touch, unlike
                the old hover-reveal. -->
            <img
              alt=""
              src={url}
              class={cm.cn(cm.w('full'), cm.h('full'))}
              style="object-fit: cover; opacity: 0.6"
            />
            <div
              class={cm.cn(
                cm.position('absolute'),
                cm.inset0,
                cm.flex({ align: 'center', justify: 'center' }),
              )}
            >
              <Icon name="trash" size={20} />
            </div>
          {:else}
            <div
              class={cm.cn(
                cm.w('full'),
                cm.h('full'),
                cm.flex({ align: 'center', justify: 'center' }),
              )}
            >
              <Icon name={emptySlotIcon} size={24} className={cm.textMuted} />
            </div>
          {/if}
        </div>
      {/each}
    </div>
  </div>
  {#if statusMessage}
    <PresentWhileContent
      tag="p"
      class={cm.cn(cm.sp('mt', 3), cm.textSize('xs'), cm.textMuted)}
      data-mol-id="image-gallery-editor-status"
    >
      {#if typeof statusMessage === 'function'}{@render statusMessage?.()}{:else}{statusMessage}{/if}
    </PresentWhileContent>
  {/if}
  <!-- Hidden trigger input. `display:none` is the robust, framework-agnostic
      hide — a raw `hidden` class never generates without an @source scan of
      THIS package. It is still `.click()`-triggered from the visible drop
      zone / slots. -->
  <input
    bind:this={inputEl}
    type="file"
    accept={IMAGE_ACCEPT}
    style="display: none"
    onchange={chooser.onChange}
  />
  <ConfirmDialog
    open={removeIndex !== null}
    onClose={() => {
      removeIndex = null
    }}
    title={removeTitle}
    description={removeMessage}
    onConfirm={() => {
      if (removeIndex === null) return
      const next = [...slots]
      next[removeIndex] = null
      onChange?.(next)
      removeIndex = null
    }}
  />
</section>
