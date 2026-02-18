import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as Filesystem from '../index.js'
import type { FileInfo, FilesystemCapabilities, FilesystemProvider } from '../types.js'

describe('filesystem/index', () => {
  describe('exports', () => {
    it('should export provider management functions', () => {
      expect(typeof Filesystem.setProvider).toBe('function')
      expect(typeof Filesystem.getProvider).toBe('function')
      expect(typeof Filesystem.hasProvider).toBe('function')
    })

    it('should export file operation functions', () => {
      expect(typeof Filesystem.readFile).toBe('function')
      expect(typeof Filesystem.readFileAsBlob).toBe('function')
      expect(typeof Filesystem.writeFile).toBe('function')
      expect(typeof Filesystem.writeFileFromBlob).toBe('function')
      expect(typeof Filesystem.appendFile).toBe('function')
      expect(typeof Filesystem.deleteFile).toBe('function')
    })

    it('should export directory operation functions', () => {
      expect(typeof Filesystem.mkdir).toBe('function')
      expect(typeof Filesystem.rmdir).toBe('function')
      expect(typeof Filesystem.readdir).toBe('function')
    })

    it('should export file info functions', () => {
      expect(typeof Filesystem.stat).toBe('function')
      expect(typeof Filesystem.exists).toBe('function')
      expect(typeof Filesystem.getUri).toBe('function')
    })

    it('should export file management functions', () => {
      expect(typeof Filesystem.copy).toBe('function')
      expect(typeof Filesystem.move).toBe('function')
    })

    it('should export system functions', () => {
      expect(typeof Filesystem.getAvailableSpace).toBe('function')
      expect(typeof Filesystem.getCapabilities).toBe('function')
    })

    it('should export utility functions', () => {
      expect(typeof Filesystem.formatFileSize).toBe('function')
      expect(typeof Filesystem.getExtension).toBe('function')
      expect(typeof Filesystem.getBasename).toBe('function')
      expect(typeof Filesystem.getDirname).toBe('function')
      expect(typeof Filesystem.joinPath).toBe('function')
      expect(typeof Filesystem.getMimeType).toBe('function')
    })
  })

  describe('integration', () => {
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
    }

    beforeEach(() => {
      mockProvider = {
        readFile: vi.fn().mockResolvedValue('file content'),
        readFileAsBlob: vi.fn().mockResolvedValue(new Blob(['content'])),
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
        getUri: vi.fn().mockResolvedValue('file:///test.txt'),
        getAvailableSpace: vi.fn().mockResolvedValue(1024 * 1024 * 1024),
        getCapabilities: vi.fn().mockResolvedValue(mockCapabilities),
      }

      Filesystem.setProvider(mockProvider)
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    describe('complete file lifecycle', () => {
      it('should perform create, read, update, delete cycle', async () => {
        // Create file
        await Filesystem.writeFile('/test.txt', 'initial content')
        expect(mockProvider.writeFile).toHaveBeenCalledWith(
          '/test.txt',
          'initial content',
          undefined,
        )

        // Read file
        const content = await Filesystem.readFile('/test.txt')
        expect(content).toBe('file content')
        expect(mockProvider.readFile).toHaveBeenCalledWith('/test.txt', undefined)

        // Update file (append)
        await Filesystem.appendFile('/test.txt', ' appended')
        expect(mockProvider.appendFile).toHaveBeenCalledWith('/test.txt', ' appended', undefined)

        // Delete file
        await Filesystem.deleteFile('/test.txt')
        expect(mockProvider.deleteFile).toHaveBeenCalledWith('/test.txt', undefined)
      })
    })

    describe('directory operations', () => {
      it('should perform directory lifecycle', async () => {
        // Create directory
        await Filesystem.mkdir('/new-folder', { recursive: true })
        expect(mockProvider.mkdir).toHaveBeenCalledWith('/new-folder', { recursive: true })

        // List directory
        const files = await Filesystem.readdir('/new-folder')
        expect(files).toHaveLength(1)
        expect(mockProvider.readdir).toHaveBeenCalledWith('/new-folder', undefined)

        // Remove directory
        await Filesystem.rmdir('/new-folder', { recursive: true })
        expect(mockProvider.rmdir).toHaveBeenCalledWith('/new-folder', { recursive: true })
      })
    })

    describe('file operations with different directories', () => {
      it('should write to cache directory', async () => {
        await Filesystem.writeFile('/cached-data.json', '{"cached":true}', {
          directory: 'cache',
        })
        expect(mockProvider.writeFile).toHaveBeenCalledWith(
          '/cached-data.json',
          '{"cached":true}',
          {
            directory: 'cache',
          },
        )
      })

      it('should read from documents directory', async () => {
        await Filesystem.readFile('/user-doc.txt', {
          directory: 'documents',
          encoding: 'utf8',
        })
        expect(mockProvider.readFile).toHaveBeenCalledWith('/user-doc.txt', {
          directory: 'documents',
          encoding: 'utf8',
        })
      })

      it('should write to data directory', async () => {
        await Filesystem.writeFile('/app-data.json', '{"settings":true}', {
          directory: 'data',
        })
        expect(mockProvider.writeFile).toHaveBeenCalledWith('/app-data.json', '{"settings":true}', {
          directory: 'data',
        })
      })
    })

    describe('copy and move operations', () => {
      it('should copy file between directories', async () => {
        await Filesystem.copy('/source.txt', '/dest.txt', {
          fromDirectory: 'temp',
          toDirectory: 'documents',
          overwrite: true,
        })
        expect(mockProvider.copy).toHaveBeenCalledWith('/source.txt', '/dest.txt', {
          fromDirectory: 'temp',
          toDirectory: 'documents',
          overwrite: true,
        })
      })

      it('should move file to new location', async () => {
        await Filesystem.move('/old-name.txt', '/new-name.txt')
        expect(mockProvider.move).toHaveBeenCalledWith('/old-name.txt', '/new-name.txt', undefined)
      })
    })

    describe('binary file operations', () => {
      it('should write and read blob data', async () => {
        const blobData = new Blob(['binary content'], { type: 'application/octet-stream' })

        await Filesystem.writeFileFromBlob('/binary.dat', blobData)
        expect(mockProvider.writeFileFromBlob).toHaveBeenCalledWith(
          '/binary.dat',
          blobData,
          undefined,
        )

        const readBlob = await Filesystem.readFileAsBlob('/binary.dat')
        expect(readBlob).toBeInstanceOf(Blob)
        expect(mockProvider.readFileAsBlob).toHaveBeenCalledWith('/binary.dat', undefined)
      })
    })

    describe('file info operations', () => {
      it('should get file statistics', async () => {
        const info = await Filesystem.stat('/test.txt')
        expect(info.name).toBe('test.txt')
        expect(info.size).toBe(1024)
        expect(info.isFile).toBe(true)
        expect(info.isDirectory).toBe(false)
      })

      it('should check file existence', async () => {
        const fileExists = await Filesystem.exists('/test.txt')
        expect(fileExists).toBe(true)
        expect(mockProvider.exists).toHaveBeenCalledWith('/test.txt', undefined)
      })

      it('should get file URI', async () => {
        const uri = await Filesystem.getUri('/test.txt')
        expect(uri).toBe('file:///test.txt')
        expect(mockProvider.getUri).toHaveBeenCalledWith('/test.txt', undefined)
      })
    })

    describe('system operations', () => {
      it('should get available space', async () => {
        const space = await Filesystem.getAvailableSpace('documents')
        expect(space).toBe(1024 * 1024 * 1024)
        expect(mockProvider.getAvailableSpace).toHaveBeenCalledWith('documents')
      })

      it('should get capabilities', async () => {
        const caps = await Filesystem.getCapabilities()
        expect(caps.supported).toBe(true)
        expect(caps.directories).toContain('documents')
        expect(caps.hasPicker).toBe(true)
      })
    })

    describe('utility functions with provider', () => {
      it('should combine utility functions with provider operations', async () => {
        // Get file info (mock returns mockFileInfo which is /documents/test.txt)
        const info = await Filesystem.stat('/documents/test.txt')

        // Use utilities to analyze the file
        const extension = Filesystem.getExtension(info.path)
        expect(extension).toBe('txt')

        const mimeType = Filesystem.getMimeType(info.path)
        expect(mimeType).toBe('text/plain')

        const dirname = Filesystem.getDirname(info.path)
        expect(dirname).toBe('/documents')

        const basename = Filesystem.getBasename(info.path)
        expect(basename).toBe('test')

        const formattedSize = Filesystem.formatFileSize(info.size)
        expect(formattedSize).toBe('1.0 KB')
      })

      it('should build paths using joinPath', () => {
        const basePath = '/documents'
        const subFolder = 'user-data'
        const filename = 'config.json'

        const fullPath = Filesystem.joinPath(basePath, subFolder, filename)
        expect(fullPath).toBe('/documents/user-data/config.json')
      })
    })

    describe('error scenarios', () => {
      it('should propagate provider errors', async () => {
        ;(mockProvider.readFile as ReturnType<typeof vi.fn>).mockRejectedValue(
          new Error('File not found'),
        )

        await expect(Filesystem.readFile('/nonexistent.txt')).rejects.toThrow('File not found')
      })

      it('should handle permission errors', async () => {
        ;(mockProvider.writeFile as ReturnType<typeof vi.fn>).mockRejectedValue(
          new Error('Permission denied'),
        )

        await expect(Filesystem.writeFile('/protected.txt', 'content')).rejects.toThrow(
          'Permission denied',
        )
      })

      it('should handle directory not empty errors', async () => {
        ;(mockProvider.rmdir as ReturnType<typeof vi.fn>).mockRejectedValue(
          new Error('Directory not empty'),
        )

        await expect(Filesystem.rmdir('/non-empty-folder')).rejects.toThrow('Directory not empty')
      })
    })
  })
})
