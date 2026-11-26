// @vitest-environment jsdom
/**
 * Keyboard-accessibility tests for the Angular `<NotificationCenter>`'s item
 * rows — the port of
 * `@molecule/app-notification-center-react/src/__tests__/notification-center.keyboard.test.tsx`.
 * Mounts the component through Angular's real renderer (the same
 * `createApplication` + JIT host approach the conformance kit's Angular
 * adapter uses), focuses a row, fires Enter / Space and asserts the item's
 * click handler runs — proving the clickable row behaves like a native button.
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

import { provideDomPlacement } from '@molecule/app-angular'

vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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

vi.mock('@molecule/app-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

vi.mock('@molecule/app-ui-angular', async (importOriginal) => {
  const { Component } = await import('@angular/core')
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    Button: Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'button[mol-button]',
      standalone: true,
      inputs: ['variant', 'size', 'className', 'disabled', 'type'],
      host: { 'data-button': '' },
      template: `<ng-content></ng-content>`,
    })(
      class MockButton {
        /** Button variant. */
        variant?: string
        /** Button size. */
        size?: string
      },
    ),
    Alert: Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'div[mol-alert]',
      standalone: true,
      inputs: ['status'],
      host: { '[attr.data-alert]': 'status ?? ""' },
      template: `<ng-content></ng-content>`,
    })(
      class MockAlert {
        /** Alert status. */
        status?: string
      },
    ),
  }
})

const { NotificationCenter } = await import('../notification-center.component.js')

/** A mounted spec host: its DOM and a teardown. */
interface Mounted {
  /** The mounted component's host element (the notification center root). */
  readonly element: HTMLElement
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts a `NotificationCenter` with one item through a JIT host template.
 *
 * @param item - The single item to render.
 * @returns The mounted host.
 */
async function render(item: Record<string, unknown>): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [NotificationCenter as Type<unknown>],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `<div mol-notification-center [items]="p['items']"></div>`,
  })(
    class SpecHost {
      /** The props the template binds. */
      p: Record<string, unknown> = { items: [item] }
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
  })
  const ref: ComponentRef<{ p: Record<string, unknown> }> = createComponent(Host, {
    environmentInjector: appRef.injector,
  })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  const element = host.querySelector('[mol-notification-center]') as HTMLElement
  return {
    element,
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

/** The clickable row's wrapper (the `<li>`'s button surface). */
const rowOf = (element: HTMLElement): HTMLElement | null =>
  element.querySelector('ul > li:first-child > div')

/** Fires a keydown with the given key on the row. */
const keyDown = (row: HTMLElement, key: string): void => {
  row.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
}

const mounted: Mounted[] = []

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  document.body.innerHTML = ''
})

describe('NotificationCenter keyboard accessibility', () => {
  it('renders a focusable button-role element and fires onClick on Enter', async () => {
    const onClick = vi.fn()
    const m = await render({ id: '1', title: 'Click me', onClick })
    mounted.push(m)
    const row = rowOf(m.element)
    expect(row?.getAttribute('role')).toBe('button')
    expect(row?.getAttribute('tabindex')).toBe('0')
    row?.focus()
    expect(document.activeElement).toBe(row)
    if (row) keyDown(row, 'Enter')
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('fires onClick on Space', async () => {
    const onClick = vi.fn()
    const m = await render({ id: '1', title: 'Click me', onClick })
    mounted.push(m)
    const row = rowOf(m.element)
    if (row) keyDown(row, ' ')
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('ignores other keys', async () => {
    const onClick = vi.fn()
    const m = await render({ id: '1', title: 'Click me', onClick })
    mounted.push(m)
    const row = rowOf(m.element)
    if (row) {
      keyDown(row, 'a')
      keyDown(row, 'Tab')
    }
    expect(onClick).not.toHaveBeenCalled()
  })

  it('is not keyboard-interactive (no button role) when no onClick is given', async () => {
    const m = await render({ id: '1', title: 'Not clickable', read: true })
    mounted.push(m)
    const row = rowOf(m.element)
    expect(row?.getAttribute('role')).toBeNull()
    expect(row?.getAttribute('tabindex')).toBeNull()
  })
})
