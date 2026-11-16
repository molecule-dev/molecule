/**
 * ChapterList component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component, type TemplateRef } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { findActiveChapterIndex, formatTimestamp } from './timestamps.js'
import type { Chapter } from './types.js'

/**
 * ChapterList component.
 *
 * Scrollable list of chapters with seek-to-on-click and a progress highlight
 * for the chapter the playhead is currently inside, the Angular counterpart of
 * `@molecule/app-feature-chapter-list-react`: the same props (React names), the
 * same ClassMap tokens, the same i18n keys and the same DOM for the same input.
 *
 * React's root element flips between `<div role="region">` (no chapters) and
 * `<ul role="list">` (chapters), so the host is a neutral wrapper the DOM
 * normalizer unwraps (`data-parity-unwrap`): the rendered root is the host's
 * only child, exactly React's root.
 *
 * All styling routes through `getClassMap()` (no raw class names). All
 * user-visible text routes through `t()` so the list translates via the
 * companion `@molecule/app-locales-feature-chapter-list` locale bond.
 */
@Component({
  selector: 'mol-chapter-list',
  standalone: true,
  imports: [NgTemplateOutlet],
  inputs: ['chapters', 'currentTime', 'onSeek', 'className', 'rowTrailing'],
  host: { 'data-parity-unwrap': '', style: 'display: contents' },
  template: `@if (chapters.length === 0) {
      <div
        role="region"
        [attr.aria-label]="regionLabel()"
        data-mol-id="chapter-list"
        [class]="emptyRootClasses()"
      >
        <p [class]="emptyMessageClasses()" data-mol-id="chapter-list-empty">{{ emptyLabel() }}</p>
      </div>
    } @else {
      <ul
        role="list"
        [attr.aria-label]="regionLabel()"
        data-mol-id="chapter-list"
        [class]="listClasses()"
        style="list-style: none; padding: 0px; margin: 0px"
      >
        @for (chapter of chapters; track chapter.id; let i = $index) {
          <li
            data-mol-id="chapter-list-row"
            [attr.data-active]="isActive(i) ? 'true' : 'false'"
            [attr.data-chapter-id]="chapter.id"
          >
            @if (onSeek) {
              <button
                type="button"
                (click)="seek(chapter)"
                [attr.aria-label]="seekLabel(chapter)"
                [attr.aria-current]="isActive(i) ? 'true' : null"
                data-mol-id="chapter-list-row-button"
                [class]="buttonClasses()"
                style="display: block; width: 100%; text-align: left; background: transparent; border: medium; padding: 0px"
              >
                <ng-container
                  [ngTemplateOutlet]="rowBody"
                  [ngTemplateOutletContext]="rowContext(chapter, i)"
                ></ng-container>
              </button>
            } @else {
              <div
                [attr.aria-current]="isActive(i) ? 'true' : null"
                data-mol-id="chapter-list-row-static"
              >
                <ng-container
                  [ngTemplateOutlet]="rowBody"
                  [ngTemplateOutletContext]="rowContext(chapter, i)"
                ></ng-container>
              </div>
            }
          </li>
        }
      </ul>
    }
    <ng-template #rowBody let-chapter="chapter" let-active="isActive">
      <div [class]="rowContentClasses()" data-mol-id="chapter-list-row-content">
        <div
          [class]="thumbnailWrapClasses()"
          data-mol-id="chapter-list-row-thumbnail"
          style="width: 48px; height: 48px"
        >
          @if (chapter.thumbnail) {
            <img
              [attr.src]="chapter.thumbnail"
              [attr.alt]="thumbnailAlt(chapter)"
              style="width: 100%; height: 100%; object-fit: cover; border-radius: 4px"
            />
          } @else {
            <div aria-hidden="true" style="width: 100%; height: 100%; border-radius: 4px"></div>
          }
        </div>
        <div
          [class]="metaClasses()"
          data-mol-id="chapter-list-row-meta"
          style="min-width: 0px; flex: 1 1 0%"
        >
          <span
            [class]="titleClasses()"
            data-mol-id="chapter-list-row-title"
            style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block"
            >{{ chapter.title }}</span
          >
          <span [class]="timestampClasses()" data-mol-id="chapter-list-row-timestamp">{{
            timestampText(chapter, active)
          }}</span>
        </div>
        @if (rowTrailing) {
          <div [class]="trailingClasses()" data-mol-id="chapter-list-row-trailing">
            <ng-container
              [ngTemplateOutlet]="rowTrailing"
              [ngTemplateOutletContext]="trailingContext(chapter)"
            ></ng-container>
          </div>
        }
      </div>
    </ng-template>`,
})
export class ChapterList {
  /** Chapters to render, in start-time order (React's `chapters`). */
  chapters: Chapter[] = []
  /** Current playback time in seconds (React's `currentTime`). */
  currentTime = 0
  /** Called with the chapter's `startTime` when a row is activated. */
  onSeek?: (startTime: number) => void
  /** Extra classes merged onto the root element. */
  className?: string
  /** Per-row trailing template; its context has `a0` = the row's chapter. */
  rowTrailing?: TemplateRef<unknown>

