// @vitest-environment jsdom
/**
 * Keyboard-accessibility tests for the Angular `<MessagePreview>` — a port of
 * `@molecule/app-message-preview-react/src/__tests__/message-preview.keyboard.test.tsx`.
 * Renders into a real DOM (jsdom) so we can focus the row and fire Enter/Space
 * and assert the click handler runs — proving the clickable row behaves like a
 * native button.
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

import { provideDomPlacement, provideRouter } from '@molecule/app-angular'
import { createMemoryRouter, type Router } from '@molecule/app-routing'

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
        // Styling methods stay callable (the components call cm.flex(…)); a
        // plain token is read as a property (Angular binds
        // [class]="cm().messagePreviewAvatarWrap"), so it must be a string.
        const token = String(prop)
        return ['cn', 'flex', 'sp', 'w', 'h', 'minW', 'fontWeight', 'textSize'].includes(token)
          ? (..._args: unknown[]) => token
          : token
      },
    }
    return new Proxy({}, handler)
  },
}))

import { MessagePreview } from '../message-preview.component.js'

/** A mounted row: the element, a cleanup, and the app reference for CD. */
interface Row {
  readonly row: HTMLElement
  destroy(): Promise<void>
}

const mounted: Row[] = []
/** List-mounted hosts with their teardown (the row may be replaced by a link). */
const listMounted: { destroy(): Promise<void> }[] = []

/**
 * Mounts the {@link MessagePreview} host template with the given props.
 *
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted row.
 */
const render = async (props: Record<string, unknown>): Promise<Row> => {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [MessagePreview],
    changeDetection: ChangeDetectionStrategy.Eager,
    template:
      '<mol-message-preview [name]="p[\'name\']" [preview]="p[\'preview\']" [timestamp]="p[\'timestamp\']" [onClick]="p[\'onClick\']"></mol-message-preview>',
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
  const row = host.querySelector<HTMLElement>('[role="button"]')
  if (!row) throw new Error('the interactive message preview row did not render')
  const r: Row = {
    row,
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
  mounted.push(r)
  return r
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  for (const m of listMounted.splice(0)) await m.destroy()
})

/**
 * Mounts {@link MessagePreview} between two fixed siblings, the way a consumer
 * list would, whose row toggles between a `<div>` and a router `<a>`.
 *
 * @returns The mounted host and a setter for the row's `to` destination.
 */
async function renderInList(to?: string): Promise<{
  host: HTMLElement
  set(next: string | undefined): void
  destroy(): Promise<void>
}> {
  const Host = Component({
    selector: 'mol-spec-list-host',
    standalone: true,
    imports: [MessagePreview],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `<i>a</i><mol-message-preview [name]="'Maya Patel'" [preview]="'Thanks!'" [timestamp]="'2m'" [to]="p['to']"></mol-message-preview><i>b</i>`,
  })(
    class SpecListHost {
      /** The props the template binds. */
      p: Record<string, unknown> = { to }
    },
  )
  const router: Router = createMemoryRouter({ initialEntries: ['/'] })
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection(), provideDomPlacement(), provideRouter(router)],
  })
  const ref = createComponent(Host as Type<{ p: Record<string, unknown> }>, {
    environmentInjector: appRef.injector,
  })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  const entry = {
    host,
    destroy: async (): Promise<void> => {
      appRef.destroy()
      host.remove()
    },
  }
  listMounted.push(entry)
  return {
    ...entry,
    set: (next) => {
      ref.instance.p = { ...ref.instance.p, to: next }
      ref.changeDetectorRef.markForCheck()
      appRef.tick()
    },
  }
}

/** Fires a keydown with the given key on the row. */
const keyDown = (row: HTMLElement, key: string): void => {
  row.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
}

describe('MessagePreview keyboard accessibility', () => {
  it('renders a focusable button-role element and fires onClick on Enter', async () => {
    const onClick = vi.fn()
    const { row } = await render({
      name: 'Maya Patel',
      preview: 'Thanks!',
      timestamp: '2m',
      onClick,
    })
    expect(row.getAttribute('tabindex')).toBe('0')
    row.focus()
    expect(document.activeElement).toBe(row)
    keyDown(row, 'Enter')
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('fires onClick on Space', async () => {
    const onClick = vi.fn()
    const { row } = await render({
      name: 'Maya Patel',
      preview: 'Thanks!',
      timestamp: '2m',
      onClick,
    })
    keyDown(row, ' ')
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('ignores other keys', async () => {
    const onClick = vi.fn()
    const { row } = await render({
      name: 'Maya Patel',
      preview: 'Thanks!',
      timestamp: '2m',
      onClick,
    })
    keyDown(row, 'a')
    keyDown(row, 'Tab')
    expect(onClick).not.toHaveBeenCalled()
  })

  it('is not keyboard-interactive (no button role) when no onClick is given', async () => {
    const Host = Component({
      selector: 'mol-spec-host',
      standalone: true,
      imports: [MessagePreview],
      changeDetection: ChangeDetectionStrategy.Eager,
      template:
        '<mol-message-preview [name]="p[\'name\']" [preview]="p[\'preview\']" [timestamp]="p[\'timestamp\']"></mol-message-preview>',
    })(
      class SpecHost {
        /** The props the template binds. */
        p: Record<string, unknown> = { name: 'Maya Patel', preview: 'Thanks!', timestamp: '2m' }
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
    expect(host.querySelector('[role="button"]')).toBeNull()
    await appRef.destroy()
    host.remove()
  })

  it("renders React's elements with no host or capture element of its own", async () => {
    const m = await renderInList()
    const children = (): string[] =>
      Array.from(m.host.children).map((child) => child.tagName.toLowerCase())
    expect(children()).toEqual(['i', 'div', 'i'])
    m.set('/threads/1')
    expect(children()).toEqual(['i', 'a', 'i'])
  })
})
