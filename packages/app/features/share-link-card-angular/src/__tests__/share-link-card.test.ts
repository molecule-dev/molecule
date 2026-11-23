// @vitest-environment jsdom
/**
 * Unit tests of `ShareLinkCard` and its internal `CopyLinkField` — the port of
 * `@molecule/app-share-link-card-react`'s own suite. The React suite renders
 * the components with mocked UI dependencies and asserts the markup; this port
 * mounts the same tree through Angular's real renderer (the same
 * `createApplication` + JIT host approach the conformance kit's Angular
 * adapter uses) and asserts the same markup strings.
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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { provideDomPlacement } from '@molecule/app-angular'

// Proxy ClassMap echoing each accessed member back as its token (e.g. `stack`),
// so tests can assert which cm.* class was applied without a real bond — the
// same mock the React tests use.
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

// The i18n mock the React tests install for `@molecule/app-react`: `t`
// resolves to the inline English default.
vi.mock('@molecule/app-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

// The markers the React tests mock `@molecule/app-ui-react` with: a
// `data-button` button and a `data-switch` toggle. (The real Angular UI
// components read ClassMap token PROPERTIES, which the proxy above turns into
// functions; the ports' unit tests mock the UI layer the same way React's do.)
vi.mock('@molecule/app-ui-angular', async () => {
  const { Component, EventEmitter } = await import('@angular/core')
  return {
    Button: Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'button[mol-button]',
      standalone: true,
      inputs: ['variant', 'size'],
      host: { 'data-button': '', '[attr.type]': 'type' },
      template: `<ng-content></ng-content>`,
    })(
      class MockButton {
        /** Button variant. */
        variant?: string
        /** Button size. */
        size?: string
        /** The button's `type` attribute. */
        type = 'button'
      },
    ),
    Switch: Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'mol-switch',
      standalone: true,
      inputs: ['checked'],
      outputs: ['change'],
      host: { 'data-switch': '' },
    })(
      class MockSwitch {
        /** Whether the switch is on. */
        checked?: boolean
        /** Fires when the fake switch is toggled. */
        readonly change = new EventEmitter<Event>()
      },
    ),
  }
})

vi.mock('@molecule/app-clipboard', () => ({
  copyTextWithFallback: vi.fn(async () => true),
}))

import { copyTextWithFallback } from '@molecule/app-clipboard'

const { CopyLinkField } = await import('../copy-link-field.component.js')
const { ShareLinkCard } = await import('../share-link-card.component.js')

const copyTextWithFallbackMock = vi.mocked(copyTextWithFallback)

beforeEach(() => {
  copyTextWithFallbackMock.mockReset()
  copyTextWithFallbackMock.mockResolvedValue(true)
})

/** A mounted spec host: its DOM, a props setter, and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Sets the props object and flushes change detection. */
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

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

/**
 * Mounts `ShareLinkCard` with the given props and projected content.
 *
 * @param props - The card's props.
 * @param content - Projected slot content.
 * @returns The mounted host.
 */
const renderCard = async (props: Record<string, unknown> = {}, content = ''): Promise<Mounted> => {
  const m = await mount(
    `<div mol-share-link-card [url]="p['url']" [showQR]="p['showQR']" [passwordProtect]="p['passwordProtect']" [className]="p['className']" [dataMolId]="p['dataMolId']">${content}</div>`,
    ShareLinkCard as Type<unknown>,
    props,
  )
  mounted.push(m)
  return m
}

/**
 * Mounts the internal `CopyLinkField` with the given props.
 *
 * @param props - The field's props.
 * @returns The mounted host.
 */
const renderField = async (props: Record<string, unknown> = {}): Promise<Mounted> => {
  const m = await mount(
    `<div mol-share-link-copy-field [value]="p['value']" [className]="p['className']"></div>`,
    CopyLinkField as Type<unknown>,
    props,
  )
  mounted.push(m)
  return m
}

describe('CopyLinkField', () => {
  it('renders a read-only input carrying the value', async () => {
    const m = await renderField({ value: 'https://x.test/abc' })
    expect(m.host.innerHTML).toContain('value="https://x.test/abc"')
    expect(m.host.innerHTML).toContain('readonly')
  })

  it('renders the Copy button with its default label', async () => {
    const m = await renderField({ value: 'https://x.test' })
    expect(m.host.innerHTML).toContain('data-button=""')
    expect(m.host.innerHTML).toContain('Copy')
  })

  it('forwards className', async () => {
    const m = await renderField({ value: 'u', className: 'clf-cls' })
    expect(m.host.innerHTML).toContain('clf-cls')
  })

  it('names the url field with an accessible label', async () => {
    const m = await renderField({ value: 'u' })
    expect(m.host.querySelector('input')?.getAttribute('aria-label')).toBe('Share link')
  })

  it('copies the value when the copy button is clicked', async () => {
    const m = await renderField({ value: 'https://x.test/abc' })
    const button = m.host.querySelector('button[data-button]') as HTMLButtonElement
    button.click()
    await vi.waitFor(async () => {
      await m.setProps({})
      expect(m.host.innerHTML).toContain('Copied!')
    })
    expect(copyTextWithFallbackMock).toHaveBeenCalledTimes(1)
    expect(copyTextWithFallbackMock).toHaveBeenCalledWith('https://x.test/abc')
  })

  it('leaves the copied state off when the copy reports failure', async () => {
    copyTextWithFallbackMock.mockResolvedValue(false)
    const m = await renderField({ value: 'https://x.test/abc' })
    const button = m.host.querySelector('button[data-button]') as HTMLButtonElement
    button.click()
    await vi.waitFor(() =>
      expect(copyTextWithFallbackMock).toHaveBeenCalledWith('https://x.test/abc'),
    )
    await m.setProps({})
    expect(m.host.textContent).toContain('Copy')
    expect(m.host.textContent).not.toContain('Copied!')
  })
})

