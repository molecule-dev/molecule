/**
 * SearchResults component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import {
  type AfterViewChecked,
  Component,
  Directive,
  ElementRef,
  inject,
  type TemplateRef,
  ViewChild,
} from '@angular/core'

import {
  MolPlacement,
  placeContentBefore,
  setElementPresent,
  usePlacement,
  useTranslation,
} from '@molecule/app-angular'
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

/** One row's hover state, kept for as long as its element is rendered. */
interface HoverState {
  /** A mouse or a pen is over the row. */
  inside: boolean
  /** The last entry was a finger, so the mouse event a browser sends after it is not a hover. */
  fromTouch: boolean
}

/** Each row's hover state, by its element. */
const hoverStates = new WeakMap<Element, HoverState>()

/**
 * Whether a row's `over` or `out` event crossed the row's edge. React derives
 * its enter and leave events from these pairs through `relatedTarget`, so a
 * move between two of the row's own children is neither.
 *
 * @param event - The row's pointer or mouse `over`/`out` event.
 * @returns True when the other end of the move lies outside the row.
 */
const crossesRowEdge = (event: PointerEvent | MouseEvent): boolean => {
  const other = event.relatedTarget
  return !(other instanceof Node && (event.currentTarget as Node).contains(other))
}

/**
 * Registers its row's element with the results list under the hit's id, for as
 * long as the row is rendered: the per-row `ref` React's list hands each row.
 */
@Directive({
  selector: '[molResultsRow]',
  standalone: true,
  inputs: ['hitId: molResultsRow'],
})
class ResultsRow {
  /** The id of the hit the row shows. */
  hitId = ''
  /** The row's element. */
  private readonly el = inject(ElementRef<HTMLElement>)
  /** The list the row belongs to. */
  private readonly list = inject(SearchResults)

  /** Hands the list the row's element. */
  ngOnInit(): void {
    this.list.registerRow(this.hitId, this.el.nativeElement)
  }

  /** Takes it back as the row leaves the list. */
  ngOnDestroy(): void {
    this.list.unregisterRow(this.hitId, this.el.nativeElement)
  }
}

/**
 * The default row link is a plain anchor; the row body renders through the
 * `rowBody` template. React's root is a FRAGMENT of two nodes (the `<ul>` and
 * a visually hidden status `<p>`, or the empty text `<p>` and the status `<p>`),
 * so those nodes render in the host's place and the host itself never appears
 * in the page.
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
  hostDirectives: [MolPlacement],
  imports: [Highlight, NgTemplateOutlet, ResultsRow],
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
  // prettier-ignore
  template: `@if (hits.length === 0) {
      <p [class]="cm().cn(cm().resultEmpty)" [attr.data-mol-id]="id() + '-empty'">{{ emptyText }}</p>
      <!-- The status region exists before results arrive, so it is live. -->
      <p role="status" [class]="cm().cn(cm().srOnly)" [attr.data-mol-id]="id() + '-active'"></p>
    } @else {
      <ul
        [attr.aria-label]="t('searchUi.results', undefined, { defaultValue: 'Search results' })"
        [class]="listClasses()"
        [attr.data-mol-id]="id() + '-results'"
      >
        @for (hit of hits; track hit.id; let i = $index) {
          <li
            [molResultsRow]="hit.id"
            [attr.aria-current]="i === activeIndex ? 'true' : null"
            [attr.data-index]="i"
            [attr.data-mol-id]="id() + '-hit'"
            [attr.data-hit-id]="hit.id"
            [class]="itemClasses(i)"
            (pointerover)="onRowHover($event, true, i, hit)"
            (pointerout)="onRowHover($event, false, i, hit)"
            (mouseover)="onRowHover($event, true, i, hit)"
            (mouseout)="onRowHover($event, false, i, hit)"
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
  implements SearchResultsProps<T>, AfterViewChecked
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
   * Handles a row's pointer or mouse `over` and `out` events the way React's
   * kit handles its `onMouseEnter`: a mouse or a pen entering makes the row
   * active and warms its page once per entry. A finger is not a hover, and
   * neither is the mouse event a browser sends after one.
   *
   * @param event - The row's `over` or `out` event.
   * @param entered - Whether the pointer moved onto the row (true) or off it.
   * @param index - The row's index.
   * @param hit - The row's hit.
   */
  onRowHover(
    event: PointerEvent | MouseEvent,
    entered: boolean,
    index: number,
    hit: SearchResultHit<T>,
  ): void {
    if (!crossesRowEdge(event)) return
    const row = event.currentTarget as HTMLElement
    const state = hoverStates.get(row) ?? { inside: false, fromTouch: false }
    hoverStates.set(row, state)
    if ('pointerType' in event) {
      state.fromTouch = event.pointerType === 'touch'
      if (state.fromTouch) return
    } else if (state.fromTouch) {
      // A compatibility mouse entry after a touch is not a hover.
      return
    }
    if (state.inside === entered) return
    state.inside = entered
    if (entered) {
      this.onActivate?.(index)
      this.onPrefetch?.(hit.doc)
    }
  }

  /** The rendered rows, by the id of the hit each one shows. */
  private readonly rows = new Map<string, HTMLElement>()

  /** The active row the last view check revealed for: its index and the id of the hit in it. */
  private revealedFor: { index: number; id: string | undefined } | null = null

  /**
   * Registers a row's element under its hit's id (each row's `ResultsRow`, as React's
   * per-row `ref` does).
   *
   * @param id - The id of the hit the row shows.
   * @param el - The row's element.
   */
  registerRow(id: string, el: HTMLElement): void {
    this.rows.set(id, el)
  }

  /**
   * Forgets a row as it leaves the list.
   *
   * @param id - The id of the hit the row showed.
   * @param el - The row's element.
   */
  unregisterRow(id: string, el: HTMLElement): void {
    if (this.rows.get(id) === el) this.rows.delete(id)
  }

  /**
   * Keeps the active row in view: when the list first renders, and whenever the
   * active hit changes (a new result list can replace the row under an index
   * that stays the same). React's effect depends on the active row's index and
   * on the hit at it, so rendering the same results again reveals nothing.
   */
  ngAfterViewChecked(): void {
    const index = this.activeIndex
    const id = index >= 0 ? this.hits[index]?.id : undefined
    const last = this.revealedFor
    if (last && last.index === index && last.id === id) return
    this.revealedFor = { index, id }
    if (id === undefined) return
    this.rows.get(id)?.scrollIntoView?.({ block: 'nearest' })
  }

  /** The host element (kept out of the page; React renders only the fragment's nodes). */
  private readonly hostEl: HTMLElement = inject(ElementRef<HTMLElement>).nativeElement

  constructor() {
    usePlacement(() => this.adopt())
  }

  /** Renders the fragment's nodes in the host's place and takes the host out of the page. */
  private adopt(): void {
    placeContentBefore(this.hostEl, this.hostEl)
    setElementPresent(this.hostEl, false)
  }
}
