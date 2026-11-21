/**
 * RatingForm component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import {
  Component,
  type ElementRef,
  type OnInit,
  type QueryList,
  signal,
  type TemplateRef,
  ViewChildren,
} from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Button, Textarea } from '@molecule/app-ui-angular'

/** The star colours, filled or empty (React's inline `color` values). */
const STAR_COLORS = {
  filled: 'var(--mol-color-warning, #facc15)',
  empty: 'var(--mol-color-border, rgba(128,128,128,0.4))',
} as const

/**
 * Whether a node-valued prop is an Angular template rather than plain text.
 * Checked structurally — `TemplateRef` is a type-only import in the emitted
 * metadata, so `instanceof` is not dependable across bundles.
 *
 * @param value - The prop value.
 * @returns True when it can be rendered with `ngTemplateOutlet`.
 */
const isTemplate = (value: unknown): value is TemplateRef<unknown> =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as TemplateRef<unknown>).createEmbeddedView === 'function'

/**
 * Renders a text value the way React renders a node string.
 *
 * @param value - The prop value.
 * @returns The text to render, or `''` when there is nothing.
 */
const textOf = (value: unknown): string =>
  value === null || value === undefined ? '' : String(value)

/**
 * Whether a text-or-node prop draws, with React's `prop && …` truthiness: a
 * template draws, an empty string or `0` does not.
 *
 * @param value - The prop value.
 * @returns True when the prop renders something.
 */
const truthyNode = (value: unknown): boolean => {
  if (isTemplate(value)) return true
  if (typeof value === 'string') return value !== ''
  if (typeof value === 'number') return value !== 0
  return false
}

/**
 * RatingForm component.
 *
 * Interactive star-rating + comment form. Used for review submission (product
 * reviews, course feedback, support-ticket CSAT). The host IS the `<form>`
 * (`form[mol-rating-form]`), matching React's root exactly, so the root's class
 * and submit handling are host bindings.
 *
 * The submit button stays disabled until a star rating is selected, and
 * `requireComment` blocks submission on blank comments silently (no inline
 * error is rendered). Rejected `onSubmit` promises propagate — handle errors in
 * your handler. Same props (React names) and same DOM as
 * `@molecule/app-rating-form-react`'s `RatingForm`.
 */
@Component({
  selector: 'form[mol-rating-form]',
  standalone: true,
  imports: [Button, Textarea, NgTemplateOutlet],
  inputs: [
    'onSubmit',
    'max',
    'defaultRating',
    'requireComment',
    'title',
    'commentPlaceholder',
    'submitLabel',
    'className',
  ],
  host: {
    '[class]': 'formClasses()',
    '(submit)': 'handle($event)',
  },
  // The template's whitespace is semantic: Angular keeps whitespace-only text
  // nodes, so the DOM React renders is reproduced by gluing the tags.
  // prettier-ignore
  template: `@if (showTitle()) {<h3 [class]="titleClasses()">@if (titleTemplate(); as tpl) {<ng-container [ngTemplateOutlet]="tpl" />}@else {<ng-container>{{ textOf(title) }}</ng-container>}</h3>}<div role="radiogroup" tabindex="-1" [attr.aria-label]="ratingLabel()" [class]="groupClasses()" (mouseleave)="clearHover()">@for (n of stars(); track n) {<button #star type="button" role="radio" data-mol-id="rating-form-star" [attr.tabindex]="starTab(n)" [attr.aria-checked]="rating() === n" [attr.aria-label]="starLabel(n)" (click)="select(n)" (keydown)="onStarKey($event)" (mouseenter)="preview(n)" [class]="starClasses()" [style.background]="'none'" [style.border]="'none'" [style.font-size]="'28px'" [style.color]="starColor(n)">★</button>}</div><div mol-textarea [value]="comment()" (change)="onCommentChange($event)" [placeholder]="placeholderText()" [rows]="4" [attr.aria-label]="commentLabel()"></div><button mol-button [type]="'submit'" [variant]="'solid'" [color]="'primary'" [disabled]="submitting() || !rating()">@if (submitting()) {<ng-container>{{ submittingText() }}</ng-container>}@else if (submitLabelTemplate(); as tpl) {<ng-container [ngTemplateOutlet]="tpl" />}@else if (hasSubmitLabel()) {<ng-container>{{ textOf(submitLabel) }}</ng-container>}@else {<ng-container>{{ submitText() }}</ng-container>}</button>`,
})
export class RatingForm implements OnInit {
  /** Called with the submitted rating + optional comment (React's `onSubmit`). */
  onSubmit?: (rating: number, comment: string) => void | Promise<void>
  /** Maximum stars (defaults to 5 at read time). */
  max?: number
  /** Initial rating (uncontrolled). */
  defaultRating?: number
  /** Whether a comment is required. */
  requireComment?: boolean
  /** Form heading: text or a template. */
  title?: TemplateRef<unknown> | string | number | null
  /** Comment placeholder. */
  commentPlaceholder?: string
  /** Submit-button label: text or a template. */
  submitLabel?: TemplateRef<unknown> | string | number | null
  /** Extra classes. */
  className?: string

