import type { MarkdownTranslations } from './types.js'

/** Markdown translations for French. */
export const fr: MarkdownTranslations = {
  'markdown.components.invalid':
    "components contient une entrée qui n'est pas un composant React ni un nom d'élément.",
  'markdown.components.unsupported':
    'Le fournisseur marked ne peut pas utiliser components, car il renvoie une chaîne HTML. Utilisez elementAttributes pour ajouter des attributs.',
  'markdown.elementAttributes.invalidName':
    '"{{name}}" n\'est pas un nom d\'attribut (sur <{{element}}>)',
  'markdown.elementAttributes.refused':
    'elementAttributes ne peut pas définir "{{name}}" sur <{{element}}> : le moteur de rendu en est propriétaire',
  'markdown.elementAttributes.unknownElement':
    'elementAttributes nomme <{{element}}>, que markdown ne produit pas',
  'markdown.footnotes.backToReference': 'Retour à la référence {{reference}}',
  'markdown.footnotes.label': 'Notes de bas de page',
}
