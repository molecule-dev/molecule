import { describe, expect, it, vi } from 'vitest'

import { fromBrowserFile } from '../browser-files.js'
import { filterPickedFiles } from '../file-selection.js'

describe('file selection', () => {
  it('filters extensions and MIME types before counting, preserving both batch orders', () => {
    const rejected = new File(['text'], 'file.txt', { type: 'text/plain' })
    const archive = new File(['zip'], 'archive.TAR.GZ')
    const png = new File(['png'], 'picture.png', { type: 'image/png' })
    const pdf = new File(['pdf'], 'document', { type: 'application/pdf' })
    const suffix = new File(['text'], 'file-application/pdf', { type: 'text/plain' })
    const files = [rejected, archive, png, pdf, suffix]
    const accept = ' .tar.gz, IMAGE/*, APPLICATION/PDF '

    const single = filterPickedFiles(files, { accept }).accepted
    expect(single).toHaveLength(1)
    expect(single[0]).toBe(archive)
    const selection = filterPickedFiles(files, { accept, multiple: true })
    expect(selection.accepted.map((file) => file.name)).toEqual([archive.name, png.name, pdf.name])
    expect(selection.rejected.map((file) => file.name)).toEqual([rejected.name, suffix.name])
    expect(filterPickedFiles(files, { accept: 'image/*, *', multiple: true }).accepted).toEqual(
      files,
    )
  })

  it('applies the inclusive byte limit to each file, including a zero limit', () => {
    const one = new File(['x'], 'one.txt')
    const two = new File(['xx'], 'two.txt')
    const empty = new File([], 'empty.txt')
    const files = [one, two, empty]

    const zero = filterPickedFiles(files, { maxSize: 0 })
    expect(zero.accepted.map((file) => file.size)).toEqual([0])
    expect(zero.rejected.map((file) => file.size)).toEqual([1, 2])
    const oneByte = filterPickedFiles(files, { maxSize: 1, multiple: true })
    expect(oneByte.accepted.map((file) => file.size)).toEqual([1, 0])
    expect(oneByte.rejected.map((file) => file.size)).toEqual([2])
  })

  it('reads the original bytes on demand and appends the original File with its name', async () => {
    const bytes = Uint8Array.of(0, 255, 13, 10)
    const original = new File([bytes], 'probe.bin', { type: 'application/octet-stream' })
    const read = vi.spyOn(original, 'arrayBuffer')
    const selection = fromBrowserFile(original)
    const form = new FormData()

    selection.appendTo(form, 'attachment')
    expect(form.get('attachment')).toBe(original)
    expect(selection).toMatchObject({ name: 'probe.bin', size: 4, type: original.type })
    expect(read).not.toHaveBeenCalled()
    expect(new Uint8Array(await selection.arrayBuffer())).toEqual(bytes)
    expect(read).toHaveBeenCalledTimes(1)
  })
})
