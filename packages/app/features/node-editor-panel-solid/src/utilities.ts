/**
 * Helpers shared by the Solid properties-panel primitives.
 *
 * @module
 */

/**
 * Whether React would render an optional node prop (`footer && …`): nothing for
 * `null`, `undefined`, `false` and the empty string, everything else.
 *
 * @param value - The node-valued prop.
 * @returns True when the region renders.
 */
export const renders = (value: unknown): boolean =>
  value !== null && value !== undefined && value !== false && value !== ''

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
