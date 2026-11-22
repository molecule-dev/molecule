// @vitest-environment jsdom
/**
 * Unit tests of `CopyLinkField` — the port of
 * `@molecule/app-copy-link-field-react`'s own suite. The React suite renders
 * the component with mocked UI dependencies and asserts the markup; this port
 * mounts the same mocked tree through Angular's real renderer (the same
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

import { copyTextWithFallback } from '@molecule/app-clipboard'

const copyTextWithFallbackMock = vi.mocked(copyTextWithFallback)

// Proxy ClassMap echoing each accessed member back as its token (e.g.
// `stack`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React tests use.
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

// The copy-button marker the React tests mock `@molecule/app-ui-react` with:
// a `data-button` element projecting its content.
vi.mock('@molecule/app-ui-angular', async () => {
  const { Component } = await import('@angular/core')
  return {
    Button: Component({
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
  }
})

vi.mock('@molecule/app-clipboard', () => ({
  copyTextWithFallback: vi.fn(async () => true),
}))

const { CopyLinkField } = await import('../copy-link-field.component.js')

/** A mounted spec host: its DOM, a props setter, and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Merges props over the current ones and flushes change detection. */
  setProps(next: Record<string, unknown>): Promise<void>
  /** Runs change detection (zoneless: a signal write needs an explicit tick). */
  tick(): void
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

      /** Forwards the component's `copy` output to the `onCopy` prop, if given. */
      fireCopy(): void {
        const handler = this.p['onCopy']
        if (typeof handler === 'function') handler()
      }
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
    tick: () => appRef.tick(),
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

const mounted: Mounted[] = []

/**
 * Mounts `CopyLinkField` with the given props through the app-style host
 * template and returns the host.
 *
 * @param props - The field's props.
 * @returns The mounted host.
 */
const render = async (props: Record<string, unknown> = {}): Promise<Mounted> => {
  const m = await mount(
    `<div mol-copy-link-field [value]="p['value']" [label]="p['label']" [feedbackMs]="p['feedbackMs']" [size]="p['size']" [className]="p['className']" (copy)="fireCopy()"></div>`,
    CopyLinkField as Type<unknown>,
    props,
  )
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  vi.restoreAllMocks()
})

beforeEach(() => {
  copyTextWithFallbackMock.mockReset()
  copyTextWithFallbackMock.mockResolvedValue(true)
})

/** Flushes the copy promise's microtasks. */
const flush = (): Promise<void> => new Promise<void>((resolve) => setTimeout(resolve))

/** Helper — the copy button inside a mounted host. */
const copyButton = (host: HTMLElement): HTMLButtonElement | null =>
  host.querySelector('button[data-button]')

describe('CopyLinkField', () => {
  it('renders a read-only input carrying the value', async () => {
    const m = await render({ value: 'https://x.test/abc' })
    expect(m.host.innerHTML).toContain('value="https://x.test/abc"')
    expect(m.host.innerHTML).toContain('readonly')
  })

  it('renders the label when present and omits it otherwise', async () => {
    const labeled = await render({ value: 'u', label: 'Webhook URL' })
    expect(labeled.host.innerHTML).toContain('Webhook URL')
    const without = await render({ value: 'u' })
    expect(without.host.innerHTML).not.toContain('Webhook URL')
  })

  it('uses the label as the input aria-label, falling back to a default', async () => {
    const labeled = await render({ value: 'u', label: 'API key' })
    expect(labeled.host.innerHTML).toContain('aria-label="API key"')
    const without = await render({ value: 'u' })
    expect(without.host.innerHTML).toContain('aria-label="Link"')
  })

  it('renders the copy button with its default label', async () => {
    const m = await render({ value: 'u' })
    expect(m.host.innerHTML).toContain('data-button=""')
    expect(m.host.innerHTML).toContain('Copy')
  })

  it('forwards className', async () => {
    const m = await render({ value: 'u', className: 'clf-cls' })
    expect(m.host.innerHTML).toContain('clf-cls')
  })

  it('copies the value when the copy button is clicked', async () => {
    const onCopy = vi.fn()
    const m = await render({ value: 'https://x.test/abc', onCopy })
    const button = copyButton(m.host)
    expect(button).not.toBeNull()
    button?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flush()
    m.tick()
    expect(copyTextWithFallbackMock).toHaveBeenCalledTimes(1)
    expect(copyTextWithFallbackMock).toHaveBeenCalledWith('https://x.test/abc')
    expect(copyButton(m.host)?.textContent?.trim()).toBe('Copied!')
    expect(onCopy).toHaveBeenCalledTimes(1)
  })

  it('leaves the copied state off when the copy reports failure', async () => {
    copyTextWithFallbackMock.mockResolvedValue(false)
    const onCopy = vi.fn()
    const m = await render({ value: 'https://x.test/abc', onCopy })
    const button = copyButton(m.host)
    expect(button).not.toBeNull()
    button?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flush()
    m.tick()
    expect(copyTextWithFallbackMock).toHaveBeenCalledWith('https://x.test/abc')
    expect(copyButton(m.host)?.textContent?.trim()).toBe('Copy')
    expect(onCopy).not.toHaveBeenCalled()
  })
})
