import type { NfcTranslations } from './types.js'

/** Nfc translations for Portuguese. */
export const pt: NfcTranslations = {
  'nfc.error.noProvider':
    '`@molecule/app-nfc`: Nenhum provedor definido. Chame `setProvider()` com uma implementação de `NfcProvider` — o Molecule não fornece um provedor para isso; implemente a interface em seu ambiente de execução nativo e faça a vinculação.',
}
