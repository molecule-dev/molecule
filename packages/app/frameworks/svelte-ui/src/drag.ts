import type { Action } from 'svelte/action'

import { bindWebDrag, type WebDragOptions } from '@molecule/app-pointer-events-dom'

/**
 * Use `use:webDrag={handlers}` on an HTML or SVG element to bind the web kits'
 * shared gestures. Pass a drag or `{ drag, zoom }`. Undefined disables them.
 */
export const webDrag: Action<HTMLElement | SVGElement, WebDragOptions | undefined> = bindWebDrag
