/**
 * ContactForm component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import {
  type AfterViewInit,
  Component,
  type ElementRef,
  signal,
  type TemplateRef,
  ViewChild,
} from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Button, Input, Textarea } from '@molecule/app-ui-angular'

/** Whether a node renders anything (an element, or text with content beyond whitespace). */
const hasRenderable = (node: Node): boolean =>
  node.nodeType === Node.ELEMENT_NODE ||
  (node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim().length > 0)

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
 * ContactForm component.
 *
 * Generic name + email + message contact form with submit handling and success
 * state; the app owns the side-effect via the `onSubmit` input. React's root
 * element is a `<form>` while idle and a `<div>` once `successContent` renders,
 * so the host is unwrapped (`data-parity-unwrap`, `display: contents`) and the
 * template renders exactly React's root.
 *
 * The optional title and description are text inputs or projected content
 * (`[slot=title]`, `[slot=description]`); `extraFields` is projected content
 * (`[slot=extraFields]`) rendered above the message textarea, as React renders
 * it. The submit label and success content are inputs (`TemplateRef` or
 * string), because their regions only exist inside conditional branches.
 */
@Component({
  selector: 'mol-contact-form',
  standalone: true,
  imports: [Button, Input, Textarea, NgTemplateOutlet],
  inputs: ['onSubmit', 'title', 'description', 'submitLabel', 'successContent', 'className'],
  host: {
    'data-parity-unwrap': '',
    style: 'display: contents',
  },
  // The template's whitespace is semantic: Angular keeps whitespace-only text
  // nodes inside inline / flex parents, so the DOM React renders is reproduced
  // by gluing the tags (see the ported unit tests).
  // prettier-ignore
  template: `@if (submitted() && successContent !== undefined) {<div [class]="className ?? null">@if (successTemplate(); as tpl) {<ng-container [ngTemplateOutlet]="tpl" />}@else if (successContent !== null) {<ng-container>{{ textOf(successContent) }}</ng-container>}</div>}@else {<form (submit)="handle($event)" [class]="formClasses()">@if (showHeader()) {<header [class]="headerClasses()">@if (showTitle()) {<h3 #titleEl [class]="titleClasses()">@if (titleTemplate(); as tpl) {<ng-container [ngTemplateOutlet]="tpl" />}@else if (hasTitleText()) {<ng-container>{{ textOf(title) }}</ng-container>}<ng-content select="[slot=title]"></ng-content></h3>}@if (showDescription()) {<p #descriptionEl [class]="messageClasses()">@if (descriptionTemplate(); as tpl) {<ng-container [ngTemplateOutlet]="tpl" />}@else if (hasDescriptionText()) {<ng-container>{{ textOf(description) }}</ng-container>}<ng-content select="[slot=description]"></ng-content></p>}</header>}<div mol-input [id]="'contact-form-name'" [type]="'text'" [value]="name()" (change)="onNameChange($event)" [placeholder]="namePlaceholder()" [required]="true" aria-label="Name"></div><div mol-input [id]="'contact-form-email'" [type]="'email'" [value]="email()" (change)="onEmailChange($event)" [placeholder]="emailPlaceholder()" [required]="true" aria-label="Email"></div><ng-content select="[slot=extraFields]"></ng-content><div mol-textarea [id]="'contact-form-message'" [value]="message()" (change)="onMessageChange($event)" [placeholder]="messagePlaceholder()" [required]="true" [rows]="5" aria-label="Message"></div>@if (error()) {<p [class]="messageClasses()">{{ error() }}</p>}<button mol-button [type]="'submit'" [variant]="'solid'" [color]="'primary'" [disabled]="submitting()">@if (submitting()) {<ng-container>{{ sendingText() }}</ng-container>}@else if (submitLabelTemplate(); as tpl) {<ng-container [ngTemplateOutlet]="tpl" />}@else if (hasSubmitLabelText()) {<ng-container>{{ textOf(submitLabel) }}</ng-container>}@else {<ng-container>{{ sendText() }}</ng-container>}</button></form>}`,
})
export class ContactForm implements AfterViewInit {
  /** Called with the form values on submit (React's `onSubmit`). */
  onSubmit?: (values: Record<string, string>) => void | Promise<void>
  /** Form heading: text, a template, or projected `[slot=title]` content. */
  title?: TemplateRef<unknown> | string | null
  /** Optional supporting copy: text, a template, or `[slot=description]` content. */
  description?: TemplateRef<unknown> | string | null
  /** Custom submit-button label: text or template. */
  submitLabel?: TemplateRef<unknown> | string | null
  /** Rendered after a successful submit: text or template. */
  successContent?: TemplateRef<unknown> | string | null
  /** Extra classes. */
  className?: string

  /** The optional heading element (projected content lands here; read once). */
  @ViewChild('titleEl') private titleEl?: ElementRef<HTMLElement>
  /** The optional description paragraph (projected content lands here; read once). */
  @ViewChild('descriptionEl') private descriptionEl?: ElementRef<HTMLElement>

  /** Whether a `[slot=title]` projection landed (`null`: decided by the text input). */
  private readonly titleProjected = signal<boolean | null>(true)
  /** Whether a `[slot=description]` projection landed (`null`: decided by the text input). */
  private readonly descriptionProjected = signal<boolean | null>(true)

  /**
   * Reactive translation, read in the injection context. Its `t` reads the
   * locale, so the view re-renders the text on a locale switch (the static `t`
   * does not).
   */
  private readonly i18n = useTranslation()

