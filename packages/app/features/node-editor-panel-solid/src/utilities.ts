/**
 * Helpers shared by the Solid properties-panel primitives.
 *
 * @module
 */

/**
 * Writes a controlled radio's or checkbox's `checked` state the way React
 * writes it at creation: the property and the reflected attribute. Later
 * renders update only the property.
 *
 * @param element - The input element.
 * @param checked - The controlled value.
 */
export const reflectCheckedAtCreation = (element: HTMLInputElement, checked: boolean): void => {
  element.checked = checked
  if (checked) element.setAttribute('checked', '')
  else element.removeAttribute('checked')
}
