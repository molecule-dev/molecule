import type { ObjectDirective } from 'vue'

import {
  bindWebWheelZoom,
  type WebWheelZoomBinding,
  type WebWheelZoomHandler,
} from '@molecule/app-pointer-events-dom'

type WheelZoomHost = HTMLElement | SVGElement
const bindings = new WeakMap<WheelZoomHost, WebWheelZoomBinding>()

/**
 * Binds the shared Ctrl-wheel zoom step. Use `v-web-wheel-zoom="onStep"`
 * or `withDirectives(node, [[vWebWheelZoom, onStep]])`. Pass undefined
 * to leave the wheel to the browser.
 */
export const vWebWheelZoom: ObjectDirective<WheelZoomHost, WebWheelZoomHandler | undefined> = {
  mounted(host, { value }) {
    bindings.set(host, bindWebWheelZoom(host, value))
  },
  updated(host, { value }) {
    bindings.get(host)?.update(value)
  },
  beforeUnmount(host) {
    bindings.get(host)?.destroy()
    bindings.delete(host)
  },
}
