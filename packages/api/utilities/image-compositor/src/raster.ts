/**
 * Raster-codec accessor.
 *
 * The compositor stays decoupled from `sharp`: it never imports `sharp`
 * directly. At runtime we look up the bonded `@molecule/api-image`
 * provider via `bond('image')` and feature-detect the {@link RasterCodec}
 * methods needed for raw-buffer round-tripping.
 *
 * Bond providers (e.g. `@molecule/api-image-sharp`) may extend their
 * exported provider object with `decode` / `encode` / `resizeRaw`
 * methods to plug in directly. Tests inject a stub via the explicit
 * `deps.raster` parameter on {@link compositeImage}.
 *
 * @module
 */

import { get as bondGet } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

import type { RasterCodec } from './types.js'

/**
 * Resolve the {@link RasterCodec} from the bonded `@molecule/api-image`
 * provider.
 *
 * @returns The bonded provider cast to a raster codec, if it implements
 *   the required methods.
 * @throws {Error} If no image provider is bonded, or the bonded provider
 *   does not implement raster codec methods. Callers can avoid the throw
 *   by passing an explicit raster codec via `deps.raster`.
 */
export function getRasterCodec(): RasterCodec {
  const provider = bondGet<unknown>('image')
  if (!provider) {
    throw new Error(
      t('image-compositor.error.noImageProvider', undefined, {
        defaultValue:
          'No image provider bonded. Call bond("image", provider) at startup, or pass deps.raster explicitly.',
      }),
    )
  }
  if (!isRasterCodec(provider)) {
    throw new Error(
      t('image-compositor.error.providerMissingRasterMethods', undefined, {
        defaultValue:
          'Bonded image provider does not expose decode/encode/resizeRaw. Pass deps.raster explicitly, or extend your image bond.',
      }),
    )
  }
  return provider
}

/**
 * Type guard for {@link RasterCodec}.
 *
 * @param value - Candidate provider.
 * @returns `true` when `value` looks like a {@link RasterCodec}.
 */
export function isRasterCodec(value: unknown): value is RasterCodec {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v['decode'] === 'function' &&
    typeof v['encode'] === 'function' &&
    typeof v['resizeRaw'] === 'function'
  )
}
