/**
 * NoteCard component (React parity).
 *
 * @module
 */

import {
  type AfterViewInit,
  Component,
  type DoCheck,
  ElementRef,
  inject,
  Renderer2,
  ViewChild,
} from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { hasNodes, SlotGuard } from './slot-dom.js'

/**
 * NoteCard component.
 *
 * Sticky-note style card with optional color tint, pinned indicator, and
 * bottom-right actions. Use for note-taking apps, digital post-its,
 * dashboard quick-notes. The host IS the root `<article>`
 * (`article[mol-note-card]`), matching React's root exactly; the tint and
 * the fixed near-black text color are applied inline through host style
 * bindings (the CSSOM, as react-dom does).
 *
 * The card intentionally keeps a paper-sticky-note look in BOTH themes: its
 * text color is fixed near-black, so `color` must be a LIGHT pastel — a dark
 * `color` value makes the body unreadable. The accessible label of the pin
 * indicator is the same literal React renders (`aria-label="Pinned"`); the
 * React package does not route it through i18n.
 *
 * The node props are projected slots: `title` renders inside the `<h3>`,
 * `body` inside the body `<div>`, `modifiedAt` inside its `<span>`, and
 * `actions` bare beside it (React renders `{actions}` with no wrapper).
 * String inputs render as text instead — React's truthiness branch applies:
 * an empty string renders nothing. The always-mounted capture wrappers
 * reconcile against that in {@link NoteCard.ngAfterViewInit}.
 */
@Component({
  selector: 'article[mol-note-card]',
  standalone: true,
  inputs: ['title', 'body', 'color', 'pinned', 'modifiedAt', 'actions', 'onClick', 'className'],
  host: {
    '[class]': 'classes()',
    '[style.background]': 'styleBackground()',
    '[style.color]': "'#1f2937'",
    '[style.border-radius]': "'8px'",
    '[style.box-shadow]': "'0 1px 3px rgba(0,0,0,0.08)'",
    '[style.position]': "'relative'",
    '(click)': 'handleClick($event)',
  },
  template: `@if (pinned) {
      <span aria-label="Pinned" style="position: absolute; top: 6px; right: 6px">&#128204;</span>
    }
    <h3 #titleWrap [class]="titleClasses()">
      @if (titleText()) {
        <ng-container>{{ titleText() }}</ng-container>
      }
      <ng-content select="[slot=title]"></ng-content>
    </h3>
    <div [class]="bodyClass()" style="white-space: pre-wrap">
      @if (bodyText()) {
        <ng-container>{{ bodyText() }}</ng-container>
      }
      <ng-content select="[slot=body]"></ng-content>
    </div>
    <footer #footerWrap [class]="footerClasses()">
      <span #modifiedWrap [class]="modifiedClass()">
        @if (modifiedText()) {
          <ng-container>{{ modifiedText() }}</ng-container>
        }
        <ng-content select="[slot=modifiedAt]"></ng-content
      ></span>
      <span #actionsWrap><ng-content select="[slot=actions]"></ng-content></span>
    </footer>`,
})
export class NoteCard implements AfterViewInit, DoCheck {
  /** Note title (string/number renders as text; nodes are `[slot=title]` content). */
  title?: unknown
  /** Note body text (string/number renders as text; nodes are `[slot=body]` content). */
  body?: unknown
  /** Background tint (CSS color). */
  color?: string
  /** Optional pin / starred indicator. */
  pinned?: boolean
  /** Optional last-modified display (string/number as text; nodes are `[slot=modifiedAt]` content). */
  modifiedAt?: unknown
  /** Optional right-side actions (`[slot=actions]` content; React renders them bare). */
  actions?: unknown
  /** Click handler; receives the DOM click event (React's `onClick`). */
  onClick?: (event: Event) => void
  /** Extra classes. */
  className?: string

  /** The title's `<h3>` (detached when no title input and the slot is empty). */
  @ViewChild('titleWrap') titleWrap?: ElementRef<HTMLElement>
  /** The footer (detached when neither modifiedAt nor actions exist). */
  @ViewChild('footerWrap') footerWrap?: ElementRef<HTMLElement>
  /** The modified-at `<span>` (detached when no modifiedAt input and the slot is empty). */
  @ViewChild('modifiedWrap') modifiedWrap?: ElementRef<HTMLElement>
  /** The actions capture wrapper (revealed bare once; React renders the slot bare). */
  @ViewChild('actionsWrap') actionsWrap?: ElementRef<HTMLElement>

  /** Whether the projected slots' presence has been read (read once: the reveal empties the wrapper). */
  private slotsRead = false
  /** Whether the title slot holds projected content (read once with the slots). */
  private hasTitleSlot = false
  /** Whether the modifiedAt slot holds projected content (read once with the slots). */
  private hasModifiedSlot = false
  /** Whether the actions slot holds projected content (read once with the slots). */
  private hasActions = false
  /** Whether the actions' bare reveal has run. */
  private actionsRevealed = false

