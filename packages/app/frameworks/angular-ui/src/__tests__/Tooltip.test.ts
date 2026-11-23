// @vitest-environment jsdom
/**
 * Tooltip pointer coordination and viewport placement, mirroring
 * `@molecule/app-ui-react/src/__tests__/Tooltip.test.tsx`.
 *
 * Angular's version of React's `onMouseEnter`/`onMouseLeave` is the bubbling
 * `mouseover`/`mouseout` pair the component binds, so the pointer moves below
 * are the same boundary crossings a user makes. React's `content` prop is the
 * `[slot=content]` projection here (the content a visible tooltip renders).
 *
 * @module
 */
// Register Angular's JIT compiler facade before any @Component class loads.
import '@angular/compiler'
import { Component, provideZonelessChangeDetection, signal, type Type } from '@angular/core'
import { type ComponentFixture, TestBed } from '@angular/core/testing'
import { platformBrowser } from '@angular/platform-browser'
import { BrowserTestingModule } from '@angular/platform-browser/testing'
import { within } from '@testing-library/dom'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { provideDomPlacement } from '@molecule/app-angular'

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

const { Tooltip } = await import('../components/tooltip.component.js')

/** A tooltip plus its single trigger, as the component's API takes them. */
const tooltip = (content: string, label: string, delay = 0): string =>
  `<mol-tooltip [delay]="${delay}">
    <span slot="content">${content}</span>
    <button type="button">${label}</button>
  </mol-tooltip>`

/** Three triggers, each with its own help (the toolbar hand-off case). */
const ToolbarHost = Component({
  selector: 'div[data-tooltip-host="toolbar"]',
  standalone: true,
  imports: [Tooltip],
  template: `${tooltip('Share help', 'Share')}${tooltip('Report help', 'Report')}${tooltip(
    'Settings help',
    'Settings',
  )}`,
})(class ToolbarHostComponent {})

/** A visible tooltip replaced by a delayed one, then by an immediate one. */
const HandoffHost = Component({
  selector: 'div[data-tooltip-host="handoff"]',
  standalone: true,
  imports: [Tooltip],
  template: `${tooltip('Share help', 'Share')}${tooltip(
    'Delayed settings',
    'Settings',
    300,
  )}${tooltip('Report help', 'Report')}`,
})(class HandoffHostComponent {})

/** An older tooltip that unmounts while a newer one owns the page. */
const ReplaceHost = Component({
  selector: 'div[data-tooltip-host="replace"]',
  standalone: true,
  imports: [Tooltip],
  template: `@if (first()) {${tooltip('Old help', 'Old')}}${tooltip(
    'Current help',
    'Current',
  )}${tooltip('Next help', 'Next')}`,
})(
  class ReplaceHostComponent {
    /** Whether the replaced tooltip is still mounted. */
    readonly first = signal(true)
  },
)

/** A pointer-only tooltip beside a focused text control. */
const EscapeHost = Component({
  selector: 'div[data-tooltip-host="escape"]',
  standalone: true,
  imports: [Tooltip],
  template: `<input aria-label="Composer" />${tooltip('Context summary', 'Context')}`,
})(class EscapeHostComponent {})

/** One tooltip whose content and delay the test drives. */
const SingleHost = Component({
  selector: 'div[data-tooltip-host="single"]',
  standalone: true,
  imports: [Tooltip],
  template: `<mol-tooltip [delay]="delay()">
    <span slot="content">{{ content() }}</span>
    <button type="button">Context</button>
  </mol-tooltip>`,
})(
  class SingleHostComponent {
    /** The tooltip text. */
    readonly content = signal('Context summary')
    /** Delay before showing. */
    readonly delay = signal(0)
  },
)

/** Mounts a host through Angular's zoneless bootstrap and renders it once. */
function mount<H>(host: Type<H>): ComponentFixture<H> {
  TestBed.configureTestingModule({
    imports: [host],
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
  })
  const fixture = TestBed.createComponent(host)
  fixture.detectChanges()
  return fixture
}

/** The buttons on the page. */
const button = (name: string): HTMLElement =>
  within(document.body).getByRole('button', { name }) as HTMLElement

/** The visible tooltips, in document order. */
const tooltips = (): HTMLElement[] => within(document.body).queryAllByRole('tooltip')

/** The single visible tooltip. */
const getTooltip = (): HTMLElement => within(document.body).getByRole('tooltip')

/** Enters an element's boundary (a native bubbling `mouseover`). */
const pointerEnter = (el: Element): void => {
  el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, cancelable: true }))
}