  /** The controlled name value. */
  protected readonly name = signal('')
  /** The controlled email value. */
  protected readonly email = signal('')
  /** The controlled message value. */
  protected readonly message = signal('')
  /** Whether a submit is in flight (the button is disabled and busy). */
  protected readonly submitting = signal(false)
  /** Whether the last submit succeeded. */
  protected readonly submitted = signal(false)
  /** The last submit's error message. */
  protected readonly error = signal<string | null>(null)

  /**
   * Reads the optional regions' first render: when neither a text input nor
   * projected content landed, React would not render the region at all, so the
   * optimistic render is withdrawn. A text input leaves the decision to itself
   * (`null`), so a later `title: null` prop change still hides its heading.
   */
  ngAfterViewInit(): void {
    const title = this.titleEl?.nativeElement
    if (title) this.titleProjected.set(this.hasTitleText() ? null : hasRenderableContent(title))
    const description = this.descriptionEl?.nativeElement
    if (description)
      this.descriptionProjected.set(
        this.hasDescriptionText() ? null : hasRenderableContent(description),
      )
  }

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
   * The submit-button label as a template, when the caller passed a node.
   * @returns The label template, or null.
   */
  submitLabelTemplate(): TemplateRef<unknown> | null {
    return isTemplate(this.submitLabel) ? this.submitLabel : null
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
   * Whether a submit label was given (React's `submitLabel ?? …`, so an empty
   * string still wins over the default).
   * @returns True when the label input renders.
   */
  hasSubmitLabelText(): boolean {
    return this.submitLabel !== undefined && this.submitLabel !== null
  }

  /**
   * Whether the heading renders: React's `title && …` / `description && …` on
   * the text inputs, a template, or projected content. A plain getter, so
   * every change detection pass follows the inputs.
   * @returns True when the heading shows.
   */
  showHeader(): boolean {
    return this.showTitle() || this.showDescription()
  }

  /**
   * Whether the title element renders.
   * @returns True when the heading line shows.
   */
  showTitle(): boolean {
    return this.hasTitleText() || isTemplate(this.title) || this.titleProjected() === true
  }

  /**
   * Whether the description element renders.
   * @returns True when the paragraph shows.
   */
  showDescription(): boolean {
    return (
      this.hasDescriptionText() ||
      isTemplate(this.description) ||
      this.descriptionProjected() === true
    )
  }

  /**
   * The form's class list (React's `cm.cn(cm.stack(3), className)`).
   * @returns The class string.
   */
  formClasses(): string {
    return this.cm().cn(this.cm().stack(3), this.className)
  }

  /**
   * The heading's class (React's `cm.stack(1)`).
   * @returns The class string.
   */
  headerClasses(): string {
    return this.cm().stack(1)
  }

  /**
   * The title's class list (React's `cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))`).
   * @returns The class string.
   */
  titleClasses(): string {
    return this.cm().cn(this.cm().textSize('lg'), this.cm().fontWeight('semibold'))
  }

  /**
   * The description / error text's class (React's `cm.textSize('sm')`).
   * @returns The class string.
   */
  messageClasses(): string {
    return this.cm().textSize('sm')
  }

  /**
   * The name field's placeholder (React's `contactForm.name`).
   * @returns The placeholder text.
   */
  namePlaceholder(): string {
    return this.i18n.t('contactForm.name', {}, { defaultValue: 'Your name' })
  }

  /**
   * The email field's placeholder (React's `contactForm.email`).
   * @returns The placeholder text.
   */
  emailPlaceholder(): string {
    return this.i18n.t('contactForm.email', {}, { defaultValue: 'you@example.com' })
  }

  /**
   * The message field's placeholder (React's `contactForm.message`).
   * @returns The placeholder text.
   */
  messagePlaceholder(): string {
    return this.i18n.t('contactForm.message', {}, { defaultValue: 'How can we help?' })
  }

  /**
   * The button's text while submitting (React's `contactForm.sending`).
   * @returns The text.
   */
  sendingText(): string {
    return this.i18n.t('contactForm.sending', {}, { defaultValue: 'Sending…' })
  }

  /**
   * The button's idle text (React's `contactForm.send`).
   * @returns The text.
   */
  sendText(): string {
    return this.i18n.t('contactForm.send', {}, { defaultValue: 'Send message' })
  }

  /**
   * Adopts the typed name (React's `onChange` on the controlled field).
   *
   * @param event - The native input event.
   */
  onNameChange(event: Event): void {
    this.name.set((event.target as HTMLInputElement).value)
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
   * Adopts the typed message (React's `onChange` on the controlled field).
   *
   * @param event - The native input event.
   */
  onMessageChange(event: Event): void {
    this.message.set((event.target as HTMLTextAreaElement).value)
  }

  /**
   * Handles form submission: calls `onSubmit` with collected values and manages submitting/error state.
   *
   * @param event - The submit event.
   * @returns A promise that settles when the submit handler does.
   */
  async handle(event: Event): Promise<void> {
    event.preventDefault()
    if (this.submitting()) return
    this.submitting.set(true)
    this.error.set(null)
    try {
      await this.onSubmit?.({
        name: this.name(),
        email: this.email(),
        message: this.message(),
      })
      this.submitted.set(true)
      this.name.set('')
      this.email.set('')
      this.message.set('')
    } catch (err: unknown) {
      // React hardcodes this fallback (no i18n key), so the ports keep the
      // same string for DOM parity.
      this.error.set(err instanceof Error ? err.message : 'Submission failed')
    } finally {
      this.submitting.set(false)
    }
  }
}
