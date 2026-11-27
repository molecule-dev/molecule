import type { ObjectDirective } from 'vue'

import {
  bindWebDrag,
  type WebDragBinding,
  type WebDragOptions,
} from '@molecule/app-pointer-events-dom'

type DragHost = HTMLElement | SVGElement
const bindings = new WeakMap<DragHost, WebDragBinding>()

/**
 * Binds a DOM element to the web kits' shared drag gesture. Use
 * `v-web-drag="handlers"` in templates or `withDirectives(node, [[vWebDrag, handlers]])`
 * in render functions. Pass a drag or `{ drag, zoom }`. Undefined disables the gesture.
 */
export const vWebDrag: ObjectDirective<DragHost, WebDragOptions | undefined> = {
  mounted(host, { value }) {
    bindings.set(host, bindWebDrag(host, value))
  },
  updated(host, { value }) {
    bindings.get(host)?.update(value)
  },
  beforeUnmount(host) {
    const binding = bindings.get(host)
    bindings.delete(host)
    binding?.destroy()
  },
}
