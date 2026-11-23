// @vitest-environment jsdom
/**
 * The star radiogroup's keyboard support (the WAI-ARIA APG radio group
 * pattern) — the Angular port of
 * `@molecule/app-rating-form-react/src/__tests__/rating-form-keyboard.test.tsx`:
 * the same test names and assertions, mounted through Angular's real renderer
 * in jsdom. A roving tabindex makes the checked star the group's one tab stop,
 * and the arrows / Home / End select and focus stars, wrapping. The group
 * itself is `tabindex={-1}` — focusable but never a tab stop.
 *
 * @module
 */

import '@angular/compiler'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  createComponent,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token — the same
// mock the Angular suite uses.
vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
              .map((c) => (typeof c === 'function' ? c() : c))
              .filter((c) => typeof c === 'string' && c.length > 0)
              .join(' ')
        }
        const token = String(prop)
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

// Each key falls back to its default value.
vi.mock('@molecule/app-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

vi.mock('@molecule/app-ui-angular', async () => {
  const { Component } = await import('@angular/core')
  return {
    Button: Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'button[mol-button]',
      standalone: true,
      inputs: ['type', 'variant', 'color', 'disabled'],
      host: {
        'data-button': '',
        '[attr.type]': 'type ?? "button"',
        '[disabled]': 'disabled || null',
      },
      template: `<ng-content></ng-content>`,
    })(
      class MockButton {
        /** Native button type. */
        type?: string
        /** Visual variant (unused by the marker). */
        variant?: string
        /** Colour variant (unused by the marker). */
        color?: string
        /** Disabled state. */
        disabled?: boolean
      },
    ),
    Textarea: Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'div[mol-textarea]',
      standalone: true,
      inputs: ['placeholder', 'value', 'rows'],
      template: `<textarea
        data-textarea
        [attr.placeholder]="placeholder"
        [attr.rows]="rows"
      ></textarea>`,
    })(
      class MockTextarea {
        /** Placeholder text. */
        placeholder?: string
        /** Controlled value. */
        value?: string
        /** Rows attribute. */
        rows?: number
      },
    ),
  }
})

const { RatingForm } = await import('../rating-form.component.js')

/** A mounted host with an explicit change-detection tick. */
interface Mounted {
  /** The host element. */
  readonly host: HTMLElement
  /** Runs zoneless change detection to flush the signals into the DOM. */
  tick(): void
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts the form through a JIT host template, the way the Angular suite does.
 *
 * @param props - The props the host template binds.
 * @returns The mounted host.
 */
async function mount(props: Record<string, unknown> = {}): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [RatingForm as Type<unknown>],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `<form mol-rating-form
      [onSubmit]="p['onSubmit']"
      [max]="p['max']"
      [defaultRating]="p['defaultRating']"
    ></form>`,
  })(
    class SpecHost {
      /** The props the template binds. */
      p: Record<string, unknown> = props
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection()],
  })
  const ref: ComponentRef<{ p: Record<string, unknown> }> = createComponent(Host, {
    environmentInjector: appRef.injector,
  })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  return {
    host,
    tick: () => appRef.tick(),
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

const mounted: Mounted[] = []

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

/**
 * Mounts `RatingForm` with the given props.
 *
 * @param props - The component props.
 * @returns The mounted host.
 */
async function render(props: Record<string, unknown> = {}): Promise<Mounted> {
  const m = await mount({ onSubmit: () => {}, ...props })
  mounted.push(m)
  return m
}

/** The star buttons, in order. */
const stars = (host: HTMLElement): HTMLButtonElement[] =>
  [...host.querySelectorAll('[data-mol-id="rating-form-star"]')] as HTMLButtonElement[]

/** The checked star's number (1-based). */
const checked = (host: HTMLElement): number =>
  stars(host).findIndex((s) => s.getAttribute('aria-checked') === 'true') + 1

/**
 * Presses a key on a star, flushes change detection, and reports whether the
 * key's default was prevented.
 *
 * @param m - The mounted host.
 * @param n - The star to press (1-based).
 * @param key - The key.
 * @returns Whether the event's default was prevented.
 */
function press(m: Mounted, n: number, key: string): boolean {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
  stars(m.host)[n - 1]!.dispatchEvent(event)
  m.tick()
  return event.defaultPrevented
}

/**
 * Focuses a star the way a keyboard user arrives at it.
 *
 * @param m - The mounted host.
 * @param n - The star (1-based).
 */
function focus(m: Mounted, n: number): void {
  stars(m.host)[n - 1]!.focus()
}

describe('RatingForm keyboard', () => {
  it('arrow keys move the checked star and focus, wrapping', async () => {
    const m = await render({ defaultRating: 4 })
    focus(m, 4)
    press(m, 4, 'ArrowRight')
    expect(checked(m.host)).toBe(5)
    expect(document.activeElement).toBe(stars(m.host)[4])
    press(m, 5, 'ArrowRight')
    expect(checked(m.host)).toBe(1)
    expect(document.activeElement).toBe(stars(m.host)[0])
    expect(press(m, 1, 'ArrowLeft')).toBe(true)
    expect(checked(m.host)).toBe(5)
    expect(document.activeElement).toBe(stars(m.host)[4])
    // ArrowDown is next and ArrowUp previous, the same wrapping.
    press(m, 5, 'ArrowDown')
    expect(checked(m.host)).toBe(1)
    press(m, 1, 'ArrowUp')
    expect(checked(m.host)).toBe(5)
    // An unhandled key does nothing and keeps its default.
    expect(press(m, 5, 'PageDown')).toBe(false)
    expect(checked(m.host)).toBe(5)
  })

  it('Home and End select the first and last star', async () => {
    const m = await render({ defaultRating: 3 })
    focus(m, 3)
    expect(press(m, 3, 'Home')).toBe(true)
    expect(checked(m.host)).toBe(1)
    expect(document.activeElement).toBe(stars(m.host)[0])
    expect(press(m, 1, 'End')).toBe(true)
    expect(checked(m.host)).toBe(5)
    expect(document.activeElement).toBe(stars(m.host)[4])
  })

  it('only the checked star is a tab stop', async () => {
    const m = await render({ defaultRating: 3 })
    expect(stars(m.host).map((s) => s.getAttribute('tabindex'))).toEqual([
      '-1',
      '-1',
      '0',
      '-1',
      '-1',
    ])
    // With no rating yet, the first star is the tab stop.
    const fresh = await render({})
    expect(stars(fresh.host).map((s) => s.getAttribute('tabindex'))).toEqual([
      '0',
      '-1',
      '-1',
      '-1',
      '-1',
    ])
    // A click moves the tab stop with the selection.
    stars(fresh.host)[3]!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    fresh.tick()
    expect(stars(fresh.host).map((s) => s.getAttribute('tabindex'))).toEqual([
      '-1',
      '-1',
      '-1',
      '0',
      '-1',
    ])
    // The group itself is focusable but never a tab stop.
    const group = fresh.host.querySelector('[role="radiogroup"]')
    expect(group?.getAttribute('tabindex')).toBe('-1')
    // A defaultRating above max marks no star, so the first star is the stop —
    // an out-of-range value must not leave the group keyboard-unreachable.
    const over = await render({ defaultRating: 9 })
    expect(stars(over.host).map((s) => s.getAttribute('tabindex'))).toEqual([
      '0',
      '-1',
      '-1',
      '-1',
      '-1',
    ])
  })
})
