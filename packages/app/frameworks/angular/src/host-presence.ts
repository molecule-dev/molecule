/**
 * Keeps a component's host element in the DOM only while the component renders
 * something: Angular's equivalent of a React component that returns `null`.
 *
 * @module
 */

import {
  afterEveryRender,
  ChangeDetectorRef,
  DestroyRef,
  effect,
  ElementRef,
  inject,
} from '@angular/core'

/**
 * Takes the calling component's host element out of the DOM while `isPresent()`
 * is false and puts it back in the same place once it is true, so the page
 * holds no element for a component that renders nothing, as with React's
 * `return null`. Call it in the component's injection context (a field
 * initializer or the constructor). The component should not detach or restore
 * its host itself.
 *
 * It runs after every render of the application, so it follows every kind of
 * change: an input write, a template event, and a signal written from a
 * document listener or a timer. That last kind refreshes only the component's
 * own view, so an `ngDoCheck` hook never runs for it; a host restored there
 * stayed out of the page and the component's content never showed. While the
 * host is out, an empty comment node holds its place, so it returns to the same
 * spot even when its neighbours changed. That comment goes when the view does.
 * Angular skips after-render callbacks on a pass that renders nothing, so the
 * signals `isPresent` reads are also watched: a change to one marks the
 * component for check, even when its template does not read that signal.
 * Angular removes a view's nodes before its destroy hooks run, so a destroy
 * hook must not put the host back: it would return to the page after the
 * component was removed. A field focused inside the host is blurred as the host
 * leaves, because React removes the subtree and focus with it; the blur's
 * `focusout` reaches other components' listeners after the view check, so a
 * change they make in response is rendered.
 *
 * @param isPresent - Whether the component renders anything now. It is read
 *   after each render, so it may read inputs, plain fields or signals.
 */
export function useHostPresence(isPresent: () => boolean): void {
  const host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement
  let placeholder: Comment | null = null
  const changeDetector = inject(ChangeDetectorRef)
  effect(() => {
    isPresent()
    changeDetector.markForCheck()
  })
  afterEveryRender({
    write: () => {
      if (!isPresent()) {
        if (placeholder === null && host.parentNode !== null) {
          const active = host.ownerDocument.activeElement
          if (active instanceof HTMLElement && host.contains(active)) active.blur()
          placeholder = host.ownerDocument.createComment('')
          host.replaceWith(placeholder)
        }
      } else if (placeholder !== null) {
        // A placeholder whose parent was removed meanwhile has nowhere to restore to.
        placeholder.replaceWith(host)
        placeholder = null
      }
    },
  })
  inject(DestroyRef).onDestroy(() => {
    placeholder?.remove()
    placeholder = null
  })
}
