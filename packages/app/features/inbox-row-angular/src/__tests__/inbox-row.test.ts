// @vitest-environment jsdom
/**
 * Unit tests of `InboxRow` — the port of
 * `@molecule/app-inbox-row-react`'s own suite. The React suite renders the
 * component with mocked UI dependencies and asserts the markup; this port
 * mounts the same mocked tree through Angular's real renderer (the same
 * `createApplication` + JIT host approach the conformance kit's Angular
 * adapter uses) and asserts the same behavior and markup.
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
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { provideDomPlacement } from '@molecule/app-angular'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `cursorPointer`), so tests can assert which cm.* class was applied without a
// real bond — the same mock the React tests use.
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

// The Avatar marker the React tests mock `@molecule/app-ui-react` with: an
// element carrying the src and the accessible name it received. `asTemplate`
// keeps its real behavior (the component renders node props through it).
vi.mock('@molecule/app-ui-angular', async (importOriginal) => {
  const { Component, TemplateRef } = await import('@angular/core')
  const MockAvatar = Component({
    changeDetection: ChangeDetectionStrategy.Eager,
    selector: 'div[mol-avatar]',
    standalone: true,
    inputs: ['src', 'alt', 'name', 'size', 'rounded', 'className', 'style', 'testId'],
    host: {
      'data-avatar': '',
      '[attr.data-avatar-src]': 'src ?? ""',
      '[attr.data-avatar-name]': 'alt ?? name ?? ""',
    },
    template: '',
  })(
    class MockAvatarClass {
      /** Image source. */
      src?: string
      /** Image alt text. */
      alt?: string
      /** Display name. */
      name?: string
      /** Size preset. */
      size?: string
      /** Rounded corners. */
      rounded?: boolean
      /** Extra classes. */
      className?: string
      /** Inline style. */
      style?: Record<string, unknown>
      /** `data-testid`. */
      testId?: string
    },
  )
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    Avatar: MockAvatar,
    asTemplate: (value: unknown) => (value instanceof TemplateRef ? value : null),
  }
})

const { InboxRow } = await import('../inbox-row.component.js')

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
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mount(template: string, props: Record<string, unknown> = {}): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [InboxRow],
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

/** The component element (the host `div[mol-inbox-row]`). */
const rowEl = (host: HTMLElement): HTMLElement => {
  const el = host.querySelector<HTMLElement>('[mol-inbox-row]')
  if (!el) throw new Error('no InboxRow host rendered')
  return el
}

/** The prop bindings every test host template carries. */
const bindings = [
  '[sender]="p[\'sender\']"',
  '[senderAvatarSrc]="p[\'senderAvatarSrc\']"',
  '[subject]="p[\'subject\']"',
  '[preview]="p[\'preview\']"',
  '[timestamp]="p[\'timestamp\']"',
  '[unread]="p[\'unread\']"',
  '[starred]="p[\'starred\']"',
  '[hasAttachment]="p[\'hasAttachment\']"',
  '[labels]="p[\'labels\']"',
  '[selectionSlot]="p[\'selectionSlot\']"',
  '[onClick]="p[\'onClick\']"',
  '[onToggleStar]="p[\'onToggleStar\']"',
  '[className]="p[\'className\']"',
].join(' ')

const mountedApps: Mounted[] = []

/** Mounts an `InboxRow` with the given props and optional projected content. */
const render = async (props: Record<string, unknown> = {}, content = ''): Promise<Mounted> => {
  const m = await mount(`<div mol-inbox-row ${bindings}>${content}</div>`, props)
  mountedApps.push(m)
  return m
}

afterEach(async () => {
  for (const m of mountedApps.splice(0)) await m.destroy()
})

