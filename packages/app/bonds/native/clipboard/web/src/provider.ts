/**
 * Web clipboard provider: the browser's async Clipboard API.
 *
 * @module
 */

import type {
  ClipboardCapabilities,
  ClipboardContent,
  ClipboardDataType,
  ClipboardProvider,
  ReadOptions,
} from '@molecule/app-clipboard'

import type { WebClipboardConfig } from './types.js'

type NavigatorClipboard = {
  writeText?: (text: string) => Promise<void>
  readText?: () => Promise<string>
  write?: (items: ClipboardItem[]) => Promise<void>
  read?: () => Promise<ClipboardItem[]>
}

/** The clipboard the page has, if any. */
function clipboard(): NavigatorClipboard | undefined {
  if (typeof navigator === 'undefined') return undefined
  return (navigator as Navigator & { clipboard?: NavigatorClipboard }).clipboard
}

/** Whether `ClipboardItem` (rich writes and reads) exists here. */
function hasItems(): boolean {
  return typeof globalThis.ClipboardItem === 'function'
}

/**
 * Copies text the old way: a hidden textarea, a selection, `document.execCommand('copy')`.
 *
 * @param text - What to copy.
 * @returns Whether the command reported success.
 */
function legacyCopy(text: string): boolean {
  if (typeof document === 'undefined') return false
  const ta = document.createElement('textarea')
  ta.value = text
  ta.setAttribute('readonly', '')
  ta.style.position = 'fixed'
  ta.style.top = '0'
  ta.style.left = '-9999px'
  document.body.appendChild(ta)
  ta.select()
  let ok: boolean
  try {
    ok = document.execCommand('copy')
  } catch (_error) {
    // Some contexts throw instead of returning false; either way the copy did not happen.
    ok = false
  }
  document.body.removeChild(ta)
  return ok
}

/**
 * Reads a data URL out of a Blob.
 *
 * @param blob - The image.
 * @returns A `data:` URL.
 */
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the image'))
    reader.readAsDataURL(blob)
  })
}

/**
 * Turns a data URL or Blob into a Blob for a `ClipboardItem`.
 *
 * @param image - A `data:` URL, or a Blob.
 * @returns The Blob.
 */
async function toBlob(image: string | Blob): Promise<Blob> {
  if (typeof image !== 'string') return image
  const res = await fetch(image)
  return res.blob()
}

/**
 * Creates a web clipboard provider.
 *
 * @param config - Provider configuration.
 * @returns A clipboard provider.
 */
export function createWebClipboardProvider(config: WebClipboardConfig = {}): ClipboardProvider {
  const legacy = config.legacyCopyFallback ?? true

  const writeText = async (text: string): Promise<void> => {
    const cb = clipboard()
    if (cb?.writeText) {
      try {
        await cb.writeText(text)
        return
      } catch (error) {
        if (!legacy) throw error
        // Fall through to the selection-and-copy path (e.g. the document lost focus).
      }
    }
    if (legacy && legacyCopy(text)) return
    throw new Error('@molecule/app-clipboard-web: the clipboard is not available here')
  }

  const readText = async (): Promise<string> => {
    const cb = clipboard()
    if (!cb?.readText)
      throw new Error('@molecule/app-clipboard-web: reading the clipboard is not available here')
    return cb.readText()
  }

  const readItems = async (): Promise<ClipboardItem[]> => {
    const cb = clipboard()
    if (!cb?.read || !hasItems()) return []
    return cb.read()
  }

  const provider: ClipboardProvider = {
    async write(content: ClipboardContent): Promise<void> {
      const cb = clipboard()
      const parts: Record<string, Blob> = {}
      if (content.html) parts['text/html'] = new Blob([content.html], { type: 'text/html' })
      if (content.image) {
        const blob = await toBlob(content.image)
        parts[blob.type || 'image/png'] = blob
      }
      if (content.text || (content.html && !parts['text/plain'])) {
        parts['text/plain'] = new Blob([content.text ?? ''], { type: 'text/plain' })
      }
      const rich = Object.keys(parts).some((k) => k !== 'text/plain')
      if (rich && cb?.write && hasItems()) {
        await cb.write([new ClipboardItem(parts)])
        return
      }
      await writeText(content.text ?? '')
    },
    writeText,
    async writeHtml(html: string, fallbackText?: string): Promise<void> {
      await provider.write({ html, text: fallbackText ?? html.replace(/<[^>]+>/g, '') })
    },
    async writeImage(image: string | Blob): Promise<void> {
      await provider.write({ image })
    },
    async read(options?: ReadOptions): Promise<ClipboardContent> {
      const preferred = options?.preferredTypes
      const out: ClipboardContent = {}
      for (const item of await readItems()) {
        for (const type of item.types) {
          if (preferred && !preferred.includes(type)) continue
          if (type === 'text/plain' && out.text === undefined)
            out.text = await (await item.getType(type)).text()
          else if (type === 'text/html' && out.html === undefined)
            out.html = await (await item.getType(type)).text()
          else if (type.startsWith('image/') && out.image === undefined)
            out.image = await blobToDataUrl(await item.getType(type))
        }
      }
      if (out.text === undefined && out.html === undefined && out.image === undefined) {
        try {
          out.text = await readText()
        } catch (_error) {
          // Nothing readable: an empty content object says so.
        }
      }
      return out
    },
    readText,
    async readHtml(): Promise<string | null> {
      return (await provider.read({ preferredTypes: ['text/html'] })).html ?? null
    },
    async readImage(): Promise<string | null> {
      const image = (await provider.read({ preferredTypes: ['image/png', 'image/jpeg'] })).image
      return typeof image === 'string' ? image : image ? blobToDataUrl(image) : null
    },
    async clear(): Promise<void> {
      await writeText('')
    },
    async hasContent(): Promise<boolean> {
      const content = await provider.read()
      return Boolean(content.text || content.html || content.image)
    },
    async getAvailableTypes(): Promise<ClipboardDataType[]> {
      const types = new Set<ClipboardDataType>()
      for (const item of await readItems()) for (const t of item.types) types.add(t)
      if (!types.size && clipboard()?.readText) types.add('text/plain')
      return [...types]
    },
    async getCapabilities(): Promise<ClipboardCapabilities> {
      const cb = clipboard()
      const items = hasItems()
      return {
        supported: Boolean(cb?.writeText) || (legacy && typeof document !== 'undefined'),
        canRead: Boolean(cb?.readText),
        canWrite: Boolean(cb?.writeText) || (legacy && typeof document !== 'undefined'),
        canReadImage: Boolean(cb?.read) && items,
        canWriteImage: Boolean(cb?.write) && items,
        canReadHtml: Boolean(cb?.read) && items,
      }
    },
  }
  return provider
}

/** Default web clipboard provider instance. */
export const provider: ClipboardProvider = createWebClipboardProvider()
