/**
 * FileCard component (React parity).
 *
 * @module
 */

import { Component, type ElementRef, ViewChild } from '@angular/core'

import {
  MolPlacement,
  setElementPresent,
  usePlacement,
  useTranslation,
} from '@molecule/app-angular'
import { getClassMap, type UIClassMap } from '@molecule/app-ui'

import { FileIcon } from './file-icon.component.js'
import { relativeBucket, type SizeParts, sizeParts } from './format.js'
import type { FileSummary } from './types.js'

/** The translation function shape we use here — matches `useTranslation().t`. */
type TFn = (
  key: string,
  values?: Record<string, string | number | boolean | Date>,
  options?: { defaultValue?: string },
) => string

/**
 * FileCard component.
 *
 * File representation card — icon (or thumbnail), filename, formatted size,
 * relative modified date, and an optional trailing actions slot. The host IS
 * the root `<div>` (`div[mol-file-card]`), matching React's root exactly.
 *
 * Two layouts:
 * - `'grid'` (default) — square tile with the icon/thumbnail stacked above
 *   the metadata.
 * - `'row'` — horizontal line item with the icon on the left, metadata in
 *   the middle, and the actions slot on the right.
 *
 * The card's select control: a transparent native button covering the card
 * (Enter / Space activate it natively), above the content and below the
 * actions slot. A sibling of the actions, not their wrapper, so the action
 * buttons stay reachable controls (a button's children are presentational).
 * The actions are projected content (`[slot=actions]`); their wrapper
 * detaches from the DOM whenever React would not render the region.
 */
@Component({
  selector: 'div[mol-file-card]',
  standalone: true,
  hostDirectives: [MolPlacement],
  imports: [FileIcon],
  inputs: [
    'file',
    'selected',
    'onClick',
    'onContextMenu',
    'layout',
    'className',
    'dataMolId',
    'now',
  ],
  host: {
    '[class]': 'classes()',
    '[attr.role]': '"group"',
    '[attr.aria-label]': 'ariaLabel()',
    '[attr.data-mol-id]': 'rootMolId()',
    '[attr.data-selected]': 'selected ? "true" : null',
    '(contextmenu)': 'handleContextMenu($event)',
  },
  // The template's whitespace is semantic: Angular removes whitespace-only
  // text nodes between elements, and every element is glued to the previous
  // tag's close so no stray text nodes render where React's JSX has none.
  // The select button and the actions wrapper sit after the layout branches:
  // they follow the content in BOTH layouts, as React's JSX does.
  // prettier-ignore
  template: `@if (layout === 'row') {<div [class]="iconClasses()" data-mol-id="file-card-icon">@if (file.thumbnail) {<img [src]="file.thumbnail" alt="" [style.width]="'40px'" [style.height]="'40px'" [style.objectFit]="'cover'" [style.borderRadius]="'4px'" />}@else {<svg mol-file-icon [kind]="file.kind" [size]="28" />}</div><div [class]="stackClasses()" [style.flex]="'1'" [style.minWidth]="'0'"><div [class]="nameClasses()" data-mol-id="file-card-name" [style.overflow]="'hidden'" [style.textOverflow]="'ellipsis'" [style.whiteSpace]="'nowrap'">{{ file.name }}</div>@if (hasMeta()) {<div [class]="metaClasses()" data-mol-id="file-card-meta">@if (sizeText()) {<span [attr.aria-label]="sizeLabel()" data-mol-id="file-card-size">{{ sizeText() }}</span>}@if (sizeText() && modifiedText()) {<span aria-hidden="true">·</span>}@if (modifiedText()) {<span [attr.aria-label]="modifiedLabel()" data-mol-id="file-card-modified">{{ modifiedText() }}</span>}</div>}</div>}@else {<div [class]="gridIconClasses()" data-mol-id="file-card-icon" [style.aspectRatio]="'1 / 1'" [style.width]="'100%'">@if (file.thumbnail) {<img [src]="file.thumbnail" alt="" [style.width]="'100%'" [style.height]="'100%'" [style.objectFit]="'cover'" [style.borderRadius]="'4px'" />}@else {<svg mol-file-icon [kind]="file.kind" [size]="48" />}</div><div [class]="nameClasses()" data-mol-id="file-card-name" [style.overflow]="'hidden'" [style.textOverflow]="'ellipsis'" [style.whiteSpace]="'nowrap'">{{ file.name }}</div>@if (hasMeta()) {<div [class]="metaClasses()" data-mol-id="file-card-meta">@if (sizeText()) {<span [attr.aria-label]="sizeLabel()" data-mol-id="file-card-size">{{ sizeText() }}</span>}@if (sizeText() && modifiedText()) {<span aria-hidden="true">·</span>}@if (modifiedText()) {<span [attr.aria-label]="modifiedLabel()" data-mol-id="file-card-modified">{{ modifiedText() }}</span>}</div>}}@if (onClick) {<button type="button" [attr.aria-label]="ariaLabel()" [attr.aria-pressed]="selected ? 'true' : 'false'" data-mol-id="file-card-select" [class]="selectClasses()" [style.background]="'transparent'" [style.border]="'none'" [style.padding]="'0'" (click)="handleClick($event)"></button>}<div [class]="actionsClasses()" data-mol-id="file-card-actions" #actionsSlot><ng-content select="[slot=actions]"></ng-content></div>`,
})
export class FileCard {
  /** The file to render (required, as in React's props). */
  file!: FileSummary
  /** Selected highlight state. */
  selected?: boolean
  /** Click handler; React's `onClick` (a click on the select button). */
  onClick?: (file: FileSummary, event: MouseEvent) => void
  /** Context-menu (right-click) handler; React's `onContextMenu`. */
  onContextMenu?: (file: FileSummary, event: MouseEvent) => void
  /** Layout — `'grid'` (default) or `'row'`. */
  layout?: 'grid' | 'row'
  /** Extra classes merged onto the root element. */
  className?: string
  /** Override the root `data-mol-id` (defaults to `file-card-${file.id}`). */
  dataMolId?: string
  /** Reference "now" for relative-time formatting. */
  now?: Date