describe('InboxRow', () => {
  it('renders the sender and subject', async () => {
    const m = await render({ sender: 'Alice', subject: 'Lunch?' })
    const text = m.host.textContent ?? ''
    expect(text).toContain('Alice')
    expect(text).toContain('Lunch?')
  })

  it('renders the preview when present and omits it otherwise', async () => {
    const present = await render({ sender: 'A', subject: 'S', preview: 'see you' })
    expect(present.host.textContent).toContain('see you')
    const absent = await render({ sender: 'A', subject: 'S' })
    expect(absent.host.textContent).not.toContain('see you')
  })

  it('renders the timestamp', async () => {
    const m = await render({ sender: 'A', subject: 'S', timestamp: '9:41' })
    expect(m.host.textContent).toContain('9:41')
  })

  it('applies bold styling and an unread dot when unread', async () => {
    const unread = await render({ sender: 'A', subject: 'S', unread: true })
    expect(rowEl(unread.host).style.fontWeight).toBe('600')
    const dot = rowEl(unread.host).querySelector('span[aria-hidden="true"]')
    // The dot's colour is the ClassMap's info tone (theme-owned), not a hex literal.
    expect(dot?.getAttribute('class')).toContain('bgTone')
    const read = await render({ sender: 'A', subject: 'S' })
    expect(rowEl(read.host).style.fontWeight).toBe('')
  })

  it('renders the star button only when onToggleStar is supplied', async () => {
    const starred = await render({
      sender: 'A',
      subject: 'S',
      starred: true,
      onToggleStar: () => {},
    })
    expect(rowEl(starred.host).querySelector('button[aria-label="Unstar"]')).not.toBeNull()
    const without = await render({ sender: 'A', subject: 'S' })
    expect(rowEl(without.host).querySelector('button[aria-label="Unstar"]')).toBeNull()
    expect(rowEl(without.host).querySelector('button[aria-label="Star"]')).toBeNull()
  })

  it('renders the attachment indicator when hasAttachment is set', async () => {
    const m = await render({ sender: 'A', subject: 'S', hasAttachment: true })
    expect(rowEl(m.host).querySelector('[aria-label="Has attachment"]')).not.toBeNull()
  })

  it('renders the labels and selectionSlot slots', async () => {
    const m = await render(
      { sender: 'A', subject: 'S' },
      `<span slot="labels" data-labels></span><input slot="selectionSlot" data-select />`,
    )
    expect(m.host.innerHTML).toContain('data-labels')
    expect(m.host.innerHTML).toContain('data-select')
  })

  it('marks the row clickable only when onClick is supplied and forwards className', async () => {
    const clickable = await render({ sender: 'A', subject: 'S', onClick: () => {} })
    // The clickable surface is the transparent open button laid over the row:
    // the pointer cursor lives there, and the row is its positioning context.
    expect(
      rowEl(clickable.host).querySelector('button[data-mol-id="inbox-row-open"]')?.className,
    ).toContain('cursorPointer')
    const plain = await render({ sender: 'A', subject: 'S', className: 'ir-cls' })
    expect(rowEl(plain.host).querySelector('button[data-mol-id="inbox-row-open"]')).toBeNull()
    expect(rowEl(plain.host).className).not.toContain('cursorPointer')
    expect(rowEl(plain.host).className).toContain('ir-cls')
  })

  it('keeps a consumer list in order when an item is inserted in the middle of labels', async () => {
    const m = await render(
      { sender: 'A', subject: 'S', xs: ['a', 'c'] },
      `<ng-container ngProjectAs="[slot=labels]">@for (x of p['xs']; track x) {<b>{{ x }}</b>}</ng-container>`,
    )
    const items = (): string[] =>
      [...rowEl(m.host).querySelectorAll('b')].map((b) => b.textContent ?? '')
    expect(items()).toEqual(['a', 'c'])
    await m.setProps({ xs: ['a', 'b', 'c'] })
    expect(items()).toEqual(['a', 'b', 'c'])
    await m.setProps({ xs: ['a', 'b'] })
    expect(items()).toEqual(['a', 'b'])
  })

  it('shows and removes the labels wrapper in the pass where the consumer @if adds and removes its content', async () => {
    const m = await render(
      { sender: 'A', subject: 'S', on: false },
      `@if (p['on']) {<span slot="labels" data-labels></span>}`,
    )
    const labels = (): HTMLElement | null =>
      rowEl(m.host).querySelector<HTMLElement>('[data-labels]')
    expect(labels()).toBeNull()
    await m.setProps({ on: true })
    expect(labels()).not.toBeNull()
    expect(labels()?.parentElement?.getAttribute('class')).toContain('flex')
    await m.setProps({ on: false })
    expect(labels()).toBeNull()
  })

  it('removes the unwrapped star toggle when onToggleStar goes away', async () => {
    const m = await render({ sender: 'A', subject: 'S', onToggleStar: () => {} })
    const star = (): Element | null =>
      rowEl(m.host).querySelector('button[data-mol-id="inbox-row-star"]')
    // Without onClick the star renders bare, with no positioned wrapper.
    expect(star()).not.toBeNull()
    await m.setProps({ onToggleStar: undefined })
    // React renders the star only while onToggleStar exists.
    expect(star()).toBeNull()
  })
})
