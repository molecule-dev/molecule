/**
 * Svelte action that applies React's controlled `value` to a native range
 * input: the live property AND the `value` attribute (its `defaultValue`), so a
 * fresh element and a re-rendered one read the same.
 *
 * @module
 */

/**
 * Applies the controlled value at mount and again whenever it changes.
 *
 * @param node - The range input.
 * @param value - The controlled value.
 * @returns The action's update hook.
 */
export function rangeValue(node: HTMLInputElement, value: number): { update(next: number): void } {
  const apply = (text: string): void => {
    if (node.value !== text) node.value = text
    if (node.defaultValue !== text) node.defaultValue = text
  }
  apply(String(value))
  return {
    update: (next: number) => apply(String(next)),
  }
}
