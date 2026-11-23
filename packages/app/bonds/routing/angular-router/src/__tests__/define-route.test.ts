// @vitest-environment jsdom
/**
 * The React routing bond's `define-route.test.tsx`, carried to the Angular Router bond.
 *
 * Every case boots a real Angular Router (`createApplication` + `provideRouter` over the
 * memory `Location`), navigates it to the URL it needs, and reads the rendered page. React
 * hands a page its params as a prop and mounts it through `useRoutes`; the port's page reads
 * them with `injectRouteParams` and Angular mounts the route table itself.
 *
 * @module
 */

import '@angular/compiler'
import { Location } from '@angular/common'
import { provideLocationMocks, SpyLocation } from '@angular/common/testing'
import {
  ChangeDetectionStrategy,
  Component,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { provideRouter, type Route, Router, RouterOutlet } from '@angular/router'
import { expect, expectTypeOf, it } from 'vitest'

import { defineRoute, injectRouteParams } from '../define-route.js'
import type { AngularRouteParams } from '../types.js'

/** A page that shows the shelf its route names and a fixed suffix. */
const AllPage: Type<unknown> = Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'mol-all-page',
  standalone: true,
  template: '<h1>{{ params().shelf }}: all</h1>',
})(
  class AllPageComponent {
    readonly params = injectRouteParams<'/shelves/:shelf'>()
  },
)

const SavedPage: Type<unknown> = Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'mol-saved-page',
  standalone: true,
  template: '<h1>{{ params().shelf }}: saved</h1>',
})(
  class SavedPageComponent {
    readonly params = injectRouteParams<'/shelves/:shelf/saved'>()
    constructor() {
      expectTypeOf(this.params()).toEqualTypeOf<Readonly<{ shelf: string | undefined }>>()
    }
  },
)

const FilterPage: Type<unknown> = Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'mol-filter-page',
  standalone: true,
  template: '<h1>{{ params().shelf }}: {{ params().view }}</h1>',
})(
  class FilterPageComponent {
    readonly params = injectRouteParams<'/shelves/:shelf/filter/:view'>()
    constructor() {
      expectTypeOf(this.params()).toEqualTypeOf<
        Readonly<{ shelf: string | undefined; view: string | undefined }>
      >()
    }
  },
)

const UnfilteredPage: Type<unknown> = Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'mol-unfiltered-page',
  standalone: true,
  template: '<h1>{{ params().shelf }}: all views</h1>',
})(
  class UnfilteredPageComponent {
    readonly params = injectRouteParams<'/shelves/:shelf/filter'>()
  },
)

/**
 * The page the draft cases mount under both `/shelves/:shelf/edit` and `/shelves/new`.
 * React seeds the page from its `params` prop; the port seeds it from `injectRouteParams`.
 */
const ShelfForm: Type<unknown> = Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'mol-shelf-form',
  standalone: true,
  template: '<input aria-label="Shelf title" [value]="title" />',
})(
  class ShelfFormComponent {
    readonly params = injectRouteParams<'/shelves/:shelf/edit'>()
    readonly title = this.params().shelf ?? ''
  },
)

/** The page that shows the shelf parameter of the href case. */
const DetailPage: Type<unknown> = Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'mol-detail-page',
  standalone: true,
  template: '<h1>{{ params().shelf }}</h1>',
})(
  class DetailPageComponent {
    readonly params = injectRouteParams<'/shelves/:shelf'>()
  },
)

/** The page `/library` mounts, so a mount can be seen after its link is built. */
const LibraryPage: Type<unknown> = Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'mol-library-page',
  standalone: true,
  template: '<h1>library</h1>',
})(class LibraryPageComponent {})

/** A route target with no markup for the paths a case only builds links for. */
const EmptyPage: Type<unknown> = Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'mol-empty-page',
  standalone: true,
  template: '',
})(class EmptyPageComponent {})

const Root: Type<unknown> = Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'mol-define-route-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />',
})(class RootComponent {})

/** A settled macrotask, so Angular finishes activating the route. */
const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

/**
 * Boots a real Angular application over the memory `Location` and navigates it.
 *
 * @param routes - The Angular route table to mount.
 * @param path - The URL to navigate to.
 * @returns The bootstrap host and a function that destroys the application.
 */
