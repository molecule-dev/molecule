// @vitest-environment jsdom
/**
 * The triggers Tooltip and Dropdown adopt. React clones whatever single element it is given, an SVG
 * icon included, so both take an `<svg>` trigger; and a trigger written as `*molLazy` is adopted
 * once it is stamped, as the element it stands for.
 *
 * @module
 */
// Register Angular's JIT compiler facade before any @Component class loads.
import '@angular/compiler'
import {
  ChangeDetectionStrategy,
  Component,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { type ComponentFixture, TestBed } from '@angular/core/testing'
import { platformBrowser } from '@angular/platform-browser'
import { BrowserTestingModule } from '@angular/platform-browser/testing'
import { fireEvent, within } from '@testing-library/dom'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { MolLazy, provideDomPlacement, provideRouter, type Router } from '@molecule/app-angular'

vi.mock('@molecule/app-ui', async (actual) => ({
  ...(await actual<Record<string, unknown>>()),
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

const { Tooltip } = await import('../components/tooltip.component.js')
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

const SvgTooltipHost = Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'div[data-trigger-host="svg-tooltip"]',
  standalone: true,
  imports: [Tooltip],
  template: `<mol-tooltip [delay]="0">
    <span slot="content">Usage help</span>
    <svg data-trigger="svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" /></svg>
  </mol-tooltip>`,
})(class SvgTooltipHostComponent {})

const LazyTooltipHost = Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'div[data-trigger-host="lazy-tooltip"]',
  standalone: true,
  imports: [Tooltip, MolLazy],
  template: `<mol-tooltip [delay]="0">
    <span slot="content">Usage help</span>
    <button type="button" *molLazy>Usage</button>
  </mol-tooltip>`,
})(class LazyTooltipHostComponent {})

const SvgDropdownHost = Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'div[data-trigger-host="svg-dropdown"]',
  standalone: true,
  imports: [Dropdown],
  template: `<mol-dropdown [items]="items" width="trigger"
    ><svg slot="trigger" data-trigger="svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" /></svg
  ></mol-dropdown>`,
})(
  class SvgDropdownHostComponent {
    /** The menu items. */
    readonly items = ITEMS
  },
)

const LazyDropdownHost = Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'div[data-trigger-host="lazy-dropdown"]',
  standalone: true,
  imports: [Dropdown, MolLazy],
  template: `<mol-dropdown [items]="items"
    ><button type="button" slot="trigger" *molLazy>Options</button></mol-dropdown
  >`,
})(
  class LazyDropdownHostComponent {
    /** The menu items. */
    readonly items = ITEMS
  },
)

/**
 * Mounts a host through Angular's zoneless bootstrap and renders it once.
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

/** The page's SVG trigger. */
const svgTrigger = (): SVGElement => document.body.querySelector('svg[data-trigger="svg"]')!

/** The visible tooltip, if any. */
const tooltip = (): HTMLElement | null => within(document.body).queryByRole('tooltip')

/** The open menu, if any. */
const menu = (): HTMLElement | null => document.body.querySelector('[role="menu"]')

beforeAll(() => {
  TestBed.initTestEnvironment(BrowserTestingModule, platformBrowser())
})

afterAll(() => {
  TestBed.resetTestEnvironment()
})

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  TestBed.resetTestingModule()
  document.body.innerHTML = ''
  vi.useRealTimers()
})

describe('Tooltip trigger', () => {
  it('describes an SVG trigger by the tooltip while it shows', () => {
    const fixture = mount(SvgTooltipHost)
    const trigger = svgTrigger()
    trigger.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, cancelable: true }))
    fixture.detectChanges()
    const shown = tooltip()
    expect(shown?.textContent).toBe('Usage help')
    expect(trigger.getAttribute('aria-describedby')).toBe(shown?.id)
    trigger.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, cancelable: true }))
    // Hiding waits out the grace period for the pointer to reach the tooltip.
    vi.advanceTimersByTime(150)
    fixture.detectChanges()
    expect(tooltip()).toBeNull()
    expect(trigger.hasAttribute('aria-describedby')).toBe(false)
  })

  it('describes a *molLazy trigger, the element it stamps', () => {
    const fixture = mount(LazyTooltipHost)
    const trigger = within(document.body).getByRole('button', { name: 'Usage' })
    trigger.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, cancelable: true }))
    fixture.detectChanges()
    const shown = tooltip()
    expect(shown?.textContent).toBe('Usage help')
    expect(trigger.getAttribute('aria-describedby')).toBe(shown?.id)
  })
})

describe('Dropdown trigger', () => {
  it('adopts an SVG trigger and opens its menu from it', () => {
    const fixture = mount(SvgDropdownHost)
    const trigger = svgTrigger()
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(trigger)
    fixture.detectChanges()
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    expect(within(menu()!).getByText('Profile')).toBeTruthy()
  })

  it('adopts a *molLazy trigger, the element it stamps', () => {
    const fixture = mount(LazyDropdownHost)
    const trigger = within(document.body).getByRole('button', { name: 'Options' })
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu')
    fireEvent.click(trigger)
    fixture.detectChanges()
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    expect(menu()).not.toBeNull()
  })
})
