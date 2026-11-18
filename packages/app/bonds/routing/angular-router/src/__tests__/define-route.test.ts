// @vitest-environment jsdom

import '@angular/compiler'
import { Location } from '@angular/common'
import { provideLocationMocks, SpyLocation } from '@angular/common/testing'
import { Component, provideZonelessChangeDetection, type Type } from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { provideRouter, type Route, Router, RouterOutlet } from '@angular/router'
import { expect, expectTypeOf, it } from 'vitest'

import { defineRoute, injectRouteParams } from '../define-route.js'
import type { AngularRouteParams } from '../types.js'

/** A page that shows the shelf its route names and a fixed suffix. */
const AllPage: Type<unknown> = Component({
  selector: 'mol-all-page',
  standalone: true,
  template: '<h1>{{ params().shelf }}: all</h1>',
})(
  class AllPageComponent {
    readonly params = injectRouteParams<'shelves/:shelf'>()
  },
)

const SavedPage: Type<unknown> = Component({
  selector: 'mol-saved-page',
  standalone: true,
  template: '<h1>{{ params().shelf }}: saved</h1>',
})(
  class SavedPageComponent {
    readonly params = injectRouteParams<'shelves/:shelf/saved'>()
    constructor() {
      expectTypeOf(this.params()).toEqualTypeOf<Readonly<{ shelf: string | undefined }>>()
    }
  },
)

const FilterPage: Type<unknown> = Component({
  selector: 'mol-filter-page',
  standalone: true,
  template: '<h1>{{ params().shelf }}: {{ params().view }}</h1>',
})(
  class FilterPageComponent {
    readonly params = injectRouteParams<'shelves/:shelf/filter/:view'>()
    constructor() {
      expectTypeOf(this.params()).toEqualTypeOf<
        Readonly<{ shelf: string | undefined; view: string | undefined }>
      >()
    }
  },
)

const UnfilteredPage: Type<unknown> = Component({
  selector: 'mol-unfiltered-page',
  standalone: true,
  template: '<h1>{{ params().shelf }}: all views</h1>',
})(
  class UnfilteredPageComponent {
    readonly params = injectRouteParams<'shelves/:shelf/filter'>()
  },
)

const Root: Type<unknown> = Component({
  selector: 'mol-define-route-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />',
})(class RootComponent {})

const routes: Route[] = [
  defineRoute('shelves/:shelf', AllPage),
  defineRoute('shelves/:shelf/saved', SavedPage),
  defineRoute('shelves/:shelf/filter/:view', FilterPage),
  defineRoute('shelves/:shelf/filter', UnfilteredPage),
]

/** A settled macrotask, so Angular finishes activating the route. */
const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

it.each([
  ['/shelves/reading%20list', 'reading list: all'],
  ['/shelves/reading%20list/saved', 'reading list: saved'],
  ['/shelves/reading%20list/filter/reading', 'reading list: reading'],
  ['/shelves/reading%20list/filter', 'reading list: all views'],
])('passes the declared parameters for %s to its page', async (path, title) => {
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
  expect(host.querySelector('h1')?.textContent).toBe(title)
  appRef.destroy()
  host.remove()
})

it('types the parameters of an Angular path', () => {
  expectTypeOf<AngularRouteParams<'a/:id/b/:name'>>().toEqualTypeOf<
    Readonly<{ id: string | undefined; name: string | undefined }>
  >()
  expectTypeOf<AngularRouteParams<'about/**'>>().toEqualTypeOf<
    Readonly<Record<never, string | undefined>>
  >()
})

it('rejects a parameter the path does not declare', () => {
  expectTypeOf<AngularRouteParams<'shelves/:shelf'>>().not.toHaveProperty('view')
  expectTypeOf<AngularRouteParams<'shelves/:shelf'>>().toHaveProperty('shelf')
  expectTypeOf(defineRoute('shelves/:shelf', AllPage).path).toEqualTypeOf<'shelves/:shelf'>()
})
