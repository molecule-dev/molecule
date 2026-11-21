// @vitest-environment jsdom
/**
 * Open-button tests for the Angular `<InboxRow>` — a port of
 * `@molecule/app-inbox-row-react/src/__tests__/inbox-row.open.test.tsx`.
 * Renders into a real DOM (jsdom): while `onClick` is set the row renders an
 * empty, transparent native button over itself — the whole row is the hit
 * area, and the button is named by the sender and the subject — and the inner
 * controls keep their own clicks.
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

vi.mock('@molecule/app-ui-angular', async () => {
  const { Component, TemplateRef } = await import('@angular/core')
  const MockAvatar = Component({
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

/** The prop bindings every test host template carries. */
const bindings = [
  '[sender]="p[\'sender\']"',
  '[subject]="p[\'subject\']"',
  '[labels]="p[\'labels\']"',
  '[selectionSlot]="p[\'selectionSlot\']"',
  '[onClick]="p[\'onClick\']"',
  '[onToggleStar]="p[\'onToggleStar\']"',
].join(' ')

const mountedApps: Mounted[] = []

/**
 * Mounts an `InboxRow` with the given props, returning its open button and
 * host.
 *
 * @param props - The row props.
 */
const render = async (
  props: Record<string, unknown> = {},
): Promise<{ button: HTMLButtonElement | null; host: HTMLElement }> => {
  const m = await mount(`<div mol-inbox-row ${bindings}></div>`, props)
  mountedApps.push(m)
  return { button: m.host.querySelector('button[data-mol-id="inbox-row-open"]'), host: m.host }
}

afterEach(async () => {
  for (const m of mountedApps.splice(0)) await m.destroy()
})

describe('InboxRow open button', () => {
  it('clicking the open button calls onClick', async () => {
    const onClick = vi.fn()
    const { button } = await render({ sender: 'Alice', subject: 'Lunch?', onClick })
    if (!button) throw new Error('the open button did not render')
    button.click()
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('clicking an inner control does not call onClick', async () => {
    const onClick = vi.fn()
    const onToggleStar = vi.fn()
    const { host } = await render({ sender: 'Alice', subject: 'Lunch?', onClick, onToggleStar })
    host.querySelector<HTMLElement>('span[slot="labels"]')?.click()
    host.querySelector<HTMLElement>('span[slot="selectionSlot"]')?.click()
    expect(onClick).not.toHaveBeenCalled()
    const star = host.querySelector<HTMLElement>('button[data-mol-id="inbox-row-star"]')
    if (!star) throw new Error('the star button did not render')
    star.click()
    expect(onToggleStar).toHaveBeenCalledTimes(1)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('the open button is named by the label', async () => {
    const onClick = vi.fn()
    const { button } = await render({ sender: 'Alice', subject: 'Lunch?', onClick })
    if (!button) throw new Error('the open button did not render')
    const labelledBy = button.getAttribute('aria-labelledby') ?? ''
    const ids = labelledBy.split(/\s+/).filter(Boolean)
    expect(ids).toHaveLength(2)
    const name = ids.map((id) => document.getElementById(id)?.textContent ?? '').join(' ')
    expect(name).toBe('Alice Lunch?')
  })

  it('without onClick there is no open button', async () => {
    const clickable = await render({ sender: 'A', subject: 'S', onClick: () => {} })
    expect(clickable.button).toBeTruthy()
    const plain = await render({ sender: 'A', subject: 'S' })
    expect(plain.button).toBeNull()
  })
})
