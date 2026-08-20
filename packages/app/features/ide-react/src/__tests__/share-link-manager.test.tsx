// @vitest-environment jsdom

/**
 * `ShareLinkManager` — the shared public-link UI used by both {@link ShareModal}
 * and a host's team/access panel.
 *
 * The behavior it pins: it reflects the project's CURRENT link rather than
 * always offering to mint one. When a link exists it shows the absolute URL
 * (click-to-copy) plus Revoke and hides Create; revoking brings Create back.
 * When none exists it offers Create — but only to a caller who may manage; a
 * read-only viewer sees an existing link (and can copy it) but no controls.
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
const clipboardMock = vi.hoisted(() => ({ writeText: vi.fn() }))

vi.mock('@molecule/app-react', () => ({
  useHttpClient: () => httpMock,
  useThemeMode: () => 'dark',
}))

import { ShareLinkManager } from '../components/ShareLinkManager.js'

const LINK = { id: 'l1', slug: 'abc123', role: 'viewer' as const }

beforeEach(() => {
  setClassMap(classMap)
  setIconSet(new Proxy({}, { get: () => ({ paths: [] }) }))
  setI18nProvider(createSimpleI18nProvider('en'))
  httpMock.get.mockReset().mockResolvedValue({ data: { data: [] } })
  httpMock.post.mockReset().mockResolvedValue({ data: LINK })
  httpMock.delete.mockReset().mockResolvedValue({ data: {} })
  clipboardMock.writeText.mockReset().mockResolvedValue(undefined)
  Object.assign(navigator, { clipboard: clipboardMock })
})

afterEach(() => {
  cleanup()
})

describe('ShareLinkManager', () => {
  it('shows an existing link as an absolute URL with revoke, and NOT a create control', async () => {
    httpMock.get.mockResolvedValue({ data: { data: [LINK] } })

    const { container } = render(<ShareLinkManager projectId="p1" />)

    const field = await waitFor(() => {
      const el = container.querySelector('[data-mol-id="share-link-url"]') as HTMLInputElement
      expect(el).not.toBeNull()
      return el
    })
    // Absolute, not the bare "/share/…" path.
    expect(field.value).toMatch(/^https?:\/\/.+\/share\/abc123$/)
    expect(container.querySelector('[data-mol-id="share-link-revoke-l1"]')).not.toBeNull()
    // A link already exists, so no "Create link".
    expect(container.querySelector('[data-mol-id="share-create"]')).toBeNull()
  })

  it('copies the absolute URL to the clipboard when the link is clicked', async () => {
    httpMock.get.mockResolvedValue({ data: { data: [LINK] } })

    const { container } = render(<ShareLinkManager projectId="p1" />)

    const field = await waitFor(() => {
      const el = container.querySelector('[data-mol-id="share-link-url"]') as HTMLInputElement
      expect(el).not.toBeNull()
      return el
    })
    fireEvent.click(field)
    await waitFor(() => expect(clipboardMock.writeText).toHaveBeenCalledTimes(1))
    expect(clipboardMock.writeText.mock.calls[0][0]).toMatch(/\/share\/abc123$/)
    // Visual confirmation: the copy control flips to "Copied".
    await waitFor(() =>
      expect(container.querySelector('[data-mol-id="share-link-copy"]')?.textContent).toContain(
        'Copied',
      ),
    )
  })

  it('revokes a link, then offers create again', async () => {
    httpMock.get.mockResolvedValue({ data: { data: [LINK] } })

    const { container } = render(<ShareLinkManager projectId="p1" />)

    const revoke = await waitFor(() => {
      const el = container.querySelector('[data-mol-id="share-link-revoke-l1"]')
      expect(el).not.toBeNull()
      return el as HTMLButtonElement
    })
    fireEvent.click(revoke)

    await waitFor(() => expect(httpMock.delete).toHaveBeenCalledWith('/projects/p1/shares/l1'))
    // The link is gone and create returns.
    await waitFor(() =>
      expect(container.querySelector('[data-mol-id="share-create"]')).not.toBeNull(),
    )
    expect(container.querySelector('[data-mol-id="share-link-url"]')).toBeNull()
  })

  it('creates a link when none exists, then hides the create control', async () => {
    const { container } = render(<ShareLinkManager projectId="p1" />)

    const create = await waitFor(() => {
      const el = container.querySelector('[data-mol-id="share-create"]')
      expect(el).not.toBeNull()
      return el as HTMLButtonElement
    })
    fireEvent.click(create)

    await waitFor(() =>
      expect(httpMock.post).toHaveBeenCalledWith('/projects/p1/shares', { role: 'viewer' }),
    )
    await waitFor(() =>
      expect(container.querySelector('[data-mol-id="share-link-url"]')).not.toBeNull(),
    )
    expect(container.querySelector('[data-mol-id="share-create"]')).toBeNull()
  })

  it('lets a read-only caller see and copy a link but never manage it', async () => {
    httpMock.get.mockResolvedValue({ data: { data: [LINK] } })

    const { container } = render(<ShareLinkManager projectId="p1" canManage={false} />)

    await waitFor(() => {
      expect(container.querySelector('[data-mol-id="share-link-url"]')).not.toBeNull()
    })
    // No revoke, and if there were no link, no create either.
    expect(container.querySelector('[data-mol-id="share-link-revoke-l1"]')).toBeNull()
    expect(container.querySelector('[data-mol-id="share-create"]')).toBeNull()
  })

  it('tells a read-only caller when there is no link, without offering create', async () => {
    const { container } = render(<ShareLinkManager projectId="p1" canManage={false} />)

    await waitFor(() => {
      expect(container.querySelector('[data-mol-id="share-links-none"]')).not.toBeNull()
    })
    expect(container.querySelector('[data-mol-id="share-create"]')).toBeNull()
  })
})
