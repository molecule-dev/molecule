// @vitest-environment jsdom
/**
 * Where `Dropdown`'s trigger renders. React's root is a fragment (the trigger,
 * then the portal), so the trigger stands where the dropdown stands among its
 * siblings, follows the projected trigger as it changes, and keeps working
 * after every open and close.
 *
 * @module
 */
// Register Angular's JIT compiler facade before any @Component class loads.
import '@angular/compiler'
import {
  ApplicationRef,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { type ComponentFixture, TestBed } from '@angular/core/testing'
import { platformBrowser } from '@angular/platform-browser'
import { BrowserTestingModule } from '@angular/platform-browser/testing'
import { fireEvent } from '@testing-library/dom'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { provideDomPlacement, provideRouter, type Router } from '@molecule/app-angular'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
              .filter((c) => typeof c === 'string' && c.length > 0)
              .join(' ')
        }
        return String(prop)
      },
    }
    return new Proxy({}, handler)
  },
}))

const { Dropdown } = await import('../components/dropdown.component.js')

/** A router that stays on `/`: the dropdown only subscribes to it. */
const router: Router = {
  getLocation: () => ({ pathname: '/', search: '', hash: '' }),
  getParams: <T extends Record<string, string> = Record<string, string>>(): T => ({}) as T,
  getQuery: () => ({}),
  getQueryParam: () => undefined,
  getHash: () => '',
  navigate: () => {},
  navigateTo: () => {},
  back: () => {},
  forward: () => {},
  go: () => {},
  setQuery: () => {},
  setQueryParam: () => {},
  setHash: () => {},
  isActive: () => false,
  matchPath: () => null,
  generatePath: () => '',
  createHref: (path: string) => path,
  subscribe: () => () => {},
  addGuard: () => () => {},
  registerRoutes: () => {},
  getRoutes: () => [],
  destroy: () => {},
}

const ITEMS = [
  { label: 'Profile', value: 'profile' },
  { label: 'Settings', value: 'settings' },
]

/** A consumer list of dropdowns between two fixed siblings. */
const RowsHost = Component({
  selector: 'div[data-dropdown-host="rows"]',
  standalone: true,
  imports: [Dropdown],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<i>head</i>@for (x of xs; track x) {<mol-dropdown [items]="items"
      ><button type="button" slot="trigger">{{ x }}</button></mol-dropdown
    >}<i>tail</i>`,
})(
  class RowsHostComponent {
    /** The triggers. */
    xs: string[] = ['a', 'c']
    /** The menu items. */
    readonly items = ITEMS
  },
)

/** One dropdown whose projected trigger gains and loses a second node. */
const SwitchHost = Component({
  selector: 'div[data-dropdown-host="switch"]',
  standalone: true,
  imports: [Dropdown],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<mol-dropdown [items]="items"
    ><button type="button" slot="trigger">Menu</button
    >@if (badge) {<span slot="trigger">!</span>}</mol-dropdown
  >`,
})(
  class SwitchHostComponent {
    /** Whether the badge joins the trigger. */
    badge = false
    /** The menu items. */
    readonly items = ITEMS
  },
)

/**
 * Mounts a host.
 *
 * @param host - The host component.
 * @returns The fixture.
 */
function mount<H>(host: Type<H>): ComponentFixture<H> {
  TestBed.configureTestingModule({
    imports: [host],
    providers: [provideZonelessChangeDetection(), provideDomPlacement(), provideRouter(router)],
  })
  const fixture = TestBed.createComponent(host)
  fixture.detectChanges()
  return fixture
}

/**
 * Applies a change to the host and renders it.
 *
 * @param fixture - The fixture.
 * @param change - Writes the host's fields.
 */
function update<H>(fixture: ComponentFixture<H>, change: (host: H) => void): void {
  change(fixture.componentInstance)
  fixture.componentRef.injector.get(ChangeDetectorRef).markForCheck()
  fixture.componentRef.injector.get(ApplicationRef).tick()
}

/** The host's children: each trigger as `[x]`, a dropdown host still in the page as `h`. */
const row = (fixture: ComponentFixture<unknown>): string =>
  Array.from((fixture.nativeElement as HTMLElement).children)
    .map((el) =>
      el.tagName === 'MOL-DROPDOWN'
        ? 'h'
        : el.tagName === 'BUTTON'
          ? `[${el.textContent}]`
          : el.textContent,
    )
    .join(' ')

/** The open menu, if any. */
const menu = (): HTMLElement | null => document.body.querySelector('[role="menu"]')

beforeAll(() => {
  TestBed.initTestEnvironment(BrowserTestingModule, platformBrowser())
})

afterAll(() => {
  TestBed.resetTestEnvironment()
})

afterEach(() => {
  TestBed.resetTestingModule()
  document.body.innerHTML = ''
})

describe('Dropdown trigger placement', () => {
  it('renders each trigger where its dropdown stands while a consumer list inserts, reorders and removes', () => {
    const fixture = mount(RowsHost)
    expect(row(fixture)).toBe('head [a] [c] tail')
    update(fixture, (h) => (h.xs = ['a', 'b', 'c']))
    expect(row(fixture)).toBe('head [a] [b] [c] tail')
    update(fixture, (h) => (h.xs = ['c', 'b', 'a']))
    expect(row(fixture)).toBe('head [c] [b] [a] tail')
    update(fixture, (h) => (h.xs = ['b']))
    expect(row(fixture)).toBe('head [b] tail')
    update(fixture, (h) => (h.xs = []))
    expect(row(fixture)).toBe('head tail')
  })

  it('opens the menu again from the trigger after it closed', () => {
    const fixture = mount(SwitchHost)
    const trigger = (fixture.nativeElement as HTMLElement).querySelector('button')!
    fireEvent.click(trigger)
    fixture.detectChanges()
    expect(menu()).not.toBeNull()
    fireEvent.click(trigger)
    fixture.detectChanges()
    expect(menu()).toBeNull()
    fireEvent.click(trigger)
    fixture.detectChanges()
    expect(menu()).not.toBeNull()
  })

  it('wraps the trigger in the role=button fallback while it is more than one node, and adopts the element again after', () => {
    const fixture = mount(SwitchHost)
    const root = fixture.nativeElement as HTMLElement
    const button = root.querySelector('button')!
    expect(root.querySelector('[role="button"]')).toBeNull()
    expect(button.getAttribute('aria-haspopup')).toBe('menu')
    update(fixture, (h) => (h.badge = true))
    const fallback = root.querySelector('[role="button"]') as HTMLElement
    expect(fallback?.textContent).toBe('Menu!')
    expect(button.hasAttribute('aria-haspopup')).toBe(false)
    fireEvent.click(fallback)
    fixture.detectChanges()
    expect(menu()).not.toBeNull()
    expect(fallback.getAttribute('aria-expanded')).toBe('true')
    fireEvent.keyDown(document, { key: 'Escape' })
    fixture.detectChanges()
    update(fixture, (h) => (h.badge = false))
    expect(root.querySelector('[role="button"]')).toBeNull()
    expect(button.getAttribute('aria-haspopup')).toBe('menu')
    fireEvent.click(button)
    fixture.detectChanges()
    expect(menu()).not.toBeNull()
  })
})