async function renderRoute(
  routes: Route[],
  path: string,
): Promise<{ host: HTMLElement; dispose: () => void }> {
  const appRef = await createApplication({
    providers: [
      provideZonelessChangeDetection(),
      provideRouter(routes),
      provideLocationMocks(),
      { provide: SpyLocation, useExisting: Location },
    ],
  })
  const host = document.createElement('mol-define-route-root')
  document.body.appendChild(host)
  appRef.bootstrap(Root, host)
  await appRef.injector.get(Router).navigateByUrl(path)
  await tick()
  appRef.tick()
  return {
    host,
    dispose: () => {
      appRef.destroy()
      host.remove()
    },
  }
}

const routes: Route[] = [
  defineRoute('/shelves/new', { Component: ShelfForm }),
  defineRoute('/shelves/:shelf/edit', { Component: ShelfForm }),
  defineRoute('/shelves/:shelf/saved', SavedPage),
  defineRoute('/shelves/:shelf/filter/:view', FilterPage),
  defineRoute('/shelves/:shelf/filter', UnfilteredPage),
  defineRoute('/shelves/:shelf', AllPage),
]

it.each([
  ['/shelves/reading%20list', 'reading list: all'],
  ['/shelves/reading%20list/saved', 'reading list: saved'],
  ['/shelves/reading%20list/filter/reading', 'reading list: reading'],
  ['/shelves/reading%20list/filter', 'reading list: all views'],
])('passes the declared parameters for %s to its page', async (path, title) => {
  const { host, dispose } = await renderRoute(routes, path)
  expect(host.querySelector('h1')?.textContent).toBe(title)
  dispose()
})

// React seeds each page from its `params` prop; the port reads the same params with
// `injectRouteParams` in a field initializer that the template binds.
it.each([
  ['/shelves/reading%20list/edit', 'reading list'],
  ['/shelves/new', ''],
])('initializes the correct draft at %s from the page params prop', async (path, title) => {
  const { host, dispose } = await renderRoute(routes, path)
  expect(host.querySelector<HTMLInputElement>('input[aria-label="Shelf title"]')?.value).toBe(title)
  dispose()
})

it('builds the saved record destination from the same declaration that mounts it', async () => {
  const detail = defineRoute('/shelves/:shelf', DetailPage)
  const saved = { slug: 'reference/maps #1' }
  const destination = detail.href({ shelf: saved.slug })
  expect(destination).toBe('/shelves/reference%2Fmaps%20%231')
  expect(detail.path).toBe('shelves/:shelf')
  expect(detail.component).toBe(DetailPage)

  const { host, dispose } = await renderRoute([detail], destination)
  expect(host.querySelector('h1')?.textContent).toBe(saved.slug)
  dispose()

  expectTypeOf(detail.href).parameter(0).toExtend<{ shelf: string }>()
})

it('builds static and optional-parameter links without changing how their pages are mounted', async () => {
  const home = defineRoute('/library', LibraryPage)
  const search = defineRoute('/search/:query?', EmptyPage)
  const files = defineRoute('/files/**', EmptyPage)
  expect(home.href()).toBe('/library')
  expect(search.href()).toBe('/search')
  expect(search.href({ query: 'street maps' })).toBe('/search/street%20maps')
  expect(files.href({ '*': 'guides/street maps' })).toBe('/files/guides/street%20maps')
  // The link builder leaves each declaration's mount untouched: the same component
  // and the slash-less path Angular's table takes are what `href` was built from.
  expect(home.path).toBe('library')
  expect(home.component).toBe(LibraryPage)

  const { host, dispose } = await renderRoute([home, search, files], home.href())
  expect(host.querySelector('h1')?.textContent).toBe('library')
  dispose()
})

it('types the parameters of an Angular path', () => {
  expectTypeOf<AngularRouteParams<'/a/:id/b/:name'>>().toEqualTypeOf<
    Readonly<{ id: string | undefined; name: string | undefined }>
  >()
  expectTypeOf<AngularRouteParams<'about/**'>>().toEqualTypeOf<
    Readonly<Record<never, string | undefined>>
  >()
})

it('rejects a parameter the path does not declare', () => {
  expectTypeOf<AngularRouteParams<'/shelves/:shelf'>>().not.toHaveProperty('view')
  expectTypeOf<AngularRouteParams<'/shelves/:shelf'>>().toHaveProperty('shelf')
  expectTypeOf(defineRoute('shelves/:shelf', AllPage).path).toEqualTypeOf<'shelves/:shelf'>()
  expectTypeOf(defineRoute('/shelves/:shelf', AllPage).path).toEqualTypeOf<'shelves/:shelf'>()
})