describe('ShareLinkCard', () => {
  it('renders the title in an <h3> and the description', async () => {
    const m = await renderCard(
      { url: 'u' },
      '<span slot="title">Share this</span><span slot="description">desc-x</span>',
    )
    expect(m.host.querySelector('h3')?.textContent).toContain('Share this')
    expect(m.host.querySelector('p')?.textContent).toContain('desc-x')
  })

  it('omits the header when neither title nor description is given', async () => {
    const m = await renderCard({ url: 'u' })
    expect(m.host.querySelector('header')).toBeNull()
  })

  it('renders the CopyLinkField carrying the url', async () => {
    const m = await renderCard({ url: 'https://x.test/share' })
    expect(m.host.querySelector('input')?.getAttribute('value')).toBe('https://x.test/share')
  })

  it('renders the QR slot only when showQR and qr are both set', async () => {
    const shown = await renderCard({ url: 'u', showQR: true }, '<span slot="qr" data-qr></span>')
    expect(shown.host.querySelector('[data-qr]')).not.toBeNull()
    const hidden = await renderCard({ url: 'u' }, '<span slot="qr" data-qr></span>')
    expect(hidden.host.querySelector('[data-qr]')).toBeNull()
  })

  it('renders the password-protect toggle row with the default label when configured', async () => {
    const m = await renderCard({
      url: 'u',
      passwordProtect: { enabled: false, onChange: () => {} },
    })
    expect(m.host.querySelector('[data-switch]')).not.toBeNull()
    expect(m.host.textContent).toContain('Password protect')
  })

  it('honours a custom password-protect label', async () => {
    const m = await renderCard({
      url: 'u',
      passwordProtect: { enabled: true, onChange: () => {}, label: 'Require a password' },
    })
    expect(m.host.textContent).toContain('Require a password')
  })

  it('names the password switch from its visible label', async () => {
    const m = await renderCard({
      url: 'u',
      passwordProtect: { enabled: false, onChange: () => {} },
    })
    const labelId = m.host.querySelector('[data-switch]')?.getAttribute('aria-labelledby')
    expect(labelId).toBeTruthy()
    expect(m.host.querySelector(`[id="${labelId}"]`)?.textContent).toContain('Password protect')
  })

  it('falls back to an i18n name for a switch with an empty label', async () => {
    const m = await renderCard({
      url: 'u',
      passwordProtect: { enabled: false, onChange: () => {}, label: '' },
    })
    const toggle = m.host.querySelector('[data-switch]')
    expect(toggle?.hasAttribute('aria-labelledby')).toBe(false)
    expect(toggle?.getAttribute('aria-label')).toBe('Password protect')
  })

  it('sets data-mol-id and forwards className onto the Card', async () => {
    const m = await renderCard({ url: 'u', dataMolId: 'share-x', className: 'slc-cls' })
    const card = m.host.querySelector('[data-mol-id="share-x"]')
    expect(card).not.toBeNull()
    expect(card?.getAttribute('class')).toContain('slc-cls')
  })

  it('keeps a consumer list in order when an item is inserted in the middle of the title slot', async () => {
    const m = await renderCard(
      { url: 'u', xs: ['a', 'c'] },
      `@for (x of p['xs']; track x) {<b slot="title">{{ x }}</b>}`,
    )
    const shown = (): (string | null)[] =>
      Array.from(m.host.querySelectorAll('h3 b')).map((el) => el.textContent)
    expect(shown()).toEqual(['a', 'c'])
    await m.setProps({ xs: ['a', 'b', 'c'] })
    expect(shown()).toEqual(['a', 'b', 'c'])
    await m.setProps({ xs: ['a', 'c'] })
    expect(shown()).toEqual(['a', 'c'])
  })

  it('shows and removes the title wrapper in the pass where the consumer @if adds and removes its content', async () => {
    const m = await renderCard(
      { url: 'u', on: false },
      `@if (p['on']) {<span slot="title" data-title>Share this</span>}`,
    )
    const title = (): HTMLElement | null => m.host.querySelector('[data-title]')
    // No title or description: React renders no header.
    expect(title()).toBeNull()
    expect(m.host.querySelector('header')).toBeNull()
    await m.setProps({ on: true })
    // The title arrives: the header and the `<h3>` render in the same pass.
    expect(title()).not.toBeNull()
    expect(title()!.closest('h3')).not.toBeNull()
    expect(m.host.querySelector('header')).not.toBeNull()
    await m.setProps({ on: false })
    expect(title()).toBeNull()
    expect(m.host.querySelector('header')).toBeNull()
  })
})
