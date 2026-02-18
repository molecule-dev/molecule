/**
 * Render an icon from the current icon set.
 *
 * @module
 */

import React from 'react'

import { getIcon } from '@molecule/app-icons'

/**
 * Renders an icon by name as a React SVG element.
 *
 * @param name - Icon name from the icon set
 * @param className - CSS class for sizing
 * @returns React SVG element
 */
export function renderIcon(name: string, className?: string): React.ReactElement {
  const icon = getIcon(name)
  return React.createElement(
    'svg',
    {
      xmlns: 'http://www.w3.org/2000/svg',
      className,
      viewBox: icon.viewBox || '0 0 20 20',
      fill: icon.fill || 'currentColor',
      stroke: icon.stroke,
      strokeWidth: icon.strokeWidth,
      strokeLinecap: icon.strokeLinecap,
      strokeLinejoin: icon.strokeLinejoin,
    },
    ...icon.paths.map((p, i) =>
      React.createElement('path', {
        key: i,
        d: p.d,
        fillRule: p.fillRule,
        clipRule: p.clipRule,
      }),
    ),
  )
}
