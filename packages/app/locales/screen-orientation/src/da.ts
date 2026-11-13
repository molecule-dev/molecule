import type { ScreenOrientationTranslations } from './types.js'

/** Screen Orientation translations for Danish. */
export const da: ScreenOrientationTranslations = {
  'screenOrientation.error.noProvider':
    '`@molecule/app-screen-orientation`: Ingen provider angivet. Kald `setProvider()` med en `ScreenOrientationProvider` implementering — Molecule leverer ingen provider til den; implementer grænsefladen på din native runtime og bind den.',
}
