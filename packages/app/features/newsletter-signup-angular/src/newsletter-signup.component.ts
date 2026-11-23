/**
 * NewsletterSignup component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component, ElementRef, inject, signal, type TemplateRef, ViewChild } from '@angular/core'

import {
  MolPlacement,
  placeContentBefore,
  setElementPresent,
  usePlacement,
  useTranslation,
} from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Button, Input } from '@molecule/app-ui-angular'

/**
 * Whether a node-valued prop is an Angular template (a projected node) rather
 * than plain text. Checked structurally — `TemplateRef` is a type-only import
 * in the emitted metadata, so `instanceof` is not dependable across bundles.
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
 * NewsletterSignup component.
 *
 * Email + subscribe button widget, tracking its own submitting / error /
 * success state; the app owns the subscription side-effect via the
 * `onSubscribe` input. React's root element is a `<form>` while idle and a
 * `<div>` once `successContent` renders, so the rendered root stands in front
 * of the host's place and the host itself leaves the page
 * (`placeContentBefore` + `setElementPresent`, React's fragment root).
 *
 * The optional title and description are text inputs or projected content
 * (`[slot=title]`, `[slot=description]`); the success content is a
 * `successContent` input (`TemplateRef` or string), because its wrapper only
 * exists after a successful submit and projection capture points cannot be
 * mounted conditionally.
 */
@Component({
  selector: 'mol-newsletter-signup',
  standalone: true,
  imports: [Button, Input, NgTemplateOutlet],
  hostDirectives: [MolPlacement],
  inputs: [
    'onSubscribe',
    'title',
    'description',
    'placeholder',
    'buttonLabel',
    'successContent',
    'layout',
    'className',
  ],
  // The template's whitespace is semantic: Angular keeps whitespace-only text
  // nodes inside inline / flex parents, so the DOM React renders is reproduced
  // by gluing the tags (see the ported unit tests).
  // prettier-ignore
  template: `@if (submitted() && successContent !== undefined) {<div [class]="className ?? null">@if (successTemplate(); as tpl) {<ng-container [ngTemplateOutlet]="tpl" />}@else if (successContent !== null) {<ng-container>{{ textOf(successContent) }}</ng-container>}</div>}@else {<form (submit)="handle($event)" [class]="formClasses()"><h4 #titleEl [class]="titleClasses()">@if (titleTemplate(); as tpl) {<ng-container [ngTemplateOutlet]="tpl" />}@else if (hasTitleText()) {<ng-container>{{ textOf(title) }}</ng-container>}<ng-content select="[slot=title]"></ng-content></h4><p #descriptionEl [class]="messageClasses()">@if (descriptionTemplate(); as tpl) {<ng-container [ngTemplateOutlet]="tpl" />}@else if (hasDescriptionText()) {<ng-container>{{ textOf(description) }}</ng-container>}<ng-content select="[slot=description]"></ng-content></p><div [class]="rowClasses()"><div mol-input [type]="'email'" [value]="email()" (change)="onEmailChange($event)" [placeholder]="placeholderText()" [required]="true" [attr.aria-label]="emailLabelText()" [className]="inputClass()"></div><button mol-button [type]="'submit'" [variant]="'solid'" [color]="'primary'" [disabled]="submitting()">@if (submitting()) {<ng-container>{{ subscribingText() }}</ng-container>}@else if (buttonLabelTemplate(); as tpl) {<ng-container [ngTemplateOutlet]="tpl" />}@else if (hasButtonLabelText()) {<ng-container>{{ textOf(buttonLabel) }}</ng-container>}@else {<ng-container>{{ subscribeText() }}</ng-container>}</button></div>@if (error()) {<p [class]="messageClasses()">{{ error() }}</p>}</form>}`,
})
export class NewsletterSignup {
  /** Called with the email on submit (React's `onSubscribe`). */
  onSubscribe?: (email: string) => void | Promise<void>
  /** Optional title above the form: text, or `[slot=title]` content. */
  title?: TemplateRef<unknown> | string | null
  /** Optional supporting copy under the title: text, or `[slot=description]` content. */
  description?: TemplateRef<unknown> | string | null
  /** Placeholder for the email input. */
  placeholder?: string
  /** Submit-button label: text or template. */
  buttonLabel?: TemplateRef<unknown> | string | null
  /** Rendered after successful subscription: text or template. */
  successContent?: TemplateRef<unknown> | string | null
  /** Layout — `'inline'` default or `'stacked'`. */
  layout?: 'inline' | 'stacked'
  /** Extra classes. */
  className?: string

  /** The optional title heading (always in the template; detached while empty). */
  @ViewChild('titleEl') private titleEl?: ElementRef<HTMLElement>
  /** The optional description paragraph (always in the template; detached while empty). */
  @ViewChild('descriptionEl') private descriptionEl?: ElementRef<HTMLElement>

  /**
   * Reactive translation, read in the injection context. Its `t` reads the
   * locale, so the view re-renders the text on a locale switch (the static `t`
   * does not).
   */
  private readonly i18n = useTranslation()

