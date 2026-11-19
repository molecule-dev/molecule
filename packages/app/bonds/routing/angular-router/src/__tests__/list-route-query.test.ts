// @vitest-environment jsdom
/**
 * `list-route-query.test.tsx`, carried to the Angular Router bond: a sibling path
 * selection drives both its link and the collection request, over a real Angular Router.
 *
 * React's case rendered the link with the bond's `ListRouteNav`; this bond has no
 * `ListRouteNav` yet, so the page builds the same link with `list.href({ selection })` —
 * that is exactly what `ListRouteNav` does — and navigates through the native router.
 * React's `useQuery` collection is a computed read keyed on the selection, so it refetches
 * when and only when the selection changes, as `useQuery` does when its key changes.
 *
 * @module
 */

import '@angular/compiler'
import { Component, computed, signal } from '@angular/core'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { useListRoute, useMoleculeRouter } from '../index.js'
import { bootApp, type BootedApp, Empty, historyMove } from './angular-app.js'

const read = vi.fn((saved: boolean) => (saved ? ['Bolt'] : ['Bolt', 'Nut']))

/** The two sibling path views, as React's case declared them. */
const selections = {
  authored: { path: '/members/:member', label: 'Authored' },
  saved: { path: '/members/:member/saved', label: 'Saved' },
}

/** The member page: the list's link to the saved view, its collection, and a local panel. */
@Component({
  selector: 'mol-test-members',
  standalone: true,
  template: `
    <ul>
      @for (row of rows(); track row) {
        <li>{{ row }}</li>
      }
    </ul>
    <a id="saved" [href]="savedHref()" (click)="openSaved($event)">Saved</a>
    <button type="button" (click)="panel.set('Details')">{{ panel() }}</button>
  `,
})
class MembersPage {
  /** The URL-backed list over the sibling path views. */
  readonly list = useListRoute({ selections })
  /** The collection the selection requests, as React's `useQuery` returned it. */
  readonly rows = computed(() => read(this.list.selection() === 'saved'))
  /** The page-local panel state React held in `useState`. */
  readonly panel = signal('Preview')
  private readonly router = useMoleculeRouter()

  /**
   * The saved view's link, built by the list's own href.
   *
   * @returns The link target.
   */
  savedHref(): string {
    return this.list.href({ selection: 'saved' })
  }

  /**
   * Follows the link through the native router, as a link click does.
   *
   * @param event - The click event.
   */
  openSaved(event: Event): void {
    event.preventDefault()
    void this.router.navigate(this.savedHref())
  }
}

const routes = [
  { path: 'members/:member', component: Empty },
  { path: 'members/:member/saved', component: Empty },
  { path: '**', component: Empty },
]

let app: BootedApp | undefined

/**
 * Boots the app at a member URL.
 *
 * @param initialPath - The URL to start at.
 * @returns The mounted page.
 */
const mount = async (initialPath: string): Promise<MembersPage> => {
  app = await bootApp({ routes, root: MembersPage, initialPath })
  return app.componentRef.instance as MembersPage
}

beforeEach(() => {
  read.mockClear()
})

afterEach(() => {
  app?.teardown()
  app = undefined
})

it('uses a sibling path selection for both its link and the collection request', async () => {
  const page = await mount('/members/Ada?page=3')
  expect(page.list.selection()).toBe('authored')
  expect(app?.host.querySelectorAll('li')).toHaveLength(2)
  app?.host.querySelector<HTMLAnchorElement>('#saved')!.click()
  await app?.settle()
  expect(read).toHaveBeenLastCalledWith(true)
  expect(page.list.selection()).toBe('saved')
  expect(app?.host.querySelectorAll('li')).toHaveLength(1)
  if (!app) throw new Error('no application booted')
  await historyMove(app, -1)
  expect(page.list.selection()).toBe('authored')
  expect(app.host.querySelectorAll('li')).toHaveLength(2)
  await historyMove(app, 1)
  expect(page.list.selection()).toBe('saved')
  expect(app.host.querySelectorAll('li')).toHaveLength(1)
})

it('reads a direct sibling path without inventing a matching query flag', async () => {
  const page = await mount('/members/Ada/saved?page=2')
  expect(read).toHaveBeenLastCalledWith(true)
  expect(page.list.selection()).toBe('saved')
  expect(app?.host.querySelectorAll('li')).toHaveLength(1)
})

it('counterexample: an unrelated query flag and a local panel do not select a path view', async () => {
  const page = await mount('/members/Ada?saved=1')
  expect(read).toHaveBeenLastCalledWith(false)
  expect(page.list.selection()).toBe('authored')
  expect(app?.host.querySelectorAll('li')).toHaveLength(2)
  app?.host.querySelector('button')!.click()
  await app?.settle()
  expect(app?.host.querySelector('button')!.textContent).toBe('Details')
  expect(app?.host.querySelectorAll('li')).toHaveLength(2)
})
