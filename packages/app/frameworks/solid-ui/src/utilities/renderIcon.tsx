/**
 * Render an icon from the current icon set.
 *
 * @module
 */

import { For, type JSX } from 'solid-js'

import { getIcon, type IconName } from '@molecule/app-icons'

/**
 * Renders an icon by name as a Solid SVG element.
 *
 * The SVG is marked `aria-hidden` + `focusable="false"`: every call site is
 * decorative chrome (close X, chevrons, status glyphs) whose accessible name
 * comes from the surrounding control's `aria-label`/text. Without this, some
 * screen reader/browser combos announce a stray "image" for each glyph.
 *
 * @param name - Icon name from the icon set.
 * @param className - CSS class for sizing.
 * @returns The rendered SVG element.
 */
export function renderIcon(name: IconName, className?: string): JSX.Element {
  const icon = getIcon(name)
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      attr:focusable="false"
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
