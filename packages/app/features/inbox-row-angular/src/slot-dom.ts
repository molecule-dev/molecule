/**
 * DOM helpers for the projected-slot wrappers of {@link InboxRow}.
 *
 * React renders a node-valued prop only when the value is truthy. Angular
 * needs an always-mounted `<ng-content>` capture point, so each conditional
 * wrapper (`labels`, `preview`, `timestamp`) lives in the template
 * unconditionally and {@link SlotWrapper.sync} removes it from the DOM
 * whenever React would not render it.
 *
 * @module
 */

import type { ElementRef, Renderer2 } from '@angular/core'

/**
 * Whether an ng-content wrapper captured any element or text node.
 *
 * @param el - The wrapper element.
 * @returns True when at least one projected node exists.
 */
export const hasNodes = (el: Element | undefined | null): boolean => {
  if (!el) return false
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === 1) return true
    if (node.nodeType === 3 && (node.textContent ?? '').trim()) return true
  }
  return false
}

/**
 * Attaches or detaches an always-mounted projection wrapper element from its
 * parent, remembering the re-insertion position with a comment anchor the DOM
 * normalizer strips.
 */
export class SlotWrapper {
  private readonly anchors = new Map<Node, Comment>()

  /**
   * Creates the wrapper helper.
   *
   * @param host - The component host element (default detach parent).
   * @param renderer - The DOM renderer.
   */
  constructor(
    private readonly host: ElementRef<HTMLElement>,
    private readonly renderer: Renderer2,
  ) {}

  /**
   * Attaches or detaches the element (default parent: the component host).
   *
   * @param el - The wrapper element.
   * @param shouldAttach - Whether it should be in the DOM.
   * @param parent - Where the element lives when attached (default: host).
   */
  sync(el: Element | undefined | null, shouldAttach: boolean, parent?: Node): void {
    if (!el) return
    const host: Node = parent ?? this.host.nativeElement
    if (shouldAttach && !el.isConnected) {
      const anchor = this.anchors.get(el)
      if (anchor?.isConnected) {
        host.insertBefore(el, anchor)
        this.renderer.removeChild(host, anchor)
        this.anchors.delete(el)
      } else {
        host.appendChild(el)
      }
    } else if (!shouldAttach && el.isConnected) {
      // Placeholder comment keeps the re-insertion position stable; the
      // normalizer strips comment nodes, so it never shows in snapshots.
      const placeholder = this.renderer.createComment('slot')
      host.insertBefore(placeholder, el)
      this.anchors.set(el, placeholder)
      this.renderer.removeChild(host, el)
    }
  }
}
