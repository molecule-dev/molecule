/**
 * Writes a checkbox's `checked` and `indeterminate` state the way React writes
 * a controlled input.
 *
 * React treats creation and update differently: when it creates the input it
 * sets the property and the reflected `checked` attribute; on every later
 * render it sets only the property. A box created unchecked and checked
 * afterwards therefore has no `checked` attribute, and one created checked and
 * unchecked keeps it. An `[attr.checked]` or `[checked]` binding rewrites it on
 * every change-detection pass, so the queue writes `checked` through this
 * directive instead. `indeterminate` is a live property React sets from a ref
 * callback on every render; it is never reflected to an attribute.
 *
 * @module
 */

import { Directive, ElementRef, inject, type OnChanges } from '@angular/core'

/**
 * `<input type="checkbox" mol-moderation-checked [molModerationChecked]="checked"
 * [molModerationIndeterminate]="partial">`: sets the property and the attribute
 * at creation, and only the live properties on later changes.
 */
@Directive({
  selector: 'input[type=checkbox][mol-moderation-checked]',
  standalone: true,
  inputs: ['molModerationChecked', 'molModerationIndeterminate'],
})
export class MolModerationChecked implements OnChanges {
  /** Whether the checkbox is checked. */
  molModerationChecked = false

  /** Whether the checkbox draws the indeterminate dash. */
  molModerationIndeterminate = false

  /** The input element. */
  private readonly element = inject<ElementRef<HTMLInputElement>>(ElementRef)

  /** Whether the creation render has already run. */
  private created = false

  /**
   * Applies the first value as React's creation render does, and later ones as
   * its updates do.
   */
  ngOnChanges(): void {
    const input = this.element.nativeElement
    if (!this.created) {
      this.created = true
      input.checked = this.molModerationChecked
      if (this.molModerationChecked) input.setAttribute('checked', '')
      else input.removeAttribute('checked')
    } else {
      input.checked = this.molModerationChecked
    }
    input.indeterminate = this.molModerationIndeterminate
  }
}