  /** The projected actions wrapper (always in the template; detached when unused). */
  @ViewChild('actionsSlot') actionsSlot?: ElementRef<HTMLDivElement>

  /** The `t` function, captured in the injection context at construction. */
  private readonly t: TFn

  /** Captures `t` and renders the actions wrapper only while its slot has content. */
  constructor() {
    this.t = useTranslation().t
    // React's `{actions && <div>…}`: the wrapper renders only while a consumer projects actions.
    usePlacement((hasContent) => {
      const el = this.actionsSlot?.nativeElement
      setElementPresent(el, el ? hasContent(el) : false)
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
   * The root class list: the layout's frame tokens, the relative position
   * when clickable (React's select button is absolutely positioned over it),
   * and the caller's `className`.
   * @returns The class string.
   */
  classes(): string {
    return this.layout === 'row'
      ? this.cm().cn(
          this.cm().flex({ align: 'center', gap: 'md' }),
          this.cm().sp('p', 2),
          this.onClick ? this.cm().position('relative') : undefined,
          this.className,
        )
      : this.cm().cn(
          this.cm().stack(1),
          this.cm().sp('p', 3),
          this.onClick ? this.cm().position('relative') : undefined,
          this.className,
        )
  }

  /**
   * The human-readable kind label (one literal t() key per FileKind).
   * @returns The localized kind label.
   */
  kindLabel(): string {
    switch (this.file.kind) {
      case 'image':
        return this.t('file-card.kind.image', {}, { defaultValue: 'Image file' })
      case 'video':
        return this.t('file-card.kind.video', {}, { defaultValue: 'Video file' })
      case 'audio':
        return this.t('file-card.kind.audio', {}, { defaultValue: 'Audio file' })
      case 'document':
        return this.t('file-card.kind.document', {}, { defaultValue: 'Document' })
      case 'archive':
        return this.t('file-card.kind.archive', {}, { defaultValue: 'Archive' })
      case 'code':
        return this.t('file-card.kind.code', {}, { defaultValue: 'Code file' })
      case 'folder':
        return this.t('file-card.kind.folder', {}, { defaultValue: 'Folder' })
      case 'other':
        return this.t('file-card.kind.other', {}, { defaultValue: 'File' })
    }
  }

  /**
   * The size's unit word via `t()`, with the number {@link sizeParts} already
   * displayed: one literal t() key per `SizeUnit` — the same pattern as
   * {@link kindLabel} — so the i18n gate can verify every key exists in the
   * locale bond, and the `{{n}}` placeholder lets a translation move the
   * number or rename the token (French octets, Russian КБ).
   * @param size - The size's displayed number and unit.
   * @returns The localized size text.
   */
  private sizeUnitText(size: SizeParts): string {
    const t = this.t
    switch (size.unit) {
      case 'B':
        return t('file-card.size.b', { n: size.n }, { defaultValue: '{{n}} B' })
      case 'KB':
        return t('file-card.size.kb', { n: size.n }, { defaultValue: '{{n}} KB' })
      case 'MB':
        return t('file-card.size.mb', { n: size.n }, { defaultValue: '{{n}} MB' })
      case 'GB':
        return t('file-card.size.gb', { n: size.n }, { defaultValue: '{{n}} GB' })
      case 'TB':
        return t('file-card.size.tb', { n: size.n }, { defaultValue: '{{n}} TB' })
      case 'PB':
        return t('file-card.size.pb', { n: size.n }, { defaultValue: '{{n}} PB' })
    }
  }

  /**
   * The formatted size text (empty for folders).
   * @returns The size text.
   */
  sizeText(): string {
    if (this.file.kind === 'folder') return ''
    return this.sizeUnitText(sizeParts(this.file.size))
  }

  /**
   * The size span's accessible label.
   * @returns The localized label.
   */
  sizeLabel(): string {
    return this.sizeText()
      ? this.t('file-card.aria.size', { size: this.sizeText() }, { defaultValue: 'Size {{size}}' })
      : ''
  }

  /**
   * The relative modified text via the translation keys (React's
   * `relativeText`).
   * @returns The localized relative-time string.
   */
  modifiedText(): string {
    if (!this.file.modifiedAt) return ''
    const at = this.file.modifiedAt
    const t = this.t
    const bucket = relativeBucket(at, this.now)
    switch (bucket.kind) {
      case 'just-now':
        return t('file-card.modified.just-now', {}, { defaultValue: 'just now' })
      case 'minutes':
        return t(
          bucket.n === 1 ? 'file-card.modified.minute-one' : 'file-card.modified.minute-other',
          { count: bucket.n },
          { defaultValue: bucket.n === 1 ? '1 min ago' : `${bucket.n} min ago` },
        )
      case 'hours':
        return t(
          bucket.n === 1 ? 'file-card.modified.hour-one' : 'file-card.modified.hour-other',
          { count: bucket.n },
          { defaultValue: bucket.n === 1 ? '1 hr ago' : `${bucket.n} hr ago` },
        )
      case 'days':
        return t(
          bucket.n === 1 ? 'file-card.modified.day-one' : 'file-card.modified.day-other',
          { count: bucket.n },
          { defaultValue: bucket.n === 1 ? 'yesterday' : `${bucket.n} days ago` },
        )
      case 'weeks':
        return t(
          bucket.n === 1 ? 'file-card.modified.week-one' : 'file-card.modified.week-other',
          { count: bucket.n },
          { defaultValue: bucket.n === 1 ? '1 wk ago' : `${bucket.n} wk ago` },
        )
      case 'months':
        return t(
          bucket.n === 1 ? 'file-card.modified.month-one' : 'file-card.modified.month-other',
          { count: bucket.n },
          { defaultValue: bucket.n === 1 ? '1 mo ago' : `${bucket.n} mo ago` },
        )
      case 'absolute':
        return bucket.iso
    }
  }

  /**
   * The modified span's accessible label.
   * @returns The localized label.
   */
  modifiedLabel(): string {
    return this.modifiedText()
      ? this.t(
          'file-card.aria.modified',
          { when: this.modifiedText() },
          { defaultValue: 'Modified {{when}}' },
        )
      : ''
  }

  /**
   * The root's aria label ("{{name}}, {{kind}}").
   * @returns The localized label.
   */
  ariaLabel(): string {
    return this.t(
      'file-card.aria.root',
      { name: this.file.name, kind: this.kindLabel() },
      { defaultValue: '{{name}}, {{kind}}' },
    )
  }

  /**
   * The root `data-mol-id` (React's `dataMolId ?? `file-card-${file.id}``).
   * @returns The marker id.
   */
  rootMolId(): string {
    return this.dataMolId ?? `file-card-${this.file.id}`
  }

  /**
   * Whether the meta row renders (React's `{(sizeText || modifiedText) && …}`).
   * @returns True when either text is present.
   */
  hasMeta(): boolean {
    return this.sizeText() !== '' || this.modifiedText() !== ''
  }

  /**
   * The row icon wrapper's class.
   * @returns The class string.
   */
  iconClasses(): string {
    return this.cm().cn(this.cm().shrink0)
  }

  /**
   * The grid icon wrapper's class.
   * @returns The class string.
   */
  gridIconClasses(): string {
    return this.cm().cn(this.cm().flex({ align: 'center', justify: 'center' }))
  }

  /**
   * The row content stack's class.
   * @returns The class string.
   */
  stackClasses(): string {
    return this.cm().cn(this.cm().stack(0))
  }

  /**
   * The filename's class.
   * @returns The class string.
   */
  nameClasses(): string {
    return this.cm().cn(this.cm().textSize('sm'), this.cm().fontWeight('semibold'))
  }

  /**
   * The meta row's class.
   * @returns The class string.
   */
  metaClasses(): string {
    return this.cm().cn(this.cm().flex({ align: 'center', gap: 'sm' }), this.cm().textSize('xs'))
  }

  /**
   * The select button's class.
   * @returns The class string.
   */
  selectClasses(): string {
    return this.cm().cn(this.cm().position('absolute'), this.cm().inset0, this.cm().cursorPointer)
  }

  /**
   * The actions wrapper's class (layout-dependent, as React's is).
   * @returns The class string.
   */
  actionsClasses(): string {
    return this.layout === 'row'
      ? this.cm().cn(this.cm().shrink0, this.cm().position('relative'))
      : this.cm().cn(
          this.cm().flex({ align: 'center', justify: 'end', gap: 'sm' }),
          this.cm().position('relative'),
        )
  }

  /**
   * Forward a body activation (a click on the select button, or Enter / Space
   * on it) to the consumer.
   * @param event - DOM mouse event.
   */
  handleClick(event: MouseEvent): void {
    this.onClick?.(this.file, event)
  }

  /**
   * Forward right-click to the consumer.
   * @param event - DOM mouse event.
   */
  handleContextMenu(event: MouseEvent): void {
    if (this.onContextMenu) this.onContextMenu(this.file, event)
  }
}