/** Leaves an element's boundary (a native bubbling `mouseout`). */
const pointerLeave = (el: Element): void => {
  el.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, cancelable: true }))
}

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
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('tooltip hover interactions', () => {
  it('hands off immediately across toolbar buttons without leaving a tooltip trail', () => {
    const fixture = mount(ToolbarHost)
    for (const label of ['Share', 'Report', 'Settings']) {
      pointerEnter(button(label))
      fixture.detectChanges()
      expect(tooltips()).toHaveLength(1)
      expect(getTooltip().textContent).toBe(`${label} help`)
      pointerLeave(button(label))
      vi.advanceTimersByTime(25)
    }
    vi.advanceTimersByTime(150)
    fixture.detectChanges()
    expect(tooltips()).toHaveLength(0)
  })

  it('cancels another trigger’s pending show and replaces visible help even when the new tooltip is delayed', () => {
    const fixture = mount(HandoffHost)
    pointerEnter(button('Share'))
    fixture.detectChanges()
    expect(getTooltip().textContent).toBe('Share help')
    pointerEnter(button('Settings'))
    fixture.detectChanges()
    expect(tooltips()).toHaveLength(0)
    vi.advanceTimersByTime(100)
    pointerEnter(button('Report'))
    vi.advanceTimersByTime(500)
    fixture.detectChanges()
    expect(tooltips()).toHaveLength(1)
    expect(getTooltip().textContent).toBe('Report help')
  })

  it('preserves the current owner when an older replaced tooltip unmounts', () => {
    const fixture = mount(ReplaceHost)
    pointerEnter(button('Old'))
    fixture.detectChanges()
    pointerEnter(button('Current'))
    fixture.detectChanges()
    fixture.componentInstance.first.set(false)
    fixture.detectChanges()
    expect(getTooltip().textContent).toBe('Current help')
    pointerEnter(button('Next'))
    fixture.detectChanges()
    expect(tooltips()).toHaveLength(1)
    expect(getTooltip().textContent).toBe('Next help')
  })

  it('dismisses pointer-only hover with Escape while focus stays in another control', () => {
    const fixture = mount(EscapeHost)
    const composer = document.querySelector<HTMLInputElement>('input[aria-label="Composer"]')
    expect(composer).not.toBeNull()
    composer!.focus()
    pointerEnter(button('Context'))
    fixture.detectChanges()
    expect(getTooltip()).toBeTruthy()
    composer!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    fixture.detectChanges()
    expect(tooltips()).toHaveLength(0)
    expect(document.activeElement).toBe(composer)
  })

  it('stays open when crossing the gap into tooltip content and closes after leaving both', () => {
    const fixture = mount(SingleHost)
    const trigger = button('Context')
    pointerEnter(trigger)
    fixture.detectChanges()
    pointerLeave(trigger)
    vi.advanceTimersByTime(75)
    pointerEnter(getTooltip())
    vi.advanceTimersByTime(500)
    fixture.detectChanges()
    expect(getTooltip()).toBeTruthy()
    pointerLeave(getTooltip())
    vi.advanceTimersByTime(150)
    fixture.detectChanges()
    expect(tooltips()).toHaveLength(0)
  })

  it('cancels a pending delayed show when the pointer only passes over the trigger', () => {
    const fixture = mount(SingleHost)
    fixture.componentInstance.delay.set(300)
    fixture.detectChanges()
    const trigger = button('Context')
    pointerEnter(trigger)
    vi.advanceTimersByTime(100)
    pointerLeave(trigger)
    vi.advanceTimersByTime(1000)
    fixture.detectChanges()
    expect(tooltips()).toHaveLength(0)
  })

  it('clicks dismiss immediately and unmount clears pending timers', () => {
    const fixture = mount(SingleHost)
    const trigger = button('Context')
    pointerEnter(trigger)
    fixture.detectChanges()
    trigger.click()
    fixture.detectChanges()
    expect(tooltips()).toHaveLength(0)
    pointerEnter(trigger)
    fixture.detectChanges()
    pointerLeave(trigger)
    fixture.destroy()
    // Queued position updates are microtasks, not pending show/hide timers:
    // flush them so only a leaked timer could remain.
    vi.advanceTimersByTime(0)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('keeps asynchronously expanded content anchored above its trigger', () => {
    vi.spyOn(document.documentElement, 'clientHeight', 'get').mockReturnValue(800)
    vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(1000)
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement,
    ) {
      const height =
        this.getAttribute('role') === 'tooltip' ? (this.textContent === 'Loading' ? 20 : 120) : 30
      return {
        top: 300,
        left: 300,
        width: 200,
        height,
        bottom: 300 + height,
        right: 500,
        x: 300,
        y: 300,
        toJSON: () => ({}),
      }
    })
    const fixture = mount(SingleHost)
    fixture.componentInstance.content.set('Loading')
    fixture.detectChanges()
    pointerEnter(button('Context'))
    fixture.detectChanges()
    expect(getTooltip().parentElement?.style.top).toBe('272px')
    fixture.componentInstance.content.set('Loaded context and allowance details')
    fixture.detectChanges()
    expect(getTooltip().parentElement?.style.top).toBe('172px')
  })
})
