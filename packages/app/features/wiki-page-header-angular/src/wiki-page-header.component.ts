/**
 * WikiPageHeader component (React parity).
 *
 * @module
 */

import type { AfterViewInit, ElementRef } from '@angular/core'
import { Component, signal, ViewChild } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-angular'

/**
 * Whether a node is something a caller can see (an element, or a non-blank
 * text node other than the updated-by span's own `·` prefix).
 *
 * @param node - The DOM node.
 * @returns True when it renders anything.
 */
const hasRenderable = (node: Node): boolean =>
  node.nodeType === Node.ELEMENT_NODE ||
  (node.nodeType === Node.TEXT_NODE &&
    (node.textContent ?? '').trim().length > 0 &&
    (node.textContent ?? '').trim() !== '·')

/**
 * Whether an element carries renderable content (a projected slot landed, or
 * its text input rendered).
 *
 * @param el - The element.
 * @returns True when its children render anything.
 */
const hasRenderableContent = (el: HTMLElement): boolean =>
  Array.from(el.childNodes).some(hasRenderable)

/**
 * Whether an element carries renderable content beyond its first text node —
 * for the updated-at span, whose first text node is the translated
 * 'Updated' prefix the span always renders when it renders at all (React
 * renders label and content together or not at all).
 *
 * @param el - The element.
 * @returns True when anything besides the prefix renders.
 */
const hasRenderableBeyondFirst = (el: HTMLElement): boolean =>
  Array.from(el.childNodes).slice(1).some(hasRenderable)

/**
 * WikiPageHeader component.
 *
 * Wiki / docs / knowledge-base page header — breadcrumb + title + meta row
 * (version, updated time/by, tags) + Edit/History action buttons. The host IS
 * the root `<header>` (`header[mol-wiki-page-header]`), matching React's root
 * exactly. The title, breadcrumb, version, updatedAt, updatedBy, tags and
 * extraActions content is projected (`[slot=<name>]`); a string input renders
 * as text. The Edit / History buttons render only when the `onEdit` /
 * `onHistory` function inputs are set; their labels and the 'Updated' meta
 * prefix go through `useTranslation()` with React's exact keys and English
 * defaults. Same props, same DOM as
 * `@molecule/app-wiki-page-header-react`'s `WikiPageHeader`.
 *
 * Angular projection needs the `<ng-content>` capture points mounted, so the
 * optional meta spans render optimistically and
 * {@link WikiPageHeader.ngAfterViewInit} withdraws the ones nothing was
 * projected into (React would not render them at all).
 */
@Component({
  selector: 'header[mol-wiki-page-header]',
  standalone: true,
  imports: [Button],
  inputs: [
    'title',
    'breadcrumb',
    'version',
    'updatedAt',
    'updatedBy',
    'tags',
    'onEdit',
    'onHistory',
    'extraActions',
    'className',
  ],
  host: {
    '[class]': 'classes()',
  },
  // prettier-ignore
  template: `<ng-content select="[slot=breadcrumb]" /><div [class]="cm().flex({ justify: 'between', align: 'start', gap: 'md', wrap: 'wrap' })"><h1 [class]="titleClass()">@if (hasTitle) {<ng-container>{{ title }}</ng-container>}<ng-content select="[slot=title]" /></h1><div [class]="cm().flex({ align: 'center', gap: 'sm' })">@if (onEdit) {<button mol-button [variant]="'ghost'" [size]="'sm'" (click)="onEdit($event)">{{ editLabel() }}</button>}@if (onHistory) {<button mol-button [variant]="'ghost'" [size]="'sm'" (click)="onHistory($event)">{{ historyLabel() }}</button>}@if (hasExtraActions) {<ng-container>{{ extraActions }}</ng-container>}<ng-content select="[slot=extraActions]" /></div></div><div [class]="cm().flex({ align: 'center', gap: 'sm', wrap: 'wrap' })">@if (showVersion) {<span #versionEl [class]="versionClass()">@if (hasVersion) {<ng-container>{{ version }}</ng-container>}<ng-content select="[slot=version]" /></span>}@if (showUpdatedAt) {<span #updatedAtEl [class]="metaTextClass()">{{ updatedAtLabel() }} @if (hasUpdatedAt) {<ng-container>{{ updatedAt }}</ng-container>}<ng-content select="[slot=updatedAt]" /></span>}@if (showUpdatedBy) {<span #updatedByEl [class]="metaTextClass()">· @if (hasUpdatedBy) {<ng-container>{{ updatedBy }}</ng-container>}<ng-content select="[slot=updatedBy]" /></span>}@if (showTags) {<span #tagsEl [class]="tagsClass()">@if (hasTags) {<ng-container>{{ tags }}</ng-container>}<ng-content select="[slot=tags]" /></span>}</div>`,
})
export class WikiPageHeader implements AfterViewInit {
  /** Page title — a string input, or `[slot=title]` projected content. */
  title?: unknown
  /** Optional breadcrumb trail — a string input, or `[slot=breadcrumb]` content. */
  breadcrumb?: unknown
  /** Version label — a string input, or `[slot=version]` content. */
  version?: unknown
  /** Last-updated display — a string input, or `[slot=updatedAt]` content. */
  updatedAt?: unknown
  /** Updated-by author display — a string input, or `[slot=updatedBy]` content. */
  updatedBy?: unknown
  /** Tag chips — a string input, or `[slot=tags]` content. */
  tags?: unknown
  /**
   * Called when the user clicks Edit (React passes the click event through
   * the UI Button; the input accepts handlers of either arity).
   */
  onEdit?: (event?: unknown) => void
  /** Called when the user clicks History. */
  onHistory?: (event?: unknown) => void
  /** Optional extra right-side actions — a string input, or `[slot=extraActions]` content. */
  extraActions?: unknown
  /** Extra classes. */
  className?: string

