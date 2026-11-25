/**
 * QuickSearchDialog component (React parity).
 *
 * @module
 */

import type { Signal } from '@angular/core'
import { Component, ElementRef, inject, type TemplateRef } from '@angular/core'

import {
  MolPlacement,
  placeContentBefore,
  setElementPresent,
  usePlacement,
  useTranslation,
} from '@molecule/app-angular'
import type { ClientSearchDocument } from '@molecule/app-client-search'
import type { SearchSession } from '@molecule/app-client-search-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Modal } from '@molecule/app-ui-angular'

import { Kbd } from './kbd.component.js'
import { SearchBox } from './search-box.component.js'
import { SearchResults } from './search-results.component.js'
import type { SearchResultLinkProps, SearchResultView } from './types.js'

/**
 * Whether a session field is a signal (what a `useSearchSession` result
 * holds) rather than a plain value.
 *
 * @param value - The session field.
 * @returns True for a signal.
 */
const isSignalValue = <T>(value: Signal<T> | T): value is Signal<T> => typeof value === 'function'

/**
 * Reads a session field, calling a signal and passing a plain value through,
 * so the dialog takes a session from `useSearchSession` or a plain object
 * alike.
 *
 * @param value - The session field.
 * @returns The value.
 */
const read = <T>(value: Signal<T> | T): T => (isSignalValue(value) ? value() : value)

/**
 * QuickSearchDialog component.
 *
 * A search dialog for `mod+k`: the box on top with focus, the hits below in
 * a scrolling pane, and the key hints in the footer. Before anything is
 * typed the pane shows `idleText` rather than a browse list. Enter opens the active
 * hit through the session (which closes the dialog by the caller's `onOpen`).
 * The dialog is named for screen readers through `label` (or the translated
 * "Search" default). React renders `null` while closed, so the host itself
 * never appears in the page: while open the modal renders in the host's place
 * and while closed nothing does.
 */
