// @vitest-environment jsdom
/**
 * Keyboard-accessibility tests for the Vue `<MessagePreview>` — a port of
 * `@molecule/app-message-preview-react/src/__tests__/message-preview.keyboard.test.tsx`.
 * Renders into a real DOM (jsdom) so we can focus the row and fire Enter/Space
 * and assert the click handler runs — proving the clickable row behaves like a
 * native button.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

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
        // Styling methods stay callable (the components call cm.flex(…)); a
        // plain token is read as a property (Angular binds
        // [class]="cm().messagePreviewAvatarWrap"), so it must be a string.
        const token = String(prop)
        return ['cn', 'flex', 'sp', 'w', 'h', 'minW', 'fontWeight', 'textSize'].includes(token)
          ? (..._args: unknown[]) => token
          : token
      },
    }
    return new Proxy({}, handler)
  },
}))
vi.mock('@molecule/app-vue', async (importOriginal) => {
  const { defineComponent } = await import('vue')
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    Link: defineComponent({ name: 'Link', inheritAttrs: false, render: () => null }),
  }
})

import { createApp, defineComponent, h } from 'vue'

const { MessagePreview } = await import('../MessagePreview.js')

const apps: Array<{ unmount: () => void; host: HTMLElement }> = []

afterEach(() => {
  for (const app of apps.splice(0)) {
    app.unmount()
    app.host.remove()
  }
})

/** Mounts a {@link MessagePreview} and returns the host element. */
const mount = (props: Record<string, unknown>): HTMLElement => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(MessagePreview, props) }))
  app.mount(host)
  apps.push({ unmount: () => app.unmount(), host })
  return host
}

/** Dispatches a keydown with the given key on the element. */
const pressKey = (el: Element, key: string): void => {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
}

describe('MessagePreview keyboard accessibility', () => {
  it('renders a focusable button-role element and fires onClick on Enter', () => {
    const onClick = vi.fn()
    const host = mount({ name: 'Maya Patel', preview: 'Thanks!', timestamp: '2m', onClick })
    const row = host.querySelector<HTMLElement>('[role="button"]')!
    expect(row.getAttribute('tabindex')).toBe('0')
    row.focus()
    expect(document.activeElement).toBe(row)
    pressKey(row, 'Enter')
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('fires onClick on Space', () => {
    const onClick = vi.fn()
    const host = mount({ name: 'Maya Patel', preview: 'Thanks!', timestamp: '2m', onClick })
    pressKey(host.querySelector<HTMLElement>('[role="button"]')!, ' ')
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('ignores other keys', () => {
    const onClick = vi.fn()
    const host = mount({ name: 'Maya Patel', preview: 'Thanks!', timestamp: '2m', onClick })
    const row = host.querySelector<HTMLElement>('[role="button"]')!
    pressKey(row, 'a')
    pressKey(row, 'Tab')
    expect(onClick).not.toHaveBeenCalled()
  })

  it('is not keyboard-interactive (no button role) when no onClick is given', () => {
    const host = mount({ name: 'Maya Patel', preview: 'Thanks!', timestamp: '2m' })
    expect(host.querySelector('[role="button"]')).toBeNull()
  })
})
