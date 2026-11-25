import type { Action } from 'svelte/action'

import { bindWebDrag } from '@molecule/app-pointer-events-dom'
import type { ElementDrag } from '@molecule/app-ui'

/**
 * Use `use:webDrag={handlers}` on an HTML or SVG element to bind the web kits'
 * shared drag gesture. Pass undefined to disable it.
 */
export const webDrag: Action<HTMLElement | SVGElement, ElementDrag | undefined> = bindWebDrag
