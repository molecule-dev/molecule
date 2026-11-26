// @vitest-environment jsdom
/**
 * Open-button tests for the Vue `<InboxRow>` — a port of
 * `@molecule/app-inbox-row-react/src/__tests__/inbox-row.open.test.tsx`.
 * Renders into a real DOM (jsdom): while `onClick` is set the row renders an
 * empty, transparent native button over itself — the whole row is the hit
 * area, and the button is named by the sender and the subject — and the inner
 * controls keep their own clicks.
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
        const token = String(prop)
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

vi.mock('@molecule/app-ui-vue', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  Avatar: (props: { src?: string; alt?: string; name?: string }) => {
    const img = document.createElement('img')
    img.setAttribute('data-avatar', props.src ?? '')
    img.setAttribute('data-avatar-name', props.alt ?? props.name ?? '')
    return img
  },
}))

import { createApp, defineComponent, h } from 'vue'

import { InboxRow } from '../InboxRow.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/**
 * Mounts an {@link InboxRow} and returns its open button plus cleanup.
 *
 * @param props - The row props.
 */
const render = (
  props: Record<string, unknown>,
): { button: HTMLButtonElement | null; host: HTMLElement; unmount: () => void } => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(InboxRow, props) }))
  app.mount(host)
  return {
    button: host.querySelector('button[data-mol-id="inbox-row-open"]'),
    host,
    unmount: () => app.unmount(),
  }
}

describe('InboxRow open button', () => {
  it('clicking the open button calls onClick', () => {
    const onClick = vi.fn()
    const { button, unmount } = render({ sender: 'Alice', subject: 'Lunch?', onClick })
    if (!button) throw new Error('the open button did not render')
    button.click()
    expect(onClick).toHaveBeenCalledTimes(1)
    unmount()
  })

  it('clicking an inner control does not call onClick', () => {
    const onClick = vi.fn()
    const onToggleStar = vi.fn()
    const { host, unmount } = render({
      sender: 'Alice',
      subject: 'Lunch?',
      onClick,
      onToggleStar,
      labels: h('span', { 'data-label': '' }, 'Work'),
      selectionSlot: h('input', { 'data-select': '', type: 'checkbox' }),
    })
    const star = host.querySelector<HTMLElement>('button[data-mol-id="inbox-row-star"]')
    if (!star) throw new Error('the star button did not render')
    star.click()
    expect(onToggleStar).toHaveBeenCalledTimes(1)
    expect(onClick).not.toHaveBeenCalled()
    const select = host.querySelector<HTMLElement>('input[data-select]')
    if (!select) throw new Error('the selection slot did not render')
    select.click()
    expect(onClick).not.toHaveBeenCalled()
    const label = host.querySelector<HTMLElement>('span[data-label]')
    if (!label) throw new Error('the labels slot did not render')
    label.click()
    expect(onClick).not.toHaveBeenCalled()
    unmount()
  })

  it('the open button is named by the label', () => {
    const onClick = vi.fn()
    const { button, unmount } = render({ sender: 'Alice', subject: 'Lunch?', onClick })
    if (!button) throw new Error('the open button did not render')
    const labelledBy = button.getAttribute('aria-labelledby') ?? ''
    const ids = labelledBy.split(/\s+/).filter(Boolean)
    expect(ids).toHaveLength(2)
    const name = ids.map((id) => document.getElementById(id)?.textContent ?? '').join(' ')
    expect(name).toBe('Alice Lunch?')
    unmount()
  })

  it('without onClick there is no open button', () => {
    const clickable = render({ sender: 'A', subject: 'S', onClick: () => {} })
    expect(clickable.button).toBeTruthy()
    clickable.unmount()
    const plain = render({ sender: 'A', subject: 'S' })
    expect(plain.button).toBeNull()
    plain.unmount()
  })
})
