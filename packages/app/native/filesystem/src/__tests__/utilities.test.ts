import { describe, expect, it } from 'vitest'

import {
  formatFileSize,
  getBasename,
  getDirname,
  getExtension,
  getMimeType,
  joinPath,
} from '../utilities.js'

describe('filesystem/utilities', () => {
  describe('formatFileSize', () => {
    it('should format bytes', () => {
      expect(formatFileSize(0)).toBe('0 B')
      expect(formatFileSize(1)).toBe('1 B')
      expect(formatFileSize(100)).toBe('100 B')
      expect(formatFileSize(999)).toBe('999 B')
    })

    it('should format kilobytes', () => {
      expect(formatFileSize(1024)).toBe('1.0 KB')
      expect(formatFileSize(1536)).toBe('1.5 KB')
      expect(formatFileSize(10240)).toBe('10.0 KB')
    })

    it('should format megabytes', () => {
      expect(formatFileSize(1024 * 1024)).toBe('1.0 MB')
      expect(formatFileSize(1024 * 1024 * 2.5)).toBe('2.5 MB')
      expect(formatFileSize(1024 * 1024 * 100)).toBe('100.0 MB')
    })

    it('should format gigabytes', () => {
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1.0 GB')
      expect(formatFileSize(1024 * 1024 * 1024 * 5)).toBe('5.0 GB')
    })

    it('should format terabytes', () => {
      expect(formatFileSize(1024 * 1024 * 1024 * 1024)).toBe('1.0 TB')
      expect(formatFileSize(1024 * 1024 * 1024 * 1024 * 2)).toBe('2.0 TB')
    })

    it('should handle large terabyte values', () => {
      expect(formatFileSize(1024 * 1024 * 1024 * 1024 * 1024)).toBe('1024.0 TB')
    })
  })

  describe('getExtension', () => {
    it('should return file extension', () => {
      expect(getExtension('file.txt')).toBe('txt')
      expect(getExtension('image.PNG')).toBe('png')
      expect(getExtension('document.PDF')).toBe('pdf')
    })

    it('should handle multiple dots', () => {
      expect(getExtension('archive.tar.gz')).toBe('gz')
      expect(getExtension('my.file.name.doc')).toBe('doc')
    })

    it('should handle paths with directories', () => {
      expect(getExtension('/path/to/file.txt')).toBe('txt')
      expect(getExtension('folder/subfolder/image.jpg')).toBe('jpg')
    })

    it('should return empty string for files without extension', () => {
      expect(getExtension('README')).toBe('')
      expect(getExtension('Makefile')).toBe('')
      expect(getExtension('/path/to/noextension')).toBe('')
    })

    it('should handle hidden files', () => {
      expect(getExtension('.gitignore')).toBe('gitignore')
      expect(getExtension('.env.local')).toBe('local')
    })
  })

  describe('getBasename', () => {
    it('should return filename without extension', () => {
      expect(getBasename('file.txt')).toBe('file')
      expect(getBasename('document.pdf')).toBe('document')
    })

    it('should handle paths with directories', () => {
      expect(getBasename('/path/to/file.txt')).toBe('file')
      expect(getBasename('folder/document.pdf')).toBe('document')
    })

    it('should handle multiple dots', () => {
      expect(getBasename('archive.tar.gz')).toBe('archive.tar')
      expect(getBasename('my.file.name.doc')).toBe('my.file.name')
    })

    it('should handle files without extension', () => {
      expect(getBasename('README')).toBe('README')
      expect(getBasename('/path/to/Makefile')).toBe('Makefile')
    })

    it('should handle hidden files', () => {
      // Hidden files without extension return the full name since there's no dot before position 0
      expect(getBasename('.gitignore')).toBe('.gitignore')
      expect(getBasename('.env.local')).toBe('.env')
    })

    it('should handle empty filename', () => {
      expect(getBasename('')).toBe('')
    })
  })

  describe('getDirname', () => {
    it('should return directory path', () => {
      expect(getDirname('/path/to/file.txt')).toBe('/path/to')
      expect(getDirname('folder/file.txt')).toBe('folder')
    })

    it('should handle nested directories', () => {
      expect(getDirname('/a/b/c/d/file.txt')).toBe('/a/b/c/d')
      expect(getDirname('one/two/three/file.txt')).toBe('one/two/three')
    })

    it('should return root for root-level files', () => {
      // /file.txt is at root, so dirname is /
      expect(getDirname('/file.txt')).toBe('/')
      // file.txt has no directory, falls back to /
      expect(getDirname('file.txt')).toBe('/')
    })

    it('should handle trailing slashes', () => {
      expect(getDirname('/path/to/')).toBe('/path/to')
    })

    it('should return slash for empty result', () => {
      // Single filename with no directory falls back to /
      expect(getDirname('singlefile')).toBe('/')
    })
  })

  describe('joinPath', () => {
    it('should join path segments', () => {
      expect(joinPath('path', 'to', 'file.txt')).toBe('path/to/file.txt')
      expect(joinPath('/root', 'folder', 'file.txt')).toBe('/root/folder/file.txt')
    })

    it('should handle multiple slashes', () => {
      expect(joinPath('/path/', '/to/', '/file.txt')).toBe('/path/to/file.txt')
      expect(joinPath('a//', '//b', 'c')).toBe('a/b/c')
    })

    it('should remove trailing slashes', () => {
      expect(joinPath('path', 'to', 'folder/')).toBe('path/to/folder')
      expect(joinPath('/root', 'folder/')).toBe('/root/folder')
    })

    it('should handle single segment', () => {
      expect(joinPath('file.txt')).toBe('file.txt')
      expect(joinPath('/root')).toBe('/root')
    })

    it('should handle empty segments', () => {
      expect(joinPath('', 'path', '', 'file.txt')).toBe('/path/file.txt')
    })

    it('should return slash for empty input', () => {
      expect(joinPath('')).toBe('/')
    })
  })

  describe('getMimeType', () => {
    describe('images', () => {
      it('should return correct MIME types', () => {
        expect(getMimeType('photo.jpg')).toBe('image/jpeg')
        expect(getMimeType('photo.jpeg')).toBe('image/jpeg')
        expect(getMimeType('image.png')).toBe('image/png')
        expect(getMimeType('animation.gif')).toBe('image/gif')
        expect(getMimeType('modern.webp')).toBe('image/webp')
        expect(getMimeType('vector.svg')).toBe('image/svg+xml')
      })
    })

    describe('documents', () => {
      it('should return correct MIME types', () => {
        expect(getMimeType('document.pdf')).toBe('application/pdf')
        expect(getMimeType('document.doc')).toBe('application/msword')
        expect(getMimeType('document.docx')).toBe(
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        )
        expect(getMimeType('spreadsheet.xls')).toBe('application/vnd.ms-excel')
        expect(getMimeType('spreadsheet.xlsx')).toBe(
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        expect(getMimeType('presentation.ppt')).toBe('application/vnd.ms-powerpoint')
        expect(getMimeType('presentation.pptx')).toBe(
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        )
      })
    })

    describe('text files', () => {
      it('should return correct MIME types', () => {
        expect(getMimeType('readme.txt')).toBe('text/plain')
        expect(getMimeType('data.csv')).toBe('text/csv')
        expect(getMimeType('config.json')).toBe('application/json')
        expect(getMimeType('data.xml')).toBe('application/xml')
        expect(getMimeType('page.html')).toBe('text/html')
        expect(getMimeType('styles.css')).toBe('text/css')
        expect(getMimeType('script.js')).toBe('application/javascript')
        expect(getMimeType('script.ts')).toBe('text/typescript')
      })
    })

    describe('media files', () => {
      it('should return correct MIME types for audio', () => {
        expect(getMimeType('song.mp3')).toBe('audio/mpeg')
        expect(getMimeType('sound.wav')).toBe('audio/wav')
        expect(getMimeType('audio.ogg')).toBe('audio/ogg')
      })

      it('should return correct MIME types for video', () => {
        expect(getMimeType('video.mp4')).toBe('video/mp4')
        expect(getMimeType('video.webm')).toBe('video/webm')
        expect(getMimeType('video.mov')).toBe('video/quicktime')
      })
    })

    describe('archives', () => {
      it('should return correct MIME types', () => {
        expect(getMimeType('archive.zip')).toBe('application/zip')
        expect(getMimeType('archive.tar')).toBe('application/x-tar')
        expect(getMimeType('archive.gz')).toBe('application/gzip')
      })
    })

    describe('unknown extensions', () => {
      it('should return application/octet-stream for unknown types', () => {
        expect(getMimeType('file.unknown')).toBe('application/octet-stream')
        expect(getMimeType('file.xyz')).toBe('application/octet-stream')
        expect(getMimeType('noextension')).toBe('application/octet-stream')
      })
    })

    describe('case insensitivity', () => {
      it('should handle uppercase extensions', () => {
        expect(getMimeType('FILE.TXT')).toBe('text/plain')
        expect(getMimeType('IMAGE.PNG')).toBe('image/png')
        expect(getMimeType('DOCUMENT.PDF')).toBe('application/pdf')
      })

      it('should handle mixed case extensions', () => {
        expect(getMimeType('File.Txt')).toBe('text/plain')
        expect(getMimeType('Image.JpG')).toBe('image/jpeg')
      })
    })

    describe('paths with directories', () => {
      it('should extract MIME type from full paths', () => {
        expect(getMimeType('/path/to/file.txt')).toBe('text/plain')
        expect(getMimeType('folder/subfolder/image.png')).toBe('image/png')
        expect(getMimeType('/documents/archive.zip')).toBe('application/zip')
      })
    })
  })
})
