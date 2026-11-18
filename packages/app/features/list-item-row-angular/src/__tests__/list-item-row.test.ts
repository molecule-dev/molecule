// @vitest-environment jsdom
/**
 * Unit tests of `ListItemRow` — the port of
 * `@molecule/app-list-item-row-react/src/__tests__/list-item-row.test.tsx`. The
 * React suite renders the component with mocked UI dependencies and asserts the
 * markup; this port mounts the same mocked tree through Angular's real
 * renderer (the same `createApplication` + JIT host approach the conformance
 * kit's Angular adapter uses) and asserts the same markup strings. Style
 * assertions read jsdom's live-DOM serialization (`opacity: 0.5`), which is
 * what a mounted React tree produces too — React's own suite asserts the
 * static-markup spelling of the same declaration (`opacity:0.5`).
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

// Proxy ClassMap echoing each accessed member back as its token (e.g.
// `cursorPointer`), so tests can assert which cm.* class was applied without a
// real bond — the same mock the React tests use. Angular's `[class]` binding
// takes a plain string, so the icon-wrapper members (used as values, not
// called) resolve to their token string instead of a callable.
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
        if (token === 'buttonIconLeft' || token === 'buttonIconRight') return token
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

const { ListItemRow } = await import('../list-item-row.component.js')

/** A mounted spec host: its DOM, a props setter, and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** The running application, for an explicit change-detection pass. */
  readonly appRef: ApplicationRef
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts one standalone component through a JIT host template, written
 * exactly the way an Angular app would write it.
 *
 * @param template - The host template (the component element + projected content).
 * @param component - The component class under test.
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mount(
  template: string,
  component: Type<unknown>,
  props: Record<string, unknown> = {},
): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [component],
    changeDetection: ChangeDetectionStrategy.Default,
    template,
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
    appRef,
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

const mounted: Mounted[] = []

/** The row element a mount produced. */
const rowOf = (m: Mounted): HTMLElement =>
  m.host.querySelector('div[mol-list-item-row]') as HTMLElement

