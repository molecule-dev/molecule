import type { ScreenOrientationTranslations } from './types.js'

/** Screen Orientation translations for Norwegian Bokmål. */
export const nb: ScreenOrientationTranslations = {
  'screenOrientation.error.noProvider':
    '`@molecule/app-screen-orientation`: Ingen leverandør angitt. Kall `setProvider()` med en `ScreenOrientationProvider`-implementering — Molecule sender ingen leverandør for den; implementer grensesnittet på din native runtime og koble den til.',
}
