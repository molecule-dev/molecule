/** Positions the themed browser tooltip arrow. */
import type { OverlayPlatform } from '@molecule/app-react/overlay'
import type { TooltipPlacement, WebStyle } from '@molecule/app-ui'

import { Box } from '../elements/Box.js'

/** Arrow square size (px) before the 45° rotation that turns it into a diamond. */
const ARROW_SIZE = 8

/**
 * Returns the arrow's inline position style for a given placement. The arrow
 * has no dedicated ClassMap resolver (`tooltip()` takes no options), so its
 * shape/position is expressed via a small inline style — the sanctioned
 * exception for values ClassMap cannot express. Its color is NOT hardcoded:
 * `var(--color-surface)` / `var(--color-border)` are the same CSS custom
 * properties the `bg-surface`/`border` Tailwind utilities in `tooltipContent`
 * resolve to (see `@molecule/app-ui-tailwind/base.css`), so the arrow always
 * matches the tooltip body in both themes.
 * @param placement - The tooltip's resolved placement.
 * @returns Inline style positioning the rotated-square arrow for that placement.
 */
function getArrowStyle(placement: TooltipPlacement): WebStyle {
  const half = ARROW_SIZE / 2
  const base: WebStyle = {
    position: 'absolute',
    width: ARROW_SIZE,
    height: ARROW_SIZE,
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
  }
  switch (placement) {
    case 'top':
      return { ...base, bottom: -half, left: '50%', transform: 'translateX(-50%) rotate(45deg)' }
    case 'top-start':
      return { ...base, bottom: -half, left: 12, transform: 'rotate(45deg)' }
    case 'top-end':
      return { ...base, bottom: -half, right: 12, transform: 'rotate(45deg)' }
    case 'bottom':
      return { ...base, top: -half, left: '50%', transform: 'translateX(-50%) rotate(45deg)' }
    case 'bottom-start':
      return { ...base, top: -half, left: 12, transform: 'rotate(45deg)' }
    case 'bottom-end':
      return { ...base, top: -half, right: 12, transform: 'rotate(45deg)' }
    case 'left':
      return { ...base, right: -half, top: '50%', transform: 'translateY(-50%) rotate(45deg)' }
    case 'right':
      return { ...base, left: -half, top: '50%', transform: 'translateY(-50%) rotate(45deg)' }
    default:
      return base
  }
}

/** Renders the arrow beside the tooltip surface so the tip cannot clip it. */
export const OverlayArrow: OverlayPlatform['OverlayArrow'] = ({ placement }) => (
  <Box as="span" aria-hidden="true" webStyle={getArrowStyle(placement)} />
)
