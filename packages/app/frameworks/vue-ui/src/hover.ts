import type { ObjectDirective } from 'vue'

import {
  bindWebHover,
  type WebHoverBinding,
  type WebHoverHandlers,
} from '@molecule/app-pointer-events-dom'

type HoverHost = HTMLElement | SVGElement
const bindings = new WeakMap<HoverHost, WebHoverBinding>()

/**
 * Binds the shared mouse and pen hover on an HTML or SVG element. Use
 * `v-web-hover="{ onEnter, onLeave }"` or pass the same callbacks to
 * `withDirectives(node, [[vWebHover, handlers]])`. Pass undefined to disable it.
 */
export const vWebHover: ObjectDirective<HoverHost, WebHoverHandlers | undefined> = {
  mounted(host, { value }) {
    bindings.set(host, bindWebHover(host, value))
  },
  updated(host, { value }) {
    bindings.get(host)?.update(value)
  },
  beforeUnmount(host) {
    bindings.get(host)?.destroy()
    bindings.delete(host)
  },
}
