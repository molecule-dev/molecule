import type { ContactsTranslations } from './types.js'

/** Contacts translations for fr. */
export const fr: Partial<ContactsTranslations> = {
  'contacts.unknown': 'Inconnu',
  'contacts.error.noProvider':
    '`@molecule/app-contacts` : Aucun fournisseur défini. Appelez `setProvider()` avec une implémentation de `ContactsProvider` — Molecule ne fournit aucun fournisseur pour cela ; implémentez l’interface dans votre environnement d’exécution natif et liez-la.',
}
