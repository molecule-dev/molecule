import type { HapticsTranslations } from './types.js'

/** Haptics translations for Portuguese. */
export const pt: HapticsTranslations = {
  'haptics.error.noProvider':
    '`@molecule/app-haptics`: Nenhum provedor definido. Chame `setProvider()` com uma implementação de `HapticsProvider` — o Molecule não fornece um provedor para isso; implemente a interface em seu ambiente de execução nativo e vincule-a.',
}
