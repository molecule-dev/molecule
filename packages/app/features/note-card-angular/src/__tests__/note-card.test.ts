// @vitest-environment jsdom
/**
 * Unit tests of `NoteCard` — the port of
 * `@molecule/app-note-card-react/src/__tests__/note-card.test.tsx`. The React
 * suite renders the component with mocked UI dependencies and asserts the
 * markup; this port mounts the same mocked tree through Angular's real
 * renderer (the same `createApplication` + JIT host approach the conformance
 * kit's Angular adapter uses) and asserts the same markup strings. Style
 * assertions read jsdom's live-DOM serialization (`background: rgb(…)`),
 * which is what a mounted React tree produces too — React's own suite
 * asserts the static-markup spelling of the same declarations.
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

// Proxy ClassMap echoing each accessed member back as its token (e.g.
// `cursorPointer`), so tests can assert which cm.* class was applied without
// a real bond — the same mock the React tests use.
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

const { NoteCard } = await import('../note-card.component.js')

/** A mounted spec host: its DOM, a props setter, and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Merges props over the current ones and flushes change detection. */
  setProps(next: Record<string, unknown>): Promise<void>
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
    changeDetection: ChangeDetectionStrategy.Eager,
    template,
  })(
    class SpecHost {
      /** The props the template binds. */
      p: Record<string, unknown> = props
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
  return {
    host,
    setProps: async (next: Record<string, unknown>) => {
      ref.instance.p = { ...ref.instance.p, ...next }
      ref.changeDetectorRef.markForCheck()
      appRef.tick()
    },
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

const mounted: Mounted[] = []

const render = async (props: Record<string, unknown> = {}): Promise<Mounted> => {
  const m = await mount(
    `<article mol-note-card [title]="p['title']" [body]="p['body']" [color]="p['color']" [pinned]="p['pinned']" [modifiedAt]="p['modifiedAt']" [onClick]="p['onClick']" [className]="p['className']"></article>`,
    NoteCard as Type<unknown>,
    props,
  )
  mounted.push(m)
  return m
}

/** The card's transparent open button over the whole row. */
const openButton = (host: HTMLElement): HTMLButtonElement =>
  host.querySelector('[data-mol-id="note-card-open"]')!

/**
 * The element inside `host` whose id is the button's `aria-labelledby`
 * target — scoped to the card so concurrently mounted instances' generated
 * ids never collide.
 */
const labelledBy = (host: HTMLElement, button: HTMLButtonElement): Element | undefined =>
  [...host.querySelectorAll('[id]')].find((el) => el.id === button.getAttribute('aria-labelledby'))

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

describe('NoteCard', () => {
  it('renders the body text', async () => {
    const m = await render({ body: 'Remember the milk' })
    expect(m.host.innerHTML).toContain('Remember the milk')
  })

  it('renders the title when present and omits it otherwise', async () => {
    const titled = await render({ body: 'b', title: 'Groceries' })
    expect(titled.host.innerHTML).toContain('Groceries')
    const plain = await render({ body: 'b' })
    expect(plain.host.innerHTML).not.toContain('<h3')
  })

  it('renders the theme tint for known note colours and keeps an unknown colour as data', async () => {
    const known = await render({ body: 'b', color: '#dbeafe' })
    expect(known.host.querySelector('article')?.getAttribute('class')).toContain('bgTone')
    expect(known.host.querySelector('article')?.getAttribute('style')).not.toContain('background')
    const unknown = await render({ body: 'b', color: '#ffcc00' })
    expect(unknown.host.querySelector('article')?.getAttribute('style')).toContain(
      'background: rgb(255, 204, 0)',
    )
    const plain = await render({ body: 'b' })
    expect(plain.host.querySelector('article')?.getAttribute('class')).toContain('bgTone')
    expect(plain.host.querySelector('article')?.getAttribute('style')).not.toContain('background')
  })

  it('renders the pinned indicator only when pinned', async () => {
    const pinned = await render({ body: 'b', pinned: true })
    expect(pinned.host.innerHTML).toContain('aria-label="Pinned"')
    const plain = await render({ body: 'b' })
    expect(plain.host.innerHTML).not.toContain('aria-label="Pinned"')
  })

  it('renders the footer with modifiedAt and actions when present', async () => {
    const m = await mount(
      `<article mol-note-card [body]="p['body']" [modifiedAt]="p['modifiedAt']"><button slot="actions" data-actions>Edit</button></article>`,
      NoteCard as Type<unknown>,
      { body: 'b', modifiedAt: 'edited 2h ago' },
    )
    mounted.push(m)
    const markup = m.host.innerHTML
    expect(markup).toContain('<footer')
    expect(markup).toContain('edited 2h ago')
    expect(markup).toContain('data-actions=""')
  })

  it('marks the card clickable only when onClick is supplied and forwards className', async () => {
    const clickable = await render({ body: 'b', onClick: () => {} })
    expect(clickable.host.querySelector('button')?.getAttribute('class')).toContain('cursorPointer')
    const plain = await render({ body: 'b', className: 'nc-cls' })
    expect(plain.host.querySelector('article')?.getAttribute('class')).not.toContain(
      'cursorPointer',
    )
    expect(plain.host.querySelector('article')?.getAttribute('class')).toContain('nc-cls')
  })

  it('without onClick there is no open button', async () => {
    const plain = await render({ body: 'b' })
    expect(plain.host.querySelector('article button')).toBeNull()
    const clickable = await render({ body: 'b', onClick: () => {} })
    expect(openButton(clickable.host)).not.toBeNull()
  })

  it('clicking the open button calls onClick', async () => {
    const onClick = vi.fn()
    const m = await render({ body: 'b', onClick })
    openButton(m.host).click()
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('clicking an inner control does not call onClick', async () => {
    const onClick = vi.fn()
    const m = await mount(
      `<article mol-note-card [body]="p['body']" [onClick]="p['onClick']"><button slot="actions" data-actions>Edit</button></article>`,
      NoteCard as Type<unknown>,
      { body: 'b', onClick },
    )
    mounted.push(m)
    m.host.querySelector<HTMLButtonElement>('[data-actions]')!.click()
    expect(onClick).not.toHaveBeenCalled()
  })

  it('the open button is named by the label', async () => {
    const titled = await render({ title: 'Groceries', body: 'Milk, eggs', onClick: () => {} })
    const button = openButton(titled.host)
    expect(labelledBy(titled.host, button)?.textContent).toBe('Groceries')

    const untitled = await render({ body: 'Remember the milk', onClick: () => {} })
    const fallback = openButton(untitled.host)
    expect(labelledBy(untitled.host, fallback)?.textContent).toBe('Remember the milk')
  })

  it('shows and removes the title wrapper in the pass where the consumer @if adds and removes its content', async () => {
    const m = await mount(
      `<article mol-note-card [body]="p['body']">@if (p['on']) {<span slot="title">Note title</span>}</article>`,
      NoteCard as Type<unknown>,
      { body: 'b', on: false },
    )
    mounted.push(m)
    const title = (): HTMLElement | null => m.host.querySelector<HTMLElement>('h3')
    expect(title()).toBeNull()
    await m.setProps({ on: true })
    expect(title()).not.toBeNull()
    expect(title()?.textContent).toContain('Note title')
    await m.setProps({ on: false })
    expect(title()).toBeNull()
  })

  it('keeps a consumer list in order when an item is inserted in the middle of actions', async () => {
    const m = await mount(
      `<article mol-note-card [body]="p['body']"><ng-container ngProjectAs="[slot=actions]">@for (x of p['xs']; track x) {<b>{{ x }}</b>}</ng-container></article>`,
      NoteCard as Type<unknown>,
      { body: 'b', xs: ['a', 'c'] },
    )
    mounted.push(m)
    const items = (): string[] => [...m.host.querySelectorAll('b')].map((b) => b.textContent ?? '')
    expect(items()).toEqual(['a', 'c'])
    await m.setProps({ xs: ['a', 'b', 'c'] })
    expect(items()).toEqual(['a', 'b', 'c'])
    await m.setProps({ xs: ['a', 'b'] })
    expect(items()).toEqual(['a', 'b'])
  })
})
