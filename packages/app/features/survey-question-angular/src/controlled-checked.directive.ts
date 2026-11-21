/**
 * Writes a radio's `checked` state the way React writes it.
 *
 * React treats creation and update differently: when it creates the input it
 * sets the reflected `checked` attribute and the property; on every later
 * render it sets only the property. A radio created unchecked and selected
 * later therefore has no `checked` attribute, and one created selected and
 * cleared keeps it. An `[attr.checked]` binding rewrites the attribute on
 * every change, so the matrix control binds `checked` through this directive
 * instead.
 *
 * @module
 */

import { Directive, ElementRef, inject, type OnChanges } from '@angular/core'

/**
 * `<input type="radio" [molChecked]="checked">`: a controlled value sets the
 * property on every change and the attribute only at creation.
 */
@Directive({
  selector: 'input[molChecked]',
  standalone: true,
  inputs: ['molChecked'],
})
export class MolChecked implements OnChanges {
  /** The controlled value. */
  molChecked?: boolean

  private readonly element = inject<ElementRef<HTMLInputElement>>(ElementRef)
  private created = false

  /**
   * Applies the first value as React's creation does, and later ones as its
   * updates do.
   */
  ngOnChanges(): void {
    const input = this.element.nativeElement
    const checked = !!this.molChecked
    if (!this.created) {
      this.created = true
      input.checked = checked
      if (checked) input.setAttribute('checked', '')
      else input.removeAttribute('checked')
      return
    }
    input.checked = checked
  }
}
