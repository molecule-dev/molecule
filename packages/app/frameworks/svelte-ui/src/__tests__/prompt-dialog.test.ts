// @vitest-environment jsdom
/**
 * The dialog exists to take one string, so opening it puts focus in the input —
 * after the Modal has moved focus into the dialog (Svelte runs child effects
 * before parent ones, so the input wins). A port of the focus path of
 * `@molecule/app-ui-react/src/__tests__/prompt-dialog.test.tsx`.
 *
 * @module
 */
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
        const fn = (..._args: unknown[]) => token
        fn.toString = () => token
        return fn
      },
    }
    return new Proxy({}, handler)
  },
}))

vi.mock('@molecule/app-svelte', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

vi.mock('@molecule/app-icons', () => ({
  getIcon: () => ({ viewBox: '0 0 20 20', fill: 'currentColor', paths: [{ d: 'M0 0h20v20H0z' }] }),
}))

import { type Component, mount, unmount } from 'svelte'

const { default: PromptDialog } = await import('../components/PromptDialog.svelte')

const mounted: Array<ReturnType<typeof unmount>> = []
const hosts: HTMLElement[] = []

afterEach(() => {
  for (const instance of mounted.splice(0)) unmount(instance)
  for (const host of hosts.splice(0)) host.remove()
})

/** Mounts an open PromptDialog. */
function mountDialog(): void {
  const host = document.createElement('div')
  document.body.appendChild(host)
  hosts.push(host)
  mounted.push(
    mount(
      PromptDialog as Component<{
        open: boolean
        onClose: () => void
        onSubmit: (value: string) => void
        title: string
        placeholder?: string
        initialValue?: string
        inputMolId?: string
        confirmMolId?: string
        cancelMolId?: string
      }>,
      {
        target: host,
        props: {
          open: true,
          onClose: () => {},
          onSubmit: () => {},
          title: 'Rename board',
          placeholder: 'Board name',
          initialValue: 'Sprint 4',
          inputMolId: 'prompt-input',
          confirmMolId: 'prompt-confirm',
          cancelMolId: 'prompt-cancel',
        },
      },
    ),
  )
}

describe('PromptDialog focus', () => {
  it('focuses the input when it opens', async () => {
    mountDialog()
    // Effects run after mount's synchronous DOM work; a macrotask turn drains
    // Modal's own focus move and the input focus that follows it.
    await new Promise((resolve) => setTimeout(resolve, 0))
    const input = document.querySelector('input[aria-label="Rename board"]') as HTMLInputElement
    expect(input.value).toBe('Sprint 4')
    expect(document.activeElement).toBe(input)
  })
})