  /** The component's host element (React renders no element of its own). */
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)

  constructor() {
    // React's root is the `<form>` (or the `<div>` after success) itself: it renders in
    // front of the host's place and the host leaves the page. The optional title and
    // description keep their capture points mounted and leave the page while they have
    // nothing to render, as React's `{title && …}` renders no element.
    usePlacement((hasContent) => {
      placeContentBefore(this.host.nativeElement, this.host.nativeElement)
      setElementPresent(this.host.nativeElement, false)
      const title = this.titleEl?.nativeElement
      setElementPresent(
        title,
        this.hasTitleText() || isTemplate(this.title) || (title ? hasContent(title) : false),
      )
      const description = this.descriptionEl?.nativeElement
      setElementPresent(
        description,
        this.hasDescriptionText() ||
          isTemplate(this.description) ||
          (description ? hasContent(description) : false),
      )
    })
  }

  /** The controlled email value. */
  protected readonly email = signal('')
  /** Whether a submit is in flight (the button is disabled and busy). */
  protected readonly submitting = signal(false)
  /** Whether the last submit succeeded. */
  protected readonly submitted = signal(false)
  /** The last submit's error message. */
  protected readonly error = signal<string | null>(null)

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The text fallback used when a value is not a template.
   *
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
   * The description as a template, when the caller passed a node.
   * @returns The description template, or null.
   */
  descriptionTemplate(): TemplateRef<unknown> | null {
    return isTemplate(this.description) ? this.description : null
  }

  /**
   * The button label as a template, when the caller passed a node.
   * @returns The label template, or null.
   */
  buttonLabelTemplate(): TemplateRef<unknown> | null {
    return isTemplate(this.buttonLabel) ? this.buttonLabel : null
  }

  /**
   * The success content as a template, when the caller passed a node.
   * @returns The success template, or null.
   */
  successTemplate(): TemplateRef<unknown> | null {
    return isTemplate(this.successContent) ? this.successContent : null
  }

  /**
   * Whether the title input renders as text (React's `title && …` truthiness).
   * @returns True when the title text renders.
   */
  hasTitleText(): boolean {
    return typeof this.title === 'string'
      ? this.title !== ''
      : typeof this.title === 'number' && this.title !== 0
  }

  /**
   * Whether the description input renders as text (React's truthiness).
   * @returns True when the description text renders.
   */
  hasDescriptionText(): boolean {
    return typeof this.description === 'string'
      ? this.description !== ''
      : typeof this.description === 'number' && this.description !== 0
  }

  /**
   * Whether a button label was given (React's `buttonLabel ?? …`, so an empty
   * string still wins over the default).
   * @returns True when the label input renders.
   */
  hasButtonLabelText(): boolean {
    return this.buttonLabel !== undefined && this.buttonLabel !== null
  }

  /**
   * The form's class list (React's `cm.cn(cm.stack(2), className)`).
   * @returns The class string.
   */
  formClasses(): string {
    return this.cm().cn(this.cm().stack(2), this.className)
  }

  /**
   * The field row's class (React's inline flex, or the stacked column).
   * @returns The class string.
   */
  rowClasses(): string {
    return this.inline() ? this.cm().flex({ align: 'center', gap: 'sm' }) : this.cm().stack(2)
  }

  /**
   * The title's class list (React's `cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))`).
   * @returns The class string.
   */
  titleClasses(): string {
    return this.cm().cn(this.cm().textSize('sm'), this.cm().fontWeight('semibold'))
  }

  /**
   * The supporting copy / error text's class (React's `cm.textSize('sm')`).
   * @returns The class string.
   */
  messageClasses(): string {
    return this.cm().textSize('sm')
  }

  /**
   * The email field's extra class (React passes `cm.flex1` inline only).
   * @returns The class string, or undefined.
   */
  inputClass(): string | undefined {
    return this.inline() ? this.cm().flex1 : undefined
  }

  /**
   * Whether the inline layout is active (React's `layout = 'inline'` default).
   * @returns True for the inline layout.
   */
  inline(): boolean {
    return (this.layout ?? 'inline') === 'inline'
  }

  /**
   * The email input's placeholder (React's default).
   * @returns The placeholder text.
   */
  placeholderText(): string {
    return (
      this.placeholder ?? this.i18n.t('newsletter.placeholder', {}, { defaultValue: 'Your email' })
    )
  }

  /**
   * The button's text while submitting (React's `newsletter.subscribing`).
   * @returns The text.
   */
  subscribingText(): string {
    return this.i18n.t('newsletter.subscribing', {}, { defaultValue: 'Subscribing…' })
  }

  /**
   * The button's idle text (React's `newsletter.subscribe`).
   * @returns The text.
   */
  subscribeText(): string {
    return this.i18n.t('newsletter.subscribe', {}, { defaultValue: 'Subscribe' })
  }

  /**
   * The email field's accessible label (React's `newsletter.label.email`).
   * @returns The text.
   */
  emailLabelText(): string {
    return this.i18n.t('newsletter.label.email', {}, { defaultValue: 'Email' })
  }

  /**
   * Adopts the typed email (React's `onChange` on the controlled field).
   *
   * @param event - The native input event.
   */
  onEmailChange(event: Event): void {
    this.email.set((event.target as HTMLInputElement).value)
  }

  /**
   * Handles form submit: calls onSubscribe and tracks submitting/error/success state.
   *
   * @param event - The submit event.
   * @returns A promise that settles when the subscription does.
   */
  async handle(event: Event): Promise<void> {
    event.preventDefault()
    if (this.submitting()) return
    this.submitting.set(true)
    this.error.set(null)
    try {
      await this.onSubscribe?.(this.email())
      this.submitted.set(true)
      this.email.set('')
    } catch (err: unknown) {
      this.error.set(
        err instanceof Error
          ? err.message
          : this.i18n.t(
              'newsletter.error.subscriptionFailed',
              {},
              {
                defaultValue: 'Subscription failed',
              },
            ),
      )
    } finally {
      this.submitting.set(false)
    }
  }
}