  /**
   * Reactive translation, read in the injection context. Its `t` reads the
   * locale, so the view re-renders the text on a locale switch.
   */
  private readonly i18n = useTranslation()

  /** The selected rating (React's `useState`, seeded from `defaultRating`). */
  protected readonly rating = signal(0)
  /** The hovered star, or 0 (React's `useState`). */
  protected readonly hover = signal(0)
  /** The controlled comment. */
  protected readonly comment = signal('')
  /** Whether a submit is in flight. */
  protected readonly submitting = signal(false)
  /** The star buttons, in DOM order (React's `starRefs` map). */
  @ViewChildren('star')
  protected readonly starRefs?: QueryList<ElementRef<HTMLButtonElement>>

  /**
   * Seeds the rating from the `defaultRating` input once, after Angular has
   * bound the inputs (React's `useState` initial value; a later prop write must
   * not move the selection).
   */
  ngOnInit(): void {
    this.rating.set(this.defaultRating ?? 0)
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The form's class list (React's `cm.cn(cm.stack(3), className)`).
   * @returns The class string.
   */
  formClasses(): string {
    return this.cm().cn(this.cm().stack(3), this.className)
  }

  /**
   * The heading's class list.
   * @returns The class string.
   */
  titleClasses(): string {
    return this.cm().cn(this.cm().textSize('base'), this.cm().fontWeight('semibold'))
  }

  /**
   * The radiogroup's class (React's `cm.flex({ align: 'center', gap: 'xs' })`).
   * @returns The class string.
   */
  groupClasses(): string {
    return this.cm().flex({ align: 'center', gap: 'xs' })
  }

  /**
   * A star button's class (React's `cm.cn(cm.cursorPointer, cm.touchTarget)`).
   * @returns The class string.
   */
  starClasses(): string {
    return this.cm().cn(this.cm().cursorPointer, this.cm().touchTarget)
  }

  /**
   * The effective maximum (React's default parameter, so a later-bound write of
   * `undefined` must not erase the `5`).
   * @returns The maximum rating.
   */
  maxValue(): number {
    return this.max ?? 5
  }

  /**
   * One entry per star (React's `Array.from({ length: max }, (_, i) => i + 1)`).
   * @returns The star numbers.
   */
  stars(): number[] {
    return Array.from({ length: this.maxValue() }, (_value, index) => index + 1)
  }

  /**
   * The value a star draws at (React's `hover || rating`).
   * @returns The displayed rating.
   */
  display(): number {
    return this.hover() || this.rating()
  }

  /**
   * A star's fill colour.
   * @param n - The star number.
   * @returns The CSS colour.
   */
  starColor(n: number): string {
    return n <= this.display() ? STAR_COLORS.filled : STAR_COLORS.empty
  }

  /**
   * A star's tab stop (React's `tabIndex={n === tabStop ? 0 : -1}`): the APG
   * radio group's roving tabindex makes the checked star the group's one tab
   * stop; when no star is checked — no rating yet, or a `defaultRating`
   * outside 1..max — the first star is, so the group stays reachable from the
   * keyboard.
   * @param n - The star number.
   * @returns The star's `tabindex`.
   */
  starTab(n: number): number {
    return n === this.tabStop() ? 0 : -1
  }

  /**
   * The star holding the group's one tab stop (React's `tabStop`): the
   * selected star when it is one of 1..max, else the first.
   * @returns The star number that is tabbable.
   */
  tabStop(): number {
    const selected = this.rating()
    return selected >= 1 && selected <= this.maxValue() ? selected : 1
  }

  /**
   * Selects a star and moves focus with it — the APG radio group's roving
   * tabindex, where the checked star is the group's one keyboard stop (React's
   * `selectAndFocus`).
   * @param n - The star number.
   */
  selectAndFocus(n: number): void {
    this.rating.set(n)
    this.starRefs?.get(n - 1)?.nativeElement.focus()
  }

