// @vitest-environment jsdom
/**
 * Open-button tests for the Solid `<InboxRow>` — a port of
 * `@molecule/app-inbox-row-react/src/__tests__/inbox-row.open.test.tsx`.
 * Renders into a real DOM (jsdom): while `onClick` is set the row renders an
 * empty, transparent native button over itself — the whole row is the hit
 * area, and the button is named by the sender and the subject — and the inner
 * controls keep their own clicks.
 *
 * @module
 */

import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { InboxRowProps } from '../types.js'

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

vi.mock('@molecule/app-ui-solid', () => ({
  Avatar: (props: { src?: string; alt?: string; name?: string }) => {
    const img = document.createElement('img')
    img.setAttribute('data-avatar', props.src ?? '')
    img.setAttribute('data-avatar-name', props.alt ?? props.name ?? '')
    return img
  },
}))

// The i18n mock the React tests' bonded provider stands in for: `t` resolves
// to the inline English default, so the labels read as React's do.
vi.mock('@molecule/app-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

const { InboxRow } = await import('../InboxRow.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

/**
 * Renders an {@link InboxRow} and returns its open button and container.
 */
function renderRow(props: InboxRowProps): {
  button: HTMLButtonElement | null
  host: HTMLElement
} {
  const host = document.createElement('div')
  document.body.appendChild(host)
  disposers.push(render(() => <InboxRow {...props} />, host))
  return { button: host.querySelector('button[data-mol-id="inbox-row-open"]'), host }
}

describe('InboxRow open button', () => {
  it('clicking the open button calls onClick', () => {
    const onClick = vi.fn()
    const { button } = renderRow({ sender: 'A', subject: 'S', onClick })
    if (!button) throw new Error('the open button did not render')
    button.click()
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('clicking an inner control does not call onClick', () => {
    const onClick = vi.fn()
    const onToggleStar = vi.fn()
    const { host } = renderRow({
      sender: 'A',
      subject: 'S',
      onClick,
      onToggleStar,
      labels: <span data-label="">Work</span>,
      selectionSlot: <input data-select="" type="checkbox" />,
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
  })

  it('the open button is named by the label', () => {
    const onClick = vi.fn()
    const { button } = renderRow({ sender: 'Alice', subject: 'Lunch?', onClick })
    if (!button) throw new Error('the open button did not render')
    const labelledBy = button.getAttribute('aria-labelledby') ?? ''
    const ids = labelledBy.split(/\s+/).filter(Boolean)
    expect(ids).toHaveLength(2)
    const name = ids.map((id) => document.getElementById(id)?.textContent ?? '').join(' ')
    expect(name).toBe('Alice Lunch?')
  })

  it('without onClick there is no open button', () => {
    const clickable = renderRow({ sender: 'A', subject: 'S', onClick: () => {} })
    expect(clickable.button).toBeTruthy()
    const plain = renderRow({ sender: 'A', subject: 'S' })
    expect(plain.button).toBeNull()
  })
})
