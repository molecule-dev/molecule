// @vitest-environment jsdom
/**
 * A click delivered as soon as the Switch is in the DOM still reaches the
 * caller's change handler — Angular port of
 * `@molecule/app-ui-react/src/__tests__/switch-first-click.test.tsx`.
 *
 * The React reference guards the gap between the switch committing and its
 * passive `useEffect` listener existing. Angular binds the click in the
 * template, so the listener exists from the moment the view is created: the
 * port clicks in the same task as the first change-detection pass, before any
 * later effect flush, and observes the same calls the reference does. The
 * caller's `onClick` (an input on this component, React's rest prop) still
 * runs first and can veto the toggle — ordering and veto are asserted
 * verbatim.
 *
 * @module
 */
// Register Angular's JIT compiler facade before any @Component class loads —
// evaluating the decorators otherwise throws "needs the JIT compiler".
import '@angular/compiler'
import { Component, provideZonelessChangeDetection, type Type } from '@angular/core'
import { type ComponentFixture, TestBed } from '@angular/core/testing'
import { platformBrowser } from '@angular/platform-browser'
import { BrowserTestingModule } from '@angular/platform-browser/testing'
import { fireEvent } from '@testing-library/dom'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-ui', () => {
  // Tokens the switch template CALLS; every other token is a plain string
  // (Angular's class binding rejects function values).
  const CALLABLE = new Set(['switchBase', 'switchThumb'])
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_t, prop) {
      if (prop === 'cn') {
        return (...cls: unknown[]) =>
          cls
            .flat(Infinity)
            .filter((c) => typeof c === 'string' && c.length > 0)
            .join(' ')
      }
      if (typeof prop === 'string' && CALLABLE.has(prop)) return () => prop
      return String(prop)
    },
  }
  return { getClassMap: () => new Proxy({}, handler) }
})

const { Switch } = await import('../components/switch.component.js')

/** What the host exposes to a test (React's switch props). */
interface SwitchHostInstance {
  /** Whether the switch is on. */
  checked: boolean
  /** The caller's change handler. */
  onChange: (event: Event) => void
  /** The caller's click handler. */
  onClick?: (event: MouseEvent) => void
}

/** Host the tests drive: React's `<Switch checked onChange onClick />`. */
const SwitchHost: Type<SwitchHostInstance> = Component({
  selector: 'mol-spec-switch-host',
  standalone: true,
  imports: [Switch],
  template: `<mol-switch
    [checked]="checked"
    [onClick]="onClick"
    (change)="onChange($event)"
  ></mol-switch>`,
})(
  class SpecSwitchHost implements SwitchHostInstance {
    /** Whether the switch is on. */
    checked = false
    /** The caller's change handler. */
    onChange: (event: Event) => void = () => undefined
    /** The caller's click handler. */
    onClick?: (event: MouseEvent) => void
  },
)

/**
 * Mounts the switch host.
 *
 * @param configure - Applies the test's handlers before the first pass.
 * @returns The fixture.
 */
function mountSwitch(
  configure: (instance: SwitchHostInstance) => void,
): ComponentFixture<SwitchHostInstance> {
  TestBed.configureTestingModule({
    imports: [SwitchHost],
    providers: [provideZonelessChangeDetection()],
  })
  const fixture = TestBed.createComponent(SwitchHost)
  configure(fixture.componentInstance)
  fixture.detectChanges()
  return fixture
}

/** The rendered switch button. */
function switchOf(fixture: ComponentFixture<unknown>): HTMLButtonElement {
  const button = fixture.nativeElement.querySelector('[role="switch"]')
  if (!(button instanceof HTMLButtonElement)) throw new TypeError('expected a rendered switch')
  return button
}

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

describe('Switch first click', () => {
  it('calls onChange for a click that lands before passive effects run', () => {
    const onChange = vi.fn<(event: Event) => void>()
    const fixture = mountSwitch((instance) => {
      instance.onChange = onChange
    })
    // No flush between the commit and the click: Angular's template listener
    // is live the moment the view is created.
    fireEvent.click(switchOf(fixture))
    expect(onChange).toHaveBeenCalledTimes(1)
    const event = onChange.mock.calls[0]?.[0]
    if (!(event instanceof Event)) throw new TypeError('expected a browser change event')
    expect(event.target).toBeInstanceOf(HTMLInputElement)
  })

  it('calls the latest onChange after a re-render, once', () => {
    const first = vi.fn<(event: Event) => void>()
    const second = vi.fn<(event: Event) => void>()
    const fixture = mountSwitch((instance) => {
      instance.onChange = first
    })
    fixture.componentInstance.onChange = second
    fixture.detectChanges()
    fireEvent.click(switchOf(fixture))
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })

  it('still toggles when the caller passes an onClick, which runs first', () => {
    const onClick = vi.fn<(event: MouseEvent) => void>()
    const onChange = vi.fn<(event: Event) => void>()
    const fixture = mountSwitch((instance) => {
      instance.onChange = onChange
      instance.onClick = onClick
    })
    fireEvent.click(switchOf(fixture))
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onClick.mock.invocationCallOrder[0]).toBeLessThan(onChange.mock.invocationCallOrder[0]!)
  })

  it('does not toggle when the caller onClick prevents the default', () => {
    const onChange = vi.fn<(event: Event) => void>()
    const fixture = mountSwitch((instance) => {
      instance.onChange = onChange
      instance.onClick = (event) => event.preventDefault()
    })
    fireEvent.click(switchOf(fixture))
    expect(onChange).not.toHaveBeenCalled()
  })
})
