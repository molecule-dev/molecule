import type { Action } from 'svelte/action'

import { bindWebHover, type WebHoverHandlers } from '@molecule/app-pointer-events-dom'

/**
 * Use `use:webHover={{ onEnter, onLeave }}` on an HTML or SVG element
 * to handle shared mouse and pen hover. Pass undefined to disable it.
 */
export const webHover: Action<HTMLElement | SVGElement, WebHoverHandlers | undefined> = bindWebHover
