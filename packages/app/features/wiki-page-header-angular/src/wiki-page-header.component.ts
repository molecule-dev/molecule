/**
 * WikiPageHeader component (React parity).
 *
 * @module
 */

import type { ElementRef } from '@angular/core'
import { Component, ViewChild } from '@angular/core'

import {
  MolPlacement,
  setElementPresent,
  usePlacement,
  useTranslation,
} from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-angular'

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
 * The optional meta spans stay in the template so their `<ng-content>`
 * captures always exist, and leave the page while they render neither a text
 * input nor projected content, as React renders no span for a falsy prop.
 */
@Component({
  selector: 'header[mol-wiki-page-header]',
  standalone: true,
  hostDirectives: [MolPlacement],
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
  template: `<ng-content select="[slot=breadcrumb]" /><div [class]="cm().flex({ justify: 'between', align: 'start', gap: 'md', wrap: 'wrap' })"><h1 [class]="titleClass()">@if (hasTitle) {<ng-container>{{ title }}</ng-container>}<ng-content select="[slot=title]" /></h1><div [class]="cm().flex({ align: 'center', gap: 'sm' })">@if (onEdit) {<button mol-button [variant]="'ghost'" [size]="'sm'" (click)="onEdit($event)">{{ editLabel() }}</button>}@if (onHistory) {<button mol-button [variant]="'ghost'" [size]="'sm'" (click)="onHistory($event)">{{ historyLabel() }}</button>}@if (hasExtraActions) {<ng-container>{{ extraActions }}</ng-container>}<ng-content select="[slot=extraActions]" /></div></div><div [class]="cm().flex({ align: 'center', gap: 'sm', wrap: 'wrap' })"><span #versionEl [class]="versionClass()">@if (hasVersion) {<ng-container>{{ version }}</ng-container>}<ng-content select="[slot=version]" /></span><span #updatedAtEl [class]="metaTextClass()">{{ updatedAtLabel() }} @if (hasUpdatedAt) {<ng-container>{{ updatedAt }}</ng-container>}<ng-content select="[slot=updatedAt]" /></span><span #updatedByEl [class]="metaTextClass()">· @if (hasUpdatedBy) {<ng-container>{{ updatedBy }}</ng-container>}<ng-content select="[slot=updatedBy]" /></span><span #tagsEl [class]="tagsClass()">@if (hasTags) {<ng-container>{{ tags }}</ng-container>}<ng-content select="[slot=tags]" /></span></div>`,
})
export class WikiPageHeader {
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

  /** The version span (its text input or projected slot decides its presence). */
  @ViewChild('versionEl', { static: true }) private versionEl?: ElementRef<HTMLSpanElement>
  /** The updated-at span (its text input or projected slot decides its presence). */
  @ViewChild('updatedAtEl', { static: true }) private updatedAtEl?: ElementRef<HTMLSpanElement>
  /** The updated-by span (its text input or projected slot decides its presence). */
  @ViewChild('updatedByEl', { static: true }) private updatedByEl?: ElementRef<HTMLSpanElement>
  /** The tags span (its text input or projected slot decides its presence). */
  @ViewChild('tagsEl', { static: true }) private tagsEl?: ElementRef<HTMLSpanElement>

  /** The i18n provider above the header (the Edit/History/Updated labels). */
  private readonly i18n = useTranslation()

  /**
   * Keeps each optional meta span on the page only while it renders a text
   * input or projected `[slot=<name>]` content, re-decided whenever either
   * changes (a slot taken away and given back included). React renders no span
   * when its prop is falsy. The updated-at and updated-by spans own leading
   * text (`Updated`, `·`) before their slot, which is not content.
   */
  constructor() {
    usePlacement((hasContent) => {
      const version = this.versionEl?.nativeElement
      setElementPresent(version, this.hasVersion || (version ? hasContent(version) : false))
      const updatedAt = this.updatedAtEl?.nativeElement
      setElementPresent(
        updatedAt,
        this.hasUpdatedAt || (updatedAt ? hasContent(updatedAt, 1) : false),
      )
      const updatedBy = this.updatedByEl?.nativeElement
      setElementPresent(
        updatedBy,
        this.hasUpdatedBy || (updatedBy ? hasContent(updatedBy, 1) : false),
      )
      const tags = this.tagsEl?.nativeElement
      setElementPresent(tags, this.hasTags || (tags ? hasContent(tags) : false))
    })
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
}
