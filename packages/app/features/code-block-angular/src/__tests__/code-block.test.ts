// @vitest-environment jsdom
/**
 * Unit tests of `CodeBlock` — the port of
 * `@molecule/app-code-block-react`'s own suite. The React suite renders the
 * component with mocked UI dependencies and asserts the markup; this port
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
      changeDetection: ChangeDetectionStrategy.Default,
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

const { CodeBlock } = await import('../code-block.component.js')

const copyTextWithFallbackMock = vi.mocked(copyTextWithFallback)

/** A mounted spec host: its DOM, a props setter, and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Runs change detection on the host app (zoneless: the copied field needs it). */
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

/**
 * Mounts `CodeBlock` with the given props through the app-style host template
 * and returns the host.
 *
 * @param props - The code block's props.
 * @returns The mounted host.
 */
const render = async (props: Record<string, unknown> = {}): Promise<Mounted> => {
  const m = await mount(
    `<div mol-code-block [code]="p['code']" [language]="p['language']" [showLineNumbers]="p['showLineNumbers']" [showCopy]="p['showCopy']" [filename]="p['filename']" [className]="p['className']"></div>`,
    CodeBlock as Type<unknown>,
    props,
  )
  mounted.push(m)
  return m
}

beforeEach(() => {
  copyTextWithFallbackMock.mockReset()
  copyTextWithFallbackMock.mockResolvedValue(true)
})

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  vi.restoreAllMocks()
})

const code = 'const x = 1\nconst y = 2\nconsole.log(x + y)'

/** Helper — the copy button inside a mounted host. */
const copyButton = (host: HTMLElement): HTMLButtonElement | null =>
  host.querySelector('button[data-button]')

/** Flushes the copy promise's microtasks. */
const flush = (): Promise<void> => new Promise<void>((resolve) => setTimeout(resolve))

describe('CodeBlock', () => {
  it('renders the source code', async () => {
    const m = await render({ code })
    expect(m.host.innerHTML).toContain('console.log(x + y)')
  })

  it('renders the filename and language tag in the header', async () => {
    const m = await render({ code, filename: 'sum.ts', language: 'ts' })
    expect(m.host.innerHTML).toContain('sum.ts')
    expect(m.host.innerHTML).toContain('ts')
  })

  it('omits the header when there is no filename/language and copy is disabled', async () => {
    const m = await render({ code, showCopy: false })
    expect(m.host.innerHTML).not.toContain('<header')
  })

  it('renders the copy button by default', async () => {
    const m = await render({ code })
    expect(m.host.innerHTML).toContain('data-button=""')
    expect(m.host.innerHTML).toContain('Copy')
  })

  it('renders line numbers by default and omits them when showLineNumbers is false', async () => {
    const withNums = await render({ code })
    expect(withNums.host.innerHTML).toContain('>1<')
    expect(withNums.host.innerHTML).toContain('>2<')
    expect(withNums.host.innerHTML).toContain('>3<')
    const without = await render({ code, showLineNumbers: false })
    expect(without.host.innerHTML).not.toContain('>1<')
  })

  it('forwards className', async () => {
    const m = await render({ code, className: 'cb-cls' })
    expect(m.host.innerHTML).toContain('cb-cls')
  })

  it('copies the displayed code when the copy button is clicked', async () => {
    const m = await render({ code })
    const button = copyButton(m.host)
    expect(button).not.toBeNull()
    button?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flush()
    m.tick()
    expect(copyTextWithFallbackMock).toHaveBeenCalledTimes(1)
    expect(copyTextWithFallbackMock).toHaveBeenCalledWith(code)
    // Angular's interpolation keeps the template's surrounding whitespace.
    expect(copyButton(m.host)?.textContent?.trim()).toBe('Copied!')
  })

  it('leaves the copied state off when the copy reports failure', async () => {
    copyTextWithFallbackMock.mockResolvedValue(false)
    const m = await render({ code })
    const button = copyButton(m.host)
    expect(button).not.toBeNull()
    button?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flush()
    m.tick()
    expect(copyTextWithFallbackMock).toHaveBeenCalledWith(code)
    expect(copyButton(m.host)?.textContent?.trim()).toBe('Copy')
  })
})
