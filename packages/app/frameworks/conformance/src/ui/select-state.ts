/**
 * A single-row dropdown with no selected option in its markup normally selects the first
 * enabled option. Multiple selects, list boxes and dropdowns without an enabled option can
 * already represent no selection in markup.
 *
 * @param element - The live element.
 * @returns Whether serializing the live selection into option attributes would lose it.
 */
export function losesEmptySelection(element: Element): boolean {
  if (!isSelect(element)) return false
  return (
    element.selectedIndex === -1 &&
    !element.multiple &&
    element.size <= 1 &&
    Array.from(element.options).some(
      (option) => !option.disabled && !option.parentElement?.matches('optgroup[disabled]'),
    )
  )
}

/**
 * Checks the HTML element type without depending on the document's JavaScript realm.
 *
 * @param element - The live element.
 * @returns Whether the element is an HTML select control.
 */
const isSelect = (element: Element): element is HTMLSelectElement =>
  element.localName === 'select' && element.namespaceURI === 'http://www.w3.org/1999/xhtml'
