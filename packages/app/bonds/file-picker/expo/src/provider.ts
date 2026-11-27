/**
 * Adapts Expo document selections to portable files.
 *
 * @module
 */

import { toByteArray } from 'base64-js'
import type { DocumentPickerAsset } from 'expo-document-picker'

import type { FilePickerProvider } from '@molecule/app-file-picker'
import { filterPickedFiles, type PickedFile } from '@molecule/app-filesystem'
import { t } from '@molecule/app-i18n'

const MIME_TYPE = /^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/
const MIME_WILDCARD = /^(audio|image|text|video)\/\*$/

/**
 * Builds a chooser hint without losing extension matches or MIME categories iOS
 * cannot express. The portable metadata filter remains authoritative.
 *
 * @param accept - The field's accepted extensions and MIME types.
 * @returns MIME types supported as a hint by both Android and iOS.
 */
function chooserTypes(accept: string | undefined): string | string[] {
  const tokens =
    accept
      ?.toLowerCase()
      .split(',')
      .map((token) => token.trim())
      .filter(Boolean) ?? []
  if (
    !tokens.length ||
    tokens.some((token) => !MIME_TYPE.test(token) && !MIME_WILDCARD.test(token))
  ) {
    return '*/*'
  }
  return tokens
}

/**
 * Resolves a trustworthy byte count before exposing a portable file.
 *
 * @param asset - The selected document with a cached URI.
 * @returns The reported or measured size in bytes.
 */
async function fileSize({ size, uri }: DocumentPickerAsset): Promise<number> {
  if (size !== undefined && Number.isSafeInteger(size) && size >= 0) return size
  const { getInfoAsync } = await import('expo-file-system')
  const info = await getInfoAsync(uri)
  if (!info.exists || info.isDirectory || !Number.isSafeInteger(info.size) || info.size < 0) {
    throw new Error(
      t('filePicker.error.cachedFileUnavailable', undefined, {
        defaultValue: 'The selected file could not be read from the app cache.',
      }),
    )
  }
  return info.size
}

/**
 * Adapts a cached document, keeping its URI and byte reads private.
 *
 * @param asset - The Expo document.
 * @returns A portable file with lazy byte reads and native multipart support.
 */
async function toPickedFile(asset: DocumentPickerAsset): Promise<PickedFile> {
  const { name, uri, mimeType = '' } = asset
  return {
    name,
    size: await fileSize(asset),
    type: mimeType,
    async arrayBuffer() {
      const { EncodingType, readAsStringAsync } = await import('expo-file-system')
      const encoded = await readAsStringAsync(uri, { encoding: EncodingType.Base64 })
      return new Uint8Array(toByteArray(encoded)).buffer
    },
    appendTo(form, field) {
      const part: Required<Exclude<FormDataValue, string>> = {
        uri,
        name,
        type: mimeType || 'application/octet-stream',
      }
      form.append(field, part)
    },
  }
}

/** Device file picker backed by the Expo SDK 53 document chooser. */
export const provider: FilePickerProvider = {
  async pickFiles({ accept, multiple = false, includeRejected }) {
    try {
      const { getDocumentAsync } = await import('expo-document-picker')
      const result = await getDocumentAsync({
        type: chooserTypes(accept),
        multiple,
        copyToCacheDirectory: true,
      })
      if (result.canceled) return []
      const files = await Promise.all(result.assets.map(toPickedFile))
      return includeRejected ? files : filterPickedFiles(files, { accept, multiple }).accepted
    } catch (error) {
      throw new Error(
        t('filePicker.error.pick', undefined, { defaultValue: 'Could not pick files.' }),
        {
          cause: error,
        },
      )
    }
  },
}
