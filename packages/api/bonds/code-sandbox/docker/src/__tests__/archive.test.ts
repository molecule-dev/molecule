/**
 * Tests for bulk workspace transfer.
 *
 * @module
 */
import { describe, expect, it, vi } from 'vitest'

import type { ArchiveContext } from '../archive.js'
import { exportContainerFiles, importContainerFiles } from '../archive.js'

/** Build an archive context that records the paths it was asked for. */
function harness(): { ctx: ArchiveContext; downloads: string[]; uploads: string[] } {
  const downloads: string[] = []
  const uploads: string[] = []
  return {
    downloads,
    uploads,
    ctx: {
      download: async (path) => {
        downloads.push(path)
        return (async function* () {
          yield new Uint8Array([0])
        })()
      },
      upload: async (path) => {
        uploads.push(path)
      },
    },
  }
}

describe('exportContainerFiles', () => {
  it('asks the daemon for the requested path, URL-encoded', async () => {
    const { ctx, downloads } = harness()
    await exportContainerFiles(ctx, 'container-1', '/workspace/app')
    expect(downloads).toEqual(['/containers/container-1/archive?path=%2Fworkspace%2Fapp'])
  })

  it('rejects a relative path or a traversal', async () => {
    const { ctx } = harness()
    await expect(exportContainerFiles(ctx, 'container-1', 'workspace')).rejects.toThrow(
      /must be absolute/,
    )
    await expect(exportContainerFiles(ctx, 'container-1', '/workspace/../etc')).rejects.toThrow(
      /must be absolute/,
    )
  })

  it('does not read the stream, so nothing is buffered here', async () => {
    // A project tree is gigabytes; materializing one in this process to hand it
    // to the next call is the failure this endpoint pair exists to avoid.
    const consumed = vi.fn()
    const ctx: ArchiveContext = {
      download: async () =>
        (async function* () {
          consumed()
          yield new Uint8Array([0])
        })(),
      upload: vi.fn(),
    }
    await exportContainerFiles(ctx, 'container-1', '/workspace')
    expect(consumed).not.toHaveBeenCalled()
  })
})

describe('importContainerFiles', () => {
  it('extracts at the requested path', async () => {
    const { ctx, uploads } = harness()
    await importContainerFiles(
      ctx,
      'container-1',
      '/workspace',
      (async function* () {
        yield new Uint8Array([0])
      })(),
    )
    expect(uploads).toEqual(['/containers/container-1/archive?path=%2Fworkspace'])
  })

  it('rejects a path that is not absolute', async () => {
    const { ctx } = harness()
    await expect(
      importContainerFiles(
        ctx,
        'container-1',
        './workspace',
        (async function* () {
          yield new Uint8Array([0])
        })(),
      ),
    ).rejects.toThrow(/must be absolute/)
  })
})
