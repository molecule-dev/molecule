/**
 * The hand-off the `ListRouteNav` conformance cases make to the probe page: the case puts
 * the props it is about to render on `window` BEFORE kit starts (`startKit` resets the
 * module registry, so module state would not survive), and the probe page reads them at
 * render time.
 *
 * @module
 */

import type { ListRouteNavCaseProps } from '@molecule/app-framework-conformance/routing'

declare global {
  interface Window {
    /** The props the current conformance probe page renders `ListRouteNav` with. */
    __moleculeNavCase?: ListRouteNavCaseProps
  }
}

/**
 * Hands the case's props to the probe page.
 *
 * @param scenario - The props the next started app renders.
 */
export const setNavCase = (scenario: ListRouteNavCaseProps): void => {
  window.__moleculeNavCase = scenario
}

/**
 * The props the current page renders.
 *
 * @returns The case's props.
 * @throws {Error} When the probe page rendered without a case having set any.
 */
export const navCase = (): ListRouteNavCaseProps => {
  const scenario = window.__moleculeNavCase
  if (!scenario) throw new Error('the nav probe page rendered before a case set its props')
  return scenario
}
