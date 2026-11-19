/**
 * Svelte action for a form registration's `ref` setter: hands the mounted DOM
 * element to the controller (React's `ref={field.ref}`), so a failed submit can
 * focus the first invalid field.
 *
 * @module
 */

/**
 * Registers the element with the field, and unregisters it on destroy.
 *
 * @param node - The input or textarea element.
 * @param register - The registration's setter, when it has one.
 * @returns The action's teardown.
 */
export function fieldRef(
  node: HTMLElement,
  register: ((element: HTMLElement | null) => void) | undefined,
): { destroy: () => void } {
  register?.(node)
  return {
    destroy: () => {
      register?.(null)
    },
  }
}
