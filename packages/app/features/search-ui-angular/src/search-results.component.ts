/**
 * SearchResults component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import {
  type AfterViewInit,
  Component,
  ElementRef,
  inject,
  type SimpleChanges,
  type TemplateRef,
  ViewChild,
} from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { ClientSearchDocument } from '@molecule/app-client-search'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { Highlight } from './highlight.component.js'
import type {
  SearchResultHit,
  SearchResultLinkProps,
  SearchResultsProps,
  SearchResultView,
} from './types.js'

/**
 * The default row link is a plain anchor; the row body renders through the
 * `rowBody` template. React's root is a FRAGMENT of two nodes (the `<ul>` and
 * a visually hidden status `<p>`, or the empty text `<p>` and the status `<p>`),
 * so the host is unwrapped (`data-parity-unwrap`, `display: contents`) and
 * renders exactly React's root.
 *
 * The ranked hits: title and description with the matched terms marked, the
 * meta line, hover making a row active and warming its page. The whole row is
 * the link, so the list is a plain list of links (no listbox roles: an option's
 * children are presentational and would hide the row's link and action); the
 * active row is marked with `aria-current` on its `<li>` and announced through
 * a polite, visually hidden status region after the list.
 */
@Component({
  selector: 'mol-search-results',
  standalone: true,
  imports: [Highlight, NgTemplateOutlet],
  inputs: [
    'hits',
    'view',
    'activeIndex',
    'onActivate',
    'onOpen',
    'onPrefetch',
    'renderLink',
    'action',
    'emptyText',
    'molId',
    'className',
  ],
  host: {
    'data-parity-unwrap': '',
    style: 'display: contents',
  },
  // prettier-ignore
  template: `@if (hits.length === 0) {
      <p [class]="cm().cn(cm().resultEmpty)" [attr.data-mol-id]="id() + '-empty'">{{ emptyText }}</p>
      <!-- The status region exists before results arrive, so it is live. -->
      <p role="status" [class]="cm().cn(cm().srOnly)" [attr.data-mol-id]="id() + '-active'"></p>
    } @else {
      <ul
        #listEl
        [attr.aria-label]="t('searchUi.results', undefined, { defaultValue: 'Search results' })"
        [class]="listClasses()"
        [attr.data-mol-id]="id() + '-results'"
      >
        @for (hit of hits; track hit.id; let i = $index) {
          <li
            [attr.aria-current]="i === activeIndex ? 'true' : null"
            [attr.data-index]="i"
            [attr.data-mol-id]="id() + '-hit'"
            [attr.data-hit-id]="hit.id"
            [class]="itemClasses(i)"
            (pointerover)="onPointerOver(i, hit)"
            (focusin)="onPrefetch?.(hit.doc)"
            (touchstart)="onPrefetch?.(hit.doc)"
          >
            @if (renderLink) {
              <ng-container
                [ngTemplateOutlet]="renderLink"
                [ngTemplateOutletContext]="renderContext(linkProps(hit))"
              ></ng-container>
            } @else {
              <a
                [attr.href]="viewOf(hit).href"
                [class]="cm().cn(cm().resultBody)"
                [attr.data-mol-id]="id() + '-link'"
                (click)="openFromLink($event, hit)"
                ><ng-container
                  [ngTemplateOutlet]="rowBody"
                  [ngTemplateOutletContext]="{ $implicit: hit }"
                ></ng-container
              ></a>
            }
            @if (action) {
              <span [class]="cm().cn(cm().resultAction)"
                ><ng-container
                  [ngTemplateOutlet]="action"
                  [ngTemplateOutletContext]="renderContext(hit.doc)"
                ></ng-container
              ></span>
            }
          </li>
        }
      </ul>
      <p role="status" [class]="cm().cn(cm().srOnly)" [attr.data-mol-id]="id() + '-active'">
        {{ activeText() }}
      </p>
    }
    <ng-template #rowBody let-hit>
      <span [class]="cm().flex({ align: 'baseline', wrap: 'wrap', gap: 2 })">
        <span [class]="titleClasses(hit)">
          <mol-highlight [text]="viewOf(hit).title" [terms]="hit.terms"></mol-highlight>
        </span>
        @if (metaOf(hit).length > 0) {
          <span [class]="cm().cn(cm().resultMeta)">{{ metaOf(hit).join(' · ') }}</span>
        }
        @if (hit.related) {
          <span
            [class]="cm().cn(cm().resultMeta)"
            [attr.data-mol-id]="id() + '-related'"
            [attr.title]="relatedTitle()"
            >{{ relatedText() }}</span
          >
        }
      </span>
      @if (viewOf(hit).description) {
        <span [class]="cm().cn(cm().resultDescription, cm().displayBlock)">
          <mol-highlight [text]="viewOf(hit).description!" [terms]="hit.terms"></mol-highlight>
        </span>
      }
    </ng-template>`,
})
export class SearchResults<T extends ClientSearchDocument = ClientSearchDocument>
  implements SearchResultsProps<T>, AfterViewInit
{
  /** The hits to render. */
  hits: SearchResultHit<T>[] = []
  /** How a hit renders. */
  view!: (doc: T) => SearchResultView
  /** The keyboard- or pointer-active row, or `-1`. */
  activeIndex = -1
  /** The pointer moved onto a row. */
  onActivate?: (index: number) => void
  /** A row was chosen (a plain click, or Enter elsewhere). Navigation is the caller's. */
  onOpen!: (doc: T) => void
  /** The person is about to open a row (hover, focus, touch): warm its page. */
  onPrefetch?: (doc: T) => void
  /**
   * Renders the row's link. Defaults to a plain `<a>`; a `TemplateRef` whose
   * context carries the link props as `$implicit`.
   */
  renderLink?: TemplateRef<{ $implicit: SearchResultLinkProps }>
  /** Something at the row's end (an action button); a `TemplateRef` over the hit's document. */
  action?: TemplateRef<{ $implicit: T }>
  /** Shown when there are no hits. */
  emptyText = ''
  /** `data-mol-id` prefix: `<molId>-results`, `-hit`, `-link`, `-related`, `-empty`, `-active`. */
  molId?: string
  /** Extra classes composed onto the list. */
  className?: string

  /** The list element, read to keep the active row in view. */
  @ViewChild('listEl') listEl?: ElementRef<HTMLUListElement>
  /**
   * The row body template, handed to a custom `renderLink` as its children. Static: it sits
   * outside every block, so it exists before the first render builds the link props.
   */
  @ViewChild('rowBody', { static: true }) rowBodyTpl?: TemplateRef<{
    $implicit: SearchResultHit<T>
  }>

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
   * The `data-mol-id` prefix (React's default parameter).
   * @returns The prefix.
   */
  id(): string {
    return this.molId ?? 'search'
  }

  /**
   * A hit's view (the caller's `view` over the hit's document).
   *
   * @param hit - The hit.
   * @returns The view.
   */
  viewOf(hit: SearchResultHit<T>): SearchResultView {
    return this.view(hit.doc)
  }

  /**
   * A hit's meta facts (a copy, as React makes).
   *
   * @param hit - The hit.
   * @returns The meta list.
   */
  metaOf(hit: SearchResultHit<T>): string[] {
    return [...(this.viewOf(hit).meta ?? [])]
  }

  /**
   * The context a render template reads: the render function's first argument
   * as  and , as the kit's adapter templates declare it.
   *
   * @param arg - The render function's first argument.
   * @returns The template context.
   */
  renderContext(arg: unknown): Record<string, unknown> {
    return { $implicit: arg, a0: arg, a1: undefined, a2: undefined }
  }

  /**
   * The list's class list (`cm.resultList` + `className`).
   * @returns The class string.
   */
  listClasses(): string {
    return this.cm().cn(this.cm().resultList, this.className)
  }

  /**
   * A row's class list (`cm.resultItem`, active when the row is).
   *
   * @param index - The row's index.
   * @returns The class string.
   */
  itemClasses(index: number): string {
    return this.cm().cn(
      this.cm().resultItem,
      index === this.activeIndex && this.cm().resultItemActive,
    )
  }

  /**
   * The related badge's text, translated like React renders it.
   * @returns The text.
   */
  relatedText(): string {
    return this.t('searchUi.related', undefined, { defaultValue: 'related' })
  }

  /**
   * The related badge's tooltip, translated like React renders it.
   * @returns The title text.
   */
  relatedTitle(): string {
    return this.t('searchUi.relatedTitle', undefined, {
      defaultValue: 'Matches the meaning of your search, not its words',
    })
  }

  /**
   * The active row's announcement (title, position, count), empty when no row
   * is keyboard-active, translated like React renders it.
   * @returns The status text.
   */
  activeText(): string {
    const hit = this.activeIndex >= 0 ? this.hits[this.activeIndex] : undefined
    if (!hit) return ''
    return this.t(
      'searchUi.activeResult',
      {
        title: this.viewOf(hit).title,
        position: this.activeIndex + 1,
        count: this.hits.length,
      },
      { defaultValue: '{{title}}, {{position}} of {{count}}' },
    )
  }

  /**
   * A row title's class list (`cm.resultTitle`, monospace when the view asks).
   *
   * @param hit - The hit.
   * @returns The class string.
   */
  titleClasses(hit: SearchResultHit<T>): string {
    const v = this.viewOf(hit)
    return this.cm().cn(this.cm().resultTitle, v.mono && this.cm().resultTitleMono)
  }

  /**
   * The link props one row's link gets. `children` is the row body as a
   * `TemplateRef` and `childrenContext` the context it renders with (the
   * ready node a React `renderLink` receives has no Angular equivalent).
   *
   * @param hit - The hit.
   * @returns The link props.
   */
  linkProps(hit: SearchResultHit<T>): SearchResultLinkProps {
    const v = this.viewOf(hit)
    return {
      href: v.href,
      state: v.state,
      className: this.cm().resultBody,
      'data-mol-id': `${this.id()}-link`,
      children: this.rowBodyTpl,
      childrenContext: { $implicit: hit },
      onClick: (event: MouseEvent) => {
        // A modified click opens a new tab; the router handles the rest.
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0)
          return
        event.preventDefault()
        this.onOpen(hit.doc)
      },
    }
  }

  /**
   * Opens a hit for a plain click on the default anchor.
   *
   * @param event - The click event.
   * @param hit - The hit.
   */
  openFromLink(event: MouseEvent, hit: SearchResultHit<T>): void {
    // A modified click opens a new tab; the router handles the rest.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0)
      return
    event.preventDefault()
    this.onOpen(hit.doc)
  }

  /**
   * A pointer moving onto a row makes it active and warms its page, as
   * React's `onPointerEnter` does.
   *
   * @param index - The row's index.
   * @param hit - The hit.
   */
  onPointerOver(index: number, hit: SearchResultHit<T>): void {
    this.onActivate?.(index)
    this.onPrefetch?.(hit.doc)
  }

  /**
   * Keeps the keyboard-active row in view, the way React's effect keyed on
   * `activeIndex` does.
   *
   * @param changes - The changed inputs.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['activeIndex']) this.keepInView()
  }

  /** Keeps the active row in view after the list first renders, and adopts the rendered root. */
  ngAfterViewInit(): void {
    this.adopt()
    this.keepInView()
  }

  /**
   * Adopts the rendered root beside the host on every check (a props step may
   * re-render it), the way the kit's session gate and the UI kit's Tooltip
   * adopt theirs: React's root is a fragment, so the focus path and the real
   * DOM must not carry the host between the app and the list.
   */
  ngDoCheck(): void {
    this.adopt()
  }

  /** The host element (the unwrapped wrapper holding React's root). */
  private readonly hostEl: HTMLElement = inject(ElementRef<HTMLElement>).nativeElement

  /** Moves the rendered root beside the host, so the host stays empty. */
  private adopt(): void {
    const parent = this.hostEl.parentNode
    if (!parent) return
    for (const node of Array.from(this.hostEl.childNodes)) parent.insertBefore(node, this.hostEl)
  }

  /** Scrolls the active row into view when there is one. */
  private keepInView(): void {
    const index = this.activeIndex
    if (index < 0) return
    const el = this.listEl?.nativeElement.querySelector<HTMLElement>(`[data-index="${index}"]`)
    el?.scrollIntoView?.({ block: 'nearest' })
  }
}
