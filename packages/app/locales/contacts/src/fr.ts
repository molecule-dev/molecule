import type { ContactsTranslations } from './types.js'

/** Contacts translations for fr. */
export const fr: Partial<ContactsTranslations> = {
  'contacts.unknown': 'Inconnu',
  'contacts.error.noProvider':
    "`@molecule/app-contacts` : Aucun fournisseur défini. Appelez `setProvider()` avec une implémentation `ContactsProvider` — aucun fournisseur n'est fourni avec la flotte ; implémentez l'interface sur votre environnement d'exécution natif et liez-la.",
}