@Component({
  selector: 'mol-quick-search-dialog',
  standalone: true,
  hostDirectives: [MolPlacement],
  imports: [Kbd, Modal, SearchBox, SearchResults],
  inputs: [
    'open',
    'onClose',
    'session',
    'view',
    'placeholder',
    'examples',
    'emptyText',
    'idleText',
    'renderLink',
    'label',
    'molId',
  ],
  template: `@if (open) {
    <mol-modal
      [open]="true"
      (close)="emitClose()"
      [size]="'lg'"
      [initialFocus]="session.inputRef"
      [closeOnEscape]="false"
      [showCloseButton]="false"
      [closeLabel]="closeLabel()"
      [attr.aria-label]="label ?? dialogLabel()"
      [attr.data-mol-id]="id()"
    >
      <div
        mol-search-box
        [value]="read(session.query)"
        [onChange]="setQuery()"
        [onKeyDown]="sessionKeyDown()"
        [inputRef]="session.inputRef"
        [placeholder]="placeholder"
        [count]="read(session.active) ? read(session.hits).length : undefined"
        [filters]="read(session.parsed).filters"
        [onRemoveFilter]="removeFilter()"
        [onClear]="clearSession()"
        [examples]="examples"
        [shortcut]="null"
        [molId]="id()"
      ></div>
      <div [class]="cm().cn(cm().dialogBody)" [attr.data-mol-id]="id() + '-pane'">
        <mol-search-results
          [hits]="read(session.active) ? read(session.hits) : []"
          [view]="view"
          [activeIndex]="read(session.activeIndex)"
          [onActivate]="setActiveIndex()"
          [onOpen]="openDoc()"
          [onPrefetch]="prefetchDoc()"
          [renderLink]="renderLink"
          [emptyText]="paneEmptyText()"
          [molId]="id()"
        />
      </div>
      <p [class]="cm().cn(cm().dialogFooter, cm().resultMeta)" [attr.data-mol-id]="id() + '-keys'">
        <kbd mol-kbd>↑</kbd> <kbd mol-kbd>↓</kbd> <kbd mol-kbd>↵</kbd> <kbd mol-kbd>esc</kbd>
        {{ keysText() }}
      </p>
    </mol-modal>
  }`,
})
export class QuickSearchDialog<T extends ClientSearchDocument = ClientSearchDocument> {
  /** Whether the dialog is open. Rendered only while open. */
  open = false
  /** Close it (Escape with nothing typed, the overlay, or after opening a hit). */
  onClose?: () => void
  /** The search session (from `useSearchSession`), created with `syncUrl: false` and `onEscape: onClose`. */
  session!: SearchSession<T>
  /** How a hit renders. */
  view!: (doc: T) => SearchResultView
  /** Placeholder for the box, already translated. */
  placeholder = ''
  /** Example tokens for the tips line. */
  examples?: string[]
  /** Shown while the text matches nothing, already translated. */
  emptyText = ''
  /** Shown before anything is typed, already translated. Defaults to the empty text. */
  idleText?: string
  /** Renders each row's link; a `TemplateRef` whose context carries the link props as `$implicit`. */
  renderLink?: TemplateRef<{ $implicit: SearchResultLinkProps }>
  /**
   * The dialog's accessible name, already translated (like `placeholder`, it
   * names nothing visible). Defaults to `t('searchUi.dialogLabel')`
   * ("Search"); the field's placeholder already names the field.
   */
  label?: string
  /** `data-mol-id` prefix. Defaults to `quick-search`. */
  molId?: string

  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)

  /** i18n handle, read in an injection context. */
  readonly t = useTranslation().t

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Reads a session field, unwrapping a signal and passing a plain value
   * through.
   *
   * @param value - The session field.
   * @returns The value.
   */
  read<V>(value: Signal<V> | V): V {
    return read(value)
  }

  /**
   * The `data-mol-id` prefix (React's default parameter).
   * @returns The prefix.
   */
  id(): string {
    return this.molId ?? 'quick-search'
  }

  /**
   * The Modal's close label, translated like React passes it.
   * @returns The label.
   */
  closeLabel(): string {
    return this.t('searchUi.close', undefined, { defaultValue: 'Close' })
  }

  /**
   * The dialog's accessible name when no `label` is passed, translated like
   * React passes it.
   * @returns The default name ("Search").
   */
  dialogLabel(): string {
    return this.t('searchUi.dialogLabel', undefined, { defaultValue: 'Search' })
  }

  /**
   * The keys sentence (the footer's last text).
   * @returns The translated text.
   */
  keysText(): string {
    return this.t('searchUi.dialogKeys', undefined, {
      defaultValue: 'The arrow keys move through the results, Enter opens one, Escape closes.',
    })
  }

  /**
   * The pane's empty text: the empty text while the session is active, else
   * the idle text (which falls back to the empty text).
   * @returns The text.
   */
  paneEmptyText(): string {
    return read(this.session.active) ? this.emptyText : (this.idleText ?? this.emptyText)
  }

  /** Reports the session's `setQuery` as the box's `onChange`. */
  setQuery(): (value: string) => void {
    return (value: string) => this.session.setQuery(value)
  }

  /** Reports the session's `onKeyDown` as the box's key handling. */
  sessionKeyDown(): (event: KeyboardEvent) => void {
    return (event: KeyboardEvent) => this.session.onKeyDown(event)
  }

  /** Reports the session's `removeFilter` as the box's chip removal. */
  removeFilter(): (index: number) => void {
    return (index: number) => this.session.removeFilter(index)
  }

  /** Reports the session's `clear` as the box's clear callback. */
  clearSession(): () => void {
    return () => this.session.clear()
  }

  /** Reports the session's `setActiveIndex` as the list's activation. */
  setActiveIndex(): (index: number) => void {
    return (index: number) => this.session.setActiveIndex(index)
  }

  /** Reports the session's `open` as the list's open callback. */
  openDoc(): (doc: T) => void {
    return (doc: T) => this.session.open(doc)
  }

  /** Reports the session's `prefetch` as the list's prefetch callback. */
  prefetchDoc(): (doc: T) => void {
    return (doc: T) => this.session.prefetch(doc)
  }

  /** Closes the dialog through the caller's `onClose`. */
  emitClose(): void {
    this.onClose?.()
  }

  /** Places the projected modal in the component host's position. */
  constructor() {
    usePlacement(() => {
      // React renders the modal's content or nothing; the host is never in the page.
      placeContentBefore(this.host.nativeElement, this.host.nativeElement)
      setElementPresent(this.host.nativeElement, false)
    })
  }
}
