/**
 * Rendered-content presence, for the components whose DOM depends on what a snippet renders
 * (React's `slot(node)`) rather than on the prop's value.
 *
 * @module
 */

import { untrack } from 'svelte'
import type { Attachment } from 'svelte/attachments'

import { contentNodes } from '@molecule/app-svelte'

/**
 * How many content nodes an element renders: its elements and its text with something in it, as
 * `contentNodes` counts them, but not whitespace-only text. Svelte keeps a template's whitespace
 * around `{#if}` blocks while React's JSX drops it, so whitespace is not something a snippet
 * rendered.
 *
 * @param element - The element whose content is counted.
 * @returns The number of content nodes.
 */
export function renderedContentCount(element: Element): number {
  return contentNodes(element).filter(
    (node) => node.nodeType === 1 || (node.textContent ?? '').trim() !== '',
  ).length
}

/** How {@link contentPresence} decides. */
export interface ContentPresenceOptions {
  /**
   * Whether the element's content renders something. Defaults to any content node (see
   * {@link renderedContentCount}); a component whose own fallback is among the content answers
   * React's `content || fallback` by leaving that fallback out.
   */
  renders?: (element: HTMLElement) => boolean
}

/**
 * Reports whether an element's content renders something, now and after every change Svelte makes
 * to it. A snippet's `{#each}` over no rows changes the DOM without changing the snippet prop, so
 * a `$effect` keyed on the prop would not see it; a `MutationObserver` does, in a microtask after
 * the change.
 *
 * @param report - Receives whether the content renders something.
 * @param options - See {@link ContentPresenceOptions}.
 * @returns The attachment.
 */
export function contentPresence(
  report: (renders: boolean) => void,
  options: ContentPresenceOptions = {},
): Attachment<HTMLElement> {
  const renders = options.renders ?? ((element: HTMLElement) => renderedContentCount(element) > 0)
  return (element) => {
    const sync = (): void => untrack(() => report(renders(element)))
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(element, { childList: true, characterData: true, subtree: true })
    return () => observer.disconnect()
  }
}
