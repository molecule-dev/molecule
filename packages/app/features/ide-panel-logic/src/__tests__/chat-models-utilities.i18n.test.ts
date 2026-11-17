import { describe, expect, it } from 'vitest'

import type { TranslateFunction } from '@molecule/app-i18n'

/**
 * {@link modelRegionLabel} — the localized display name of a processing
 * region (the `ide.chat.model.region.<code>` keys) — travels through the
 * CALLER's translate function with a LITERAL key per region the bond has a
 * key for. A key-returning marker translator proves those literal keys (the
 * parity gate can only check literal keys), and a default-returning
 * translator proves the English label; a region the bond has no key for yet
 * degrades to its uppercase code (the open union's documented fallback).
 *
 * @module
 */
import { modelRegionLabel } from '../components/chat-models-utilities.js'

/** Marker translator that names the key it was called with: `@@<key>@@`. */
const keyT: TranslateFunction = (key) => `@@${key}@@`

/** Translator that returns the English default — what an unbuilt bond renders. */
const enT: TranslateFunction = (_key, _values, opts) => opts?.defaultValue ?? ''

describe('modelRegionLabel (ide.chat.model.region.<code>)', () => {
  it('routes each region with a bond key through its literal key', () => {
    expect(modelRegionLabel(keyT, 'us')).toBe('@@ide.chat.model.region.us@@')
    expect(modelRegionLabel(keyT, 'cn')).toBe('@@ide.chat.model.region.cn@@')
  })

  it('renders the bond keys as the English labels', () => {
    expect(modelRegionLabel(enT, 'us')).toBe('US')
    expect(modelRegionLabel(enT, 'cn')).toBe('CN')
  })

  it('degrades a region without a bond key to its uppercase code', () => {
    expect(modelRegionLabel(enT, 'eu')).toBe('EU')
    expect(modelRegionLabel(keyT, 'eu')).toBe('EU')
  })
})
