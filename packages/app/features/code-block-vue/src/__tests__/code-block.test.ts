// @vitest-environment jsdom
/**
 * Unit tests for the Vue `CodeBlock` — a port of
 * `@molecule/app-code-block-react/src/__tests__/code-block.test.tsx`: the same
 * behavioral assertions, rendered with Vue in jsdom and asserted on the markup
 * the component produces.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
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
vi.mock('@molecule/app-vue', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

// The copy-button marker the React tests mock `@molecule/app-ui-react` with:
// a `data-button` element rendering its default slot.
vi.mock('@molecule/app-ui-vue', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    Button: defineComponent({
      name: 'Button',
      props: {
        variant: String,
        size: String,
        onClick: { type: Function, default: undefined },
      },
      setup(props, { slots }) {
        return () =>
          h('button', { 'data-button': '', type: 'button', onClick: props.onClick }, [
            slots.default?.(),
          ])
      },
    }),
  }
})

vi.mock('@molecule/app-clipboard', () => ({
  copyTextWithFallback: vi.fn(async () => true),
}))

import { type App, createApp, defineComponent, h } from 'vue'

import { copyTextWithFallback } from '@molecule/app-clipboard'

import { CodeBlock } from '../CodeBlock.js'
import type { CodeBlockProps } from '../types.js'

const copyTextWithFallbackMock = vi.mocked(copyTextWithFallback)

beforeEach(() => {
  copyTextWithFallbackMock.mockReset()
  copyTextWithFallbackMock.mockResolvedValue(true)
})

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

/** Renders a {@link CodeBlock} and returns the markup it produced. */
const render = (props: CodeBlockProps): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(CodeBlock, props) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

const code = 'const x = 1\nconst y = 2\nconsole.log(x + y)'

/** Mounts a {@link CodeBlock} that stays mounted (for the click tests). */
const mountLive = (props: CodeBlockProps): { app: App; host: HTMLDivElement } => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(CodeBlock, props) }))
  app.mount(host)
  return { app, host }
}

/** Helper — the copy button inside a mounted host. */
const copyButton = (host: HTMLElement): HTMLButtonElement | null =>
  host.querySelector('button[data-button]')

/** Flushes the copy promise's microtasks and Vue's render scheduler. */
const flush = (): Promise<void> => new Promise<void>((resolve) => setTimeout(resolve))

describe('CodeBlock', () => {
  it('renders the source code', () => {
    const markup = render({ code })
    expect(markup).toContain('console.log(x + y)')
  })

  it('renders the filename and language tag in the header', () => {
    const markup = render({ code, filename: 'sum.ts', language: 'ts' })
    expect(markup).toContain('sum.ts')
    expect(markup).toContain('ts')
  })

  it('omits the header when there is no filename/language and copy is disabled', () => {
    const markup = render({ code, showCopy: false })
    expect(markup).not.toContain('<header')
  })

  it('renders the copy button by default', () => {
    const markup = render({ code })
    expect(markup).toContain('data-button=""')
    expect(markup).toContain('Copy')
  })

  it('renders line numbers by default and omits them when showLineNumbers is false', () => {
    const withNums = render({ code })
    expect(withNums).toContain('>1<')
    expect(withNums).toContain('>2<')
    expect(withNums).toContain('>3<')
    const without = render({ code, showLineNumbers: false })
    expect(without).not.toContain('>1<')
  })

  it('forwards className', () => {
    const markup = render({ code, className: 'cb-cls' })
    expect(markup).toContain('cb-cls')
  })

  it('copies the displayed code when the copy button is clicked', async () => {
    const { app, host } = mountLive({ code })
    try {
      const button = copyButton(host)
      expect(button).not.toBeNull()
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await flush()
      expect(copyTextWithFallbackMock).toHaveBeenCalledTimes(1)
      expect(copyTextWithFallbackMock).toHaveBeenCalledWith(code)
      expect(copyButton(host)?.textContent).toBe('Copied!')
    } finally {
      app.unmount()
    }
  })

  it('leaves the copied state off when the copy reports failure', async () => {
    copyTextWithFallbackMock.mockResolvedValue(false)
    const { app, host } = mountLive({ code })
    try {
      const button = copyButton(host)
      expect(button).not.toBeNull()
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await flush()
      expect(copyTextWithFallbackMock).toHaveBeenCalledWith(code)
      expect(copyButton(host)?.textContent).toBe('Copy')
    } finally {
      app.unmount()
    }
  })
})
