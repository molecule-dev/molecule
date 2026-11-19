// @vitest-environment jsdom
/**
 * Unit tests for the counted toggle of the Vue listing card — a port of
 * `@molecule/app-listing-card-react/src/__tests__/listing-card-toggle.test.tsx`:
 * the same test names and the same behavioral assertions, mounted with Vue in
 * jsdom and asserted on the markup the components produce.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

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

// `Card` is the only `@molecule/app-ui-vue` component mocked — it becomes a
// <div data-card> that forwards data-mol-id + className + the click handler +
// children, the same observable contract the React suite's Card mock has. The
// real `Button` stays in place so the ported test exercises the native button.
vi.mock('@molecule/app-ui-vue', async (importOriginal) => {
  const actual = await importOriginal<typeof AppUiVue>()
  const { defineComponent, h } = await import('vue')
  return {
    ...actual,
    Card: defineComponent({
      name: 'Card',
      inheritAttrs: false,
      props: {
        className: String,
        onClick: Function,
      },
      setup(props, { attrs, slots }) {
        return () =>
          h(
            'div',
            {
              'data-card': '',
              class: props.className,
              onClick: (event: MouseEvent) => props.onClick?.(event),
              ...attrs,
            },
            slots.default?.(),
          )
      },
    }),
  }
})

import { type App, createApp, defineComponent, h, nextTick, type VNode, type VNodeChild } from 'vue'

import type * as AppUiVue from '@molecule/app-ui-vue'

import { ListingCard } from '../ListingCard.js'
import { ListingCardBody } from '../ListingCardBody.js'
import { ListingGrid } from '../ListingGrid.js'

const mounted: Array<{ app: App; host: HTMLElement }> = []

afterEach(() => {
  for (const { app, host } of mounted.splice(0)) {
    app.unmount()
    host.remove()
  }
})

/**
 * Renders a node into a real DOM container, kept mounted so native button events
 * can be dispatched (React's `mount` helper equivalent).
 *
 * @param node - The node to mount.
 * @returns The container that holds the mounted app.
 */
const mount = (node: VNodeChild): HTMLElement => {
  const host = document.createElement('div')
  document.body.append(host)
  const app = createApp(defineComponent({ render: () => node }))
  app.mount(host)
  mounted.push({ app, host })
  return host
}

/**
 * Flushes the toggle's save promise and the render it schedules.
 *
 * @returns A promise resolved once Vue has re-rendered.
 */
const flush = async (): Promise<void> => {
  await Promise.resolve()
  await nextTick()
  await Promise.resolve()
  await nextTick()
}

const labels = { activeLabel: 'Undo endorsement', inactiveLabel: 'Endorse' }

describe('ListingCard counted toggle', () => {
  it('renders the configured button and zero count, saves it, and shows the server count', async () => {
    let saved = { pressed: false, count: 0 }
    const open = vi.fn()
    const commit = vi.fn(async (pressed: boolean) => {
      saved = { pressed, count: pressed ? 4 : 3 }
      return saved
    })
    const cards = (): VNode =>
      h(ListingGrid, null, {
        default: () => [
          h(
            ListingCard,
            {
              dataMolId: 'listing',
              onClick: open,
              toggle: { value: saved, commit, ...labels },
            },
            { default: () => [h(ListingCardBody, { title: 'Repair station' })] },
          ),
          h(ListingCard, null, {
            default: () => [h(ListingCardBody, { title: 'Workshop map' })],
          }),
        ],
      })
    const host = mount(cards())
    const button = host.querySelector('button[aria-pressed]')
    expect(button, 'The card must render the configured toggle as a button').toBeInstanceOf(
      HTMLButtonElement,
    )
    if (!(button instanceof HTMLButtonElement)) throw new Error('Missing toggle button')
    expect(button.type).toBe('button')
    expect(button.getAttribute('aria-pressed')).toBe('false')
    expect(button.textContent).toBe('Endorse 0')
    expect(host.querySelectorAll('button')).toHaveLength(1)

    button.click()
    await flush()
    expect(commit).toHaveBeenCalledExactlyOnceWith(true)
    expect(open).not.toHaveBeenCalled()
    expect(button.getAttribute('aria-pressed')).toBe('true')
    expect(button.textContent).toBe('Undo endorsement 4')

    const reloaded = mount(cards()).querySelector('button')
    expect(reloaded?.textContent).toBe('Undo endorsement 4')
    reloaded?.click()
    await flush()
    expect(commit.mock.calls).toEqual([[true], [false]])
    expect(reloaded?.textContent).toBe('Endorse 3')
  })

  it('rolls back both the pressed state and the count on a rejected save', async () => {
    let rejectSave!: (error: unknown) => void
    const response = new Promise<never>((_resolve, reject) => {
      rejectSave = reject
    })
    const commit = vi.fn(() => response)
    const onError = vi.fn()
    const host = mount(
      h(
        ListingCard,
        { toggle: { value: { pressed: true, count: 6 }, commit, onError, ...labels } },
        { default: () => [h(ListingCardBody, { title: 'Repair station' })] },
      ),
    )
    const button = host.querySelector('button')
    expect(button?.textContent).toBe('Undo endorsement 6')
    button?.click()
    await nextTick()
    expect(button?.getAttribute('aria-pressed')).toBe('false')
    expect(button?.getAttribute('aria-busy')).toBe('true')
    expect(button?.textContent).toBe('Endorse 5')

    const error = new Error('Save rejected')
    rejectSave(error)
    await flush()
    expect(button?.getAttribute('aria-pressed')).toBe('true')
    expect(button?.textContent).toBe('Undo endorsement 6')
    expect(onError).toHaveBeenCalledWith(error)
  })

  it('leaves a card that intentionally omits a record field alone', () => {
    const record = { title: 'Workshop map', endorsed: false, endorsementCount: 14 }
    const host = mount(
      h(ListingCard, null, { default: () => [h(ListingCardBody, { title: record.title })] }),
    )
    expect(host.textContent).toBe('Workshop map')
    expect(host.querySelector('button')).toBeNull()
  })
})
