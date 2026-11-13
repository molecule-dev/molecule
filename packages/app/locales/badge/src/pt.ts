import type { BadgeTranslations } from './types.js'

/** Badge translations for Portuguese. */
export const pt: BadgeTranslations = {
  'badge.error.noProvider':
    '`@molecule/app-badge`: Nenhum provedor definido. Chame `setProvider()` com uma implementação de `BadgeProvider` — o Molecule não fornece um provedor para isso; implemente a interface em seu ambiente de execução nativo e vincule-a.',
}
