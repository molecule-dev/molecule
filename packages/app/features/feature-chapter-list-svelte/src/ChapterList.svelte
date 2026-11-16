<!--
  ChapterList: the Svelte counterpart of
  `@molecule/app-feature-chapter-list-react`'s `ChapterList` — a scrollable
  list of chapters with seek-to-on-click and a progress highlight for the
  chapter the playhead is currently inside. Same props (React names), same
  ClassMap tokens, same i18n keys, same DOM for the same input: each row shows
  an optional square thumbnail, the title, the timestamp and (while the row is
  the active chapter) the "Now playing" badge. `rowTrailing` arrives as a
  snippet receiving the row's chapter.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import { findActiveChapterIndex, formatTimestamp } from './timestamps.js'
  import type { Chapter, ChapterListProps } from './types.js'

  let { chapters, currentTime, onSeek, className, rowTrailing }: ChapterListProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  const regionLabel = $derived(t('chapterList.aria.region', {}, { defaultValue: 'Chapters' }))
  const emptyLabel = $derived(
    t('chapterList.empty', {}, { defaultValue: 'No chapters available for this episode.' }),
  )
  const currentBadge = $derived(t('chapterList.current', {}, { defaultValue: 'Now playing' }))
  const activeIndex = $derived(findActiveChapterIndex(chapters, currentTime))

  /**
   * React's `t('chapterList.aria.seek', { title, timestamp })`.
   *
   * @param chapter - The row's chapter.
   * @returns The translated seek label.
   */
  function seekLabel(chapter: Chapter): string {
    return t(
      'chapterList.aria.seek',
      { title: chapter.title, timestamp: formatTimestamp(chapter.startTime) },
      { defaultValue: 'Jump to {{title}} at {{timestamp}}' },
    )
  }

  /**
   * React's `t('chapterList.aria.thumbnail', { title })`.
   *
   * @param chapter - The row's chapter.
   * @returns The translated thumbnail alt text.
   */
  function thumbnailAlt(chapter: Chapter): string {
    return t(
      'chapterList.aria.thumbnail',
      { title: chapter.title },
      { defaultValue: 'Thumbnail for {{title}}' },
    )
  }

  /**
   * The row's timestamp text, with the "Now playing" badge while active.
   *
   * @param chapter - The row's chapter.
   * @param isActive - Whether this chapter is the current one.
   * @returns The timestamp line.
   */
  function timestampText(chapter: Chapter, isActive: boolean): string {
    return `${formatTimestamp(chapter.startTime)}${isActive ? ` · ${currentBadge}` : ''}`
  }
</script>

{#snippet rowContent(chapter: Chapter, isActive: boolean)}
  <div
    class={cm.cn(cm.flex({ align: 'center', gap: 'md' }), cm.sp('p', 2))}
    data-mol-id="chapter-list-row-content"
  >
    <div
      class={cm.cn(cm.shrink0)}
      data-mol-id="chapter-list-row-thumbnail"
      style="width: 48px; height: 48px"
    >
      {#if chapter.thumbnail}
        <img
          src={chapter.thumbnail}
          alt={thumbnailAlt(chapter)}
          style="width: 100%; height: 100%; object-fit: cover; border-radius: 4px"
        />
      {:else}
        <div aria-hidden="true" style="width: 100%; height: 100%; border-radius: 4px"></div>
      {/if}
    </div>
    <div
      class={cm.cn(cm.stack(0))}
      data-mol-id="chapter-list-row-meta"
      style="min-width: 0px; flex: 1 1 0%"
    >
      <span
        class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}
        data-mol-id="chapter-list-row-title"
        style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block"
        >{chapter.title}</span
      >
      <span class={cm.textSize('xs')} data-mol-id="chapter-list-row-timestamp"
        >{timestampText(chapter, isActive)}</span
      >
    </div>
    {#if rowTrailing}
      <div class={cm.cn(cm.shrink0)} data-mol-id="chapter-list-row-trailing">
        {@render rowTrailing(chapter)}
      </div>
    {/if}
  </div>
{/snippet}

{#if chapters.length === 0}
  <div
    role="region"
    aria-label={regionLabel}
    data-mol-id="chapter-list"
    class={cm.cn(cm.sp('p', 3), className)}
  >
    <p class={cm.cn(cm.textSize('sm'))} data-mol-id="chapter-list-empty">{emptyLabel}</p>
  </div>
{:else}
  <ul
    role="list"
    aria-label={regionLabel}
    data-mol-id="chapter-list"
    class={cm.cn(cm.stack(0), className)}
    style="list-style: none; padding: 0px; margin: 0px"
  >
    {#each chapters as chapter, index (chapter.id)}
      {@const isActive = index === activeIndex}
      <li
        data-mol-id="chapter-list-row"
        data-active={isActive ? 'true' : 'false'}
        data-chapter-id={chapter.id}
      >
        {#if onSeek}
          <button
            type="button"
            onclick={() => onSeek?.(chapter.startTime)}
            aria-label={seekLabel(chapter)}
            aria-current={isActive ? 'true' : undefined}
            data-mol-id="chapter-list-row-button"
            class={cm.cn(cm.cursorPointer)}
            style="display: block; width: 100%; text-align: left; background: transparent; border: medium; padding: 0px"
          >
            {@render rowContent(chapter, isActive)}
          </button>
        {:else}
          <div aria-current={isActive ? 'true' : undefined} data-mol-id="chapter-list-row-static">
            {@render rowContent(chapter, isActive)}
          </div>
        {/if}
      </li>
    {/each}
  </ul>
{/if}
