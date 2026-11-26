// @vitest-environment jsdom
import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ListingCard } from '../ListingCard.js'
import { ListingCardBody } from '../ListingCardBody.js'
import { ListingGrid } from '../ListingGrid.js'

vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getClassMap: () =>
    new Proxy(
      {},
      {
        get: (_target, name) =>
          name === 'cn' ? (...parts: unknown[]) => parts.filter(Boolean).join(' ') : () => '',
      },
    ),
}))

const mounted: Array<{ host: HTMLElement; root: Root }> = []

afterEach(() => {
  for (const { host, root } of mounted.splice(0)) {
    act(() => root.unmount())
    host.remove()
  }
  vi.unstubAllGlobals()
})

/**
 * Renders a card grid into a real DOM container for native button events.
 * @param node - The grid or card to mount.
 * @returns The container that holds the mounted app.
 */
function mount(node: ReactNode): HTMLElement {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  mounted.push({ host, root })
  act(() => root.render(node))
  return host
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
    const cards = () => (
      <ListingGrid>
        <ListingCard
          dataMolId="listing"
          onClick={open}
          toggle={{ value: saved, commit, ...labels }}
        >
          <ListingCardBody title="Repair station" />
        </ListingCard>
        <ListingCard>
          <ListingCardBody title="Workshop map" />
        </ListingCard>
      </ListingGrid>
    )
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

    await act(async () => button.click())
    expect(commit).toHaveBeenCalledExactlyOnceWith(true)
    expect(open).not.toHaveBeenCalled()
    expect(button.getAttribute('aria-pressed')).toBe('true')
    expect(button.textContent).toBe('Undo endorsement 4')

    const reloaded = mount(cards()).querySelector('button')
    expect(reloaded?.textContent).toBe('Undo endorsement 4')
    await act(async () => reloaded?.click())
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
      <ListingCard toggle={{ value: { pressed: true, count: 6 }, commit, onError, ...labels }}>
        <ListingCardBody title="Repair station" />
      </ListingCard>,
    )
    const button = host.querySelector('button')!
    expect(button?.textContent).toBe('Undo endorsement 6')
    act(() => button.click())
    expect(button.getAttribute('aria-pressed')).toBe('false')
    expect(button.getAttribute('aria-busy')).toBe('true')
    expect(button.textContent).toBe('Endorse 5')

    const error = new Error('Save rejected')
    await act(async () => rejectSave(error))
    expect(button.getAttribute('aria-pressed')).toBe('true')
    expect(button.textContent).toBe('Undo endorsement 6')
    expect(onError).toHaveBeenCalledWith(error)
  })

  it('leaves a card that intentionally omits a record field alone', () => {
    const record = { title: 'Workshop map', endorsed: false, endorsementCount: 14 }
    const host = mount(
      <ListingCard>
        <ListingCardBody title={record.title} />
      </ListingCard>,
    )
    expect(host.textContent).toBe('Workshop map')
    expect(host.querySelector('button')).toBeNull()
  })
})
