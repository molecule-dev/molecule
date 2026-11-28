/**
 * The props a component spreads onto its root element.
 *
 * @module
 */

/**
 * The caller's rest props for a component's root element, with `BaseProps.automationId`
 * rendered as the `data-mol-id` attribute it documents. Spread raw, React would write
 * `automationId` to the DOM as an unknown attribute (with a dev warning) and the automation
 * hook an agent or E2E test looks for would never appear.
 *
 * @param rest - The props the component does not consume itself.
 * @returns The props to spread onto the root element.
 */
export function rootProps<T extends { automationId?: string }>(
  rest: T,
): Omit<T, 'automationId'> & { 'data-mol-id'?: string } {
  const { automationId, ...others } = rest
  return automationId === undefined ? others : { ...others, 'data-mol-id': automationId }
}
