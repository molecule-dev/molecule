/**
 * A controlled radio's reflected `checked` attribute, written the way React
 * writes it.
 *
 * React sets the `checked` property and the reflected attribute when it
 * creates the input, and only the property on every later render. Solid's
 * `checked` binding writes only the property, so the matrix control reflects
 * the created state through {@link reflectCheckedAtCreation}.
 *
 * @module
 */

/**
 * Writes a controlled radio's `checked` attribute as React's initial render
 * does: present when the input is created checked, absent otherwise.
 *
 * @param element - The radio input.
 * @param checked - Whether the input is checked.
 */
export function reflectCheckedAtCreation(element: HTMLInputElement, checked: boolean): void {
  if (checked) element.setAttribute('checked', '')
  else element.removeAttribute('checked')
}
