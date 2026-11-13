import type { ContactsTranslations } from './types.js'

/** Contacts translations for pt. */
export const pt: Partial<ContactsTranslations> = {
  'contacts.unknown': 'Desconhecido',
  'contacts.error.noProvider':
    '`@molecule/app-contacts`: Nenhum provedor definido. Chame `setProvider()` com uma implementação de `ContactsProvider` — o Molecule não fornece um provedor para isso; implemente a interface em seu ambiente de execução nativo e faça a vinculação.',
}
