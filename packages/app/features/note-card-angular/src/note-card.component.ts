/**
 * NoteCard component (React parity).
 *
 * @module
 */

import { Component, type ElementRef, signal, ViewChild } from '@angular/core'

import {
  MolPlacement,
  placeContent,
  setElementPresent,
  type SlotReader,
  usePlacement,
  useTranslation,
} from '@molecule/app-angular'
import type { ColorVariant, UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * The open button's overlay reset: an empty, transparent native button over
 * the whole card (the same inline style React applies).
 *
 * @returns The inline style object.
 */
const openButtonStyle = (): Record<string, string> => ({
  background: 'transparent',
  border: 'none',
  padding: '0px',
})

/**
 * The note tints the theme covers, and the tone each one is: a note's colour
 * is chosen by the user, so a tint from this table renders as the theme's
 * light tint of its tone (`bgTone(tone, { subtle: true })`) and follows the
 * app theme. A colour not listed has no tone — it is data, applied as given.
 */
const TINT_TONES: Record<string, ColorVariant> = {
  '#fef9c3': 'warning', // yellow note
  '#fef3c7': 'warning', // amber note (the tint this card originally shipped with)
  '#dcfce7': 'success', // green note
  '#dbeafe': 'info', // blue note
  '#fee2e2': 'error', // red note
}

/**
 * Resolves a note tint to the tone whose light tint the theme renders for it.
 *
 * @param color - The `color` input (any CSS colour).
 * @returns The tone, or undefined when the colour has no tone (data).
 */
const tintTone = (color: string | undefined): ColorVariant | undefined =>
  color === undefined ? undefined : TINT_TONES[color.trim().toLowerCase()]

/**
 * NoteCard component.
 *
 * Sticky-note style card with optional color tint, pinned indicator, and
 * bottom-right actions. Use for note-taking apps, digital post-its,
 * dashboard quick-notes. The host IS the root `<article>`
 * (`article[mol-note-card]`), matching React's root exactly; the paper
 * colour of a tint with no tone is applied inline through a host style
 * binding (the CSSOM, as react-dom does).
 *
 * With an `onClick`, an empty, transparent native button covers the whole
 * card — React's overlay shape. It is named by the title when there is one,
 * else the body (the per-instance {@link NoteCard.nameId} sits on whichever
 * element carries the label). The template mounts the button through
 * `@if (onClick)`, so the rendered DOM follows the input exactly as React's
 * conditional renders.
 *
 * The card's paper is a theme tone: the documented note tints (yellow
 * `#fef9c3`, green `#dcfce7`, blue `#dbeafe`, red `#fee2e2`, amber
 * `#fef3c7`) render as the theme's light tint of the matching tone, so the
 * card and its text (the theme's ink) follow the app theme. A `color` with
 * no tone is data: it is applied as given, over the tone's paper. The
 * accessible label of the pin
 * indicator is the string React renders (`t('noteCard.aria.pinned', undefined,
 * { defaultValue: 'Pinned' })`), read through `useTranslation()` so it follows
 * a locale switch.
 *
 * The node props are projected slots: `title` renders inside the `<h3>`,
 * `body` inside the body `<div>`, `modifiedAt` inside its `<span>`, and
 * `actions` bare beside it (React renders `{actions}` with no wrapper).
 * String inputs render as text instead — React's truthiness branch applies:
 * an empty string renders nothing. The always-mounted capture wrappers
 * reconcile against that in {@link NoteCard.reconcile}.
 */
@Component({
  selector: 'article[mol-note-card]',
  standalone: true,
  hostDirectives: [MolPlacement],
  inputs: ['title', 'body', 'color', 'pinned', 'modifiedAt', 'actions', 'onClick', 'className'],
  host: {
    '[class]': 'classes()',
    '[style.background]': 'dataTint()',
    '[style.border-radius]': "'8px'",
    '[style.position]': 'rootPosition()',
  },
  template: `@if (onClick) {
      <button
        type="button"
        (click)="handleClick()"
        [attr.aria-labelledby]="nameId"
        data-mol-id="note-card-open"
        [class]="openClasses()"
        [style]="openStyle()"
      ></button>
    }
    @if (pinned) {
      <span
        role="img"
        [attr.aria-label]="pinnedLabel()"
        style="position: absolute; top: 6px; right: 6px"
        >📌</span
      >
    }
    <h3 #titleWrap [attr.id]="titleId()" [class]="titleClasses()">
      @if (titleText()) {
        <ng-container>{{ titleText() }}</ng-container>
      }
      <ng-content select="[slot=title]"></ng-content>
    </h3>
    <div #bodyWrap [attr.id]="bodyId()" [class]="bodyClass()" style="white-space: pre-wrap">
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
export class NoteCard {
  /** Note title (string/number renders as text; nodes are `[slot=title]` content). */
  title?: unknown
  /** Note body text (string/number renders as text; nodes are `[slot=body]` content). */
  body?: unknown
  /**
   * Background tint (CSS colour). The documented note tints (yellow
   * `#fef9c3`, green `#dcfce7`, blue `#dbeafe`, red `#fee2e2`, amber
   * `#fef3c7`) render as the theme's light tint of their tone; a colour
   * with no tone is data, applied as given.
   */
  color?: string
  /** Optional pin / starred indicator. */
  pinned?: boolean
  /** Optional last-modified display (string/number as text; nodes are `[slot=modifiedAt]` content). */
  modifiedAt?: unknown
  /** Optional right-side actions (`[slot=actions]` content; React renders them bare). */
  actions?: unknown
  /** Click handler; called with no arguments (React's `onClick`). */
  onClick?: () => void
  /** Extra classes. */
  className?: string

  /** The title's `<h3>` (detached when no title input and the slot is empty). */
  @ViewChild('titleWrap') titleWrap?: ElementRef<HTMLElement>
  /** The body `<div>`. */
  @ViewChild('bodyWrap') bodyWrap?: ElementRef<HTMLElement>
  /** The footer (detached when neither modifiedAt nor actions exist). */
  @ViewChild('footerWrap') footerWrap?: ElementRef<HTMLElement>
  /** The modified-at `<span>` (detached when no modifiedAt input and the slot is empty). */
  @ViewChild('modifiedWrap') modifiedWrap?: ElementRef<HTMLElement>
  /** The actions capture wrapper (revealed bare once; React renders the slot bare). */
  @ViewChild('actionsWrap') actionsWrap?: ElementRef<HTMLElement>

  /** Per-instance counter backing {@link NoteCard.nameId} (React numbers `useId()` ids). */
  private static nextId = 0
  /** The id the open button's `aria-labelledby` points at (on the title, else the body). */
  readonly nameId = `mol-note-card-name-${NoteCard.nextId++}`
  /** The i18n handle (locale-reactive), read in an injection context. */
  private readonly i18n = useTranslation()

  /**
   * Whether the title renders (a text title, or a projected `[slot=title]`),
   * written by the placement function and read by the id bindings.
   */
  private readonly titlePresent = signal(false)

  constructor() {
    usePlacement((hasContent) => this.reconcile(hasContent))
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the card's class list (`cm.stack(2)` + `cm.sp('p', 3)` + the
   * paper's tone tint + `cm.shadowLifted` + `className`; React's cursor
   * pointer lives on the open button).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(
      this.cm().stack(2),
      this.cm().sp('p', 3),
      this.cm().bgTone(this.tone(), { subtle: true }),
      this.cm().shadowLifted,
      this.className,
    )
  }

  /**
   * The open button's classes: positioned over the whole card and pointer
   * (React's overlay button).
   * @returns The class string.
   */
  openClasses(): string {
    return this.cm().cn(this.cm().position('absolute'), this.cm().inset0, this.cm().cursorPointer)
  }

  /**
   * The open button's overlay reset (React's style object).
   * @returns The inline style object.
   */
  openStyle(): Record<string, string> {
    return openButtonStyle()
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
   * Computes the footer's class (`cm.flex({ align: 'center', justify:
   * 'between', gap: 'sm' })`, plus `cm.position('relative')` with an
   * `onClick` — the footer paints above the open button and keeps its own
   * clicks, as React applies).
   * @returns The class string.
   */
  footerClasses(): string {
    return this.cm().cn(
      this.cm().flex({ align: 'center', justify: 'between', gap: 'sm' }),
      this.onClick ? this.cm().position('relative') : undefined,
    )
  }

  /**
   * The modified-at span's class (`cm.textSize('xs')`).
   * @returns The class string.
   */
  modifiedClass(): string {
    return this.cm().textSize('xs')
  }

  /**
   * The tone whose light tint is the card's paper: the `color` input's tone,
   * or warning when none is given (the default paper).
   * @returns The tone.
   */
  tone(): ColorVariant {
    return tintTone(this.color) ?? 'warning'
  }

  /**
   * The card's inline background for a `color` with no tone (data, applied
   * as given over the tone's paper); undefined for a tone-mapped tint, so
   * the tone's class carries the paper and the binding is removed.
   * @returns The CSS colour, or undefined when the tint is tone-mapped.
   */
  dataTint(): string | undefined {
    return tintTone(this.color) === undefined ? this.color : undefined
  }

  /**
   * The pinned marker's accessible label (React's
   * `t('noteCard.aria.pinned', undefined, { defaultValue: 'Pinned' })`),
   * re-read every pass so a locale switch changes it.
   * @returns The translated label.
   */
  pinnedLabel(): string {
    return this.i18n.t('noteCard.aria.pinned', undefined, { defaultValue: 'Pinned' })
  }

  /**
   * The card's root position: relative, so the card owns its absolute
   * children — the open button's overlay and the pinned indicator.
   * @returns `'relative'`.
   */
  rootPosition(): string {
    return 'relative'
  }

  /**
   * Whether the title carries the open button's label: a text title, or a
   * projected `[slot=title]` — written by the placement function, so the id
   * lands on the title in the same pass the slot's node arrives.
   * @returns True when a title renders.
   */
  private get hasLabel(): boolean {
    return this.titlePresent()
  }

  /**
   * The title `<h3>`'s id (the open button's `aria-labelledby` target when a
   * title renders; React's `useId()` placement).
   * @returns The id, or undefined when no `onClick` or no title.
   */
  titleId(): string | undefined {
    return this.onClick && this.hasLabel ? this.nameId : undefined
  }

  /**
   * The body `<div>`'s id (the open button's `aria-labelledby` target when no
   * title renders; React's `useId()` placement).
   * @returns The id, or undefined when a title renders or no `onClick`.
   */
  bodyId(): string | undefined {
    return this.onClick && !this.hasLabel ? this.nameId : undefined
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

  /** Runs the click handler the way React's overlay button forwards it (no event). */
  handleClick(): void {
    this.onClick?.()
  }

  /**
   * Applies React's conditions: the `<h3>` renders when the title input or
   * the slot exists; the `<footer>` renders when the modified-at span or the
   * actions exist (the modified-at `<span>` only for a modifiedAt value; the
   * actions bare). The open button is the template's own `@if (onClick)`
   * block.
   *
   * @param hasContent - Reads whether a slot has content.
   */
  private reconcile(hasContent: SlotReader): void {
    const title = this.titleWrap?.nativeElement
    const footer = this.footerWrap?.nativeElement
    const modified = this.modifiedWrap?.nativeElement
    const actions = this.actionsWrap?.nativeElement
    if (!title || !footer || !modified || !actions) return

    const titleShown = this.titleText() !== '' || hasContent(title)
    this.titlePresent.set(titleShown)
    const modifiedShown = this.modifiedText() !== '' || hasContent(modified)
    const footerShown = modifiedShown || hasContent(actions)
    setElementPresent(title, titleShown)
    setElementPresent(modified, modifiedShown)
    setElementPresent(footer, footerShown)
    if (!footerShown) return
    // React renders the actions bare inside the footer: the projected nodes
    // render at the capture wrapper's place, and the wrapper leaves the DOM.
    placeContent(actions, footer, actions)
    setElementPresent(actions, false)
  }
}
