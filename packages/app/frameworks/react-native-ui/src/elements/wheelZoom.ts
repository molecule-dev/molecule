import type { ElementHandle } from '@molecule/app-ui'

/**
 * React Native View does not emit wheel events. For touch zoom, pass the element's
 * `zoom` prop and consume its pinch samples.
 *
 * @param _ref - The corresponding web surface.
 * @param _onStep - The corresponding web zoom step.
 */
export function useWheelZoomShortcut(
  _ref: { readonly current: ElementHandle | null },
  _onStep?: (direction: 'in' | 'out') => void,
): void {}
