import type { ElementHandle } from '@molecule/app-ui'

/**
 * The wheel shortcut has no native subscription. Zoom controls call their normal action.
 *
 * @param _ref - The corresponding web surface.
 * @param _onStep - The corresponding web zoom step.
 */
export function useWheelZoomShortcut(
  _ref: { readonly current: ElementHandle | null },
  _onStep?: (direction: 'in' | 'out') => void,
): void {}
