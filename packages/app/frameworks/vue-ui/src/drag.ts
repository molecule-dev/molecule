import type { ObjectDirective } from 'vue'

import { bindWebDrag, type WebDragBinding } from '@molecule/app-pointer-events-dom'
import type { ElementDrag } from '@molecule/app-ui'

type DragHost = HTMLElement | SVGElement
const bindings = new WeakMap<DragHost, WebDragBinding>()

/**
 * Binds a DOM element to the web kits' shared drag gesture. Use
 * `v-web-drag="handlers"` in templates or `withDirectives(node, [[vWebDrag, handlers]])`
 * in render functions. Pass undefined to disable the gesture.
 */
export const vWebDrag: ObjectDirective<DragHost, ElementDrag | undefined> = {
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
