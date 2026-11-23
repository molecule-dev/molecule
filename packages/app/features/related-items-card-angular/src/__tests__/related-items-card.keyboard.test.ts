// @vitest-environment jsdom
/**
 * Keyboard-accessibility tests for the Angular `RelatedItemsCard` — a port of
 * `@molecule/app-related-items-card-react/src/__tests__/related-items-card.keyboard.test.tsx`.
 * Renders into a real DOM (jsdom) so we can focus a row's button-role control
 * and fire Enter/Space and assert the click handler runs — proving a clickable
 * row behaves like a native button.
 *
 * @module
 */

import '@angular/compiler'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  createComponent,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { provideDomPlacement } from '@molecule/app-angular'

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

const { RelatedItemsCard } = await import('../related-items-card.component.js')

const items = [{ name: 'Deal A' }, { name: 'Deal B' }]

/** A mounted card: the host element whose children the component produced. */
interface Mounted {
  readonly host: HTMLElement
  destroy(): Promise<void>
}

const mounted: Mounted[] = []

/**
 * Mounts the card host template with the given props, the way an Angular app
 * writes it.
 *
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
const render = async (props: Record<string, unknown>): Promise<Mounted> => {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [RelatedItemsCard as Type<unknown>],
    changeDetection: ChangeDetectionStrategy.Default,
    template: `<ng-template #row let-item let-i="a1">
      <span [attr.data-item]="item.name">{{ item.name }}</span>
    </ng-template>
    <div mol-related-items-card
      title="T"
      [items]="p['items']"
      [renderItem]="row"
      [onItemClick]="p['onItemClick']"></div>`,
  })(
    class SpecHost {
      /** The props the template binds. */
      p: Record<string, unknown> = props
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
  })
  const ref = createComponent(Host as Type<{ p: Record<string, unknown> }>, {
    environmentInjector: appRef.injector,
  })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  const m: Mounted = {
    host,
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

/** A row's button-role control (the first row's). */
const rowControl = (host: HTMLElement): HTMLElement => {
  const control = host.querySelector<HTMLElement>('li > [role="button"]')
  if (!control) throw new Error('the row control did not render')
  return control
}

/** Fires a keydown with the given key on the element. */
const pressKey = (el: Element, key: string): void => {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
}

describe('RelatedItemsCard keyboard accessibility', () => {
  it('renders a focusable button-role element when onItemClick is given', async () => {
    const onItemClick = vi.fn()
    const { host } = await render({ items, onItemClick })
    const control = rowControl(host)
    expect(control.getAttribute('tabindex')).toBe('0')
    control.focus()
    expect(document.activeElement).toBe(control)
  })

  it('click on a row calls onItemClick', async () => {
    const onItemClick = vi.fn()
    const { host } = await render({ items, onItemClick })
    rowControl(host).click()
    expect(onItemClick).toHaveBeenCalledTimes(1)
  })

  it('enter key activates the row', async () => {
    const onItemClick = vi.fn()
    const { host } = await render({ items, onItemClick })
    pressKey(rowControl(host), 'Enter')
    expect(onItemClick).toHaveBeenCalledTimes(1)
  })

  it('space key activates the row', async () => {
    const onItemClick = vi.fn()
    const { host } = await render({ items, onItemClick })
    pressKey(rowControl(host), ' ')
    expect(onItemClick).toHaveBeenCalledTimes(1)
  })

  it('other keys are ignored', async () => {
    const onItemClick = vi.fn()
    const { host } = await render({ items, onItemClick })
    const control = rowControl(host)
    pressKey(control, 'a')
    pressKey(control, 'Tab')
    expect(onItemClick).not.toHaveBeenCalled()
  })

  it('is not keyboard-interactive (no button role) when no onItemClick is given', async () => {
    const { host } = await render({ items })
    expect(host.querySelector('li > [role="button"]')).toBeNull()
  })
})