  /** The optional version span (projected content lands here; read once). */
  @ViewChild('versionEl') private versionEl?: ElementRef<HTMLSpanElement>
  /** The optional updated-at span. */
  @ViewChild('updatedAtEl') private updatedAtEl?: ElementRef<HTMLSpanElement>
  /** The optional updated-by span. */
  @ViewChild('updatedByEl') private updatedByEl?: ElementRef<HTMLSpanElement>
  /** The optional tags span. */
  @ViewChild('tagsEl') private tagsEl?: ElementRef<HTMLSpanElement>

  /** The i18n provider above the header (the Edit/History/Updated labels). */
  private readonly i18n = useTranslation()

  /**
   * Whether a `[slot=version]` projection landed: true (optimistically) until
   * the first view proves otherwise, false when nothing was projected, null
   * while a text version decides the span on its own.
   */
  private readonly versionProjected = signal<boolean | null>(true)
  /** The same undecided/projection read for the updated-at span. */
  private readonly updatedAtProjected = signal<boolean | null>(true)
  /** The same undecided/projection read for the updated-by span. */
  private readonly updatedByProjected = signal<boolean | null>(true)
  /** The same undecided/projection read for the tags span. */
  private readonly tagsProjected = signal<boolean | null>(true)

  /**
   * Reads the optional spans' first render: when neither a text input nor
   * projected content landed, React would not render the span at all, so the
   * optimistic render is withdrawn. View queries resolve only at view init,
   * and a projected slot's content is in place by then.
   */
  ngAfterViewInit(): void {
    const version = this.versionEl?.nativeElement
    if (version) {
      // A text version decides the span on its own (undecided: a later input
      // change must be able to withdraw it); otherwise the projection read
      // decides.
      this.versionProjected.set(this.hasVersion ? null : hasRenderableContent(version))
    }
    const updatedAt = this.updatedAtEl?.nativeElement
    if (updatedAt) {
      this.updatedAtProjected.set(this.hasUpdatedAt ? null : hasRenderableBeyondFirst(updatedAt))
    }
    const updatedBy = this.updatedByEl?.nativeElement
    if (updatedBy) {
      this.updatedByProjected.set(this.hasUpdatedBy ? null : hasRenderableContent(updatedBy))
    }
    const tags = this.tagsEl?.nativeElement
    if (tags) {
      this.tagsProjected.set(this.hasTags ? null : hasRenderableContent(tags))
    }
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the header class list (React's `cm.cn(cm.stack(2), className)`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().stack(2), this.className)
  }

  /**
   * The title's class (React's `cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))`).
   * @returns The class string.
   */
  titleClass(): string {
    return this.cm().cn(this.cm().textSize('3xl'), this.cm().fontWeight('bold'))
  }

  /**
   * The version span's class (React's
   * `cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))`).
   * @returns The class string.
   */
  versionClass(): string {
    return this.cm().cn(this.cm().textSize('xs'), this.cm().fontWeight('semibold'))
  }

  /**
   * The updated-at / updated-by spans' class (React's `cm.textSize('xs')`).
   * @returns The class string.
   */
  metaTextClass(): string {
    return this.cm().textSize('xs')
  }

  /**
   * The tags span's class (React's `cm.flex({ align: 'center', gap: 'xs' })`).
   * @returns The class string.
   */
  tagsClass(): string {
    return this.cm().flex({ align: 'center', gap: 'xs' })
  }

  /**
   * The Edit button's label.
   * @returns The translated text.
   */
  editLabel(): string {
    return this.i18n.t('wiki.edit', {}, { defaultValue: 'Edit' })
  }

  /**
   * The History button's label.
   * @returns The translated text.
   */
  historyLabel(): string {
    return this.i18n.t('wiki.history', {}, { defaultValue: 'History' })
  }

  /**
   * The updated-at prefix.
   * @returns The translated text.
   */
  updatedAtLabel(): string {
    return this.i18n.t('wiki.updatedAt', {}, { defaultValue: 'Updated' })
  }

  /**
   * Whether a text title input renders (a projected title is not).
   * @returns True when the title input renders as text.
   */
  get hasTitle(): boolean {
    return this.title !== undefined && this.title !== null
  }

  /**
   * Whether a text breadcrumb input renders.
   * @returns True when the breadcrumb input renders as text.
   */
  get hasBreadcrumb(): boolean {
    return this.breadcrumb !== undefined && this.breadcrumb !== null && this.breadcrumb !== ''
  }

  /**
   * Whether a text version input is present (React's truthy `version &&`).
   * @returns True when the version input renders as text.
   */
  get hasVersion(): boolean {
    return this.version !== undefined && this.version !== null && this.version !== ''
  }

  /**
   * Whether a text updated-at input is present (React's truthy `updatedAt &&`).
   * @returns True when the updated-at input renders as text.
   */
  get hasUpdatedAt(): boolean {
    return this.updatedAt !== undefined && this.updatedAt !== null && this.updatedAt !== ''
  }

  /**
   * Whether a text updated-by input is present (React's truthy `updatedBy &&`).
   * @returns True when the updated-by input renders as text.
   */
  get hasUpdatedBy(): boolean {
    return this.updatedBy !== undefined && this.updatedBy !== null && this.updatedBy !== ''
  }

  /**
   * Whether a text tags input is present (React's truthy `tags &&`).
   * @returns True when the tags input renders as text.
   */
  get hasTags(): boolean {
    return this.tags !== undefined && this.tags !== null && this.tags !== ''
  }

  /**
   * Whether a text extra-actions input is present.
   * @returns True when the extraActions input renders as text.
   */
  get hasExtraActions(): boolean {
    return this.extraActions !== undefined && this.extraActions !== null
  }

  /**
   * Whether the version span renders: React's `version && <span>` — a truthy
   * string input or a projected `[slot=version]` element. A plain getter, so
   * every change detection pass follows the inputs.
   * @returns True when the version span shows.
   */
  get showVersion(): boolean {
    return this.hasVersion || this.versionProjected() === true
  }

  /**
   * Whether the updated-at span renders: React's `updatedAt && <span>`.
   * @returns True when the updated-at span shows.
   */
  get showUpdatedAt(): boolean {
    return this.hasUpdatedAt || this.updatedAtProjected() === true
  }

  /**
   * Whether the updated-by span renders: React's `updatedBy && <span>`.
   * @returns True when the updated-by span shows.
   */
  get showUpdatedBy(): boolean {
    return this.hasUpdatedBy || this.updatedByProjected() === true
  }

  /**
   * Whether the tags span renders: React's `tags && <span>`.
   * @returns True when the tags span shows.
   */
  get showTags(): boolean {
    return this.hasTags || this.tagsProjected() === true
  }
}
