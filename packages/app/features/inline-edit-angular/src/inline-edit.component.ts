/**
 * InlineEdit component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import {
  afterNextRender,
  Component,
  ElementRef,
  inject,
  Injector,
  type OnChanges,
  signal,
  type SimpleChanges,
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
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Button, Input, Textarea } from '@molecule/app-ui-angular'

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
 * InlineEdit component.
 *
 * Click-to-edit text, the Angular counterpart of
 * `@molecule/app-inline-edit-react`'s `InlineEdit`: the same props (React
 * names), the same DOM for the same input. React's root element is a `<span>`
 * in the read state and a `<div>` in the editor, so the rendered root stands in
 * front of the host's place and the host itself leaves the page
 * (`placeContentBefore` + `setElementPresent`, React's fragment root).
 *
 * React's `renderRead` render prop is an `ng-template` receiving the value as
 * `$implicit` / `a0`.
 */
@Component({
  selector: 'mol-inline-edit',
  standalone: true,
  hostDirectives: [MolPlacement],
  imports: [Button, Input, NgTemplateOutlet, Textarea],
  inputs: ['value', 'onSubmit', 'variant', 'renderRead', 'placeholder', 'className'],
  template: `@if (!editing()) {
      <span
        role="button"
        tabindex="0"
        [class]="readClasses()"
        (click)="startEditing()"
        (keydown)="onReadKey($event)"
      >
        @if (value) {
          @if (renderReadTemplate(); as custom) {
            <ng-container [ngTemplateOutlet]="custom" [ngTemplateOutletContext]="readContext()" />
          } @else {
            <ng-container>{{ value }}</ng-container>
          }
        } @else {
          <span style="opacity: 0.5">{{ placeholderText() }}</span>
        }
      </span>
    } @else {
      <div #editorRoot [class]="editClasses()">
        @if (variantMode() === 'textarea') {
          <div
            mol-textarea
            [value]="draft()"
            (change)="onInput($event)"
            (keydown)="onKey($event)"
            [attr.aria-label]="ariaLabel()"
          ></div>
        } @else {
          <div
            mol-input
            [type]="'text'"
            [value]="draft()"
            (change)="onInput($event)"
            (keydown)="onKey($event)"
            [attr.aria-label]="ariaLabel()"
          ></div>
        }
        <button
          mol-button
          [variant]="'ghost'"
          [size]="'sm'"
          (click)="cancel()"
          [disabled]="saving()"
        >
          {{ cancelText() }}
        </button>
        <button
          mol-button
          [variant]="'solid'"
          [color]="'primary'"
          [size]="'sm'"
          (click)="save()"
          [disabled]="saving()"
        >
          {{ saveText() }}
        </button>
      </div>
    }`,
})
export class InlineEdit implements OnChanges {
  /**
   * Current value. Re-syncs the draft whenever it changes, like React's
   * `useEffect(() => setDraft(value), [value])`.
   */
  value!: string
  /** Called when the user commits a new value (React's `onSubmit`). */
  onSubmit?: (next: string) => void | Promise<void>
  /** Render mode for the editor (React's `'input'` default at read time). */
  variant?: 'input' | 'textarea'
  /** Renderer for the read state — an `ng-template` receiving the value. */
  renderRead?: TemplateRef<unknown> | null
  /** Placeholder when value is empty. */
  placeholder?: string
  /** Extra classes. */
  className?: string

  /** Whether the editor is open. */
  protected readonly editing = signal(false)
  /** The draft value the field shows. */
  protected readonly draft = signal('')
  /** Whether a save is in flight (both buttons are disabled). */
  protected readonly saving = signal(false)

  /** The component host, whose subtree the editor field is found in. */
  private readonly host = inject(ElementRef<HTMLElement>)
  /** The injector `afterNextRender` needs outside a constructor. */
  private readonly injector = inject(Injector)

  /** The editor's root element (only present while editing). */
  @ViewChild('editorRoot') private editorRoot?: ElementRef<HTMLElement>

  /**
   * Reactive translation, read in the injection context. Its `t` reads the
   * locale, so the view re-renders the text on a locale switch (the static `t`
   * does not).
   */
  private readonly i18n = useTranslation()

  constructor() {
    usePlacement(() => this.adopt())
  }

