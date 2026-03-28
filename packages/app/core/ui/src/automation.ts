/**
 * Automation ID system for molecule UI components.
 *
 * Every component gets a `data-mol-id` attribute that AI agents, E2E tests
 * (Playwright), and screen readers can use to interact with the app.
 *
 * The ID follows a semantic pattern: `{component}-{context}-{qualifier}`
 * Examples: `button-login-submit`, `input-email-field`, `card-product-123`
 *
 * @module
 */

/**
 * Generate a semantic automation ID for a component.
 * @param component - Component type (e.g., 'button', 'input', 'card')
 * @param context - Context within the page (e.g., 'login', 'product', 'settings')
 * @param qualifier - Optional qualifier (e.g., 'submit', 'cancel', item ID)
 * @returns The joined automation ID string.
 */
export function molId(component: string, context: string, qualifier?: string): string {
  const parts = [component, context]
  if (qualifier) parts.push(qualifier)
  return parts.join('-')
}

/**
 * The HTML attribute name for automation IDs.
 */
export const MOL_ID_ATTR = 'data-mol-id' as const

/**
 * Generate the props object for spreading onto an element.
 * @param id - The automation ID string.
 * @returns An object with the `data-mol-id` attribute set.
 */
export function molIdProps(id: string): Record<string, string> {
  return { [MOL_ID_ATTR]: id }
}

/**
 * Playwright/testing selector for finding elements by automation ID.
 * @param id - The automation ID to find.
 * @returns A CSS attribute selector string.
 */
export function molSelector(id: string): string {
  return `[${MOL_ID_ATTR}="${id}"]`
}

/**
 * Playwright/testing selector for finding elements by partial automation ID.
 * Useful for finding all elements of a type: molSelectorPrefix('button-login')
 * @param prefix - The automation ID prefix to match.
 * @returns A CSS attribute prefix selector string.
 */
export function molSelectorPrefix(prefix: string): string {
  return `[${MOL_ID_ATTR}^="${prefix}"]`
}
