// @vitest-environment jsdom

/**
 * The share modal offers only the roles the host actually grants.
 *
 * It used to render all four contract roles unconditionally, while the only
 * shipped backend clamped every one of them to `viewer` — so a user picking
 * "Editor — view & edit" got a viewer link, and the very same dialog then told
 * them "Anyone with this link can act as viewer". Two contradictory statements,
 * and the user had to notice the discrepancy to learn their choice was ignored.
 *
 * A public link is an unauthenticated credential, so the default is the single
 * safest role and a host opts into more.
 *
 * @module
 */

import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider as setI18nProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

const httpMock = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), delete: vi.fn() }))

vi.mock('@molecule/app-react', () => ({
  useHttpClient: () => httpMock,
  useThemeMode: () => 'dark',
}))

import { ShareModal } from '../components/ShareModal.js'

beforeEach(() => {
  setClassMap(classMap)
  setIconSet(new Proxy({}, { get: () => ({ paths: [] }) }))
  setI18nProvider(createSimpleI18nProvider('en'))
  // The manager lists existing links on mount; default to "none" so the create
  // control is what renders.
  httpMock.get.mockReset().mockResolvedValue({ data: { data: [] } })
  httpMock.post.mockReset().mockResolvedValue({ data: { id: 'l1', slug: 'abc', role: 'viewer' } })
  httpMock.delete.mockReset().mockResolvedValue({ data: {} })
})

afterEach(() => {
  cleanup()
})

describe('ShareModal — offered roles', () => {
  it('offers no role choice by default and mints the safe role', async () => {
    const { container } = render(<ShareModal projectId="p1" onClose={() => {}} />)

    // The create control appears once the (empty) link list has loaded.
    const create = await waitFor(() => {
      const el = container.querySelector('[data-mol-id="share-create"]')
      expect(el).not.toBeNull()
      return el as HTMLElement
    })
    // No select at all: with one role there is nothing to choose, and a control
    // whose value the backend overrides is worse than no control.
    expect(container.querySelector('[data-mol-id="share-role"]')).toBeNull()

    fireEvent.click(create)
    await waitFor(() => {
      expect(httpMock.post).toHaveBeenCalledWith('/projects/p1/shares', { role: 'viewer' })
    })
  })

  it('says what the single link will grant, instead of implying a choice', () => {
    const { container } = render(<ShareModal projectId="p1" onClose={() => {}} />)
    expect(container.textContent).toContain('can act as viewer')
    expect(container.textContent).not.toContain('the role you choose')
  })

  it('offers exactly the roles the host declares, in order', async () => {
    const { container } = render(
      <ShareModal projectId="p1" roles={['viewer', 'editor']} onClose={() => {}} />,
    )

    const select = await waitFor(() => {
      const el = container.querySelector('[data-mol-id="share-role"]')
      expect(el).not.toBeNull()
      return el as HTMLSelectElement
    })
    expect(Array.from(select.options).map((option) => option.value)).toEqual(['viewer', 'editor'])
  })

  it('ignores an initial role the host does not grant', async () => {
    const { container } = render(
      <ShareModal projectId="p1" initialRole="owner" onClose={() => {}} />,
    )

    const create = await waitFor(() => {
      const el = container.querySelector('[data-mol-id="share-create"]')
      expect(el).not.toBeNull()
      return el as HTMLElement
    })
    fireEvent.click(create)
    await waitFor(() => {
      // `/share owner` must not POST a role the backend would silently downgrade.
      expect(httpMock.post).toHaveBeenCalledWith('/projects/p1/shares', { role: 'viewer' })
    })
  })
})
