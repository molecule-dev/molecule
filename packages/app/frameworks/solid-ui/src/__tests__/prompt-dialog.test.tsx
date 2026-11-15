// @vitest-environment jsdom
/**
 * The dialog exists to take one string, so opening it puts focus in the input —
 * after the Modal has moved focus into the dialog (Solid runs parent effects
 * before child ones, so the focus lands one microtask behind Modal's). A port
 * of the focus path of
 * `@molecule/app-ui-react/src/__tests__/prompt-dialog.test.tsx`.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    const CALLABLE = new Set([
      'modal',
      'stack',
      'flex',
      'sp',
      'textSize',
      'fontWeight',
      'input',
      'button',
      'spinner',
    ])
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
              .filter((c) => typeof c === 'string' && c.length > 0)
              .join(' ')
        }
        if (typeof prop === 'string' && CALLABLE.has(prop)) {
          return () => prop
        }
        return String(prop)
      },
    }
    return new Proxy({}, handler)
  },
}))

vi.mock('@molecule/app-solid', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

vi.mock('@molecule/app-icons', () => ({
  getIcon: () => ({ viewBox: '0 0 20 20', fill: 'currentColor', paths: [{ d: 'M0 0h20v20H0z' }] }),
}))

import { render } from 'solid-js/web'

const { PromptDialog } = await import('../components/PromptDialog.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

/** Mounts an open PromptDialog and returns the input the dialog renders. */
function mountDialog(): HTMLInputElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(
    render(
      () => (
        <PromptDialog
          open
          onClose={() => {}}
          onSubmit={() => {}}
          title="Rename board"
          placeholder="Board name"
          initialValue="Sprint 4"
          inputMolId="prompt-input"
          confirmMolId="prompt-confirm"
          cancelMolId="prompt-cancel"
        />
      ),
      container,
    ),
  )
  return document.querySelector('input[aria-label="Rename board"]') as HTMLInputElement
}

describe('PromptDialog focus', () => {
  it('focuses the input when it opens', async () => {
    const input = mountDialog()
    // The focus move is queued behind Modal's own focus (two microtasks); a
    // macrotask turn drains both before this assertion.
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(input.value).toBe('Sprint 4')
    expect(document.activeElement).toBe(input)
  })
})