  /**
   * Handles the radio keys on a star (the APG radio group pattern):
   * ArrowRight / ArrowDown select and focus the next star, ArrowLeft / ArrowUp
   * the previous one, both wrapping; Home and End jump to the first and last.
   * The handled keys are prevented (they would otherwise scroll or move
   * focus); Space and Enter stay the native button click, and any other key is
   * ignored (React's `onStarKeyDown`).
   * @param event - The key event on a star button.
   */
  onStarKey(event: KeyboardEvent): void {
    const current = this.tabStop()
    let next: number
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        next = current >= this.maxValue() ? 1 : current + 1
        break
      case 'ArrowLeft':
      case 'ArrowUp':
        next = current <= 1 ? this.maxValue() : current - 1
        break
      case 'Home':
        next = 1
        break
      case 'End':
        next = this.maxValue()
        break
      default:
        return
    }
    event.preventDefault()
    this.selectAndFocus(next)
  }

  /**
   * The radiogroup's accessible label (React's `rating.label`).
   * @returns The label text.
   */
  ratingLabel(): string {
    return this.i18n.t('rating.label', {}, { defaultValue: 'Rating' })
  }

  /**
   * A star's accessible label (React's `rating.star`).
   * @param n - The star number.
   * @returns The label text.
   */
  starLabel(n: number): string {
    return this.i18n.t(
      'rating.star',
      { n, max: this.maxValue() },
      { defaultValue: '{{n}} of {{max}}' },
    )
  }

  /**
   * The comment placeholder (React's `commentPlaceholder ?? t(…)`).
   * @returns The placeholder text.
   */
  placeholderText(): string {
    return (
      this.commentPlaceholder ??
      this.i18n.t(
        'rating.commentPlaceholder',
        {},
        {
          defaultValue: 'Share your thoughts (optional)',
        },
      )
    )
  }

  /**
   * The comment field's accessible label (React's `rating.comment`).
   * @returns The label text.
   */
  commentLabel(): string {
    return this.i18n.t('rating.comment', {}, { defaultValue: 'Comment' })
  }

  /**
   * The button's text while submitting (React's `rating.submitting`).
   * @returns The text.
   */
  submittingText(): string {
    return this.i18n.t('rating.submitting', {}, { defaultValue: 'Submitting…' })
  }

  /**
   * The button's idle text (React's `rating.submit`).
   * @returns The text.
   */
  submitText(): string {
    return this.i18n.t('rating.submit', {}, { defaultValue: 'Submit review' })
  }

  /**
   * The text fallback used when a value is not a template.
   * @param value - The prop value.
   * @returns The text to render.
   */
  textOf(value: unknown): string {
    return textOf(value)
  }

  /**
   * The title as a template, when the caller passed a node.
   * @returns The title template, or null.
   */
  titleTemplate(): TemplateRef<unknown> | null {
    return isTemplate(this.title) ? this.title : null
  }

  /**
   * The submit label as a template, when the caller passed a node.
   * @returns The label template, or null.
   */
  submitLabelTemplate(): TemplateRef<unknown> | null {
    return isTemplate(this.submitLabel) ? this.submitLabel : null
  }

  /**
   * Whether the heading renders (React's `title && …`).
   * @returns True when the heading shows.
   */
  showTitle(): boolean {
    return truthyNode(this.title)
  }

  /**
   * Whether a submit label was given (React's `submitLabel ?? …`, so an empty
   * string still wins over the default).
   * @returns True when the label input renders.
   */
  hasSubmitLabel(): boolean {
    return this.submitLabel !== undefined && this.submitLabel !== null
  }

  /**
   * Selects a star (React's `onClick` → `setRating`).
   * @param n - The star number.
   */
  select(n: number): void {
    this.rating.set(n)
  }

  /**
   * Previews a star (React's `onMouseEnter` → `setHover`).
   * @param n - The star number.
   */
  preview(n: number): void {
    this.hover.set(n)
  }

  /** Clears the hover preview (React's `onMouseLeave` on the radiogroup). */
  clearHover(): void {
    this.hover.set(0)
  }

  /**
   * Adopts the typed comment (React's `onChange` on the controlled textarea).
   * @param event - The native input event.
   */
  onCommentChange(event: Event): void {
    this.comment.set((event.target as HTMLTextAreaElement).value)
  }

  /**
   * Handles form submission: validates state, delegates to onSubmit, and
   * manages the submitting flag.
   * @param event - The submit event.
   * @returns A promise that settles when `onSubmit` does.
   */
  async handle(event: Event): Promise<void> {
    event.preventDefault()
    if (this.submitting() || !this.rating()) return
    if (this.requireComment && !this.comment().trim()) return
    this.submitting.set(true)
    try {
      await this.onSubmit?.(this.rating(), this.comment())
    } finally {
      this.submitting.set(false)
    }
  }
}
