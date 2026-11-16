// @vitest-environment jsdom
/**
 * Unit tests for `CopyLinkField`, ported from
 * `@molecule/app-copy-link-field-react`'s own suite: the same behavioral
 * assertions, rendered with a real mount (jsdom), the bonded ClassMap and the
 * bonded i18n provider.
 */
import '@molecule/app-framework-conformance/ui/setup'
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { copyTextWithFallback } from '@molecule/app-clipboard'
import Host from '@molecule/app-framework-conformance/adapters/svelte-bindings/Host.svelte'
import { setMoleculeContext } from '@molecule/app-svelte'

import CopyLinkField from '../CopyLinkField.svelte'
import type { CopyLinkFieldProps } from '../types.js'

vi.mock('@molecule/app-clipboard', () => ({
  copyTextWithFallback: vi.fn(async () => true),
}))

const copyTextWithFallbackMock = vi.mocked(copyTextWithFallback)

/** The instances mounted during one test, unmounted in `afterEach`. */
const mounted: ReturnType<typeof mount>[] = []

interface Rendered {
  /** The outer wrapper div (React's root). */
  wrapper: HTMLElement
  /** The read-only input. */
  input: HTMLInputElement
}

/**
 * Mounts `CopyLinkField` with the given props and returns the key elements.
 *
 * @param props - The field's props.
 * @returns The outer wrapper div and the input.
 */
function render(props: Record<string, unknown> = {}): Rendered {
  // A fresh host per mount, so the returned elements are THIS mount's even
  // when an earlier mount is still on the page within the same test.
  const host = document.createElement('div')
  document.body.appendChild(host)
  mounted.push(
    mount(Host, {
      target: host,
      props: { config: {}, setMoleculeContext, component: CopyLinkField, props },
    }),
  )
  flushSync()
  const input = host.querySelector<HTMLInputElement>('input')
  if (!input) throw new Error('no input rendered')
  // The wrapper is the input's grandparent (input → flex row → wrapper).
  const wrapper = input.parentElement?.parentElement
  if (!(wrapper instanceof HTMLElement)) throw new Error('no wrapper rendered')
  return { wrapper, input }
}

afterEach(async () => {
  for (const instance of mounted.splice(0)) await unmount(instance)
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

beforeEach(() => {
  copyTextWithFallbackMock.mockReset()
  copyTextWithFallbackMock.mockResolvedValue(true)
})

/** Mounts a `CopyLinkField` that stays mounted (for the click tests). */
function mountLive(props: CopyLinkFieldProps): { host: HTMLDivElement } {
  const host = document.createElement('div')
  document.body.appendChild(host)
  mounted.push(
    mount(Host, {
      target: host,
      props: { config: {}, setMoleculeContext, component: CopyLinkField, props },
    }),
  )
  flushSync()
  return { host }
}

/** Helper — the copy button inside a mounted host. */
const copyButton = (host: HTMLElement): HTMLButtonElement | null => host.querySelector('button')

/** Flushes the copy promise's microtasks and Svelte's render scheduler. */
const flush = (): Promise<void> =>
  new Promise<void>((resolve) => setTimeout(resolve)).then(() => flushSync())

describe('CopyLinkField', () => {
  it('renders a read-only input carrying the value', () => {
    const { input } = render({ value: 'https://x.test/abc' })
    expect(input.getAttribute('value')).toBe('https://x.test/abc')
    expect(input.value).toBe('https://x.test/abc')
    expect(input.hasAttribute('readonly')).toBe(true)
  })

  it('renders the label when present and omits it otherwise', () => {
    const { wrapper } = render({ value: 'u', label: 'Webhook URL' })
    expect(wrapper.textContent).toContain('Webhook URL')
    expect(wrapper.children[0]?.tagName).toBe('SPAN')
    const bare = render({ value: 'u' })
    expect(bare.wrapper.textContent).not.toContain('Webhook URL')
    expect(bare.wrapper.children.length).toBe(1)
    expect(bare.wrapper.children[0]?.tagName).toBe('DIV')
  })

  it('uses the label as the input aria-label, falling back to a default', () => {
    const labeled = render({ value: 'u', label: 'API key' })
    expect(labeled.input.getAttribute('aria-label')).toBe('API key')
    const bare = render({ value: 'u' })
    expect(bare.input.getAttribute('aria-label')).toBe('Link')
  })

  it('renders the copy button with its default label', () => {
    render({ value: 'u' })
    const button = document.body.querySelector('button')
    expect(button).not.toBeNull()
    expect(button?.textContent).toContain('Copy')
  })

  it('forwards className', () => {
    const { wrapper } = render({ value: 'u', className: 'clf-cls' })
    expect(wrapper.getAttribute('class')).toContain('clf-cls')
  })

  it('copies the value when the copy button is clicked', async () => {
    const onCopy = vi.fn()
    const { host } = mountLive({ value: 'https://x.test/abc', onCopy })
    const button = copyButton(host)
    expect(button).not.toBeNull()
    button?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flush()
    expect(copyTextWithFallbackMock).toHaveBeenCalledTimes(1)
    expect(copyTextWithFallbackMock).toHaveBeenCalledWith('https://x.test/abc')
    expect(copyButton(host)?.textContent?.trim()).toBe('Copied!')
    expect(onCopy).toHaveBeenCalledTimes(1)
  })

  it('leaves the copied state off when the copy reports failure', async () => {
    copyTextWithFallbackMock.mockResolvedValue(false)
    const onCopy = vi.fn()
    const { host } = mountLive({ value: 'https://x.test/abc', onCopy })
    const button = copyButton(host)
    expect(button).not.toBeNull()
    button?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flush()
    expect(copyTextWithFallbackMock).toHaveBeenCalledWith('https://x.test/abc')
    expect(copyButton(host)?.textContent?.trim()).toBe('Copy')
    expect(onCopy).not.toHaveBeenCalled()
  })
})
