/**
 * Writes a checkbox's `checked` state the way React writes a controlled input.
 *
 * React treats creation and update differently: when it creates the input it
 * sets the property and the reflected `checked` attribute; on every later
 * render it sets only the property. A box created unchecked and checked
 * afterwards therefore has no `checked` attribute, and one created checked and
 * unchecked keeps it. An `[attr.checked]` or `[checked]` binding rewrites it on
 * every change-detection pass, so the table writes `checked` through this
 * directive instead.
 *
 * @module
 */

import { Directive, ElementRef, inject, type OnChanges } from '@angular/core'

/**
 * `<input type="checkbox" molAdminChecked [molAdminChecked]="checked">`: sets
 * the property and the attribute at creation, and only the property on later
 * changes.
 */
@Directive({
  selector: 'input[type=checkbox][mol-admin-checked]',
  standalone: true,
  inputs: ['molAdminChecked'],
})
export class MolAdminChecked implements OnChanges {
  /** Whether the checkbox is checked. */
  molAdminChecked = false

  private readonly element = inject<ElementRef<HTMLInputElement>>(ElementRef)
  private created = false

  /**
   * Applies the first value as React's creation render does, and later ones as
   * its updates do.
   */
  ngOnChanges(): void {
    const input = this.element.nativeElement
    if (!this.created) {
      this.created = true
      input.checked = this.molAdminChecked
      if (this.molAdminChecked) input.setAttribute('checked', '')
      else input.removeAttribute('checked')
      return
    }
    input.checked = this.molAdminChecked
  }
}
