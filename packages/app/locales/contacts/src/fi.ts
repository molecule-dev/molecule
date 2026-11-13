import type { ContactsTranslations } from './types.js'

/** Contacts translations for Finnish. */
export const fi: ContactsTranslations = {
  'contacts.unknown': 'Tuntematon',
  'contacts.error.noProvider':
    '`@molecule/app-contacts`: Ei toimittajaa asetettu. Kutsu `setProvider()` -funktiota `ContactsProvider` -toteutuksella — Molecule ei toimita sille toimittajaa; toteuta rajapinta natiivissa suoritusympäristössäsi ja yhdistä se.',
}