const render = async (props: Record<string, unknown> = {}): Promise<Mounted> => {
  const m = await mount(
    `<div mol-list-item-row [title]="p['title']" [subtitle]="p['subtitle']" [metadata]="p['metadata']" [leading]="p['leading']" [actions]="p['actions']" [onClick]="p['onClick']" [selected]="p['selected']" [disabled]="p['disabled']" [density]="p['density']" [className]="p['className']"></div>`,
    ListItemRow as Type<unknown>,
    props,
  )
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

/** The open button a mounted clickable row produced. */
const openButton = (m: Mounted): HTMLButtonElement => {
  const button = m.host.querySelector<HTMLButtonElement>('button[data-mol-id="list-item-row-open"]')
  expect(button, 'a clickable row renders the open button').not.toBeNull()
  return button as HTMLButtonElement
}

describe('ListItemRow', () => {
  it('renders the title', async () => {
    const m = await render({ title: 'Inbox' })
    expect(m.host.innerHTML).toContain('Inbox')
  })

  it('renders subtitle and metadata when present and omits them otherwise', async () => {
    const full = await render({ title: 'T', subtitle: 'sub-x', metadata: 'meta-x' })
    expect(full.host.innerHTML).toContain('sub-x')
    expect(full.host.innerHTML).toContain('meta-x')
    const bare = await render({ title: 'T' })
    expect(bare.host.innerHTML).not.toContain('sub-x')
    expect(bare.host.innerHTML).not.toContain('meta-x')
  })

  it('renders the leading and actions slots', async () => {
    const m = await mount(
      `<div mol-list-item-row [title]="p['title']"><span slot="leading" data-leading></span><span slot="actions" data-actions></span></div>`,
      ListItemRow as Type<unknown>,
      { title: 'T' },
    )
    mounted.push(m)
    const markup = m.host.innerHTML
    expect(markup).toContain('data-leading=""')
    expect(markup).toContain('data-actions=""')
  })

  it('exposes a body button and clickable cursor only when onClick is supplied', async () => {
    const clickable = await render({ title: 'T', onClick: () => {} })
    const button = clickable.host.querySelector('button')
    expect(button, 'a clickable row renders the open button').not.toBeNull()
    expect(button?.getAttribute('type')).toBe('button')
    expect(button?.getAttribute('class')).toContain('cursorPointer')
    const plain = await render({ title: 'T' })
    expect(plain.host.innerHTML).not.toContain('<button')
  })

  it('clicking the open button calls onClick', async () => {
    const onClick = vi.fn()
    const m = await render({ title: 'T', onClick })
    openButton(m).dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('clicking an inner control does not call onClick', async () => {
    const onClick = vi.fn()
    const m = await mount(
      `<div mol-list-item-row [title]="p['title']" [onClick]="p['onClick']"><span slot="actions" data-actions>Menu</span></div>`,
      ListItemRow as Type<unknown>,
      { title: 'T', onClick },
    )
    mounted.push(m)
    m.host
      .querySelector('[data-actions]')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('the open button is named by the label', async () => {
    const m = await render({ title: 'Inbox', onClick: () => {} })
    const button = openButton(m)
    const labelId = button.getAttribute('aria-labelledby')
    expect(labelId, 'the open button names its label').not.toBeNull()
    const label = m.host.querySelector(`[id="${labelId}"]`)
    expect(label?.textContent?.trim()).toBe('Inbox')
  })

  it('without onClick there is no open button', async () => {
    const m = await render({ title: 'T' })
    expect(m.host.innerHTML).not.toContain('<button')
    const row = rowOf(m)
    expect(row.getAttribute('class')).not.toContain('position')
    expect(row.getAttribute('class')).not.toContain('cursorPointer')
    expect(row.querySelector('[aria-pressed]')).toBeNull()
  })

  it('a disabled clickable row renders a disabled open button', async () => {
    const onClick = vi.fn()
    const m = await render({ title: 'T', onClick, disabled: true })
    const button = openButton(m)
    expect(button.hasAttribute('disabled')).toBe(true)
    expect(button.getAttribute('class')).not.toContain('cursorPointer')
    const row = rowOf(m)
    expect(row.hasAttribute('tabindex')).toBe(false)
    expect(row.getAttribute('aria-disabled')).toBe('true')
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('reflects the selected state via aria-current', async () => {
    const m = await render({ title: 'T', selected: true })
    expect(rowOf(m).getAttribute('aria-current')).toBe('true')
    expect(rowOf(m).getAttribute('aria-selected')).toBeNull()
    expect(rowOf(m).querySelector('[aria-pressed]')).toBeNull()
    const clickable = await render({ title: 'T', selected: true, onClick: () => {} })
    expect(rowOf(clickable).getAttribute('aria-current')).toBe('true')
    expect(rowOf(clickable).getAttribute('aria-selected')).toBeNull()
    expect(openButton(clickable).hasAttribute('aria-pressed')).toBe(false)
    const unselected = await render({ title: 'T', selected: false })
    expect(rowOf(unselected).getAttribute('aria-current')).toBeNull()
  })

  it('reflects the disabled state via aria-disabled and dimmed opacity', async () => {
    const m = await render({ title: 'T', disabled: true })
    expect(rowOf(m).getAttribute('aria-disabled')).toBe('true')
    expect(rowOf(m).getAttribute('style')).toContain('opacity: 0.5')
  })

  it('forwards className', async () => {
    const m = await render({ title: 'T', className: 'lir-cls' })
    expect(rowOf(m).getAttribute('class')).toContain('lir-cls')
  })
})

it('turns a loaded row toggle into its own button that persists the change', async () => {
  let saved = false
  const open = vi.fn()
  const commit = vi.fn(async (desired: boolean) => (saved = desired))
  const row = () => ({
    title: 'Sprint plan',
    metadata: '4 collaborators',
    onClick: open,
    toggle: {
      value: saved,
      commit,
      activeLabel: 'Unpin',
      inactiveLabel: 'Pin',
    },
  })
  const m = await mount(
    `<div mol-list-item-row [title]="p['title']" [metadata]="p['metadata']" [onClick]="p['onClick']" [toggle]="p['toggle']"></div>`,
    ListItemRow as Type<unknown>,
    row(),
  )
  mounted.push(m)
  const toggle = m.host.querySelector<HTMLButtonElement>('button[aria-pressed]')
  expect(toggle?.textContent?.trim()).toBe('Pin')
  toggle!.click()
  for (let i = 0; i < 5; i += 1) await Promise.resolve()
  m.appRef.tick()
  expect(commit).toHaveBeenCalledExactlyOnceWith(true)
  expect(open).not.toHaveBeenCalled()
  expect(toggle?.textContent?.trim()).toBe('Unpin')
  const next = await mount(
    `<div mol-list-item-row [title]="p['title']" [metadata]="p['metadata']" [onClick]="p['onClick']" [toggle]="p['toggle']"></div>`,
    ListItemRow as Type<unknown>,
    row(),
  )
  mounted.push(next)
  expect(next.host.querySelector('button[aria-pressed="true"]')?.textContent?.trim()).toBe('Unpin')
})

it('counterexample: row metadata is read-only when there is no toggle', async () => {
  const m = await render({ title: 'Sprint plan', metadata: '4 collaborators' })
  expect(m.host.textContent).toContain('4 collaborators')
  expect(m.host.querySelector('button')).toBeNull()
})
