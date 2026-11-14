/**
 * Writes a checkbox's or radio's `checked` state the way React writes it.
 *
 * React treats creation and update differently: when it creates the input it
 * sets the reflected `checked` attribute (from `checked ?? defaultChecked`);
 * on every later render it sets only the property. A switch created unchecked
 * and turned on therefore has no `checked` attribute, and one created checked
 * and turned off keeps it. An `[attr.checked]` binding rewrites the attribute
 * on every change, so the UI components bind `checked` through this directive
 * instead.
 *
 * @module
 */

import { Directive, ElementRef, inject, type OnChanges, type SimpleChanges } from '@angular/core'

/**
 * `<input type="checkbox" [molChecked]="checked" [molDefaultChecked]="defaultChecked">`:
 * a controlled `molChecked` sets the property on every change and the
 * attribute only at creation; with `molChecked` undefined the input is
 * uncontrolled and its attribute follows `molDefaultChecked`, which the
 * user's own toggles never touch.
 */
@Directive({
  selector: 'input[molChecked], input[molDefaultChecked]',
  standalone: true,
  inputs: ['molChecked', 'molDefaultChecked'],
})
export class MolControlledChecked implements OnChanges {
  /** The controlled value, or `undefined` for an uncontrolled input. */
  molChecked?: boolean
  /** The uncontrolled initial value (React's `defaultChecked`). */
  molDefaultChecked?: boolean

  private readonly element = inject<ElementRef<HTMLInputElement>>(ElementRef)
  private created = false

  /**
   * Applies the first values as React's creation does, and later ones as its updates do.
   *
   * @param changes - The inputs that changed.
   */
  ngOnChanges(changes: SimpleChanges): void {
    const input = this.element.nativeElement
    const controlled = this.molChecked !== undefined
    if (!this.created) {
      this.created = true
      this.reflect((this.molChecked ?? this.molDefaultChecked) === true)
      if (controlled) input.checked = !!this.molChecked
      return
    }
    if (controlled) input.checked = !!this.molChecked
    // React keeps an uncontrolled input's attribute on its `defaultChecked`.
    else if (changes['molDefaultChecked']) this.reflect(this.molDefaultChecked === true)
  }

  /**
   * Sets or removes the reflected `checked` attribute.
   *
   * @param on - Whether the attribute is present.
   */
  private reflect(on: boolean): void {
    const input = this.element.nativeElement
    if (on) input.setAttribute('checked', '')
    else input.removeAttribute('checked')
  }
}
