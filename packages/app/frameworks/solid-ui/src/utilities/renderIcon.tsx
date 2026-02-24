/**
 * Render an icon from the current icon set.
 *
 * @module
 */

import { For, type JSX } from 'solid-js'

import { getIcon } from '@molecule/app-icons'

/**
 * Renders an icon by name as a Solid SVG element.
 * @param name - The icon name to render.
 * @param className - Optional CSS class for the SVG element.
 * @returns The rendered SVG icon element.
 */
export function renderIcon(name: string, className?: string): JSX.Element {
  const icon = getIcon(name)
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class={className}
      viewBox={icon.viewBox || '0 0 20 20'}
      fill={icon.fill || 'currentColor'}
      stroke={icon.stroke}
      stroke-width={icon.strokeWidth}
      stroke-linecap={icon.strokeLinecap}
      stroke-linejoin={icon.strokeLinejoin}
    >
      <For each={icon.paths}>
        {(p) => <path d={p.d} fill-rule={p.fillRule} clip-rule={p.clipRule} />}
      </For>
    </svg>
  )
}
