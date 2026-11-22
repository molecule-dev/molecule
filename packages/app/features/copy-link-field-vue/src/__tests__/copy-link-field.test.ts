// @vitest-environment jsdom
/**
 * Unit tests for the Vue `CopyLinkField` — a port of
 * `@molecule/app-copy-link-field-react/src/__tests__/copy-link-field.test.tsx`:
 * the same behavioral assertions, rendered with Vue in jsdom and asserted on
 * the markup the component produces.
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

import { CopyLinkField } from '../CopyLinkField.js'
import type { CopyLinkFieldProps } from '../types.js'

const copyTextWithFallbackMock = vi.mocked(copyTextWithFallback)

beforeEach(() => {
  copyTextWithFallbackMock.mockReset()
  copyTextWithFallbackMock.mockResolvedValue(true)
})

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

/** Renders a {@link CopyLinkField} and returns the markup it produced. */
const render = (props: CopyLinkFieldProps): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(CopyLinkField, props) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

/** Mounts a {@link CopyLinkField} that stays mounted (for the click tests). */
const mountLive = (props: CopyLinkFieldProps): { app: App; host: HTMLDivElement } => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(CopyLinkField, props) }))
  app.mount(host)
  return { app, host }
}

/** Helper — the copy button inside a mounted host. */
const copyButton = (host: HTMLElement): HTMLButtonElement | null =>
  host.querySelector('button[data-button]')

/** Flushes the copy promise's microtasks and Vue's render scheduler. */
const flush = (): Promise<void> => new Promise<void>((resolve) => setTimeout(resolve))

describe('CopyLinkField', () => {
  it('renders a read-only input carrying the value', () => {
    const markup = render({ value: 'https://x.test/abc' })
    expect(markup).toContain('value="https://x.test/abc"')
    expect(markup).toContain('readonly')
  })

  it('renders the label when present and omits it otherwise', () => {
    expect(render({ value: 'u', label: 'Webhook URL' })).toContain('Webhook URL')
    const without = render({ value: 'u' })
    expect(without).not.toContain('Webhook URL')
  })

  it('uses the label as the input aria-label, falling back to a default', () => {
    expect(render({ value: 'u', label: 'API key' })).toContain('aria-label="API key"')
    expect(render({ value: 'u' })).toContain('aria-label="Link"')
  })

  it('renders the copy button with its default label', () => {
    const markup = render({ value: 'u' })
    expect(markup).toContain('data-button=""')
    expect(markup).toContain('Copy')
  })

  it('forwards className', () => {
    const markup = render({ value: 'u', className: 'clf-cls' })
    expect(markup).toContain('clf-cls')
  })

  it('copies the value when the copy button is clicked', async () => {
    const onCopy = vi.fn()
    const { app, host } = mountLive({ value: 'https://x.test/abc', onCopy })
    try {
      const button = copyButton(host)
      expect(button).not.toBeNull()
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await flush()
      expect(copyTextWithFallbackMock).toHaveBeenCalledTimes(1)
      expect(copyTextWithFallbackMock).toHaveBeenCalledWith('https://x.test/abc')
      expect(copyButton(host)?.textContent).toBe('Copied!')
      expect(onCopy).toHaveBeenCalledTimes(1)
    } finally {
      app.unmount()
    }
  })

  it('leaves the copied state off when the copy reports failure', async () => {
    copyTextWithFallbackMock.mockResolvedValue(false)
    const onCopy = vi.fn()
    const { app, host } = mountLive({ value: 'https://x.test/abc', onCopy })
    try {
      const button = copyButton(host)
      expect(button).not.toBeNull()
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await flush()
      expect(copyTextWithFallbackMock).toHaveBeenCalledWith('https://x.test/abc')
      expect(copyButton(host)?.textContent).toBe('Copy')
      expect(onCopy).not.toHaveBeenCalled()
    } finally {
      app.unmount()
    }
  })
})
