/**
 * Render an icon from the current icon set with this renderer's SVG hosts.
 *
 * @module
 */

import { createIconRenderer } from '@molecule/app-react-ui-kit-components/icons'
import { Path, Svg, SvgMarkup } from '@molecule/app-ui-react/elements'

/** Renders a decorative SVG icon from the bonded icon set. */
export const renderIcon = createIconRenderer({ Path, Svg, SvgMarkup })
