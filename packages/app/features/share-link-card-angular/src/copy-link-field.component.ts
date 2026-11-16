/**
 * CopyField component (internal React parity) — the trimmed, diverged copy of
 * `@molecule/app-copy-link-field-angular` that `ShareLinkCard` renders. It is
 * NOT exported from the package barrel; use `@molecule/app-copy-link-field-angular`
 * for a standalone copy field.
 *
 * @module
 */

import { Component, type DoCheck, ElementRef, inject, type OnDestroy, signal } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import { copyTextWithFallback } from '@molecule/app-clipboard'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-angular'

/**
 * CopyField component.
 *
 * Read-only input + copy-to-clipboard button. The host IS the outer `<div>`
 * (`div[mol-share-link-copy-field]`), matching React's root exactly. Copying
 * goes through `copyTextWithFallback()` from `@molecule/app-clipboard` — the
 * bonded clipboard provider first, then the legacy copy command — so a blocked
 * clipboard leaves the button unchanged instead of throwing. Labels use
 * `copyLink.*` i18n keys, read through the binding's reactive `useTranslation()`.
 */
@Component({
  selector: 'div[mol-share-link-copy-field]',
  standalone: true,
  imports: [Button],
  inputs: ['value', 'className'],
  host: {
    '[class]': 'classes()',
  },
  template: `<input
      readonly
      type="text"
      [attr.value]="valueText()"
      [attr.aria-label]="ariaLabel()"
      (focus)="onFieldFocus($event)"
      [class]="inputClasses()"
    />
    <button mol-button [variant]="'solid'" [size]="'sm'" (click)="copyValue()">
      {{ buttonLabel() }}
    </button>`,
})
export class CopyLinkField implements DoCheck, OnDestroy {
  /** Value to display (and copy on click). */
  value?: string
  /** Extra classes. */
  className?: string

  /** The element ref of the host (the outer div). */
  private readonly el = inject(ElementRef)

  /** Reactive translations, read in the injection context. */
  private readonly i18n = useTranslation()

  /** Whether the last copy succeeded ("Copied!" is showing). */
  private readonly copied = signal(false)

  /** The pending feedback reset timer, cleared when the component dies. */
  private timer?: ReturnType<typeof setTimeout>

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The wrapper class list (React's
   * `cm.cn(cm.flex({ align: 'center', gap: 'sm' }), className)`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().flex({ align: 'center', gap: 'sm' }), this.className)
  }

  /**
   * The input's class list (React's `cm.cn(cm.input(), cm.flex1)`).
   * @returns The class string.
   */
  inputClasses(): string {
    return this.cm().cn(this.cm().input(), this.cm().flex1)
  }

  /**
   * The displayed value (React's required `value` prop, `''` until bound).
   * @returns The value text.
   */
  valueText(): string {
    return this.value ?? ''
  }

  /**
   * The input's accessible name (React's
   * `t('shareLinkCard.aria.url', …)`), read through the reactive i18n handle
   * so it follows a locale switch.
   * @returns The aria-label text.
   */
  ariaLabel(): string {
    return this.i18n.t('shareLinkCard.aria.url', undefined, { defaultValue: 'Share link' })
  }

  /**
   * The copy button's text (React's `t('copyLink.copied'|'copyLink.copy', …)`),
   * following the copied state and the locale.
   * @returns The button text.
   */
  buttonLabel(): string {
    return this.copied()
      ? this.i18n.t('copyLink.copied', undefined, { defaultValue: 'Copied!' })
      : this.i18n.t('copyLink.copy', undefined, { defaultValue: 'Copy' })
  }

  /**
   * Selects the input's whole content on focus, so manual Ctrl/Cmd+C works.
   *
   * @param event - The native focus event.
   */
  onFieldFocus(event: FocusEvent): void {
    ;(event.target as HTMLInputElement).select()
  }

  /**
   * Copies the value through `copyTextWithFallback()`, then shows the "Copied!"
   * feedback for 1500ms only when a copy happened.
   */
  copyValue(): void {
    void copyTextWithFallback(this.valueText()).then((copiedOk) => {
      if (!copiedOk) return
      this.copied.set(true)
      this.timer = setTimeout(() => this.copied.set(false), 1500)
    })
  }

  /**
   * React's controlled input: the live value always follows the `value` prop
   * (the `[attr.value]` binding writes the attribute; the property is synced
   * here so both reads of the field agree after a re-render).
   */
  ngDoCheck(): void {
    const input = (this.el.nativeElement as HTMLElement).querySelector(
      'input',
    ) as HTMLInputElement | null
    const text = this.valueText()
    if (input && input.value !== text) input.value = text
  }

  /** Detaches the feedback timer with the component. */
  ngOnDestroy(): void {
    clearTimeout(this.timer)
  }
}