  /**
   * React's `useEffect(() => setDraft(value), [value])`: a changed `value`
   * replaces the draft, including mid-edit.
   * @param changes - The inputs that changed.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if ('value' in changes) this.draft.set(this.value)
  }

  /**
   * React's root element does not exist as a host: the rendered root (the read
   * `<span>` or the editor `<div>`) stands in front of the host's place and the
   * host itself leaves the page, so the host element never appears in a `@focus`
   * path.
   */
  private adopt(): void {
    const host = this.host.nativeElement
    placeContentBefore(host, host)
    setElementPresent(host, false)
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The read state's class list (React's `cm.cn(cm.cursorPointer, className)`).
   * @returns The class string.
   */
  readClasses(): string {
    return this.cm().cn(this.cm().cursorPointer, this.className)
  }

  /**
   * The editor's class list (React's `cm.cn(cm.flex({ align: 'center', gap: 'sm' }), className)`).
   * @returns The class string.
   */
  editClasses(): string {
    return this.cm().cn(this.cm().flex({ align: 'center', gap: 'sm' }), this.className)
  }

  /**
   * The placeholder text React renders for an empty value.
   * @returns The translated placeholder.
   */
  placeholderText(): string {
    return (
      this.placeholder ?? this.i18n.t('inlineEdit.empty', {}, { defaultValue: 'Click to edit' })
    )
  }

  /**
   * The field's accessible label (React's
   * `aria-label={placeholder ?? t('inlineEdit.aria.edit', …)}`).
   * @returns The aria label.
   */
  ariaLabel(): string {
    return this.placeholder ?? this.i18n.t('inlineEdit.aria.edit', {}, { defaultValue: 'Edit' })
  }

  /**
   * The Cancel button's label.
   * @returns The translated label.
   */
  cancelText(): string {
    return this.i18n.t('inlineEdit.cancel', {}, { defaultValue: 'Cancel' })
  }

  /**
   * The Save button's label, or the saving label while a save is in flight.
   * @returns The translated label.
   */
  saveText(): string {
    return this.saving()
      ? this.i18n.t('inlineEdit.saving', {}, { defaultValue: 'Saving…' })
      : this.i18n.t('inlineEdit.save', {}, { defaultValue: 'Save' })
  }

  /**
   * The renderer mode with React's `'input'` default applied.
   * @returns The mode.
   */
  variantMode(): 'input' | 'textarea' {
    return this.variant ?? 'input'
  }

  /**
   * The `renderRead` template, when the caller supplied one.
   * @returns The template, or null.
   */
  renderReadTemplate(): TemplateRef<unknown> | null {
    return isTemplate(this.renderRead) ? this.renderRead : null
  }

  /**
   * The context the `renderRead` template receives (the value as `$implicit` / `a0`).
   * @returns The template context.
   */
  readContext(): Record<string, unknown> {
    const current = this.value
    return { $implicit: current, a0: current, a1: undefined, a2: undefined }
  }

  /** Opens the editor, as React's click handler on the read state does. */
  startEditing(): void {
    this.editing.set(true)
    // React focuses the field in an effect after the editor mounts; there is
    // no field before this render, so focus after the next one.
    afterNextRender(
      () => {
        const field = this.editorRoot?.nativeElement.querySelector('input, textarea')
        if (field instanceof HTMLElement) field.focus()
      },
      { injector: this.injector },
    )
  }

  /**
   * React's read-state `onKeyDown`: Enter opens the editor.
   * @param e - The keyboard event.
   */
  onReadKey(e: KeyboardEvent): void {
    if (e.key === 'Enter') this.startEditing()
  }

  /**
   * Receives each typed value (React's `onChange`).
   * @param e - The native `input` event.
   */
  onInput(e: Event): void {
    this.draft.set((e.target as HTMLInputElement | HTMLTextAreaElement).value)
  }

  /**
   * Handles keyboard events: Escape cancels, Enter (or Cmd/Ctrl+Enter for the
   * textarea) submits.
   * @param e - The keyboard event.
   */
  onKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      e.preventDefault()
      this.cancel()
    }
    if (e.key === 'Enter' && this.variantMode() === 'input') {
      e.preventDefault()
      void this.commit()
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && this.variantMode() === 'textarea') {
      e.preventDefault()
      void this.commit()
    }
  }

  /** Cancels editing, restoring the draft to the current committed value. */
  cancel(): void {
    this.draft.set(this.value)
    this.editing.set(false)
  }

  /** Saves the draft, as React's Save button does. */
  save(): void {
    void this.commit()
  }

  /**
   * Submits the current draft value by calling onSubmit, then closes the editor.
   * @returns A promise that settles once the save does.
   */
  async commit(): Promise<void> {
    if (this.saving()) return
    this.saving.set(true)
    try {
      await this.onSubmit?.(this.draft())
      this.editing.set(false)
    } finally {
      this.saving.set(false)
    }
  }
}
