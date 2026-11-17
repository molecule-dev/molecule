import { describe, expect, it } from 'vitest'

import type { TranslateFunction } from '@molecule/app-i18n'

/**
 * The share-dialog role vocabulary travels through the CALLER's translate
 * function with LITERAL keys: {@link shareRoleLabel} (the
 * `ide.chat.share.role.<role>` picker labels), {@link shareGrantsText} (the
 * `ide.chat.share.grants.<role>` sentences) and {@link shareSubheading} (the
 * `ide.chat.share.subheading.<role>` headings). A key-returning marker
 * translator proves the literal key each role produces (the parity gate can
 * only check literal keys — the runtime-built `ide.chat.share.grants.${role}`
 * these helpers replaced was invisible to it), and an interpolating
 * default-returning translator proves the English, `{{role}}` included.
 *
 * @module
 */
import {
  SHARE_ROLES,
  shareGrantsText,
  shareRoleLabel,
  shareSubheading,
} from '../components/chat-share-utilities.js'

/** Marker translator that names the key it was called with: `@@<key>@@`. */
const keyT: TranslateFunction = (key) => `@@${key}@@`

/** Translator that interpolates the English default — what an unbuilt bond renders. */
const enT: TranslateFunction = (key, values, opts) =>
  (opts?.defaultValue ?? key).replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) =>
    String(values?.[k] ?? `{{${k}}}`),
  )

describe('shareRoleLabel (ide.chat.share.role.<role>)', () => {
  it('routes every share role through its literal key', () => {
    for (const role of SHARE_ROLES) {
      expect(shareRoleLabel(keyT, role)).toBe(`@@ide.chat.share.role.${role}@@`)
    }
  })

  it('renders the picker label as the English default', () => {
    expect(shareRoleLabel(enT, 'viewer')).toBe('Viewer — view only')
    expect(shareRoleLabel(enT, 'commenter')).toBe('Commenter — view & comment')
    expect(shareRoleLabel(enT, 'editor')).toBe('Editor — view & edit')
    expect(shareRoleLabel(enT, 'owner')).toBe('Owner — full access')
  })
})

describe('shareGrantsText (ide.chat.share.grants.<role>)', () => {
  it('routes every share role through its literal key', () => {
    for (const role of SHARE_ROLES) {
      expect(shareGrantsText(keyT, role)).toBe(`@@ide.chat.share.grants.${role}@@`)
    }
  })

  it('interpolates {{role}} in the English sentence', () => {
    for (const role of SHARE_ROLES) {
      expect(shareGrantsText(enT, role)).toBe(`Anyone with this link can act as ${role}.`)
    }
  })
})

describe('shareSubheading (ide.chat.share.subheading.<role>)', () => {
  it('routes every share role through its literal key', () => {
    for (const role of SHARE_ROLES) {
      expect(shareSubheading(keyT, role)).toBe(`@@ide.chat.share.subheading.${role}@@`)
    }
  })

  it('interpolates {{role}} in the English subheading', () => {
    for (const role of SHARE_ROLES) {
      expect(shareSubheading(enT, role)).toBe(
        `Create a public link. Anyone with the link can act as ${role}.`,
      )
    }
  })
})