  /** The i18n handle (locale-reactive), read in an injection context. */
  private readonly i18n = useTranslation()

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The index of the active chapter for the current playback time.
   * @returns The index, or `-1`.
   */
  activeIndex(): number {
    return findActiveChapterIndex(this.chapters, this.currentTime)
  }

  /**
   * Whether the chapter at this index is the active one.
   *
   * @param index - The row's index.
   * @returns True for the highlighted chapter.
   */
  isActive(index: number): boolean {
    return index === this.activeIndex()
  }

  /**
   * Calls React's `onSeek(chapter.startTime)` for a clicked row.
   *
   * @param chapter - The clicked chapter.
   */
  seek(chapter: Chapter): void {
    this.onSeek?.(chapter.startTime)
  }

  /**
   * The translated region / list label.
   * @returns The label.
   */
  regionLabel(): string {
    return this.i18n.t('chapterList.aria.region', {}, { defaultValue: 'Chapters' })
  }

  /**
   * The translated empty-state message.
   * @returns The message.
   */
  emptyLabel(): string {
    return this.i18n.t(
      'chapterList.empty',
      {},
      { defaultValue: 'No chapters available for this episode.' },
    )
  }

  /**
   * React's `t('chapterList.aria.seek', { title, timestamp })` for a row.
   *
   * @param chapter - The row's chapter.
   * @returns The translated seek label.
   */
  seekLabel(chapter: Chapter): string {
    return this.i18n.t(
      'chapterList.aria.seek',
      { title: chapter.title, timestamp: formatTimestamp(chapter.startTime) },
      { defaultValue: 'Jump to {{title}} at {{timestamp}}' },
    )
  }

  /**
   * React's `t('chapterList.aria.thumbnail', { title })` for a row.
   *
   * @param chapter - The row's chapter.
   * @returns The translated thumbnail alt text.
   */
  thumbnailAlt(chapter: Chapter): string {
    return this.i18n.t(
      'chapterList.aria.thumbnail',
      { title: chapter.title },
      { defaultValue: 'Thumbnail for {{title}}' },
    )
  }

  /**
   * The row's timestamp text, with the "Now playing" badge while active.
   *
   * @param chapter - The row's chapter.
   * @param active - Whether this chapter is the current one.
   * @returns The timestamp line.
   */
  timestampText(chapter: Chapter, active: boolean): string {
    const badge = this.i18n.t('chapterList.current', {}, { defaultValue: 'Now playing' })
    return `${formatTimestamp(chapter.startTime)}${active ? ` · ${badge}` : ''}`
  }

  /**
   * The template context for one row.
   *
   * @param chapter - The row's chapter.
   * @param index - The row's index.
   * @returns The row-body template context.
   */
  rowContext(chapter: Chapter, index: number): Record<string, unknown> {
    return { chapter, isActive: this.isActive(index) }
  }

  /**
   * The template context for a row's trailing slot (React calls
   * `rowTrailing(chapter)`).
   *
   * @param chapter - The row's chapter.
   * @returns The trailing template context.
   */
  trailingContext(chapter: Chapter): Record<string, unknown> {
    return { a0: chapter }
  }

  /**
   * The empty-state root's class list (`cm.sp('p', 3)` + `className`).
   * @returns The class string.
   */
  emptyRootClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.sp('p', 3), this.className)
  }

  /**
   * The empty-state message's class list (`cm.textSize('sm')`).
   * @returns The class string.
   */
  emptyMessageClasses(): string {
    return this.cm().cn(this.cm().textSize('sm'))
  }

  /**
   * The populated list's class list (`cm.stack(0)` + `className`).
   * @returns The class string.
   */
  listClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.stack(0), this.className)
  }

  /**
   * The seek button's class list (`cm.cursorPointer`).
   * @returns The class string.
   */
  buttonClasses(): string {
    return this.cm().cn(this.cm().cursorPointer)
  }

  /**
   * The row content's class list (`cm.flex(...)` + `cm.sp('p', 2)`).
   * @returns The class string.
   */
  rowContentClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.flex({ align: 'center', gap: 'md' }), cm.sp('p', 2))
  }

  /**
   * The thumbnail wrapper's class list (`cm.shrink0`).
   * @returns The class string.
   */
  thumbnailWrapClasses(): string {
    return this.cm().cn(this.cm().shrink0)
  }

  /**
   * The row meta column's class list (`cm.stack(0)`).
   * @returns The class string.
   */
  metaClasses(): string {
    return this.cm().cn(this.cm().stack(0))
  }

  /**
   * The row title's class list (`cm.textSize('sm')` + `cm.fontWeight('semibold')`).
   * @returns The class string.
   */
  titleClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))
  }

  /**
   * The row timestamp's class list (`cm.textSize('xs')`).
   * @returns The class string.
   */
  timestampClasses(): string {
    return this.cm().textSize('xs')
  }

  /**
   * The trailing slot's class list (`cm.shrink0`).
   * @returns The class string.
   */
  trailingClasses(): string {
    return this.cm().cn(this.cm().shrink0)
  }
}
