/**
 * DOM helpers for the projected-slot wrapper of {@link RelatedItemsCard}.
 *
 * React renders `emptyState` bare — with no element around it — when `items`
 * is empty, and nothing at all when it is not. Angular projection needs an
 * always-mounted `<ng-content>` capture point, so the wrapper span lives in
 * the template unconditionally and {@link BareSlot} reconciles it against
 * React's DOM: the projected nodes move out beside an anchor comment (React's
 * bare render), or travel back into the detached wrapper (React renders
 * nothing). Both directions are reversible, because `items` can change while
 * the component stays mounted.
 *
 * @module
 */

import type { ElementRef, Renderer2 } from '@angular/core'

/** One wrapper's captured content, its parent and whether it sits bare in the DOM. */
interface BareSlotState {
  /** The nodes captured from the wrapper, kept across show/hide cycles. */
  nodes: Node[]
  /** The node the wrapper (and its bare content) belongs to. */
  parent: Node
  /** The position comment, standing where the wrapper sat. */
  anchor: Comment
  /** Whether the nodes currently sit in the DOM, bare, before the anchor. */
  revealed: boolean
}

/**
 * Reconciles one capture wrapper against what React renders: its content
 * bare, or nothing.
 */
export class BareSlot {
  private readonly states = new Map<Element, BareSlotState>()

  /**
   * Creates the wrapper helper.
   *
   * @param host - The component host element (fallback parent for a wrapper
   *   that has already been detached).
   * @param renderer - The DOM renderer.
   */
  constructor(
    private readonly host: ElementRef<HTMLElement>,
    private readonly renderer: Renderer2,
  ) {}

  /**
   * Shows the wrapper's content bare, or takes it out of the DOM.
   *
   * @param el - The capture wrapper.
   * @param shouldShow - Whether React renders the content.
   */
  sync(el: Element | undefined | null, shouldShow: boolean): void {
    if (!el) return
    let state = this.states.get(el)
    if (!state) {
      const parent: Node = el.parentElement ?? this.host.nativeElement
      const anchor = this.renderer.createComment('empty-state') as Comment
      parent.insertBefore(anchor, el)
      state = { nodes: Array.from(el.childNodes), parent, anchor, revealed: false }
      this.states.set(el, state)
    }
    if (shouldShow) this.reveal(el, state)
    else this.withhold(el, state)
  }

  /**
   * Moves the captured nodes beside the anchor and detaches the wrapper.
   *
   * @param el - The capture wrapper.
   * @param state - Its captured content.
   */
  private reveal(el: Element, state: BareSlotState): void {
    if (!state.revealed) {
      for (const node of state.nodes) state.parent.insertBefore(node, state.anchor)
      state.revealed = true
    }
    if (el.isConnected) this.renderer.removeChild(state.parent, el)
  }

  /**
   * Moves the captured nodes back into the wrapper and detaches it with them.
   *
   * @param el - The capture wrapper.
   * @param state - Its captured content.
   */
  private withhold(el: Element, state: BareSlotState): void {
    if (state.revealed) {
      for (const node of state.nodes) this.renderer.appendChild(el, node)
      state.revealed = false
    }
    if (el.isConnected) this.renderer.removeChild(state.parent, el)
  }
}
