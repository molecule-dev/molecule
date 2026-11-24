/**
 * Helpers shared by the Angular properties-panel primitives: the generated
 * radio-group name and a controlled radio's `checked` state written the way
 * React writes it.
 *
 * @module
 */

import { Directive, ElementRef, inject, type OnChanges } from '@angular/core'

/**
 * Source of the generated per-group radio name. The name only ties one group's
 * radios together (one checked at a time, one Tab stop), so any value unique to
 * the instance works; React's binding uses `useId()` for the same job.
 */
let nextGeneratedName = 0

/**
 * A fresh group name, unique to one radio group instance.
 *
 * @returns The generated name.
 */
export const generatedName = (): string => `mol-node-editor-radio-${nextGeneratedName++}`

/**
 * `input[molRadioChecked]`: a controlled radio's `checked` state, written the
 * way React writes it — the reflected attribute at creation and the property
 * on every later change (so a radio created checked and turned off keeps the
 * attribute, and one created unchecked and turned on never gains it).
 */
@Directive({
  selector: 'input[molRadioChecked]',
  standalone: true,
  inputs: ['molRadioChecked'],
})
export class MolRadioChecked implements OnChanges {
  /** The controlled value. */
  molRadioChecked?: boolean

  /** Whether the creation write already happened. */
  private created = false

  private readonly element = inject<ElementRef<HTMLInputElement>>(ElementRef)

  /**
   * Applies the first value as React's creation does, and later ones as its
   * updates do.
   */
  ngOnChanges(): void {
    const input = this.element.nativeElement
    if (!this.created) {
      this.created = true
      input.checked = !!this.molRadioChecked
      if (this.molRadioChecked) input.setAttribute('checked', '')
      else input.removeAttribute('checked')
      return
    }
    input.checked = !!this.molRadioChecked
  }
}
