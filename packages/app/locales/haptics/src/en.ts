import type { HapticsTranslations } from './types.js'

/** Haptics translations for English. */
export const en: HapticsTranslations = {
  'haptics.error.noProvider':
    '`@molecule/app-haptics`: No provider set. Call `setProvider()` with a `HapticsProvider` implementation — Molecule ships no provider for it; implement the interface on your native runtime and bond it.',
}
