import type { ContactsTranslations } from './types.js'

/** Contacts translations for es. */
export const es: Partial<ContactsTranslations> = {
  'contacts.unknown': 'Desconocido',
  'contacts.error.noProvider':
    '`@molecule/app-contacts`: No se ha configurado ningún proveedor. Llame `setProvider()` con una implementación de `ContactsProvider` ; ningún proveedor viene incluido con la flota; implemente la interfaz en su entorno de ejecución nativo y vincúlela.',
}