  private readonly guard = new SlotGuard(inject(ElementRef), inject(Renderer2))

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the card's class list (`cm.stack(2)` + `cm.sp('p', 3)` +
   * `cm.cursorPointer` only with an `onClick` + `className`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(
      this.cm().stack(2),
      this.cm().sp('p', 3),
      this.onClick ? this.cm().cursorPointer : undefined,
      this.className,
    )
  }

  /**
   * Computes the title's class (`cm.textSize('sm')` + `cm.fontWeight('bold')`).
   * @returns The class string.
   */
  titleClasses(): string {
    return this.cm().cn(this.cm().textSize('sm'), this.cm().fontWeight('bold'))
  }

  /**
   * The body div's class (`cm.textSize('sm')`).
   * @returns The class string.
   */
  bodyClass(): string {
    return this.cm().textSize('sm')
  }

  /**
   * Computes the footer's class (`cm.flex({ align: 'center', justify: 'between', gap: 'sm' })`).
   * @returns The class string.
   */
  footerClasses(): string {
    return this.cm().flex({ align: 'center', justify: 'between', gap: 'sm' })
  }

  /**
   * The modified-at span's class (`cm.textSize('xs')`).
   * @returns The class string.
   */
  modifiedClass(): string {
    return this.cm().textSize('xs')
  }

  /**
   * The card's background tint (React's `color ?? '#fef3c7'`).
   * @returns The CSS color.
   */
  styleBackground(): string {
    return this.color ?? '#fef3c7'
  }

  /**
   * The title input's text (React's `{title}` for a text child: strings and
   * numbers render; a node arrives as `[slot=title]` content instead).
   * @returns The text, or `''` for a node title.
   */
  titleText(): string {
    return typeof this.title === 'string' || typeof this.title === 'number'
      ? String(this.title)
      : ''
  }

  /**
   * The body input's text (React's `{body}` for a text child).
   * @returns The text, or `''` for a node body.
   */
  bodyText(): string {
    return typeof this.body === 'string' || typeof this.body === 'number' ? String(this.body) : ''
  }

  /**
   * The modifiedAt input's text (React's `{modifiedAt}` for a text child).
   * @returns The text, or `''` for a node value.
   */
  modifiedText(): string {
    return typeof this.modifiedAt === 'string' || typeof this.modifiedAt === 'number'
      ? String(this.modifiedAt)
      : ''
  }

  /** Runs the click handler the way React forwards the DOM event. */
  handleClick(event: Event): void {
    this.onClick?.(event)
  }

  /**
   * Reads slot presence (view queries resolve only at view init) and
   * reconciles the wrappers against React's DOM.
   */
  ngAfterViewInit(): void {
    this.reconcile()
  }

  /**
   * Re-reconciles on later passes (a props step may add a title or a
   * modified-at value, or flip `pinned`, which React re-renders).
   */
  ngDoCheck(): void {
    this.reconcile()
  }

  /**
   * Applies React's conditions: the `<h3>` renders when the title input or
   * the slot exists; the `<footer>` renders when the modified-at span or the
   * actions exist (the modified-at `<span>` only for a modifiedAt value; the
   * actions bare). The slots' presence is read once — the projected content
   * never changes for this component's lifetime, and the bare reveal empties
   * the actions capture wrapper, so a per-pass re-read would lose it.
   */
  private reconcile(): void {
    const title = this.titleWrap?.nativeElement
    const footer = this.footerWrap?.nativeElement
    const modified = this.modifiedWrap?.nativeElement
    const actions = this.actionsWrap?.nativeElement
    if (!this.slotsRead && title && footer && modified && actions) {
      this.hasTitleSlot = hasNodes(title)
      this.hasModifiedSlot = hasNodes(modified)
      this.hasActions = hasNodes(actions)
      this.slotsRead = true
    }

    this.guard.toggle(title, this.titleText() !== '' || this.hasTitleSlot)
    this.guard.toggle(footer, this.modifiedText() !== '' || this.hasModifiedSlot || this.hasActions)
    this.guard.toggle(modified, this.modifiedText() !== '' || this.hasModifiedSlot)
    if (this.slotsRead) {
      // React renders the actions bare: with content, the wrapper's nodes move
      // to its position once (`toggle` above re-attached the footer, so they
      // land in it); without, the empty capture wrapper leaves React's DOM —
      // re-hidden on every pass it rides back in with a re-attached footer.
      if (this.hasActions) {
        if (!this.actionsRevealed) {
          this.guard.reveal(actions)
          this.actionsRevealed = true
        }
      } else if (actions?.isConnected) {
        this.guard.hide(actions)
      }
    }
  }
}
