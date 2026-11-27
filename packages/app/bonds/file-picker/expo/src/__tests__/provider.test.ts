import { type DocumentPickerAsset, getDocumentAsync } from 'expo-document-picker'
import { getInfoAsync, readAsStringAsync } from 'expo-file-system'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { provider } from '../index.js'

vi.mock('expo-document-picker', () => ({ getDocumentAsync: vi.fn() }))
vi.mock('expo-file-system', () => ({
  EncodingType: { Base64: 'base64' },
  getInfoAsync: vi.fn(),
  readAsStringAsync: vi.fn(),
}))

const png = { uri: 'file:///cache/photo.png', name: 'photo.png', mimeType: 'image/png', size: 3 }
const pdf = {
  uri: 'file:///cache/doc.pdf',
  name: 'report.pdf',
  mimeType: 'application/pdf',
  size: 4,
}
const txt = { uri: 'file:///cache/notes.txt', name: 'notes.txt', mimeType: 'text/plain', size: 5 }

function choose(...assets: DocumentPickerAsset[]): void {
  vi.mocked(getDocumentAsync).mockResolvedValue({ canceled: false, assets })
}

beforeEach(() => {
  vi.resetAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

it('returns an empty array on cancellation without reading files', async () => {
  vi.mocked(getDocumentAsync).mockResolvedValue({ canceled: true, assets: null })

  await expect(provider.pickFiles({})).resolves.toEqual([])
  expect(getDocumentAsync).toHaveBeenCalledExactlyOnceWith({
    type: '*/*',
    copyToCacheDirectory: true,
    multiple: false,
  })
  expect(getInfoAsync).not.toHaveBeenCalled()
  expect(readAsStringAsync).not.toHaveBeenCalled()
})

it('requests one document and returns the first accepted file', async () => {
  choose(txt, pdf, { ...pdf, name: 'second.pdf' })

  const files = await provider.pickFiles({ accept: ' Application/PDF ' })

  expect(getDocumentAsync).toHaveBeenCalledExactlyOnceWith({
    type: ['application/pdf'],
    copyToCacheDirectory: true,
    multiple: false,
  })
  expect(files).toMatchObject([{ name: 'report.pdf', type: 'application/pdf', size: 4 }])
})

it('passes a pure MIME filter to the chooser and preserves the order of matches', async () => {
  choose(pdf, txt, png)

  const files = await provider.pickFiles({ accept: ' APPLICATION/PDF, image/* ', multiple: true })

  expect(getDocumentAsync).toHaveBeenCalledExactlyOnceWith({
    type: ['application/pdf', 'image/*'],
    copyToCacheDirectory: true,
    multiple: true,
  })
  expect(files).toMatchObject([
    { name: 'report.pdf', size: 4, type: 'application/pdf' },
    { name: 'photo.png', size: 3, type: 'image/png' },
  ])
})

it.each([
  { accept: '.PDF', names: ['report.pdf'] },
  { accept: 'image/*, .PDF', names: ['report.pdf', 'photo.png'] },
  { accept: 'application/*', names: ['report.pdf'] },
  { accept: 'image/png, *', names: ['report.pdf', 'notes.txt', 'photo.png'] },
])('broadens $accept and applies the original metadata filter', async ({ accept, names }) => {
  choose(pdf, txt, png)

  const files = await provider.pickFiles({ accept, multiple: true })

  expect(getDocumentAsync).toHaveBeenCalledWith({
    type: '*/*',
    copyToCacheDirectory: true,
    multiple: true,
  })
  expect(files.map((file) => file.name)).toEqual(names)
})

it('retains every acquired file in order for a caller that reports rejections', async () => {
  choose(txt, pdf, png)

  const files = await provider.pickFiles({
    accept: 'image/*,.pdf',
    multiple: true,
    includeRejected: true,
  })

  expect(getDocumentAsync).toHaveBeenCalledWith({
    type: '*/*',
    copyToCacheDirectory: true,
    multiple: true,
  })
  expect(files.map((file) => file.name)).toEqual(['notes.txt', 'report.pdf', 'photo.png'])
})

it('returns zero size as reported and stats an omitted size without reordering', async () => {
  const empty = { ...txt, size: 0 }
  choose({ ...pdf, size: undefined }, empty)
  vi.mocked(getInfoAsync).mockResolvedValue({
    exists: true,
    isDirectory: false,
    modificationTime: 0,
    size: 4,
    uri: pdf.uri,
  })

  const files = await provider.pickFiles({ multiple: true })

  expect(getInfoAsync).toHaveBeenCalledExactlyOnceWith(pdf.uri)
  expect(files).toMatchObject([
    { name: 'report.pdf', size: 4 },
    { name: 'notes.txt', size: 0 },
  ])
  expect(readAsStringAsync).not.toHaveBeenCalled()
})

it('keeps spaces and non-ASCII metadata and appends the native descriptor without reading bytes', async () => {
  const name = 'résumé final 文書.pdf'
  const asset = { ...pdf, name }
  choose(asset)
  const [file] = await provider.pickFiles({})
  if (!file) throw new Error('Expected the selected document')
  const form = new FormData()
  const append = vi.spyOn(form, 'append').mockImplementation(() => undefined)
  vi.mocked(readAsStringAsync).mockResolvedValue('AP8NCg==')

  expect(file).toMatchObject({ name, size: 4, type: 'application/pdf' })
  expect(file).not.toHaveProperty('uri')
  file.appendTo(form, 'attachment')
  expect(append).toHaveBeenCalledExactlyOnceWith('attachment', {
    uri: pdf.uri,
    name,
    type: 'application/pdf',
  })
  expect(readAsStringAsync).not.toHaveBeenCalled()
  expect(new Uint8Array(await file.arrayBuffer())).toEqual(Uint8Array.of(0, 255, 13, 10))
  expect(readAsStringAsync).toHaveBeenCalledExactlyOnceWith(pdf.uri, { encoding: 'base64' })
})

it('retains unknown MIME in the portable value and supplies a content type to multipart', async () => {
  choose({ ...pdf, mimeType: undefined })

  const [file] = await provider.pickFiles({ accept: '.pdf' })
  if (!file) throw new Error('Expected the document with a matching extension')
  const form = new FormData()
  const append = vi.spyOn(form, 'append').mockImplementation(() => undefined)
  file.appendTo(form, 'attachment')

  expect(file.type).toBe('')
  expect(append).toHaveBeenCalledExactlyOnceWith('attachment', {
    uri: pdf.uri,
    name: pdf.name,
    type: 'application/octet-stream',
  })
  await expect(provider.pickFiles({ accept: '*/*' })).resolves.toEqual([])
  await expect(provider.pickFiles({ accept: '*' })).resolves.toEqual([
    expect.objectContaining({ type: '' }),
  ])
})

it('rejects an Expo chooser failure with its original cause', async () => {
  const cause = new Error('chooser unavailable')
  vi.mocked(getDocumentAsync).mockRejectedValue(cause)

  await expect(provider.pickFiles({})).rejects.toMatchObject({
    message: 'Could not pick files.',
    cause,
  })
})

it('rejects a stat failure with its original cause', async () => {
  const cause = new Error('stat failed')
  choose({ ...pdf, size: undefined })
  vi.mocked(getInfoAsync).mockRejectedValue(cause)

  await expect(provider.pickFiles({})).rejects.toMatchObject({ cause })
})

it('rejects a missing cached file without inventing a size', async () => {
  choose({ ...pdf, size: undefined })
  vi.mocked(getInfoAsync).mockResolvedValue({ exists: false, isDirectory: false, uri: pdf.uri })

  await expect(provider.pickFiles({})).rejects.toMatchObject({
    cause: expect.objectContaining({
      message: 'The selected file could not be read from the app cache.',
    }),
  })
})
