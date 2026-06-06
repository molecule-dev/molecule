import type { IconsTranslations } from './types.js'

/** Icons translations for fr. */
export const fr: Partial<IconsTranslations> = {
  'icons.error.notFound': 'L\'icône "{{name}}" est introuvable dans le jeu d\'icônes actuel.',
  'icons.error.noIconSet':
    "Aucun jeu d'icônes n'a été défini. Appelez setIconSet() au démarrage de l'application avec une bibliothèque d'icônes (par exemple, @molecule/app-icons-molecule).",
}
