import type { ContactsTranslations } from './types.js'

/** Contacts translations for Finnish. */
export const fi: ContactsTranslations = {
  'contacts.unknown': 'Tuntematon',
  'contacts.error.noProvider':
    '`@molecule/app-contacts`: Ei toimittajaa asetettu. Kutsu `setProvider()` -funktiota `ContactsProvider` -toteutuksella — toimittajaa ei toimiteta laivaston mukana; toteuta rajapinta natiivissa suoritusympäristössäsi ja yhdistä se.',
}
