import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  appendFile,
  copy,
  deleteFile,
  exists,
  getAvailableSpace,
  getCapabilities,
  getProvider,
  getUri,
  hasProvider,
  mkdir,
  move,
  readdir,
  readFile,
  readFileAsBlob,
  rmdir,
  setProvider,
  stat,
  writeFile,
  writeFileFromBlob,
} from '../provider.js'
import type { FileInfo, FilesystemCapabilities, FilesystemProvider } from '../types.js'

describe('filesystem/provider', () => {
  let mockProvider: FilesystemProvider

  const mockFileInfo: FileInfo = {
    name: 'test.txt',
    path: '/documents/test.txt',
    uri: 'file:///documents/test.txt',
    size: 1024,
    createdAt: '2024-01-01T00:00:00Z',
    modifiedAt: '2024-01-02T00:00:00Z',
    isDirectory: false,
    isFile: true,
    mimeType: 'text/plain',
  }

  const mockCapabilities: FilesystemCapabilities = {
    supported: true,
    directories: ['documents', 'data', 'cache', 'temp'],
    hasExternalStorage: false,
    hasPicker: true,
    maxFileSize: 1024 * 1024 * 100,
  }

  beforeEach(() => {
    mockProvider = {
      readFile: vi.fn().mockResolvedValue('file content'),
      readFileAsBlob: vi.fn().mockResolvedValue(new Blob(['test content'])),
      writeFile: vi.fn().mockResolvedValue(undefined),
      writeFileFromBlob: vi.fn().mockResolvedValue(undefined),
      appendFile: vi.fn().mockResolvedValue(undefined),
      deleteFile: vi.fn().mockResolvedValue(undefined),
      mkdir: vi.fn().mockResolvedValue(undefined),
      rmdir: vi.fn().mockResolvedValue(undefined),
      readdir: vi.fn().mockResolvedValue([mockFileInfo]),
      stat: vi.fn().mockResolvedValue(mockFileInfo),
      exists: vi.fn().mockResolvedValue(true),
      copy: vi.fn().mockResolvedValue(undefined),
      move: vi.fn().mockResolvedValue(undefined),
      getUri: vi.fn().mockResolvedValue('file:///documents/test.txt'),
      getAvailableSpace: vi.fn().mockResolvedValue(1024 * 1024 * 1024),
      getCapabilities: vi.fn().mockResolvedValue(mockCapabilities),
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('setProvider', () => {
    it('should set the provider', () => {
      setProvider(mockProvider)
      expect(getProvider()).toBe(mockProvider)
    })
  })

  describe('getProvider', () => {
    it('should return the set provider', () => {
      setProvider(mockProvider)
      expect(getProvider()).toBe(mockProvider)
    })
  })

  describe('hasProvider', () => {
    it('should return true when provider is set', () => {
      setProvider(mockProvider)
      expect(hasProvider()).toBe(true)
    })
  })

  describe('readFile', () => {
    it('should delegate to provider', async () => {
      setProvider(mockProvider)
      const result = await readFile('/test.txt')
      expect(result).toBe('file content')
      expect(mockProvider.readFile).toHaveBeenCalledWith('/test.txt', undefined)
    })

    it('should pass options to provider', async () => {
      setProvider(mockProvider)
      const options = { directory: 'documents' as const, encoding: 'utf8' as const }
      await readFile('/test.txt', options)
      expect(mockProvider.readFile).toHaveBeenCalledWith('/test.txt', options)
    })
  })

  describe('readFileAsBlob', () => {
    it('should delegate to provider', async () => {
      setProvider(mockProvider)
      const result = await readFileAsBlob('/test.txt')
      expect(result).toBeInstanceOf(Blob)
      expect(mockProvider.readFileAsBlob).toHaveBeenCalledWith('/test.txt', undefined)
    })

    it('should pass options to provider', async () => {
      setProvider(mockProvider)
      const options = { directory: 'data' as const }
      await readFileAsBlob('/test.txt', options)
      expect(mockProvider.readFileAsBlob).toHaveBeenCalledWith('/test.txt', options)
    })
  })

  describe('writeFile', () => {
    it('should delegate to provider', async () => {
      setProvider(mockProvider)
      await writeFile('/test.txt', 'content')
      expect(mockProvider.writeFile).toHaveBeenCalledWith('/test.txt', 'content', undefined)
    })

    it('should pass options to provider', async () => {
      setProvider(mockProvider)
      const options = { directory: 'documents' as const, recursive: true }
      await writeFile('/test.txt', 'content', options)
      expect(mockProvider.writeFile).toHaveBeenCalledWith('/test.txt', 'content', options)
    })

    it('should support append option', async () => {
      setProvider(mockProvider)
      const options = { append: true }
      await writeFile('/test.txt', 'more content', options)
      expect(mockProvider.writeFile).toHaveBeenCalledWith('/test.txt', 'more content', options)
    })
  })

  describe('writeFileFromBlob', () => {
    it('should delegate to provider', async () => {
      setProvider(mockProvider)
      const blob = new Blob(['binary data'], { type: 'application/octet-stream' })
      await writeFileFromBlob('/test.bin', blob)
      expect(mockProvider.writeFileFromBlob).toHaveBeenCalledWith('/test.bin', blob, undefined)
    })

    it('should pass options to provider', async () => {
      setProvider(mockProvider)
      const blob = new Blob(['binary data'])
      const options = { directory: 'cache' as const }
      await writeFileFromBlob('/test.bin', blob, options)
      expect(mockProvider.writeFileFromBlob).toHaveBeenCalledWith('/test.bin', blob, options)
    })
  })

  describe('appendFile', () => {
    it('should delegate to provider', async () => {
      setProvider(mockProvider)
      await appendFile('/test.txt', 'appended content')
      expect(mockProvider.appendFile).toHaveBeenCalledWith(
        '/test.txt',
        'appended content',
        undefined,
      )
    })

    it('should pass options to provider', async () => {
      setProvider(mockProvider)
      const options = { directory: 'documents' as const, encoding: 'utf8' as const }
      await appendFile('/test.txt', 'appended content', options)
      expect(mockProvider.appendFile).toHaveBeenCalledWith('/test.txt', 'appended content', options)
    })
  })

  describe('deleteFile', () => {
    it('should delegate to provider', async () => {
      setProvider(mockProvider)
      await deleteFile('/test.txt')
      expect(mockProvider.deleteFile).toHaveBeenCalledWith('/test.txt', undefined)
    })

    it('should pass options to provider', async () => {
      setProvider(mockProvider)
      const options = { directory: 'cache' as const }
      await deleteFile('/test.txt', options)
      expect(mockProvider.deleteFile).toHaveBeenCalledWith('/test.txt', options)
    })
  })

  describe('mkdir', () => {
    it('should delegate to provider', async () => {
      setProvider(mockProvider)
      await mkdir('/new-folder')
      expect(mockProvider.mkdir).toHaveBeenCalledWith('/new-folder', undefined)
    })

    it('should pass options to provider', async () => {
      setProvider(mockProvider)
      const options = { directory: 'documents' as const, recursive: true }
      await mkdir('/new-folder/nested', options)
      expect(mockProvider.mkdir).toHaveBeenCalledWith('/new-folder/nested', options)
    })
  })

  describe('rmdir', () => {
    it('should delegate to provider', async () => {
      setProvider(mockProvider)
      await rmdir('/old-folder')
      expect(mockProvider.rmdir).toHaveBeenCalledWith('/old-folder', undefined)
    })

    it('should pass options to provider with recursive', async () => {
      setProvider(mockProvider)
      const options = { directory: 'cache' as const, recursive: true }
      await rmdir('/old-folder', options)
      expect(mockProvider.rmdir).toHaveBeenCalledWith('/old-folder', options)
    })
  })

  describe('readdir', () => {
    it('should delegate to provider', async () => {
      setProvider(mockProvider)
      const result = await readdir('/folder')
      expect(result).toEqual([mockFileInfo])
      expect(mockProvider.readdir).toHaveBeenCalledWith('/folder', undefined)
    })

    it('should pass options to provider', async () => {
      setProvider(mockProvider)
      const options = { directory: 'documents' as const, includeHidden: true }
      await readdir('/folder', options)
      expect(mockProvider.readdir).toHaveBeenCalledWith('/folder', options)
    })

    it('should return multiple file info items', async () => {
      const multipleFiles: FileInfo[] = [
        { ...mockFileInfo, name: 'file1.txt', path: '/folder/file1.txt' },
        { ...mockFileInfo, name: 'file2.txt', path: '/folder/file2.txt' },
        {
          name: 'subfolder',
          path: '/folder/subfolder',
          uri: 'file:///folder/subfolder',
          size: 0,
          isDirectory: true,
          isFile: false,
        },
      ]
      ;(mockProvider.readdir as ReturnType<typeof vi.fn>).mockResolvedValue(multipleFiles)
      setProvider(mockProvider)

      const result = await readdir('/folder')
      expect(result).toHaveLength(3)
      expect(result[0].name).toBe('file1.txt')
      expect(result[2].isDirectory).toBe(true)
    })
  })

  describe('stat', () => {
    it('should delegate to provider', async () => {
      setProvider(mockProvider)
      const result = await stat('/test.txt')
      expect(result).toEqual(mockFileInfo)
      expect(mockProvider.stat).toHaveBeenCalledWith('/test.txt', undefined)
    })

    it('should pass options to provider', async () => {
      setProvider(mockProvider)
      const options = { directory: 'data' as const }
      await stat('/test.txt', options)
      expect(mockProvider.stat).toHaveBeenCalledWith('/test.txt', options)
    })

    it('should return directory info', async () => {
      const dirInfo: FileInfo = {
        name: 'folder',
        path: '/folder',
        uri: 'file:///folder',
        size: 0,
        isDirectory: true,
        isFile: false,
      }
      ;(mockProvider.stat as ReturnType<typeof vi.fn>).mockResolvedValue(dirInfo)
      setProvider(mockProvider)

      const result = await stat('/folder')
      expect(result.isDirectory).toBe(true)
      expect(result.isFile).toBe(false)
    })
  })

  describe('exists', () => {
    it('should return true when file exists', async () => {
      setProvider(mockProvider)
      const result = await exists('/test.txt')
      expect(result).toBe(true)
      expect(mockProvider.exists).toHaveBeenCalledWith('/test.txt', undefined)
    })

    it('should return false when file does not exist', async () => {
      ;(mockProvider.exists as ReturnType<typeof vi.fn>).mockResolvedValue(false)
      setProvider(mockProvider)
      const result = await exists('/nonexistent.txt')
      expect(result).toBe(false)
    })

    it('should pass options to provider', async () => {
      setProvider(mockProvider)
      const options = { directory: 'cache' as const }
      await exists('/test.txt', options)
      expect(mockProvider.exists).toHaveBeenCalledWith('/test.txt', options)
    })
  })

  describe('copy', () => {
    it('should delegate to provider', async () => {
      setProvider(mockProvider)
      await copy('/source.txt', '/dest.txt')
      expect(mockProvider.copy).toHaveBeenCalledWith('/source.txt', '/dest.txt', undefined)
    })

    it('should pass options to provider', async () => {
      setProvider(mockProvider)
      const options = {
        fromDirectory: 'documents' as const,
        toDirectory: 'cache' as const,
        overwrite: true,
      }
      await copy('/source.txt', '/dest.txt', options)
      expect(mockProvider.copy).toHaveBeenCalledWith('/source.txt', '/dest.txt', options)
    })
  })

  describe('move', () => {
    it('should delegate to provider', async () => {
      setProvider(mockProvider)
      await move('/old-path.txt', '/new-path.txt')
      expect(mockProvider.move).toHaveBeenCalledWith('/old-path.txt', '/new-path.txt', undefined)
    })

    it('should pass options to provider', async () => {
      setProvider(mockProvider)
      const options = {
        fromDirectory: 'temp' as const,
        toDirectory: 'documents' as const,
        overwrite: false,
      }
      await move('/old-path.txt', '/new-path.txt', options)
      expect(mockProvider.move).toHaveBeenCalledWith('/old-path.txt', '/new-path.txt', options)
    })
  })

  describe('getUri', () => {
    it('should delegate to provider', async () => {
      setProvider(mockProvider)
      const result = await getUri('/test.txt')
      expect(result).toBe('file:///documents/test.txt')
      expect(mockProvider.getUri).toHaveBeenCalledWith('/test.txt', undefined)
    })

    it('should pass options to provider', async () => {
      setProvider(mockProvider)
      const options = { directory: 'external' as const }
      await getUri('/test.txt', options)
      expect(mockProvider.getUri).toHaveBeenCalledWith('/test.txt', options)
    })
  })

  describe('getAvailableSpace', () => {
    it('should delegate to provider', async () => {
      setProvider(mockProvider)
      const result = await getAvailableSpace()
      expect(result).toBe(1024 * 1024 * 1024)
      expect(mockProvider.getAvailableSpace).toHaveBeenCalledWith(undefined)
    })

    it('should pass directory to provider', async () => {
      setProvider(mockProvider)
      await getAvailableSpace('external')
      expect(mockProvider.getAvailableSpace).toHaveBeenCalledWith('external')
    })
  })

  describe('getCapabilities', () => {
    it('should delegate to provider', async () => {
      setProvider(mockProvider)
      const result = await getCapabilities()
      expect(result).toEqual(mockCapabilities)
      expect(result.supported).toBe(true)
      expect(result.directories).toContain('documents')
      expect(result.hasPicker).toBe(true)
      expect(mockProvider.getCapabilities).toHaveBeenCalled()
    })

    it('should return capabilities with external storage', async () => {
      const capsWithExternal: FilesystemCapabilities = {
        ...mockCapabilities,
        hasExternalStorage: true,
        directories: ['documents', 'data', 'cache', 'temp', 'external'],
      }
      ;(mockProvider.getCapabilities as ReturnType<typeof vi.fn>).mockResolvedValue(
        capsWithExternal,
      )
      setProvider(mockProvider)

      const result = await getCapabilities()
      expect(result.hasExternalStorage).toBe(true)
      expect(result.directories).toContain('external')
    })
  })
})
